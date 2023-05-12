

class Tagster {
    constructor(element, configs) {
        this.$ = $(element);
        this.$input;

        if (configs) this.configs = { ...this.configs, ...configs };

        if (configs?.on) {
            Object.entries(configs.on).forEach(([event, callbacks]) => {
                if (!Array.isArray(callbacks)) this.on(event, callbacks);
                else {
                    callbacks.forEach(callback => this.on(event, callback));
                };
            });
        };

        this.init();
        this.stylize();
        this.startListeners();
    };
    configs = {
        tags: [],
        allowDuplicateTags: false,
        backspace: "edit",
        readonly: false,
        inputElement: 'textarea',
    };

    #tagHtml = (tag) => {
        const isInputElm = this.configs.inputElement == 'input';
        const inputHtml = isInputElm ?
            `<input class="tgs_tagInput"></input>` :
            `<${this.configs.inputElement} class="tgs_tagInput">${tag}</${this.configs.inputElement}>`;

        const $tag = $(`<span class="tgs_tag"> 
                <div class="tgs_move">
                    <svg class="tgs_moveLeft" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 256c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z"/></svg>
                    <svg class="tgs_moveRight" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M246.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-9.2-9.2-22.9-11.9-34.9-6.9s-19.8 16.6-19.8 29.6l0 256c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l128-128z"/></svg>
                </div>
                ${inputHtml}
            <button><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg></button> </span>`);

        if (isInputElm) $tag.find('.tgs_tagInput').val(tag);

        return $tag;
    }

    #focusTagInputEnd = (tagInput) => {
        const $tagInput = $(tagInput);
        $tagInput.focus();
        $tagInput.prop("selectionStart", $tagInput.val().length);
        $tagInput.prop("selectionEnd", $tagInput.val().length);
    };

    init() {
        let tgs = $(`<div>
            <${this.configs.inputElement} type="text" class="tgs_input"></${this.configs.inputElement}>
            <div class="tgs_enterTip"></div>
        </div>`);
        this.$[0].classList.forEach(c => tgs.addClass(c));
        Object.values(this.$[0].attributes).forEach(a => tgs.attr(a.name, a.value));
        tgs.addClass('tgs');

        this.placeholder = this.$.attr('placeholder') || '';
        if (this.placeholder) tgs.find('.tgs_input').attr('placeholder', this.placeholder);

        this.$.replaceWith(tgs);
        this.$ = tgs;
        this.$input = this.$.find('.tgs_input');
        if (this.configs.readonly) this.$.css('pointer-events', 'none');
    };

    get stylings() {
        return {
            lineheight: this.$.css('line-height'),
        };
    };

    stylize() {
        this.$input.css('height', this.stylings.lineheight);
        this.$.find(".tgs_enterTip").css('height', this.stylings.lineheight);
    };

    static docLineHeight = (() => {
        const $div = $('<div style="display: none; font-size: 1em;">');
        $('body').append($div);
        const lineHeight = $div.css('line-height');
        $div.remove();
        return lineHeight;
    })();

    autoResizeTxtA(elm) {
        let $elm = $(elm);
        const lineHeight = this.stylings.lineheight;

        // Ignores placeholder inside tag
        const width = () => {
            if ($elm.val()) return $elm.val().length;
            else if ($elm.parent().hasClass('tgs_tag')) return 0;
            else return this.placeholder.length;
        };

        $elm.css('width', width() + 3 + 'ch');
        $elm.css('height', lineHeight);

        const usingFullWidth = $elm.outerWidth() >= $elm.parent().width();

        switch ($elm.prop('tagName')) {
            case 'INPUT': break;
            default:
                if (usingFullWidth) $elm.css('height', `${$elm[0].scrollHeight || this.docLineHeight}px`);
                break;
        };
    };
    startListeners() {
        $(window).on("resize", this.stylize);

        this.$.on('click', () => {
            this.$input.focus();
        });

        this.$input.on('input', () => this.autoResizeTxtA(this.$input));

        this.$.one('focusin', () => {
            this.$.find('.tgs_tag .tgs_tagInput').each((i, e) => this.autoResizeTxtA(e));
        });

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
                const $tagInput = this.$.find('.tgs_tag').last().find(".tgs_tagInput");

                if (this.configs.backspace == "edit") {
                    this.#focusTagInputEnd($tagInput);
                } else if (this.configs.backspace == "remove" && !e.originalEvent.repeat) {
                    $tagInput.parent().remove();
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
        eventData.eventName = event;

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

            const $tagInput = $tag.find('.tgs_tagInput');
            this.autoResizeTxtA($tagInput);
            $tagInput.on('input', () => { this.autoResizeTxtA($tagInput) });
            $tagInput.on('click', e => e.stopPropagation());
            $tagInput.on('keydown', e => {
                if (e.key == 'Enter') {
                    e.preventDefault();
                    this.$input.focus();
                }
            });

            // Tag edit
            $tagInput.on('blur', () => {
                const val = this.#clearString($tagInput.val());
                let removed = false;

                if ((val == '') ||
                    (!this.configs.allowDuplicateTags &&
                        this.tags.filter(t => t == val).length > 1)) {
                    this.removeTags(val, $tag, true);
                    removed = true;
                }

                this.trigger('afterTagEdit', { tag: val, $tag, removed });
            });

            const $remove = $tag.find('button');
            $remove.on('click', () => this.removeTags(tag, $tag));

            const $moveLeft = $tag.find('.tgs_moveLeft'),
                $moveRight = $tag.find('.tgs_moveRight');

            $moveLeft.on('click', (e) => {
                e.stopPropagation();
                $tag.prev('.tgs_tag').before($tag);
                this.#focusTagInputEnd($tagInput);
            });
            $moveRight.on('click', (e) => {
                e.stopPropagation();
                $tag.next('.tgs_tag').after($tag);
                this.#focusTagInputEnd($tagInput);
            });

            this.trigger('afterAddTag', { tag, $tag });
        };
        this.autoResizeTxtA(this.$input);
    };

    removeTags(tag, $tag, edit = false) {
        if (tag === undefined) this.$.find(`.tgs_tag`).remove();

        if ($tag) $tag = $($tag);
        else $tag = this.$.find(`.tgs_tag:contains(${tag})`);

        if (this.trigger('beforeRemoveTag', { tag, $tag, edit })) return;
        $tag.remove();
        this.trigger('afterRemoveTag', { tag, edit });
    };

    get tags() {
        return this.$.find('.tgs_tag .tgs_tagInput').toArray().map(t => this.#clearString($(t).val()));
    };
};