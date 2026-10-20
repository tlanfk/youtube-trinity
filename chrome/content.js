let currentTab = 'comments';
let lastUrl = location.href;
const TAB_ORDER_STORAGE_KEY = 'extTabOrder';
const TAB_VISIBILITY_STORAGE_KEY = 'extVisibleTabs';
const DEFAULT_TAB_ORDER = ['comments', 'recommendations', 'chapters', 'ask', 'script'];
// 스크립트 핸들러 중복 등록 방지를 위한 전역 변수
let isScriptHandlerSetup = false;
let lastAskTriggerAt = 0;
let lastChapterTriggerAt = 0;
let cachedAskButton = null;
const ASK_TRIGGER_COOLDOWN_MS = 3000;
const ASK_RETRY_DELAY_MS = 2000;
const ASK_USER_GESTURE_WINDOW_MS = 2500;
const CHAPTER_TRIGGER_COOLDOWN_MS = 2500;
const TAB_DRAG_THRESHOLD_PX = 5;
const TAB_SETTLE_MS = 240;
const TAB_AUTOSCROLL_EDGE_PX = 36;
const TAB_AUTOSCROLL_MAX_STEP_PX = 14;
const ASK_TARGET_KEYWORDS = ['conversation', 'assistant', 'ask', 'gemini', 'qna'];
const ASK_TEXT_REGEX = /(질문하기|이 동영상에 대해 물어보세요|ask about this video|\bask\b|質問する|この動画について質問|提问|询问此视频|询问这个视频|спросить|спросите|об этом видео|fragen|zu diesem video fragen)/i;
const ASK_PANEL_TARGET_IDS = ['payouchat', 'youchat'];
const ASK_PRIMARY_PANEL_TARGET_ID = 'PAyouchat';
const ASK_TAB_ICON = '✦';
const TICK_INTERVAL_MS = 700;
const BACKGROUND_SYNC_MS = 1800;
const RETRY_TABS = new Set(['chapters', 'ask', 'script']);
const LOCALIZED_UI_TEXT = {
    en: {
        recommendations: 'Related',
        comments: 'Comments',
        chapters: 'Chapters',
        script: 'Transcript',
        ask: 'Ask',
        scriptMissing: 'No transcript is available for this video.',
        chapterMissing: 'No chapters are available for this video.',
        askUnavailable: 'Ask is unavailable for this video.',
        askOpening: 'Opening Ask...',
        loading: 'Loading...'
    },
    ko: {
        recommendations: '추천 영상',
        comments: '댓글',
        chapters: '챕터',
        script: '스크립트',
        ask: '질문하기',
        scriptMissing: '이 영상에는 스크립트가 없습니다.',
        chapterMissing: '이 영상에는 챕터가 없습니다.',
        askUnavailable: '이 영상에서는 질문하기를 사용할 수 없습니다.',
        askOpening: '질문하기 여는 중...',
        loading: '불러오는 중...'
    },
    ja: {
        recommendations: '関連動画',
        comments: 'コメント',
        chapters: 'チャプター',
        script: '文字起こし',
        ask: '質問する',
        scriptMissing: 'この動画には文字起こしがありません。',
        chapterMissing: 'この動画にはチャプターがありません。',
        askUnavailable: 'この動画では質問機能を利用できません。',
        askOpening: '質問機能を開いています...',
        loading: '読み込み中...'
    },
    zh: {
        recommendations: '相关视频',
        comments: '评论',
        chapters: '章节',
        script: '文字稿',
        ask: '提问',
        scriptMissing: '此视频没有可用的文字稿。',
        chapterMissing: '此视频没有可用的章节。',
        askUnavailable: '此视频无法使用提问功能。',
        askOpening: '正在打开提问...',
        loading: '正在加载...'
    },
    ru: {
        recommendations: 'Похожие видео',
        comments: 'Комментарии',
        chapters: 'Главы',
        script: 'Расшифровка',
        ask: 'Спросить',
        scriptMissing: 'Для этого видео нет расшифровки.',
        chapterMissing: 'Для этого видео нет глав.',
        askUnavailable: 'Функция вопросов недоступна для этого видео.',
        askOpening: 'Открываем вопросы...',
        loading: 'Загрузка...'
    },
    de: {
        recommendations: 'Ähnliche Videos',
        comments: 'Kommentare',
        chapters: 'Kapitel',
        script: 'Transkript',
        ask: 'Fragen',
        scriptMissing: 'Für dieses Video ist kein Transkript verfügbar.',
        chapterMissing: 'Für dieses Video sind keine Kapitel verfügbar.',
        askUnavailable: 'Fragen ist für dieses Video nicht verfügbar.',
        askOpening: 'Fragen wird geöffnet...',
        loading: 'Wird geladen...'
    }
};
let needsContentRefresh = true;
let lastDomSyncAt = 0;
let lastSyncedUrl = '';
let lastSyncedTab = '';
let pageEnteredAt = Date.now();
let tabActivatedAt = Date.now();
let askActivationNonce = 0;
let lastAskAttemptNonce = -1;
let askLastAttemptAt = 0;
let askGestureUntil = 0;
let tabOrder = [...DEFAULT_TAB_ORDER];
let visibleTabIds = [...DEFAULT_TAB_ORDER];
let tabOrderLoaded = false;
let tabOrderLoading = false;
let hasExplicitTabSelection = false;
let tabDrag = null;
let suppressNextTabClick = false;
const ASK_STRICT_SELECTORS = [
    '#flexible-item-buttons button[aria-label="질문하기"]',
    '#flexible-item-buttons button[aria-label="이 동영상에 대해 물어보세요"]',
    '#flexible-item-buttons button[aria-label="この動画について質問する"]',
    '#flexible-item-buttons button[aria-label="質問する"]',
    '#flexible-item-buttons button[aria-label="询问此视频"]',
    '#flexible-item-buttons button[aria-label="询问这个视频"]',
    '#flexible-item-buttons button[aria-label="提问"]',
    '#flexible-item-buttons button[aria-label="Спросить"]',
    '#flexible-item-buttons button[aria-label="Спросить об этом видео"]',
    '#flexible-item-buttons button[aria-label="Fragen"]',
    '#flexible-item-buttons button[aria-label="Zu diesem Video fragen"]',
    '#flexible-item-buttons button[aria-label="Ask"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="질문하기"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="이 동영상에 대해 물어보세요"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="この動画について質問する"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="質問する"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="询问此视频"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="询问这个视频"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="提问"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="Спросить"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="Спросить об этом видео"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="Fragen"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="Zu diesem Video fragen"]',
    'ytd-menu-renderer #flexible-item-buttons button[aria-label="Ask"]'
];

function getUiLanguageCode() {
    const htmlLang = (document.documentElement.lang || '').toLowerCase().trim();
    const navLang = (navigator.language || '').toLowerCase().trim();
    const rawLang = htmlLang || navLang || 'en';
    const baseLang = rawLang.split('-')[0];
    return baseLang || 'en';
}

function getLocalizedUiText(key, uiLang = getUiLanguageCode()) {
    const lang = (uiLang || 'en').toLowerCase();
    const dict = LOCALIZED_UI_TEXT[lang] || LOCALIZED_UI_TEXT.en;
    return dict[key] || LOCALIZED_UI_TEXT.en[key] || '';
}

function cleanTabText(raw) {
    return (raw || '').replace(/\s+/g, ' ').trim();
}

function extractCommentTabLabel(raw, uiLang = getUiLanguageCode()) {
    const fallback = getLocalizedUiText('comments', uiLang);
    const text = cleanTabText(raw);
    if (!text) return fallback;

    const lines = text
        .split(/\r?\n/)
        .map(line => cleanTabText(line))
        .filter(Boolean);

    const primaryLine = lines[0] || text;
    let normalized = primaryLine;

    normalized = normalized
        .replace(/\bSort by\b.*$/i, '')
        .replace(/정렬 기준.*$/i, '')
        .replace(/排序依据.*$/i, '')
        .replace(/並べ替え.*$/i, '')
        .replace(/\b[0-9][0-9,.\s]*\b/g, ' ')
        .replace(/\bcomments?\b/i, 'Comments')
        .replace(/댓글\s*개\b/g, '댓글')
        .replace(/\s+/g, ' ')
        .trim();

    const preferredLabels = [
        getLocalizedUiText('comments', uiLang),
        'Comments',
        '댓글',
        'コメント',
        '评论',
        'Комментарии',
        'Kommentare'
    ];

    for (const label of preferredLabels) {
        if (normalized === label) return normalized;
        if (normalized.startsWith(label)) return label;
        if (normalized.includes(label)) return label;
    }

    if (!normalized) return fallback;
    return normalized.length <= 24 ? normalized : fallback;
}

function getYoutubeFirstTabLabel(type, uiLang = getUiLanguageCode()) {
    const fallback = getLocalizedUiText(type, uiLang);
    const raw = cleanTabText(getYoutubeUiText(type));

    if (!raw) {
        return fallback;
    }

    if (type === 'comments') {
        return extractCommentTabLabel(raw, uiLang);
    }

    return raw;
}

function canUseStorage() {
    return typeof chrome !== 'undefined' && !!(chrome.storage && chrome.storage.local);
}

function normalizeTabOrder(order, baseOrder = DEFAULT_TAB_ORDER) {
    const valid = new Set(DEFAULT_TAB_ORDER);
    const source = Array.isArray(order) ? order : [];
    const uniq = [];

    source.forEach(id => {
        if (typeof id !== 'string') return;
        if (!valid.has(id)) return;
        if (uniq.includes(id)) return;
        uniq.push(id);
    });

    const fallbackOrder = Array.isArray(baseOrder) ? baseOrder : DEFAULT_TAB_ORDER;
    fallbackOrder.forEach(id => {
        if (!uniq.includes(id)) {
            uniq.push(id);
        }
    });

    return uniq;
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

function getVisibleTabOrder() {
    const visibleSet = new Set(normalizeVisibleTabs(visibleTabIds));
    return normalizeTabOrder(tabOrder).filter(id => visibleSet.has(id));
}

function getLeftmostTabId() {
    const order = getVisibleTabOrder();
    return order[0] || 'recommendations';
}

function ensureCurrentTabIsVisible() {
    const visibleSet = new Set(normalizeVisibleTabs(visibleTabIds));
    if (!visibleSet.has(currentTab)) {
        currentTab = getLeftmostTabId();
        hasExplicitTabSelection = false;
    }
}

function saveTabOrder(nextOrder) {
    tabOrder = normalizeTabOrder(nextOrder);
    if (!canUseStorage()) return;

    try {
        chrome.storage.local.set({ [TAB_ORDER_STORAGE_KEY]: tabOrder });
    } catch (e) {
        console.log('탭 순서 저장 실패', e);
    }
}

function saveVisibleTabs(nextVisibleTabs) {
    visibleTabIds = normalizeVisibleTabs(nextVisibleTabs);
    ensureCurrentTabIsVisible();
    if (!canUseStorage()) return;

    try {
        chrome.storage.local.set({ [TAB_VISIBILITY_STORAGE_KEY]: visibleTabIds });
    } catch (e) {
        console.log('탭 표시 설정 저장 실패', e);
    }
}

function loadTabOrder() {
    if (tabOrderLoaded || tabOrderLoading) return;

    if (!canUseStorage()) {
        tabOrderLoaded = true;
        return;
    }

    tabOrderLoading = true;
    try {
        chrome.storage.local.get([TAB_ORDER_STORAGE_KEY, TAB_VISIBILITY_STORAGE_KEY], (result) => {
            tabOrderLoading = false;
            tabOrderLoaded = true;

            if (chrome.runtime && chrome.runtime.lastError) {
                return;
            }

            const loaded = result ? result[TAB_ORDER_STORAGE_KEY] : null;
            const loadedVisible = result ? result[TAB_VISIBILITY_STORAGE_KEY] : null;
            tabOrder = normalizeTabOrder(loaded);
            visibleTabIds = normalizeVisibleTabs(loadedVisible);
            ensureCurrentTabIsVisible();

            if (!hasExplicitTabSelection) {
                const preferredTab = getLeftmostTabId();
                if (currentTab !== preferredTab) {
                    currentTab = preferredTab;
                    needsContentRefresh = true;
                }
            }

            const tabContainer = document.getElementById('my-extension-tabs');
            if (tabContainer) {
                applyTabOrderToDom(tabOrder);
                updateButtonStyles();
            }
        });
    } catch (e) {
        tabOrderLoading = false;
        tabOrderLoaded = true;
    }
}

function applyTabOrderToDom(order) {
    const tabContainer = document.getElementById('my-extension-tabs');
    if (!tabContainer) return;

    const normalized = normalizeTabOrder(order);
    const buttonById = new Map(
        Array.from(tabContainer.querySelectorAll('.ext-tab-btn')).map(btn => [btn.dataset.tabId, btn])
    );

    normalized.forEach(id => {
        const btn = buttonById.get(id);
        if (btn) {
            tabContainer.appendChild(btn);
        }
    });

    tabOrder = normalized;
}

// ===== 탭 순서 변경: 포인터 기반 실시간 정렬 =====
// 탭을 누른 채 가로로 5px 이상 움직이면 드래그가 시작됩니다.
// 드래그 중에는 나머지 탭이 부드럽게 비켜서 놓을 자리를 보여주고, 놓으면 그 자리로 안착합니다.

function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// 화면 X 좌표를 탭 컨테이너 내부(가로 스크롤 포함) 기준 좌표로 변환
function getTabContainerX(container, clientX) {
    const rect = container.getBoundingClientRect();
    return clientX - rect.left - container.clientLeft + container.scrollLeft;
}

function setTabOffset(btn, x) {
    btn.style.translate = x ? `${x}px 0` : '';
}

// 드래그 직후 브라우저가 보내는 click이 탭 전환으로 이어지지 않도록 잠깐 막음
function suppressTabClickBriefly() {
    suppressNextTabClick = true;
    setTimeout(() => { suppressNextTabClick = false; }, 300);
}

// 드래그 중인 탭이 targetIndex 자리에 들어갔을 때의 순서와 각 탭의 최종 left 값
function getTabDragLayout(drag) {
    const order = drag.items.filter((_, index) => index !== drag.fromIndex);
    order.splice(drag.targetIndex, 0, drag.items[drag.fromIndex]);

    const lefts = new Map();
    let x = drag.items[0].left;
    order.forEach(item => {
        lefts.set(item, x);
        x += item.width + drag.gap;
    });

    return { order, lefts };
}

function applyTabDragLayout(drag) {
    const { order, lefts } = getTabDragLayout(drag);
    drag.order = order;
    drag.slotLeft = lefts.get(drag.items[drag.fromIndex]);
    drag.slot.style.translate = `${drag.slotLeft}px 0`;

    order.forEach(item => {
        if (item.btn === drag.btn) return;
        setTabOffset(item.btn, lefts.get(item) - item.left);
    });
}

function startTabDrag(drag) {
    const { container } = drag;
    const originX = container.getBoundingClientRect().left + container.clientLeft - container.scrollLeft;

    drag.items = Array.from(container.querySelectorAll('.ext-tab-btn')).map(btn => {
        const rect = btn.getBoundingClientRect();
        return { btn, id: btn.dataset.tabId, left: rect.left - originX, width: rect.width };
    });
    drag.fromIndex = drag.items.findIndex(item => item.btn === drag.btn);
    if (drag.fromIndex < 0 || drag.items.length < 2) return false;

    const [first, second] = drag.items;
    drag.gap = second.left - first.left - first.width;
    drag.targetIndex = drag.fromIndex;
    drag.active = true;

    // 놓을 자리를 보여주는 점선 슬롯
    const slot = document.createElement('div');
    slot.className = 'ext-tab-slot';
    slot.style.top = `${drag.btn.offsetTop}px`;
    slot.style.width = `${drag.items[drag.fromIndex].width}px`;
    slot.style.height = `${drag.btn.offsetHeight}px`;
    container.insertBefore(slot, container.firstChild);
    drag.slot = slot;

    container.classList.add('is-dragging');
    drag.btn.classList.add('ext-tab-lifted');
    document.documentElement.classList.add('ext-tab-dragging');
    document.addEventListener('keydown', handleTabDragKeydown, true);
    window.addEventListener('blur', cancelTabDrag);

    applyTabDragLayout(drag);
    drag.rafId = requestAnimationFrame(tickTabAutoScroll);
    return true;
}

function updateTabDrag(drag) {
    const { items, fromIndex } = drag;
    const dragged = items[fromIndex];
    const last = items[items.length - 1];

    const rawDx = getTabContainerX(drag.container, drag.lastClientX) - drag.startX;
    const minDx = items[0].left - dragged.left;
    const maxDx = last.left + last.width - dragged.left - dragged.width;
    const dx = Math.min(Math.max(rawDx, minDx), maxDx);
    setTabOffset(drag.btn, dx);

    // 원래 자리 기준: 오른쪽 이웃은 드래그 중인 탭의 오른쪽 끝이, 왼쪽 이웃은 왼쪽 끝이
    // 그 이웃의 중심을 넘으면 자리를 바꿈 (탭 폭이 달라도 양 끝 자리에 항상 도달 가능)
    const leftEdge = dragged.left + dx;
    const rightEdge = leftEdge + dragged.width;
    let targetIndex = fromIndex;
    items.forEach((item, index) => {
        const middle = item.left + item.width / 2;
        if (index > fromIndex && rightEdge > middle) targetIndex += 1;
        else if (index < fromIndex && leftEdge < middle) targetIndex -= 1;
    });

    if (targetIndex !== drag.targetIndex) {
        drag.targetIndex = targetIndex;
        applyTabDragLayout(drag);
    }
}

// 탭 줄이 가로로 넘칠 때, 포인터가 가장자리에 닿으면 자동으로 스크롤
function tickTabAutoScroll() {
    const drag = tabDrag;
    if (!drag || !drag.active || drag.ending) return;

    const { container } = drag;
    if (container.scrollWidth > container.clientWidth) {
        const rect = container.getBoundingClientRect();
        const fromLeft = drag.lastClientX - rect.left;
        const fromRight = rect.right - drag.lastClientX;
        let step = 0;

        if (fromLeft < TAB_AUTOSCROLL_EDGE_PX) {
            step = -TAB_AUTOSCROLL_MAX_STEP_PX * Math.min(1, (TAB_AUTOSCROLL_EDGE_PX - fromLeft) / TAB_AUTOSCROLL_EDGE_PX);
        } else if (fromRight < TAB_AUTOSCROLL_EDGE_PX) {
            step = TAB_AUTOSCROLL_MAX_STEP_PX * Math.min(1, (TAB_AUTOSCROLL_EDGE_PX - fromRight) / TAB_AUTOSCROLL_EDGE_PX);
        }

        if (step) {
            const before = container.scrollLeft;
            container.scrollLeft = before + step;
            if (container.scrollLeft !== before) updateTabDrag(drag);
        }
    }

    drag.rafId = requestAnimationFrame(tickTabAutoScroll);
}

function releaseTabDragResources(drag) {
    cancelAnimationFrame(drag.rafId);
    document.removeEventListener('keydown', handleTabDragKeydown, true);
    window.removeEventListener('blur', cancelTabDrag);
    document.documentElement.classList.remove('ext-tab-dragging');

    try {
        if (drag.btn.hasPointerCapture(drag.pointerId)) {
            drag.btn.releasePointerCapture(drag.pointerId);
        }
    } catch (e) {
        // 이미 해제된 포인터는 무시
    }
}

// 드래그용 임시 스타일을 걷어내고, 필요하면 새 순서를 DOM/저장소에 반영
function resetTabDrag(drag, nextOrder = null) {
    const { container } = drag;
    container.classList.add('ext-tab-no-anim');

    [drag.btn, ...drag.items.map(item => item.btn)].forEach(btn => {
        btn.style.translate = '';
        btn.classList.remove('ext-tab-lifted', 'ext-tab-settling');
    });
    if (drag.slot) drag.slot.remove();
    container.classList.remove('is-dragging');

    if (nextOrder) {
        applyTabOrderToDom(nextOrder);
        saveTabOrder(nextOrder);
    }

    // 전환 효과 없이 최종 위치를 확정한 뒤 애니메이션을 다시 켬
    void container.offsetWidth;
    container.classList.remove('ext-tab-no-anim');
}

// 애니메이션 없이 즉시 정리 (탭 UI 재생성, 페이지 이동 등)
function abortTabDrag() {
    const drag = tabDrag;
    if (!drag) return;

    clearTimeout(drag.settleTimer);
    tabDrag = null;
    releaseTabDragResources(drag);
    resetTabDrag(drag);
}

// 놓은 자리(또는 취소 시 원래 자리)로 안착하는 애니메이션 후 정리
function endTabDrag(commit) {
    const drag = tabDrag;
    if (!drag || drag.ending) return;

    drag.ending = true;
    releaseTabDragResources(drag);

    if (!commit) {
        drag.targetIndex = drag.fromIndex;
        applyTabDragLayout(drag);
    }

    drag.btn.classList.remove('ext-tab-lifted');
    drag.btn.classList.add('ext-tab-settling');
    setTabOffset(drag.btn, drag.slotLeft - drag.items[drag.fromIndex].left);

    drag.settleTimer = setTimeout(() => {
        if (tabDrag !== drag) return;
        tabDrag = null;

        const changed = commit && drag.targetIndex !== drag.fromIndex;
        resetTabDrag(drag, changed ? normalizeTabOrder(drag.order.map(item => item.id), tabOrder) : null);
    }, prefersReducedMotion() ? 0 : TAB_SETTLE_MS);
}

function cancelTabDrag() {
    const drag = tabDrag;
    if (!drag || drag.ending) return;

    if (!drag.active) {
        abortTabDrag();
        return;
    }

    suppressTabClickBriefly();
    endTabDrag(false);
}

function handleTabDragKeydown(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    cancelTabDrag();
}

function handleTabPointerDown(e) {
    suppressNextTabClick = false;
    if (tabDrag || !e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const btn = e.currentTarget;
    const container = btn.parentElement;
    if (!container) return;

    tabDrag = {
        btn,
        container,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        lastClientX: e.clientX,
        startX: getTabContainerX(container, e.clientX),
        active: false,
        ending: false,
        items: [],
        order: [],
        fromIndex: -1,
        targetIndex: -1,
        gap: 0,
        slot: null,
        slotLeft: 0,
        rafId: 0,
        settleTimer: 0
    };

    try {
        btn.setPointerCapture(e.pointerId);
    } catch (err) {
        // 포인터 캡처를 못 써도 드래그 자체는 동작합니다.
    }
}

function handleTabPointerMove(e) {
    const drag = tabDrag;
    if (!drag || drag.ending || e.pointerId !== drag.pointerId) return;

    // 버튼을 놓았는데 pointerup을 놓친 경우 드래그가 멈추지 않도록 방어
    if (e.buttons === 0) {
        cancelTabDrag();
        return;
    }

    drag.lastClientX = e.clientX;
    if (!drag.active) {
        if (Math.abs(e.clientX - drag.startClientX) < TAB_DRAG_THRESHOLD_PX) return;
        if (!startTabDrag(drag)) {
            abortTabDrag();
            return;
        }
    }

    updateTabDrag(drag);
}

function handleTabPointerUp(e) {
    const drag = tabDrag;
    if (!drag || drag.ending || e.pointerId !== drag.pointerId) return;

    // 드래그 없이 뗀 경우는 일반 클릭이므로 상태만 정리
    if (!drag.active) {
        abortTabDrag();
        return;
    }

    drag.lastClientX = e.clientX;
    updateTabDrag(drag);
    suppressTabClickBriefly();
    endTabDrag(true);
}

function handleTabPointerCancel(e) {
    if (tabDrag && e.pointerId === tabDrag.pointerId) cancelTabDrag();
}

// 탭 UI 생성 함수
function createTabInterface() {
    const sidebarInner = document.querySelector("#secondary-inner");
    if (!sidebarInner) return;

    // 유튜브가 레이아웃을 바꾸면서 챕터/스크립트/질문하기 패널 컨테이너를 탭 줄 앞에 끼워 넣으면
    // 패널이 탭 줄 위로 올라오므로, 탭 줄이 항상 사이드바 맨 위에 오도록 다시 올림
    const existingTabs = document.getElementById("my-extension-tabs");
    if (existingTabs) {
        if (sidebarInner.firstElementChild !== existingTabs && !tabDrag) {
            sidebarInner.prepend(existingTabs);
        }
        return;
    }

    ensureCurrentTabIsVisible();
    if (!hasExplicitTabSelection) {
        currentTab = getLeftmostTabId();
    }

    const tabContainer = document.createElement("div");
    tabContainer.id = "my-extension-tabs";

    const uiLang = getUiLanguageCode();

    // 텍스트 추출 시도 (유튜브 UI 언어 우선, 실패 시 언어별 fallback)
    const txtRecommendations = getYoutubeFirstTabLabel('recommendations', uiLang);
    const txtScript = getYoutubeFirstTabLabel('script', uiLang);
    const txtChapters = getYoutubeFirstTabLabel('chapters', uiLang);
    const txtAsk = getAskTabLabel(uiLang);
    const txtComments = getYoutubeFirstTabLabel('comments', uiLang);

    const tabs = [
        { id: 'recommendations', text: txtRecommendations },
        { id: 'comments', text: txtComments },
        { id: 'chapters', text: txtChapters },
        { id: 'ask', text: txtAsk },
        { id: 'script', text: txtScript }
    ];
    const tabMap = new Map(tabs.map(tab => [tab.id, tab]));
    const orderedTabs = getVisibleTabOrder().map(id => tabMap.get(id)).filter(Boolean);

    orderedTabs.forEach(tab => {
        const btn = document.createElement("button");
        btn.innerText = tab.text;
        btn.className = `ext-tab-btn ${tab.id === currentTab ? 'active' : 'inactive'}`;
        btn.id = `btn-${tab.id}`;
        btn.dataset.tabId = tab.id;
        btn.addEventListener('pointerdown', handleTabPointerDown);
        btn.addEventListener('pointermove', handleTabPointerMove);
        btn.addEventListener('pointerup', handleTabPointerUp);
        btn.addEventListener('pointercancel', handleTabPointerCancel);
        btn.addEventListener('lostpointercapture', handleTabPointerCancel);
        btn.onclick = () => {
            if (suppressNextTabClick) {
                suppressNextTabClick = false;
                return;
            }
            handleTabClick(tab.id);
        };
        tabContainer.appendChild(btn);
    });

    sidebarInner.prepend(tabContainer);
    needsContentRefresh = true;
}

function handleTabClick(tabId) {
    if (!normalizeVisibleTabs(visibleTabIds).includes(tabId)) return;
    hasExplicitTabSelection = true;
    currentTab = tabId;
    tabActivatedAt = Date.now();
    if (tabId === 'ask') {
        askActivationNonce += 1;
        lastAskAttemptNonce = -1;
        askLastAttemptAt = 0;
        cachedAskButton = null;
        askGestureUntil = Date.now() + ASK_USER_GESTURE_WINDOW_MS;
        triggerNativeAskPanel(true);
    }
    updateButtonStyles();
    needsContentRefresh = true;
    const shouldRetry = updateContentVisibility();
    needsContentRefresh = shouldRetry;
    lastDomSyncAt = Date.now();
    lastSyncedUrl = location.href;
    lastSyncedTab = currentTab;
}

function updateButtonStyles() {
    const buttons = document.querySelectorAll('.ext-tab-btn');
    buttons.forEach(btn => {
        if (btn.id === `btn-${currentTab}`) {
            btn.classList.remove('inactive');
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
            btn.classList.add('inactive');
        }
    });
}

function isValidPanel(panel, type) {
    if (!panel) return false;

    if (type === 'chapters') {
        const markers = panel.querySelector('ytd-macro-markers-list-renderer');
        return markers !== null;
    }

    if (type === 'script') {
        const hasContent = panel.innerHTML.includes('ytd-transcript-segment-renderer') || panel.innerText.length > 50;
        return hasContent;
    }

    return true;
}

function rebuildTabInterface() {
    abortTabDrag();
    const existing = document.getElementById("my-extension-tabs");
    if (existing) {
        existing.remove();
    }

    ensureCurrentTabIsVisible();

    if (location.pathname.includes('/shorts/')) return;
    if (!location.pathname.includes('/watch')) return;

    createTabInterface();
    updateButtonStyles();
    needsContentRefresh = true;
    const shouldRetry = updateContentVisibility();
    needsContentRefresh = shouldRetry;
    lastDomSyncAt = Date.now();
    lastSyncedUrl = location.href;
    lastSyncedTab = currentTab;
}

function getAskTabLabel(uiLang) {
    const fallback = getLocalizedUiText('ask', uiLang);
    const raw = getYoutubeUiText('ask');
    let text = cleanTabText(raw).replace(/^✦\s*/, '').trim();

    if (!text) {
        text = fallback;
    }

    return `${ASK_TAB_ICON} ${text}`;
}

function isAskPanelElement(panel) {
    if (!panel) return false;

    const targetId = (panel.getAttribute('target-id') || '').toLowerCase();
    if (targetId.includes('searchable-transcript') || targetId.includes('macro-markers') || targetId.includes('comments')) {
        return false;
    }

    // 현재 유튜브 질문하기 패널의 대표 target-id: PAyouchat
    if (ASK_PANEL_TARGET_IDS.some(id => targetId === id || targetId.includes(id))) {
        return true;
    }

    // 질문하기 전용 렌더러(you-chat) 존재 여부로 보조 판별
    if (
        panel.querySelector('[panel-target-id="PAyouchat"]') ||
        panel.querySelector('[data-target-id="youchat_section_list"]') ||
        panel.querySelector('you-chat-item-view-model') ||
        panel.querySelector('yt-chat-input-view-model')
    ) {
        return true;
    }

    if (ASK_TARGET_KEYWORDS.some(keyword => targetId.includes(keyword))) {
        return true;
    }

    const titleEl = panel.querySelector('#title-text');
    const title = titleEl ? titleEl.innerText.trim() : '';
    return ASK_TEXT_REGEX.test(title);
}

function getAskPanel() {
    const primaryPanel = document.querySelector(`ytd-engagement-panel-section-list-renderer[target-id="${ASK_PRIMARY_PANEL_TARGET_ID}"]`);
    if (primaryPanel && !primaryPanel.classList.contains('ext-stale')) {
        return primaryPanel;
    }
    if (primaryPanel) {
        return primaryPanel;
    }

    const panels = Array.from(document.querySelectorAll('ytd-engagement-panel-section-list-renderer'))
        .filter(panel => !panel.classList.contains('ext-stale'));

    if (panels.length === 0) return null;

    const askPanels = panels.filter(panel => isAskPanelElement(panel));
    if (askPanels.length === 0) return null;

    return askPanels[askPanels.length - 1];
}

function getManagedPanels() {
    const panelSet = new Set();
    const selectors = [
        `ytd-engagement-panel-section-list-renderer[target-id="${ASK_PRIMARY_PANEL_TARGET_ID}"]`,
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]',
        'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"]'
    ];

    selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(panel => panelSet.add(panel));
    });

    document.querySelectorAll('ytd-engagement-panel-section-list-renderer').forEach(panel => {
        if (isAskPanelElement(panel)) panelSet.add(panel);
    });

    return Array.from(panelSet);
}

function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
}

function hasChapterSignals() {
    if (document.querySelector('ytd-macro-markers-list-renderer')) return true;
    if (document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]')) return true;
    if (document.querySelector('button[aria-label*="챕터 보기"], button[aria-label*="View chapters"], button[aria-label*="查看章节"], .ytp-chapter-title.ytp-button')) return true;

    const descText = normalizeText(
        (document.querySelector('ytd-text-inline-expander #attributed-snippet-text') || document.querySelector('#description-inline-expander'))?.textContent || ''
    );
    return /(^|\s)(\d{1,2}:)?\d{1,2}:\d{2}\b/.test(descText);
}

function getEmptyStateDelayMs(tabId) {
    if (tabId === 'chapters') return 2400;
    if (tabId === 'ask') return 3000;
    if (tabId === 'script') return 3500;
    return 0;
}

function shouldDeferEmptyState(tabId) {
    const delay = getEmptyStateDelayMs(tabId);
    if (delay <= 0) return false;

    const now = Date.now();
    const elapsedSinceTab = now - tabActivatedAt;
    const elapsedSincePage = now - pageEnteredAt;
    if (tabId === 'chapters') {
        const recentlyTriggered = (now - lastChapterTriggerAt) < CHAPTER_TRIGGER_COOLDOWN_MS;
        if (!recentlyTriggered && !hasChapterSignals()) return false;
        return elapsedSinceTab < delay;
    }

    return elapsedSinceTab < delay || elapsedSincePage < delay;
}

function normalizeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function hasAskButtonText(btn) {
    if (!btn) return false;
    const text = normalizeText(`${btn.innerText || btn.textContent || ''} ${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''}`);
    return ASK_TEXT_REGEX.test(text);
}

function hasGeminiAskIcon(btn) {
    if (!btn) return false;
    const path = btn.querySelector('svg path');
    if (!path) return false;
    const d = path.getAttribute('d') || '';
    return d.includes('M480-80q0-83');
}

function isAskButtonCandidate(btn) {
    if (!btn || btn.closest('#my-extension-tabs')) return false;
    if (!isElementVisible(btn)) return false;
    return hasAskButtonText(btn) || hasGeminiAskIcon(btn);
}

function isAskButtonCandidateLoose(btn) {
    if (!btn || btn.closest('#my-extension-tabs')) return false;
    return hasAskButtonText(btn) || hasGeminiAskIcon(btn);
}

function getAskButtonPriority(btn) {
    let score = 100;

    if (btn.closest('#flexible-item-buttons')) {
        score -= 120;
    }
    if (btn.closest('#top-level-buttons-computed') || btn.closest('#actions-inner') || btn.closest('ytd-watch-metadata')) {
        score -= 80;
    }
    if (btn.closest('yt-video-description-youchat-section-view-model') || btn.closest('ytd-structured-description-content-renderer')) {
        score += 50;
    }
    if (btn.closest('#secondary') || btn.closest('#secondary-inner')) {
        score += 20;
    }

    const label = normalizeText(`${btn.getAttribute('aria-label') || ''} ${btn.innerText || ''}`);
    if (label.includes('이 동영상에 대해 물어보세요')) score -= 8;
    if (label.includes('질문하기')) score -= 5;
    if (label.includes('この動画について質問する') || label.includes('質問する')) score -= 5;
    if (label.includes('询问此视频') || label.includes('询问这个视频') || label.includes('提问')) score -= 5;
    if (label.includes('Спросить об этом видео') || label.includes('Спросить')) score -= 5;
    if (label.includes('Zu diesem Video fragen') || label.includes('Fragen')) score -= 5;
    if (/\bask\b/i.test(label)) score -= 3;

    return score;
}

function selectBestAskButton(candidates, allowHidden = false) {
    if (!candidates || candidates.length === 0) return null;
    const uniq = Array.from(new Set(candidates)).filter(allowHidden ? isAskButtonCandidateLoose : isAskButtonCandidate);
    if (uniq.length === 0) return null;

    uniq.sort((a, b) => getAskButtonPriority(a) - getAskButtonPriority(b));
    return uniq[0];
}

function getSortedAskButtonCandidates() {
    const selectorCandidates = [
        '#flexible-item-buttons button[aria-label*="この動画について質問"]',
        '#flexible-item-buttons button[aria-label*="質問"]',
        '#flexible-item-buttons button[aria-label*="질문하기"]',
        '#flexible-item-buttons button[aria-label*="이 동영상에 대해 물어보세요"]',
        '#flexible-item-buttons button[aria-label*="询问此视频"]',
        '#flexible-item-buttons button[aria-label*="询问这个视频"]',
        '#flexible-item-buttons button[aria-label*="提问"]',
        '#flexible-item-buttons button[aria-label*="Спросить"]',
        '#flexible-item-buttons button[aria-label*="Fragen"]',
        '#flexible-item-buttons button[aria-label*="Ask"]',
        '#flexible-item-buttons button',
        '#flexible-item-buttons a[role="button"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="질문하기"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="この動画について質問"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="質問"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="询问此视频"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="询问这个视频"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="提问"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="Спросить"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="Fragen"]',
        'ytd-menu-renderer #flexible-item-buttons button[aria-label*="Ask"]',
        'ytd-menu-renderer #flexible-item-buttons button',
        '#top-level-buttons-computed button',
        '#top-level-buttons-computed a[role="button"]',
        '#actions-inner button',
        '#actions-inner a[role="button"]',
        'ytd-watch-metadata #actions button',
        'ytd-watch-metadata #actions a[role="button"]',
        'button[aria-label*="この動画について質問"]',
        'button[aria-label*="質問"]',
        'button[aria-label*="이 동영상에 대해 물어보세요"]',
        'button[aria-label*="질문하기"]',
        'button[aria-label*="询问此视频"]',
        'button[aria-label*="询问这个视频"]',
        'button[aria-label*="提问"]',
        'button[aria-label*="Спросить"]',
        'button[aria-label*="Fragen"]',
        'button[aria-label*="Ask"]',
        'button[title*="質問"]',
        'button[title*="질문하기"]',
        'button[title*="询问此视频"]',
        'button[title*="询问这个视频"]',
        'button[title*="提问"]',
        'button[title*="Спросить"]',
        'button[title*="Fragen"]',
        'button[title*="Ask"]',
        'yt-button-shape button[aria-label*="この動画について質問"]',
        'yt-button-shape button[aria-label*="質問"]',
        'yt-button-shape button[aria-label*="질문하기"]',
        'yt-button-shape button[aria-label*="询问此视频"]',
        'yt-button-shape button[aria-label*="询问这个视频"]',
        'yt-button-shape button[aria-label*="提问"]',
        'yt-button-shape button[aria-label*="Спросить"]',
        'yt-button-shape button[aria-label*="Fragen"]',
        'yt-button-shape button[aria-label*="Ask"]',
        'ytd-button-renderer button[aria-label*="この動画について質問"]',
        'ytd-button-renderer button[aria-label*="質問"]',
        'ytd-button-renderer button[aria-label*="질문하기"]',
        'ytd-button-renderer button[aria-label*="询问此视频"]',
        'ytd-button-renderer button[aria-label*="询问这个视频"]',
        'ytd-button-renderer button[aria-label*="提问"]',
        'ytd-button-renderer button[aria-label*="Спросить"]',
        'ytd-button-renderer button[aria-label*="Fragen"]',
        'ytd-button-renderer button[aria-label*="Ask"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="この動画について質問"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="質問"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="질문하기"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="询问此视频"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="询问这个视频"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="提问"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="Спросить"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="Fragen"]',
        'yt-video-description-youchat-section-view-model button[aria-label*="Ask"]'
    ];

    const pooled = [];
    for (const selector of selectorCandidates) {
        document.querySelectorAll(selector).forEach(btn => pooled.push(btn));
    }

    document.querySelectorAll('.yt-spec-touch-feedback-shape__fill')
        .forEach(el => {
            const btn = el.closest('button');
            if (btn) pooled.push(btn);
        });

    const uniq = Array.from(new Set(pooled)).filter(isAskButtonCandidateLoose);
    uniq.sort((a, b) => getAskButtonPriority(a) - getAskButtonPriority(b));
    return uniq;
}

function getStrictAskButtons() {
    const buttons = [];
    for (const selector of ASK_STRICT_SELECTORS) {
        document.querySelectorAll(selector).forEach(btn => buttons.push(btn));
    }
    return Array.from(new Set(buttons));
}

function findTopActionAskButton() {
    const strictButtons = getStrictAskButtons();
    const strictVisible = strictButtons.filter(isElementVisible);
    if (strictVisible.length > 0) return strictVisible[0];
    if (strictButtons.length > 0) return strictButtons[0];

    const actionButtons = Array.from(document.querySelectorAll(
        '#flexible-item-buttons button, #flexible-item-buttons a[role="button"], ' +
        'ytd-menu-renderer #flexible-item-buttons button, ' +
        '#top-level-buttons-computed button, #actions-inner button, ytd-watch-metadata #actions button'
    ));
    const visibleActionButtons = actionButtons.filter(btn => !btn.closest('#my-extension-tabs'));

    const textMatched = visibleActionButtons.filter(btn => hasAskButtonText(btn) && isElementVisible(btn));
    if (textMatched.length > 0) {
        return selectBestAskButton(textMatched) || textMatched[0];
    }

    const iconMatched = visibleActionButtons.filter(btn => hasGeminiAskIcon(btn) && isElementVisible(btn));
    if (iconMatched.length > 0) {
        return selectBestAskButton(iconMatched) || iconMatched[0];
    }

    const topSelectors = [
        '#top-level-buttons-computed button[aria-label*="この動画について質問"]',
        '#top-level-buttons-computed button[aria-label*="質問"]',
        '#top-level-buttons-computed button[aria-label*="질문하기"]',
        '#top-level-buttons-computed button[aria-label*="이 동영상에 대해 물어보세요"]',
        '#top-level-buttons-computed button[aria-label*="询问此视频"]',
        '#top-level-buttons-computed button[aria-label*="询问这个视频"]',
        '#top-level-buttons-computed button[aria-label*="提问"]',
        '#top-level-buttons-computed button[aria-label*="Спросить"]',
        '#top-level-buttons-computed button[aria-label*="Fragen"]',
        '#top-level-buttons-computed button[aria-label*="Ask"]',
        '#actions-inner button[aria-label*="この動画について質問"]',
        '#actions-inner button[aria-label*="質問"]',
        '#actions-inner button[aria-label*="질문하기"]',
        '#actions-inner button[aria-label*="이 동영상에 대해 물어보세요"]',
        '#actions-inner button[aria-label*="询问此视频"]',
        '#actions-inner button[aria-label*="询问这个视频"]',
        '#actions-inner button[aria-label*="提问"]',
        '#actions-inner button[aria-label*="Спросить"]',
        '#actions-inner button[aria-label*="Fragen"]',
        '#actions-inner button[aria-label*="Ask"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="この動画について質問"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="質問"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="질문하기"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="询问此视频"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="询问这个视频"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="提问"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="Спросить"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="Fragen"]',
        'ytd-watch-metadata #actions-inner button[aria-label*="Ask"]'
    ];

    const pooled = [];
    for (const selector of topSelectors) {
        document.querySelectorAll(selector).forEach(btn => pooled.push(btn));
    }

    visibleActionButtons.forEach(btn => pooled.push(btn));

    return selectBestAskButton(pooled, true) || selectBestAskButton(pooled);
}

function findNativeAskButton() {
    const strictButtons = getStrictAskButtons();
    if (strictButtons.length > 0) {
        const visibleStrict = strictButtons.filter(isElementVisible);
        const firstStrict = visibleStrict[0] || strictButtons[0];
        cachedAskButton = firstStrict;
        return firstStrict;
    }

    const topActionBtn = findTopActionAskButton();
    if (topActionBtn) {
        cachedAskButton = topActionBtn;
        return topActionBtn;
    }

    if (cachedAskButton && document.contains(cachedAskButton) && isAskButtonCandidate(cachedAskButton)) {
        return cachedAskButton;
    }

    const candidates = getSortedAskButtonCandidates();
    const selected = candidates.length > 0 ? (selectBestAskButton(candidates) || candidates[0]) : null;
    cachedAskButton = selected;
    return selected;
}

function clickElement(element) {
    if (!element) return false;
    const target =
        element.closest('button, a[role="button"], yt-button-shape button') ||
        element.querySelector('button, a[role="button"], yt-button-shape button') ||
        element;

    try {
        target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        if (typeof target.click === 'function') {
            target.click();
        }
    } catch (e) {
        return false;
    }
    return true;
}

function clickAskElement(element) {
    if (!element) return false;

    if (clickElement(element)) return true;

    const host = element.closest('button-view-model, yt-button-view-model, ytd-button-renderer');
    if (host && clickElement(host)) return true;

    const fallbackBtn = host ? host.querySelector('button, a[role="button"]') : null;
    if (fallbackBtn && clickElement(fallbackBtn)) return true;

    return false;
}

function triggerNativeAskPanel(force = false) {
    const now = Date.now();
    if (!force && now - lastAskTriggerAt < ASK_TRIGGER_COOLDOWN_MS) {
        return false;
    }
    if (!force && lastAskAttemptNonce === askActivationNonce && now - askLastAttemptAt < ASK_RETRY_DELAY_MS) {
        return false;
    }

    const strictButtons = getStrictAskButtons();
    const candidates = strictButtons.length > 0 ? strictButtons : getSortedAskButtonCandidates();
    if (candidates.length === 0) return false;

    let clicked = false;
    const maxAttempts = Math.min(3, candidates.length);
    for (let i = 0; i < maxAttempts; i++) {
        if (clickAskElement(candidates[i])) {
            clicked = true;
            cachedAskButton = candidates[i];
            break;
        }
    }
    if (!clicked) return false;

    askLastAttemptAt = now;
    lastAskAttemptNonce = askActivationNonce;
    lastAskTriggerAt = now;
    return true;
}

function triggerNativeChapterPanel() {
    const now = Date.now();
    if (now - lastChapterTriggerAt < CHAPTER_TRIGGER_COOLDOWN_MS) {
        return false;
    }

    if (document.querySelector('ytd-macro-markers-list-renderer')) {
        return false;
    }

    const selectorCandidates = [
        'button[aria-label*="챕터 보기"]',
        'button[aria-label*="View chapters"]',
        'button[aria-label*="查看章节"]',
        'button[aria-label*="Показать главы"]',
        'button[aria-label*="Главы"]',
        'button[aria-label*="Kapitel anzeigen"]',
        'button[aria-label*="Kapitel"]',
        'button[title*="챕터 보기"]',
        'button[title*="View chapters"]',
        'button[title*="查看章节"]',
        'button[title*="Показать главы"]',
        'button[title*="Главы"]',
        'button[title*="Kapitel anzeigen"]',
        'button[title*="Kapitel"]',
        'ytd-structured-description-content-renderer #expand',
        'ytd-text-inline-expander #expand',
        'tp-yt-paper-button#expand'
    ];

    for (const selector of selectorCandidates) {
        const btn = Array.from(document.querySelectorAll(selector)).find(isElementVisible);
        if (btn) {
            btn.click();
            lastChapterTriggerAt = now;
            return true;
        }
    }

    return false;
}

// [수정됨] 스크립트 클릭 핸들러 (더 강력하게 변경)
function setupScriptClickHandler() {
    // 이미 전역적으로 설정되어 있다면 중복 실행 방지
    if (isScriptHandlerSetup) return;
    isScriptHandlerSetup = true;

    // 특정 영역(sidebarInner)이 아니라 문서 전체(document.body)에서 클릭을 감지
    // (요소가 이동되어도 클릭 이벤트를 놓치지 않기 위함)
    document.body.addEventListener('click', function (e) {
        // 1. 클릭된 요소가 스크립트 한 줄(segment) 안에 있는지 확인
        const segmentItem = e.target.closest('ytd-transcript-segment-renderer');
        if (!segmentItem) return;

        // 2. 시간 텍스트 요소 찾기
        const timeDiv = segmentItem.querySelector('.segment-timestamp');
        if (!timeDiv) return;

        // 3. 유튜브의 기본 클릭 동작(페이지 이동 등) 막기
        e.preventDefault();
        e.stopPropagation();

        // 4. 시간 계산
        const timeText = timeDiv.textContent.trim();
        const timeParts = timeText.split(':').map(Number);
        let seconds = 0;

        if (timeParts.length === 2) {
            seconds = timeParts[0] * 60 + timeParts[1]; // 분:초
        } else if (timeParts.length === 3) {
            seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]; // 시:분:초
        }

        // 5. 메인 비디오 플레이어 찾아서 이동
        // .html5-main-video 클래스가 가장 정확함
        const player = document.querySelector('.html5-main-video') || document.querySelector('video');
        if (player) {
            player.currentTime = seconds;
            if (player.paused) {
                player.play();
            }
        }
    }, true); // 캡처링 모드 사용 (이벤트 우선순위 높임)
}

function getBestPanel(targetId) {
    const panels = Array.from(document.querySelectorAll(`ytd-engagement-panel-section-list-renderer[target-id="${targetId}"]`));
    const freshPanels = panels.filter(p => !p.classList.contains('ext-stale'));

    if (freshPanels.length > 0) return freshPanels[freshPanels.length - 1];
    if (panels.length > 0) return panels[panels.length - 1];
    return null;
}

// 컨텐츠 표시 로직
function updateContentVisibility() {
    // 쇼츠일 경우 중단
    if (location.pathname.includes('/shorts/')) return false;
    ensureCurrentTabIsVisible();

    const sidebarInner = document.querySelector("#secondary-inner");
    if (!sidebarInner) return true;
    let shouldRetry = false;
    const uiLang = getUiLanguageCode();

    const allRelated = document.querySelectorAll("#related");
    const allComments = document.querySelectorAll("#comments");

    // 1. 모든 패널(챕터/스크립트) 숨기기
    const allPanels = getManagedPanels();
    allPanels.forEach(panel => {
        if (panel.style.display !== 'none') {
            panel.style.display = 'none';
        }
        if (panel.classList.contains('ext-scrollable-content')) {
            panel.classList.remove('ext-scrollable-content');
        }
    });

    if (currentTab !== 'recommendations') {
        allRelated.forEach(el => {
            el.classList.remove('ext-related-scroll');
            el.style.display = 'none';
        });
    }

    if (currentTab !== 'comments') {
        allComments.forEach(el => {
            el.style.setProperty('display', 'none', 'important');
            el.classList.remove('ext-scrollable-content');
        });
    }

    if (currentTab === 'recommendations' || currentTab === 'comments') removePlaceholder();

    // 2. 탭별 활성화 로직
    if (currentTab === 'recommendations') {
        let targetRelated = document.querySelector("#secondary-inner > #related") || document.querySelector("#related");
        if (targetRelated) {
            targetRelated.style.display = 'block';
            targetRelated.style.removeProperty('display');
            // 댓글 탭처럼 추천 영상 목록도 전용 스크롤바를 가짐 (실제 적용 여부는 CSS가 레이아웃 기준으로 판단)
            targetRelated.classList.add('ext-related-scroll');
        }
    }
    else if (currentTab === 'comments') {
        let targetComments = null;
        const sidebarComment = sidebarInner.querySelector("#comments");

        if (sidebarComment && sidebarComment.style.display !== 'none') {
            targetComments = sidebarComment;
        } else if (allComments.length > 0) {
            targetComments = allComments[0];
        }

        if (targetComments) {
            targetComments.style.display = 'block';
            if (!targetComments.classList.contains('ext-scrollable-content')) {
                targetComments.classList.add('ext-scrollable-content');
            }
            const related = document.querySelector("#related");
            if (targetComments.parentNode !== sidebarInner || (related && targetComments.nextElementSibling !== related)) {
                if (related) {
                    sidebarInner.insertBefore(targetComments, related);
                } else {
                    sidebarInner.appendChild(targetComments);
                }
            }
        }
    }
    else {
        let targetId = "";
        let placeholderText = "";
        let targetPanel = null;

        if (currentTab === 'script') {
            targetId = "engagement-panel-searchable-transcript";
            placeholderText = getLocalizedUiText('scriptMissing', uiLang);
        } else if (currentTab === 'chapters') {
            targetId = "engagement-panel-macro-markers-description-chapters";
            placeholderText = getLocalizedUiText('chapterMissing', uiLang);
        } else if (currentTab === 'ask') {
            placeholderText = getLocalizedUiText('askUnavailable', uiLang);
        }

        if (currentTab === 'ask') {
            targetPanel = getAskPanel();
        } else {
            targetPanel = getBestPanel(targetId);
        }
        
        if (targetPanel && isValidPanel(targetPanel, currentTab)) {
            removePlaceholder();
            targetPanel.classList.remove('ext-stale');

            if (targetPanel.style.display !== 'block') {
                targetPanel.style.display = 'block';
            }
            targetPanel.style.visibility = 'visible';
            if (currentTab === 'ask') {
                targetPanel.setAttribute('visibility', 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED');
            }

            if (!targetPanel.classList.contains('ext-scrollable-content')) {
                targetPanel.classList.add('ext-scrollable-content');
            }

            if (currentTab === 'script') {
                setupScriptClickHandler();
            }
        } else {
            // [수정됨] 패널이 없을 때 바로 '없음'을 띄우지 않고, 강제 로드 시도
            let isTriggered = false;

            if (currentTab === 'script') {
                // 유튜브 원본 설명란에 있는 '스크립트 표시' 버튼 찾기
                const nativeScriptBtn = document.querySelector('ytd-video-description-transcript-section-renderer button');
                // 버튼이 존재하면 강제로 클릭하여 패널 로딩 유도
                if (nativeScriptBtn) {
                    nativeScriptBtn.click();
                    isTriggered = true;
                }
            }
            else if (currentTab === 'chapters') {
                isTriggered = triggerNativeChapterPanel();
            }
            
            // 챕터가 없을 경우, 설명란이 접혀있어서 그럴 수 있음 (설명란 더보기 클릭 시도)
            if (currentTab === 'chapters' && !document.querySelector('ytd-macro-markers-list-renderer')) {
                 const moreBtn = document.querySelector('#expand'); // 더보기 버튼
                 if(moreBtn && moreBtn.hidden === false) {
                     // 챕터는 보통 설명란을 펼치면 로드될 확률이 높음 (하지만 너무 자주 클릭되면 안되므로 주의)
                     // 여기서는 스크립트 위주로 처리하고, 챕터는 플레이어가 로드되면 뜸
                 }
            }

            // 강제로 로드 버튼을 눌렀다면, 이번 텀에는 placeholder를 띄우지 않고 리턴 (다음 인터벌에 패널이 잡힘)
            if (isTriggered) {
                return true; 
            }

            if (currentTab === 'ask' && Date.now() < askGestureUntil) {
                showPlaceholder(getLocalizedUiText('askOpening', uiLang));
                return true;
            }

            if (shouldDeferEmptyState(currentTab)) {
                showPlaceholder(getLocalizedUiText('loading', uiLang));
                return true;
            }

            showPlaceholder(placeholderText);
            if (currentTab === 'chapters' && !hasChapterSignals()) {
                shouldRetry = false;
            } else if (RETRY_TABS.has(currentTab)) {
                shouldRetry = true;
            }
        }
    }

    return shouldRetry;
}

function showPlaceholder(text) {
    const existing = document.getElementById("ext-placeholder-content");
    if (existing && existing.textContent === text) return;

    removePlaceholder();

    const sidebarInner = document.querySelector("#secondary-inner");
    const related = document.querySelector("#related");

    if (!sidebarInner) return;

    const div = document.createElement("div");
    div.id = "ext-placeholder-content";
    div.className = "ext-placeholder";
    div.innerHTML = `<p>${text}</p>`;

    if (related) {
        sidebarInner.insertBefore(div, related);
    } else {
        sidebarInner.appendChild(div);
    }
}

function removePlaceholder() {
    const existing = document.getElementById("ext-placeholder-content");
    if (existing) existing.remove();
}

function checkUrlChange() {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        hasExplicitTabSelection = false;
        currentTab = getLeftmostTabId();
        pageEnteredAt = Date.now();
        tabActivatedAt = pageEnteredAt;
        updateButtonStyles();
        lastAskTriggerAt = 0;
        lastChapterTriggerAt = 0;
        askActivationNonce += 1;
        lastAskAttemptNonce = -1;
        askLastAttemptAt = 0;
        askGestureUntil = 0;
        cachedAskButton = null;
        abortTabDrag();
        needsContentRefresh = true;
        lastSyncedUrl = '';
        lastSyncedTab = '';
        lastDomSyncAt = 0;

        // URL 변경 시 핸들러 플래그는 초기화하지 않음 (document에 영구 부착하므로)

        const allTargetPanels = document.querySelectorAll(
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"], ' +
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]'
        );
        allTargetPanels.forEach(panel => {
            panel.classList.add('ext-stale');
            panel.classList.remove('ext-scrollable-content');
            panel.style.display = 'none';
        });

        const allAskPanels = Array.from(document.querySelectorAll('ytd-engagement-panel-section-list-renderer'))
            .filter(panel => isAskPanelElement(panel));
        allAskPanels.forEach(panel => {
            panel.classList.add('ext-stale');
            panel.classList.remove('ext-scrollable-content');
            panel.style.display = 'none';
        });

        const allComments = document.querySelectorAll("#comments");
        allComments.forEach(el => {
            el.style.setProperty('display', 'none', 'important');
            el.classList.remove('ext-scrollable-content');
        });

        if (!location.pathname.includes('/shorts/')) {
            setTimeout(createTabInterface, 1000);
        }
        return true;
    }
    return false;
}

// 쇼츠일 때 기능 원상복구 함수
function cleanupForShorts() {
    const tabContainer = document.getElementById("my-extension-tabs");
    if (tabContainer) tabContainer.remove();

    const allRelated = document.querySelectorAll("#related");
    const allComments = document.querySelectorAll("#comments");

    allRelated.forEach(el => {
        el.style.removeProperty('display');
        el.classList.remove('ext-related-scroll');
    });
    allComments.forEach(el => {
        el.style.removeProperty('display');
        el.classList.remove('ext-scrollable-content');
    });

    removePlaceholder();

    const allPanels = document.querySelectorAll('ytd-engagement-panel-section-list-renderer');
    allPanels.forEach(panel => {
        panel.style.removeProperty('display');
        panel.classList.remove('ext-scrollable-content');
    });

    needsContentRefresh = true;
    lastSyncedUrl = '';
    lastSyncedTab = '';
    lastDomSyncAt = 0;
    askGestureUntil = 0;
    cachedAskButton = null;
    abortTabDrag();
    hasExplicitTabSelection = false;
}

// [추가됨] 유튜브 화면 내에 있는 텍스트를 추출하는 함수
function getYoutubeUiText(type) {
    let text = "";

    try {
        // 추천 영상 탭은 유튜브 화면에서 이름을 읽지 않고 항상 내부 번역(getLocalizedUiText)을 사용함:
        // 추천 목록 안에는 탭 이름으로 쓸 원문 제목이 없고, id="title"이 붙은 요소를 읽으면
        // Shorts 선반 등 다른 제목이 탭 이름("Shorts")으로 잡히는 문제가 있었음
        if (type === 'script') {
            // 1. 스크립트 패널의 제목 찾기 ('스크립트' or 'Transcript')
            const panelTitle = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"] #title-text');
            // 2. 설명란의 '스크립트 표시' 버튼 텍스트 찾기
            const descButton = document.querySelector('ytd-video-description-transcript-section-renderer button');

            if (panelTitle && panelTitle.innerText) text = panelTitle.innerText;
            else if (descButton && descButton.innerText) text = descButton.innerText;
        }
        else if (type === 'chapters') {
            // 챕터 패널 제목 찾기 ('챕터' or 'Chapters')
            const panelTitle = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"] #title-text');
            if (panelTitle && panelTitle.innerText) text = panelTitle.innerText;
        }
        else if (type === 'comments') {
            // 댓글 섹션 헤더 찾기 ('댓글' or 'Comments')
            // 숫자가 포함될 수 있으므로 정규식으로 숫자와 기호 제거 (예: "댓글 100개" -> "댓글")
            const commentHeader = document.querySelector('ytd-comments-header-renderer #title');

            if (commentHeader) {
                // 헤더 텍스트에서 숫자만 제거하고 가져오기
                text = commentHeader.innerText.replace(/[0-9,.]/g, '').trim();
                // 만약 "Comments"가 아니라 "100 Comments" 처럼 나온다면, 아래와 같이 '개' 같은 단위 처리 필요할 수 있음
                // 하지만 보통 헤더(ytd-comments-header-renderer)의 #title은 텍스트만 포함하는 경우가 많음
            }
            // 모바일/사이드바용 댓글 패널 제목 시도
            if (!text) {
                const panelTitle = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-comments-section"] #title-text');
                if (panelTitle) text = panelTitle.innerText;
            }
        }
        else if (type === 'ask') {
            // 요청한 "제미나이 원문"에 맞추기 위해 버튼 라벨을 우선 사용
            const nativeAskBtn = findNativeAskButton();
            if (nativeAskBtn) {
                text = `${nativeAskBtn.innerText || nativeAskBtn.textContent || nativeAskBtn.getAttribute('aria-label') || ''}`
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            if (!text) {
                const askPanel = getAskPanel();
                const panelTitle = askPanel ? askPanel.querySelector('#title-text') : null;
                if (panelTitle && panelTitle.innerText) {
                    text = panelTitle.innerText.trim();
                }
            }
        }
    } catch (e) {
        console.log("텍스트 추출 실패", e);
    }

    return text;
}

function setupStorageSync() {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.onChanged) return;

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        let didUpdate = false;

        if (Object.prototype.hasOwnProperty.call(changes, TAB_ORDER_STORAGE_KEY)) {
            tabOrder = normalizeTabOrder(changes[TAB_ORDER_STORAGE_KEY].newValue);
            didUpdate = true;
        }

        if (Object.prototype.hasOwnProperty.call(changes, TAB_VISIBILITY_STORAGE_KEY)) {
            visibleTabIds = normalizeVisibleTabs(changes[TAB_VISIBILITY_STORAGE_KEY].newValue);
            didUpdate = true;
        }

        if (!didUpdate) return;
        rebuildTabInterface();
    });
}

setInterval(() => {
    const hasUrlChanged = checkUrlChange();

    // 1. 쇼츠일 경우 처리
    if (location.pathname.includes('/shorts/')) {
        cleanupForShorts();
        return;
    }

    // 2. [추가됨] 영상 시청 페이지('/watch')가 아니면 아무것도 하지 않음
    // 채널 페이지, 홈 화면 등에서 팝업이 숨겨지는 문제를 방지합니다.
    if (!location.pathname.includes('/watch')) {
        return;
    }

    createTabInterface();
    const tabContainer = document.getElementById("my-extension-tabs");
    const tabChanged = (lastSyncedTab !== currentTab) || (lastSyncedUrl !== location.href);
    const backgroundSyncDue = RETRY_TABS.has(currentTab) && (Date.now() - lastDomSyncAt >= BACKGROUND_SYNC_MS);
    const shouldSyncNow = needsContentRefresh || hasUrlChanged || tabChanged || backgroundSyncDue || !tabContainer;

    if (shouldSyncNow) {
        const shouldRetry = updateContentVisibility();
        needsContentRefresh = shouldRetry;
        lastDomSyncAt = Date.now();
        lastSyncedUrl = location.href;
        lastSyncedTab = currentTab;
    }

    // 안전장치: 스크립트 탭이면 핸들러 등록 시도 (아직 안 됐을 경우 대비)
    if (currentTab === 'script') {
        setupScriptClickHandler();
    }
}, TICK_INTERVAL_MS);

loadTabOrder();
setupStorageSync();
