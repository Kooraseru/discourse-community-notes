// ==UserScript==
// @name         Discourse Community Notes
// @namespace    kooraseru
// @author       kooraseru (https://github.com/Kooraseru)
// @version      1.0.0
// @description  Community Notes for Discourse-based forums
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/main/discourse-community-notes.user.js
// @downloadURL  https://raw.githubusercontent.com/Kooraseru/discourse-community-notes/main/discourse-community-notes.user.js
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const TARGET_POST = 1;

    /*
     * We intentionally match broadly and then verify
     * that this is actually a Discourse topic.
     *
     * This also handles Discourse installations living
     * under subdirectories instead of assuming /t/*
     * exists directly at the domain root.
     */
    function isDiscourseTopic() {
        return Boolean(
            location.pathname.includes("/t/") &&
            document.querySelector(".post-stream") &&
            document.querySelector(
                "article[id^='post_']"
            ) &&
            window.require
        );
    }

    if (!isDiscourseTopic()) {
        return;
    }

    let iconHTML;

    try {
        ({
            iconHTML,
        } = window.require(
            "discourse-common/lib/icon-library"
        ));
    } catch (error) {
        console.error(
            "Community Notes: could not access the Discourse icon library.",
            error
        );

        return;
    }

    const style =
        document.createElement("style");

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

        /*
         * Preserve the structure that Discourse's
         * post-control CSS expects:
         *
         * nav.post-controls
         *   .actions
         *     .double-button
         *
         * display: contents keeps those ancestors
         * available to CSS selectors without making
         * the normal post toolbar control our layout.
         */
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

        /*
         * The short generated preview and the original
         * cooked post occupy the same conceptual area.
         */
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

        /*
         * Attribution remains visible regardless of
         * whether the full context is expanded.
         */
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

    function normalizeText(
        text
    ) {
        return text
            .replace(
                /\\s+/g,
                " "
            )
            .trim();
    }

    function getPostNumber(
        post
    ) {
        return Number(
            post.id.replace(
                "post_",
                ""
            )
        );
    }

    function getNativeLikeButton(
        post
    ) {
        return post.querySelector(
            ".post-menu-area button.toggle-like"
        );
    }

    function getNativeLikeCountButton(
        post
    ) {
        return post.querySelector(
            ".post-menu-area button.like-count.button-count"
        );
    }

    function getNativeDoubleButton(
        post
    ) {
        return post.querySelector(
            ".post-menu-area .double-button"
        );
    }

    function isLiked(
        post
    ) {
        const button =
            getNativeLikeButton(
                post
            );

        if (!button) {
            return false;
        }

        return (
            button.classList.contains(
                "has-like"
            ) ||
            button.getAttribute(
                "title"
            ) === "undo like" ||
            button.getAttribute(
                "aria-pressed"
            ) === "true"
        );
    }

    function getLikeCount(
        post
    ) {
        const count =
            getNativeLikeCountButton(
                post
            );

        if (count) {
            return (
                Number(
                    count
                        .textContent
                        .trim()
                        .replace(
                            /,/g,
                            ""
                        )
                ) || 0
            );
        }

        return isLiked(post)
            ? 1
            : 0;
    }

    function getUsername(
        post
    ) {
        return post
            .querySelector(
                ".topic-meta-data .names [data-user-card]"
            )
            ?.getAttribute(
                "data-user-card"
            );
    }

    function getUserUrl(
        username
    ) {
        return new URL(
            `/u/${encodeURIComponent(
                username
            )}`,
            location.origin
        ).href;
    }

    function getReplyUrl(
        post
    ) {
        return post
            .querySelector(
                ".post-info.post-date a.widget-link.post-date"
            )
            ?.href;
    }

    function getTopicAuthor() {
        const post =
            document.querySelector(
                `article#post_${TARGET_POST}`
            );

        if (!post) {
            return null;
        }

        const username =
            getUsername(post);

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

    function getMostLikedReply() {
        const posts = [
            ...document.querySelectorAll(
                "article[id^='post_']"
            ),
        ];

        let best = null;

        for (
            const post of posts
        ) {
            const postNumber =
                getPostNumber(
                    post
                );

            if (
                !Number.isFinite(
                    postNumber
                ) ||
                postNumber ===
                    TARGET_POST
            ) {
                continue;
            }

            const cooked =
                post.querySelector(
                    ".regular.contents > .cooked"
                );

            const doubleButton =
                getNativeDoubleButton(
                    post
                );

            const username =
                getUsername(
                    post
                );

            const url =
                getReplyUrl(
                    post
                );

            /*
             * Discourse progressively mounts each post.
             * Ignore incomplete ones for this pass.
             */
            if (
                !cooked ||
                !doubleButton ||
                !username ||
                !url
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
                    best.likes
            ) {
                best = {
                    post,
                    postNumber,
                    cooked,
                    likes,
                    username,
                    url,
                };
            }
        }

        return best;
    }

    /*
     * Produce text representing the reply author's own
     * contribution rather than whatever they quoted.
     */
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

    /*
     * Text representing everything the full expanded
     * version contains.
     *
     * This is used to decide whether expansion is
     * actually necessary.
     */
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

    /*
     * Build a 1-3 sentence semantic preview.
     */
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

        if (
            sentences.length ===
            0
        ) {
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

            /*
             * Never chop the first sentence.
             *
             * After that, avoid making the preview
             * unnecessarily massive.
             */
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

    function cloneReplyContent(
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

    function installLikeControl(
        note,
        best
    ) {
        const source =
            getNativeDoubleButton(
                best.post
            );

        const slot =
            note.querySelector(
                ".df-community-note-like-slot"
            );

        if (
            !source ||
            !slot
        ) {
            return;
        }

        slot.replaceChildren();

        /*
         * Clone Discourse's actual:
         *
         * [ count ] [ heart ]
         */
        const clone =
            source.cloneNode(
                true
            );

        clone.classList.add(
            "df-community-note-like-control"
        );

        const countButton =
            clone.querySelector(
                "button.like-count.button-count"
            );

        const heartButton =
            clone.querySelector(
                "button.toggle-like"
            );

        if (!heartButton) {
            console.error(
                "Community Notes: cloned native heart missing."
            );

            return;
        }

        /*
         * This copy is only presentation.
         * The real source reply remains authoritative.
         */
        heartButton.removeAttribute(
            "data-post-id"
        );

        /*
         * Clicking the count opens the actual
         * source reply.
         */
        if (countButton) {
            countButton.addEventListener(
                "click",
                event => {
                    event.preventDefault();
                    event.stopPropagation();

                    location.href =
                        best.url;
                }
            );
        }

        /*
         * Clicking the Community Note heart delegates
         * to the real source reply's Like button.
         */
        heartButton.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                toggleSourceLike(
                    note,
                    best
                );
            }
        );

        slot.appendChild(
            clone
        );
    }

    async function toggleSourceLike(
        note,
        best
    ) {
        const sourceButton =
            getNativeLikeButton(
                best.post
            );

        if (!sourceButton) {
            console.error(
                "Community Notes: source reply heart disappeared."
            );

            return;
        }

        const previousLiked =
            isLiked(
                best.post
            );

        const previousCount =
            getLikeCount(
                best.post
            );

        /*
         * Actual server-backed Discourse action.
         */
        sourceButton.click();

        /*
         * Wait for the actual source reply's state
         * to update.
         */
        for (
            let attempt = 0;
            attempt < 30;
            attempt++
        ) {
            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        100
                    )
            );

            if (
                isLiked(
                    best.post
                ) !==
                    previousLiked ||
                getLikeCount(
                    best.post
                ) !==
                    previousCount
            ) {
                break;
            }
        }

        /*
         * Reclone whatever Discourse now renders.
         */
        installLikeControl(
            note,
            best
        );
    }

    function createNote(
        best
    ) {
        const topicAuthor =
            getTopicAuthor();

        if (!topicAuthor) {
            console.error(
                "Community Notes: topic author could not be determined."
            );

            return null;
        }

        const excerpt =
            getExcerptText(
                best.cooked
            );

        const fullText =
            getFullText(
                best.cooked
            );

        /*
         * Expansion only exists if the preview does not
         * already represent the complete reply.
         *
         * A quoted section, code block, omitted media,
         * additional sentence, etc. all count as more.
         */
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
                best.postNumber
            );

        note.innerHTML = `
            <div class="df-community-note-head">

                <div class="df-community-note-title">
                    ${iconHTML("circle-info")}

                    <a
                        href="${best.url}"
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
                            class="df-community-note-full"
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
            console.error(
                "Community Notes: preview container missing."
            );

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
                console.error(
                    "Community Notes: expandable UI incomplete."
                );

                return null;
            }

            cloneReplyContent(
                best.cooked,
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

    function ensureNote() {
        const targetPost =
            document.querySelector(
                `article#post_${TARGET_POST}`
            );

        const topicMap =
            targetPost?.querySelector(
                ".topic-map.--op"
            );

        const topicMapContents =
            topicMap?.querySelector(
                ":scope > .topic-map__contents"
            );

        if (
            !targetPost ||
            !topicMap ||
            !topicMapContents
        ) {
            return;
        }

        const best =
            getMostLikedReply();

        if (!best) {
            return;
        }

        const existing =
            topicMapContents.querySelector(
                ".df-community-note"
            );

        if (
            existing
                ?.dataset
                .sourcePost ===
            String(
                best.postNumber
            )
        ) {
            return;
        }

        topicMapContents
            .querySelector(
                "hr.df-community-note-divider"
            )
            ?.remove();

        existing?.remove();

        const note =
            createNote(
                best
            );

        if (!note) {
            return;
        }

        /*
         * Divider I was considering, decided to drop it.
         */

        // const divider =
        //     document.createElement(
        //         "hr"
        //     );

        // divider.className =
        //     "df-community-note-divider";

        topicMapContents.append(
            // divider,
            note
        );
    }

    ensureNote();

    /*
     * Discourse virtualizes / progressively mounts posts.
     */
    let scheduled = false;

    const observer =
        new MutationObserver(
            () => {
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
        );

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true,
        }
    );
})();
