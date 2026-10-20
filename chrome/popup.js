const TAB_VISIBILITY_STORAGE_KEY = 'extVisibleTabs';
const DEFAULT_TAB_ORDER = ['comments', 'recommendations', 'chapters', 'ask', 'script'];
const SUPPORT_COFFEE_URL = 'https://ko-fi.com/fortunecookie7';

const TAB_LABEL_KEYS = {
    recommendations: 'popupTabRecommendations',
    comments: 'popupTabComments',
    chapters: 'popupTabChapters',
    ask: 'popupTabAsk',
    script: 'popupTabScript'
};

function getMessage(key) {
    return chrome.i18n.getMessage(key) || key;
}

function normalizeVisibleTabs(visibleTabs) {
    const valid = new Set(DEFAULT_TAB_ORDER);
    const source = Array.isArray(visibleTabs) ? visibleTabs : [];
    const uniq = [];

    source.forEach(id => {
        if (typeof id !== 'string') return;
        if (!valid.has(id)) return;
        if (uniq.includes(id)) return;
        uniq.push(id);
    });

    if (uniq.length === 0) {
        return [...DEFAULT_TAB_ORDER];
    }

    return uniq;
}

function setWarning(message = '') {
    const warningEl = document.getElementById('popup-warning');
    if (!warningEl) return;

    warningEl.textContent = message;
    warningEl.hidden = !message;
}

function renderTabList(visibleTabs) {
    const listEl = document.getElementById('tab-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    const visibleSet = new Set(normalizeVisibleTabs(visibleTabs));

    DEFAULT_TAB_ORDER.forEach(id => {
        const label = document.createElement('label');
        label.className = 'tab-toggle';

        const text = document.createElement('span');
        text.textContent = getMessage(TAB_LABEL_KEYS[id]);

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = visibleSet.has(id);
        input.dataset.tabId = id;

        input.addEventListener('change', () => {
            const currentVisible = new Set(
                Array.from(listEl.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(checkbox => checkbox.dataset.tabId)
                    .filter(Boolean)
            );

            if (input.checked) {
                currentVisible.add(id);
            } else {
                currentVisible.delete(id);
            }

            const nextVisibleTabs = normalizeVisibleTabs(Array.from(currentVisible));
            if (currentVisible.size === 0) {
                input.checked = true;
                setWarning(getMessage('popupMinVisibleWarning'));
                return;
            }

            setWarning('');
            chrome.storage.local.set({ [TAB_VISIBILITY_STORAGE_KEY]: nextVisibleTabs });
        });

        label.appendChild(text);
        label.appendChild(input);
        listEl.appendChild(label);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = chrome.i18n.getUILanguage();
    document.getElementById('popup-title').textContent = getMessage('popupTitle');
    document.getElementById('popup-subtitle').textContent = getMessage('popupSubtitle');
    document.getElementById('popup-hint').textContent = getMessage('popupReorderHint');

    const supportButton = document.getElementById('support-coffee-button');
    const supportTooltip = document.getElementById('support-coffee-tooltip');
    const supportText = getMessage('popupSupportCoffee');

    if (supportButton) {
        supportButton.setAttribute('aria-label', supportText);
        supportButton.addEventListener('click', () => {
            window.open(SUPPORT_COFFEE_URL, '_blank', 'noopener');
        });
    }

    if (supportTooltip) {
        supportTooltip.textContent = supportText;
    }

    chrome.storage.local.get([TAB_VISIBILITY_STORAGE_KEY], result => {
        const visibleTabs = normalizeVisibleTabs(result ? result[TAB_VISIBILITY_STORAGE_KEY] : null);
        renderTabList(visibleTabs);
    });
});
