

class Tagster {
    constructor(element, configs) {
        this.$ = $(element);
        this.$input;

        this.configs = {
            tags: [],
            allowDuplicateTags: false,
            backspace: "edit",
            ...configs,
        }

        this.init();
        this.stylize();
        this.startListeners();
    };
    #tagHtml = (tag) => `<span class="tgs_tag"> 
                <div class="tgs_move">
                <svg class="tgs_moveLeft" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 256c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z"/></svg>
                <svg class="tgs_moveRight" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M246.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-9.2-9.2-22.9-11.9-34.9-6.9s-19.8 16.6-19.8 29.6l0 256c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l128-128z"/></svg></div>
                <textarea>${tag}</textarea>
            <button onclick="$(this).parent().remove();">x</button> </span>`;

    #focusTextAreaEnd = (textarea) => {
        const $textarea = $(textarea);
        $textarea.focus();
        $textarea.prop("selectionStart", $textarea.val().length);
        $textarea.prop("selectionEnd", $textarea.val().length);
    };

    init() {
        let tgs = $(`<div>
            <textarea type="text" class="tgs_input"></textarea>
        </div>`);
        this.$[0].classList.forEach(c => tgs.addClass(c));
        Object.values(this.$[0].attributes).forEach(a => tgs.attr(a.name, a.value));
        tgs.addClass('tgs');

        this.$.replaceWith(tgs);
        this.$ = tgs;
        this.$input = this.$.find('.tgs_input');
    };

    get stylings() {
        return {
            lineheight: this.$.css('line-height'),
        };
    };

    stylize() {
        this.$input.css('height', this.stylings.lineheight);
    };

    #autoResizeTxtA(elm) {
        let $elm = $(elm);
        const lineHeight = this.stylings.lineheight;

        $elm.css('width', $elm.val().length + 2 + 'ch');
        $elm.css('height', lineHeight);

        if ($elm.outerWidth() >= $elm.parent().width()) {
            $elm.css('height', `${$elm[0].scrollHeight}px`);
        }
    }
    startListeners() {
        $(window).on("resize", this.stylize);

        this.$.on('click', () => this.$input.focus());

        this.$input.on('input', () => this.#autoResizeTxtA(this.$input));

        this.$input.on('keydown', e => {
            if (e.key == 'Enter') {
                e.preventDefault();
                this.addTags();
            };

            if (e.key == 'Backspace'
                && this.configs.backspace
                && !this.#clearString(this.$input.val())
                && this.tags.length > 0) {
                e.preventDefault();
                const $textarea = this.$.find('.tgs_tag').last().find("textarea");

                if (this.configs.backspace == "edit") {
                    this.#focusTextAreaEnd($textarea);
                } else if (this.configs.backspace == "remove") {
                    $textarea.parent().remove();
                };
            };
        });
    };

    #listeners = {};
    on(event, callback) {
        if (!this.#listeners[event]) this.#listeners[event] = [];
        this.#listeners[event].push(callback);
    };

    trigger(event, eventData) {
        if (!this.#listeners[event]) return;

        let halt = false;
        eventData.preventDefault = () => halt = true;

        this.#listeners[event].forEach(callback => {
            callback(eventData)
        });

        return halt;
    };

    #clearString(str) {
        return str.replace(/(\r\n|\n|\r)/gm, "").replaceAll("  ", "").trim();
    };

    addTags(tags) {
        if (!tags) tags = this.#clearString(this.$input.val());
        if (!tags) return;

        if (!Array.isArray(tags)) tags = [tags];

        for (let tag of tags) {
            if (!this.configs.allowDuplicateTags && this.tags.includes(tag)) return;

            if (this.trigger('beforeAddTag', { tag: tag, })) return;

            let $tag = $(this.#tagHtml(tag)).insertBefore(this.$input);
            this.$input.val('');

            const $textarea = $tag.find('textarea');
            this.#autoResizeTxtA($textarea);
            $textarea.on('input', () => { this.#autoResizeTxtA($textarea) });
            $textarea.on('click', e => e.stopPropagation());
            $textarea.on('keydown', e => {
                if (e.key == 'Enter') {
                    e.preventDefault();
                    this.$input.focus();
                }
            });
            $textarea.on('blur', () => {
                if (this.#clearString($textarea.val()) == '') $tag.remove();
            });

            const $moveLeft = $tag.find('.tgs_moveLeft'),
                $moveRight = $tag.find('.tgs_moveRight');

            $moveLeft.on('click', (e) => {
                e.stopPropagation();
                $tag.prev('.tgs_tag').before($tag);
                this.#focusTextAreaEnd($textarea);
            });
            $moveRight.on('click', (e) => {
                e.stopPropagation();
                $tag.next('.tgs_tag').after($tag);
                this.#focusTextAreaEnd($textarea);
            });

            this.trigger('afterAddTag', { tag, $tag });
        }
    };

    removeTags(tag) {
        if (!tag) this.$.find(`.tgs_tag`).remove();

        const $tag = this.$.find(`.tgs_tag:contains(${tag})`);
        if (this.trigger('beforeRemoveTag', { tag, $tag })) return;
        $tag.remove();
        this.trigger('afterRemoveTag', { tag });
    };

    get tags() {
        return this.$.find('.tgs_tag').toArray().map(t => this.#clearString(t.innerText));
    };


};