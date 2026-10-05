// ==UserScript==
// @name         Discourse Community Notes
// @namespace    kooraseru
// @author       kooraseru (https://github.com/Kooraseru)
// @version      1.1.0
// @description  Community Notes for Discourse-based forums
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/main/discourse-community-notes.user.js
// @downloadURL  https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/main/discourse-community-notes.user.js
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const LIKE_ACTION_ID = 2;
    const POSTS_PER_REQUEST = 20;

    const generator =
        document.querySelector(
            'meta[name="generator"]'
        );

    if (
        !generator
            ?.content
            ?.startsWith(
                "Discourse"
            )
    ) {
        return;
    }

    let iconHTML = null;

    for (
        const moduleName
        of [
            "discourse/lib/icon-library",
            "discourse-common/lib/icon-library",
        ]
    ) {
        try {
            ({
                iconHTML,
            } = window.require(
                moduleName
            ));

            break;
        } catch {
            // Same Discourse icon library,
            // different frontend generation.
        }
    }

    if (!iconHTML) {
        console.error(
            "Community Notes: Discourse icon library unavailable."
        );

        return;
    }

    const style =
        document.createElement(
            "style"
        );

    style.textContent = `
        .df-community-note {
            overflow: hidden;
        }

        .df-community-note-head {
            display: flex;
            align-items: center;
            gap: 12px;

            padding:
                12px 14px 8px;
        }

        .df-community-note-title {
            display: flex;
            align-items: center;
            gap: 9px;

            min-width: 0;
            font-weight: 600;
        }

        .df-community-note-title > svg {
            flex: 0 0 auto;

            color:
                var(--tertiary);
        }

        .df-community-note-owner {
            color: inherit;
            text-decoration: none;
        }

        .df-community-note-owner:hover {
            color:
                var(--tertiary);
        }

        .df-community-note-spacer {
            flex: 1;
        }

        .df-community-note-actions {
            display: flex;
            align-items: center;
        }

        .df-community-note-native-controls,
        .df-community-note-native-controls
            > .actions {
            display: contents;
        }

        .df-community-note-toggle {
            margin-left: 4px;
        }

        .df-community-note-toggle svg {
            transition:
                transform 0.15s ease;
        }

        .df-community-note:not(.collapsed)
            .df-community-note-toggle svg {
            transform:
                rotate(180deg);
        }

        .df-community-note-preview,
        .df-community-note-full {
            padding:
                0 14px 8px;

            line-height: 1.5;
        }

        .df-community-note-preview {
            color:
                var(--primary);
        }

        .df-community-note.collapsed
            .df-community-note-full {
            display: none;
        }

        .df-community-note.expandable:not(.collapsed)
            .df-community-note-preview {
            display: none;
        }

        .df-community-note-full
            > :first-child {
            margin-top: 0;
        }

        .df-community-note-full
            > :last-child {
            margin-bottom: 0;
        }

        .df-community-note-attribution {
            padding:
                0 14px 12px;

            color:
                var(--primary-medium);

            font-size:
                var(--font-down-1);
        }

        .df-community-note-attribution a {
            color:
                var(--tertiary);
        }
    `;

    document.head.appendChild(
        style
    );

    let currentTopicKey = null;
    let currentTopic = null;
    let currentPosts = null;
    let topicLoadPromise = null;

    function normalizeText(
        text
    ) {
        return (
            text || ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

    function getTopicRoute() {
        const match =
            location.pathname.match(
                /^(.*?\/t\/[^/]+\/(\d+))(?=\/|$)/
            );

        if (!match) {
            return null;
        }

        return {
            root:
                match[1],
            id:
                Number(
                    match[2]
                ),
        };
    }

    function getBaseUri() {
        return (
            document.querySelector(
                "#data-discourse-setup"
            )
                ?.dataset
                ?.baseUri ||
            ""
        ).replace(
            /\/$/,
            ""
        );
    }

    function absoluteUrl(
        path
    ) {
        return new URL(
            path,
            location.origin
        ).href;
    }

    function getPostUrl(
        post
    ) {
        if (
            post.post_url
        ) {
            return absoluteUrl(
                post.post_url
            );
        }

        return absoluteUrl(
            `${getBaseUri()}/t/${post.topic_id}/${post.post_number}`
        );
    }

    function getUserUrl(
        username
    ) {
        return absoluteUrl(
            `${getBaseUri()}/u/${encodeURIComponent(
                username
            )}`
        );
    }

    function getLikeAction(
        post
    ) {
        return (
            post.actions_summary ||
            []
        ).find(
            action =>
                action.id ===
                LIKE_ACTION_ID
        ) || {
            id:
                LIKE_ACTION_ID,
            count:
                0,
            acted:
                false,
            can_act:
                false,
            can_undo:
                false,
        };
    }

    function getLikeCount(
        post
    ) {
        return Number(
            getLikeAction(
                post
            ).count || 0
        );
    }

    function parseCooked(
        cooked
    ) {
        const container =
            document.createElement(
                "div"
            );

        container.className =
            "cooked";

        container.innerHTML =
            cooked || "";

        return container;
    }

    function getExcerptSourceText(
        cooked
    ) {
        const clone =
            cooked.cloneNode(
                true
            );

        clone
            .querySelectorAll(`
                aside.quote,
                blockquote,
                .cooked-selection-barrier,
                .lightbox-wrapper,
                .onebox,
                pre,
                script,
                style
            `)
            .forEach(
                element =>
                    element.remove()
            );

        return normalizeText(
            clone.innerText
        );
    }

    function getFullText(
        cooked
    ) {
        const clone =
            cooked.cloneNode(
                true
            );

        clone
            .querySelectorAll(
                ".cooked-selection-barrier"
            )
            .forEach(
                element =>
                    element.remove()
            );

        return normalizeText(
            clone.innerText
        );
    }

    function getExcerptText(
        cooked
    ) {
        const text =
            getExcerptSourceText(
                cooked
            );

        if (!text) {
            return "";
        }

        const segmenter =
            new Intl.Segmenter(
                document
                    .documentElement
                    .lang ||
                    "en",
                {
                    granularity:
                        "sentence",
                }
            );

        const sentences = [
            ...segmenter.segment(
                text
            ),
        ]
            .map(
                segment =>
                    segment
                        .segment
                        .trim()
            )
            .filter(Boolean);

        if (!sentences.length) {
            return text;
        }

        const MIN_LENGTH = 110;
        const SOFT_MAX_LENGTH = 320;
        const MAX_SENTENCES = 3;

        const selected = [];

        for (
            const sentence
            of sentences
        ) {
            if (
                selected.length >=
                MAX_SENTENCES
            ) {
                break;
            }

            const candidate = [
                ...selected,
                sentence,
            ].join(
                " "
            );

            if (
                selected.length >
                    0 &&
                candidate.length >
                    SOFT_MAX_LENGTH
            ) {
                break;
            }

            selected.push(
                sentence
            );

            if (
                selected
                    .join(" ")
                    .length >=
                MIN_LENGTH
            ) {
                break;
            }
        }

        return selected.join(
            " "
        );
    }

    function cloneCookedContent(
        source,
        destination
    ) {
        for (
            const child
            of source.children
        ) {
            if (
                child.classList.contains(
                    "cooked-selection-barrier"
                )
            ) {
                continue;
            }

            destination.appendChild(
                child.cloneNode(
                    true
                )
            );
        }
    }

    async function requestJson(
        url,
        options = {}
    ) {
        const response =
            await fetch(
                url,
                {
                    credentials:
                        "same-origin",
                    ...options,
                    headers: {
                        Accept:
                            "application/json",
                        ...options.headers,
                    },
                }
            );

        if (!response.ok) {
            throw new Error(
                `Community Notes: ${response.status} ${response.statusText} for ${url}`
            );
        }

        if (
            response.status ===
            204
        ) {
            return null;
        }

        return response.json();
    }

    async function fetchAllPosts(
        topic
    ) {
        const initialPosts =
            topic
                ?.post_stream
                ?.posts ||
            [];

        const stream =
            topic
                ?.post_stream
                ?.stream ||
            [];

        const byId =
            new Map(
                initialPosts.map(
                    post => [
                        post.id,
                        post,
                    ]
                )
            );

        const missing =
            stream.filter(
                id =>
                    !byId.has(
                        id
                    )
            );

        for (
            let index = 0;
            index <
            missing.length;
            index +=
                POSTS_PER_REQUEST
        ) {
            const chunk =
                missing.slice(
                    index,
                    index +
                        POSTS_PER_REQUEST
                );

            const params =
                new URLSearchParams();

            for (
                const id
                of chunk
            ) {
                params.append(
                    "post_ids[]",
                    String(
                        id
                    )
                );
            }

            const url =
                `${getBaseUri()}/t/${topic.id}/posts.json?${params}`;

            const result =
                await requestJson(
                    url
                );

            for (
                const post
                of result
                    ?.post_stream
                    ?.posts ||
                result
                    ?.posts ||
                []
            ) {
                byId.set(
                    post.id,
                    post
                );
            }
        }

        return stream
            .map(
                id =>
                    byId.get(
                        id
                    )
            )
            .filter(Boolean);
    }

    async function loadTopic() {
        const route =
            getTopicRoute();

        if (!route) {
            return null;
        }

        const key =
            `${location.origin}${route.root}`;

        if (
            key ===
                currentTopicKey &&
            currentTopic &&
            currentPosts
        ) {
            return {
                topic:
                    currentTopic,
                posts:
                    currentPosts,
            };
        }

        if (
            key ===
                currentTopicKey &&
            topicLoadPromise
        ) {
            return topicLoadPromise;
        }

        currentTopicKey =
            key;

        topicLoadPromise =
            (async () => {
                const topic =
                    await requestJson(
                        `${route.root}.json`
                    );

                const posts =
                    await fetchAllPosts(
                        topic
                    );

                if (
                    currentTopicKey !==
                    key
                ) {
                    return null;
                }

                currentTopic =
                    topic;

                currentPosts =
                    posts;

                return {
                    topic,
                    posts,
                };
            })();

        try {
            return await topicLoadPromise;
        } finally {
            if (
                currentTopicKey ===
                key
            ) {
                topicLoadPromise =
                    null;
            }
        }
    }

    function getMostLikedReply(
        posts
    ) {
        let best = null;

        for (
            const post
            of posts
        ) {
            if (
                post.post_number ===
                    1 ||
                post.post_type !==
                    1 ||
                post.hidden ||
                post.deleted_at ||
                !normalizeText(
                    parseCooked(
                        post.cooked
                    ).innerText
                )
            ) {
                continue;
            }

            const likes =
                getLikeCount(
                    post
                );

            if (
                !best ||
                likes >
                    best.likes ||
                (
                    likes ===
                        best.likes &&
                    post.post_number <
                        best.post_number
                )
            ) {
                best = {
                    ...post,
                    likes,
                    url:
                        getPostUrl(
                            post
                        ),
                };
            }
        }

        return best;
    }

    function getTopicAuthor(
        topic,
        posts
    ) {
        const username =
            topic
                ?.details
                ?.created_by
                ?.username ||
            posts.find(
                post =>
                    post.post_number ===
                    1
            )
                ?.username;

        if (!username) {
            return null;
        }

        return {
            username,
            url:
                getUserUrl(
                    username
                ),
        };
    }

    function updatePostFromApi(
        source,
        updated
    ) {
        if (!updated) {
            return;
        }

        Object.assign(
            source,
            updated.result ||
                updated
        );
    }

    function getCsrfToken() {
        return document.querySelector(
            'meta[name="csrf-token"]'
        )?.content;
    }

    async function toggleLike(
        source
    ) {
        const action =
            getLikeAction(
                source
            );

        const csrf =
            getCsrfToken();

        if (!csrf) {
            console.error(
                "Community Notes: CSRF token unavailable."
            );

            return false;
        }

        const headers = {
            "Content-Type":
                "application/x-www-form-urlencoded; charset=UTF-8",
            "X-CSRF-Token":
                csrf,
            "X-Requested-With":
                "XMLHttpRequest",
        };

        let updated;

        if (action.acted) {
            updated =
                await requestJson(
                    `${getBaseUri()}/post_actions/${source.id}.json`,
                    {
                        method:
                            "DELETE",
                        headers,
                        body:
                            new URLSearchParams({
                                post_action_type_id:
                                    String(
                                        LIKE_ACTION_ID
                                    ),
                            }),
                    }
                );
        } else {
            updated =
                await requestJson(
                    `${getBaseUri()}/post_actions.json`,
                    {
                        method:
                            "POST",
                        headers,
                        body:
                            new URLSearchParams({
                                id:
                                    String(
                                        source.id
                                    ),
                                post_action_type_id:
                                    String(
                                        LIKE_ACTION_ID
                                    ),
                            }),
                    }
                );
        }

        updatePostFromApi(
            source,
            updated
        );

        return true;
    }

    function installLikeControl(
        note,
        source
    ) {
        const slot =
            note.querySelector(
                ".df-community-note-like-slot"
            );

        if (!slot) {
            return;
        }

        slot.replaceChildren();

        const action =
            getLikeAction(
                source
            );

        const wrapper =
            document.createElement(
                "div"
            );

        wrapper.className =
            "double-button post-action-menu__double-button df-community-note-like-control";

        const count =
            Number(
                action.count || 0
            );

        if (
            count > 0
        ) {
            const countButton =
                document.createElement(
                    "button"
                );

            countButton.type =
                "button";

            countButton.className =
                "btn btn-flat no-text post-action-menu__like-count like-count button-count highlight-action regular-likes btn-flat";

            countButton.textContent =
                String(
                    count
                );

            countButton.title =
                `${count} ${count === 1 ? "person" : "people"} liked this post`;

            countButton.setAttribute(
                "aria-label",
                `${countButton.title}.`
            );

            countButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    location.href =
                        source.url;
                }
            );

            wrapper.appendChild(
                countButton
            );
        }

        const heartButton =
            document.createElement(
                "button"
            );

        heartButton.type =
            "button";

        heartButton.className =
            [
                "btn",
                "no-text",
                "btn-icon",
                "post-action-menu__like",
                "toggle-like",
                "btn-icon",
                "like",
                "btn-flat",
                action.acted
                    ? "has-like"
                    : "",
            ]
                .filter(Boolean)
                .join(" ");

        heartButton.innerHTML =
            iconHTML(
                action.acted
                    ? "heart"
                    : "far-heart"
            );

        const canToggle =
            Boolean(
                action.can_act ||
                action.can_undo ||
                action.acted
            );

        heartButton.disabled =
            !canToggle;

        heartButton.title =
            action.acted
                ? "undo like"
                : "like this post";

        heartButton.setAttribute(
            "aria-label",
            heartButton.title
        );

        heartButton.setAttribute(
            "aria-pressed",
            String(
                Boolean(
                    action.acted
                )
            )
        );

        heartButton.addEventListener(
            "click",
            async event => {
                event.preventDefault();
                event.stopPropagation();

                if (
                    heartButton.disabled
                ) {
                    return;
                }

                heartButton.disabled =
                    true;

                try {
                    await toggleLike(
                        source
                    );

                    installLikeControl(
                        note,
                        source
                    );
                } catch (error) {
                    console.error(
                        "Community Notes: failed to toggle like.",
                        error
                    );

                    installLikeControl(
                        note,
                        source
                    );
                }
            }
        );

        wrapper.appendChild(
            heartButton
        );

        slot.appendChild(
            wrapper
        );
    }

    function createNote(
        topic,
        posts,
        best
    ) {
        const topicAuthor =
            getTopicAuthor(
                topic,
                posts
            );

        if (!topicAuthor) {
            return null;
        }

        const cooked =
            parseCooked(
                best.cooked
            );

        const excerpt =
            getExcerptText(
                cooked
            );

        const fullText =
            getFullText(
                cooked
            );

        const hasMore =
            normalizeText(
                excerpt
            ) !==
            normalizeText(
                fullText
            );

        const note =
            document.createElement(
                "aside"
            );

        note.className =
            [
                "quote",
                "no-group",
                "df-community-note",
                hasMore
                    ? "expandable collapsed"
                    : "",
            ]
                .filter(Boolean)
                .join(" ");

        note.dataset.sourcePost =
            String(
                best.id
            );

        note.innerHTML = `
            <div class="df-community-note-head">
                <div class="df-community-note-title">
                    ${iconHTML("circle-info")}

                    <a
                        href="${topicAuthor.url}"
                        class="df-community-note-owner"
                    >Community Note</a>
                </div>

                <div class="df-community-note-spacer"></div>

                <div class="df-community-note-actions">
                    <nav
                        class="
                            post-controls
                            glimmer-post-menu
                            collapsed
                            df-community-note-native-controls
                        "
                        role="none"
                    >
                        <div class="actions">
                            <div
                                class="df-community-note-like-slot"
                            ></div>
                        </div>
                    </nav>

                    ${
                        hasMore
                            ? `
                                <button
                                    type="button"
                                    class="
                                        btn
                                        no-text
                                        btn-icon
                                        btn-flat
                                        df-community-note-toggle
                                    "
                                    aria-expanded="false"
                                    aria-label="Show full context"
                                    title="Show full context"
                                >
                                    ${iconHTML(
                                        "chevron-down"
                                    )}
                                </button>
                            `
                            : ""
                    }
                </div>
            </div>

            <div
                class="df-community-note-preview"
            ></div>

            ${
                hasMore
                    ? `
                        <div
                            class="df-community-note-full cooked"
                        ></div>
                    `
                    : ""
            }

            <div
                class="df-community-note-attribution"
            >
                Based on
                <a
                    href="${best.url}"
                    class="df-community-note-source"
                >top comment by @${best.username}</a>
            </div>
        `;

        const preview =
            note.querySelector(
                ".df-community-note-preview"
            );

        if (!preview) {
            return null;
        }

        preview.textContent =
            excerpt ||
            fullText;

        if (hasMore) {
            const full =
                note.querySelector(
                    ".df-community-note-full"
                );

            const toggle =
                note.querySelector(
                    ".df-community-note-toggle"
                );

            if (
                !full ||
                !toggle
            ) {
                return null;
            }

            cloneCookedContent(
                cooked,
                full
            );

            toggle.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    const collapsed =
                        note.classList.toggle(
                            "collapsed"
                        );

                    toggle.setAttribute(
                        "aria-expanded",
                        String(
                            !collapsed
                        )
                    );

                    toggle.title =
                        collapsed
                            ? "Show full context"
                            : "Hide full context";

                    toggle.setAttribute(
                        "aria-label",
                        toggle.title
                    );
                }
            );
        }

        installLikeControl(
            note,
            best
        );

        return note;
    }

    async function ensureNote() {
        const route =
            getTopicRoute();

        if (!route) {
            return;
        }

        const topicMapContents =
            document.querySelector(
                ".topic-map.--op > .topic-map__contents"
            );

        if (!topicMapContents) {
            return;
        }

        let loaded;

        try {
            loaded =
                await loadTopic();
        } catch (error) {
            console.error(
                "Community Notes: failed to load topic data.",
                error
            );

            return;
        }

        if (!loaded) {
            return;
        }

        const {
            topic,
            posts,
        } = loaded;

        const best =
            getMostLikedReply(
                posts
            );

        const existing =
            topicMapContents.querySelector(
                ".df-community-note"
            );

        if (!best) {
            existing?.remove();

            return;
        }

        if (
            existing
                ?.dataset
                .sourcePost ===
            String(
                best.id
            )
        ) {
            return;
        }

        existing?.remove();

        const note =
            createNote(
                topic,
                posts,
                best
            );

        if (!note) {
            return;
        }

        topicMapContents.append(
            note
        );
    }

    let scheduled = false;

    function scheduleEnsureNote() {
        if (scheduled) {
            return;
        }

        scheduled = true;

        requestAnimationFrame(
            () => {
                scheduled =
                    false;

                ensureNote();
            }
        );
    }

    scheduleEnsureNote();

    const observer =
        new MutationObserver(
            scheduleEnsureNote
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true,
        }
    );

    window.addEventListener(
        "popstate",
        () => {
            currentTopicKey =
                null;

            currentTopic =
                null;

            currentPosts =
                null;

            topicLoadPromise =
                null;

            scheduleEnsureNote();
        }
    );
})();
