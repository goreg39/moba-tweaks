from pathlib import Path
import re

path = Path('moba-tweaks.user.js')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, got {count}')
    text = text.replace(old, new, 1)


replace_once('// @version      0.15.0', '// @version      0.15.1', 'version')
replace_once("list.dataset.mobaGroupedVersion = '0.15.0';", "list.dataset.mobaGroupedVersion = '0.15.1';", 'group version')

waiting_css = "        '.moba-stock-status--waiting{background:#f79009!important;color:#fff!important;}\\n' +\n"
replace_once(
    waiting_css,
    "        '.moba-stock-status--waiting{background:#f79009!important;color:#fff!important;pointer-events:none!important;}\\n' +\n"
    "        '.moba-stock-tooltip-disabled{pointer-events:none!important;}\\n' +\n",
    'waiting tooltip css'
)

tooltip_anchor = """    function classifyStockStatus(text) {
"""
tooltip_block = r'''    function suppressWaitingTooltip(node) {
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
'''
replace_once(tooltip_anchor, tooltip_block, 'tooltip suppressor')

status_anchor = """        node.classList.add('moba-stock-status', 'moba-stock-status--' + status);
"""
replace_once(
    status_anchor,
    status_anchor + "        if (status === 'waiting') suppressWaitingTooltip(node);\n",
    'waiting tooltip call'
)

pattern = re.compile(r"    function classifyCompatibilityMatch\(label\) \{.*?\n    \}\n\n    function buildGroupHeader", re.S)
replacement = r'''    function classifyCompatibilityMatch(label) {
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

    function buildGroupHeader'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f'compatibility matcher: expected 1 match, got {count}')

path.write_text(text, encoding='utf-8')
