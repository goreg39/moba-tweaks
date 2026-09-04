// ==UserScript==
// @name         Moba Tweaks
// @namespace    local.gorchik.moba
// @version      0.15.1
// @description  Moba Tweaks: широкая верстка, компактный поиск, понятные предметные группы и простая шкала качества — лучшие варианты сверху, бюджетные снизу.
// @homepageURL  https://github.com/goreg39/moba-tweaks
// @updateURL    https://raw.githubusercontent.com/goreg39/moba-tweaks/main/moba-tweaks.user.js
// @downloadURL  https://raw.githubusercontent.com/goreg39/moba-tweaks/main/moba-tweaks.user.js
// @match        https://sankt-peterburg.moba.ru/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    var pageUrl = new URL(window.location.href);
    var isSearchPage = pageUrl.pathname.indexOf('/catalog/') === 0 && pageUrl.searchParams.has('q');

    var RETURN_SEARCH_KEY = 'moba-tweaks-return-search';

    function isGlobalEditableTarget(target) {
        if (!target || !target.tagName) return false;
        var tagName = target.tagName.toLowerCase();
        return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
    }

    function parseReturnSearchState() {
        try {
            var raw = window.sessionStorage.getItem(RETURN_SEARCH_KEY);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.searchUrl || !parsed.productUrl) return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function isSearchUrl(value) {
        try {
            var url = new URL(value, window.location.origin);
            return url.origin === window.location.origin &&
                url.pathname.indexOf('/catalog/') === 0 && url.searchParams.has('q');
        } catch (e) {
            return false;
        }
    }

    function installBackspaceReturn() {
        if (document.documentElement.dataset.mobaBackspaceReturn === '1') return;
        document.documentElement.dataset.mobaBackspaceReturn = '1';

        document.addEventListener('keydown', function (event) {
            if (event.defaultPrevented || event.key !== 'Backspace') return;
            if (isGlobalEditableTarget(event.target)) return;
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            if (pageUrl.pathname.indexOf('/catalog/') !== 0 || pageUrl.searchParams.has('q')) return;

            var referrerIsSearch = isSearchUrl(document.referrer);
            var state = parseReturnSearchState();
            var storedMatchesCurrent = false;
            if (state) {
                try {
                    storedMatchesCurrent = new URL(state.productUrl, window.location.origin).href === window.location.href;
                } catch (e) {
                    storedMatchesCurrent = false;
                }
            }

            if (!referrerIsSearch && !storedMatchesCurrent) return;

            event.preventDefault();
            if (storedMatchesCurrent) window.sessionStorage.removeItem(RETURN_SEARCH_KEY);

            if (window.history.length > 1) {
                window.history.back();
            } else if (storedMatchesCurrent && isSearchUrl(state.searchUrl)) {
                window.location.href = state.searchUrl;
            }
        });
    }

    installBackspaceReturn();

    /*
     * v0.12: каждый товар обязательно получает предметную категорию.
     * Ключ категории строится по типу детали + совместимому устройству, а варианты
     * качества/технологии не дробят одну категорию на множество одинаковых заголовков.
     */
    var QUALITY_RULES = [
        { id: 'service-original', axis: 'class', label: 'СЕРВИСНЫЙ ОРИГИНАЛ', className: 'moba-quality--service-original', rank: 5, regex: /сервисн(?:ый|ого|ому|ым|ом)\s+оригинал/ig },
        { id: 'or-sp', axis: 'class', label: 'OR (SP)', className: 'moba-quality--or-sp', rank: 10, regex: /\bor\s*\(\s*sp\s*\)/ig },
        { id: 'or100', axis: 'class', label: 'OR100', className: 'moba-quality--or100', rank: 15, regex: /\bor\s*100\b/ig },
        { id: 'or', axis: 'class', label: 'OR', className: 'moba-quality--or', rank: 20, regex: /\bor\b(?!\s*(?:100|\(\s*sp\s*\)))/ig },
        { id: 'premium', axis: 'class', label: 'PREMIUM', className: 'moba-quality--premium', rank: 30, regex: /(?:premium|премиум)/ig },
        { id: 'remax', axis: 'brand', label: 'REMAX', className: 'moba-quality--brand', rank: 31, regex: /\bremax\b/ig },

        { id: 'soft-oled', axis: 'technology', label: 'SOFT OLED', className: 'moba-quality--soft-oled', rank: 40, regex: /\bsoft\s*[- ]?\s*oled\b/ig },
        { id: 'hard-oled', axis: 'technology', label: 'HARD OLED', className: 'moba-quality--hard-oled', rank: 60, regex: /\bhard\s*[- ]?\s*oled\b/ig },
        { id: 'oled', axis: 'technology', label: 'OLED', className: 'moba-quality--oled', rank: 50, regex: /\boled\b/ig },
        { id: 'incell', axis: 'technology', label: 'IN-CELL', className: 'moba-quality--incell', rank: 70, regex: /\b(?:in\s*[- ]?\s*cell|incell|incel)\b/ig },
        { id: 'cog', axis: 'technology', label: 'COG', className: 'moba-quality--cog', rank: 75, regex: /\bcog\b/ig },
        { id: 'cof', axis: 'technology', label: 'COF', className: 'moba-quality--cog', rank: 76, regex: /\bcof\b/ig },

        { id: 'battery-collection', axis: 'brand', label: 'BATTERY COLLECTION', className: 'moba-quality--brand', rank: 100, regex: /\bbattery\s+collection\b/ig },
        { id: 'zevo', axis: 'brand', label: 'ZEVO', className: 'moba-quality--brand', rank: 101, regex: /\bzevo\b/ig },
        { id: 'pisen', axis: 'brand', label: 'PISEN', className: 'moba-quality--brand', rank: 102, regex: /\bpisen\b/ig },
        { id: 'jcp', axis: 'brand', label: 'JCP', className: 'moba-quality--brand', rank: 103, regex: /\bjcp\b/ig },
        { id: 'optima', axis: 'brand', label: 'OPTIMA', className: 'moba-quality--brand', rank: 104, regex: /(?:\boptima\b|\bоптима\b)/ig },
        { id: 'mechanico', axis: 'brand', label: 'МЕХАНИКО', className: 'moba-quality--brand', rank: 105, regex: /(?:\bmechanico\b|\bмеханико\b)/ig },

        { id: 'full-size', axis: 'package', label: 'FULL SIZE', className: 'moba-quality--package', rank: 120, regex: /\bfull\s*size\b/ig },
        { id: 'full-hd', axis: 'package', label: 'FULL HD', className: 'moba-quality--package', rank: 121, regex: /\bfull\s*hd\b/ig },
        { id: 'kit', axis: 'package', label: 'КОМПЛЕКТ', className: 'moba-quality--package', rank: 122, regex: /коробк[аи]?\s*\+\s*скотч\s*\+\s*отвертк[аи]/ig },
        { id: 'sp', axis: 'package', label: 'SP', className: 'moba-quality--package', rank: 123, regex: /\(\s*sp\s*\)/ig }
    ];

    var RATING_LEVELS = {
        best: { id: 'best', label: 'ЛУЧШЕЕ', rank: 10, tone: 'best' },
        veryGood: { id: 'very-good', label: 'ОЧЕНЬ ХОРОШЕЕ', rank: 20, tone: 'very-good' },
        good: { id: 'good', label: 'ХОРОШЕЕ', rank: 30, tone: 'good' },
        normal: { id: 'normal', label: 'НОРМАЛЬНОЕ', rank: 40, tone: 'normal' },
        budget: { id: 'budget', label: 'БЮДЖЕТНОЕ', rank: 50, tone: 'budget' },
        lowest: { id: 'lowest', label: 'САМОЕ БЮДЖЕТНОЕ', rank: 60, tone: 'lowest' },
        unknown: { id: 'unknown', label: 'НЕ ОПРЕДЕЛЕНО', rank: 90, tone: 'unknown' }
    };

    var COLOR_RULES = [
        ['Черный', /(?:черный|чёрный)\s*$/i],
        ['Белый', /белый\s*$/i],
        ['Синий', /синий\s*$/i],
        ['Красный', /красный\s*$/i],
        ['Зеленый', /(?:зеленый|зелёный)\s*$/i],
        ['Серый', /серый\s*$/i],
        ['Голубой', /голубой\s*$/i],
        ['Фиолетовый', /фиолетовый\s*$/i],
        ['Розовый', /розовый\s*$/i],
        ['Золотой', /золотой\s*$/i],
        ['Серебристый', /серебристый\s*$/i],
        ['Оранжевый', /оранжевый\s*$/i],
        ['Желтый', /(?:желтый|жёлтый)\s*$/i],
        ['Бежевый', /бежевый\s*$/i],
        ['Бронзовый', /бронзовый\s*$/i],
        ['Зеленый', /\bgreen\s*$/i],
        ['Синий', /\bblue\s*$/i],
        ['Красный', /\bred\s*$/i],
        ['Белый', /\bwhite\s*$/i],
        ['Черный', /\bblack\s*$/i],
        ['Золотой', /\bgold\s*$/i],
        ['Серый', /\bgray\s*$/i],
        ['Серый', /\bgrey\s*$/i],
        ['Розовый', /\bpink\s*$/i],
        ['Фиолетовый', /\bpurple\s*$/i]
    ];

    GM_addStyle('\n' +
        'body.moba-tweaks-global .cont{width:min(96vw,1920px)!important;max-width:none!important;margin-left:auto!important;margin-right:auto!important;}\n' +
        'body.moba-tweaks-enabled .moba-page{margin-bottom:56px!important;}\n' +
        'body.moba-tweaks-enabled .moba-page-title{margin-bottom:0!important;}\n' +
        'body.moba-tweaks-enabled .moba-main-row{margin-top:18px!important;}\n' +
        'body.moba-tweaks-enabled .moba-search-summary,body.moba-tweaks-enabled .moba-category-row,body.moba-tweaks-enabled .moba-sort-row{margin-bottom:10px!important;}\n' +
        'body.moba-tweaks-enabled .moba-divider{margin-top:12px!important;margin-bottom:12px!important;}\n' +
        'body.moba-tweaks-enabled .moba-exact-label{margin-bottom:6px!important;padding-top:4px!important;padding-bottom:4px!important;font-size:12px!important;}\n' +

        '@media (min-width:1280px){\n' +
        'body.moba-tweaks-enabled .moba-filter-sidebar{display:none!important;}\n' +
        'body.moba-tweaks-enabled.moba-filters-open .moba-filter-sidebar{display:block!important;position:fixed!important;left:18px!important;top:150px!important;width:310px!important;max-height:calc(100vh - 170px)!important;overflow:auto!important;z-index:1001!important;margin:0!important;padding:0!important;background:#fff!important;border-radius:12px!important;box-shadow:0 10px 35px rgba(0,0,0,.18)!important;}\n' +
        '#moba-tweaks-filter-toggle{display:flex;position:fixed;left:0;top:50%;z-index:1002;width:34px;height:92px;padding:7px 5px;align-items:center;justify-content:center;border:1px solid #1c7bc9;border-left:0;border-radius:0 9px 9px 0;background:#fff;color:#1c7bc9;box-shadow:0 3px 14px rgba(0,0,0,.12);cursor:pointer;font:600 12px/1 Arial,sans-serif;writing-mode:vertical-rl;transform:translateY(-50%) rotate(180deg);user-select:none;}\n' +
        '#moba-tweaks-filter-toggle:hover,body.moba-filters-open #moba-tweaks-filter-toggle{background:#eaf5ff;}\n' +

        'body.moba-tweaks-enabled .moba-product-card{min-height:60px!important;align-items:stretch!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-image-link{display:block!important;width:52px!important;min-width:52px!important;height:52px!important;margin:4px 0 4px 6px!important;border-right:0!important;border-bottom:0!important;border-radius:5px!important;overflow:hidden!important;align-self:center!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-image-link img{width:100%!important;height:100%!important;object-fit:contain!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-body{display:grid!important;grid-template-columns:minmax(0,1fr) 96px 190px!important;gap:10px!important;align-items:center!important;padding:5px 10px!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-info{margin:0!important;min-width:0!important;align-self:center!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-meta-row{margin-bottom:2px!important;gap:7px!important;align-items:center!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-meta-row [class*="fb-mobile-14"],body.moba-tweaks-enabled .moba-product-meta-row [class*="fb-desktop-14"]{font-size:11px!important;line-height:14px!important;}\n' +
        'body.moba-tweaks-enabled .moba-title-line{display:flex!important;align-items:center!important;gap:6px!important;flex-wrap:wrap!important;min-width:0!important;font-size:14px!important;line-height:17px!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-title{display:inline!important;min-width:0!important;font-size:14px!important;line-height:17px!important;overflow:hidden!important;text-overflow:ellipsis!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-price{margin:0!important;font-size:16px!important;line-height:20px!important;white-space:nowrap!important;font-variant-numeric:tabular-nums;}\n' +
        'body.moba-tweaks-enabled .moba-product-price>div:first-child{font-size:16px!important;line-height:20px!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-actions{min-width:0!important;align-items:center!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-actions .cart-btn__add,body.moba-tweaks-enabled .moba-product-actions .cart-btn__counter{height:34px!important;min-height:34px!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-actions .cart-btn__counter{padding-left:8px!important;padding-right:8px!important;}\n' +
        'body.moba-tweaks-enabled .moba-product-actions .cart-btn__counter button{width:24px!important;height:24px!important;}\n' +
        'body.moba-tweaks-enabled .moba-favorite-wrap{margin-left:7px!important;}\n' +
        'body.moba-tweaks-enabled .moba-favorite-wrap>button{width:34px!important;height:34px!important;}\n' +
        '}\n' +
        '@media (max-width:1279px){#moba-tweaks-filter-toggle{display:none!important;}}\n' +

        '.moba-native-quality-hidden{display:none!important;}\n' +
        '.moba-quality-badges{display:inline-flex;align-items:center;gap:4px;flex:none;}\n' +
        '.moba-quality-badge{display:inline-flex;align-items:center;height:19px;padding:0 6px;border-radius:5px;color:#fff;font:700 10px/19px Arial,sans-serif;letter-spacing:.25px;white-space:nowrap;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);}\n' +
        '.moba-quality--service-original{background:#075c36;}\n' +
        '.moba-quality--or-sp{background:#0d7041;}\n' +
        '.moba-quality--or100{background:#126d3d;}\n' +
        '.moba-quality--or{background:#238443;}\n' +
        '.moba-quality--premium{background:#65a52c;}\n' +
        '.moba-quality--soft-oled{background:#a7a116;}\n' +
        '.moba-quality--oled{background:#d19100;}\n' +
        '.moba-quality--hard-oled{background:#d96915;}\n' +
        '.moba-quality--incell{background:#c43f35;}\n' +
        '.moba-quality--cog{background:#8a6b27;}\n' +
        '.moba-quality--brand{background:#55758c;}\n' +
        '.moba-quality--package{background:#75818b;}\n' +
        '.moba-quality--none{background:#7b8790;}\n' +
        '.moba-rating--best{background:#0d5b35;}\n' +
        '.moba-rating--very-good{background:#238443;}\n' +
        '.moba-rating--good{background:#65a52c;}\n' +
        '.moba-rating--good-muted{background:#a6b396;}\n' +
        '.moba-rating--normal{background:#d19100;}\n' +
        '.moba-rating--budget{background:#d96915;}\n' +
        '.moba-rating--lowest{background:#c43f35;}\n' +
        '.moba-rating--unknown{background:#7b8790;}\n' +
        '.moba-quality-section.moba-quality-bg--best{background:#e9f6ee!important;}\n' +
        '.moba-quality-section.moba-quality-bg--very-good{background:#eef8f1!important;}\n' +
        '.moba-quality-section.moba-quality-bg--good{background:#f3f8ea!important;}\n' +
        '.moba-quality-section.moba-quality-bg--good-muted{background:#fafbf8!important;}\n' +
        '.moba-quality-section.moba-quality-bg--normal{background:#fff7e3!important;}\n' +
        '.moba-quality-section.moba-quality-bg--budget{background:#fff0e6!important;}\n' +
        '.moba-quality-section.moba-quality-bg--lowest{background:#ffefed!important;}\n' +
        '.moba-quality-section.moba-quality-bg--unknown{background:#f2f5f7!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--best,.moba-product-wrap.moba-quality-bg--best>article{background:#f0faf4!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--very-good,.moba-product-wrap.moba-quality-bg--very-good>article{background:#f4faf5!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--good,.moba-product-wrap.moba-quality-bg--good>article{background:#f7faf1!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--good-muted,.moba-product-wrap.moba-quality-bg--good-muted>article{background:#fdfefc!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--normal,.moba-product-wrap.moba-quality-bg--normal>article{background:#fffbf1!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--budget,.moba-product-wrap.moba-quality-bg--budget>article{background:#fff6f0!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--lowest,.moba-product-wrap.moba-quality-bg--lowest>article{background:#fff5f4!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--unknown,.moba-product-wrap.moba-quality-bg--unknown>article{background:#f7f9fa!important;}\n' +
        '.moba-quality-section.moba-quality-bg--service-original{background:#e6f4ec!important;}\n' +
        '.moba-quality-section.moba-quality-bg--or-sp{background:#eaf6ee!important;}\n' +
        '.moba-quality-section.moba-quality-bg--or100{background:#eaf6ee!important;}\n' +
        '.moba-quality-section.moba-quality-bg--or{background:#eef8f1!important;}\n' +
        '.moba-quality-section.moba-quality-bg--premium{background:#f3f8ea!important;}\n' +
        '.moba-quality-section.moba-quality-bg--soft-oled{background:#faf9e7!important;}\n' +
        '.moba-quality-section.moba-quality-bg--oled{background:#fff7e3!important;}\n' +
        '.moba-quality-section.moba-quality-bg--hard-oled{background:#fff0e6!important;}\n' +
        '.moba-quality-section.moba-quality-bg--incell{background:#ffefed!important;}\n' +
        '.moba-quality-section.moba-quality-bg--cog{background:#faf5e8!important;}\n' +
        '.moba-quality-section.moba-quality-bg--neutral{background:#f0f5f8!important;}\n' +
        '.moba-quality-section.moba-quality-bg--none{background:#f7f9fa!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--service-original,.moba-product-wrap.moba-quality-bg--service-original>article{background:#edf8f2!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--or-sp,.moba-product-wrap.moba-quality-bg--or-sp>article{background:#f0faf4!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--or100,.moba-product-wrap.moba-quality-bg--or100>article{background:#f1faf4!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--or,.moba-product-wrap.moba-quality-bg--or>article{background:#f4faf5!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--premium,.moba-product-wrap.moba-quality-bg--premium>article{background:#f7faf1!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--soft-oled,.moba-product-wrap.moba-quality-bg--soft-oled>article{background:#fdfcf2!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--oled,.moba-product-wrap.moba-quality-bg--oled>article{background:#fffbf1!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--hard-oled,.moba-product-wrap.moba-quality-bg--hard-oled>article{background:#fff6f0!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--incell,.moba-product-wrap.moba-quality-bg--incell>article{background:#fff5f4!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--cog,.moba-product-wrap.moba-quality-bg--cog>article{background:#fcf9f1!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--neutral,.moba-product-wrap.moba-quality-bg--neutral>article{background:#f5f8fa!important;}\n' +
        '.moba-product-wrap.moba-quality-bg--none,.moba-product-wrap.moba-quality-bg--none>article{background:#fafbfc!important;}\n' +
        '.moba-group-header{min-height:34px;margin-top:10px;padding:7px 12px 7px 68px;display:flex;align-items:center;background:#edf3f7;border:1px solid #d8e3eb;border-bottom-color:#d3dee6;border-radius:10px 10px 0 0;color:#30383d;font:700 13px/17px Arial,sans-serif;box-shadow:inset 4px 0 0 #c9d8e4;}\n' +
        '.moba-quality-section{min-height:26px;margin-left:18px;padding:4px 12px 4px 14px;display:flex;align-items:center;gap:7px;background:#fafcfd;border:1px solid #e4ebf0;border-bottom-color:#dde6ec;border-left-width:4px;border-radius:8px 8px 0 0;color:#65727b;font:600 11px/15px Arial,sans-serif;}\n' +
        '.moba-quality-section-count{color:#8b979f;font-weight:500;}\n' +
        '.moba-product-wrap.moba-grouped .moba-product-title{font-weight:600!important;}\n' +
        '.moba-product-wrap.moba-group-level-1{margin-left:10px;border-left:3px solid #dce6ed;border-right:1px solid #e7eef3;}\n' +
        '.moba-product-wrap.moba-group-level-1>article,.moba-product-wrap.moba-group-level-2>article{border-radius:0!important;}\n' +
        '.moba-product-wrap.moba-group-level-2{margin-left:18px;border-left:4px solid #dce6ed;border-right:1px solid #e7eef3;}\n' +
        '.moba-product-wrap.moba-group-start{margin-top:0;}\n' +
        '.moba-product-wrap.moba-group-end{margin-bottom:10px;}\n' +
        '.moba-product-wrap.moba-group-level-1.moba-group-start,.moba-product-wrap.moba-group-level-2.moba-subgroup-start{overflow:hidden;border-top-left-radius:0;border-top-right-radius:8px;}\n' +
        '.moba-product-wrap.moba-group-level-1.moba-group-end,.moba-product-wrap.moba-group-level-2.moba-subgroup-end{overflow:hidden;border-bottom-left-radius:8px;border-bottom-right-radius:8px;}\n' +
        '.moba-product-wrap.moba-group-level-1.moba-group-start>article,.moba-product-wrap.moba-group-level-2.moba-subgroup-start>article{border-top-right-radius:8px!important;}\n' +
        '.moba-product-wrap.moba-group-level-1.moba-group-end>article,.moba-product-wrap.moba-group-level-2.moba-subgroup-end>article{border-bottom-right-radius:8px!important;}\n' +
        '.moba-product-wrap.moba-group-level-2.moba-subgroup-end{margin-bottom:8px;}\n' +
        '.moba-quality-section.moba-quality-bg--service-original,.moba-product-wrap.moba-group-level-2.moba-quality-bg--service-original{border-left-color:#075c36!important;}\n' +
        '.moba-quality-section.moba-quality-bg--or-sp,.moba-product-wrap.moba-group-level-2.moba-quality-bg--or-sp{border-left-color:#0d7041!important;}\n' +
        '.moba-quality-section.moba-quality-bg--or100,.moba-product-wrap.moba-group-level-2.moba-quality-bg--or100{border-left-color:#0d5b35!important;}\n' +
        '.moba-quality-section.moba-quality-bg--or,.moba-product-wrap.moba-group-level-2.moba-quality-bg--or{border-left-color:#238443!important;}\n' +
        '.moba-quality-section.moba-quality-bg--premium,.moba-product-wrap.moba-group-level-2.moba-quality-bg--premium{border-left-color:#65a52c!important;}\n' +
        '.moba-quality-section.moba-quality-bg--soft-oled,.moba-product-wrap.moba-group-level-2.moba-quality-bg--soft-oled{border-left-color:#a7a116!important;}\n' +
        '.moba-quality-section.moba-quality-bg--oled,.moba-product-wrap.moba-group-level-2.moba-quality-bg--oled{border-left-color:#d19100!important;}\n' +
        '.moba-quality-section.moba-quality-bg--hard-oled,.moba-product-wrap.moba-group-level-2.moba-quality-bg--hard-oled{border-left-color:#d96915!important;}\n' +
        '.moba-quality-section.moba-quality-bg--incell,.moba-product-wrap.moba-group-level-2.moba-quality-bg--incell{border-left-color:#c43f35!important;}\n' +
        '.moba-quality-section.moba-quality-bg--cog,.moba-product-wrap.moba-group-level-2.moba-quality-bg--cog{border-left-color:#8a6b27!important;}\n' +
        '.moba-quality-section.moba-quality-bg--neutral,.moba-product-wrap.moba-group-level-2.moba-quality-bg--neutral{border-left-color:#55758c!important;}\n' +
        '.moba-quality-section.moba-quality-bg--none,.moba-product-wrap.moba-group-level-2.moba-quality-bg--none{border-left-color:#7b8790!important;}\n' +
        '.moba-quality-section.moba-quality-bg--best,.moba-product-wrap.moba-group-level-2.moba-quality-bg--best{border-left-color:#0d5b35!important;}\n' +
        '.moba-quality-section.moba-quality-bg--very-good,.moba-product-wrap.moba-group-level-2.moba-quality-bg--very-good{border-left-color:#238443!important;}\n' +
        '.moba-quality-section.moba-quality-bg--good,.moba-product-wrap.moba-group-level-2.moba-quality-bg--good{border-left-color:#65a52c!important;}\n' +
        '.moba-quality-section.moba-quality-bg--good-muted,.moba-product-wrap.moba-group-level-2.moba-quality-bg--good-muted{border-left-color:#b6c0aa!important;}\n' +
        '.moba-quality-section.moba-quality-bg--normal,.moba-product-wrap.moba-group-level-2.moba-quality-bg--normal{border-left-color:#d19100!important;}\n' +
        '.moba-quality-section.moba-quality-bg--budget,.moba-product-wrap.moba-group-level-2.moba-quality-bg--budget{border-left-color:#d96915!important;}\n' +
        '.moba-quality-section.moba-quality-bg--lowest,.moba-product-wrap.moba-group-level-2.moba-quality-bg--lowest{border-left-color:#c43f35!important;}\n' +
        '.moba-quality-section.moba-quality-bg--unknown,.moba-product-wrap.moba-group-level-2.moba-quality-bg--unknown{border-left-color:#7b8790!important;}\n' +

        '.moba-product-wrap.moba-keyboard-selected{position:relative!important;z-index:3!important;outline:3px solid #1c7bc9!important;outline-offset:-3px!important;box-shadow:0 0 0 2px rgba(28,123,201,.18),0 4px 14px rgba(0,0,0,.10)!important;}\n' +
        '.moba-product-wrap.moba-keyboard-selected>article{position:relative!important;}\n' +
        '.moba-product-wrap.moba-keyboard-selected>article:after{content:"";position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.75);}\n' +

        '.moba-group-model{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:5px;}\n' +
        '.moba-group-model--match{background:#e2f4e8;color:#176b3a;box-shadow:inset 0 0 0 1px #b9dfc7;}\n' +
        '.moba-group-model--mismatch{background:#fde8e7;color:#a9302a;box-shadow:inset 0 0 0 1px #efc0bd;}\n' +
        '.moba-stock-status{padding:1px 6px!important;border-radius:5px!important;font-weight:700!important;line-height:16px!important;box-decoration-break:clone;-webkit-box-decoration-break:clone;}\n' +
        '.moba-stock-status--unavailable{background:#b42318!important;color:#fff!important;}\n' +
        '.moba-stock-status--waiting{background:#f79009!important;color:#fff!important;pointer-events:none!important;}\n' +
        '.moba-stock-tooltip-disabled{pointer-events:none!important;}\n' +
        '.moba-stock-status--limited{background:#fdb022!important;color:#4a3300!important;}\n' +
        '.moba-stock-status--available{color:#207a43!important;font-weight:700!important;}\n' +
        '.moba-stock-status--other-store{background:#fff1d6!important;color:#9a4f00!important;box-shadow:inset 0 0 0 1px #f0c36a;}\n' +
        '.moba-stock-native-available-suppressed{display:none!important;}\n' +
        '.moba-product-wrap.moba-stock-wrapper--unavailable{box-shadow:inset -5px 0 0 #d92d20!important;}\n' +
        '.moba-product-wrap.moba-stock-wrapper--unavailable .moba-product-title,.moba-product-wrap.moba-stock-wrapper--unavailable .moba-product-price{opacity:.62!important;}\n' +
        '.moba-product-wrap.moba-stock-wrapper--waiting{box-shadow:inset -5px 0 0 #f79009!important;}\n' +
        '.moba-product-wrap.moba-stock-wrapper--limited{box-shadow:inset -5px 0 0 #fdb022!important;}\n' +
        '.moba-product-wrap.moba-stock-wrapper--other-store{box-shadow:inset -5px 0 0 #d97706!important;}\n' +
        '#moba-tweaks-image-modal{display:none;position:fixed;inset:0;z-index:2147483600;align-items:center;justify-content:center;padding:28px;background:rgba(17,24,39,.86);cursor:zoom-out;overflow:auto;}\n' +
        '#moba-tweaks-image-modal img{display:block;max-width:92vw;max-height:90vh;object-fit:contain;background:#fff;border-radius:10px;box-shadow:0 20px 70px rgba(0,0,0,.45);cursor:zoom-in;}\n' +
        '#moba-tweaks-image-modal.moba-image-modal--zoomed{display:block!important;text-align:center;}\n' +
        '#moba-tweaks-image-modal.moba-image-modal--zoomed img{max-width:none;max-height:none;margin:0 auto;cursor:zoom-out;}\n' +
        '#moba-tweaks-image-modal .moba-image-status{position:fixed;left:24px;top:20px;padding:6px 9px;border-radius:7px;background:rgba(255,255,255,.94);color:#344054;font:600 12px/16px Arial,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.2);pointer-events:none;}\n' +
        '#moba-tweaks-image-modal button{position:fixed;right:24px;top:18px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.94);color:#222;font:700 26px/42px Arial,sans-serif;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.28);}\n' +
        '#moba-tweaks-image-preview{display:none;position:fixed;z-index:2147483000;width:410px;height:410px;padding:8px;background:#fff;border:1px solid #d9e2e8;border-radius:10px;box-shadow:0 14px 45px rgba(0,0,0,.24);pointer-events:none;}\n' +
        '#moba-tweaks-image-preview img{width:100%;height:100%;object-fit:contain;display:block;}\n'
    );

    document.body.classList.add('moba-tweaks-global');
    if (!isSearchPage) return;

    var state = { enhanceTimer: 0, preview: null, imageModal: null, imageCache: {}, observer: null, enhancing: false, selectedProduct: null };

    function normalizeSpaces(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function resetRegex(regex) {
        regex.lastIndex = 0;
        return regex;
    }

    function cleanupVariantText(text) {
        var out = normalizeSpaces(text);
        var previous = '';

        while (previous !== out) {
            previous = out;
            out = out
                .replace(/\(\s*[-–—,:;\/|]*\s*\)/g, ' ')
                .replace(/\[\s*[-–—,:;\/|]*\s*\]/g, ' ')
                .replace(/\{\s*[-–—,:;\/|]*\s*\}/g, ' ')
                .replace(/\s*[-–—,:;\/|]+\s*$/g, '')
                .replace(/^\s*[-–—,:;\/|]+\s*/g, '')
                .replace(/\s+([)\]}])/g, '$1')
                .replace(/([(\[{])\s+/g, '$1');
            out = normalizeSpaces(out);
        }

        return out.trim();
    }

    function detectRuleInText(text, rule) {
        var rx = resetRegex(rule.regex);
        var match = rx.exec(text);
        return match ? match[0] : null;
    }

    function getNativeTagTexts(article) {
        var result = [];
        var nodes = article.querySelectorAll('span[x-text="tag.name"]');
        var i;
        for (i = 0; i < nodes.length; i += 1) {
            var text = normalizeSpaces(nodes[i].textContent);
            if (text) result.push({ node: nodes[i], text: text });
        }
        return result;
    }

    function extractQualities(name, article) {
        var working = normalizeSpaces(name);
        var found = [];
        var foundIds = {};
        var i;

        /* Сначала вынимаем обозначения из названия. Это заодно очищает baseName. */
        for (i = 0; i < QUALITY_RULES.length; i += 1) {
            var rule = QUALITY_RULES[i];
            var match = detectRuleInText(working, rule);
            if (match) {
                found.push({ rule: rule, match: match, source: 'title' });
                foundIds[rule.id] = true;
                working = working.replace(resetRegex(rule.regex), ' ');
            }
        }

        /* Если Moba вынес качество в свой tag, тоже учитываем его. */
        var tags = article ? getNativeTagTexts(article) : [];
        var t;
        for (t = 0; t < tags.length; t += 1) {
            for (i = 0; i < QUALITY_RULES.length; i += 1) {
                var tagRule = QUALITY_RULES[i];
                if (!foundIds[tagRule.id] && detectRuleInText(tags[t].text, tagRule)) {
                    found.push({ rule: tagRule, match: tags[t].text, source: 'tag' });
                    foundIds[tagRule.id] = true;
                    break;
                }
            }
        }

        found.sort(function (a, b) { return a.rule.rank - b.rule.rank; });

        return {
            qualities: found,
            withoutQuality: cleanupVariantText(working)
        };
    }

    function qualityIds(qualities) {
        var ids = {};
        var i;
        for (i = 0; i < qualities.length; i += 1) ids[qualities[i].rule.id] = true;
        return ids;
    }

    function isDisplayProduct(original) {
        return /^дисплей(?:\s|$)/i.test(normalizeSpaces(original || ''));
    }

    function isProtectiveGlassProduct(original) {
        var value = normalizeSpaces(original || '');
        if (!/^защитн(?:ое|ый)\s+стекло(?:\s|$)/i.test(value)) return false;
        /* Стекла камеры и объективов — другая деталь, сюда их не смешиваем. */
        return !/(?:камер|объектив)/i.test(value);
    }

    function isFramelessProtectiveGlass(original) {
        return isProtectiveGlassProduct(original) && /(?:безрамочн[а-яё]*|без\s+рамк[а-яё]*)/i.test(original || '');
    }

    function getCompatibilityKey(baseName) {
        var value = cleanupVariantText(baseName || '').toLowerCase();
        var forIndex = value.indexOf(' для ');
        if (forIndex >= 0) return value.slice(forIndex + 1).trim();
        return value;
    }

    /*
     * Для предметных групп стараемся выделить совместимость устройства, а не
     * весь хвост названия детали. Это позволяет собирать, например, все
     * задние крышки или камеры одной модели под коротким рабочим заголовком.
     * При сомнении ключ остается более строгим: лучше недогруппировать, чем
     * смешать запчасти разных устройств.
     */
    function getTypedCompatibilityKey(original, baseName) {
        var info = getCompatibilityInfo(original, baseName || original);
        return info.key;
    }

    function isAppleProductName(value) {
        return /\b(?:iphone|ipad)\b/i.test(normalizeSpaces(value || ''));
    }

    function getTrailingColorRegex() {
        return /\s+(?:черн(?:ый|ая|ое)|ч[её]рн(?:ый|ая|ое)|бел(?:ый|ая|ое)|син(?:ий|яя|ее)|красн(?:ый|ая|ое)|зел[её]н(?:ый|ая|ое)|сер(?:ый|ая|ое)|голуб(?:ой|ая|ое)|фиолетов(?:ый|ая|ое)|розов(?:ый|ая|ое)|золот(?:ой|ая|ое)|серебрист(?:ый|ая|ое)|оранжев(?:ый|ая|ое)|ж[её]лт(?:ый|ая|ое)|бежев(?:ый|ая|ое)|бронзов(?:ый|ая|ое)|black|white|blue|red|green|gray|grey|gold|pink|purple)\s*$/i;
    }

    function cutAtEarliest(value, regexes) {
        var best = value.length;
        var i;
        for (i = 0; i < regexes.length; i += 1) {
            var match = regexes[i].exec(value);
            regexes[i].lastIndex = 0;
            if (match && match.index >= 0 && match.index < best) best = match.index;
        }
        return cleanupVariantText(value.slice(0, best));
    }

    /*
     * Возвращаем не только машинный ключ, но и читаемую совместимость для заголовка.
     * Главный принцип v0.12: из хвоста после "для" вырезаем исполнение конкретной
     * запчасти (OLED, 120 Гц, FOG, цвет, рамку и т.п.), но сохраняем модель/модели
     * устройства максимально близко к тому, как они написаны у Moba.
     */
    function getCompatibilityInfo(original, baseName) {
        var value = normalizeSpaces(original || baseName || '');
        var lower = value.toLowerCase();
        var forIndex = lower.indexOf(' для ');
        var label = '';

        if (forIndex >= 0) {
            label = normalizeSpaces(value.slice(forIndex + 5));

            /* Сначала отсекаем явный вариант после тире. */
            label = cutAtEarliest(label, [ /\s[-–—]\s/g ]);

            /* Затем конструктивные/товарные признаки, которые идут после модели. */
            label = cutAtEarliest(label, [
                /\s+модул[а-яё]*\s+(?:с|без)\s+рамк[а-яё]*/ig,
                /\s+в\s+сборе\s+с\s+тачскрином/ig,
                /\s+(?:с|без)\s+рамк[а-яё]*/ig,
                /\s+плат[а-яё]*\s+(?:на\s+)?системн[а-яё]*\s+раз[ъь]?ем/ig,
                /\s+плат[а-яё]*\s+системн[а-яё]*\s+раз[ъь]?ем/ig,
                /\s+плат[а-яё]*\s+зарядк[а-яё]*/ig,
                /\s+нижн[а-яё]*\s+плат[а-яё]*/ig,
                /\s+\(\s*\d+(?:[.,]\d+)?\s*mp\b/ig,
                /\s+задн[а-яё]*\s*(?:\(|$)/ig,
                /\s+передн[а-яё]*\s*(?:\(|$)/ig,
                /\s+фронтал[а-яё]*\s*(?:\(|$)/ig,
                /\s+тылов[а-яё]*\s*(?:\(|$)/ig,
                /\s+основн[а-яё]*\s*(?:\(|$)/ig,
                /\s+стандарт(?:ный|ная|ное)?\b/ig,
                /\s+безрамочн[а-яё]*\b/ig
            ]);

            /* Цвет почти всегда является уже вариантом детали, а не частью модели. */
            var colorRx = getTrailingColorRegex();
            while (colorRx.test(label)) label = cleanupVariantText(label.replace(colorRx, ' '));

            /*
             * Для дисплеев/крышек Moba иногда пишет "Черный - ..."; после предыдущих
             * шагов это уже удалено. Для прочих деталей не пытаемся агрессивно
             * сокращать совместимость: лучше длиннее, чем потерять модель.
             */
        }

        if (!label) {
            var markers = getModelMarkers(value).sort();
            if (markers.length) label = markers.join('/');
        }

        if (!label) {
            var appleMatch = normalizeSpaces(value).match(/\b(?:iPhone|iPad)\s+\d{1,2}(?:\s+(?:Pro|Max|Plus|Mini|Air)){0,3}(?:\s*\([^)]+\))?/i);
            if (appleMatch) label = normalizeSpaces(appleMatch[0]);
        }

        var keySource = label || getCompatibilityKey(baseName || value) || value;
        return {
            key: normalizeForCompare(keySource),
            label: cleanupVariantText(label)
        };
    }

    function getExplicitTypeGroupInfo(original, baseName) {
        var value = normalizeSpaces(original || '');
        var compatibility = getCompatibilityInfo(value, baseName || value);

        function makeInfo(id, label) {
            var fullLabel = label;
            if (compatibility.label) fullLabel += ' - ' + compatibility.label;
            return { key: id + '|' + compatibility.key, label: fullLabel };
        }

        if (/^аккумулятор(?:\s|$)/i.test(value)) {
            return makeInfo('battery', 'Аккумуляторы');
        }

        if (/^задн(?:яя|ие)\s+крышк[а-яё]*(?:\s|$)/i.test(value)) {
            return makeInfo('back-cover', 'Задние крышки');
        }

        /* Только плата/шлейф с зарядным (системным) разъемом, не любой шлейф. */
        if (/^(?:шлейф|плата)(?:\s|$)/i.test(value) &&
            /(?:системн[а-яё]*\s+раз[ъь]?ем|раз[ъь]?ем[а-яё]*\s+(?:заряд|type\s*-?\s*c|micro\s*-?\s*usb|lightning)|плат[а-яё]*\s+(?:на\s+)?системн[а-яё]*\s+раз[ъь]?ем|нижн[а-яё]*\s+плат[а-яё]*|плат[а-яё]*\s+зарядк[а-яё]*)/i.test(value)) {
            return makeInfo('charge-board-flex', 'Плата/шлейф с разъёмом З/У');
        }

        if (/^камера(?:\s|$)/i.test(value) && /(?:задн[а-яё]*|основн[а-яё]*|тылов[а-яё]*)/i.test(value)) {
            return makeInfo('rear-camera', 'Тыловые камеры');
        }

        if (/^камера(?:\s|$)/i.test(value) && /(?:передн[а-яё]*|фронтал[а-яё]*)/i.test(value)) {
            return makeInfo('front-camera', 'Фронтальные камеры');
        }

        if (/^(?:(?:защитн[а-яё]*\s+)?стекл[а-яё]*|линз[а-яё]*)(?:\s|$)/i.test(value) && /(?:камер|объектив)/i.test(value)) {
            return makeInfo('camera-glass', 'Стекла камер');
        }

        if (/^(?:держател[а-яё]*\s+sim|контейнер[а-яё]*\s+sim|sim\s*[- ]?\s*лоток[а-яё]*|лоток[а-яё]*\s+sim)(?:\s|$)/i.test(value)) {
            return makeInfo('sim-tray', 'SIM-лотки');
        }

        if (/^динамик(?:\s|$)/i.test(value) && /(?:разговорн[а-яё]*|слухов[а-яё]*)/i.test(value)) {
            return makeInfo('earpiece-speaker', 'Разговорные динамики');
        }

        if (/^(?:звонок|buzzer)(?:\s|$)/i.test(value) ||
            (/^динамик(?:\s|$)/i.test(value) && /(?:полифонич[а-яё]*|нижн[а-яё]*)/i.test(value))) {
            return makeInfo('loud-speaker', 'Полифонические динамики / звонки');
        }

        if (/^вибро(?:мотор)?[а-яё]*(?:\s|$)/i.test(value)) {
            return makeInfo('vibromotor', 'Вибромоторы');
        }

        if (/^(?:средн[а-яё]*\s+част[а-яё]*|средн[а-яё]*\s+рамк[а-яё]*|рамк[а-яё]*\s+корпус[а-яё]*)(?:\s|$)/i.test(value)) {
            return makeInfo('middle-frame', 'Средняя часть');
        }

        if (/^(?:кнопк[а-яё]*|толкател[а-яё]*\s+кнопк[а-яё]*)(?:\s|$)/i.test(value)) {
            return makeInfo('buttons', 'Кнопки');
        }

        if (/^(?:антенн[а-яё]*|антенн[а-яё]*\s+(?:провод|кабел|модул)[а-яё]*)(?:\s|$)/i.test(value)) {
            return makeInfo('antenna', 'Антенны');
        }

        if (/^микрофон[а-яё]*(?:\s|$)/i.test(value)) {
            return makeInfo('microphone', 'Микрофоны');
        }

        /* Отдельные разъемы/коннекторы. Платы и шлейфы сюда не попадают. */
        if (/^(?:раз[ъь]?ем[а-яё]*|коннектор[а-яё]*)(?:\s|$)/i.test(value)) {
            return makeInfo('connector', 'Разъёмы');
        }

        /* Все оставшиеся шлейфы — временная корзина до более тонкой классификации. */
        if (/^шлейф(?:\s|$)/i.test(value)) {
            return makeInfo('other-flex', 'Прочие шлейфа');
        }

        return null;
    }

    function getForcedGroupInfo(original, baseName) {
        var value = normalizeSpaces(original || '');
        var compatibilityBase = cleanupVariantText(baseName || value);
        var compatibility = getCompatibilityInfo(value, compatibilityBase);

        if (isDisplayProduct(value)) {
            if (/(?:^|\s)(?:с\s+рамк[а-яё]*|в\s+рамк[а-яё]*|модул[а-яё]*\s+с\s+рамк[а-яё]*)(?=\s|$)/i.test(value)) {
                return {
                    key: 'display-with-frame|' + compatibility.key,
                    label: 'Дисплей в рамке' + (compatibility.label ? ' - ' + compatibility.label : '')
                };
            }

            /* "в сборе с тачскрином" у Moba — дисплейный модуль без рамки. */
            return {
                key: 'display-without-frame|' + compatibility.key,
                label: 'Дисплей без рамки' + (compatibility.label ? ' - ' + compatibility.label : '')
            };
        }

        if (isProtectiveGlassProduct(value)) {
            return {
                key: 'protective-glass|' + compatibility.key,
                label: 'Защитные стекла' + (compatibility.label ? ' - ' + compatibility.label : '')
            };
        }

        var explicitTypeGroup = getExplicitTypeGroupInfo(value, compatibilityBase);
        if (explicitTypeGroup) return explicitTypeGroup;

        /*
         * v0.12: свободно лежащих строк больше нет. Если тип пока не научились
         * распознавать, товар идет в безопасную категорию "Не определенные".
         * Совместимость оставляем в ключе, чтобы не смешивать разные устройства.
         */
        return {
            key: 'unknown|' + compatibility.key,
            label: 'Не определенные' + (compatibility.label ? ' - ' + compatibility.label : '')
        };
    }

    function getVariantSortRank(parsed) {
        if (!parsed) return 0;
        var ids = qualityIds(parsed.qualities || []);
        var isApple = isAppleProductName(parsed.original || '');

        /* Remax на iPhone — выше обычного Premium, но не приравниваем к оригиналу. */
        if (ids.remax && isApple) return -2;

        /* Premium безрамочное остается Premium, но внутри Premium идет после обычного. */
        if (parsed.isProtectiveGlass && parsed.isFramelessProtectiveGlass && ids.premium) return 1;

        /* Remax на Android — пользователь ставит примерно на уровень безрамочного Premium. */
        if (ids.remax && !isApple) return 1;
        return 0;
    }

    function getProductRating(parsed) {
        var qualities = parsed && parsed.qualities ? parsed.qualities : [];
        var ids = qualityIds(qualities);
        var original = normalizeSpaces(parsed && parsed.original ? parsed.original : '');
        var isBattery = /^(?:аккумулятор|батаре)/i.test(original);

        /*
         * Зафиксированная пользователем верхушка шкалы.
         * Сильная маркировка всегда побеждает технологию дисплея.
         */
        if (ids.or100 || ids['or-sp']) return RATING_LEVELS.best;
        if (ids.or || ids['service-original']) return RATING_LEVELS.veryGood;

        /* Практическая шкала аккумуляторов. Неизвестные бренды не угадываем. */
        if (isBattery && ids.pisen) return RATING_LEVELS.best;
        if (isBattery && ids.zevo) return RATING_LEVELS.veryGood;
        if (isBattery && ids['battery-collection'] && ids.premium) return RATING_LEVELS.good;

        /* Remax: на iPhone выше обычного Premium; на Android — уровень приглушенного Premium. */
        if (ids.remax) return RATING_LEVELS.good;

        /* Общие маркировки и технологии для остальных деталей. */
        if (ids.premium) return RATING_LEVELS.good;
        if (ids['soft-oled']) return RATING_LEVELS.good;
        if (ids.oled) return RATING_LEVELS.normal;
        if (ids.cog || ids.cof) return RATING_LEVELS.normal;
        if (ids['hard-oled']) return RATING_LEVELS.budget;
        if (ids.incell) return RATING_LEVELS.lowest;

        return RATING_LEVELS.unknown;
    }

    function getQualitySortRank(parsedOrQualities) {
        if (Array.isArray(parsedOrQualities)) {
            return getProductRating({ qualities: parsedOrQualities, original: '' }).rank;
        }
        return getProductRating(parsedOrQualities || {}).rank;
    }

    function getQualityTone(parsed) {
        var rating = parsed && parsed.rating ? parsed.rating : getProductRating(parsed || {});
        var ids = qualityIds(parsed && parsed.qualities ? parsed.qualities : []);
        if (parsed && parsed.isProtectiveGlass && parsed.isFramelessProtectiveGlass && rating.id === 'good') return 'good-muted';
        if (ids.remax && !isAppleProductName(parsed && parsed.original ? parsed.original : '') && rating.id === 'good') return 'good-muted';
        return rating.tone;
    }

    function clearQualityBackground(node) {
        if (!node || !node.classList) return;
        var classes = Array.prototype.slice.call(node.classList);
        var i;
        for (i = 0; i < classes.length; i += 1) {
            if (classes[i].indexOf('moba-quality-bg--') === 0) node.classList.remove(classes[i]);
        }
    }

    function applyQualityBackground(node, parsed) {
        if (!node) return;
        clearQualityBackground(node);
        node.classList.add('moba-quality-bg--' + getQualityTone(parsed));
    }


    function clearGroupingClasses(node) {
        if (!node || !node.classList) return;
        [
            'moba-grouped',
            'moba-group-level-1',
            'moba-group-level-2',
            'moba-group-start',
            'moba-group-end',
            'moba-subgroup-start',
            'moba-subgroup-end'
        ].forEach(function (className) {
            node.classList.remove(className);
        });
    }

    function extractProductVariant(originalName, article) {
        var original = normalizeSpaces(originalName);
        var qualityData = extractQualities(original, article);
        var withoutQuality = cleanupVariantText(qualityData.withoutQuality);
        var color = null;
        var i;

        for (i = 0; i < COLOR_RULES.length; i += 1) {
            var label = COLOR_RULES[i][0];
            var regex = COLOR_RULES[i][1];
            if (regex.test(withoutQuality)) {
                color = label;
                withoutQuality = cleanupVariantText(withoutQuality.replace(regex, ' '));
                break;
            }
        }

        var qualities = qualityData.qualities;
        var qualityKey = qualities.length
            ? qualities.map(function (item) { return item.rule.id; }).join('+')
            : 'none';

        var cleanBaseName = cleanupVariantText(withoutQuality);
        var forcedGroup = getForcedGroupInfo(original, cleanBaseName);
        var result = {
            original: original,
            qualities: qualities,
            qualityKey: qualityKey,
            color: color,
            baseName: cleanBaseName,
            variantEvidence: Boolean(color || qualities.length),
            ungroupedDisplayName: cleanupVariantText(qualityData.withoutQuality),
            forcedGroupKey: forcedGroup ? forcedGroup.key : '',
            forcedGroupLabel: forcedGroup ? forcedGroup.label : '',
            isProtectiveGlass: isProtectiveGlassProduct(original),
            isFramelessProtectiveGlass: isFramelessProtectiveGlass(original)
        };

        result.rating = getProductRating(result);
        result.variantSortRank = getVariantSortRank(result);
        result.ratingKey = result.rating.id;
        result.bestRank = result.rating.rank;

        var familyData = deriveFamilyData(result);
        result.familyBase = familyData.familyBase;
        result.familyTail = familyData.familyTail;
        result.familyEvidence = familyData.usedDashTail;
        if (result.familyEvidence) result.variantEvidence = true;

        return result;
    }


    /*
     * Универсальная семейная группировка.
     * Отбрасываем только явный хвост после разделителя " - ", " – " или " — ".
     * Это дает аккуратные семьи вроде одного аккумулятора BN5D в вариантах
     * Battery Collection / Zevo / комплект, не переписывая исходные названия.
     */
    function deriveFamilyData(parsed) {
        var base = cleanupVariantText(parsed.baseName || '');
        var family = base;
        var tail = '';
        var match = /\s[-–—]\s/.exec(base);

        if (match && match.index >= 28) {
            family = cleanupVariantText(base.slice(0, match.index));
            tail = cleanupVariantText(base.slice(match.index + match[0].length));
        }

        return {
            familyBase: family,
            familyTail: tail,
            usedDashTail: Boolean(tail && family !== base)
        };
    }

    function getPartStem(name) {
        var value = normalizeSpaces(name).toLowerCase();
        var forIndex = value.indexOf(' для ');
        if (forIndex > 0) return value.slice(0, forIndex).trim();
        return value.split(/\s+/).slice(0, 3).join(' ');
    }

    function isSafeFamilyCluster(items, familyKey) {
        if (!items || items.length < 2 || familyKey.length < 28) return false;

        var stem = getPartStem(items[0].parsed.familyBase || items[0].parsed.baseName);
        if (!stem || stem.length < 3) return false;

        var hasEvidence = false;
        var i;
        for (i = 0; i < items.length; i += 1) {
            var itemStem = getPartStem(items[i].parsed.familyBase || items[i].parsed.baseName);
            if (itemStem !== stem) return false;
            if (items[i].parsed.variantEvidence || items[i].parsed.familyTail) hasEvidence = true;
        }

        return hasEvidence;
    }


    /*
     * v0.8: безопасное сравнение похожих названий (алгоритм группировки сохранен от v0.7).
     * Это не "угадывание" по одному слову: товары объединяются только если
     * совпадает тип детали, модельные маркеры и подавляющая часть названия,
     * а конструктивно важные признаки не конфликтуют.
     */
    function normalizeForCompare(value) {
        return normalizeSpaces(String(value || '')
            .toLowerCase()
            .replace(/[«»"']/g, ' ')
            .replace(/[()[\]{},:;]+/g, ' ')
            .replace(/[–—]/g, '-')
            .replace(/\s*-\s*/g, ' - '));
    }

    function getModelMarkers(value) {
        var textValue = normalizeForCompare(value);
        var found = {};
        var matches = textValue.match(/\b(?:\d{6,}[a-z]{0,4}|[a-z]{1,6}[-_]?[a-z0-9]*\d[a-z0-9_-]{2,})\b/ig) || [];
        var i;
        for (i = 0; i < matches.length; i += 1) {
            var token = matches[i].toLowerCase();
            if (token.length >= 4) found[token] = true;
        }
        return Object.keys(found);
    }

    function markersIntersect(a, b) {
        if (!a.length || !b.length) return true;
        var map = {};
        var i;
        for (i = 0; i < a.length; i += 1) map[a[i]] = true;
        for (i = 0; i < b.length; i += 1) {
            if (map[b[i]]) return true;
        }
        return false;
    }

    function detectStructuralFlags(value, stem) {
        var textValue = normalizeForCompare(value);
        var flags = [];

        function addFlag(id, regex) {
            if (regex.test(textValue)) flags.push(id);
        }

        addFlag('with-frame', /\bс рамк(?:ой|а)\b/i);
        addFlag('without-frame', /\bбез рамк(?:и|а)\b/i);
        addFlag('touch-assembly', /\bв сборе с тачскрином\b/i);
        addFlag('assembly', /\bв сборе\b/i);
        addFlag('left', /\bлев(?:ый|ая|ое|ого|ую)\b/i);
        addFlag('right', /\bправ(?:ый|ая|ое|ого|ую)\b/i);
        addFlag('upper', /\bверхн(?:ий|яя|ее|его|юю)\b/i);
        addFlag('lower', /\bнижн(?:ий|яя|ее|его|юю)\b/i);
        addFlag('type-c', /\btype\s*-?\s*c\b/i);
        addFlag('micro-usb', /\bmicro\s*-?\s*usb\b/i);
        addFlag('lightning', /\blightning\b/i);

        if (/камера/i.test(stem)) {
            addFlag('camera-front', /\b(?:фронтальн|передн)\w*\b/i);
            addFlag('camera-main', /\b(?:основн|задн)\w*\b/i);
        }

        /*
         * У шлейфов длинная совместимость часто одинакова, а назначение — разное.
         * Поэтому для них дополнительно фиксируем функциональный хвост после
         * последнего блока совместимости в скобках.
         */
        if (/шлейф/i.test(stem)) {
            var rawValue = normalizeSpaces(String(value || '')).toLowerCase();
            var lastClose = rawValue.lastIndexOf(')');
            var descriptor = lastClose >= 0 ? rawValue.slice(lastClose + 1) : '';
            descriptor = cleanupVariantText(descriptor.replace(/\s+-\s+.*$/, ''));
            if (descriptor) flags.push('flex:' + descriptor);
        }

        flags.sort();
        return flags.join('|');
    }

    function commonPrefixInfo(a, b) {
        var aa = normalizeForCompare(a).split(/\s+/).filter(Boolean);
        var bb = normalizeForCompare(b).split(/\s+/).filter(Boolean);
        var max = Math.min(aa.length, bb.length);
        var count = 0;
        while (count < max && aa[count] === bb[count]) count += 1;

        var prefix = aa.slice(0, count).join(' ');
        return {
            tokenCount: count,
            shorterCount: max,
            ratio: max ? count / max : 0,
            chars: prefix.length,
            prefix: prefix
        };
    }

    function isSafeUniversalPair(a, b) {
        if ((a.parsed.forcedGroupKey || '') !== (b.parsed.forcedGroupKey || '')) return false;
        var aBase = a.parsed.familyBase || a.parsed.baseName;
        var bBase = b.parsed.familyBase || b.parsed.baseName;
        var aStem = getPartStem(aBase);
        var bStem = getPartStem(bBase);
        if (!aStem || aStem !== bStem) return false;

        var aFlags = detectStructuralFlags(aBase, aStem);
        var bFlags = detectStructuralFlags(bBase, bStem);
        if (aFlags !== bFlags) return false;

        var aMarkers = getModelMarkers(aBase);
        var bMarkers = getModelMarkers(bBase);
        if (!markersIntersect(aMarkers, bMarkers)) return false;

        var info = commonPrefixInfo(aBase, bBase);
        if (info.tokenCount < 5 || info.chars < 34) return false;

        /* Для коротких названий требуем почти полное совпадение. */
        if (info.shorterCount <= 8) return info.ratio >= 0.88;

        /* Для длинных совместимостей допускаем вариантный хвост, но не больше ~22%. */
        return info.ratio >= 0.78;
    }

    function buildUniversalCluster(seed, items, handledItems) {
        var cluster = [seed];
        var i;
        for (i = 0; i < items.length; i += 1) {
            var candidate = items[i];
            if (candidate === seed || handledItems[candidate.originalIndex]) continue;
            if (!isSafeUniversalPair(seed, candidate)) continue;

            /* Защита от транзитивного "снежного кома": кандидат должен подходить ко всем. */
            var safeForAll = cluster.every(function (member) {
                return isSafeUniversalPair(member, candidate);
            });
            if (safeForAll) cluster.push(candidate);
        }
        return cluster;
    }

    function buildUniversalHeader(group) {
        if (!group || !group.length) return '';
        var source = group[0].parsed.familyBase || group[0].parsed.baseName;
        var prefixLen = source.length;
        var lowerSource = source.toLowerCase();
        var i;

        for (i = 1; i < group.length; i += 1) {
            var other = (group[i].parsed.familyBase || group[i].parsed.baseName).toLowerCase();
            var max = Math.min(prefixLen, other.length);
            var p = 0;
            while (p < max && lowerSource[p] === other[p]) p += 1;
            prefixLen = p;
        }

        var prefix = source.slice(0, prefixLen);
        var lastSpace = prefix.lastIndexOf(' ');
        if (lastSpace >= 28) prefix = prefix.slice(0, lastSpace);
        prefix = cleanupVariantText(prefix);

        if (prefix.length < 28) return cleanupVariantText(source);
        return prefix;
    }

    function getProductTitleSpan(article) {
        return article.querySelector('span[x-text*="product.name"][title]') ||
            article.querySelector('a[href*="/catalog/"] span[title]');
    }

    function getOriginalName(article) {
        var span = getProductTitleSpan(article);
        if (!span) return '';
        if (!span.dataset.mobaOriginalName) {
            span.dataset.mobaOriginalName = normalizeSpaces(span.getAttribute('title') || span.textContent);
        }
        return span.dataset.mobaOriginalName;
    }

    function makeBadge(item) {
        var badge = document.createElement('span');
        badge.className = 'moba-quality-badge ' + item.rule.className;
        badge.textContent = item.rule.label;
        badge.title = 'Маркировка: ' + item.match;
        return badge;
    }

    function makeRatingBadge(parsed) {
        var rating = parsed && parsed.rating ? parsed.rating : getProductRating(parsed || {});
        var badge = document.createElement('span');
        badge.className = 'moba-quality-badge moba-rating--' + getQualityTone(parsed);
        badge.textContent = rating.label;

        var markings = (parsed && parsed.qualities ? parsed.qualities : []).map(function (item) {
            return item.rule.label;
        });
        badge.title = markings.length
            ? 'Оценка по маркировке: ' + markings.join(', ')
            : 'Качество по известным правилам не определено';
        return badge;
    }

    function makeNoneBadge() {
        var badge = document.createElement('span');
        badge.className = 'moba-quality-badge moba-quality--none';
        badge.textContent = 'БЕЗ МАРКИРОВКИ';
        badge.title = 'В названии товара и штатных тегах Moba нет известной скрипту маркировки';
        return badge;
    }

    function hideNativeQualityTags(article) {
        /*
         * v0.9: наши бейджи показывают оценку, а не дублируют терминологию Moba.
         * Поэтому штатные теги Moba оставляем видимыми — информация не теряется.
         */
        var tags = getNativeTagTexts(article);
        var i;
        for (i = 0; i < tags.length; i += 1) {
            tags[i].node.classList.remove('moba-native-quality-hidden');
        }
    }

    function setInlineQualityBadges(article, parsed, visible) {
        var span = getProductTitleSpan(article);
        if (!span) return;

        var titleLine = span.parentElement;
        if (!titleLine) return;
        titleLine.classList.add('moba-title-line');
        span.classList.add('moba-product-title');

        var holder = titleLine.querySelector(':scope > .moba-quality-badges');
        if (holder) holder.remove();

        if (!visible || !parsed.rating || parsed.rating.id === 'unknown') return;

        holder = document.createElement('span');
        holder.className = 'moba-quality-badges';
        holder.appendChild(makeRatingBadge(parsed));
        titleLine.appendChild(holder);
    }

    function getPreviewCandidates(src) {
        var result = [];
        var absolute;
        try {
            absolute = new URL(src, window.location.origin).href;
        } catch (e) {
            return [src];
        }

        var rawMatch = absolute.match(/\/plain\/local:\/\/(\/upload\/[^@?]+)(?:@webp)?/i);
        if (rawMatch && rawMatch[1]) {
            result.push(window.location.origin + rawMatch[1]);
        }

        result.push(
            absolute
                .replace(/\/rs:auto:\d+/i, '/rs:auto:1400')
                .replace(/\/q:\d+/i, '/q:96')
        );
        result.push(absolute);

        return result.filter(function (value, index, array) {
            return value && array.indexOf(value) === index;
        });
    }

    function ensurePreview() {
        if (state.preview && document.body.contains(state.preview)) return state.preview;

        var box = document.createElement('div');
        box.id = 'moba-tweaks-image-preview';
        var img = document.createElement('img');
        img.alt = '';
        box.appendChild(img);
        document.body.appendChild(box);
        state.preview = box;
        return box;
    }

    function positionPreview(event) {
        var box = ensurePreview();
        var size = 430;
        var gap = 16;
        var left = event.clientX + gap;
        var top = event.clientY + gap;

        if (left + size > window.innerWidth - 8) left = event.clientX - size - gap;
        if (top + size > window.innerHeight - 8) top = window.innerHeight - size - 8;
        if (top < 8) top = 8;
        if (left < 8) left = 8;

        box.style.left = left + 'px';
        box.style.top = top + 'px';
    }

    function ensureImageModal() {
        if (state.imageModal && document.body.contains(state.imageModal)) return state.imageModal;

        var modal = document.createElement('div');
        modal.id = 'moba-tweaks-image-modal';
        var img = document.createElement('img');
        img.alt = '';
        var status = document.createElement('div');
        status.className = 'moba-image-status';
        status.style.display = 'none';
        var close = document.createElement('button');
        close.type = 'button';
        close.textContent = '×';
        close.title = 'Закрыть';
        modal.appendChild(img);
        modal.appendChild(status);
        modal.appendChild(close);
        document.body.appendChild(modal);

        function closeModal() {
            modal.style.display = 'none';
            modal.classList.remove('moba-image-modal--zoomed');
            modal.removeAttribute('data-product-url');
            status.style.display = 'none';
            img.removeAttribute('src');
        }

        close.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            closeModal();
        });
        modal.addEventListener('click', function (event) {
            if (event.target === modal) closeModal();
        });
        img.addEventListener('dblclick', function (event) {
            event.preventDefault();
            event.stopPropagation();
            modal.classList.toggle('moba-image-modal--zoomed');
        });
        modal.closeModal = closeModal;
        state.imageModal = modal;
        return modal;
    }

    function normalizeProductImageUrl(value, baseUrl) {
        var raw = String(value || '').trim();
        if (!raw) return '';
        raw = raw.replace(/\\u002F/ig, '/').replace(/\\\//g, '/');

        try {
            var base = new URL(baseUrl || window.location.href, window.location.href);
            var url = new URL(raw, base.href);

            if (url.searchParams && url.searchParams.get('url') && /(?:_next\/image|image)/i.test(url.pathname)) {
                var nested = url.searchParams.get('url');
                try { nested = decodeURIComponent(nested); } catch (e) {}
                var normalizedNested = normalizeProductImageUrl(nested, base.href);
                if (normalizedNested) return normalizedNested;
            }

            var plainMatch = url.href.match(/\/plain\/local:\/\/(\/upload\/[^@?#]+)(?:@[^?#]+)?/i);
            if (plainMatch && plainMatch[1]) return new URL(plainMatch[1], base.origin).href;

            return url.href;
        } catch (e) {
            return '';
        }
    }

    function pushUniqueImageCandidate(target, value, baseUrl) {
        var normalized = normalizeProductImageUrl(value, baseUrl);
        if (!normalized || /(?:logo|favicon|sprite|icon)/i.test(normalized)) return;
        if (!/\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(normalized) && normalized.indexOf('/upload/') === -1) return;
        if (target.indexOf(normalized) === -1) target.push(normalized);
    }

    function getProductPageImageCandidates(html, productUrl) {
        var candidates = [];
        var doc;
        try {
            doc = new DOMParser().parseFromString(html, 'text/html');
        } catch (e) {
            return candidates;
        }

        [
            'meta[property="og:image"]',
            'meta[property="og:image:secure_url"]',
            'meta[name="twitter:image"]',
            'link[rel="image_src"]'
        ].forEach(function (selector) {
            var node = doc.querySelector(selector);
            if (!node) return;
            pushUniqueImageCandidate(candidates, node.getAttribute('content') || node.getAttribute('href'), productUrl);
        });

        var scored = [];
        Array.prototype.slice.call(doc.querySelectorAll('img')).forEach(function (node) {
            var values = [
                node.getAttribute('data-zoom-image'),
                node.getAttribute('data-large'),
                node.getAttribute('data-src'),
                node.getAttribute('src')
            ];
            var srcset = node.getAttribute('srcset') || '';
            if (srcset) {
                srcset.split(',').forEach(function (part) {
                    values.push(part.trim().split(/\s+/)[0]);
                });
            }

            var context = '';
            var current = node;
            var depth = 0;
            while (current && depth < 4) {
                context += ' ' + String(current.id || '') + ' ' + String(current.className || '');
                current = current.parentElement;
                depth += 1;
            }

            values.forEach(function (value) {
                var normalized = normalizeProductImageUrl(value, productUrl);
                if (!normalized) return;
                var score = 0;
                if (normalized.indexOf('/upload/') !== -1) score += 80;
                if (/(?:gallery|product|slider|swiper|photo|image)/i.test(context)) score += 80;
                if (/(?:logo|favicon|sprite|icon|banner)/i.test(normalized + ' ' + context)) score -= 200;
                scored.push({ url: normalized, score: score });
            });
        });

        scored.sort(function (a, b) { return b.score - a.score; });
        scored.forEach(function (item) {
            pushUniqueImageCandidate(candidates, item.url, productUrl);
        });

        return candidates;
    }

    function loadProductPageImages(productUrl) {
        if (!productUrl) return Promise.resolve([]);
        if (state.imageCache[productUrl]) return state.imageCache[productUrl];

        var promise = fetch(productUrl, { credentials: 'same-origin' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.text();
            })
            .then(function (html) {
                return getProductPageImageCandidates(html, productUrl);
            })
            .catch(function () { return []; });

        state.imageCache[productUrl] = promise;
        return promise;
    }

    function setModalImageCandidates(img, candidates) {
        var list = [];
        (candidates || []).forEach(function (candidate) {
            getPreviewCandidates(candidate).forEach(function (value) {
                if (value && list.indexOf(value) === -1) list.push(value);
            });
        });
        if (!list.length) return false;

        var index = 0;
        img.onerror = function () {
            index += 1;
            if (index < list.length) img.src = list[index];
        };
        img.src = list[0];
        return true;
    }

    function openImageModal(sourceImg, productUrl) {
        if (!sourceImg) return;
        var modal = ensureImageModal();
        var modalImg = modal.querySelector('img');
        var status = modal.querySelector('.moba-image-status');
        var resolvedProductUrl = productUrl || '';

        modal.classList.remove('moba-image-modal--zoomed');
        modal.dataset.productUrl = resolvedProductUrl;
        modalImg.alt = sourceImg.alt || '';
        modal.style.display = 'flex';
        if (state.preview) state.preview.style.display = 'none';

        setModalImageCandidates(modalImg, [sourceImg.currentSrc || sourceImg.src]);

        if (!resolvedProductUrl) return;
        status.textContent = 'Загружаю полноразмерное фото…';
        status.style.display = 'block';

        loadProductPageImages(resolvedProductUrl).then(function (candidates) {
            if (!state.imageModal || state.imageModal.dataset.productUrl !== resolvedProductUrl) return;
            if (candidates.length) setModalImageCandidates(modalImg, candidates);
            status.style.display = 'none';
        });
    }

    function enableHoverPreview(imageLink) {
        if (!imageLink || imageLink.dataset.mobaPreviewReady === '1') return;
        imageLink.dataset.mobaPreviewReady = '1';

        var sourceImg = imageLink.querySelector('img');
        if (!sourceImg) return;

        imageLink.addEventListener('click', function (event) {
            if (event.button !== 0 || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
            event.preventDefault();
            event.stopPropagation();
            openImageModal(sourceImg, imageLink.href || '');
        });

        imageLink.addEventListener('mouseenter', function (event) {
            var box = ensurePreview();
            var previewImg = box.querySelector('img');
            var candidates = getPreviewCandidates(sourceImg.currentSrc || sourceImg.src);
            var index = 0;

            previewImg.onerror = function () {
                index += 1;
                if (index < candidates.length) previewImg.src = candidates[index];
            };
            previewImg.src = candidates[0];
            previewImg.alt = sourceImg.alt || '';
            box.style.display = 'block';
            positionPreview(event);
        });

        imageLink.addEventListener('mousemove', positionPreview);
        imageLink.addEventListener('mouseleave', function () {
            ensurePreview().style.display = 'none';
        });
    }

    function suppressWaitingTooltip(node) {
        if (!node) return;

        var attrs = [
            'title',
            'aria-describedby',
            'data-tooltip',
            'data-tooltip-content',
            'data-tippy-content',
            'data-original-title',
            'x-tooltip'
        ];

        var current = node;
        var article = node.closest ? node.closest('article') : null;
        var hops = 0;
        while (current && current !== article && hops < 4) {
            var hadTooltipAttribute = false;
            for (var i = 0; i < attrs.length; i += 1) {
                if (current.hasAttribute && current.hasAttribute(attrs[i])) {
                    current.removeAttribute(attrs[i]);
                    hadTooltipAttribute = true;
                }
            }
            if (current === node || hadTooltipAttribute) current.classList.add('moba-stock-tooltip-disabled');
            current = current.parentElement;
            hops += 1;
        }
    }

    function classifyStockStatus(text) {
        var value = normalizeSpaces(text).toLowerCase();
        if (!value || value.length > 120) return '';
        if (/(?:поступит|поступление|под\s+заказ|ожидается|ожидаем|в\s+пути|скоро\s+будет|поставка)/i.test(value)) return 'waiting';
        if (/(?:самовывоз[^\n]{0,40}\bв\s+\d+\s+магазин|^в\s+\d+\s+магазин)/i.test(value)) return 'other-store';
        if (/(?:нет\s+в\s+наличии|нет\s+на\s+складе|отсутствует|законч(?:ил|илс|илась|илось|ились)|распродано)/i.test(value)) return 'unavailable';
        if (/(?:^|\s)(?:мало|заканчивается|последн(?:ий|яя|ие)|осталось\s+\d+)/i.test(value)) return 'limited';
        if (/(?:^|\s)в\s+наличии(?:\s|$|:)/i.test(value)) return 'available';
        return '';
    }

    function isVisibleStockNode(node) {
        if (!node || !document.body.contains(node) || node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
        var style = window.getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && node.getClientRects().length > 0;
    }

    function suppressNativeAvailableMarker(article) {
        var nodes = Array.prototype.slice.call(article.querySelectorAll('span,div,p')).filter(function (node) {
            return normalizeSpaces(node.textContent).toLowerCase() === 'в наличии';
        });
        nodes.forEach(function (node) {
            var target = node;
            var parent = node.parentElement;
            if (parent && normalizeSpaces(parent.textContent).toLowerCase() === 'в наличии' && parent.children.length <= 4) target = parent;
            target.classList.add('moba-stock-native-available-suppressed');
        });
    }

    function annotateAvailability(article, wrapper) {
        if (!article) return;
        if (wrapper) {
            wrapper.classList.remove(
                'moba-stock-wrapper--unavailable',
                'moba-stock-wrapper--waiting',
                'moba-stock-wrapper--limited',
                'moba-stock-wrapper--other-store'
            );
        }

        var decorated = article.querySelectorAll('.moba-stock-status');
        var p;
        for (p = 0; p < decorated.length; p += 1) {
            decorated[p].classList.remove(
                'moba-stock-status',
                'moba-stock-status--unavailable',
                'moba-stock-status--waiting',
                'moba-stock-status--limited',
                'moba-stock-status--other-store',
                'moba-stock-status--available'
            );
        }

        var suppressed = article.querySelectorAll('.moba-stock-native-available-suppressed');
        for (p = 0; p < suppressed.length; p += 1) suppressed[p].classList.remove('moba-stock-native-available-suppressed');

        var candidates = Array.prototype.slice.call(article.querySelectorAll('span,div,p,a')).filter(function (node) {
            if (!isVisibleStockNode(node)) return false;
            var value = normalizeSpaces(node.textContent);
            return value && value.length <= 120 && classifyStockStatus(value);
        }).map(function (node) {
            return { node: node, status: classifyStockStatus(node.textContent), length: normalizeSpaces(node.textContent).length };
        });

        if (!candidates.length) return;

        var priority = { waiting: 0, 'other-store': 1, unavailable: 2, limited: 3, available: 4 };
        candidates.sort(function (a, b) {
            var pa = Object.prototype.hasOwnProperty.call(priority, a.status) ? priority[a.status] : 99;
            var pb = Object.prototype.hasOwnProperty.call(priority, b.status) ? priority[b.status] : 99;
            if (pa !== pb) return pa - pb;
            return a.length - b.length;
        });

        var selected = candidates[0];
        selected.node.classList.add('moba-stock-status', 'moba-stock-status--' + selected.status);
        if (selected.status === 'waiting') suppressWaitingTooltip(selected.node);

        if (selected.status !== 'available') {
            suppressNativeAvailableMarker(article);
            if (wrapper) wrapper.classList.add('moba-stock-wrapper--' + selected.status);
        }
    }

    function annotateArticle(article) {
        if (!article) return null;

        article.classList.add('moba-product-card');
        var wrapper = article.parentElement;
        if (wrapper) wrapper.classList.add('moba-product-wrap');
        annotateAvailability(article, wrapper);

        var imageLink = article.children[0];
        var body = article.children[1];

        if (imageLink && imageLink.tagName === 'A' && imageLink.querySelector('img')) {
            imageLink.classList.add('moba-product-image-link');
            enableHoverPreview(imageLink);
        }

        if (body) {
            body.classList.add('moba-product-body');
            var children = Array.prototype.slice.call(body.children);
            var info = children[0];
            var price = children[1];
            var actions = children[2];

            if (info) info.classList.add('moba-product-info');
            if (price) price.classList.add('moba-product-price');
            if (actions) actions.classList.add('moba-product-actions');

            if (info && info.children[0]) info.children[0].classList.add('moba-product-meta-row');
            if (actions && actions.children[1]) actions.children[1].classList.add('moba-favorite-wrap');
        }

        hideNativeQualityTags(article);

        var originalName = getOriginalName(article);
        if (!originalName) return null;

        var parsed = extractProductVariant(originalName, article);
        setInlineQualityBadges(article, parsed, true);

        return {
            article: article,
            wrapper: wrapper,
            parsed: parsed,
            titleSpan: getProductTitleSpan(article)
        };
    }

    function findProductList() {
        var titleSpan = document.querySelector('article span[x-text*="product.name"][title]');
        var article = titleSpan ? titleSpan.closest('article') : null;
        var wrapper = article ? article.parentElement : null;
        var list = wrapper ? wrapper.parentElement : null;
        return article && wrapper && list ? list : null;
    }

    function getProductWrappers(list) {
        return Array.prototype.slice.call(list.children).filter(function (child) {
            return Boolean(child.querySelector && child.querySelector(':scope > article'));
        });
    }


    function isEditableTarget(target) {
        return isGlobalEditableTarget(target);
    }

    function isKeyboardProductVisible(wrapper) {
        if (!wrapper || !document.body.contains(wrapper)) return false;
        if (wrapper.hidden) return false;
        var style = window.getComputedStyle(wrapper);
        return style.display !== 'none' && style.visibility !== 'hidden' && wrapper.getClientRects().length > 0;
    }

    function getKeyboardProducts() {
        var list = findProductList();
        if (!list) return [];
        return getProductWrappers(list).filter(isKeyboardProductVisible);
    }

    function clearKeyboardSelection() {
        if (state.selectedProduct && state.selectedProduct.classList) {
            state.selectedProduct.classList.remove('moba-keyboard-selected');
            state.selectedProduct.removeAttribute('aria-current');
        }
        state.selectedProduct = null;
    }

    function selectKeyboardProduct(wrapper, shouldScroll) {
        if (!wrapper || !isKeyboardProductVisible(wrapper)) return;
        if (state.selectedProduct && state.selectedProduct !== wrapper && state.selectedProduct.classList) {
            state.selectedProduct.classList.remove('moba-keyboard-selected');
            state.selectedProduct.removeAttribute('aria-current');
        }

        state.selectedProduct = wrapper;
        wrapper.classList.add('moba-keyboard-selected');
        wrapper.setAttribute('aria-current', 'true');

        if (shouldScroll !== false) {
            wrapper.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
        }
    }

    function moveKeyboardSelection(direction) {
        var products = getKeyboardProducts();
        if (!products.length) {
            clearKeyboardSelection();
            return;
        }

        var currentIndex = state.selectedProduct ? products.indexOf(state.selectedProduct) : -1;
        var nextIndex;

        if (currentIndex < 0) {
            nextIndex = direction > 0 ? 0 : products.length - 1;
        } else {
            nextIndex = currentIndex + direction;
            if (nextIndex < 0) nextIndex = 0;
            if (nextIndex >= products.length) nextIndex = products.length - 1;
        }

        selectKeyboardProduct(products[nextIndex], true);
    }

    function getSelectedProductLink() {
        var wrapper = state.selectedProduct;
        if (!wrapper || !isKeyboardProductVisible(wrapper)) return null;
        var article = wrapper.querySelector(':scope > article');
        if (!article) return null;
        var titleSpan = getProductTitleSpan(article);
        return (titleSpan && titleSpan.closest('a[href]')) || article.querySelector('a[href*="/catalog/"]');
    }

    function openSelectedProduct(newTab) {
        var link = getSelectedProductLink();
        if (!link || !link.href) return false;

        if (newTab) {
            window.open(link.href, '_blank', 'noopener');
        } else {
            try {
                window.sessionStorage.setItem(RETURN_SEARCH_KEY, JSON.stringify({
                    searchUrl: window.location.href,
                    productUrl: link.href
                }));
            } catch (e) {}
            link.click();
        }
        return true;
    }

    function findMainSearchInput() {
        var inputs = Array.prototype.slice.call(document.querySelectorAll('header input'));
        if (!inputs.length) inputs = Array.prototype.slice.call(document.querySelectorAll('input'));

        var i;
        for (i = 0; i < inputs.length; i += 1) {
            var input = inputs[i];
            var type = String(input.getAttribute('type') || 'text').toLowerCase();
            var placeholder = String(input.getAttribute('placeholder') || '');
            if (type === 'search' || /(?:поиск|найти|артикул|товар)/i.test(placeholder)) return input;
        }
        return null;
    }

    function ensureKeyboardNavigation() {
        if (document.documentElement.dataset.mobaKeyboardNavigation === '1') return;
        document.documentElement.dataset.mobaKeyboardNavigation = '1';

        document.addEventListener('keydown', function (event) {
            if (event.defaultPrevented) return;

            if (event.key === 'Escape') {
                document.body.classList.remove('moba-filters-open');
                if (state.preview) state.preview.style.display = 'none';
                if (state.imageModal && state.imageModal.closeModal) state.imageModal.closeModal();
                clearKeyboardSelection();
                return;
            }

            if (isEditableTarget(event.target)) return;
            if (event.ctrlKey || event.altKey || event.metaKey) return;

            if (event.key === '/') {
                var searchInput = findMainSearchInput();
                if (searchInput) {
                    event.preventDefault();
                    searchInput.focus();
                    if (typeof searchInput.select === 'function') searchInput.select();
                }
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveKeyboardSelection(1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveKeyboardSelection(-1);
                return;
            }

            if (event.key === 'Enter' && state.selectedProduct) {
                if (openSelectedProduct(event.shiftKey)) event.preventDefault();
            }
        });

        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) return;
            if (target.closest('.moba-category-row') || target.closest('.catalog-section-filter')) {
                clearKeyboardSelection();
            }
        }, true);
    }

    function restoreOurGrouping(list, wrappers) {
        var headers = list.querySelectorAll(':scope > .moba-group-header, :scope > .moba-quality-section');
        var i;
        for (i = 0; i < headers.length; i += 1) headers[i].remove();

        for (i = 0; i < wrappers.length; i += 1) {
            var wrapper = wrappers[i];
            clearGroupingClasses(wrapper);
            clearQualityBackground(wrapper);
            var article = wrapper.querySelector(':scope > article');
            var span = article ? getProductTitleSpan(article) : null;
            if (!span) continue;
            var original = getOriginalName(article);
            var parsed = extractProductVariant(original, article);
            span.textContent = original;
            setInlineQualityBadges(article, parsed, true);
        }
    }

    function modelTokens(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/ё/g, 'е')
            .replace(/[^a-zа-я0-9]+/g, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
    }

    function getSearchModelTokens() {
        var tokens = modelTokens(pageUrl.searchParams.get('q') || '');
        var stop = {
            'or': 1, 'or100': 1, 'sp': 1, 'premium': 1, 'премиум': 1, 'optima': 1, 'оптима': 1,
            'oled': 1, 'soft': 1, 'hard': 1, 'incell': 1, 'cell': 1, 'in': 1, 'cog': 1, 'cof': 1,
            'дисплей': 1, 'экран': 1, 'модуль': 1, 'акб': 1, 'аккумулятор': 1, 'батарея': 1,
            'стекло': 1, 'шлейф': 1, 'камера': 1, 'крышка': 1, 'рамка': 1, 'для': 1,
            'черный': 1, 'белый': 1, 'синий': 1, 'красный': 1, 'зеленый': 1,
            'серый': 1, 'голубой': 1, 'фиолетовый': 1, 'розовый': 1, 'золотой': 1
        };
        tokens = tokens.filter(function (token) { return !stop[token]; });
        if (!tokens.some(function (token) { return /\d/.test(token); })) return [];
        return tokens;
    }

    function modelTokenMatches(queryToken, candidateToken) {
        if (queryToken === candidateToken) return true;
        if (queryToken.length >= 4 && candidateToken.length >= 4 && /\d/.test(queryToken) && /\d/.test(candidateToken)) {
            return candidateToken.indexOf(queryToken) === 0 || queryToken.indexOf(candidateToken) === 0;
        }
        return false;
    }

    function classifyCompatibilityMatch(label) {
        var queryTokens = getSearchModelTokens();
        if (!queryTokens.length) return '';
        var candidateTokens = modelTokens(label);
        if (!candidateTokens.length) return '';

        var familyWords = ['iphone', 'ipad', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'poco', 'honor', 'realme', 'tecno', 'infinix', 'oppo', 'vivo', 'huawei', 'pixel'];
        var variantWords = ['pro', 'max', 'plus', 'mini', 'ultra', 'lite', 'fe', 'se', 'air'];

        var queryFamilies = queryTokens.filter(function (token) { return familyWords.indexOf(token) !== -1; });
        if (queryFamilies.length) {
            var sameFamily = queryFamilies.some(function (token) { return candidateTokens.indexOf(token) !== -1; });
            if (!sameFamily) return '';
        }

        var modelIndex = -1;
        for (var i = 0; i < queryTokens.length; i += 1) {
            if (/\d/.test(queryTokens[i])) {
                modelIndex = i;
                break;
            }
        }
        if (modelIndex < 0) return '';

        /*
         * Сравниваем именно модельный хвост запроса, а не все слова заголовка.
         * Это важно для совместимостей вида
         * "S24 Ultra/.../S24 FE/...": наличие Ultra у соседней модели не должно
         * делать S24 FE несовместимым с запросом S24 FE.
         */
        var queryCore = queryTokens.slice(modelIndex);
        var queryHasVariant = queryCore.some(function (token) { return variantWords.indexOf(token) !== -1; });
        var foundCore = false;
        var foundVariantConflict = false;

        for (i = 0; i <= candidateTokens.length - queryCore.length; i += 1) {
            var matches = true;
            for (var q = 0; q < queryCore.length; q += 1) {
                if (!modelTokenMatches(queryCore[q], candidateTokens[i + q])) {
                    matches = false;
                    break;
                }
            }
            if (!matches) continue;

            foundCore = true;
            var nextToken = candidateTokens[i + queryCore.length] || '';
            var nextIsVariant = variantWords.indexOf(nextToken) !== -1;

            if (!queryHasVariant && nextIsVariant) {
                foundVariantConflict = true;
                continue;
            }

            if (queryHasVariant && nextIsVariant && queryCore.indexOf(nextToken) === -1) {
                foundVariantConflict = true;
                continue;
            }

            return 'match';
        }

        if (foundCore && foundVariantConflict) return 'mismatch';

        var queryNumber = queryCore.find(function (token) { return /\d/.test(token); });
        var candidateNumbers = candidateTokens.filter(function (token) { return /\d/.test(token); });
        if (queryNumber && candidateNumbers.length && queryFamilies.length) {
            var hasCompatibleNumber = candidateNumbers.some(function (token) {
                return modelTokenMatches(queryNumber, token);
            });
            if (!hasCompatibleNumber) return 'mismatch';
        }

        return '';
    }

    function buildGroupHeader(baseName) {
        var header = document.createElement('div');
        header.className = 'moba-group-header';

        var separatorIndex = baseName.indexOf(' - ');
        if (separatorIndex < 0) {
            header.textContent = baseName;
            return header;
        }

        var prefix = baseName.slice(0, separatorIndex + 3);
        var model = baseName.slice(separatorIndex + 3);
        header.appendChild(document.createTextNode(prefix));

        var modelNode = document.createElement('span');
        modelNode.className = 'moba-group-model';
        modelNode.textContent = model;
        var matchClass = classifyCompatibilityMatch(model);
        if (matchClass) modelNode.classList.add('moba-group-model--' + matchClass);
        header.appendChild(modelNode);
        return header;
    }

    function buildQualitySection(parsed, count) {
        var section = document.createElement('div');
        section.className = 'moba-quality-section';
        applyQualityBackground(section, parsed);
        section.appendChild(makeRatingBadge(parsed));

        if (count > 1) {
            var countNode = document.createElement('span');
            countNode.className = 'moba-quality-section-count';
            countNode.textContent = '× ' + count;
            section.appendChild(countNode);
        }

        return section;
    }

    function qualitySort(a, b) {
        if (a.parsed.bestRank !== b.parsed.bestRank) return a.parsed.bestRank - b.parsed.bestRank;
        if ((a.parsed.variantSortRank || 0) !== (b.parsed.variantSortRank || 0)) {
            return (a.parsed.variantSortRank || 0) - (b.parsed.variantSortRank || 0);
        }
        return a.originalIndex - b.originalIndex;
    }

    function groupProducts(list) {
        var wrappers = getProductWrappers(list);
        restoreOurGrouping(list, wrappers);

        wrappers = getProductWrappers(list);
        var items = [];
        var i;

        for (i = 0; i < wrappers.length; i += 1) {
            var article = wrappers[i].querySelector(':scope > article');
            if (!article) continue;
            var original = getOriginalName(article);
            if (!original) continue;
            items.push({
                wrapper: wrappers[i],
                article: article,
                titleSpan: getProductTitleSpan(article),
                parsed: extractProductVariant(original, article),
                originalIndex: i
            });
        }

        var strictGroups = {};
        var familyGroups = {};
        for (i = 0; i < items.length; i += 1) {
            var strictKey = normalizeSpaces(items[i].parsed.baseName).toLowerCase();
            var familyKey = normalizeSpaces(items[i].parsed.familyBase || items[i].parsed.baseName).toLowerCase();

            if (!strictGroups[strictKey]) strictGroups[strictKey] = [];
            strictGroups[strictKey].push(items[i]);

            if (!familyGroups[familyKey]) familyGroups[familyKey] = [];
            familyGroups[familyKey].push(items[i]);
        }

        var handledItems = {};

        /*
         * Приоритет:
         * 1) точное совпадение очищенного baseName;
         * 2) безопасная общая семья с явным хвостом после " - ";
         * 3) безопасное универсальное сравнение похожих названий.
         * Если уверенности нет — товар остается одиночным.
         */
        for (i = 0; i < items.length; i += 1) {
            var current = items[i];
            if (handledItems[current.originalIndex]) continue;

            var baseKey = normalizeSpaces(current.parsed.baseName).toLowerCase();
            var currentFamilyKey = normalizeSpaces(current.parsed.familyBase || current.parsed.baseName).toLowerCase();
            var forcedKey = current.parsed.forcedGroupKey || '';
            var forcedGroup = forcedKey ? items.filter(function (item) {
                return !handledItems[item.originalIndex] && item.parsed.forcedGroupKey === forcedKey;
            }) : [];
            var hasForcedGroup = Boolean(forcedKey);

            var strictGroup = (strictGroups[baseKey] || []).filter(function (item) {
                return !handledItems[item.originalIndex] && (item.parsed.forcedGroupKey || '') === forcedKey;
            });
            var familyGroup = (familyGroups[currentFamilyKey] || []).filter(function (item) {
                return !handledItems[item.originalIndex] && (item.parsed.forcedGroupKey || '') === forcedKey;
            });

            var strictHasEvidence = strictGroup.some(function (item) {
                return item.parsed.variantEvidence;
            });
            var canStrictGroup = !hasForcedGroup && strictGroup.length >= 2 && baseKey.length >= 8 && strictHasEvidence;
            var canFamilyGroup = !hasForcedGroup && isSafeFamilyCluster(familyGroup, currentFamilyKey);
            var universalGroup = (!hasForcedGroup && !canFamilyGroup && !canStrictGroup)
                ? buildUniversalCluster(current, items, handledItems)
                : [current];
            var canUniversalGroup = universalGroup.length >= 2;

            var group = hasForcedGroup
                ? forcedGroup
                : (canFamilyGroup ? familyGroup : (canStrictGroup ? strictGroup : (canUniversalGroup ? universalGroup : [current])));
            /* Явные предметные группы показываем даже для единственной позиции. */
            var canGroup = hasForcedGroup || group.length >= 2;

            var markHandled;
            for (markHandled = 0; markHandled < group.length; markHandled += 1) {
                handledItems[group[markHandled].originalIndex] = true;
            }

            if (!canGroup) {
                list.appendChild(current.wrapper);
                setInlineQualityBadges(current.article, current.parsed, true);
                continue;
            }

            group.sort(qualitySort);

            var groupHeaderName = hasForcedGroup
                ? current.parsed.forcedGroupLabel
                : (canFamilyGroup ? group[0].parsed.familyBase : (canUniversalGroup ? buildUniversalHeader(group) : group[0].parsed.baseName));
            list.appendChild(buildGroupHeader(groupHeaderName));

            var bucketCounts = {};
            var bucketKeys = [];
            var g;
            for (g = 0; g < group.length; g += 1) {
                var qKey = group[g].parsed.ratingKey;
                bucketCounts[qKey] = (bucketCounts[qKey] || 0) + 1;
                if (bucketKeys.indexOf(qKey) === -1) bucketKeys.push(qKey);
            }
            var showSections = bucketKeys.length > 1;
            var lastQualityKey = null;

            for (g = 0; g < group.length; g += 1) {
                var item = group[g];
                var itemQualityKey = item.parsed.ratingKey;
                var prevItem = g > 0 ? group[g - 1] : null;
                var nextItem = g + 1 < group.length ? group[g + 1] : null;
                var subgroupStart = !prevItem || prevItem.parsed.ratingKey !== itemQualityKey;
                var subgroupEnd = !nextItem || nextItem.parsed.ratingKey !== itemQualityKey;

                if (showSections && itemQualityKey !== lastQualityKey) {
                    list.appendChild(buildQualitySection(item.parsed, bucketCounts[itemQualityKey]));
                    lastQualityKey = itemQualityKey;
                }

                clearGroupingClasses(item.wrapper);
                item.wrapper.classList.add('moba-grouped');
                item.wrapper.classList.add(showSections ? 'moba-group-level-2' : 'moba-group-level-1');
                if (g === 0) item.wrapper.classList.add('moba-group-start');
                if (g === group.length - 1) item.wrapper.classList.add('moba-group-end');
                if (showSections && subgroupStart) item.wrapper.classList.add('moba-subgroup-start');
                if (showSections && subgroupEnd) item.wrapper.classList.add('moba-subgroup-end');

                applyQualityBackground(item.wrapper, item.parsed);
                list.appendChild(item.wrapper);

                /* Исходное название Moba всегда показываем полностью и дословно. */
                if (item.titleSpan) item.titleSpan.textContent = getOriginalName(item.article);

                /* Если есть секции качества, не повторяем те же бейджи в каждой строке. */
                setInlineQualityBadges(item.article, item.parsed, !showSections);
            }
        }

        list.dataset.mobaGroupedVersion = '0.15.1';
    }

    function ensureFilterToggle(sidebar) {
        if (!sidebar) return;
        var button = document.getElementById('moba-tweaks-filter-toggle');
        if (button) return;

        button = document.createElement('button');
        button.id = 'moba-tweaks-filter-toggle';
        button.type = 'button';
        button.textContent = 'Фильтры';
        button.title = 'Показать или скрыть фильтры';
        document.body.appendChild(button);

        button.addEventListener('click', function () {
            document.body.classList.toggle('moba-filters-open');
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') document.body.classList.remove('moba-filters-open');
        });
    }

    function annotateLayout() {
        var divs = Array.prototype.slice.call(document.querySelectorAll('div'));
        var sidebar = divs.find(function (el) {
            return el.classList.contains('fb-w-[348px]') && el.querySelector('.catalog-section-filter');
        });
        if (!sidebar) return null;

        var mainRow = sidebar.parentElement;
        var page = mainRow ? mainRow.parentElement : null;
        var content = mainRow ? Array.prototype.slice.call(mainRow.children).find(function (el) { return el !== sidebar; }) : null;
        if (!mainRow || !page || !content) return null;

        document.body.classList.add('moba-tweaks-enabled');
        sidebar.classList.add('moba-filter-sidebar');
        mainRow.classList.add('moba-main-row');
        page.classList.add('moba-page');
        content.classList.add('moba-content');

        var pageChildren = Array.prototype.slice.call(page.children);
        if (pageChildren[0]) pageChildren[0].classList.add('moba-page-title');

        var contentChildren = Array.prototype.slice.call(content.children);
        if (contentChildren[0]) contentChildren[0].classList.add('moba-search-summary');
        if (contentChildren[1]) contentChildren[1].classList.add('moba-category-row');
        if (contentChildren[2]) contentChildren[2].classList.add('moba-sort-row');
        if (contentChildren[4]) contentChildren[4].classList.add('moba-divider');

        var exactLabel = divs.find(function (el) {
            return normalizeSpaces(el.textContent) === 'Точное вхождение запроса';
        });
        if (exactLabel) exactLabel.classList.add('moba-exact-label');

        ensureFilterToggle(sidebar);
        return { sidebar: sidebar, mainRow: mainRow, page: page, content: content };
    }

    function enhance() {
        if (state.enhancing) return;
        state.enhancing = true;

        /* Не реагируем MutationObserver-ом на перестановки, которые делает сам скрипт. */
        if (state.observer) state.observer.disconnect();

        try {
            annotateLayout();

            var list = findProductList();
            if (!list) return;
            list.classList.add('moba-product-list');

            var wrappers = getProductWrappers(list);
            var i;
            for (i = 0; i < wrappers.length; i += 1) {
                var article = wrappers[i].querySelector(':scope > article');
                annotateArticle(article);
            }

            if (wrappers.length) groupProducts(list);

            if (state.selectedProduct && !isKeyboardProductVisible(state.selectedProduct)) {
                clearKeyboardSelection();
            }
        } finally {
            state.enhancing = false;
            if (state.observer) {
                state.observer.observe(document.body, { childList: true, subtree: true });
            }
        }
    }

    function scheduleEnhance() {
        window.clearTimeout(state.enhanceTimer);
        state.enhanceTimer = window.setTimeout(enhance, 140);
    }

    ensureKeyboardNavigation();
    enhance();

    state.observer = new MutationObserver(scheduleEnhance);
    state.observer.observe(document.body, { childList: true, subtree: true });
}());
