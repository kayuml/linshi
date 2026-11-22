// ==UserScript==  
// @name         JavDB 增强助手
// @namespace    
// @version      2026.10.24-version21.0
// @description  JavDB 全站增强：① 深度汉化——繁简转换 + 内置谷歌翻译引擎（防缓存污染/并发限流/风控重试/残料二次翻译/季集转换），覆盖标题、资讯与关联列表；② 预览升级——DMM/FANZA 高画质预告片解析与一键画质切换、详情页长缩略图、封面就地播放、悬浮大图、大屏居中播放器；③ 浏览体验——自动关闭年龄验证、自动关闭应用推广横幅、会员封面修复、原标题显示、主题自适应复制按钮、分页优化与跳页、毛玻璃搜索栏、链接新窗口、弹窗打开详情、域名自动重写、503 自动重试；④ 数据管理——评论与磁链增强、相关清单绕过 VIP、已下载标记与管理、本地/WebDAV 备份，全功能可开关
// @author       admin
// @include      https://javdb*.com/*  
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// @require      https://cdn.jsdelivr.net/npm/blueimp-md5@2.19.0/js/md5.min.js
// @connect      jdforrepam.com
// @connect      translate.googleapis.com
// @connect      google.com
// @connect      www.google.com
// @connect      127.0.0.1
// @connect      javstore.net
// @connect      api.dmm.com
// @connect      www.dmm.co.jp
// @connect      cc3001.dmm.co.jp
// @connect      special.dmm.co.jp
// @connect      *
// @run-at       document-start  
// @icon         
// ==/UserScript==
(function() {
    'use strict';
    // ==================== 配置管理 ====================
    // 用户脚本的默认配置，默认只开启汉化、自动关闭年龄验证、自动关闭应用推广横幅、显示重试按钮和分页样式优化
    const DEFAULT_CONFIG = {
        translation: true,           // 简体中文翻译（默认开启）
        autoClickAge: true,          // 自动关闭年龄验证（默认开启）
        hideBanner: true,            // 自动关闭应用推广横幅（默认开启，键名沿用 hideBanner 以兼容旧配置）
        hideVipItems: false,         // 隐藏会员专属菜单
        hideFooter: false,           // 隐藏页脚导航
        hideFloatButtons: false,     // 隐藏悬浮按钮
        hidePaymentLog: false,       // 隐藏支付记录
        hideVipLink: false,          // 隐藏"成为VIP"
        hideFeedback: false,         // 隐藏反馈入口
        hideTheporndude: false,      // 隐藏ThePornDude入口
        hideAISexyGirlfriend: false,      // 隐藏AI色色女友💋入口
        hideTopNavExtras: false,     // 隐藏顶部外部功能区
        hideSearchKeywords: false,   // 隐藏搜索区域热搜关键词
        hideMagnetSubmit: false,     // 隐藏提交磁链控件
        loadActressInfo: true,     // 加载女优信息（默认开启）
        copyButtons: true,          // 添加复制按钮（默认开启）
        fixVipCover: false,          // 修复会员专属封面
        showOriginTitle: true,      // 自动显示原标题（默认开启）
        paginationJump: true,        // 分页样式优化并添加跳转到指定页码（默认开启）
        beautifySearchBar: true,     // 搜索栏美化（默认开启）
        openNewTab: true,            // 全局链接新窗口打开（默认开启）
        linkRewrite: false,          // 链接重写到最新域名（目标域名从顶部域名栏自动获取，不再硬编码）
        customRewriteDomain: '',     // 自定义重写域名（优先级高于自动获取的域名，留空则用自动获取）
        retryButton: true,           // 显示重新翻译按钮（默认开启）
        autoReload503: true,         // 503错误页自动重载（默认开启）
        downloadMark: true,          // 已下载标记（默认开启）
        loadReviews: false,          // 查看评论信息（默认关闭）
        loadRelated: false,          // 相关清单增强（默认关闭）
        dialogOpenDetail: true,      // 弹窗方式打开页面（默认开启）
        hoverBigImg: true,           // 悬浮大图（默认开启）
        enableLoadScreenShot: true,  // 详情页加载长缩略图（默认开启）
        enableLoadPreviewVideo: true,// 更高画质预览视频-DMM/FANZA（默认开启）
        enableScreenSvg: true,       // 封面快捷按钮：长缩略图（默认开启）
        enableVideoSvg: true,        // 封面快捷按钮：预览视频（默认开启）
        videoQuality: 'hhb'          // 预览视频默认画质偏好
    };
    let config = Object.assign({}, DEFAULT_CONFIG);  
  
    // 加载配置
    function loadConfig() {
        const saved = GM_getValue('javdb_config', null);
        if (saved) {
            try {
                config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(saved));
            } catch (e) {
                console.error('加载配置失败:', e);
            }
        }
        // 读取持久化的"域名栏自动获取的最新域名"（跨页面共享，供链接重写与设置展示）
        try { detectedLatestDomain = GM_getValue(DETECTED_DOMAIN_KEY, '') || ''; } catch (e) {}
    }  
  
    // 保存配置
    function saveConfig() {
        GM_setValue('javdb_config', JSON.stringify(config));
    }  
  
    // ==================== 链接重写功能 ====================
    // 目标域名不再硬编码：优先使用用户在设置中填写的自定义域名，
    // 其次使用从网站顶部域名栏(nav.sub-header)自动获取的最新域名（GM 存储持久化，跨页面共享）
    const DETECTED_DOMAIN_KEY = 'javdb_detected_domain';
    let detectedLatestDomain = '';

    // 规范化域名输入：去掉协议/路径/端口，只保留合法主机名（非法返回空串）
    function normalizeDomainInput(raw) {
        if (!raw) return '';
        let s = String(raw).trim().toLowerCase();
        s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[\/?#].*$/, '').replace(/:\d+$/, '');
        return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : '';
    }

    // 从顶部域名栏解析最新域名。实际结构形如：
    // 🔥 官方App: app.javdb581.com / app.javdb582.com, 最新域名: javdb581.com / javdb582.com, 永久域名: javdb.com, ...
    function parseLatestDomainFromBar(bar) {
        if (!bar) return '';
        // 优先从链接 href 中提取带编号的最新域名（天然排除 app.* 子域名与永久域名 javdb.com）
        for (const a of bar.querySelectorAll('a[href]')) {
            try {
                const host = new URL(a.href, location.href).hostname.toLowerCase();
                if (/^javdb\d+\.[a-z0-9.-]+$/.test(host)) return host;
            } catch (e) {}
        }
        // 兜底：从"最新域名/最新網址"标签之后的文本里提取第一个 javdb 域名
        const seg = (bar.textContent || '').split(/最新(?:域名|網址|网址)[:：]?/)[1];
        if (seg) {
            const m = seg.match(/javdb\d*\.[a-z]{2,}(?:\.[a-z]{2,})?/i);
            if (m) return m[0].toLowerCase();
        }
        return '';
    }

    // 检测并持久化最新域名（无论重写开关是否开启都运行，供设置面板展示）
    function detectLatestDomain() {
        let domain = parseLatestDomainFromBar(document.querySelector('nav.sub-header'));
        // 兜底：网站在 body[data-domain] 上也声明了当前最新域名（域名栏被隐藏/移除时可用）
        if (!domain && document.body) {
            const bodyDomain = normalizeDomainInput(document.body.getAttribute('data-domain'));
            if (bodyDomain && bodyDomain !== 'javdb.com' && !bodyDomain.endsWith('.javdb.com')) {
                domain = bodyDomain;
            }
        }
        if (domain && domain !== detectedLatestDomain) {
            detectedLatestDomain = domain;
            try { GM_setValue(DETECTED_DOMAIN_KEY, domain); } catch (e) {}
            // 设置面板开着时实时刷新展示
            const view = document.getElementById('javdb-detected-domain');
            if (view) view.textContent = domain;
        }
        return detectedLatestDomain;
    }

    // 重写目标域名：用户自定义 > 域名栏自动获取
    function getRewriteTargetDomain() {
        const custom = normalizeDomainInput(config.customRewriteDomain);
        if (custom) return custom;
        return detectLatestDomain();
    }

    // 在 javdb.com 域名下，将所有指向 javdb.com 的链接替换为最新可用域名
    function rewriteLinksToTempDomain() {
        if (!config.linkRewrite) return;

        const permanentHost = 'javdb.com';

        // 如果当前域名不是永久域名，则不执行重写
        if (location.hostname !== permanentHost && !location.hostname.endsWith('.' + permanentHost)) {
            return;
        }

        // 替换链接的主函数（目标域名每次动态获取，域名栏加载完成后即可生效）
        const replaceLinks = () => {
            const tempHost = getRewriteTargetDomain();
            // 尚未获取到可用域名、或目标就是永久域名自身时不重写
            if (!tempHost || tempHost === permanentHost || tempHost.endsWith('.' + permanentHost)) return;
            document.querySelectorAll('a[href]').forEach(a => {
                try {
                    const url = new URL(a.href);
                    // 检查是否是目标域名（包括子域名）
                    if (url.hostname === permanentHost || url.hostname.endsWith('.' + permanentHost)) {
                        url.hostname = tempHost;
                        a.href = url.toString();

                        // 同时处理data-href属性（如果有）
                        if (a.hasAttribute('data-href')) {
                            const dataHref = a.getAttribute('data-href');
                            try {
                                const dataUrl = new URL(dataHref);
                                if (dataUrl.hostname === permanentHost || dataUrl.hostname.endsWith('.' + permanentHost)) {
                                    dataUrl.hostname = tempHost;
                                    a.setAttribute('data-href', dataUrl.toString());
                                }
                            } catch (e) {
                                // 忽略无法解析的data-href
                            }
                        }
                    }
                } catch (e) {
                    // 忽略无法解析的URL
                }
            });

            // 同时处理表单的action属性
            document.querySelectorAll('form[action]').forEach(form => {
                try {
                    const url = new URL(form.action, location.href);
                    if (url.hostname === permanentHost || url.hostname.endsWith('.' + permanentHost)) {
                        url.hostname = tempHost;
                        form.action = url.toString();
                    }
                } catch (e) {
                    // 忽略无法解析的URL
                }
            });
        };

        // 初次替换
        replaceLinks();

        // 监听动态内容变化（幂等，避免重复注册观察者）
        if (rewriteLinksToTempDomain._bound) return;
        rewriteLinksToTempDomain._bound = true;
        const observer = new MutationObserver((mutations) => {
            let shouldReplace = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    shouldReplace = true;
                    break;
                }
            }
            if (shouldReplace) {
                setTimeout(replaceLinks, 100); // 延迟执行确保新元素已完全加载
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // ==================== 全局链接新窗口打开 ====================
    // 例外：锚点、JS 伪链接、Rails 功能性链接(data-method)、分页（分页保持当前页跳转）
    function applyOpenInNewTab() {
        if (!config.openNewTab) return;

        // 🚀 分页链接一律当前页跳转（并清理之前可能误加的 _blank）
        document.querySelectorAll('nav.pagination a, a.pagination-link, a.pagination-previous, a.pagination-next').forEach(a => {
            if (a.getAttribute('target') === '_blank') {
                a.removeAttribute('target');
                a.removeAttribute('rel');
            }
        });

        document.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
            if (a.hasAttribute('data-method')) return;
            // 跳过底部分页区域
            if (a.closest('nav.pagination')) return;
            // 🚀 弹窗方式打开页面开启时，仅「封面图片」点击会被弹窗拦截；
            // 标题/日期等其他位置的链接一律不干预，正常设置 _blank（新窗口打开功能保持生效）
            if (!a.getAttribute('target')) {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    // 搜索行为新窗口打开（拦截检索按钮 + 回车），与分页的当前页跳转形成对照
    function hookSearchOpenNewTab() {
        if (!config.openNewTab) return;

        const doSearchNewTab = () => {
            const input = document.getElementById('video-search');
            const select = document.getElementById('search-type');
            const q = input ? input.value.trim() : '';
            if (!q) return false;
            const f = select ? select.value : ((input && input.getAttribute('data-type')) || 'all');
            window.open(`${location.origin}/search?q=${encodeURIComponent(q)}&f=${f}`, '_blank');
            return true;
        };

        // 拦截「检索」按钮点击（捕获阶段，抢先于网站自带的当前页跳转逻辑）
        document.addEventListener('click', (e) => {
            if (!(e.target.closest && e.target.closest('#search-submit'))) return;
            if (doSearchNewTab()) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        // 拦截搜索框回车快捷搜索
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const input = e.target && e.target.closest ? e.target.closest('#video-search') : null;
            if (!input) return;
            if (doSearchNewTab()) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    // ==================== 第三方评论功能 ====================
    const JD_API_BASE = "https://jdforrepam.com/api";
    
    // 生成第三方 API 所需的签名
    function buildJdSignature() {
        const tsKey = "javdb_review_ts", signKey = "javdb_review_sign";
        const n = Math.floor(Date.now() / 1e3);
        if (n - (localStorage.getItem(tsKey) || 0) <= 20) return localStorage.getItem(signKey);
        const salt = "71cf27bb3c0bcdf207b64abecddc970098c7421ee7203b9cdae54478478a199e7d5a6e1a57691123c1a931c057842fb73ba3b3c83bcd69c17ccf174081e3d8aa";
        const hash = md5(`${n}${salt}`);
        const sign = `${n}.lpw6vgqzsp.${hash}`;
        localStorage.setItem(tsKey, n);
        localStorage.setItem(signKey, sign);
        return sign;
    }

    // 请求评论数据
    async function fetchReviews(movieId, page = 1, limit = 20) {
        const url = `${JD_API_BASE}/v1/movies/${movieId}/reviews?page=${page}&sort_by=hotly&limit=${limit}`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'jdSignature': buildJdSignature(),
                    'Accept': 'application/json'
                },
                onload: res => {
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            const data = JSON.parse(res.responseText);
                            resolve(data.data ? data.data.reviews || [] : []);
                        } catch (e) { reject(new Error('解析评论数据失败')); }
                    } else { reject(new Error(`请求评论失败: ${res.status}`)); }
                },
                onerror: () => reject(new Error('网络请求失败')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    // ---------- 辅助：HTML 转义，防止评论内容破坏结构 ----------
    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ---------- 辅助：文本归一化（去掉所有空白字符，用于比对重合评论） ----------
    function normalizeText(s) {
        return (s || '').replace(/\s+/g, '').trim();
    }

    // ---------- 生成追加评论节点：1:1 复刻原生短评结构，保证 UI 完全一致 ----------
    // ========== 4格缩进：函数定义 ==========
    function buildAppendedReviewItem(review) {
        // ========== 8格缩进：函数内部 ==========
        const dt = document.createElement('dt');
        dt.className = 'review-item ht-review-appended';
        const d = review.created_at ? new Date(review.created_at) : null;
        
        // ✅ 修复2：补全到秒级时间戳
        const time = d && !isNaN(d)
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
            : '';
        
        const score = Math.max(0, Math.min(5, review.score || 0));
        const stars = score ? `<span class="ht-stars" title="评分 ${score}">${'★'.repeat(score)}</span>` : '';
        const likes = review.likes_count || 0;
        const content = escapeHtml(review.content || '').replace(/\n/g, '<br>');
        
        dt.innerHTML = `
            <div class="review-title">
                <div class="likes is-pulled-right">
                    <button type="button" class="button is-small is-info ht-static-like" tabindex="-1" title="第三方点赞数（不可操作）">
                        <span class="label">赞</span>
                        <span class="likes-count">${likes}</span>
                    </button>
                </div>
                <span class="ht-review-user">${escapeHtml(review.username || '匿名用户')}</span>&nbsp;
                <span class="ht-third-tag">三方</span>
                ${stars}&nbsp;
                <span class="time">${time}</span>
            </div>
            <div class="content">
                <p>${content}</p>
            </div>
        `;
        return dt;
    }

    // ---------- 评论融合主函数：原生短评 × 第三方评论 无缝合并 ----------
    async function mergeThirdPartyReviews() {
        if (!config.loadReviews) return;
        if (!window.location.pathname.startsWith('/v/')) return;

        const reviewList = document.querySelector('#reviews dl.review-items, [data-movie-tab-target="reviews"] dl.review-items');
        if (!reviewList || reviewList.dataset.htReviewsMerged) return;

        const movieId = (window.location.pathname.match(/^\/v\/([a-zA-Z0-9]+)/) || [])[1];
        if (!movieId) return;

        let reviews = null;
        try {
            reviews = await fetchReviews(movieId, 1, 50);
        } catch (e) {
            console.warn('[JavDB 增强] 第三方评论获取失败，保持原生样式:', e);
        }
        // 无论成功失败都打标记，避免每次 DOM 变动都发请求
        reviewList.dataset.htReviewsMerged = 'true';
        if (!reviews || reviews.length === 0) return;

        // 重合评论 → 原生评论补全完整用户名 + 精确时间戳（赞/举报按钮原样保留）
        const matched = new Set();
        reviewList.querySelectorAll('dt.review-item:not(.more):not(.ht-review-appended)').forEach(nativeEl => {
            const contentEl = nativeEl.querySelector('.content');
            const nativeContent = normalizeText(contentEl ? contentEl.textContent : '');
            if (!nativeContent) return;
            
            const hitIdx = reviews.findIndex((r, idx) => !matched.has(idx) && normalizeText(r.content) === nativeContent);
            if (hitIdx === -1) return;
            matched.add(hitIdx);
            
            const titleEl = nativeEl.querySelector('.review-title');
            if (!titleEl) return;
            
            // 补全完整用户名
            for (const node of titleEl.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                    node.nodeValue = (reviews[hitIdx].username || '匿名用户') + ' ';
                    break;
                }
            }
            
            // ✅ 修复2：补全原生评论的精确时间戳（YYYY-MM-DD HH:mm:ss）
            const timeEl = nativeEl.querySelector('.time');
            if (timeEl && reviews[hitIdx].created_at) {
                const d = new Date(reviews[hitIdx].created_at);
                if (!isNaN(d)) {
                    timeEl.textContent = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                }
            }
        });

        // 融合③：网站没有的评论 → 追加到列表末尾（只显示赞的数据）
        reviews.forEach((r, idx) => {
            if (matched.has(idx)) return;
            reviewList.appendChild(buildAppendedReviewItem(r));
        });
    }

    // ==================== 相关清单增强功能 (独立标签版) ====================
    let relatedState = {
        movieId: null,
        page: 1,
        floorIndex: 1,
        loading: false,
        hasMore: true,
        loaded: false,
        loadedIds: new Set()          // 🚀 已加载清单 id，用于去重 / 判定越界重复
    };

    // 请求相关清单数据
    async function fetchRelatedLists(movieId, page = 1, limit = 20) {
        const url = `${JD_API_BASE}/v1/lists/related?movie_id=${movieId}&page=${page}&limit=${limit}`;
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'jdSignature': buildJdSignature(),
                    'Accept': 'application/json'
                },
                onload: res => {
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            const data = JSON.parse(res.responseText);
                            resolve(data.data ? data.data.lists || [] : []);
                        } catch (e) { reject(new Error('解析相关清单数据失败')); }
                    } else { reject(new Error(`请求相关清单失败: ${res.status}`)); }
                },
                onerror: () => reject(new Error('网络请求失败')),
                ontimeout: () => reject(new Error('请求超时'))
            });
        });
    }

    // 格式化日期：完整显示 年-月-日 时:分:秒
    function formatFullDateTime(dateStr) {
        if (!dateStr) return '未知';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '未知';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // 构建单个清单项的HTML
    function buildRelatedItemHTML(item, index) {
        const name = escapeHtml(item.name || '未命名清单');
        const movieCount = item.movies_count || 0;
        const collectionCount = item.collections_count || 0;
        const viewCount = item.views_count || 0;
        const createdAt = formatFullDateTime(item.created_at);
        const href = `/lists/${encodeURIComponent(item.id)}`;

        return `
        <div class="ht-related-item">
            <div class="ht-related-item-title">
                <span class="ht-related-index">#${index}</span>
                <a href="${href}" target="_blank" rel="noopener noreferrer">${name}</a>
            </div>
            <div class="ht-related-meta">
                <span>视频：${movieCount}</span>
                <span>收藏：${collectionCount}</span>
                <span>查看：${viewCount}</span>
                <span>创建：${createdAt}</span>
            </div>
        </div>`;
    }

    // 加载相关清单数据到独立容器
    
    // ==================== 女优信息加载 ====================
    // 同步 JAV-JHS ActressInfoPlugin：从日本维基百科抓取女优信息
    const JHS_ACTRESS_API_URL = "https://ja.wikipedia.org/wiki/";
    
    async function loadActressInfo() {
        console.log("[JavDB增强] ========== loadActressInfo 调用 ==========");
        console.log("[JavDB增强] config.loadActressInfo:", config.loadActressInfo);
        console.log("[JavDB增强] 当前URL:", window.location.pathname);
        console.log("[JavDB增强] 是否已加载:", loadActressInfo._loaded);
        
        if (!config.loadActressInfo) {
            console.log("[JavDB增强] 功能未启用，退出");
            return;
        }
        if (!window.location.pathname.startsWith('/v/')) {
            console.log("[JavDB增强] 不是详情页，退出");
            return;
        }
        if (loadActressInfo._loaded) {
            console.log("[JavDB增强] 已经加载过，退出");
            return;
        }
        
        // 等待演员信息区域出现（最多等待10秒）
        let retryCount = 0;
        const maxRetries = 20;
        const retryDelay = 500; // 500ms
        
        while (retryCount < maxRetries) {
            console.log(`[JavDB增强] 第 ${retryCount + 1} 次尝试查找演员...`);
            
            // 尝试多种选择器找到演员名字
            let nameList = [];
            
            // 选择器1: .actor-female
            const actorFemale = document.querySelectorAll('.actor-female');
            if (actorFemale.length > 0) {
                nameList = Array.from(actorFemale).map(el => el.textContent.trim()).filter(n => n);
                console.log("[JavDB增强] 使用 .actor-female 选择器，找到:", nameList);
            }
            
            // 选择器2: span[onmouseover*="star_"] a
            if (nameList.length === 0) {
                const starLinks = document.querySelectorAll('span[onmouseover*="star_"] a');
                if (starLinks.length > 0) {
                    nameList = Array.from(starLinks).map(el => el.textContent.trim()).filter(n => n);
                    console.log("[JavDB增强] 使用 span[onmouseover*=\"star_\"] 选择器，找到:", nameList);
                }
            }
            
            // 选择器3: 查找包含"演員"标签附近的链接
            if (nameList.length === 0) {
                const allStrong = document.querySelectorAll('strong');
                for (const strong of allStrong) {
                    if (strong.textContent.includes('演員') || strong.textContent.includes('演员')) {
                        const parent = strong.closest('.panel-block') || strong.parentElement;
                        if (parent) {
                            const links = parent.querySelectorAll('a');
                            if (links.length > 0) {
                                nameList = Array.from(links).map(el => el.textContent.trim()).filter(n => n);
                                console.log("[JavDB增强] 使用演员标签附近链接，找到:", nameList);
                            }
                        }
                        break;
                    }
                }
            }
            
            // 如果找到了演员，跳出循环
            if (nameList.length > 0) {
                console.log("[JavDB增强] 成功找到演员，开始加载信息");
                break;
            }
            
            // 如果还没找到，等待后重试
            retryCount++;
            if (retryCount < maxRetries) {
                console.log(`[JavDB增强] 未找到演员，${retryDelay}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        if (nameList.length === 0) {
            console.log("[JavDB增强] 重试次数已用完，仍未找到任何演员，退出");
            return;
        }
        
        loadActressInfo._loaded = true;
        
        const cacheKey = 'jhs_actress_info_cache';
        const cacheData = (() => {
            try { return JSON.parse(localStorage.getItem(cacheKey)) || {}; }
            catch (e) { return {}; }
        })();
        
        let infoHtml = '';
        
        for (let i = 0; i < nameList.length; i++) {
            const name = nameList[i];
            if (!name) continue;
            
            console.log(`[JavDB增强] 正在获取 ${name} 的信息...`);
            let info = cacheData[name];
            if (!info) {
                try {
                    info = await fetchActressInfo(name);
                    if (info) {
                        cacheData[name] = info;
                        console.log(`[JavDB增强] ${name} 信息获取成功:`, info);
                    }
                } catch (e) {
                    console.warn(`[JavDB增强] 获取女优信息失败: ${name}`, e);
                }
            }
            
            if (info) {
                infoHtml += `
                    <div class="panel-block actress-info">
                        <strong style="margin-right: 5px;"><span style="user-select: all">${name}</span>: </strong>
                        <a href="${info.url}" style="margin-left: 5px" target="_blank">
                            <span class="info-tag">${info.birthday || ''} ${info.age || ''}</span>
                            <span class="info-tag">${info.height || ''} ${info.weight || ''}</span>
                            <span class="info-tag">${info.threeSize || ''} ${info.braSize || ''}</span>
                        </a>
                    </div>
                `;
            } else {
                infoHtml += `<div class="panel-block actress-info"><strong style="margin-right: 5px;"><span style="user-select: all">${name}</span>: </strong><a href="${JHS_ACTRESS_API_URL}${encodeURIComponent(name)}" target="_blank">暂无此演员信息</a></div>`;
            }
        }
        
        // 插入到"演員"标签后
        if (infoHtml) {
            console.log("[JavDB增强] 准备插入女优信息HTML");
            let inserted = false;
            
            // 方式1: 找"演員"标签
            const allStrong = document.querySelectorAll('strong');
            for (const strong of allStrong) {
                if (strong.textContent.includes('演員') || strong.textContent.includes('演员')) {
                    const parent = strong.closest('.panel-block') || strong.parentElement;
                    if (parent) {
                        parent.insertAdjacentHTML('afterend', infoHtml);
                        console.log("[JavDB增强] 成功在演员标签后插入");
                        inserted = true;
                        break;
                    }
                }
            }
            
            // 方式2: 如果没找到，尝试在第一个演员链接后插入
            if (!inserted) {
                const firstActor = document.querySelector('.actor-female, span[onmouseover*="star_"] a');
                if (firstActor && firstActor.parentElement) {
                    firstActor.parentElement.insertAdjacentHTML('afterend', infoHtml);
                    console.log("[JavDB增强] 在第一个演员链接后插入");
                    inserted = true;
                }
            }
            
            if (!inserted) {
                console.warn("[JavDB增强] 无法找到合适的插入位置");
            }
        }
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log("[JavDB增强] loadActressInfo 执行完成");
    }
    
    async function fetchActressInfo(name) {
        // 特殊名称处理
        if (name === '三上悠亞') name = '三上悠亜';
        
        const url = JHS_ACTRESS_API_URL + encodeURIComponent(name);
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const birthday = doc.querySelector('a[title="誕生日"]')?.closest('tr')?.querySelector('td')?.textContent?.trim() || '';
        const ageText = doc.querySelector('th:has(+ td)')?.textContent?.includes('現年齢') 
            ? doc.querySelector('th:has(+ td)')?.closest('tr')?.querySelector('td')?.textContent?.trim() 
            : '';
        const age = ageText ? ageText.replace(/[^\d]/g, '') + '岁' : '';
        
        const heightRow = Array.from(doc.querySelectorAll('tr')).find(r => r.querySelector('a[title="身長"]'));
        const height = heightRow ? heightRow.querySelector('td')?.textContent?.trim()?.split(' ')[0] + 'cm' : '';
        
        const weightRow = Array.from(doc.querySelectorAll('tr')).find(r => r.querySelector('a[title="体重"]'));
        let weight = weightRow ? weightRow.querySelector('td')?.textContent?.trim()?.split('/')?.[1]?.trim() : '';
        if (weight === '― kg') weight = '';
        
        const threeSizeRow = Array.from(doc.querySelectorAll('tr')).find(r => r.querySelector('a[title="スリーサイズ"]'));
        const threeSize = threeSizeRow ? threeSizeRow.querySelector('td')?.textContent?.trim() : '';
        
        const braSizeRow = Array.from(doc.querySelectorAll('tr')).find(r => r.textContent.includes('ブラサイズ'));
        const braSize = braSizeRow ? braSizeRow.querySelector('td')?.textContent?.trim() : '';
        
        return { birthday, age, height, weight, threeSize, braSize, url };
    }

    async function loadRelatedData(container, append = false) {
        if (relatedState.loading) return;
        if (append && !relatedState.hasMore) return;     // 仅"加载更多"时拦截，首屏始终放行

        relatedState.loading = true;
        const targetPage = append ? relatedState.page + 1 : 1;   // 页码内聚计算，失败不跳页

        if (!append) {
            container.innerHTML = '<div class="ht-related-loading">正在加载相关清单...</div>';
            relatedState.loadedIds = new Set();          // 首屏重置去重集合
            relatedState.floorIndex = 1;
            relatedState.page = 1;
            relatedState.hasMore = true;
        } else {
            const loadMoreBtn = container.querySelector('.ht-related-load-more');
            if (loadMoreBtn) {
                loadMoreBtn.textContent = '加载中...';
                loadMoreBtn.disabled = true;
            }
        }

        try {
            const lists = await fetchRelatedLists(relatedState.movieId, targetPage, 20);
            if (!append) container.innerHTML = '';

            // 首屏空结果
            if (lists.length === 0 && targetPage === 1) {
                container.innerHTML = '<div class="ht-related-empty">暂无相关清单</div>';
                relatedState.hasMore = false;
                relatedState.loaded = true;
                return;
            }

            // 🚀 渲染：按 id 去重，跳过重复条目；统一插在按钮之前，保证按钮恒在末尾
            let added = 0;
            const anchor = container.querySelector('.ht-related-load-more');
            lists.forEach(item => {
                const id = String(item.id ?? '');
                if (id && relatedState.loadedIds.has(id)) return;   // 越界回吐的旧数据 → 丢弃
                if (id) relatedState.loadedIds.add(id);
                const html = buildRelatedItemHTML(item, relatedState.floorIndex);
                relatedState.floorIndex++;
                added++;
                if (anchor) anchor.insertAdjacentHTML('beforebegin', html);
                else container.insertAdjacentHTML('beforeend', html);
            });

            relatedState.page = targetPage;               // 请求成功才推进页码
            relatedState.loaded = true;

            // 🚀 终止判定：不满一页 或 本页全是重复 → 没有更多，移除按钮
            if (lists.length < 20 || added === 0) {
                relatedState.hasMore = false;
                const btn = container.querySelector('.ht-related-load-more');
                if (btn) btn.remove();
                if (!container.querySelector('.ht-related-end')) {
                    container.insertAdjacentHTML('beforeend',
                        '<div class="ht-related-empty ht-related-end">已加载全部清单</div>');
                }
            } else {
                const btn = container.querySelector('.ht-related-load-more');
                if (btn) {
                    btn.textContent = '加载更多清单';
                    btn.disabled = false;
                } else {
                    const nb = document.createElement('button');
                    nb.className = 'ht-related-load-more';
                    nb.textContent = '加载更多清单';
                    nb.addEventListener('click', () => loadRelatedData(container, true));  // 不再外部 page++
                    container.appendChild(nb);
                }
            }
        } catch (e) {
            console.warn('[JavDB 增强] 相关清单加载失败:', e);
            if (!append) {
                container.innerHTML = '<div class="ht-related-empty">加载失败，点击重试</div>';
                const retry = container.querySelector('.ht-related-empty');
                retry.style.cursor = 'pointer';
                retry.addEventListener('click', () => loadRelatedData(container, false));
            } else {
                const btn = container.querySelector('.ht-related-load-more');
                if (btn) {
                    btn.textContent = '加载失败，点击重试';
                    btn.disabled = false;
                }
            }
        } finally {
            relatedState.loading = false;
        }
    }

    // 🚀 核心主函数：在旁边创建一个全新的 Tab 和容器，彻底绕过原生 VIP 限制
    function initRelatedEnhancement() {
        if (!config.loadRelated) return;
        if (!window.location.pathname.startsWith('/v/')) return;

        const movieId = (window.location.pathname.match(/^\/v\/([a-zA-Z0-9]+)/) || [])[1];
        if (!movieId) return;

        // 防止重复初始化
        if (document.getElementById('ht-related-custom-tab')) return;

        // 1. 找到原生 Tab 列表 (通常在 .tabs ul)
        const tabList = document.querySelector('.tabs ul, [data-controller="movie-tab"] .tabs ul');
        if (!tabList) return;

        // 2. 创建我们的新 Tab (另起炉灶)
        const customLi = document.createElement('li');
        customLi.id = 'ht-related-custom-tab';
        customLi.className = 'ht-related-tab-li';
        customLi.innerHTML = `<a>📋 相关清单</a>`;
        tabList.appendChild(customLi);

        // 3. 创建独立的内容容器
        const tabContainer = tabList.closest('.tabs');
        const contentPanel = document.createElement('div');
        contentPanel.id = 'ht-related-content-panel';
        contentPanel.className = 'ht-related-content-panel';
        contentPanel.style.display = 'none';
        
        // 插入位置：tabs 容器之后
        if (tabContainer && tabContainer.parentNode) {
            tabContainer.parentNode.insertBefore(contentPanel, tabContainer.nextSibling);
        } else {
            document.body.appendChild(contentPanel); // 兜底
        }

        // 4. 初始化状态
        relatedState.movieId = movieId;
        relatedState.page = 1;
        relatedState.floorIndex = 1;
        relatedState.loading = false;
        relatedState.hasMore = true;
        relatedState.loaded = false;
        relatedState.loadedIds = new Set();      // 🚀 切换/刷新影片时清空去重集合

        // 辅助函数：显示我们的面板，隐藏原生面板
        function showRelatedPanel() {
            // 切换 Tab 激活状态
            tabList.querySelectorAll('li').forEach(li => li.classList.remove('is-active'));
            customLi.classList.add('is-active');

            // 隐藏原生内容 (短评、磁链等)
            document.querySelectorAll('#reviews, #magnets-content, [data-movie-tab-target="reviews"], [data-movie-tab-target="magnets"]').forEach(el => {
                el.style.display = 'none';
            });
            
            // 显示我们的面板
            contentPanel.style.display = 'block';

            // 加载数据
            if (!relatedState.loaded && !relatedState.loading) {
                loadRelatedData(contentPanel);
            }
        }

        // 辅助函数：隐藏我们的面板 (当用户点击其他原生 Tab 时)
        function hideRelatedPanel() {
            customLi.classList.remove('is-active');
            contentPanel.style.display = 'none';
            
            // 🚀 修复：恢复被我们隐藏的原生元素，让原生 Tab 切换逻辑正常工作
            // 只恢复 display 属性，不改变其他样式
            document.querySelectorAll('#reviews, #magnets-content, [data-movie-tab-target="reviews"], [data-movie-tab-target="magnets"]').forEach(el => {
                // 清除我们设置的 inline style，让原生 CSS 重新接管
                if (el.style.display === 'none') {
                    el.style.display = '';
                }
            });
        }

        // 5. 绑定点击事件
        customLi.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showRelatedPanel();
        });

        // 6. 监听整个 Tab 区域的点击，如果点击的不是我们的 Tab，就隐藏我们的面板
        // 使用捕获阶段，确保在 JavDB 原生逻辑执行时，我们也能同步重置 UI
        document.addEventListener('click', (e) => {
            const target = e.target.closest('.tabs li');
            if (target && target !== customLi) {
                // 用户点击了原生 Tab (如短评、磁链)
                hideRelatedPanel();
            }
        }, true);
    }

    // ==================== 设置面板 ====================
    // 设置面板的CSS样式，支持暗色模式适配
    GM_addStyle(`
        .javdb-settings-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            display: none;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }  
  
        .javdb-settings-panel.active {    
            display: block;    
        }    
  
        .javdb-settings-header {    
            padding: 20px;    
            border-bottom: 1px solid #e0e0e0;    
            display: flex;    
            justify-content: space-between;    
            align-items: center;    
        }    
  
        .javdb-settings-header h2 {    
            margin: 0;    
            font-size: 18px;    
            color: #333;    
        }    
  
        .javdb-settings-close {    
            background: none;    
            border: none;    
            font-size: 24px;    
            cursor: pointer;    
            color: #999;    
            padding: 0;    
            width: 30px;    
            height: 30px;    
            line-height: 30px;    
            text-align: center;    
        }    
  
        .javdb-settings-close:hover {    
            color: #333;    
        }    
  
        .javdb-settings-body {    
            padding: 20px;    
        }    
  
        .javdb-setting-item {
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
        }

        .javdb-setting-item:last-child {
            border-bottom: none;
        }

        /* 标题与开关同一行，垂直居中对齐，与描述行数彻底解耦 */
        .javdb-setting-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }

        .javdb-setting-label {
            font-size: 14px;
            color: #333;
            flex: 1;
            min-width: 0;
        }

        .javdb-setting-desc {
            font-size: 12px;
            color: #999;
            margin-top: 6px;
            line-height: 1.5;
        }
  
        .javdb-toggle {    
            position: relative;    
            width: 44px;    
            height: 24px;    
            background: #ccc;    
            border-radius: 12px;    
            cursor: pointer;    
            transition: background 0.3s;    
        }    
  
        .javdb-toggle.active {    
            background: #3273dc;    
        }    
  
        .javdb-toggle::after {    
            content: '';    
            position: absolute;    
            top: 2px;    
            left: 2px;    
            width: 20px;    
            height: 20px;    
            background: white;    
            border-radius: 50%;    
            transition: transform 0.3s;    
        }    
  
        .javdb-toggle.active::after {    
            transform: translateX(20px);    
        }    
  
        .javdb-settings-footer {    
            padding: 15px 20px;    
            border-top: 1px solid #e0e0e0;    
            display: flex;    
            justify-content: flex-end;    
            gap: 10px;    
        }    
  
        .javdb-btn {    
            padding: 8px 16px;    
            border-radius: 6px;    
            border: 1px solid #ddd;    
            background: white;    
            cursor: pointer;    
            font-size: 14px;    
            transition: all 0.2s;    
        }    
  
        .javdb-btn:hover {    
            background: #f5f5f5;    
        }    
  
        .javdb-btn-primary {    
            background: #3273dc;    
            color: white;    
            border-color: #3273dc;    
        }    
  
        .javdb-btn-primary:hover {    
            background: #2366d1;    
        }    
  
        .javdb-settings-trigger {    
            position: fixed;    
            right: 20px;    
            top: 80px;    
            background: #3273dc;    
            color: white;    
            border: none;    
            border-radius: 6px;    
            padding: 10px 15px;    
            font-size: 14px;    
            cursor: pointer;    
            z-index: 9998;    
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);    
            transition: all 0.3s;    
        }    
  
        .javdb-settings-trigger:hover {    
            background: #2366d1;    
            transform: translateY(-2px);    
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);    
        }    
  
        .javdb-settings-overlay {    
            position: fixed;    
            top: 0;    
            left: 0;    
            right: 0;    
            bottom: 0;    
            background: rgba(0,0,0,0.5);    
            z-index: 9999;    
            display: none;    
        }    
  
        .javdb-settings-overlay.active {    
            display: block;    
        }    

        /* 禁用态的toggle开关（灰色不可点击，不改变实际状态） */
        .javdb-toggle.disabled {
            background: #e0e0e0 !important;
            cursor: not-allowed !important;
            opacity: 0.6;
        }

        .javdb-toggle.disabled::after {
            transform: translateX(0) !important;
            background: #bbb !important;
        }

        .javdb-setting-item.is-disabled .javdb-setting-label,
        .javdb-setting-item.is-disabled .javdb-setting-desc {
            color: #bbb !important;
        }

        /* 暗色模式 */    
        html[data-theme="dark"] .javdb-settings-panel {    
            background: #1e1e1e;    
        }    
  
        html[data-theme="dark"] .javdb-settings-header {    
            border-bottom-color: #333;    
        }    
  
        html[data-theme="dark"] .javdb-settings-header h2 {    
            color: #ddd;    
        }    
  
        html[data-theme="dark"] .javdb-setting-item {    
            border-bottom-color: #2a2a2a;    
        }    
  
        html[data-theme="dark"] .javdb-setting-label {    
            color: #ddd;    
        }    
  
        html[data-theme="dark"] .javdb-setting-desc {    
            color: #888;    
        }    
  
        html[data-theme="dark"] .javdb-settings-footer {    
            border-top-color: #333;    
        }    
  
        html[data-theme="dark"] .javdb-btn {    
            background: #2a2a2a;    
            border-color: #444;    
            color: #ddd;    
        }    
  
        html[data-theme="dark"] .javdb-btn:hover {    
            background: #333;    
        }    
  
        html[data-theme="dark"] .javdb-btn-primary {    
            background: #00bfa5;    
            color: #000;    
            border-color: #00bfa5;    
        }    
  
        html[data-theme="dark"] .javdb-btn-primary:hover {    
            background: #00d1b2;    
        }    
  
        html[data-theme="dark"] .javdb-settings-trigger {    
            background: #00bfa5;    
            color: #000;    
        }    
  
        html[data-theme="dark"] .javdb-settings-trigger:hover {    
            background: #00d1b2;    
        }
        
        html[data-theme="dark"] .javdb-toggle.disabled {
            background: #3a3a3a !important;
        }

        html[data-theme="dark"] .javdb-toggle.disabled::after {
            background: #555 !important;
        }

        html[data-theme="dark"] .javdb-setting-item.is-disabled .javdb-setting-label,
        html[data-theme="dark"] .javdb-setting-item.is-disabled .javdb-setting-desc {
            color: #555 !important;
        }

        /* 链接域名重写：当前获取域名展示框 + 自定义域名输入框 */
        .javdb-detected-domain {
            margin-top: 6px; padding: 8px 12px; border: 1px dashed #bbb; border-radius: 6px;
            font-size: 14px; font-family: Consolas, Menlo, monospace; word-break: break-all; color: #333;
        }
        html[data-theme="dark"] .javdb-detected-domain { background: #2a2a2a; border-color: #555; color: #ddd; }
        .javdb-domain-input {
            width: 100%; margin-top: 6px; box-sizing: border-box; padding: 8px 12px;
            border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none;
        }
        html[data-theme="dark"] .javdb-domain-input { background: #2a2a2a; border-color: #444; color: #ddd; }
        /* 链接域名重写子区块：内嵌于其开关项下方，仅开关开启时显示 */
        .javdb-domain-sub {
            margin: 10px 0 2px 0; padding: 10px 12px;
            border-left: 3px solid #00bfa5; border-radius: 0 8px 8px 0;
            background: rgba(0, 191, 165, 0.05);
        }
        html[data-theme="dark"] .javdb-domain-sub { background: rgba(0, 191, 165, 0.08); }
        
        /* 云备份管理弹窗样式 */
        .javdb-wd-manager-panel {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001; width: 600px; max-height: 80vh; display: none; flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        }
        .javdb-wd-manager-panel.active { display: flex; }
        .wd-loading, .wd-empty { text-align: center; padding: 30px; color: #999; }
        .wd-file-list { max-height: 60vh !important; }
        
        /* 暗色模式适配 */
        html[data-theme="dark"] .javdb-wd-manager-panel { background: #1e1e1e; }
        html[data-theme="dark"] .javdb-wd-manager-panel .javdb-settings-header { border-bottom-color: #333; }
        html[data-theme="dark"] .javdb-wd-manager-panel h2 { color: #ddd; }

        /* 女优信息样式 */
        .jhs-actress-info { margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 4px; }
        .jhs-actress-info-row { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 8px; }
        .jhs-actress-info-item { font-size: 13px; color: #666; }
        .jhs-actress-info-item strong { color: #333; }
        .jhs-info-tag { background-color: #ecf5ff; display: inline-block; height: 28px; padding: 0 8px; line-height: 28px; font-size: 12px; color: #409eff; border: 1px solid #d9ecff; border-radius: 4px; box-sizing: border-box; white-space: nowrap; }
        html[data-theme="dark"] .jhs-actress-info { background: #2a2a2a; }
        html[data-theme="dark"] .jhs-actress-info-item { color: #aaa; }
        html[data-theme="dark"] .jhs-actress-info-item strong { color: #ddd; }

    `);  
  
    // 创建设置面板
    function createSettingsPanel() {
        const overlay = document.createElement('div');
        overlay.className = 'javdb-settings-overlay';  
  
        const panel = document.createElement('div');    
        panel.className = 'javdb-settings-panel';    
  
        const settingsConfig = [    
            { key: 'translation', label: '简体中文翻译', desc: '将繁体中文转换为简体中文' },    
            { key: 'autoClickAge', label: '自动关闭年龄验证', desc: '自动点击"是,我已满18岁"按钮' },    
            { key: 'hideBanner', label: '自动关闭应用推广横幅', desc: '自动点击底部APP下载推广横幅的关闭按钮' },    
            { key: 'hideVipItems', label: '隐藏会员专属控件', desc: '隐藏‘更多短评需VIP或App查看’提示、原生相关清单、可播放、中字可播放等VIP控件' },
            { key: 'hideFooter', label: '隐藏页脚导航栏', desc: '隐藏底部导航栏' },    
            { key: 'hideFloatButtons', label: '隐藏悬浮按钮', desc: '隐藏右下角磁链下载、TOP按钮' },
            { key: 'hidePaymentLog', label: '隐藏支付记录', desc: '隐藏支付记录链接' },    
            { key: 'hideVipLink', label: '隐藏成为VIP', desc: '隐藏"成为VIP"链接' },    
            { key: 'hideFeedback', label: '隐藏反馈入口', desc: '隐藏顶部反馈链接' },    
            { key: 'hideTheporndude', label: '隐藏ThePornDude', desc: '隐藏ThePornDude链接' },
            { key: 'hideAISexyGirlfriend', label: '隐藏AI色色女友💋', desc: '隐藏AI色色女友💋链接' },
            { key: 'hideTopNavExtras', label: '隐藏顶部外部功能区', desc: '隐藏顶部的域名/公告栏和磁链页顶部的官方App/加入TG频道推广按钮' },
            { key: 'hideSearchKeywords', label: '隐藏热搜关键词列表', desc: '隐藏搜索栏下方的热搜关键词（LUXU、VR、无码流出等）区域' },
            { key: 'hideMagnetSubmit', label: '隐藏提交磁链控件', desc: '隐藏磁链页面的"提交磁链"按钮和顶部导航栏的"提交的磁链"链接' },
            { key: 'loadActressInfo', label: '加载女优信息', desc: '在详情页显示女优的生日、年龄、身高、体重、三围等信息（来源：日本维基百科）' },
            { key: 'copyButtons', label: '添加复制按钮', desc: '为标题、系列等添加复制按钮' },
            { key: 'fixVipCover', label: '修复会员封面', desc: '将会员专属封面恢复为普通封面' },    
            { key: 'showOriginTitle', label: '自动显示原标题', desc: '自动显示影片原标题' },    
            { key: 'paginationJump', label: '分页样式优化', desc: '为分页样式优化并添加跳转到指定页码功能' },    
            { key: 'beautifySearchBar', label: '搜索栏美化', desc: '毛玻璃质感搜索栏，独立圆角与主题自适应' },
            { key: 'openNewTab', label: '新窗口打开链接', desc: '影片/演员等链接及"搜索"在新窗口打开；底部分页保持当前页跳转，防标签页爆炸' },
            { key: 'linkRewrite', label: '链接域名重写', desc: '在 javdb.com 页面将链接重写为顶部域名栏获取的最新域名（开启后可在下方自定义域名，自定义优先）' },    
            { key: 'retryButton', label: '显示重试按钮', desc: '显示手动重新翻译按钮（依赖「简体中文翻译」开关）' },
            { key: 'autoReload503', label: '503自动重载', desc: '检测到"503 Service Temporarily Unavailable"错误页时自动重载重试（限次防死循环）' },
            { key: 'downloadMark', label: '已下载标记', desc: '列表页封面添加✓标记按钮，并提供已下载列表（查看/添加/编辑/删除）' },
            { key: 'loadReviews', label: '评论与磁链增强', desc: '补全原生短评用户名&具体发表时间、追加第三方评论，并隐藏"更多短评需VIP"提示，同时对磁链列表进行卡片化排版美化' },
            { key: 'loadRelated', label: '相关清单增强', desc: '在短评旁创建独立"相关清单"标签，通过API加载清单列表，支持分页加载' },
            { key: 'dialogOpenDetail', label: '弹窗方式打开页面', desc: '仅点击列表页「封面图片」时以居中弹窗(iframe)打开详情页；点击标题/日期等其他位置不受干预，Ctrl/⌘+点击仍在新标签页打开' },
            { key: 'hoverBigImg', label: '悬浮大图', desc: '鼠标悬停封面（影片列表/资讯卡片）时，浮动显示高清大图预览' },
            { key: 'enableLoadScreenShot', label: '加载长缩略图', desc: '影片详情页预览区首位插入 javstore 长缩略图，失败可重试' },
            { key: 'enableLoadPreviewVideo', label: '更高画质预览视频', desc: '解析 DMM/FANZA 预告片源替换详情页原生低画质预览视频，并提供画质切换按钮（DMM域名需可访问日本IP）' },
            { key: 'enableScreenSvg', label: '封面快捷按钮：长缩略图', desc: '列表页封面右下角添加按钮，点击全屏查看该番号长缩略图' },
            { key: 'enableVideoSvg', label: '封面快捷按钮：播放预览视频', desc: '列表页封面右下角添加按钮，点击就地播放 DMM 高画质预告片，再点切回封面' },
        ];    

        // 画质下拉框
        const videoQualityOptionsHtml = QUALITY_OPTIONS.filter(q => q.canSelect).map(q =>
            `<option value="${q.quality}" ${config.videoQuality === q.quality ? 'selected' : ''}>${q.text}</option>`).join('');
        const showVideoQualitySection = true;

        // 🔗 链接域名重写：展示当前自动获取到的最新域名 + 自定义域名（优先级更高）
        const detectedDomainText = detectedLatestDomain || '暂未获取到（打开任意页面后自动从顶部域名栏获取）';
        const customDomainValue = String(config.customRewriteDomain || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

        panel.innerHTML = `
            <div class="javdb-settings-header">
                <h2>⚙️ JavDB 增强助手设置</h2>
                <button class="javdb-settings-close">×</button>
            </div>
            <div class="javdb-settings-body">
                ${settingsConfig.map(item => {
                    const isRetry = item.key === 'retryButton';
                    const disabled = isRetry && !config.translation;
                    return `
                    <div class="javdb-setting-item ${disabled ? 'is-disabled' : ''}" data-key="${item.key}">
                        <div class="javdb-setting-head">
                            <span class="javdb-setting-label">${item.label}</span>
                            <div class="javdb-toggle ${config[item.key] ? 'active' : ''} ${disabled ? 'disabled' : ''}" data-key="${item.key}"></div>
                        </div>
                        <div class="javdb-setting-desc">${item.desc}</div>
                        ${item.key === 'linkRewrite' ? `
                        <div class="javdb-domain-sub" id="javdb-domain-rewrite-block"${config.linkRewrite ? '' : ' style="display: none;"'}>
                            <div class="javdb-setting-desc" style="margin-top: 0;">当前获取到的域名（自动从网站顶部域名栏 nav.sub-header 获取）</div>
                            <div id="javdb-detected-domain" class="javdb-detected-domain">${detectedDomainText}</div>
                            <div class="javdb-setting-desc" style="margin-top: 10px;">自定义域名（优先级高于自动获取的域名，留空则使用自动获取）</div>
                            <input type="text" id="javdb-custom-domain" class="javdb-domain-input" placeholder="如 javdb581.com，留空使用自动获取的域名" value="${customDomainValue}">
                        </div>` : ''}
                    </div>`;
                }).join('')}
            </div>
            ${showVideoQualitySection ? `
            <div class="javdb-settings-section">
                <h3>🎬 预览视频设置</h3>
                <div class="javdb-setting-item" style="margin-bottom: 0;">
                    <div class="javdb-setting-head">
                        <span class="javdb-setting-label">默认画质偏好</span>
                    </div>
                    <div class="javdb-setting-desc">解析 DMM/FANZA 预告片源时优先选择的画质，不可用时自动降级到次高可用画质</div>
                    <select id="javdb-video-quality" class="javdb-input" style="width: 100%; margin-top: 6px;">
                        ${videoQualityOptionsHtml}
                    </select>
                </div>
            </div>` : ''}
            <div class="javdb-settings-section">
                <h3>💾 数据备份与恢复</h3>
                <p>包含：功能开关设置、已下载标记列表（含链接/系列）</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <button class="javdb-btn" id="javdb-export-btn">📥 导出本地备份</button>
                    <button class="javdb-btn" id="javdb-import-btn">📤 导入本地备份</button>
                    <input type="file" id="javdb-import-file" accept=".json" style="display: none;">
                </div>
                
                <h4>☁️ WebDAV 云备份</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <input type="text" class="javdb-input" id="webdav-url" placeholder="WebDAV 地址 (如 https://dav.jianguoyun.com/dav/)">
                    <div style="display: flex; gap: 8px;">
                        <input type="text" class="javdb-input" id="webdav-user" placeholder="用户名">
                        <input type="password" class="javdb-input" id="webdav-pass" placeholder="密码">
                    </div>
                    <input type="text" class="javdb-input" id="webdav-dir" placeholder="备份目录 (默认 JavDB 增强助手-数据备份，可留空)">
                    <div style="display: flex; gap: 10px;">
                        <button class="javdb-btn javdb-btn-primary" id="webdav-upload-btn">上传到 WebDAV</button>
                        <button class="javdb-btn" id="webdav-manage-btn">查看云记录</button>
                        <button class="javdb-btn" id="webdav-save-cfg-btn">保存配置</button>
                    </div>
                    <p style="font-size: 11px; color: #999; margin-top: 5px;">* 若 WebDAV 请求失败，请检查网络、账号密码，或确认脚本头部已添加 @connect 您的 WebDAV 域名。</p>
                </div>
            </div>
            <div class="javdb-settings-footer">    
                <button class="javdb-btn" id="javdb-reset-btn">恢复默认</button>    
                <button class="javdb-btn javdb-btn-primary" id="javdb-save-btn">保存并刷新</button>    
            </div>    
        `;    
  
        document.body.appendChild(overlay);    
        document.body.appendChild(panel);    
  
        // 事件绑定    
        overlay.onclick = () => {    
            panel.classList.remove('active');    
            overlay.classList.remove('active');    
        };    
  
        panel.querySelector('.javdb-settings-close').onclick = () => {    
            panel.classList.remove('active');    
            overlay.classList.remove('active');    
        };    
  
        // 更新重试按钮的禁用视觉状态（不改变实际配置值）
        function updateRetryButtonDisabledState(panelEl) {
            const retryToggle = panelEl.querySelector('.javdb-toggle[data-key="retryButton"]');
            const retryRow = panelEl.querySelector('.javdb-setting-item[data-setting-key="retryButton"]');
            if (!retryToggle || !retryRow) return;
            if (!config.translation) {
                retryToggle.classList.add('disabled');
                retryRow.classList.add('is-disabled');
            } else {
                retryToggle.classList.remove('disabled');
                retryRow.classList.remove('is-disabled');
            }
        }

        panel.querySelectorAll('.javdb-toggle').forEach(toggle => {
            toggle.onclick = function() {
                const key = this.getAttribute('data-key');
                // 禁用状态下不允许点击
                if (this.classList.contains('disabled')) return;
                this.classList.toggle('active');
                config[key] = this.classList.contains('active');
                // 切换翻译开关时联动更新重试按钮视觉状态
                if (key === 'translation') {
                    updateRetryButtonDisabledState(panel);
                }
                // 切换链接域名重写开关时联动显隐其域名配置子区块
                if (key === 'linkRewrite') {
                    const domainBlock = panel.querySelector('#javdb-domain-rewrite-block');
                    if (domainBlock) domainBlock.style.display = config.linkRewrite ? '' : 'none';
                }
            };
        });

        // 初始化时执行一次联动状态更新
        updateRetryButtonDisabledState(panel);
  
        panel.querySelector('#javdb-reset-btn').onclick = () => {    
            if (confirm('确定要恢复默认设置吗？')) {    
                config = Object.assign({}, DEFAULT_CONFIG);    
                saveConfig();    
                location.reload();    
            }    
        };    
  
        panel.querySelector('#javdb-save-btn').onclick = () => {
            // 读取预览视频默认画质偏好（区块渲染时该下拉框一定存在，做 null 防御）
            const vqSel = panel.querySelector('#javdb-video-quality');
            if (vqSel && vqSel.value) config.videoQuality = vqSel.value;
            // 读取自定义重写域名（优先级高于域名栏自动获取；留空则使用自动获取）
            const domainInput = panel.querySelector('#javdb-custom-domain');
            if (domainInput) {
                const rawDomain = domainInput.value.trim();
                const normalizedDomain = normalizeDomainInput(rawDomain);
                if (rawDomain && !normalizedDomain && config.linkRewrite) {
                    alert('自定义域名格式不正确，请填写形如 javdb581.com 的域名（无需 http:// 前缀或路径）');
                    return;
                }
                config.customRewriteDomain = normalizedDomain;
            }
            saveConfig();    
            alert('设置已保存！页面将刷新以应用新设置。');    
            location.reload();    
        };
        
        // --- 备份功能事件绑定（防 null 安全版） ---
        const getVal = (id, def = '') => {
            const el = panel.querySelector(id);
            return el ? el.value : def;
        };
        const setVal = (id, v) => {
            const el = panel.querySelector(id);
            if (el) el.value = v;
        };

        panel.querySelector('#javdb-export-btn').onclick = exportBackup;
        panel.querySelector('#javdb-import-btn').onclick = () => panel.querySelector('#javdb-import-file').click();
        panel.querySelector('#javdb-import-file').onchange = (e) => {
            if (e.target.files.length > 0) importBackup(e.target.files[0]);
        };

        // 回显已保存的 WebDAV 配置
        const wdCfg = loadWebDavConfig();
        setVal('#webdav-url', wdCfg.url || '');
        setVal('#webdav-user', wdCfg.user || '');
        setVal('#webdav-pass', wdCfg.pass || '');
        setVal('#webdav-dir', wdCfg.dir || ''); // 输入框保持留空，默认名仅作内部兜底

        panel.querySelector('#webdav-save-cfg-btn').onclick = () => {
            saveWebDavConfig({
                url: getVal('#webdav-url'),
                user: getVal('#webdav-user'),
                pass: getVal('#webdav-pass'),
                dir: getVal('#webdav-dir')
            });
            alert('WebDAV 配置已保存');
        };

        panel.querySelector('#webdav-upload-btn').onclick = async () => {
            const url = getVal('#webdav-url');
            const user = getVal('#webdav-user');
            const pass = getVal('#webdav-pass');
            const dir = getVal('#webdav-dir') || 'JavDB 增强助手-数据备份';
            const file = getBackupFileName(); // 强制自动生成带时间的文件名，不再支持自定义
            if (!url || !user || !pass) return alert('请填写完整的 WebDAV 信息');

            const btn = panel.querySelector('#webdav-upload-btn');
            btn.disabled = true; btn.textContent = '上传中...';
            try {
                await uploadToWebDav(url, dir, file, getBackupData(), user, pass);
                alert('上传成功！');
                refreshWebDavManagerList(); // 云记录窗口开着时实时刷新列表
            } catch (e) {
                alert('上传失败: ' + e.message);
            } finally {
                btn.disabled = false; btn.textContent = '上传到 WebDAV';
            }
        };

        panel.querySelector('#webdav-manage-btn').onclick = async () => {
            const url = getVal('#webdav-url');
            const user = getVal('#webdav-user');
            const pass = getVal('#webdav-pass');
            const dir = getVal('#webdav-dir') || 'JavDB 增强助手-数据备份';
            if (!url || !user || !pass) return alert('请先填写并保存完整的 WebDAV 信息');
            
            // 打开云备份管理弹窗
            showWebDavManager(url, user, pass, dir);
        };
  
        return { panel, overlay };    
    }  

    // 云备份管理器状态（记录当前连接信息，供实时刷新使用）
    let wdManagerState = null;

    // 云备份管理弹窗逻辑
    async function showWebDavManager(url, user, pass, dir) {
        wdManagerState = { url, user, pass, dir };

        let overlay = document.getElementById('wd-manager-overlay');
        let panel = document.getElementById('wd-manager-panel');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'wd-manager-overlay';
            overlay.className = 'javdb-settings-overlay active';
            
            panel = document.createElement('div');
            panel.id = 'wd-manager-panel';
            panel.className = 'javdb-wd-manager-panel active';
            
            document.body.appendChild(overlay);
            document.body.appendChild(panel);
            
            overlay.onclick = () => {
                overlay.classList.remove('active');
                panel.classList.remove('active');
            };
        } else {
            overlay.classList.add('active');
            panel.classList.add('active');
        }
        
        panel.innerHTML = `
            <div class="javdb-settings-header">
                <h2>☁️ 云备份记录 (${dir})</h2>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="javdb-btn wd-refresh-btn" title="刷新列表" style="padding: 2px 10px;">🔄</button>
                    <button class="javdb-settings-close wd-close">×</button>
                </div>
            </div>
            <div class="javdb-settings-body wd-list-container" style="flex: 1; overflow-y: auto;">
                <div class="wd-loading">正在检查目录并加载文件列表...</div>
                <ul class="watched-list wd-file-list"></ul>
                <div class="wd-empty" style="display:none;">该目录下暂无备份文件</div>
            </div>
        `;
        
        panel.querySelector('.wd-close').onclick = () => {
            overlay.classList.remove('active');
            panel.classList.remove('active');
        };
        panel.querySelector('.wd-refresh-btn').onclick = () => refreshWebDavManagerList();
        
        await refreshWebDavManagerList();
    }

    // 刷新云备份列表（上传成功后自动调用；窗口未打开时自动跳过）
    async function refreshWebDavManagerList() {
        const panel = document.getElementById('wd-manager-panel');
        // 仅当窗口存在且处于打开状态时才刷新
        if (!panel || !wdManagerState || !panel.classList.contains('active')) return;
        
        const { url, user, pass, dir } = wdManagerState;
        const listEl = panel.querySelector('.wd-file-list');
        const loadingEl = panel.querySelector('.wd-loading');
        const emptyEl = panel.querySelector('.wd-empty');
        if (!listEl || !loadingEl || !emptyEl) return;
        
        // 重置 UI 状态
        listEl.innerHTML = '';
        emptyEl.style.display = 'none';
        loadingEl.style.display = 'block';
        loadingEl.textContent = '正在加载文件列表...';
        loadingEl.style.color = '';
        
        try {
            await ensureWebDavDir(url, dir, user, pass);
            const files = await listWebDavFiles(url, dir, user, pass);
            loadingEl.style.display = 'none';
            
            if (files.length === 0) {
                emptyEl.style.display = 'block';
                return;
            }
            
            files.forEach(file => {
                const li = document.createElement('li');
                li.className = 'watched-item';
                li.innerHTML = `
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <div style="flex: 1; min-width: 0;">
                            <div class="watched-code" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${file.name}">${file.name}</div>
                            <div class="watched-info-row" style="margin-top: 4px;">
                                <span>📅 ${file.timeStr}</span>
                                <span>📦 ${(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                        </div>
                        <div class="watched-actions">
                            <button class="javdb-btn javdb-btn-primary wd-restore-btn">恢复</button>
                            <button class="javdb-btn wd-delete-btn" style="color: #f14668; border-color: #f14668;">删除</button>
                        </div>
                    </div>
                `;
                
                li.querySelector('.wd-restore-btn').onclick = async () => {
                    if (!confirm(`确定要从云端恢复 "${file.name}" 吗？当前配置将被覆盖。`)) return;
                    const btn = li.querySelector('.wd-restore-btn');
                    btn.disabled = true; btn.textContent = '恢复中...';
                    try {
                        const text = await downloadFromWebDav(url, dir, file.name, user, pass);
                        applyBackupData(JSON.parse(text));
                        alert('恢复成功！页面将刷新。');
                        location.reload();
                    } catch (e) {
                        alert('恢复失败: ' + e.message);
                        btn.disabled = false; btn.textContent = '恢复';
                    }
                };
                
                li.querySelector('.wd-delete-btn').onclick = async () => {
                    if (!confirm(`确定要从云端永久删除 "${file.name}" 吗？此操作不可逆！`)) return;
                    const btn = li.querySelector('.wd-delete-btn');
                    btn.disabled = true; btn.textContent = '删除中...';
                    try {
                        await deleteWebDavFile(url, dir, file.name, user, pass);
                        li.remove();
                        if (listEl.children.length === 0) emptyEl.style.display = 'block';
                    } catch (e) {
                        alert('删除失败: ' + e.message);
                        btn.disabled = false; btn.textContent = '删除';
                    }
                };
                
                listEl.appendChild(li);
            });
        } catch (e) {
            loadingEl.textContent = '加载失败: ' + e.message;
            loadingEl.style.color = '#f14668';
        }
    }

    // 创建设置触发按钮
    function createSettingsTrigger(panel, overlay) {
        const trigger = document.createElement('button');
        trigger.className = 'javdb-settings-trigger';
        trigger.textContent = '⚙️ 设置';
        trigger.onclick = () => {
            panel.classList.add('active');
            overlay.classList.add('active');
        };
        document.body.appendChild(trigger);
    }  
  
    // ==================== 功能实现 ====================  
    
    // ==================== 🚀 弹窗方式打开页面 ====================
 // iframe) 方案，
    // 此处不引入 layui-layer，改为自建 modal + iframe 实现同等效果。
    let jhsDialogStack = [];   // 记录已打开的弹窗层级，支持多层/Esc关闭最上层

    function injectDialogStyles() {
        if (document.getElementById('jhs-dialog-style')) return;
        const style = document.createElement('style');
        style.id = 'jhs-dialog-style';
        style.textContent = `
            .jhs-dialog-shade {
                position: fixed; inset: 0; z-index: 2147483540;
                background: rgba(0, 0, 0, 0.6);
                opacity: 0; transition: opacity 0.2s ease;
            }
            .jhs-dialog-box {
                position: fixed; z-index: 2147483541;
                left: 50%; top: 50%; transform: translate(-50%, -50%);
                width: 85vw; height: 90vh; max-width: 1600px;
                background: #fff; border-radius: 8px; overflow: hidden;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.45);
                display: flex; flex-direction: column;
                opacity: 0; transition: opacity 0.2s ease;
            }
            .jhs-dialog-shade.active, .jhs-dialog-box.active { opacity: 1; }
            .jhs-dialog-header {
                flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
                padding: 10px 16px; background: #f5f6f8; border-bottom: 1px solid #e3e5e8;
                font-size: 15px; font-weight: 600; color: #333; user-select: none;
            }
            .jhs-dialog-title {
                flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .jhs-dialog-close {
                flex: 0 0 auto; margin-left: 12px; width: 28px; height: 28px; line-height: 24px;
                border: 1px solid #ccc; border-radius: 4px; background: #fff; color: #666;
                font-size: 18px; cursor: pointer; text-align: center;
            }
            .jhs-dialog-close:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }
            .jhs-dialog-frame { flex: 1 1 auto; width: 100%; border: 0; background: #fff; }
        `;
        document.head.appendChild(style);
    }

    // 封面快捷按钮样式：独立注入并置于 <head> 最末尾。
    // 此前这些规则与弹窗样式合并在同一个 style 里，且只在第一次点击封面弹窗时才注入——
    // 刷新后从未调用 injectDialogStyles()，导致暗色主题下 svg path 覆盖规则缺失，
    // 按钮颜色停留在浏览器默认解析的内联 fill（即浅色主题配色）。
    function injectCoverButtonStyles() {
        if (document.getElementById('jhs-cover-btn-style')) return;
        const style = document.createElement('style');
        style.id = 'jhs-cover-btn-style';
        style.textContent = `
            /* 封面快捷按钮：样式对齐 JAV-JHS CoverButtonPlugin（.tool-box span 默认 opacity .3，悬停 1） */
            .box .tags { justify-content: space-between; }
            .jhs-tool-box { flex: 0 0 auto !important; justify-content: flex-end; align-items: center; }
            .jhs-tool-box span{ opacity:.3 }
            .jhs-tool-box span:hover{ opacity:1 }
            .jhs-tool-box .jhs-icon { width: 1.5rem; height: 1.5rem; }
            /* 注意：两条 svg path 规则的特异性必须一致（均为 [data-theme] + 4 类/元素），
               若暗色规则写成 html[data-theme] 而亮色写 [data-theme]，亮色特异性更高会反胜——
               这正是此前"暗色主题下按钮仍是浅色配色"的根因之一 */
            [data-theme="dark"] .jhs-tool-box svg path { fill: white; }
            .jhs-tool-box svg path { fill: blue; }
        `;
        document.head.appendChild(style);
    }

    function closeJhsDialog(index) {
        const entry = jhsDialogStack.find(d => d.index === index);
        if (!entry) return;
        jhsDialogStack = jhsDialogStack.filter(d => d !== entry);
        entry.box.classList.remove('active');
        entry.shade.classList.remove('active');
        setTimeout(() => {
            entry.box.remove();
            entry.shade.remove();
            // 最后一层关闭后恢复 body 滚动
            if (jhsDialogStack.length === 0) {
                document.body.style.overflow = entry.prevOverflow || '';
            }
        }, 200);
    }

 // 打开弹窗页面
    function openPageDialog(url, title, event) {
        if (!url) return;
        // Ctrl/⌘+点击 → 新标签页打开（与原脚本行为一致）
        if (event && (event.ctrlKey || event.metaKey)) {
            window.open(url.includes('http') ? url : window.location.origin + url, '_blank');
            return;
        }
        injectDialogStyles();
 // 演员页不加 hideNav，普通详情页追加 hideNav=1 隐藏导航
        let finalUrl = url;
        if (!/\/actors\/|\/stars?\//.test(url)) {
            finalUrl = url.includes('?') ? `${url}&hideNav=1` : `${url}?hideNav=1`;
        }
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const shade = document.createElement('div');
        shade.className = 'jhs-dialog-shade';
        const box = document.createElement('div');
        box.className = 'jhs-dialog-box';
        const index = Date.now() + Math.floor(Math.random() * 1000);
        box.innerHTML = `
            <div class="jhs-dialog-header">
                <span class="jhs-dialog-title"></span>
                <button class="jhs-dialog-close" title="关闭 (Esc)">×</button>
            </div>
            <iframe class="jhs-dialog-frame" src="${finalUrl}" allow="autoplay; fullscreen"></iframe>
        `;
        box.querySelector('.jhs-dialog-title').textContent = title || finalUrl;
        box.querySelector('.jhs-dialog-close').onclick = () => closeJhsDialog(index);
        shade.onclick = () => closeJhsDialog(index); // shadeClose 默认开启

        document.body.appendChild(shade);
        document.body.appendChild(box);
        requestAnimationFrame(() => {
            shade.classList.add('active');
            box.classList.add('active');
        });
        jhsDialogStack.push({ index, box, shade, prevOverflow });

        // Esc 关闭最上层弹窗
        if (!openPageDialog._escBound) {
            openPageDialog._escBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape' && e.keyCode !== 27) return;
                if (jhsDialogStack.length === 0) return;
                const top = jhsDialogStack[jhsDialogStack.length - 1];
                closeJhsDialog(top.index);
            });
        }
    }

 // 列表页拦截「封面图片」点击 → 弹窗打开（bindClick：仅 .item img 触发弹窗，
    // 点击标题/日期/标签等其他位置不做任何拦截，保持网站原生跳转行为）
    function setupDialogOpenDetail() {
        if (!config.dialogOpenDetail) return;
        if (setupDialogOpenDetail._bound) return;
        setupDialogOpenDetail._bound = true;
        document.addEventListener('click', (e) => {
            // 只拦截对 <img> 本身的点击；非图片（标题、meta、空白区域等）一律放行
            const img = e.target && e.target.closest ? e.target.closest('img') : null;
            if (!img) return;
            const item = img.closest('.movie-list .item');
            if (!item) return;
 // 标记按钮、磁力按钮等自定义控件不拦截
            if (e.target.closest('.dl-mark-btn, .meta-buttons, [data-jhs-skip-dialog]')) return;
            const link = item.querySelector('a.box, a[href*="/v/"]');
            if (!link) return;
            const href = link.getAttribute('href') || '';
            if (!/^\/v\//.test(href) && !href.includes('/javdb.com/v/')) return; // 只拦截详情页
            e.preventDefault();
            e.stopPropagation();
            const codeEl = item.querySelector('.video-title strong') || item.querySelector('.title');
            const code = codeEl ? codeEl.textContent.trim() : '';
            openPageDialog(link.href, code, e);
        }, true);
    }

    // ==================== 🚀 悬浮大图 ====================
 // 通用选择器：.cover img（覆盖影片列表与资讯卡片）
    // 覆盖影片列表封面(.movie-list .item .cover img)与资讯页文章卡片封面(a.article-item.box .cover img)等
    class ImageHoverPreview {
        constructor(options = {}) {
            this.config = Object.assign({
 // coverImgSelector：".cover img"，天然覆盖影片列表(.movie-list .item .cover img)
                // 与资讯页文章卡片(a.article-item.box .cover img)等所有带 .cover 的封面图
                selector: '.cover img',
                dataAttribute: 'data-full',
                // 尺寸上限不再固定 1000px（资讯大图常超出屏幕），而是动态取视口的 90%
                maxWidth: Math.floor(window.innerWidth * 0.9),
                maxHeight: Math.floor(window.innerHeight * 0.9),
                offsetX: 20,
                offsetY: 20,
                zIndex: 2147483530,
                transition: 0.2,
                autoAdjustPosition: true
            }, options);
            this.preview = null;
            this.currentTarget = null;
            this.timer = null;
            this.imgElement = null;
            this.boundElements = new WeakSet();
            this._onEnter = (e) => this.handleMouseEnter(e);
            this._onLeave = (e) => this.handleMouseLeave(e);
            this._onMove = (e) => this.handleMouseMove(e);
            this.init();
        }
        init() {
            this.injectStyles();
            this.createPreviewElement();
            this.bindEvents();
        }
        injectStyles() {
            if (document.getElementById('jhs-hover-preview-style')) return;
            const style = document.createElement('style');
            style.id = 'jhs-hover-preview-style';
            style.textContent = `
                .image-hover-preview {
                    position: fixed; display: none;
                    z-index: ${this.config.zIndex};
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    overflow: hidden; pointer-events: none;
                    opacity: 0; transition: opacity ${this.config.transition}s ease;
                    background-color: #fff;
                }
                .image-hover-preview.active { opacity: 1; }
                .image-hover-preview img {
                    display: block; object-fit: contain;
                }
                .image-hover-preview.loading::before {
                    content: '加载中...';
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    color: #666; font-size: 14px;
                }
            `;
            document.head.appendChild(style);
        }
        createPreviewElement() {
            this.preview = document.createElement('div');
            this.preview.className = 'image-hover-preview';
            document.body.appendChild(this.preview);
        }
        bindEvents() {
            // 使用事件委托绑定在 document 上：油猴脚本 @run-at document-idle 执行时列表早已渲染完毕，
            // 之后翻页/瀑布流动态追加的新封面也能直接生效（不再依赖逐个元素绑定 + MutationObserver 重扫）
            if (this._delegated) return;
            this._delegated = true;
            document.addEventListener('mouseover', (e) => {
                const el = e.target && e.target.closest ? e.target.closest(this.config.selector) : null;
                if (!el || el === this.currentTarget) return;
                this.handleMouseEnter({ currentTarget: el, clientX: e.clientX, clientY: e.clientY });
            }, true);
            document.addEventListener('mousemove', (e) => {
                const el = e.target && e.target.closest ? e.target.closest(this.config.selector) : null;
                if (!el || el !== this.currentTarget) return;
                this.handleMouseMove({ clientX: e.clientX, clientY: e.clientY });
            }, true);
            document.addEventListener('mouseout', (e) => {
                const el = e.target && e.target.closest ? e.target.closest(this.config.selector) : null;
                if (!el || el !== this.currentTarget) return;
                // 仍在同一封面内部移动（如从 img 移到其子层）不隐藏
                const to = e.relatedTarget;
                if (to && to.closest && to.closest(this.config.selector) === el) return;
                this.handleMouseLeave();
            }, true);
        }
 // 计算高清大图地址
        getBigImageUrl(imgEl) {
            let imgUrl = imgEl.getAttribute(this.config.dataAttribute) || '';
            if (!imgUrl) {
                const src = imgEl.currentSrc || imgEl.src || imgEl.getAttribute('src') || '';
                if (!src || /nopic|placeholder/i.test(src)) return '';
 // JavDB 通用规则：URL 中的 thumbs 路径替换为 covers
                // 影片封面: .../thumbs/g/001/abc_s.jpg → .../covers/g/001/abc.jpg
                // 资讯图片: .../articles/images/... 本身即原图，直接使用 src
                if (/thumbs/.test(src)) {
                    imgUrl = src.replace('thumbs', 'covers').replace(/_s\.([a-z]+)(\?.*)?$/i, '.$1$2');
                } else {
                    imgUrl = src;
                }
            }
            return imgUrl === imgEl.src ? imgUrl : (imgUrl || imgEl.src);
        }
        handleMouseEnter(e) {
            clearTimeout(this.timer);
            this.currentTarget = e.currentTarget;
            const imgUrl = this.getBigImageUrl(this.currentTarget);
            if (!imgUrl) return;
            this.preview.innerHTML = '';
            this.preview.classList.add('loading');
            this.preview.style.display = 'block';
            this.preview.classList.remove('active');
            const img = new Image();
            img.onload = () => {
                if (this.currentTarget !== e.currentTarget) return; // 鼠标已移开
                this.preview.classList.remove('loading');
                this.preview.innerHTML = `<img src="${imgUrl}" alt="预览图">`;
                this.imgElement = this.preview.querySelector('img');
                const { width, height } = this.calculateImageSize(img);
                this.preview.style.width = `${width}px`;
                this.preview.style.height = `${height}px`;
                void this.preview.offsetHeight;
                this.preview.classList.add('active');
                this.handleMouseMove(e);
            };
            img.onerror = () => {
                this.preview.classList.remove('loading');
                this.preview.innerHTML = '<div style="padding:10px;color:#f00;">图片加载失败</div>';
            };
            img.src = imgUrl;
        }
        calculateImageSize(img) {
            // 每次计算时动态取当前视口尺寸（窗口缩放后也能适应），最大不超过视口的 90%
            const maxW = Math.floor(window.innerWidth * 0.9);
            const maxH = Math.floor(window.innerHeight * 0.9);
            let width = img.naturalWidth, height = img.naturalHeight;
            if (width > maxW || height > maxH) {
                const ratio = Math.min(maxW / width, maxH / height);
                width *= ratio;
                height *= ratio;
            }
            // 兜底：即使比例计算有误差，也绝不允许超过视口可用范围
            width = Math.min(width, maxW);
            height = Math.min(height, maxH);
            return { width: Math.round(width), height: Math.round(height) };
        }
        handleMouseMove(e) {
            if (!this.currentTarget || !this.preview.classList.contains('active')) return;
            const { offsetX, offsetY } = this.config;
            let left = e.clientX + offsetX, top = e.clientY + offsetY;
            if (this.config.autoAdjustPosition) {
                const pw = this.preview.offsetWidth, ph = this.preview.offsetHeight;
                const vw = window.innerWidth, vh = window.innerHeight;
                // 先尝试常规位置（鼠标右下），越界则翻转到左上
                if (left + pw > vw) left = e.clientX - pw - offsetX;
                if (top + ph > vh) top = e.clientY - ph - offsetY;
                // 翻转后仍越界（如图几乎占满视口）：直接夹紧到视口内，保证完整可见不超出屏幕
                left = Math.max(0, Math.min(left, vw - pw));
                top = Math.max(0, Math.min(top, vh - ph));
            }
            this.preview.style.left = `${left}px`;
            this.preview.style.top = `${top}px`;
        }
        handleMouseLeave() {
            this.preview.classList.remove('active');
            this.preview.style.display = 'none';
            this.currentTarget = null;
            this.imgElement = null;
        }
        destroy() {
            this.preview && this.preview.parentNode && this.preview.parentNode.removeChild(this.preview);
        }
    }

    let imageHoverPreviewObj = null;
    function initHoverBigImg() {
        if (!config.hoverBigImg) return;
        if (imageHoverPreviewObj) {
            imageHoverPreviewObj.bindEvents(); // 事件委托模式，幂等，仅确保已绑定
        } else {
            imageHoverPreviewObj = new ImageHoverPreview();
        }
    }

    // ==================== 🚀 长缩略图 / 更高画质预览视频 / 封面快捷按钮 ====================

 // 画质选项表
    const QUALITY_OPTIONS = [
        { id: 'video-sm_s',  quality: 'sm_s',  text: '旧视频源-低画质 (240p)',          canSelect: false },
        { id: 'video-dm_s',  quality: 'dm_s',  text: '旧视频源-中画质 (360p)',          canSelect: false },
        { id: 'video-dmb_s', quality: 'dmb_s', text: '旧视频源-中画质 (480p)',          canSelect: false },
        { id: 'video-mmb',   quality: 'mmb',   text: '中画质 (432p)',                   canSelect: true  },
        { id: 'video-mhb',   quality: 'mhb',   text: '高画质 (576p)',                   canSelect: true  },
        { id: 'video-hmb',   quality: 'hmb',   text: 'HD (720p)',                       canSelect: true  },
        { id: 'video-hhb',   quality: 'hhb',   text: 'FullHD (1080p)',                  canSelect: true  },
        { id: 'video-hhbs',  quality: 'hhbs',  text: 'FullHD (1080p60fps)',             canSelect: true  },
        { id: 'video-4k',    quality: '4k',    text: '4K (2160p)',                      canSelect: true  },
        { id: 'video-4ks',   quality: '4ks',   text: '4K (2160p60fps)',                 canSelect: true  }
    ];

 // 默认画质不可用时按优先级降级
    function selectDefaultQuality(dmmVideoQualityList, intendedDefault) {
        if (!dmmVideoQualityList || dmmVideoQualityList.length === 0) return null;
        const availableSet = new Set(dmmVideoQualityList);
        if (availableSet.has(intendedDefault)) return intendedDefault;
        const priorityOrder = QUALITY_OPTIONS.map(o => o.quality).reverse();
        for (const quality of priorityOrder) {
            if (availableSet.has(quality)) return quality;
        }
        return dmmVideoQualityList[0];
    }

     // 直接搬运 JAV-JHS gmHttp.gmRequest + utils.retry：默认超时 5s、重试 3 次、瞬时失败立即重试（无退避等待）。
    // 此前自研的"15s 超时+重试1次+800ms 退避"版本在 DMM API 偶发失败时整链路耗时成倍放大，是详情页预览视频加载卡顿的根因之一。
    async function jhsRetry(fun, tryCount = 3) {
        let runCount = 0;
        while (runCount < tryCount) {
            try {
                const result = await fun();
                return result;
            } catch (e) {
                let errorString = (e && e.message) || String(e);
                if (errorString.startsWith('Error: ')) errorString = errorString.replace('Error: ', '');
                if (errorString.includes('Just a moment') || errorString.includes('重定向') ||
                    errorString.toLowerCase().includes('404 page not found') ||
                    errorString.toLowerCase().includes('已過期') ||
                    errorString.toLowerCase().includes('404 not found')) throw e;
                runCount++;
                if (runCount === tryCount) throw e;
            }
        }
    }

    async function gmHttpGet(url, headers = {}) {
        return await jhsRetry(() => new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: headers,
                timeout: 5000,
                onload: response => {
                    try {
                        if (response.status >= 200 && response.status < 300) {
                            if (response.responseText) {
                                try { resolve(JSON.parse(response.responseText)); }
                                catch (e) { resolve(response.responseText); }
                            } else resolve(response.responseText || response);
                        } else {
                            reject(new Error('请求发生错误 ' + response.status));
                        }
                    } catch (e) { reject(e); }
                },
                onerror: error => reject(new Error((error && error.error) || '网络错误')),
                ontimeout: () => reject(new Error('请求超时: ' + url))
            });
        }), 3);
    }

 // 简易提示条
    function jhsToast(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:2147483646;' +
            'background:rgba(220,50,50,0.92);color:#fff;padding:8px 18px;border-radius:6px;font-size:14px;';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

 // 全屏图片查看器（长缩略图）：鼠标始终为抓手，可按住自由拖动图片查看
    function showImageViewer(imgUrlOrEl) {
        const imgUrl = typeof imgUrlOrEl === 'string'
            ? imgUrlOrEl
            : (imgUrlOrEl && (imgUrlOrEl.currentSrc || imgUrlOrEl.src || imgUrlOrEl.getAttribute('src')));
        if (!imgUrl) return;
        const old = document.getElementById('jhs-lightbox');
        if (old) old.remove();
        const box = document.createElement('div');
        box.id = 'jhs-lightbox';
        box.innerHTML = `
            <div class="jhs-lightbox-toolbar">
                <button data-act="zoom-in" title="放大">＋</button>
                <button data-act="zoom-out" title="缩小">－</button>
                <button data-act="reset" title="重置">↺</button>
                <button data-act="close" title="关闭 (Esc)">×</button>
            </div>
            <div class="jhs-lightbox-stage"><img src="${imgUrl}" alt="长缩略图" draggable="false"></div>
        `;
        document.head.insertAdjacentHTML('beforeend', `<style>
            /* 抓手光标覆盖整个查看器区域（背景/舞台/图片），鼠标任何位置都显示抓手 */
            #jhs-lightbox, #jhs-lightbox .jhs-lightbox-stage, #jhs-lightbox .jhs-lightbox-stage img { cursor: grab; }
            #jhs-lightbox.jhs-dragging, #jhs-lightbox.jhs-dragging * { cursor: grabbing !important; user-select: none; }
            #jhs-lightbox { position: fixed; inset: 0; z-index: 2147483645; background: rgba(0,0,0,0.92); overflow: auto; }
            #jhs-lightbox .jhs-lightbox-stage { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
            #jhs-lightbox .jhs-lightbox-stage img { max-width: none; width: auto; height: auto; -webkit-user-drag: none; }
            #jhs-lightbox .jhs-lightbox-toolbar { position: fixed; top: 10px; right: 16px; z-index: 1; display: flex; gap: 8px; }
            #jhs-lightbox .jhs-lightbox-toolbar button { width: 34px; height: 34px; border: 1px solid #666; border-radius: 6px;
                background: rgba(40,40,40,0.85); color: #eee; font-size: 17px; cursor: pointer; }
            #jhs-lightbox .jhs-lightbox-toolbar button:hover { background: #3273dc; border-color: #3273dc; }
        </style>`);
        document.body.appendChild(box);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const img = box.querySelector('img');
        let scale = 1;
        // 直接以宽高渲染（transform:scale 不改变布局盒，缩放后可滚动区域与视觉错位，会导致画面"整体偏上"）
        const setScale = (v) => {
            scale = Math.min(Math.max(v, 0.1), 8);
            img.style.width = Math.round((img.naturalWidth || window.innerWidth) * scale) + 'px';
            img.style.height = Math.round((img.naturalHeight || window.innerHeight) * scale) + 'px';
        };
        // 初始适配：按 90% 视口等比缩小；小图保持原始高清尺寸并由容器居中
        const fitImage = () => {
            const vw = window.innerWidth * 0.9, vh = window.innerHeight * 0.9;
            const w = img.naturalWidth || vw, h = img.naturalHeight || vh;
            setScale(Math.min(1, vw / w, vh / h));
        };
        img.onload = fitImage;
        if (img.complete && img.naturalWidth) fitImage();
        const close = () => {
            box.remove();
            document.body.style.overflow = prevOverflow || '';
            document.removeEventListener('keydown', onKey);
        };
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        box.querySelector('.jhs-lightbox-toolbar').addEventListener('click', (e) => {
            const act = e.target.getAttribute('data-act');
            if (!act) return;
            if (act === 'zoom-in')  setScale(scale * 1.25);
            if (act === 'zoom-out') setScale(scale / 1.25);
            if (act === 'reset')    fitImage();
            if (act === 'close')    close();
        });
        // 滚轮缩放：在查看器任意位置都生效（不再只绑定在 img 上）
        box.addEventListener('wheel', (e) => {
            e.preventDefault();
            setScale(scale * (e.deltaY < 0 ? 1.1 : 0.9));
        }, { passive: false });

        // 自由拖动查看：在整个查看器区域按下即可拖拽（图片/背景/舞台均可）。
        // 关键修复：改为对图片施加 translate 位移（而非依赖容器 scroll）——
        // 容器 scroll 会被内容边界钳制，无法把图拖出屏幕外；translate 无边界限制，
        // 可像 JAV-JHS 一样任意方向自由拖动、甚至完全拖出屏幕。
        let tx = 0, ty = 0;
        const applyTransform = () => { img.style.transform = `translate(${tx}px, ${ty}px)`; };
        let dragState = null;
        let dragged = false;
        box.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('.jhs-lightbox-toolbar')) return; // 工具条按钮不参与拖拽
            e.preventDefault();
            dragState = { x: e.clientX, y: e.clientY, ox: tx, oy: ty };
            dragged = false;
            box.classList.add('jhs-dragging');
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragState) return;
            const dx = e.clientX - dragState.x, dy = e.clientY - dragState.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
            tx = dragState.ox + dx;
            ty = dragState.oy + dy;
            applyTransform();
        });
        window.addEventListener('mouseup', () => {
            dragState = null;
            box.classList.remove('jhs-dragging');
        });
        // 点击空白背景关闭（拖拽后不关闭）
        box.addEventListener('click', (e) => {
            if (dragged) { dragged = false; return; }
            if (e.target === box || e.target.classList.contains('jhs-lightbox-stage')) close();
        });

        // 触屏：单指自由拖动（与鼠标一致，translate 位移，可拖出屏幕）
        let touchState = null;
        box.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            if (e.target.closest && e.target.closest('.jhs-lightbox-toolbar')) return;
            const t = e.touches[0];
            touchState = { x: t.clientX, y: t.clientY, ox: tx, oy: ty };
        }, { passive: true });
        box.addEventListener('touchmove', (e) => {
            if (!touchState || e.touches.length !== 1) return;
            const t = e.touches[0];
            tx = touchState.ox + (t.clientX - touchState.x);
            ty = touchState.oy + (t.clientY - touchState.y);
            applyTransform();
            e.preventDefault();
        }, { passive: false });
        box.addEventListener('touchend', () => { touchState = null; });
    }

 // ---------- 长缩略图 ----------
    const SCREENSHOT_CACHE_KEY = 'jhs_screenShot';

    async function getJavStoreScreenShot(carNum) {
        const q = carNum.toLowerCase().replace('fc2-', '');
        const searchUrl = `https://javstore.net/search?q=${q}`;
        const html = await gmHttpGet(searchUrl);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const tempCarNum = carNum.toLowerCase().replace(/fc2-(ppv-)?/g, '').replace(/-/g, '');
        let detailPageUrl = null;
        const itemList = doc.querySelectorAll('main .grid a');
        for (const a of itemList) {
            const href = a.getAttribute('href') || '';
            if (href.toLowerCase().replace(/fc2-(ppv-)?/g, '').replaceAll('-', '').includes(tempCarNum)) {
                detailPageUrl = new URL(href, 'https://javstore.net').href;
                break;
            }
        }
        if (!detailPageUrl) throw new Error('JavStore 查询番号失败: ' + carNum);
        const detailHtml = await gmHttpGet(detailPageUrl);
        const detailDoc = new DOMParser().parseFromString(detailHtml, 'text/html');
        let imgUrl = '';
        // 原逻辑：优先取 "CLICK HERE" 链接 href，其次取 _s.jpg 缩略图地址；再把 .th 还原为原图
        for (const a of detailDoc.querySelectorAll('a')) {
            if ((a.textContent || '').includes('CLICK HERE')) { imgUrl = a.getAttribute('href') || ''; break; }
        }
        if (!imgUrl) {
            const sImg = detailDoc.querySelector("img[src*='_s.jpg']");
            if (sImg) imgUrl = sImg.getAttribute('src') || '';
        }
        if (!imgUrl) throw new Error('JavStore 解析预览图失败: ' + carNum);
        return imgUrl.replace('.th', '');
    }

    async function getScreenshot(carNum) {
        carNum = (carNum || '').toUpperCase();
        let cacheData = {};
        try { cacheData = JSON.parse(localStorage.getItem(SCREENSHOT_CACHE_KEY) || '{}'); } catch (e) {}
        if (cacheData[carNum]) return cacheData[carNum];
        // 并发去重：同一番号多个入口（📏按钮/详情页块）同时请求时只发一轮 javstore 抓取
        getScreenshot._pending = getScreenshot._pending || {};
        if (getScreenshot._pending[carNum]) return getScreenshot._pending[carNum];
        const task = (async () => {
            const imgUrl = await getJavStoreScreenShot(carNum);
            if (!imgUrl) throw new Error('未获取到缩略图地址');
            const httpsIndex = imgUrl.indexOf('https://');
            const finalUrl = httpsIndex !== -1 ? imgUrl.substring(httpsIndex) : imgUrl;
            cacheData[carNum] = finalUrl;
            localStorage.setItem(SCREENSHOT_CACHE_KEY, JSON.stringify(cacheData));
            return finalUrl;
        })();
        getScreenshot._pending[carNum] = task;
        try { return await task; } finally { delete getScreenshot._pending[carNum]; }
    }

 // 详情页：在预览区(.preview-images)首位插入长缩略图块
    function renderScreenShotFallback(container, carNum) {
        container.classList.add('no-click'); // 失败态不可点击（避免打开空 lightbox），仅重试/前往链接可点
        container.innerHTML = `<div style="margin-top:50px;color:inherit;">获取缩略图失败</div><br/>
            <a href="#" class="retry-link">点击重试</a> 或 <a href="https://javstore.net/search?q=${carNum}" target="_blank" rel="noopener">前往确认</a>`;
        container.onclick = (e) => {
            if (e.target.classList.contains('retry-link')) {
                e.preventDefault();
                loadScreenShotInto(container, carNum);
            }
        };
    }

    function loadScreenShotInto(container, carNum) {
        container.classList.add('no-click'); // 加载中不可点击
        container.onclick = null;
        container.innerHTML = '<div style="margin-top:50px;color:inherit;cursor:auto">正在加载缩略图</div>';
        getScreenshot(carNum).then(imgUrl => {
            if (!imgUrl) { renderScreenShotFallback(container, carNum); return; }
            container.classList.remove('no-click'); // 成功后恢复抓手，可点击全屏查看
            container.innerHTML = `<img src="${imgUrl}" alt="缩略图" loading="lazy" style="width:100%;">`;
            container.title = '点击全屏查看长缩略图';
            container.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                showImageViewer(imgUrl);
            };
        }).catch(() => {
            renderScreenShotFallback(container, carNum);
        });
    }

    function loadScreenShotOnDetail() {
        if (!config.enableLoadScreenShot) return;
        if (!window.location.pathname.startsWith('/v/')) return;
        if (document.querySelector('.screen-container')) return; // 幂等
        const code = extractDetailCode();
        if (!code) return;
        const firstTile = document.querySelector('.preview-images .tile-item');
        const previewImages = document.querySelector('.preview-images');
        if (!previewImages) return;
        const container = document.createElement('a');
        container.className = 'tile-item screen-container';
        container.style.cssText = 'overflow:hidden;max-height:215px;text-align:center;cursor:pointer;display:block;';
        if (firstTile) previewImages.insertBefore(container, firstTile);
        else previewImages.appendChild(container);
        loadScreenShotInto(container, code);
    }

 // ---------- 更高画质预览视频 ----------
    const DMM_VIDEO_CACHE_KEY = 'jhs_dmm_video';

    async function dmmSearchContentIds(carNum) {
        const carNumNoHyphen = carNum.replace(/-/g, '');
        const keywordAttempts = [
            { keyword: carNum.replace('-', '00'), name: '00-替换关键词' },
            { keyword: carNum, name: '原始番号关键词' },
            { keyword: carNumNoHyphen, name: '无连字符关键词' }
        ];
        const carNumLower = carNum.toLowerCase();
        for (const attempt of keywordAttempts) {
            const keyword = attempt.keyword;
            const currentTempCarNumLower = keyword.toLowerCase();
            const apiUrl = 'https://api.dmm.com/affiliate/v3/ItemList?' + new URLSearchParams({
                api_id: 'UrwskPfkqQ0DuVry2gYL',
                affiliate_id: '10278-996',
                output: 'json',
                site: 'FANZA',
                sort: 'match',
                keyword: keyword
            }).toString();
            let response;
            try {
                // gmHttpGet 已对齐 JAV-JHS：JSON 响应自动解析为对象（JAV-JHS 里即 gmHttp.get 直接返回对象）
                response = await gmHttpGet(apiUrl);
            } catch (e) {
                continue; // API 请求失败，尝试下一个关键词
            }
            if (!response || !response.result || !response.result.result_count) continue;
            const newItems = [];
            for (const item of response.result.items) {
                if (newItems.length >= 2) break;
                const contentId = item.content_id || '', makerProduct = item.maker_product || '';
                if (contentId.includes(currentTempCarNumLower.replace('-', '')) ||
                    carNumLower === makerProduct.toLowerCase() ||
                    contentId.includes(carNumNoHyphen.toLowerCase())) {
                    newItems.push({
                        serviceCode: item.service_code,
                        floorCode: item.floor_code,
                        contentId: contentId,
                        pageUrl: item.URL
                    });
                }
            }
            if (newItems.length > 0) return newItems;
        }
        return null;
    }

    // 与 JAV-JHS _searchContentIds 一致：找到 Content ID 后顺带把"多结果"标记写入缓存，供封面按钮解析时参考
    function saveDmmSiteCache(carNum, items) {
        try {
            const dmmCacheKey = 'jhs_other_site_dmm';
            const dmmCacheData = localStorage.getItem(dmmCacheKey) ? JSON.parse(localStorage.getItem(dmmCacheKey)) : {};
            let url = `https://www.dmm.co.jp/search/=/searchstr=${carNum}`, type = 'single';
            if (items.length > 1) { type = 'multiple'; } else { url = items[0].pageUrl; }
            dmmCacheData[carNum.toUpperCase()] = { type: type, url: url };
            localStorage.setItem(dmmCacheKey, JSON.stringify(dmmCacheData));
        } catch (e) {}
    }

    async function dmmExtractTrailerLinks({ contentId, serviceCode, floorCode }) {
        const trailerPageUrl = `https://www.dmm.co.jp/service/digitalapi/-/html5_player/=/cid=${contentId}/mtype=AhRVShI_/service=${serviceCode}/floor=${floorCode}/mode=/`;
        const htmlContent = await gmHttpGet(trailerPageUrl, {
            'accept-language': 'ja-JP,ja;q=0.9',
            'Cookie': 'age_check_done=1'
        });
        if (typeof htmlContent !== 'string') throw new Error('解析播放页内容失败, 非文本内容');
        if (htmlContent.includes('このサービスはお住まいの地域からは')) throw new Error('节点不可用，请将DMM域名分流到日本ip');
        const match = htmlContent.match(/const\s+args\s+=\s+(.*);/);
        if (!match) throw new Error('未在脚本中找到 const args = ... 变量');
        let bitrates;
        try {
            ({ bitrates } = JSON.parse(match[1]));
        } catch (e) {
            throw new Error('解析播放器脚本 JSON 失败: ' + e.message);
        }
        if (!Array.isArray(bitrates)) throw new Error('解析画质链接失败: bitrates 字段不是一个数组或不存在');
        const qualityKeys = QUALITY_OPTIONS.map(o => o.quality).join('|');
        const qualityNameRegex = new RegExp(`(${qualityKeys})\\.mp4$`);
        const finalQualityMap = {};
        for (const item of bitrates) {
            const url = item && item.src;
            if (!url || typeof url !== 'string' || !url.endsWith('.mp4')) continue;
            const qualityMatch = url.match(qualityNameRegex);
            const qualityKey = qualityMatch && qualityMatch[1] ? qualityMatch[1] : '';
            if (qualityKey && !finalQualityMap[qualityKey]) finalQualityMap[qualityKey] = url;
        }
        if (Object.keys(finalQualityMap).length === 0) throw new Error('未找到匹配要求的预览画质视频');
        return finalQualityMap;
    }

    async function getDmmVideo(carNum) {
        if (!carNum) return null;
        carNum = carNum.toUpperCase();
        let cacheData = {};
        try { cacheData = JSON.parse(localStorage.getItem(DMM_VIDEO_CACHE_KEY) || '{}'); } catch (e) {}
        if (cacheData[carNum]) return cacheData[carNum];
        // 并发去重：同一番号多个入口（详情页增强/懒钩子/封面按钮）同时请求时只发一轮网络解析
        if (getDmmVideo._pending && getDmmVideo._pending[carNum]) return getDmmVideo._pending[carNum];
        const lower = carNum.toLowerCase();
 // 无码 / VR 类型不做 DMM 解析
        if (lower.startsWith('heyzo') || /^n\d+$/.test(lower) || /^\d+(-\d+)*$/.test(lower)) return null;
        if (carNum.includes('VR-')) return null;
        const task = (async () => {
            let contentItems;
            try {
                contentItems = await dmmSearchContentIds(carNum);
            } catch (e) {
                return null;
            }
            if (!contentItems || contentItems.length === 0) {
                // DMM Affiliate API 偶发瞬时失败返回空结果（JAV-JHS 靠 3 次快速重试消化这种抖动）。
                // 自研的整链二轮重试会把 3 组关键词 × 3 次请求全部跑满，首次进详情页要等很久——已删除。
                return null;
            }
            saveDmmSiteCache(carNum, contentItems);
            try {
                // 与 JAV-JHS fetchVideo 一致：两个候选 contentId 并行竞速解析，取最先成功者
                const finalVideoMap = await Promise.any(contentItems.map(item => dmmExtractTrailerLinks(item)));
                cacheData[carNum] = finalVideoMap;
                localStorage.setItem(DMM_VIDEO_CACHE_KEY, JSON.stringify(cacheData));
                return finalVideoMap;
            } catch (error) {
                const errors = (error && error.errors) || [error];
                if (errors.some(err => err && err.message && err.message.includes('节点不可用'))) {
                    console.warn('[JavDB增强助手] DMM节点不可用，请将DMM域名分流到日本IP');
                }
                return null;
            }
        })();
        getDmmVideo._pending = getDmmVideo._pending || {};
        getDmmVideo._pending[carNum] = task;
        try { return await task; } finally { delete getDmmVideo._pending[carNum]; }
    }

 // 详情页增强：替换/创建预告片源并渲染画质切换按钮
    let enhancePreviewVideoRunning = false;
    async function enhancePreviewVideo() {
        if (!config.enableLoadPreviewVideo) return;
        if (!window.location.pathname.startsWith('/v/')) return;
        if (enhancePreviewVideoRunning) return;
        enhancePreviewVideoRunning = true;
        // 【修复】播放器已关闭时，清理残留的工具条，防止关闭后工具条错误地留在图片旁
        const allToolbars = document.querySelectorAll('#video-bottom-toolbar');
        if (allToolbars.length > 0) {
            const video = pickJhsLiveVideo();
            // 如果找不到视频，或者视频处于关闭/不可见状态，就清理掉所有工具条
            if (!video || !isJhsPlayerOpened(video)) {
                allToolbars.forEach(tb => tb.remove());
            }
        }
        try {
            const code = extractDetailCode();
            if (!code) return;
            const dmmVideoMap = await getDmmVideo(code);
            if (!dmmVideoMap) {
                // 🚀 修复：DMM 视频未找到时，恢复原始 data-url
                const videoEl = pickJhsLiveVideo();
                if (videoEl && videoEl.getAttribute('back-data-url')) {
                    videoEl.setAttribute('data-url', videoEl.getAttribute('back-data-url'));
                }
                return;
            }
            const defaultQuality = selectDefaultQuality(Object.keys(dmmVideoMap), config.videoQuality);
            const defaultVideoUrl = dmmVideoMap[defaultQuality];
            if (!defaultVideoUrl) return;

            // 【修复切换画质抓包看不到目标地址·根因】JavDB 详情页预告片播放器经 fancybox
            // 模态层打开时，DOM 中会同时存在多个 id="preview-video" 的节点（页面隐藏的原生
            // 节点 + .fancybox__content 内真正在播的节点）。document.querySelector 永远返回
            // DOM 顺序靠前的第一个——即页面里那个看不见的隐藏节点。此前 enhancePreviewVideo、
            // 懒钩子、bindQualityButtons 全部用单查，换 src/load/play 都作用在隐藏节点上，
            // fancybox 内真正播放的元素始终停留在原生默认流——这就是"高亮变了、抓包里连
            // 720p(hmb.mp4) 请求都没有"的直接原因。现统一改用 pickJhsLiveVideo()：
            // ①正在播放且有 src 的 → ②位于 .fancybox__content 内的 → ③已打开的 → ④第一个。
            const videoEl = pickJhsLiveVideo();
            if (videoEl) {
                // 【核心修复】画质切换正在进行 / 用户已手动选过画质时，绝不再写回默认源
                if (videoEl._jhsSwitching) {
                    // 切换进行中：完全不干预，工具条由切换逻辑自己管理
                    return;
                } else {
                    const map = videoEl._jhsDmmMap || dmmVideoMap;
                    // 用户选择的画质存在 dataset 上，跨节点重建 / 多次增强都能保留
                    const chosenQuality = videoEl.dataset.jhsQuality || defaultQuality;
                    const desiredQuality = map[chosenQuality] ? chosenQuality : defaultQuality;
                    const desiredVideoUrl = map[desiredQuality];
            
                    if (desiredVideoUrl) {
                        const curAttr = videoEl.getAttribute('src') || '';
                        // 【核心修复】比较目标必须是"当前选中画质"，不是 defaultVideoUrl；
                        // 且只比较 origin+pathname，避免 token 变化引发的重复 load 循环
                        if (!isSameMediaUrl(curAttr, desiredVideoUrl)) {
                            const currentTime = videoEl.currentTime || 0;
                            const wasPlaying = !videoEl.paused;
            
                            if (wasPlaying) { try { videoEl.pause(); } catch (e) {} }
                            ensureNoSourceChildren(videoEl);
                            videoEl.setAttribute('src', desiredVideoUrl);
                            videoEl.load();
                            seekVideoSafe(videoEl, currentTime);
            
                            if (wasPlaying || isJhsPlayerOpened(videoEl)) {
                                applyJhsMutedPreference(videoEl);
                                void playJhsVideoSafely(videoEl);
                            }
                        }
                    }
            
                    videoEl._jhsDmmMap = map;
                    if (!videoEl.dataset.jhsQuality) videoEl.dataset.jhsQuality = desiredQuality;
            
                    // 【关键】先更新 _jhsDefaultQuality，再渲染工具条
                    videoEl._jhsDefaultQuality = videoEl.dataset.jhsQuality || defaultQuality;
                    if (isJhsPlayerOpened(videoEl)) {
                        applyJhsMutedPreference(videoEl);
                        showPreviewToolbar(videoEl);
                    }
                }
                videoEl.dataset.jhsEnhanced = '1';
                videoEl._jhsDmmMap = dmmVideoMap;
                // 播放器已可见时（用户在异步增强完成前就点开了预告片）：补挂/复用工具条。
                // 【修复画质按钮点了没反应】关键根因：JavDB 原生详情页【没有】#preview-video，
                // 点击"预告片"入口后 fancybox 会把隐藏的视频节点搬进 .fancybox__content 模态层，
                // 而此前 bindQualityButtons 用 offsetParent===null 判断"可见"——被搬走的节点在
                // fancybox 动画期间 offsetParent 为 null，工具条永远渲染不出来（或渲染在看不见的
                // 原位置），表现就是"无法切换画质/按钮无反应"。现对齐 JAV-JHS：只要视频处于播放
                // 状态即视为播放器已打开，并把工具条挂到视频所在容器（.fancybox__content）内。
                if (wasVisible || !videoEl.paused) {
                    applyJhsMutedPreference(videoEl);
                    if (!videoEl.paused) playJhsVideoSafely(videoEl);
                    showPreviewToolbar(videoEl);
                }
            } else {
 // JavDB 详情页没有内嵌 video 时：在预览区创建 预告片容器 + video
                const previewImages = document.querySelector('.preview-images');
                if (!previewImages) return;
                if (!document.querySelector('.preview-video-container')) {
                    const coverImg = document.querySelector('.column-video-cover img');
                    const poster = coverImg ? coverImg.getAttribute('src') : '';
                    const container = document.createElement('a');
                    container.className = 'preview-video-container';
                    container.href = 'javascript:;';
                    container.innerHTML = `<span>预告片</span><img src="${poster}" class="video-cover" style="width:150px;height:auto;" alt="">`;
                    previewImages.prepend(container);
                    const v = document.createElement('video');
                    v.id = 'preview-video';
                    v.setAttribute('playsinline', '');
                    v.setAttribute('controls', '');
                    // 不写 muted 属性：创建即静音会被 Chromium 随手势锁存媒体策略；
                    // 声音状态由点击"预告片"打开播放器时的 applyJhsMutedPreference(v) 决定（默认有声）
                    v.preload = 'auto';
                    v.loop = true;
                    v.style.display = 'none';
                    v.src = defaultVideoUrl;
                    v.dataset.jhsEnhanced = '1';
                    v._jhsDmmMap = dmmVideoMap;
                    v._jhsDefaultQuality = defaultQuality;
                    container.after(v);
                    container.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (v.style.display === 'none') {
                            v.style.display = 'block';
                            applyJhsMutedPreference(v); // 默认解除禁音（跟随用户记忆偏好）
                            playJhsVideoSafely(v);
                            showPreviewToolbar(v); // 打开播放器时才渲染画质工具条（对齐 JAV-JHS handleVideo）
                        } else {
                            v.style.display = 'none';
                            v.pause();
                            // 【修复】关闭时清理画质工具条，防止残留在图片网格旁
                            const toolbar = v.parentElement && v.parentElement.querySelector('#video-bottom-toolbar');
                            if (toolbar) toolbar.remove();
                        }
                    });
                }
            }
        } finally {
            enhancePreviewVideoRunning = false;
        }
    }

    // 静音偏好记忆（localStorage jhs_videoMuted，与 JAV-JHS 同键）：无记录时默认解除禁音
    function applyJhsMutedPreference(videoEl) {
        const pref = localStorage.getItem('jhs_videoMuted');
        videoEl.muted = pref ? ('yes' === pref) : false;
        if (!videoEl.muted && !videoEl.volume) videoEl.volume = 1; // 防止 volume=0 导致"解除禁音仍无声"
        if (!videoEl._jhsVolumeBound) {
            videoEl._jhsVolumeBound = true;
            videoEl.addEventListener('volumechange', () => {
                localStorage.setItem('jhs_videoMuted', videoEl.muted ? 'yes' : 'no');
            });
        }
    }

    // 原生 #preview-video 的懒加载增强：JavDB 原生预告片入口被点击、播放器真正打开后，
    // 再替换 DMM 高画质源并渲染画质工具条——保证工具条只出现在视频播放器下方
    function ensureNativePreviewHook() {
        if (ensureNativePreviewHook._bound) return;
        ensureNativePreviewHook._bound = true;
        
        // 【关键修复 1】尽早注入尺寸样式
        injectPreviewVideoGlobalStyles();
        
        // 【关键修复 2】对齐 JAV-JHS：在页面初始化时，立刻拔掉原生 video 的固定宽高属性！
        // 这样 Fancybox 在首次打开读取它时，就不会读到固定的宽高来计算小尺寸弹窗
        const nativeVideo = document.getElementById('preview-video');
        if (nativeVideo) {
            nativeVideo.removeAttribute('width');
            nativeVideo.removeAttribute('height');
            nativeVideo.style.width = '';
            nativeVideo.style.height = '';
            nativeVideo.style.maxWidth = '';
            nativeVideo.style.maxHeight = '';
        }
        
        document.addEventListener('click', (e) => {
            if (!config.enableLoadPreviewVideo) return;
            if (!window.location.pathname.startsWith('/v/')) return;
            const link = e.target.closest && e.target.closest('a[href*="#preview-video"], .preview-video-container');
            if (!link) return;
            // 【修复切换画质抓包看不到目标地址】手势时刻记录播放意图：点击时视频正在播放，
            // 说明这次是"暂停"手势（原生 controls/入口会自行暂停），脚本后续绝不补 play()。
            const gestureVideo = pickJhsLiveVideo();
            const wasPlayingAtGesture = !!(gestureVideo && !gestureVideo.paused);
            setTimeout(async () => {
                let videoEl = pickJhsLiveVideo(); // 多节点场景优先 fancybox 内真正在播的元素
                if (!videoEl) return;
                // 【修复】清理原生宽高限制，让 fancybox 能够将其放大到全屏级别
                videoEl.removeAttribute('width');
                videoEl.removeAttribute('height');
                videoEl.style.width = '';
                videoEl.style.height = '';
                videoEl.style.maxHeight = '';
                // 【修复 cb158f5 回归：无法暂停视频】手势时刻检测播放意图：
                // JavDB 原生预告片入口点击本身会切换播放/暂停——若此刻视频正在播放，
                // 说明这次点击是"暂停"手势，脚本绝不能再补 play() 把它弹回播放。
                // （以手势时刻的判定为准，异步期间 fancybox 可能已重建节点）
                applyJhsMutedPreference(videoEl);
                // 【修复画质切换后播放的仍是旧画质·根因】此前这里无条件 play()：JavDB 原生预告片
                // 入口点击本身会切换播放/暂停，若脚本把"从未被增强的原生 JavDB 预览视频"也强制
                // 播起来，enhancePreviewVideo 的节流重入与 fancybox 时序竞争下会出现——画面实际
                // 播放的是原生 src，而工具条按钮数据来自 DMM map；点画质按钮时 target 现查到的
                // 节点虽换了 DMM src，但 fancybox 内真正在渲染的媒体元素仍停在原生流上（表现为
                // "高亮变了、画质没变"）。现在未增强前不抢跑 play()，等 DMM 地址就绪、换源完成后
                // 再统一续播，保证"正在播的一定是 DMM 源"。
                if (videoEl.dataset.jhsEnhanced === '1') {
                    if (!wasPlayingAtGesture) playJhsVideoSafely(videoEl);
                    // 已增强过：播放器重新打开时补挂工具条（不再换源，保持加载速度修复）
                    if (isJhsPlayerOpened(videoEl)) showPreviewToolbar(videoEl);
                    return;
                }
                const code = extractDetailCode();
                if (!code) return;
                // 【修复画质按钮点击无反应】懒钩子与静默 enhancePreviewVideo 并发解析同一番号时，
                // 两侧先后各自渲染工具条，后一侧 remove+重建销毁了前一侧刚绑定的委托监听节点，
                // 表现为"按钮在、点了没反应"。现加并发锁：另一侧正在解析时本路径直接跳过，
                // 工具条统一由持有锁的一侧渲染（enhancePreviewVideo 的 finally 释放锁）。
                if (getDmmVideo._pending && getDmmVideo._pending[code.toUpperCase()]) {
                    if (isJhsPlayerOpened(videoEl)) showPreviewToolbar(videoEl);
                    return;
                }
                const dmmVideoMap = await getDmmVideo(code);
                if (!dmmVideoMap) {
                    // 🚀 修复：DMM 视频未找到时，恢复原始 data-url
                    const videoEl = pickJhsLiveVideo();
                    if (videoEl && videoEl.getAttribute('back-data-url')) {
                        videoEl.setAttribute('data-url', videoEl.getAttribute('back-data-url'));
                    }
                    return;
                }
                // 异步解析期间 fancybox 可能已重建播放器节点，重新获取最新引用（对齐 JAV-JHS handleVideo 每次现查）
                videoEl = pickJhsLiveVideo();
                if (!videoEl) return;
                const defaultQuality = selectDefaultQuality(Object.keys(dmmVideoMap), config.videoQuality);
                const defaultVideoUrl = dmmVideoMap[defaultQuality];
                if (!defaultVideoUrl) return;
                videoEl.dataset.jhsEnhanced = '1';
                videoEl._jhsDmmMap = dmmVideoMap;
                // 【修复】用户已手动切换过画质时，不覆盖为配置默认值
                videoEl._jhsDefaultQuality = videoEl.dataset.jhsQuality || defaultQuality;
                applyJhsMutedPreference(videoEl);
                // 与 JAV-JHS handleVideo 逐行一致：src 不同才换源+load()+play()；
                // 若静默增强已把 src 换成同一默认地址，这里不再重复 load()——
                // 此前无条件 load() 会把刚缓冲好的视频强制重新拉流（加载卡顿的根因之一），
                // 且重挂工具条前移除旧工具条，保证按钮数据始终来自最新 map
                if (videoEl.getAttribute('src') !== defaultVideoUrl) {
                    ensureNoSourceChildren(videoEl);
                    videoEl.setAttribute('src', defaultVideoUrl);
                    videoEl.load();
                }
                // 【修复 cb158f5 回归】同手势意图：用户本次点击若是"暂停"手势则不强制续播
                if (!wasPlayingAtGesture) playJhsVideoSafely(videoEl);
                // 【修复画质按钮点了没反应】可见性判定改用 isJhsPlayerOpened（兼容 fancybox 模态层）
                showPreviewToolbar(videoEl);
            }, 300);
        }, true);
    }

    // 播放器打开后才渲染工具条。
    // 【修复画质按钮点了没反应】"已打开"的判定不再使用 offsetParent（JavDB 原生预告片经 fancybox
    // 把视频节点搬进模态层，动画期间 offsetParent 为 null，导致工具条永远不渲染）——对齐 JAV-JHS：
    // 只要视频正在播放、或已位于 .fancybox__content 内、或正常可见，即视为播放器已打开。
    // 【修复 AbortError: The play() request was interrupted by a new load request】
    // load() 会使上一次未完成的 play() Promise 以 AbortError 拒绝；此前各处
    // videoEl.play().catch(() => {}) 中 .catch() 的返回值被丢弃，部分 Chromium/Tampermonkey
    // 环境仍将其上报为 Uncaught (in promise)。统一改为 void 吞掉 rejection。
    function playJhsVideoSafely(videoEl) {
        if (!videoEl || typeof videoEl.play !== 'function') return Promise.resolve();
        try {
            const p = videoEl.play();
            if (p && typeof p.catch === 'function') return p.catch(() => {});
        } catch (e) { /* 同步异常同样忽略 */ }
        return Promise.resolve();
    }

    function isJhsPlayerOpened(videoEl) {
        if (!videoEl) return false;
    
        // 在 fancybox 模态层内：模态层本身必须可见
        const fancyboxContent = videoEl.closest && videoEl.closest('.fancybox__content');
        if (fancyboxContent) {
            const container = fancyboxContent.closest('.fancybox-container');
            if (container) {
                const style = getComputedStyle(container);
                if (style.display === 'none' || style.visibility === 'hidden') return false;
            }
            return true; // 模态层可见 → 播放器已打开
        }
    
        // 不在模态层内：元素本身必须可见（display:none 时 offsetParent 为 null）
        if (videoEl.offsetParent === null) return false;
    
        // 可见且正在播放或有播放进度 → 播放器已打开
        return !videoEl.paused || videoEl.currentTime > 0;
    }

    // ========== 新增：等待视频就绪（对齐 JHS waitForDmmReady） ==========
    function waitForVideoReady(videoEl, timeoutMs = 10000) {
        if (!videoEl) return Promise.resolve(false);
        if (videoEl.readyState >= 3) return Promise.resolve(true); // HAVE_FUTURE_DATA
        return new Promise((resolve) => {
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                videoEl.removeEventListener('canplay', onReady);
                videoEl.removeEventListener('error', onError);
                resolve(ok);
            };
            const onReady = () => finish(true);
            const onError = () => finish(false);
            const timer = setTimeout(() => finish(false), timeoutMs);
            videoEl.addEventListener('canplay', onReady, { once: true });
            videoEl.addEventListener('error', onError, { once: true });
        });
    }
    
    // ========== 新增：安全 seek（对齐 JHS seekVideo） ==========
    function seekVideoSafe(videoEl, time) {
        if (!videoEl) return;
        const doSeek = () => {
            try {
                videoEl.currentTime = Math.max(0, Math.min(time || 0,
                    Number.isFinite(videoEl.duration) ? videoEl.duration : Infinity));
            } catch (e) {}
        };
        doSeek();
        // 如果视频还没加载元数据，等 loadedmetadata 后再 seek
        if (!videoEl.readyState) {
            videoEl.addEventListener('loadedmetadata', () => doSeek(), { once: true });
        }
    }

    // 【修复切换画质抓包看不到目标地址·核心】收集所有 id="preview-video" 节点并选出
    // "真正在播的那一个"。JavDB 详情页经 fancybox 打开预告片后，DOM 中会同时存在页面里
    // 隐藏的 #preview-video 与 .fancybox__content 内可见的两个同 id 节点；querySelector
    // 单查永远返回靠前的隐藏节点，导致换源/load/play 全部打在看不见的元素上（表现为
    // 高亮变了、实际播放的仍是原画质，抓包里连目标 hmb.mp4 请求都没有）。
    function pickJhsLiveVideo() {
        // 🚀 修复：JavDB 页面改动，video 元素现在位于 #preview-video-box 内
        const boxVideo = document.querySelector('#preview-video-box video');
        if (boxVideo) {
            if (!boxVideo.id) boxVideo.id = 'preview-video';
        }
        
        const list = Array.from(document.querySelectorAll('#preview-video'));
        if (!list.length) return null;
        // 优先：在 .fancybox__content 内且可见的
        const inFancybox = list.find(v => v.closest && v.closest('.fancybox__content') && v.offsetParent !== null);
        if (inFancybox) return inFancybox;
        // 其次：正在播放的
        const playing = list.find(v => !v.paused && v.currentTime > 0);
        if (playing) return playing;
        // 再次：有 src 且可见的
        const visible = list.find(v => v.getAttribute('src') && v.offsetParent !== null);
        if (visible) return visible;
        // 兜底
        return list.find(v => v.getAttribute('src')) || list[0];
    }
    
    // ===== 新增辅助函数：移除 <source> 子元素，确保 src 属性生效 =====
    function ensureNoSourceChildren(videoEl) {
        if (!videoEl) return;
        const sources = videoEl.querySelectorAll('source');
        if (sources.length > 0) {
            sources.forEach(s => s.remove());
        }
    }
    
    // ========== 新增：比较两个视频URL是否指向同一媒体资源（忽略时效token差异） ==========
    function isSameMediaUrl(a, b) {
        if (!a || !b) return false;
        try {
            const x = new URL(a, location.href);
            const y = new URL(b, location.href);
            return x.origin === y.origin && x.pathname === y.pathname;
        } catch (e) {
            return a === b;
        }
    }
    
    function showPreviewToolbar(videoEl) {
        const map = videoEl && videoEl._jhsDmmMap;
        if (!map) return;
        if (!isJhsPlayerOpened(videoEl)) return;
        injectVideoToolbarStyles();
        bindQualityButtons(videoEl, map, videoEl._jhsDefaultQuality);
    }

    // ========== 替换：全局注入预览视频尺寸与居中样式 ==========
    function injectPreviewVideoGlobalStyles() {
        if (document.getElementById('jhs-preview-video-global-style')) return;
        const style = document.createElement('style');
        style.id = 'jhs-preview-video-global-style';
        style.textContent = `
    /* 🚀 同步 JAV-JHS v3.3.6.031：简化预览视频样式，让 Fancybox 自动处理居中和尺寸 */
    #preview-video-box.fancybox__content {
        width: 85% !important;
    }
    
    .fancybox__container {
        z-index: 99999999 !important;
    }
    `;
        document.head.appendChild(style);
    }

    // 画质切换/工具条统一样式 + 长缩略图状态样式：独立注入（对齐 JAV-JHS mainCss 全局注入方式，
    // 保证首次进入详情页、未经过弹窗流程时按钮样式也完整生效）
    function injectVideoToolbarStyles() {
        if (document.getElementById('jhs-video-toolbar-style')) return;
        const style = document.createElement('style');
        style.id = 'jhs-video-toolbar-style';
        style.textContent = `
    /* 长缩略图加载中/失败状态不响应点击，避免打开空 lightbox */
    .screen-container.no-click { cursor: default; pointer-events: none; }
    .screen-container.no-click a { pointer-events: auto; }
    #video-bottom-toolbar .video-control-btn { min-width:120px; padding: 7px 12px; font-size: 12px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 4px; cursor: pointer; }
    #video-bottom-toolbar .video-control-btn.active { background-color: #1890ff; color: white; font-weight: bold; border: 2px solid #096dd9; }
    `;
        document.head.appendChild(style);
    }

    // ===== 画质工具条位置跟随：弹窗模式下恒紧贴视频正下方居中（截图效果） =====
    function stopToolbarFollow(toolbar) {
        if (toolbar && toolbar._jhsFollowRaf) {
            cancelAnimationFrame(toolbar._jhsFollowRaf);
            toolbar._jhsFollowRaf = 0;
        }
    }

    function startToolbarFollow(toolbar, getVideo) {
        stopToolbarFollow(toolbar);
        const tick = () => {
            toolbar._jhsFollowRaf = 0;
            if (!toolbar.isConnected) return; // 已被外部清理 → 自动退出，不残留循环
            const v = getVideo();
            if (!v || !isJhsPlayerOpened(v)) { toolbar.remove(); return; } // 弹窗关闭 → 移除工具条并退出
            const r = v.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                toolbar.style.top = Math.round(r.bottom + 12) + 'px';
                toolbar.style.left = Math.round(r.left + r.width / 2) + 'px';
            }
            toolbar._jhsFollowRaf = requestAnimationFrame(tick);
        };
        toolbar._jhsFollowRaf = requestAnimationFrame(tick);
    }


    // 在 video 所在容器底部渲染画质切换按钮组（工具条只跟随视频播放器，绝不插入图片预览网格）
    function bindQualityButtons(videoEl, dmmVideoMap, defaultQuality) {
        // 【修复】视频不可见时不渲染工具条，防止关闭后残留在图片网格旁
        if (!isJhsPlayerOpened(videoEl)) return;
    
        let parent = videoEl.parentElement;
        if (!parent) return;
    
        if (parent.classList && parent.classList.contains('preview-images')) {
            let wrap = parent.parentElement && parent.parentElement.querySelector('.jhs-video-wrap');
            if (!wrap) {
                wrap = document.createElement('div');
                wrap.className = 'jhs-video-wrap';
                wrap.style.cssText = 'clear:both;margin-top:8px;position:relative;';
                parent.insertAdjacentElement('afterend', wrap);
            }
            wrap.appendChild(videoEl);
            videoEl.style.width = '100%';
            // 【修复】移除 maxHeight 限制，并清理原生宽高属性，让 fancybox 弹窗自由撑满大屏幕
            videoEl.style.maxHeight = '';
            videoEl.style.height = '';
            videoEl.removeAttribute('width');
            videoEl.removeAttribute('height');
            parent = wrap;
        }
    
        // 🚀 弹窗模式判定：视频在 fancybox 内时，工具条挂到"视频正下方"——
        // 位于内容盒之外（不参与弹窗尺寸计算 → 无黑边），且跟随视频而非固定屏幕底部
        const inFancybox = !!(videoEl.closest && videoEl.closest('.fancybox__container, .fancybox-container'));
        const toolbarHost = inFancybox ? document.body : parent;

        // 幂等：以用户实际选择的画质为键，而非永远不变的 _jhsDefaultQuality
        const currentKey = videoEl.dataset.jhsQuality || defaultQuality;
        const existingToolbar = toolbarHost.querySelector(':scope > #video-bottom-toolbar');
        if (existingToolbar) {
            if (existingToolbar.dataset.jhsQuality === currentKey && !!existingToolbar._jhsFollow === inFancybox) return;
            stopToolbarFollow(existingToolbar);
            existingToolbar.remove();
        }

        // 清理其他容器上的旧工具条
        document.querySelectorAll('#video-bottom-toolbar').forEach(tb => {
            if (!toolbarHost.contains(tb)) { stopToolbarFollow(tb); tb.remove(); }
        });

        if (!inFancybox) parent.style.position = 'relative';
        const toolbar = document.createElement('div');
        toolbar.id = 'video-bottom-toolbar';
        toolbar.dataset.jhsQuality = currentKey;
        toolbar._jhsFollow = inFancybox;
        if (inFancybox) {
            // 固定定位 + 逐帧跟随：紧贴视频下缘、水平居中；无额外底色（按钮自带深色底，与截图一致）
            toolbar.style.cssText = 'position:fixed;z-index:100000000;display:flex;justify-content:center;transform:translateX(-50%);max-width:92vw;';
        } else {
            // 【修复】强制 100% 宽度并使用 justify-content: center 让内部元素居中
            toolbar.style.cssText = 'display:flex;justify-content:center;width:100%;margin-top:2px;';
        }
        const group = document.createElement('div');
        // 【修复】按钮组内部也居中，并稍微加大按钮间距(gap:8px)使其更美观
        group.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;';

        QUALITY_OPTIONS.forEach(option => {
            const url = dmmVideoMap[option.quality];
            if (!url) return;
            const isActive = defaultQuality === option.quality;
            const btn = document.createElement('button');
            btn.className = 'video-control-btn' + (isActive ? ' active' : '');
            btn.dataset.quality = option.quality;
            btn.dataset.videoSrc = url;
            btn.textContent = option.text;
            group.appendChild(btn);
        });
        toolbar.appendChild(group);
        toolbarHost.appendChild(toolbar);
        if (inFancybox) {
            startToolbarFollow(toolbar, () => (videoEl.isConnected ? videoEl : pickJhsLiveVideo()));
        }
    
        // ===== 核心：画质切换点击处理（对齐 JHS handleVideo 内的切换逻辑） =====
        group.addEventListener('click', async (e) => {
            const btn = e.target.closest('.video-control-btn');
            if (!btn || btn.classList.contains('active')) return;
        
            const liveVideo = videoEl.isConnected ? videoEl : pickJhsLiveVideo();
            if (!liveVideo || !liveVideo.isConnected) return;
        
            // 【核心修复】上锁：这期间 MutationObserver / 懒钩子的增强逻辑必须让路
            liveVideo._jhsSwitching = true;
        
            const oldSrc = liveVideo.getAttribute('src') || '';
            const oldQuality = liveVideo.dataset.jhsQuality || '';
            const currentTime = liveVideo.currentTime || 0;
            const wasPlaying = !liveVideo.paused;
        
            try {
                if (wasPlaying) { try { liveVideo.pause(); } catch (e) {} }
        
                ensureNoSourceChildren(liveVideo);
        
                // 先落状态，再换源：即使异步期间观察器插入，也不会写回默认画质
                liveVideo.dataset.jhsQuality = btn.dataset.quality;
                liveVideo.setAttribute('src', btn.dataset.videoSrc);
                liveVideo.load();
        
                const ready = await waitForVideoReady(liveVideo, 12000);
        
                if (ready) {
                    seekVideoSafe(liveVideo, currentTime);
                    if (wasPlaying) await playJhsVideoSafely(liveVideo);
                    // 【关键】立即同步 _jhsDefaultQuality，防止后续重入用旧值重建工具条
                    liveVideo._jhsDefaultQuality = btn.dataset.quality;
                    // 同步工具条的幂等键
                    const tb = group.closest('#video-bottom-toolbar');
                    if (tb) tb.dataset.jhsQuality = btn.dataset.quality;
                    group.querySelectorAll('.video-control-btn').forEach(b => {
                        b.classList.toggle('active', b === btn);
                        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
                    });
                } else {
                    // 失败回退，同时回退状态，避免状态与画面不一致
                    liveVideo.dataset.jhsQuality = oldQuality;
                    if (oldSrc) {
                        liveVideo.setAttribute('src', oldSrc);
                        liveVideo.load();
                        await waitForVideoReady(liveVideo);
                        seekVideoSafe(liveVideo, currentTime);
                        if (wasPlaying) await playJhsVideoSafely(liveVideo);
                    }
                }
            } catch (err) {
                console.error('[画质切换] 失败:', err);
            } finally {
                liveVideo._jhsSwitching = false;
            }
        });
    }

    // ---------- 封面快捷按钮：长缩略图 / 预览视频 ----------
    const COVER_SCREEN_SVG = '<svg t="1750691468062" class="jhs-icon icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M288 160a64 64 0 0 0-64 64v576a64 64 0 0 0 64 64h448a64 64 0 0 0 64-64v-576a64 64 0 0 0-64-64h-448m0-64h448a128 128 0 0 1 128 128v576a128 128 0 0 1-128 128h-448a128 128 0 0 1-128-128v-576a128 128 0 0 1 128-128z" fill="#4078FD"></path><path d="M416 352m-64 0a64 64 0 1 0 128 0 64 64 0 1 0-128 0Z" fill="#FE9C23"></path><path d="M352 732.448a32 32 0 0 1-32-32v-160a32 32 0 0 1 44.224-29.568l130.112 53.632 153.952-169.984a32 32 0 0 1 55.712 21.472v284.448a32 32 0 0 1-32 32z m0-32h320z" fill="#4078FD" opacity=".2"></path><path d="M672 416l-169.088 186.656-150.912-62.208v160h320V416m0-32a32 32 0 0 1 32 32v284.448a32 32 0 0 1-32 32h-320a32 32 0 0 1-32-32v-160a32 32 0 0 1 44.192-29.6l130.112 53.632 153.984-169.984a32 32 0 0 1 23.712-10.496z" fill="#4078FD"></path></svg>';
    const COVER_VIDEO_SVG = '<svg t="1749003664455" class="jhs-icon icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M825.6 153.6H198.4C124.5 153.6 64 214.1 64 288v448c0 73.9 60.5 134.4 134.4 134.4h627.2c73.9 0 134.4-60.5 134.4-134.4V288c0-73.9-60.5-134.4-134.4-134.4z m-138.2 44.8l112 112H706l-112-112h93.4z m-156.8 0l112 112H526.7l-112-112h115.9z m-179.2 0l112 112H347.5l-112-112h115.9zM108.8 288c0-41.4 28.4-76.1 66.7-86.3l108.7 108.7H108.8V288z m806.4 448c0 49.4-40.2 89.6-89.6 89.6H198.4c-49.4 0-89.6-40.2-89.6-89.6V355.2h806.4V736z m0-425.6h-52.5l-112-112h74.9c49.4 0 89.6 40.2 89.6 89.6v22.4z"></path><path d="M454 687.2l149.3-77.6c27.5-13.8 27.5-53 0-66.8L468 472.2c-31.2-15.6-68 7.1-68 42v139.6c0 27.8 29.2 45.8 54 33.4zM444.8 512l134.4 67.2-134.4 67.2V512z"></path></svg>';
    const COVER_RECOVERY_VIDEO_SVG = '<svg class="jhs-icon icon" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="200" height="200"><path d="M938.666667 553.92V768c0 64.8-52.533333 117.333333-117.333334 117.333333H202.666667c-64.8 0-117.333333-52.533333-117.333334-117.333333V256c0-64.8 52.533333-117.333333 117.333334-117.333333h618.666666c64.8 0 117.333333 52.533333 117.333334 117.333333v297.92z m-64-74.624V256a53.333333 53.333333 0 0 0-53.333334-53.333333H202.666667a53.333333 53.333333 0 0 0-53.333334 53.333333v344.48A290.090667 290.090667 0 0 1 192 597.333333a286.88 286.88 0 0 1 183.296 65.845334C427.029333 528.384 556.906667 437.333333 704 437.333333c65.706667 0 126.997333 16.778667 170.666667 41.962667z m0 82.24c-5.333333-8.32-21.130667-21.653333-43.648-32.917333C796.768 511.488 753.045333 501.333333 704 501.333333c-121.770667 0-229.130667 76.266667-270.432 188.693334-2.730667 7.445333-7.402667 20.32-13.994667 38.581333-7.68 21.301333-34.453333 28.106667-51.370666 13.056-16.437333-14.634667-28.554667-25.066667-36.138667-31.146667A222.890667 222.890667 0 0 0 192 661.333333c-14.464 0-28.725333 1.365333-42.666667 4.053334V768a53.333333 53.333333 0 0 0 53.333334 53.333333h618.666666a53.333333 53.333333 0 0 0 53.333334-53.333333V561.525333zM320 480a96 96 0 1 1 0-192 96 96 0 0 1 0 192z m0-64a32 32 0 1 0 0-64 32 32 0 0 0 0 64z" fill="#000000"></path></svg>';

    // 列表页每个 item 的 tags 行尾部追加 tool-box（📏长缩略图 + ▶预览视频），受各自开关控制；无 .tags 行的卡片（如"每周推荐"）自动补一行工具栏
    // 样式对齐 CoverButtonPlugin：.tool-box span 默认 opacity .3，悬停变 1；SVG 路径蓝色/暗色白色
    function addCoverQuickButtons() {
        if (!config.enableScreenSvg && !config.enableVideoSvg) return;
        // 关键修复：样式必须在创建按钮前注入（且独立于弹窗样式）。
        // 此前 svg 内联 fill="#4078FD"（浅色主题配色）+ 覆盖 CSS 只在第一次弹窗时才注入，
        // 导致刷新后暗色主题下按钮仍是浅色配色；同时剥离内联 fill，让 CSS 完全接管颜色。
        injectCoverButtonStyles();
        document.querySelectorAll('.movie-list .item').forEach(item => {
            if (item.querySelector('.jhs-tool-box')) return; // 幂等
            let tagsRow = item.querySelector('.tags');
            // 🚀 适配"每周推荐"(#recommend-container)等无 .tags 行的卡片：
            // 其结构为 a > (.cover + .video-title + .score)，在链接末尾补一行右对齐工具栏
            if (!tagsRow) {
                if (!extractItemCode(item)) return; // 无番号的卡片（演员/片商等）不加空工具栏
                const host = item.querySelector('a.box') || item.querySelector('a[href*="/v/"]') || item;
                tagsRow = document.createElement('div');
                tagsRow.className = 'jhs-tags-fallback';
                tagsRow.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;';
                host.appendChild(tagsRow);
            }
            const toolBox = document.createElement('div');
            toolBox.className = 'tool-box jhs-tool-box';
            toolBox.style.cssText = 'margin-left:auto;display:flex;align-items:center;';
            if (config.enableScreenSvg) {
                const screenBtn = document.createElement('span');
                screenBtn.className = 'screenSvg';
                screenBtn.title = '长缩略图';
                // 对齐 JAV-JHS：内联仅 margin-right:15px，尺寸/透明度由注入 CSS（.jhs-icon / .jhs-tool-box span）控制
                screenBtn.style.cssText = 'margin-right:15px;cursor:pointer;';
                screenBtn.innerHTML = COVER_SCREEN_SVG;
                toolBox.appendChild(screenBtn);
            }
            if (config.enableVideoSvg) {
                const videoBtn = document.createElement('span');
                videoBtn.className = 'videoSvg';
                videoBtn.title = '播放预览视频';
                videoBtn.dataset.state = 'idle';
                videoBtn.style.cssText = 'margin-right:15px;cursor:pointer;';
                videoBtn.innerHTML = COVER_VIDEO_SVG;
                toolBox.appendChild(videoBtn);
            }
            tagsRow.appendChild(toolBox);
        });
    }

    // 快捷按钮行为：一次性 document 委托绑定（动态追加的按钮天然生效）
    function bindCoverQuickButtonEvents() {
        if (bindCoverQuickButtonEvents._bound) return;
        bindCoverQuickButtonEvents._bound = true;

        // 📏 长缩略图：取该卡片番号 → getScreenshot → lightbox 全屏查看
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest && e.target.closest('.jhs-tool-box .screenSvg');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            if (bindCoverQuickButtonEvents._screenLoading) return; // 防连点重复请求
            const item = btn.closest('.movie-list .item');
            if (!item) return;
            let code = extractItemCode(item);
            if (!code) return;
            code = code.replace('FC2-', '');
            bindCoverQuickButtonEvents._screenLoading = true;
            const prevHtml = btn.innerHTML;
            btn.style.opacity = '1';
            btn.title = '加载中...';
            try {
                const imgUrl = await getScreenshot(code);
                showImageViewer(imgUrl);
            } catch (err) {
                jhsToast('长缩略图获取失败: ' + (err.message || err));
            } finally {
                bindCoverQuickButtonEvents._screenLoading = false;
                btn.style.opacity = '';
                btn.title = '长缩略图';
                btn.innerHTML = prevHtml;
            }
        });

        // ▶ 预览视频：就地覆盖 <video> 播放 DMM 高画质预告片；再点切回封面。同时只允许一个在播
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest && e.target.closest('.jhs-tool-box .videoSvg');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            const item = btn.closest('.movie-list .item');
            if (!item) return;

 // 先把其它正在播放的卡片恢复成封面状态
            document.querySelectorAll('.videoSvg[data-state="playing"]').forEach(otherBtn => {
                if (otherBtn === btn) return;
                const otherItem = otherBtn.closest('.movie-list .item');
                const otherCode = extractItemCode(otherItem);
                const otherVideo = otherItem.querySelector('#' + CSS.escape(otherCode + '_preview_video'));
                if (otherVideo) { otherVideo.pause(); otherVideo.parentElement.remove(); }
                const otherImg = otherItem.querySelector('.cover img');
                if (otherImg) otherImg.style.display = '';
                otherBtn.innerHTML = COVER_VIDEO_SVG;
                otherBtn.title = '播放预览视频';
                otherBtn.dataset.state = 'idle';
            });

            const code = extractItemCode(item);
            if (!code) return;
            if (bindCoverQuickButtonEvents._videoLoading && bindCoverQuickButtonEvents._videoLoading === code) return; // 同番号防连点
            const img = item.querySelector('.cover img');
            if (!img) { jhsToast('没有找到封面图片'); return; }
            const videoId = `${code}_preview_video`;
            let videoEl = item.querySelector('#' + CSS.escape(videoId));

            if (btn.dataset.state === 'playing' && videoEl) {
                // 切回封面
                videoEl.pause();
                videoEl.parentElement.remove();
                img.style.display = '';
                btn.innerHTML = COVER_VIDEO_SVG;
                btn.title = '播放预览视频';
                btn.dataset.state = 'idle';
                return;
            }

            if (videoEl) {
                // 已有缓存的视频节点：直接复用播放
                videoEl.parentElement.style.display = '';
                applyJhsMutedPreference(videoEl); // 默认有声（跟随记忆偏好），对齐 JAV-JHS showVideo
                playJhsVideoSafely(videoEl);
                img.style.display = 'none';
                btn.innerHTML = COVER_RECOVERY_VIDEO_SVG;
                btn.title = '切回封面';
                btn.dataset.state = 'playing';
                return;
            }

            const poster = img.currentSrc || img.src;
            // 关键修复：逐行照搬 JAV-JHS CoverButtonPlugin.showVideo——先 await getDmmVideo 拿到地址，
            // 再创建【带 src、无 muted 属性】的 <video>，随后同步执行 load() → muted=false → play()。
            // （此前自创的"手势内先建空 src 占位、解析完再替换 src"方案是错的：空 src 元素在浏览器
            // 自动播放策略中不占用媒体授权槽位，随后异步换 src 播放时已脱离手势，被强制降级为静音——
            // 这正是"封面快捷按钮播放预览视频依旧默认禁音"的真正根因；JAV-JHS 原版实测正常即因为此顺序）
            bindCoverQuickButtonEvents._videoLoading = code;
            btn.title = '解析中...';
            let dmmVideoMap = null;
            try {
                dmmVideoMap = await getDmmVideo(code);
            } finally {
                bindCoverQuickButtonEvents._videoLoading = null;
            }
            if (!dmmVideoMap) {
                jhsToast('未解析到视频');
                btn.dataset.state = 'idle';
                btn.title = '播放预览视频';
                return;
            }
            const quality = selectDefaultQuality(Object.keys(dmmVideoMap), config.videoQuality);
            const videoUrl = dmmVideoMap[quality];
            if (!videoUrl) {
                jhsToast('未解析到视频');
                btn.dataset.state = 'idle';
                btn.title = '播放预览视频';
                return;
            }
            const cover = item.querySelector('.cover') || img.parentElement;
            if (!cover || !cover.isConnected) return;
            if (getComputedStyle(cover).position === 'static') cover.style.position = 'relative';
            const wrap = document.createElement('div');
            wrap.className = 'jhs-cover-video-wrap';
            wrap.style.cssText = 'display:flex;justify-content:center;align-items:center;position:absolute;top:0;left:0;height:100%;width:100%;z-index:10;overflow:hidden;background:#000;';
            // HTML 上不写 muted（对齐 JAV-JHS showVideo 的 videoHtml），声音状态由下面的 JS 赋值决定
            wrap.innerHTML = `<video src="${videoUrl}" poster="${poster}" id="${videoId}" controls loop playsinline
                style="max-height:100%;max-width:100%;object-fit:contain"></video>`;
            cover.appendChild(wrap);
            img.style.display = 'none';
            btn.innerHTML = COVER_RECOVERY_VIDEO_SVG;
            btn.title = '切回封面';
            btn.dataset.state = 'playing';
            const v = wrap.querySelector('video');
            v._jhsDmmMap = dmmVideoMap; // 供后续扩展（画质映射）使用
            // 与 JAV-JHS showVideo 结尾三行一致：load() → muted=false（记忆偏好）→ play()
            v.load();
            applyJhsMutedPreference(v);
            playJhsVideoSafely(v);
        });
    }
    
    // CSS样式注入（根据配置动态生成）
    function injectStyles() {
        let styles = '';  
  
        // 🚀 融合功能：开启“评论与磁链增强”时，隐藏 VIP 提示 + 短评与磁链独立美化
        if (config.loadReviews) {
            styles += `
                /* 隐藏 JavDB 原生的 VIP 短评提示行 */
                .review-item.more.has-text-link { display: none !important; }
            `;
        }

        // ================= 短评区专属美化 (严格限制作用域，绝不污染磁链) =================
        styles += `
            #reviews dl.review-items { margin-top: 12px; }
            
            /* 短评卡片化（原生 + 第三方追加共用） */
            #reviews dl.review-items dt.review-item,
            #reviews-container dt.review-item,
            dt.ht-review-appended {
                padding: 12px 16px;
                margin: 0 0 10px 0;
                border-radius: 8px;
                background: rgba(128,128,128,0.05);
                border: 1px solid rgba(128,128,128,0.12);
                transition: background .2s ease, border-color .2s ease, box-shadow .2s ease;
            }
            #reviews dl.review-items dt.review-item:hover,
            #reviews-container dt.review-item:hover,
            dt.ht-review-appended:hover {
                background: rgba(128,128,128,0.09);
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            
            /* 短评暗色模式适配 */
            html[data-theme="dark"] #reviews dl.review-items dt.review-item,
            html[data-theme="dark"] #reviews-container dt.review-item,
            html[data-theme="dark"] dt.ht-review-appended {
                background: rgba(255,255,255,0.04);
                border-color: rgba(255,255,255,0.08);
            }
            html[data-theme="dark"] #reviews dl.review-items dt.review-item:hover,
            html[data-theme="dark"] #reviews-container dt.review-item:hover,
            html[data-theme="dark"] dt.ht-review-appended:hover {
                background: rgba(255,255,255,0.08);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }

            /* 短评内部元素微调 */
            #reviews dl.review-items .review-title, #reviews-container .review-title { line-height: 1.9; }
            #reviews dl.review-items .review-title .time, #reviews-container .review-title .time { color: #999; font-size: 12px; margin-left: 6px; }
            html[data-theme="dark"] #reviews dl.review-items .review-title .time,
            html[data-theme="dark"] #reviews-container .review-title .time { color: #777; }
            
            #reviews dl.review-items .likes .button, #reviews-container .likes .button { display: inline-flex; align-items: center; }
            #reviews dl.review-items .likes .button .likes-count, #reviews-container .likes .button .likes-count { margin-left: 5px; font-weight: 600; }
            .ht-static-like { pointer-events: none; }

            /* 第三方评论专属标识 */
            dt.ht-review-appended { border-left: 3px solid #3273dc; }
            html[data-theme="dark"] dt.ht-review-appended { border-left-color: #00d1b2; }
            .ht-third-tag {
                display: inline-block; height: 18px; line-height: 18px; padding: 0 6px;
                margin-left: 4px; border-radius: 4px; font-size: 11px; vertical-align: 2px;
                background: rgba(50,115,220,0.12); color: #3273dc;
            }
            html[data-theme="dark"] .ht-third-tag { background: rgba(0,209,178,0.15); color: #00d1b2; }
            .ht-stars { color: #f4b731; letter-spacing: 1px; margin-left: 4px; }
            
            #reviews dl.review-items .content, #reviews-container .content { margin-top: 6px; }
            #reviews dl.review-items .content p, #reviews-container .content p { margin: 0; line-height: 1.7; word-break: break-word; }
        `;

        // ================= 磁链区专属美化 (严格限制在 #magnets-content 内) =================
        styles += `
            #magnets-content {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 10px;
            }

            /* 磁链卡片化（排除广告和排序控件，只作用于 .item） */
            #magnets-content > .item {
                padding: 12px 16px;
                border-radius: 8px;
                background: rgba(128,128,128,0.04);
                border: 1px solid rgba(128,128,128,0.12);
                transition: all 0.2s ease;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 12px;
            }
            #magnets-content > .item:hover {
                background: rgba(128,128,128,0.08);
                border-color: rgba(128,128,128,0.25);
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            
            /* 磁链暗色模式适配 */
            html[data-theme="dark"] #magnets-content > .item {
                background: rgba(255,255,255,0.03);
                border-color: rgba(255,255,255,0.08);
            }
            html[data-theme="dark"] #magnets-content > .item:hover {
                background: rgba(255,255,255,0.07);
                border-color: rgba(255,255,255,0.15);
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }

            /* 磁链名称区（自适应占据剩余空间） */
            #magnets-content > .item .magnet-name {
                flex: 1 1 auto;
                min-width: 200px;
            }
            #magnets-content > .item .magnet-name a {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px;
                color: inherit;
                text-decoration: none;
            }
            #magnets-content > .item .magnet-name .name {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                word-break: break-all;
            }
            html[data-theme="dark"] #magnets-content > .item .magnet-name .name { color: #e0e0e0; }
            
            #magnets-content > .item .magnet-name .meta {
                font-size: 12px;
                color: #888;
            }
            html[data-theme="dark"] #magnets-content > .item .magnet-name .meta { color: #999; }

            /* 磁链日期区 */
            #magnets-content > .item .date {
                flex: 0 0 auto;
                font-size: 13px;
                color: #666;
            }
            html[data-theme="dark"] #magnets-content > .item .date { color: #aaa; }

            /* 磁链按钮区 */
            #magnets-content > .item .buttons {
                flex: 0 0 auto;
                display: flex;
                gap: 6px;
            }
            #magnets-content > .item .buttons .button {
                font-size: 12px;
                padding: 4px 10px;
                height: auto;
                border-radius: 4px;
            }
        `;
        
        // 🚀 相关清单增强样式（受 loadRelated 开关控制）
            if (config.loadRelated) {
                styles += `
                /* 自定义 Tab 样式融合 */
                .ht-related-tab-li a { cursor: pointer; }
                .ht-related-tab-li.is-active a {
                    color: #3273dc !important;
                    border-bottom-color: #3273dc !important;
                }
                html[data-theme="dark"] .ht-related-tab-li.is-active a {
                    color: #00d1b2 !important;
                    border-bottom-color: #00d1b2 !important;
                }
                
                /* 独立内容面板 */
                .ht-related-content-panel {
                    margin-top: 20px;
                    padding: 15px;
                    border: 1px solid rgba(128,128,128,0.15);
                    border-radius: 8px;
                    background: rgba(128,128,128,0.02);
                }
                html[data-theme="dark"] .ht-related-content-panel {
                    border-color: rgba(255,255,255,0.1);
                    background: rgba(255,255,255,0.02);
                }
        
                /* 列表项样式 */
                .ht-related-item {
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(128,128,128,0.1);
                }
                .ht-related-item:last-child { border-bottom: none; }
                .ht-related-item-title {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                }
                .ht-related-index {
                    color: #999;
                    font-size: 12px;
                    flex-shrink: 0;
                }
                .ht-related-item-title a {
                    color: #3273dc;
                    text-decoration: none;
                    font-weight: 500;
                    font-size: 14px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .ht-related-item-title a:hover { text-decoration: underline; }
                .ht-related-meta {
                    display: flex;
                    gap: 16px;
                    margin-top: 4px;
                    font-size: 12px;
                    color: #888;
                    flex-wrap: wrap;
                }
                .ht-related-load-more {
                    display: block;
                    width: 100%;
                    padding: 10px;
                    margin-top: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    background: #f9f9f9;
                    cursor: pointer;
                    font-size: 13px;
                    text-align: center;
                    transition: background 0.2s;
                }
                .ht-related-load-more:hover { background: #eee; }
                .ht-related-empty, .ht-related-loading {
                    text-align: center;
                    color: #999;
                    padding: 20px 0;
                    font-size: 13px;
                }
                
                /* 暗色模式适配 */
                html[data-theme="dark"] .ht-related-item { border-bottom-color: rgba(255,255,255,0.08); }
                html[data-theme="dark"] .ht-related-item-title a { color: #00d1b2; }
                html[data-theme="dark"] .ht-related-meta { color: #999; }
                html[data-theme="dark"] .ht-related-load-more { background: #2a2a2a; border-color: #444; color: #ccc; }
                html[data-theme="dark"] .ht-related-load-more:hover { background: #333; }
                `;
            }
        
        // 🚀 搜索栏深度美化（受 beautifySearchBar 开关控制）
        if (config.beautifySearchBar) {
            styles += `
                /* 核心修复：隐藏网站自带 has-left-sep 左侧分隔竖线（美化加间距后它会悬空暴露） */
                .search-panel .control.has-left-sep {
                    border-left: none !important;
                    padding-left: 0 !important;
                    margin-left: 0 !important;
                }
                .search-panel .control.has-left-sep::before,
                .search-panel .control.has-left-sep::after {
                    display: none !important;
                    content: none !important;
                }
                /* 整体容器：毛玻璃背景与悬浮阴影 */
                .search-bar-wrap {
                    padding: 12px 16px !important;
                    background: rgba(255, 255, 255, 0.65);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-radius: 16px !important;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    transition: all 0.3s ease;
                }
                /* 强制使用 flex 布局并增加间距，打破 Bulma 默认的紧凑粘连 */
                .search-panel.field.has-addons {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    margin-bottom: 0 !important;
                }
                .search-panel .control { margin-right: 0 !important; }
                
                /* 核心：强制覆盖 Bulma has-addons 的圆角清除机制，让每个组件都有独立圆角 */
                .search-panel .control .input,
                .search-panel .control .select select,
                .search-panel .control .button {
                    border-radius: 10px !important;
                    height: 42px !important;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }

                /* 下拉框样式 */
                .search-type .select select {
                    border: 1px solid #e0e0e0;
                    background-color: #f8f9fa;
                    font-weight: 500;
                    color: #4a4a4a;
                    padding-left: 12px;
                    padding-right: 30px;
                }
                .search-type .select select:hover { border-color: #3273dc; }
                .search-type .select::after { border-color: #3273dc !important; }

                /* 输入框样式与聚焦发光效果 */
                .search-input .input {
                    border: 1px solid #e0e0e0;
                    background-color: #f8f9fa;
                    font-size: 15px;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
                }
                .search-input .input:focus {
                    border-color: #3273dc;
                    background-color: #fff;
                    box-shadow: 0 0 0 3px rgba(50, 115, 220, 0.15), inset 0 1px 2px rgba(0,0,0,0.02);
                    outline: none;
                }

                /* 高级搜索按钮 (次级按钮风格) */
                .advanced-search .button {
                    width: 42px !important;
                    padding: 0 !important;
                    background: #f8f9fa;
                    border: 1px solid #e0e0e0;
                    color: #666;
                }
                .advanced-search .button:hover {
                    background: #e9ecef;
                    border-color: #3273dc;
                    color: #3273dc;
                    transform: translateY(-1px);
                }
                .advanced-search .button .icon { margin: 0 !important; font-size: 18px; letter-spacing: 1px; }

                /* 搜索提交按钮 (主色调渐变 + 悬停上浮) */
                .search-submit .button {
                    padding: 0 24px !important;
                    font-weight: 600;
                    font-size: 15px;
                    background: linear-gradient(135deg, #3273dc 0%, #2366d1 100%);
                    border: none !important;
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(50, 115, 220, 0.3);
                }
                .search-submit .button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(50, 115, 220, 0.45);
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                }
                .search-submit .button:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 6px rgba(50, 115, 220, 0.3);
                }

                /* ============ 暗色模式完美适配 ============ */
                html[data-theme="dark"] .search-bar-wrap {
                    background: rgba(30, 30, 30, 0.65);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                }
                html[data-theme="dark"] .search-type .select select,
                html[data-theme="dark"] .search-input .input,
                html[data-theme="dark"] .advanced-search .button {
                    background-color: #2a2a2a;
                    border-color: #444;
                    color: #ddd;
                }
                html[data-theme="dark"] .search-input .input:focus {
                    background-color: #333;
                    border-color: #00d1b2;
                    box-shadow: 0 0 0 3px rgba(0, 209, 178, 0.2);
                }
                html[data-theme="dark"] .search-type .select::after { border-color: #00d1b2 !important; }
                html[data-theme="dark"] .advanced-search .button:hover {
                    background: #333;
                    border-color: #00d1b2;
                    color: #00d1b2;
                }
                html[data-theme="dark"] .search-submit .button {
                    background: linear-gradient(135deg, #00d1b2 0%, #00bfa5 100%);
                    color: #000;
                    box-shadow: 0 4px 12px rgba(0, 209, 178, 0.2);
                }
                html[data-theme="dark"] .search-submit .button:hover {
                    background: linear-gradient(135deg, #00e6c3 0%, #00d1b2 100%);
                    box-shadow: 0 6px 16px rgba(0, 209, 178, 0.35);
                }
            `;
        }
  
        // 立即通过 CSS 隐藏应用推广横幅（彻底隐藏），防止刷新时短暂显示；同时自动点击其关闭按钮，让网站写入 30 天免打扰 cookie(hide_app_banner_v2)    
        if (config.hideBanner) {    
            styles += "aside.app-banner, nav.app-desktop-banner { display: none !important; }";    
        }

        // 立即通过 CSS 隐藏年龄验证弹窗（透明化、禁止用户交互），防止新开标签页时短暂显示    
        if (config.autoClickAge) {    
            styles += "div.modal.is-active.over18-modal { opacity: 0 !important; pointer-events: none !important; }";    
        }    
  
        // 立即通过 CSS 隐藏会员专属控件相关清单、可播放、中字可播放（彻底隐藏），防止刷新时短暂显示
        if (config.hideVipItems) {    
            styles += `
                li[data-movie-tab-target="listTab"] { display: none !important; }
                li > a[href*="?f=playable"] { display: none !important; }
                a.button.is-small[href*="vft=4"][href*="vst=3"] { display: none !important; }
                a.button.is-small[href*="vft=5"][href*="vst=3"] { display: none !important; }
            `;
            // 当"评论与磁链增强"开启时，不隐藏‘更多短评需VIP或App查看’控件
            if (!config.loadReviews) {    
                styles += "dt.review-item.more.has-text-link { display: none !important; }";    
            }
        }    
  
        // 立即通过 CSS 隐藏页脚导航栏（彻底隐藏），防止刷新时短暂显示    
        if (config.hideFooter) {    
            styles += "nav#footer.navbar { display: none !important; }";    
        }    
  
        // 立即通过 CSS 隐藏右下角悬浮按钮"磁链下载"、"TOP"（彻底隐藏），防止刷新时短暂显示    
        if (config.hideFloatButtons) {    
            styles += "div.float-buttons { display: none !important; }";    
        }
  
        // 立即通过 CSS 隐藏支付记录链接（彻底隐藏），防止刷新时短暂显示    
        if (config.hidePaymentLog) {    
            styles += 'a[href="/users/transaction_logs"] { display: none !important; }';    
        }    
  
        // 立即通过 CSS 隐藏成为VIP及其前缀逗号和空格（彻底隐藏），防止刷新时短暂显示    
        if (config.hideVipLink) {    
            styles += 'a[href="/plans"]{display:none!important}';    
        }    
  
        // 立即通过 CSS 隐藏顶部"反馈"入口（彻底隐藏），防止刷新时短暂显示    
        if (config.hideFeedback) {    
            styles += 'a[href="/feedbacks/new"] { display: none !important; }';    
        }    
  
        // 立即通过 CSS 隐藏顶部"ThePornDude"入口（彻底隐藏），防止刷新时短暂显示    
        if (config.hideTheporndude) {    
            styles += 'a[href="https://theporndude.com/zh"] { display: none !important; }';    
        }
        
        // 立即通过 CSS 隐藏顶部"AI色色女友💋"入口（彻底隐藏），防止刷新时短暂显示    
        if (config.hideAISexyGirlfriend) {
            document.querySelectorAll('a.navbar-item').forEach(a => {
                if (a.textContent.includes('AI色色女友')) {
                    a.style.display = 'none';
                }
            });
        }
        
        // 立即通过 CSS 隐藏顶部全局条和磁链页顶部功能区（彻底隐藏），防止刷新时短暂显示
        if (config.hideTopNavExtras) {
            styles += `
                /* 顶部全局条：域名、App、公告 */
                nav.sub-header { display: none !important; }
                /* 磁链页顶部功能区：官方App/加入TG频道推广按钮 */
                div.top-meta { display: none !important; }
            `;
        }
  
        // 立即通过 CSS 隐藏搜索栏下方的热搜关键词区域（彻底隐藏），防止刷新时短暂显示
        if (config.hideSearchKeywords) {
            styles += `
                div.search-recent-keywords {
                    display: none !important;
                }
            `;
        }

        // 立即通过 CSS 隐藏提交磁链控件（彻底隐藏），防止刷新时短暂显示
        if (config.hideMagnetSubmit) {
            styles += `
                div.submit-magnet { display: none !important; }
                a.navbar-item[href="/users/magnet_submissions"] { display: none !important; }
            `;
        }
        
        // 为分页样式优化并添加跳转到指定页码功能，按钮风格自动适配网站主题(light/dark/auto）  
        if (config.paginationJump) {    
            styles += `    
                /* 分页容器样式优化 - 不改变原有结构 */    
                ul.pagination-list {    
                    display: flex;    
                    gap: 6px;    
                    justify-content: center;    
                    align-items: center;    
                    padding: 10px 0;    
                }    
      
                /* 所有分页按钮统一外观（包括移动后的上一页/下一页） */    
                .pagination-link {    
                    padding: 6px 12px;    
                    border-radius: 8px;    
                    border: 1px solid #ddd;    
                    color: #333;    
                    background-color: #fff;    
                    transition: all 0.2s ease;    
                    font-weight: 500;    
                    font-size: 14px;    
                }    
      
                /* 鼠标悬停效果 */    
                .pagination-link:hover {    
                    background-color: #f0f0f0;    
                    border-color: #bbb;    
                    color: #111;    
                }    
      
                /* 当前页样式突出 */    
                .pagination-link.is-current {    
                    background-color: #3273dc !important;    
                    color: white !important;    
                    border-color: #3273dc !important;    
                    font-weight: bold;    
                    box-shadow: 0 2px 6px rgba(50,115,220,0.3);    
                    cursor: default;    
                }    
      
                /* 省略号样式微调 */    
                .pagination-ellipsis {    
                    color: #888;    
                    padding: 0 6px;    
                    font-size: 16px;    
                    user-select: none;    
                }    
      
                /* 跳页输入框样式 */    
                .pagination-jump {    
                    display: flex;    
                    align-items: center;    
                    gap: 6px;    
                    margin-left: 10px;    
                }    
      
                .pagination-jump input {    
                    width: 60px;    
                    padding: 5px 6px;    
                    border: 1px solid #ccc;    
                    border-radius: 6px;    
                    font-size: 14px;    
                    outline: none;    
                }    
      
                .pagination-jump button {    
                    padding: 5px 10px;    
                    font-size: 14px;    
                    border: 1px solid #ccc;    
                    border-radius: 6px;    
                    background-color: #f5f5f5;    
                    cursor: pointer;    
                    transition: background-color 0.2s;    
                }    
      
                .pagination-jump button:hover {    
                    background-color: #e0e0e0;    
                }    
      
                /* 隐藏原位置的上一页/下一页按钮（因为我们会移动它们到ul中） */    
                .pagination-previous:not(.pagination-link),    
                .pagination-next:not(.pagination-link) {    
                    display: none !important;    
                }    
      
                /* 移动后的上一页/下一页按钮样式统一（添加 .pagination-link 类后生效） */    
                .pagination-previous.pagination-link,    
                .pagination-next.pagination-link {    
                    margin: 0 3px; /* 紧邻跳转按钮和彼此 */    
                }    
      
                /* 暗色模式适配（自动检测） */    
                @media (prefers-color-scheme: dark) {    
                    .pagination-link {    
                        background-color: #1e1e1e;    
                        color: #ddd;    
                        border-color: #444;    
                    }    
      
                    .pagination-link:hover {    
                        background-color: #2a2a2a;    
                        border-color: #555;    
                        color: #fff;    
                    }    
      
                    .pagination-link.is-current {    
                        background-color: #00bfa5 !important;    
                        color: black !important;    
                        border-color: #00bfa5 !important;    
                    }    
      
                    .pagination-ellipsis {    
                        color: #aaa;    
                    }    
      
                    .pagination-jump input {    
                        background-color: #2c2c2c;    
                        color: #ddd;    
                        border-color: #555;    
                    }
                    .pagination-jump button {    
                        background-color: #444;    
                        color: #ccc;    
                        border-color: #666;    
                    }
                    .pagination-jump button:hover {    
                        background-color: #555;    
                        color: #fff;    
                    }    
                }    
            `;    
        }    
  
        // 手动翻译按钮样式    
        if (config.retryButton) {    
            styles += `    
                /* 手动翻译按钮样式 */    
                .translate-retry-btn {    
                    position: fixed;    
                    right: 20px;    
                    bottom: 20px;    
                    background-color: #3273dc;    
                    color: white;    
                    border: none;    
                    border-radius: 4px;    
                    padding: 8px 12px;    
                    font-size: 14px;    
                    cursor: pointer;    
                    z-index: 9999;    
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);    
                    transition: all 0.3s ease;    
                }
                .translate-retry-btn:hover {    
                    background-color: #2366d1;    
                    transform: translateY(-2px);    
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);    
                }
                .translate-retry-btn.success {    
                    background-color: #48c774;    
                }
                .translate-retry-btn.error {    
                    background-color: #f14668;    
                }
                /* 暗色模式下的手动翻译按钮 */
                html[data-theme="dark"] .translate-retry-btn {    
                    background-color: #00d1b2;    
                    color: #222;    
                }
                html[data-theme="dark"] .translate-retry-btn:hover {    
                    background-color: #00c4a7;    
                }
                html[data-theme="dark"] .translate-retry-btn.success {    
                    background-color: #48c774;    
                }
                html[data-theme="dark"] .translate-retry-btn.error {    
                    background-color: #f14668;    
                }    
            `;    
        }    
  
        // 复制按钮样式（自适应暗色/浅色模式按钮样式）    
        if (config.copyButtons) {    
            styles += `    
                .copy-btn {    
                    background: transparent;    
                    font-size: 13px;    
                    border: 1px solid;    
                    border-radius: 4px;    
                    padding: 2px 6px;    
                    margin-left: 10px;    
                    cursor: pointer;    
                    transition: all 0.2s ease;    
                }
                .copy-btn:hover {    
                    background: #ddd;    
                    color: #000;    
                }
                html[data-theme="dark"] .copy-btn {    
                    color: #ccc;    
                    border-color: #555;    
                }
                html[data-theme="dark"] .copy-btn:hover {    
                    background: #444;    
                    color: #fff;    
                }    
            `;    
        }
        
        // 已下载标记功能及备份面板样式
        if (config.downloadMark) {
            styles += `
                /* 封面标记按钮 */
                .movie-list .cover { position: relative; }
                .dl-mark-btn {
                    position: absolute; top: 6px; right: 6px; z-index: 5;
                    width: 26px; height: 26px; border-radius: 50%;
                    border: 1px solid rgba(255,255,255,.6);
                    background: rgba(0,0,0,.45); color: #fff;
                    font-size: 14px; line-height: 1; cursor: pointer; padding: 0;
                    display: flex; align-items: center; justify-content: center;
                    opacity: .7; transition: all .2s ease;
                }
                .dl-mark-btn:hover { opacity: 1; transform: scale(1.1); }
                .dl-mark-btn.marked { background: #48c774; border-color: #48c774; opacity: .95; }
                html[data-theme="dark"] .dl-mark-btn.marked { background: #00bfa5; border-color: #00bfa5; color: #000; }
                /* 详情页标记按钮（尺寸稍大） */
                .dl-mark-btn-detail { width: 34px; height: 34px; font-size: 18px; top: 10px; right: 10px; }

                /* 已下载列表触发按钮 */
                .javdb-watched-trigger {
                    position: fixed; right: 20px; top: 124px;
                    background: #48c774; color: #fff; border: none; border-radius: 6px;
                    padding: 10px 15px; font-size: 14px; cursor: pointer; z-index: 9998;
                    box-shadow: 0 2px 8px rgba(0,0,0,.2); transition: all .3s;
                }
                .javdb-watched-trigger:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.3); }
                html[data-theme="dark"] .javdb-watched-trigger { background: #00bfa5; color: #000; }

                /* 面板内部通用 */
                .javdb-input {
                    padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box;
                }
                html[data-theme="dark"] .javdb-input { background: #2a2a2a; border-color: #444; color: #ddd; }
                .javdb-settings-section { padding: 20px; border-top: 1px solid #e0e0e0; }
                html[data-theme="dark"] .javdb-settings-section { border-top-color: #333; }
                .javdb-settings-section h3 { margin: 0 0 15px 0; font-size: 16px; color: #333; }
                .javdb-settings-section h4 { margin: 15px 0 10px 0; font-size: 14px; color: #333; }
                html[data-theme="dark"] .javdb-settings-section h3, 
                html[data-theme="dark"] .javdb-settings-section h4 { color: #ddd; }
                .javdb-settings-section p { font-size: 12px; color: #666; margin-bottom: 10px; }
                html[data-theme="dark"] .javdb-settings-section p { color: #888; }

                /* 列表管理区 */
                .watched-add-row, .watched-filter-row { display: flex; gap: 8px; margin-bottom: 10px; }
                .watched-add-row input, .watched-filter-row input {
                    flex: 1; padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px;
                    font-size: 14px; outline: none;
                }
                .watched-list { list-style: none; margin: 0; padding: 0; max-height: 45vh; overflow-y: auto; }
                .watched-item {
                    display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
                    padding: 10px 4px; border-bottom: 1px solid #f0f0f0; width: 100%; box-sizing: border-box;
                }
                .watched-item:last-child { border-bottom: none; }
                .watched-code { font-weight: 600; font-family: Consolas, Menlo, monospace; color: #333; word-break: break-all; }
                .watched-actions { display: flex; gap: 6px; flex-shrink: 0; }
                .watched-actions .javdb-btn { padding: 4px 10px; font-size: 12px; }
                .watched-edit-input { width: 140px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px; }
                .watched-empty { text-align: center; color: #999; padding: 20px 0; font-size: 13px; }

                .watched-info-row { font-size: 12px; color: #888; display: flex; gap: 10px; flex-wrap: wrap; }
                .watched-info-row a { color: #3273dc; text-decoration: none; }
                
                /* 暗色模式 */
                html[data-theme="dark"] .watched-add-row input,
                html[data-theme="dark"] .watched-filter-row input,
                html[data-theme="dark"] .watched-edit-input { background: #2c2c2c; color: #ddd; border-color: #555; }
                html[data-theme="dark"] .watched-item { border-bottom-color: #2a2a2a; }
                html[data-theme="dark"] .watched-code { color: #ddd; }
                html[data-theme="dark"] .watched-info-row a { color: #00d1b2; }
            `;
        }
  
        if (styles) {    
            GM_addStyle(styles);    
        }    
    }  
  
    // 翻译状态记录
    let translationStatus = {
        attempt: 0,
        lastRun: 0,
        success: false
    };  
  
    // 繁体到简体的映射
    const translations = {
        "類別": "类别",
        // 添加更多需要替换的词语
    };  
  
    // 使用逐字符扫描和最长匹配算法替换字符串中的内容
    function replaceWithMapping(text, mapping) {
        if (!text) return "";
        let result = "";
        let i = 0;
        while (i < text.length) {
            let longestMatch = "";
            let replacement = "";
            // 遍历所有映射键，找到当前位置最长的匹配
            for (const key in mapping) {
                if (text.startsWith(key, i) && key.length > longestMatch.length) {
                    longestMatch = key;
                    replacement = mapping[key];
                }
            }
            if (longestMatch) {
                result += replacement;
                i += longestMatch.length;
            } else {
                result += text[i];
                i++;
            }
        }
        return result;
    }  
  
    // 遍历页面中的所有文本节点进行替换（跳过谷歌翻译保护的元素）
    function translateTextNodes(node) {
        if (!config.translation) return;
        // 跳过已被谷歌翻译标记保护的元素及其子树
        if (node.nodeType === Node.ELEMENT_NODE && node.dataset && node.dataset.msProtected === 'true') {
            return;
        }
        if (node.nodeType === Node.TEXT_NODE) {
            node.nodeValue = replaceWithMapping(node.nodeValue, translations);
        } else {
            for (let child of node.childNodes) {
                translateTextNodes(child);
            }
        }
    } 
  
    // 替换输入框的 placeholder 属性
    function translatePlaceholders() {
        if (!config.translation) return;
        const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
        inputs.forEach(input => {
            const placeholder = input.getAttribute('placeholder');
            if (placeholder) {
                input.setAttribute('placeholder', replaceWithMapping(placeholder, translations));
            }
        });
    }  
  
    // 替换网页标题
    function translateTitle() {
        if (!config.translation) return;
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleElement.innerText = replaceWithMapping(titleElement.innerText, translations);
        }
    }  
  
    // 替换提交按钮的 value 和 data-disable-with 属性
    function translateButtonValues() {
        if (!config.translation) return;
        const buttons = document.querySelectorAll('input[type="submit"], button');
        buttons.forEach(button => {
            const value = button.getAttribute('value');
            if (value) {
                button.setAttribute('value', replaceWithMapping(value, translations));
            }
            const disableWith = button.getAttribute('data-disable-with');
            if (disableWith) {
                button.setAttribute('data-disable-with', replaceWithMapping(disableWith, translations));
            }
        });
    }  
  
    // 替换所有鼠标悬停提示的 data-tooltip 属性内容
    function translateTooltipAttributes() {
        if (!config.translation) return;
        const elementsWithTooltip = document.querySelectorAll('[data-tooltip]');
        elementsWithTooltip.forEach(el => {
            const tooltip = el.getAttribute('data-tooltip');
            if (tooltip) {
                el.setAttribute('data-tooltip', replaceWithMapping(tooltip, translations));
            }
        });
    }  
  
    // 翻译带有 title 属性的元素（如 a 标签上的鼠标悬停提示）
    function translateTitleAttributes() {
        if (!config.translation) return;
        const elementsWithTitle = document.querySelectorAll('[title]');
        elementsWithTitle.forEach(el => {
            const titleAttr = el.getAttribute('title');
            
            // 兼容 JAV-JHS脚本: 保留此元素的 'title="複製番號"' 不翻译，确保其脚本能正常工作。
            if (titleAttr === '複製番號') {
                return;
            }
            
            if (titleAttr) {
                el.setAttribute('title', replaceWithMapping(titleAttr, translations));
            }
        });
    }  
  
    // 翻译带有 data-confirm 属性的元素（如登出确认提示）
    function translateDataConfirmAttributes() {
        if (!config.translation) return;
        const elementsWithDataConfirm = document.querySelectorAll('[data-confirm]');
        elementsWithDataConfirm.forEach(el => {
            const confirmText = el.getAttribute('data-confirm');
            if (confirmText) {
                el.setAttribute('data-confirm', replaceWithMapping(confirmText, translations));
            }
        });
    }  
  
    // 使用 setInterval 高频检查并极速自动点击年龄验证"是,我已滿18歲"按钮
    function autoClickAgeVerificationFast() {
        if (!config.autoClickAge) return;
        const interval = setInterval(() => {
            const btn = document.querySelector('div.modal.is-active.over18-modal a.button.is-success.is-large');
            if (btn) {
                btn.click();
                clearInterval(interval);
            }
        }, 10); // 每 10 毫秒检查一次
    }

    // 使用 setInterval 高频检查并极速自动点击底部APP下载推广横幅的关闭按钮（对齐自动关闭年龄验证的实现）
    // 网站控制器(app-banner#close)点击后写入 hide_app_banner_v2 cookie(30天)并隐藏横幅；
    // 若点击时 Stimulus 控制器尚未接管则点击无效，故持续补点，直到 cookie 写入或超时
    function autoClickAppBannerCloseFast() {
        if (!config.hideBanner) return;
        if (autoClickAppBannerCloseFast._timer) return;
        const started = Date.now();
        let lastClick = 0;
        const interval = setInterval(() => {
            // cookie 已写入（此前关闭过或本次点击已生效）→ 横幅不会再显示，停止检查
            if (document.cookie.includes('hide_app_banner_v2=')) {
                clearInterval(interval);
                autoClickAppBannerCloseFast._timer = null;
                return;
            }
            const btn = document.querySelector('aside.app-banner .app-banner-close');
            if (btn && Date.now() - lastClick >= 100) {
                lastClick = Date.now();
                btn.click();
            }
            // 30 秒仍未成功则停止，避免无限轮询；横幅后续动态出现时由 DOM 观察者重新启动
            if (Date.now() - started > 30000) {
                clearInterval(interval);
                autoClickAppBannerCloseFast._timer = null;
            }
        }, 10); // 每 10 毫秒检查一次
        autoClickAppBannerCloseFast._timer = interval;
    }  
  
    // 将会员专属的"在线观看"功能封面修复为普通封面
    function fixMemberExclusiveVideo() {
        if (!config.fixVipCover) return;
        document.querySelectorAll('div.column-video-cover').forEach(div => {
            const a = div.querySelector('a.cover-container');
            const img = div.querySelector('img.video-cover');
            if (a && img) {
                const href = a.getAttribute('href');
                if (href && href.includes('/play')) { // 只替换包含/play的链接，确保是在线观看
                    const imgUrl = img.src;
                    const newA = document.createElement('a');
                    newA.setAttribute('data-fancybox', 'gallery');
                    newA.href = imgUrl;
                    const newImg = document.createElement('img');
                    newImg.src = imgUrl;
                    newImg.className = 'video-cover';
                    newA.appendChild(newImg);
                    div.innerHTML = '';
                    div.appendChild(newA);
                }
            }
        });
    }  

    function createCopyButton(text, contentToCopy) {
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = text;
        btn.title = '点击复制';
        
        // 如果提供了固定内容，设置点击事件（用于系列、导演等）
        if (contentToCopy) {
            btn.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(contentToCopy).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = '✅ 已复制';
                    setTimeout(() => btn.textContent = originalText, 1000);
                }).catch(() => {
                    console.error('复制失败');
                });
            };
        }
        // 对于标题复制按钮，contentToCopy 为空，点击事件在 addCopyButtons 中单独设置
        
        return btn;
    }

    // 自动恢复原标题，干掉"显示原标题"按钮
    function fixOriginTitle() {
        if (!config.showOriginTitle) return;
        
        document.querySelectorAll('h2.title.is-4').forEach(h2 => {
            const showOriginBtn = h2.querySelector('a[data-movie-detail-target="showOriginTitle"]');
            const originTitleSpan = h2.querySelector('span.origin-title');
            const currentTitle = h2.querySelector('strong.current-title');
            
            if (showOriginBtn && originTitleSpan && currentTitle) {
                currentTitle.textContent = originTitleSpan.textContent.trim();
                showOriginBtn.remove();
                originTitleSpan.remove();
            }
        });
    }

    // 添加复制按钮功能（自适应暗色/浅色模式按钮样式）
    function addCopyButtons() {
        if (!config.copyButtons) return;
        
        // 标题结构（番号+标题）- 只在没有复制按钮时才创建
        const titleH2 = document.querySelector('h2.title.is-4');
        const idStrong = titleH2 ? titleH2.querySelector('strong:first-child') : null;
        const currentTitle = titleH2 ? titleH2.querySelector('strong.current-title') : null;
        
        if (titleH2 && idStrong && currentTitle && !titleH2.querySelector('#copy-full-title-btn')) {
            // 创建复制按钮，但先不设置内容（会在点击时动态获取）
            const btn = createCopyButton('📋 复制标题', '');
            btn.id = 'copy-full-title-btn';
            
            // 在点击时动态获取当前显示的标题内容
            btn.onclick = (e) => {
                e.stopPropagation();
                
                // 动态获取当前显示的标题内容
                const currentId = titleH2.querySelector('strong:first-child')?.textContent.trim() || '';
                const currentTitleText = titleH2.querySelector('strong.current-title')?.textContent.trim() || '';
                const contentToCopy = `${currentId} ${currentTitleText}`.trim();
                
                navigator.clipboard.writeText(contentToCopy).then(() => {
                    const originalText = btn.textContent;
                    btn.textContent = '✅ 已复制';
                    setTimeout(() => btn.textContent = originalText, 1000);
                }).catch(() => {
                    console.error('复制失败');
                });
            };
            
            titleH2.appendChild(btn);
        }
        
        // 系列、导演等结构（动态识别subtitle）
        document.querySelectorAll('h2.title.is-4').forEach(h2 => {
            const subtitle = h2.querySelector('span.section-subtitle');
            const name = h2.querySelector('span.section-name');
            if (subtitle && name && !h2.querySelector('.copy-btn')) {
                const label = subtitle.textContent.trim();
                const content = name.textContent.trim();
                const btn = createCopyButton(`📋 复制${label}`, content);
                h2.appendChild(btn);
            }
        });
        
        applyButtonTheme(); // 添加按钮后也应用主题
    }
      
    function applyButtonTheme() {
        if (!config.copyButtons) return;
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.style.background = 'transparent';
            btn.style.fontSize = '13px';
            btn.style.border = '1px solid';
            btn.style.borderRadius = '4px';
            btn.style.padding = '2px 6px';
            btn.style.marginLeft = '10px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s ease';
            if (theme === 'dark') {
                btn.style.color = '#ccc';
                btn.style.borderColor = '#555';
            } else {
                btn.style.color = '#333';
                btn.style.borderColor = '#aaa';
            }
            btn.onmouseenter = () => {
                if (theme === 'dark') {
                    btn.style.background = '#444';
                    btn.style.color = '#fff';
                } else {
                    btn.style.background = '#ddd';
                    btn.style.color = '#000';
                }
            };
            btn.onmouseleave = () => {
                btn.style.background = 'transparent';
                if (theme === 'dark') {
                    btn.style.color = '#ccc';
                } else {
                    btn.style.color = '#333';
                }
            };
        });
    }  
  
    function observeThemeChange() {
        if (!config.copyButtons) return;
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'data-theme') {
                    applyButtonTheme();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }  
  
    // 添加跳转到指定页并移动上一页/下一页功能
    function enhancePaginationJump() {
        if (!config.paginationJump) return;  
  
        const pagination = document.querySelector('nav.pagination');    
        if (!pagination) return;    
  
        const paginationList = pagination.querySelector('ul.pagination-list');    
        if (!paginationList) return;    
  
        // 检查是否已经添加了跳转功能和移动了按钮    
        if (paginationList.querySelector('.pagination-jump') &&    
            paginationList.querySelector('.moved-pagination-prev') &&    
            paginationList.querySelector('.moved-pagination-next')) {    
            return;    
        }    
  
        // 添加跳转功能（如果不存在）    
        let jumpLi = paginationList.querySelector('.pagination-jump');    
        if (!jumpLi) {    
            jumpLi = document.createElement('li');    
            jumpLi.className = 'pagination-jump';    
  
            const input = document.createElement('input');    
            input.type = 'number';    
            input.min = '1';    
            // 输入框内的文字已移除，保持为空白；title 保留提示    
            input.title = '跳转到指定页码';    
  
            const btn = document.createElement('button');    
            btn.textContent = '跳转';    
            btn.onclick = (e) => {    
                e.preventDefault();    
                const val = parseInt(input.value);    
                if (!isNaN(val) && val > 0) {    
                    const url = new URL(location.href);    
                    url.searchParams.set('page', val);    
                    location.href = url.toString();    
                }    
            };    
  
            jumpLi.appendChild(input);    
            jumpLi.appendChild(btn);    
  
            // 插入到列表末尾（在省略号或其他最后一个li之后）    
            const lastLi = paginationList.querySelector('li:last-child');    
            if (lastLi) {    
                paginationList.insertBefore(jumpLi, lastLi.nextSibling);    
            } else {    
                paginationList.appendChild(jumpLi);    
            }    
        }    
  
        // 移动上一页按钮    
        let prevBtn = pagination.querySelector('.pagination-previous');    
        if (prevBtn && !paginationList.querySelector('.moved-pagination-prev')) {    
            // 创建li容器并移动按钮    
            const prevLi = document.createElement('li');    
            prevLi.className = 'moved-pagination-prev';    
            prevBtn.classList.add('pagination-link'); // 统一样式    
            prevBtn.classList.remove('pagination-previous'); // 移除原类避免冲突    
            prevLi.appendChild(prevBtn);    
  
            // 插入到跳转li之后（紧邻右侧）    
            paginationList.insertBefore(prevLi, jumpLi.nextSibling);    
        }    
  
        // 移动下一页按钮    
        let nextBtn = pagination.querySelector('.pagination-next');    
        if (nextBtn && !paginationList.querySelector('.moved-pagination-next')) {    
            // 创建li容器并移动按钮    
            const nextLi = document.createElement('li');    
            nextLi.className = 'moved-pagination-next';    
            nextBtn.classList.add('pagination-link'); // 统一样式    
            nextBtn.classList.remove('pagination-next'); // 移除原类避免冲突    
            nextLi.appendChild(nextBtn);    
  
            // 插入到上一页li之后（紧邻上一页右侧，确保上一页和下一页紧邻）    
            const movedPrevLi = paginationList.querySelector('.moved-pagination-prev');    
            if (movedPrevLi) {    
                paginationList.insertBefore(nextLi, movedPrevLi.nextSibling);    
            } else {    
                // 如果没有上一页，紧邻在跳转li之后    
                paginationList.insertBefore(nextLi, jumpLi.nextSibling);    
            }    
  
            // 如果有上一页但插入位置不对，调整    
            if (movedPrevLi && movedPrevLi.nextSibling !== nextLi) {    
                paginationList.insertBefore(nextLi, movedPrevLi.nextSibling);    
            }    
        }    
    }  
  
    // 翻译主函数 - 执行所有翻译任务
    function runTranslation() {
        if (!config.translation) return true;
        try {
            translationStatus.attempt++;
            translationStatus.lastRun = Date.now();
            if (document.body) {
                translateTextNodes(document.body);
                translatePlaceholders();
                translateTitle();
                translateButtonValues();
                translateTooltipAttributes();
                translateTitleAttributes();
                translateDataConfirmAttributes(); // 确保登出确认提示被替换
            }
            translationStatus.success = true;
            if (config.retryButton) {
                updateRetryButton('success');
                // 3秒后恢复按钮状态
                setTimeout(() => {
                    updateRetryButton('normal');
                }, 3000);
            }
            return true;
        } catch (error) {
            console.error("翻译过程出错:", error);
            translationStatus.success = false;
            if (config.retryButton) {
                updateRetryButton('error');
                // 3秒后恢复按钮状态
                setTimeout(() => {
                    updateRetryButton('normal');
                }, 3000);
            }
            return false;
        }
    }  
  
    // 自动重试机制
    function setupAutoRetry() {
        if (!config.translation) return;
        // 首次翻译失败后，尝试再次翻译（最多3次）
        const retryInterval = setInterval(() => {
            // 如果已经成功翻译或者已经尝试了3次，则停止重试
            if (translationStatus.success || translationStatus.attempt >= 3) {
                clearInterval(retryInterval);
                return;
            }
            // 重新运行翻译
            console.log(`自动重试翻译 (第${translationStatus.attempt + 1}次)`);
            runTranslation();
        }, 2000); // 每2秒重试一次
    }  
  
    // 添加手动触发翻译的按钮
    function addRetryButton() {
        // 翻译功能关闭时，即使重试按钮开关为true也不显示
        if (!config.translation || !config.retryButton) {
            const existingBtn = document.querySelector('.translate-retry-btn');
            if (existingBtn) existingBtn.remove();
            return;
        }
        if (document.querySelector('.translate-retry-btn')) return;
        const btn = document.createElement('button');
        btn.className = 'translate-retry-btn';
        btn.textContent = '重新翻译';
        btn.title = '点击重新执行简体中文翻译';
        btn.onclick = () => {
            btn.textContent = '翻译中...';
            btn.disabled = true;
            setTimeout(() => {
                runTranslation();
                btn.disabled = false;
            }, 100);
        };
        document.body.appendChild(btn);
    }
  
    // 更新重试按钮状态
    function updateRetryButton(status) {
        if (!config.translation || !config.retryButton) return;
        const btn = document.querySelector('.translate-retry-btn');
        if (!btn) return;
        btn.classList.remove('success', 'error');
        switch (status) {
            case 'success':
                btn.classList.add('success');
                btn.textContent = '翻译成功!';
                break;
            case 'error':
                btn.classList.add('error');
                btn.textContent = '翻译失败!';
                break;
            default:
                btn.textContent = '重新翻译';
                break;
        }
    } 
  
    // 监听搜索类型下拉框的变化，确保当用户切换类型后，更新后的输入框的 placeholder 属性能被翻译成简体中文
    function attachSearchTypeListener() {
        if (!config.translation) return;
        const searchTypeSelect = document.getElementById('search-type');
        if (searchTypeSelect) {
            searchTypeSelect.addEventListener('change', () => {
                // 延迟确保 placeholder 已更新
                setTimeout(translatePlaceholders, 0);
            });
        }
    }  
  
    // 恢复原始MutationObserver，但添加安全检查以避免错误（针对隐藏VIP链接的逗号修复）
    function setupVipLinkObserver() {
        if (!config.hideVipLink) return;
        new MutationObserver(() => {
            let n = document.querySelector('a[href="/plans"]');
            if(n) n.previousSibling?.nodeType===3&&(n.previousSibling.textContent=n.previousSibling.textContent.replace(/[,，]\s*$/, ''));
        }).observe(document.body || document, {childList: true, subtree: true});
    }  

    // ==================== 503 自动重载 ====================
    // 网站返回 "503 Service Temporarily Unavailable" (openresty) 错误页时，
    // 倒计时后自动重载重试；时间窗口内限制重试次数，防止无限刷新。
    const RELOAD_503_MAX = 5;                 // 统计窗口内最大自动重载次数
    const RELOAD_503_WINDOW = 5 * 60 * 1000;  // 重载次数统计窗口（5分钟）
    const RELOAD_503_DELAY = 5;               // 重载前倒计时秒数
    const RELOAD_503_STATE_KEY = 'javdb_503_reload_state';

    function get503State() {
        try {
            const raw = sessionStorage.getItem(RELOAD_503_STATE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) { /* sessionStorage 不可用时忽略 */ }
        return { count: 0, firstTime: 0 };
    }

    function set503State(state) {
        try { sessionStorage.setItem(RELOAD_503_STATE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function clear503State() {
        try { sessionStorage.removeItem(RELOAD_503_STATE_KEY); } catch (e) {}
    }

    // 判断当前页面是否为503错误页（标题/正文特征 + 正文极短，防止误判正常页面）
    function is503ErrorPage() {
        const title = document.title || '';
        const titleHit = /503/.test(title) && /Service\s+Temporarily\s+Unavailable/i.test(title);
        const body = document.body;
        if (!body) return titleHit;
        const text = (body.textContent || '').replace(/\s+/g, ' ').trim();
        const bodyHit = /503\s+Service\s+Temporarily\s+Unavailable/i.test(text) &&
                        /openresty/i.test(text) &&
                        text.length < 200;
        return titleHit || bodyHit;
    }

    // 503 提示浮层（倒计时 / 达到上限时附带手动重载按钮）
    function render503Overlay(message, withReloadBtn) {
        let box = document.getElementById('javdb-503-reload-box');
        if (!box) {
            box = document.createElement('div');
            box.id = 'javdb-503-reload-box';
            box.style.cssText = 'position:fixed;top:14px;right:14px;z-index:2147483647;background:#3273dc;color:#fff;padding:10px 16px;border-radius:8px;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;gap:10px;';
            (document.body || document.documentElement).appendChild(box);
        }
        box.innerHTML = '';
        const span = document.createElement('span');
        span.textContent = message;
        box.appendChild(span);
        if (withReloadBtn) {
            const btn = document.createElement('button');
            btn.textContent = '立即重载';
            btn.style.cssText = 'background:#fff;color:#3273dc;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;font-size:13px;';
            btn.onclick = () => { set503State({ count: 0, firstTime: Date.now() }); location.reload(); };
            box.appendChild(btn);
        }
        return box;
    }

    // 入口：检测503 + 倒计时自动重载
    function setupAutoReloadOn503() {
        if (!config.autoReload503) return;

        const startCheck = () => {
            // 正常页面：清零重试计数，之后若再遇到503可重新自动重试
            if (!is503ErrorPage()) {
                clear503State();
                return;
            }

            const now = Date.now();
            const state = get503State();
            if (!state.firstTime || now - state.firstTime > RELOAD_503_WINDOW) {
                state.count = 0;
                state.firstTime = now;
            }

            // 达到上限：不再自动刷新，只提供手动按钮
            if (state.count >= RELOAD_503_MAX) {
                render503Overlay(`⚠️ 503 重试已达上限(${RELOAD_503_MAX}次)，请稍后再试`, true);
                return;
            }

            state.count += 1;
            set503State(state);

            let left = RELOAD_503_DELAY;
            render503Overlay(`⚠️ 503 服务不可用，${left}s 后自动重载（第 ${state.count}/${RELOAD_503_MAX} 次）`);
            const timer = setInterval(() => {
                left -= 1;
                if (left <= 0) {
                    clearInterval(timer);
                    location.reload();
                } else {
                    render503Overlay(`⚠️ 503 服务不可用，${left}s 后自动重载（第 ${state.count}/${RELOAD_503_MAX} 次）`);
                }
            }, 1000);
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(startCheck, 300));
        } else {
            setTimeout(startCheck, 300);
        }
    }

    // ==================== 已下载标记功能 ====================
    const WATCHED_KEY = 'javdb_watched_codes';
    let watchedList = []; // 现为对象数组: [{code, url, series, markTime}]
    let watchedSet = new Set();
    let watchedUI = null;

    function loadWatched() {
        try {
            const raw = GM_getValue(WATCHED_KEY, null);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) parsed = [];
            // 兼容旧版纯字符串数组数据
            watchedList = parsed.map(item => {
                if (typeof item === 'string') {
                    return { code: item.toUpperCase(), url: '', series: '', markTime: Date.now() };
                }
                return {
                    code: String(item.code || '').toUpperCase(),
                    url: item.url || '',
                    series: item.series || '',
                    markTime: item.markTime || Date.now()
                };
            });
        } catch (e) { watchedList = []; }
        watchedSet = new Set(watchedList.map(item => item.code));
    }

    function saveWatched() {
        GM_setValue(WATCHED_KEY, JSON.stringify(watchedList));
        watchedSet = new Set(watchedList.map(item => item.code));
        publishWatchedSync(); // 通知其他标签页同步最新数据，防止互相覆盖
        updateWatchedTriggerCount();
        refreshAllMarkBtns();
    }

    // ---------- 跨标签页数据同步（防止多标签页互相覆盖） ----------
    const WATCHED_SYNC_KEY = 'javdb_watched_sync_bus';

    // 保存后向其他标签页广播最新数据
    function publishWatchedSync() {
        try {
            localStorage.setItem(WATCHED_SYNC_KEY, JSON.stringify({ ts: Date.now(), list: watchedList }));
        } catch (e) { /* localStorage 不可用时忽略 */ }
    }

    // 收到其他标签页的数据后，更新内存与界面（注意：只更新，不再次保存，避免死循环）
    function applyRemoteWatchedList(list) {
        if (!Array.isArray(list)) return;
        watchedList = list;
        watchedSet = new Set(watchedList.map(item => item.code));
        refreshAllMarkBtns();
        updateWatchedTriggerCount();
        if (watchedUI && watchedUI.panel.classList.contains('active')) renderWatchedList();
    }

    function setupWatchedSync() {
        // 通道1：GM 值变化监听（跨标签页，甚至跨不同 javdb 域名）
        if (typeof GM_addValueChangeListener === 'function') {
            GM_addValueChangeListener(WATCHED_KEY, (name, oldVal, newVal, remote) => {
                if (!remote || !newVal) return; // 只处理来自其他标签页的变化
                try { applyRemoteWatchedList(JSON.parse(newVal)); } catch (e) {}
            });
        }
        // 通道2：localStorage storage 事件（同域名跨标签页兜底同步）
        window.addEventListener('storage', (e) => {
            if (e.key !== WATCHED_SYNC_KEY || !e.newValue) return;
            try {
                const payload = JSON.parse(e.newValue);
                if (payload && Array.isArray(payload.list)) applyRemoteWatchedList(payload.list);
            } catch (err) {}
        });
    }

    function addWatched(code, url = '', series = '') {
        code = String(code || '').trim().toUpperCase();
        if (!code || watchedSet.has(code)) return false;
        watchedList.unshift({ code, url, series, markTime: Date.now() });
        saveWatched();
        return true;
    }

    function removeWatched(code) {
        code = String(code || '').trim().toUpperCase();
        const idx = watchedList.findIndex(item => item.code === code);
        if (idx === -1) return false;
        watchedList.splice(idx, 1);
        saveWatched();
        return true;
    }

    function updateWatched(oldCode, newData) {
        oldCode = String(oldCode || '').trim().toUpperCase();
        const idx = watchedList.findIndex(item => item.code === oldCode);
        if (idx === -1) return false;
        const newCode = String(newData.code || '').trim().toUpperCase();
        if (newCode !== oldCode && watchedSet.has(newCode)) {
            watchedList.splice(idx, 1);
        } else {
            watchedList[idx] = { ...watchedList[idx], ...newData, code: newCode };
        }
        saveWatched();
        return true;
    }

    // 判断搜索词是否为番号（如 RCTD-625 / rctd625 / RCTD 625）
    function isCodeLikeQuery(q) {
        return /^[A-Za-z]{2,10}[-_\s]?\d{1,6}$/.test(String(q || '').trim());
    }

    // 详情页提取番号（优先番号复制按钮的 data-clipboard-text，最干净）
    function extractDetailCode() {
        const copyBtn = document.querySelector('a.copy-to-clipboard[data-clipboard-text]');
        if (copyBtn && copyBtn.getAttribute('data-clipboard-text')) {
            return copyBtn.getAttribute('data-clipboard-text').trim();
        }
        const h2 = document.querySelector('h2.title.is-4');
        if (h2) {
            const strong = h2.querySelector('strong:first-child');
            if (strong && strong.textContent.trim()) return strong.textContent.trim();
        }
        const m = (document.title || '').match(/[A-Za-z][A-Za-z0-9]*[-_]\d+/);
        return m ? m[0] : '';
    }

    // 详情页提取信息面板的"系列"栏；没有该栏则视为单作品
    function extractDetailSeries() {
        const blocks = document.querySelectorAll('.video-meta-panel .panel-block');
        for (const block of blocks) {
            const strong = block.querySelector('strong');
            if (strong && strong.textContent.replace(/[\s:：]/g, '') === '系列') {
                const valueEl = block.querySelector('.value');
                const name = valueEl ? valueEl.textContent.trim() : '';
                if (name) return `系列: ${name}`;
            }
        }
        return '单作品';
    }

    // 提取当前页面的归属信息（系列/演员/片商/导演/搜索词/单作品）
    function extractCurrentSeries() {
        // 1. 详情页：读取信息面板"系列"栏，无则视为单作品
        if (document.querySelector('.video-detail')) {
            return extractDetailSeries();
        }

        // 2. 列表页明确分类（系列/演员/片商/导演）
        const subTitle = document.querySelector('.section-subtitle');
        const sectionName = document.querySelector('.section-name');
        if (subTitle && sectionName) {
            const label = subTitle.textContent.trim();
            if (['系列', '演员', '片商', '导演'].includes(label)) {
                return `${label}: ${sectionName.textContent.trim()}`;
            }
        }

        // 3. 搜索页：取关键字（优先搜索框，回退 URL ?q=）
        let q = '';
        const searchInput = document.getElementById('video-search');
        if (searchInput && searchInput.value.trim()) {
            q = searchInput.value.trim();
        } else if (window.location.pathname.includes('/search')) {
            q = (new URLSearchParams(window.location.search).get('q') || '').trim();
        }
        if (q) {
            // 直接搜索番号视为单作品
            if (isCodeLikeQuery(q)) return '单作品';
            return `系列: ${q}`;
        }

        return '';
    }

    function extractItemCode(item) {
        const strong = item.querySelector('.video-title strong');
        if (strong && strong.textContent.trim()) return strong.textContent.trim();
        const vt = item.querySelector('.video-title');
        if (vt) {
            const m = vt.textContent.match(/[A-Za-z][A-Za-z0-9]*-\d+/);
            if (m) return m[0];
        }
        return '';
    }

    function refreshMarkBtn(btn, code) {
        const marked = watchedSet.has(code.toUpperCase());
        btn.classList.toggle('marked', marked);
        btn.textContent = '✓';
        btn.title = marked ? `已下载：${code}（点击取消标记）` : `标记 ${code} 为已下载`;
    }

    function refreshAllMarkBtns() {
        document.querySelectorAll('.dl-mark-btn[data-code]').forEach(btn => {
            refreshMarkBtn(btn, btn.getAttribute('data-code'));
        });
    }

    function applyDownloadMarks() {
        if (!config.downloadMark) return;
        const currentSeries = extractCurrentSeries();
        
        document.querySelectorAll('.movie-list .item').forEach(item => {
            if (item.querySelector('.dl-mark-btn')) return;
            const code = extractItemCode(item);
            if (!code) return;
            const cover = item.querySelector('.cover') || item.querySelector('a.box');
            if (!cover) return;
            
            const linkEl = item.querySelector('a.box');
            const url = linkEl ? linkEl.href : '';
            
            const btn = document.createElement('button');
            btn.className = 'dl-mark-btn';
            btn.type = 'button';
            btn.setAttribute('data-code', code);
            refreshMarkBtn(btn, code);
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (watchedSet.has(code.toUpperCase())) {
                    removeWatched(code);
                } else {
                    addWatched(code, url, currentSeries);
                }
                if (watchedUI && watchedUI.panel.classList.contains('active')) renderWatchedList();
            };
            cover.appendChild(btn);
        });
    }
    
    // 详情页封面右上角添加标记按钮，支持详情页直接标记
    function applyDetailPageMark() {
        if (!config.downloadMark) return;
        if (document.querySelector('.dl-mark-btn-detail')) return;
        const detail = document.querySelector('.video-detail');
        if (!detail) return;

        const code = extractDetailCode();
        if (!code) return;

        const btn = document.createElement('button');
        btn.className = 'dl-mark-btn dl-mark-btn-detail';
        btn.type = 'button';
        btn.setAttribute('data-code', code);
        refreshMarkBtn(btn, code);
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (watchedSet.has(code.toUpperCase())) {
                removeWatched(code);
            } else {
                addWatched(code, location.href, extractCurrentSeries());
            }
            if (watchedUI && watchedUI.panel.classList.contains('active')) renderWatchedList();
        };

        // 优先挂在封面右上角；无封面时内联挂在番号行
        const coverCol = detail.querySelector('.column-video-cover');
        if (coverCol) {
            coverCol.style.position = 'relative';
            coverCol.appendChild(btn);
        } else {
            const codeBlock = detail.querySelector('.panel-block.first-block') || detail.querySelector('.panel-block');
            if (!codeBlock) return;
            btn.style.position = 'static';
            btn.style.marginLeft = '8px';
            btn.style.verticalAlign = 'middle';
            codeBlock.appendChild(btn);
        }
    }

    function createWatchedUI() {
        if (!config.downloadMark || watchedUI) return;

        const overlay = document.createElement('div');
        overlay.className = 'javdb-settings-overlay';

        const panel = document.createElement('div');
        panel.className = 'javdb-settings-panel javdb-watched-panel';
        panel.innerHTML = `
            <div class="javdb-settings-header">
                <h2>📥 已下载列表（<span class="watched-count">0</span>）</h2>
                <button class="javdb-settings-close">×</button>
            </div>
            <div class="javdb-settings-body">
                <div class="watched-add-row">
                    <input type="text" class="watched-add-input" placeholder="输入番号添加，如 BBAN-439（多个用空格/逗号分隔）">
                    <button class="javdb-btn javdb-btn-primary watched-add-btn">添加</button>
                </div>
                <div class="watched-filter-row">
                    <input type="text" class="watched-filter-input" placeholder="过滤列表...">
                    <button class="javdb-btn watched-copyall-btn">复制全部</button>
                    <button class="javdb-btn watched-clear-btn">清空</button>
                </div>
                <ul class="watched-list"></ul>
            </div>
            <div class="javdb-settings-footer">
                <button class="javdb-btn javdb-btn-primary watched-close-btn">关闭</button>
            </div>
        `;

        const trigger = document.createElement('button');
        trigger.className = 'javdb-watched-trigger';

        document.body.appendChild(overlay);
        document.body.appendChild(panel);
        document.body.appendChild(trigger);

        watchedUI = {
            overlay, panel, trigger,
            countEl: panel.querySelector('.watched-count'),
            listEl: panel.querySelector('.watched-list'),
            addInput: panel.querySelector('.watched-add-input'),
            filterInput: panel.querySelector('.watched-filter-input')
        };

        const open = () => { renderWatchedList(); panel.classList.add('active'); overlay.classList.add('active'); };
        const close = () => { panel.classList.remove('active'); overlay.classList.remove('active'); };

        trigger.onclick = open;
        overlay.onclick = close;
        panel.querySelector('.javdb-settings-close').onclick = close;
        panel.querySelector('.watched-close-btn').onclick = close;

        const doAdd = () => {
            const v = watchedUI.addInput.value.trim();
            if (!v) return;
            v.split(/[\s,，、]+/).forEach(c => addWatched(c));
            watchedUI.addInput.value = '';
            renderWatchedList();
        };
        panel.querySelector('.watched-add-btn').onclick = doAdd;
        watchedUI.addInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
        watchedUI.filterInput.addEventListener('input', renderWatchedList);

        panel.querySelector('.watched-copyall-btn').onclick = function () {
            if (!watchedList.length) return;
            navigator.clipboard.writeText(watchedList.map(i => i.code).join('\n')).then(() => {
                const t = this.textContent; this.textContent = '✅ 已复制';
                setTimeout(() => this.textContent = t, 1000);
            }).catch(() => console.error('复制失败'));
        };

        panel.querySelector('.watched-clear-btn').onclick = () => {
            if (!watchedList.length) return;
            if (confirm(`确定要清空全部 ${watchedList.length} 条已下载记录吗？`)) {
                watchedList = [];
                saveWatched();
                renderWatchedList();
            }
        };

        updateWatchedTriggerCount();
    }

    function updateWatchedTriggerCount() {
        if (watchedUI) watchedUI.trigger.textContent = `📥 已下载 (${watchedList.length})`;
    }

    function renderWatchedList() {
        if (!watchedUI) return;
        const { listEl, filterInput, countEl } = watchedUI;
        const filter = (filterInput.value || '').trim().toUpperCase();
        listEl.innerHTML = '';
        const shown = watchedList.filter(item => !filter || item.code.includes(filter));
        if (shown.length === 0) {
            const li = document.createElement('li');
            li.className = 'watched-empty';
            li.textContent = watchedList.length === 0
                ? '暂无记录：可在列表页封面点击 ✓ 标记，或在上方手动添加'
                : '没有匹配的记录';
            listEl.appendChild(li);
        } else {
            shown.forEach(item => listEl.appendChild(buildWatchedRow(item)));
        }
        countEl.textContent = watchedList.length;
        updateWatchedTriggerCount();
    }

    // 列表中的单行：查看 / 编辑(番号/系列/链接) / 删除
    function buildWatchedRow(item) {
        const li = document.createElement('li');
        li.className = 'watched-item';

        const topRow = document.createElement('div');
        topRow.style.cssText = 'display: flex; justify-content: space-between; width: 100%; align-items: center;';

        const codeSpan = document.createElement('span');
        codeSpan.className = 'watched-code';
        codeSpan.textContent = item.code;
        
        const actions = document.createElement('span');
        actions.className = 'watched-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'javdb-btn';
        editBtn.textContent = '编辑';
        
        const delBtn = document.createElement('button');
        delBtn.className = 'javdb-btn';
        delBtn.textContent = '删除';
        delBtn.onclick = (e) => { e.stopPropagation(); removeWatched(item.code); renderWatchedList(); };

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        
        topRow.appendChild(codeSpan);
        topRow.appendChild(actions);
        li.appendChild(topRow);

        const infoRow = document.createElement('div');
        infoRow.className = 'watched-info-row';
        
        if (item.series) {
            const seriesSpan = document.createElement('span');
            const hasPrefix = /^(系列|演员|片商|导演):/.test(item.series) || item.series === '单作品';
            seriesSpan.textContent = hasPrefix ? item.series : `系列: ${item.series}`;
            infoRow.appendChild(seriesSpan);
        }
        if (item.url) {
            const linkSpan = document.createElement('a');
            try {
                // 【修改点】：动态将保存的链接域名替换为当前访问的域名，底层数据 item.url 保持不变
                const urlObj = new URL(item.url);
                urlObj.host = location.host; 
                linkSpan.href = urlObj.toString();
            } catch (e) {
                linkSpan.href = item.url; // 解析失败则保留原链接
            }
            linkSpan.target = '_blank';
            linkSpan.textContent = '🔗 查看原页';
            linkSpan.onclick = (e) => e.stopPropagation();
            infoRow.appendChild(linkSpan);
        }
        if (item.markTime) {
            const timeSpan = document.createElement('span');
            timeSpan.textContent = `标记于: ${new Date(item.markTime).toLocaleDateString()}`;
            infoRow.appendChild(timeSpan);
        }
        li.appendChild(infoRow);

        editBtn.onclick = (e) => {
            e.stopPropagation();
            li.innerHTML = '';
            li.style.gap = '8px';
            
            const inputCode = document.createElement('input');
            inputCode.className = 'watched-edit-input';
            inputCode.value = item.code;
            inputCode.placeholder = '番号';
            
            const inputSeries = document.createElement('input');
            inputSeries.className = 'watched-edit-input';
            inputSeries.value = item.series;
            inputSeries.placeholder = '归属系列';
            
            const inputUrl = document.createElement('input');
            inputUrl.className = 'watched-edit-input';
            inputUrl.value = item.url;
            inputUrl.placeholder = '链接';
            
            const btnRow = document.createElement('div');
            btnRow.className = 'watched-actions';
            
            const saveBtn = document.createElement('button');
            saveBtn.className = 'javdb-btn javdb-btn-primary';
            saveBtn.textContent = '保存';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'javdb-btn';
            cancelBtn.textContent = '取消';
            
            saveBtn.onclick = (ev) => {
                ev.stopPropagation();
                updateWatched(item.code, { code: inputCode.value, series: inputSeries.value, url: inputUrl.value });
                renderWatchedList();
            };
            cancelBtn.onclick = (ev) => { ev.stopPropagation(); renderWatchedList(); };
            
            btnRow.appendChild(saveBtn);
            btnRow.appendChild(cancelBtn);
            
            li.appendChild(inputCode);
            li.appendChild(inputSeries);
            li.appendChild(inputUrl);
            li.appendChild(btnRow);
            inputCode.focus();
        };

        return li;
    }

    // ==================== 数据备份与 WebDAV 核心逻辑 (完整合并版) ====================
    const WEBDAV_CONFIG_KEY = 'javdb_webdav_config';

    function loadWebDavConfig() {
        try { return JSON.parse(GM_getValue(WEBDAV_CONFIG_KEY, '{}')); } catch { return {}; }
    }
    function saveWebDavConfig(cfg) {
        GM_setValue(WEBDAV_CONFIG_KEY, JSON.stringify(cfg));
    }

    // 生成带日期时间的备份文件名 (格式: JavDB_Enhancer_Backup_2026-08-19_14-30-25.json)
    function getBackupFileName() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        return `JavDB_Enhancer_Backup_${dateStr}_${timeStr}.json`;
    }

    // 1. 获取备份数据
    function getBackupData() {
        return {
            version: GM_info.script.version,
            timestamp: Date.now(),
            config: config,
            watched: watchedList
        };
    }

    // 2. 应用备份数据
    function applyBackupData(data) {
        if (data.config) { config = Object.assign({}, DEFAULT_CONFIG, data.config); saveConfig(); }
        if (data.watched) { watchedList = data.watched; saveWatched(); }
    }

    // 3. 本地导出备份 (带日期时间 + 格式化 JSON 解决内容紊乱)
    function exportBackup() {
        const blob = new Blob([JSON.stringify(getBackupData(), null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getBackupFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 4. 本地导入备份
    function importBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                applyBackupData(data);
                alert('导入成功！页面将刷新以应用新数据。');
                location.reload();
            } catch (err) {
                alert('导入失败：文件格式错误');
            }
        };
        reader.readAsText(file);
    }

    // 5. 安全的 Base64 认证头
    function getAuthHeader(user, pass) {
        return 'Basic ' + btoa(unescape(encodeURIComponent(user + ':' + pass)));
    }

    // 6. 核心底层请求 (局域网兼容：强制处理空 Body，专治局域网设备对 null body 的敏感)
    function webdavRequest(method, url, headers = {}, data = null) {
        return new Promise((resolve, reject) => {
            // 对于 MKCOL，强制转为空字符串 ''，让浏览器发送标准的 Content-Length: 0
            if (data === null && method === 'MKCOL') {
                data = '';
            }

            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: headers,
                data: data,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        resolve(res);
                    } else {
                        reject(new Error(`HTTP_${res.status}_${res.statusText || 'Unknown'}`));
                    }
                },
                onerror: (err) => {
                    console.error('[WebDAV] 网络层拦截:', err);
                    reject(new Error(`Network_Error_${err.statusText || 'Failed'}`));
                },
                ontimeout: () => reject(new Error('Timeout'))
            });
        });
    }

    // 7. 确保 WebDAV 目录存在 (多重试错机制，专治各种局域网奇葩 WebDAV)
    async function ensureWebDavDir(baseUrl, dirPath, user, pass) {
        if (!dirPath) return;
        
        const parts = dirPath.split('/').filter(Boolean);
        let currentPath = baseUrl.replace(/\/+$/, ''); 
        
        for (const part of parts) {
            currentPath += '/' + encodeURIComponent(part);
            let created = false;
            let lastError = '';

            // 准备 3 套局域网兼容策略依次尝试
            const strategies = [
                { url: currentPath, headers: { 'Authorization': getAuthHeader(user, pass), 'Content-Type': 'application/xml' }, data: '' },
                { url: currentPath + '/', headers: { 'Authorization': getAuthHeader(user, pass), 'Content-Type': 'text/plain' }, data: '' },
                { url: currentPath, headers: { 'Authorization': getAuthHeader(user, pass) }, data: '' }
            ];

            for (const strategy of strategies) {
                try {
                    await webdavRequest('MKCOL', strategy.url, strategy.headers, strategy.data);
                    created = true;
                    break;
                } catch (e) {
                    lastError = e.message;
                    if (e.message.includes('405') || e.message.includes('301')) {
                        created = true; // 405 表示目录已存在
                        break;
                    }
                    if (e.message.includes('409')) {
                        throw new Error(`创建目录 "${part}" 失败 (409): 父目录不存在。请检查 WebDAV 基础路径是否正确。`);
                    }
                }
            }

            if (!created) {
                throw new Error(`创建目录 "${part}" 失败，已尝试所有局域网兼容策略。最后错误: ${lastError}`);
            }
        }
    }

    // 8. 上传到 WebDAV (使用终极二进制流绕过 415，并格式化 JSON 解决内容紊乱)
    async function uploadToWebDav(baseUrl, dirPath, fileName, data, user, pass) {
        await ensureWebDavDir(baseUrl, dirPath, user, pass);
        
        let fileUrl = baseUrl.replace(/\/+$/, '');
        if (dirPath) {
            const parts = dirPath.split('/').filter(Boolean);
            for (const p of parts) {
                fileUrl += '/' + encodeURIComponent(p);
            }
        }
        fileUrl += '/' + encodeURIComponent(fileName);
        
        // 格式化 JSON (null, 2)，使文件内容缩进可读，解决不规则紊乱
        const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        
        await webdavRequest('PUT', fileUrl, {
            'Authorization': getAuthHeader(user, pass),
            'Content-Type': 'application/octet-stream' 
        }, payload);
    }

    // 9. 从 WebDAV 下载 (同样使用 encodeURIComponent 确保中文路径下载正常)
    async function downloadFromWebDav(baseUrl, dirPath, fileName, user, pass) {
        let fileUrl = baseUrl.replace(/\/+$/, '');
        if (dirPath) {
            const parts = dirPath.split('/').filter(Boolean);
            for (const p of parts) {
                fileUrl += '/' + encodeURIComponent(p);
            }
        }
        fileUrl += '/' + encodeURIComponent(fileName);

        const res = await webdavRequest('GET', fileUrl, {
            'Authorization': getAuthHeader(user, pass)
        });
        return res.responseText;
    }

    // 10. 获取 WebDAV 目录下的文件列表 (命名空间无关解析，兼容 D:/lp1:/无前缀 等所有写法)
    async function listWebDavFiles(baseUrl, dirPath, user, pass) {
        let targetUrl = baseUrl.replace(/\/+$/, '');
        if (dirPath) {
            const parts = dirPath.split('/').filter(Boolean);
            for (const p of parts) targetUrl += '/' + encodeURIComponent(p);
        }
        if (!targetUrl.endsWith('/')) targetUrl += '/';

        const xmlBody = `<?xml version="1.0" encoding="utf-8" ?>
            <D:propfind xmlns:D="DAV:">
                <D:prop><D:getlastmodified/><D:getcontentlength/><D:resourcetype/></D:prop>
            </D:propfind>`;

        const res = await webdavRequest('PROPFIND', targetUrl, {
            'Authorization': getAuthHeader(user, pass),
            'Depth': '1',
            'Content-Type': 'application/xml; charset=utf-8'
        }, xmlBody);

        console.log('[WebDAV] PROPFIND 原始响应:', res.responseText);

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(res.responseText, "text/xml");

        // 【关键修复】：按 localName 查找元素，兼容任意命名空间前缀
        const getEls = (root, name) => {
            try {
                const ns = root.getElementsByTagNameNS('*', name);
                if (ns && ns.length) return ns;
            } catch (e) {}
            // 兜底：手动遍历匹配 tagName / localName
            const all = root.getElementsByTagName('*');
            const out = [];
            for (let i = 0; i < all.length; i++) {
                const el = all[i];
                if (el.localName === name || el.tagName === name || el.tagName.split(':').pop() === name) {
                    out.push(el);
                }
            }
            return out;
        };

        const responses = getEls(xmlDoc, 'response');
        console.log('[WebDAV] 解析到 response 节点数:', responses.length);

        const files = [];

        for (let i = 0; i < responses.length; i++) {
            const resp = responses[i];
            const hrefEl = getEls(resp, 'href')[0];
            if (!hrefEl) continue;

            let href = (hrefEl.textContent || '').trim();
            try { href = decodeURIComponent(href); } catch (e) {}

            // 目录本身的条目以 / 结尾，跳过
            if (!href || href.endsWith('/')) continue;

            const fileName = href.split('/').filter(Boolean).pop();
            if (!fileName) continue;

            // 是目录(collection)则跳过
            if (getEls(resp, 'collection')[0]) continue;

            const timeEl = getEls(resp, 'getlastmodified')[0];
            const sizeEl = getEls(resp, 'getcontentlength')[0];

            files.push({
                name: fileName,
                time: timeEl ? new Date(timeEl.textContent).getTime() : 0,
                timeStr: timeEl ? new Date(timeEl.textContent).toLocaleString() : '未知',
                size: sizeEl ? parseInt(sizeEl.textContent) : 0
            });
        }

        files.sort((a, b) => b.time - a.time);
        return files;
    }

    // 11. 删除 WebDAV 上的指定文件
    async function deleteWebDavFile(baseUrl, dirPath, fileName, user, pass) {
        let fileUrl = baseUrl.replace(/\/+$/, '');
        if (dirPath) {
            const parts = dirPath.split('/').filter(Boolean);
            for (const p of parts) fileUrl += '/' + encodeURIComponent(p);
        }
        fileUrl += '/' + encodeURIComponent(fileName);

        await webdavRequest('DELETE', fileUrl, { 'Authorization': getAuthHeader(user, pass) });
    }

    // ==================== 内置谷歌翻译增强 ====================
    const MS_TRANSLATE_SELECTORS = [
        'h2.title.is-4',
        '.movie-list .box',
        '.tile-item', // 支持“TA（们）还出演过”等 tile 小图列表
        'a.article-item', // 资讯文章卡片
        '#recommend-container .item > a' // “每周推荐”区域卡片（链接无 .box 类）
    ].join(', ');

    const MS_CACHE_KEY = 'javdb_google_translate_cache';
    const MS_CACHE_VERSION = 'v18_polish_engine'; // 升级版本，清空旧缓存
    const MS_RATE_LIMIT = 300;

    // ---------- 缓存管理 ----------
    function getMsCache() {
        try {
            const raw = localStorage.getItem(MS_CACHE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed.__version !== MS_CACHE_VERSION) {
                localStorage.removeItem(MS_CACHE_KEY);
                return { __version: MS_CACHE_VERSION };
            }
            return parsed;
        } catch(e) { return {}; }
    }

    function setMsCache(cache) {
        try {
            cache.__version = MS_CACHE_VERSION;
            const keys = Object.keys(cache).filter(k => k !== '__version');
            if (keys.length > 2000) keys.slice(0, 500).forEach(k => delete cache[k]);
            localStorage.setItem(MS_CACHE_KEY, JSON.stringify(cache));
        } catch(e) {}
    }

    // ==================== 跨标签页风控弹窗单例协调器 ====================
    // 原理：GM 存储跨标签页共享。拥有弹窗的标签页每秒写一次“心跳”维持旗帜新鲜；
    //       其他标签页看到旗帜存在就静默等待；旗帜被清除（验证完成）时全员错峰重试。
    const CAPTCHA_FLAG_KEY = 'javdb_captcha_flag';
    const CAPTCHA_FLAG_TTL = 10 * 1000; // 心跳间隔1秒，10秒无心跳视为拥有者已死
    const TAB_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

    function readCaptchaFlag() {
        try {
            const f = GM_getValue(CAPTCHA_FLAG_KEY, null);
            if (!f || !f.ts) return null;
            if (Date.now() - f.ts > CAPTCHA_FLAG_TTL) return null; // 拥有者崩溃，旗帜过期
            return f;
        } catch (e) { return null; }
    }

    function writeCaptchaFlag() {
        try { GM_setValue(CAPTCHA_FLAG_KEY, { ts: Date.now(), tabId: TAB_ID }); } catch (e) {}
    }

    function clearCaptchaFlag() {
        try { GM_setValue(CAPTCHA_FLAG_KEY, null); } catch (e) {}
    }

    // 跨标签页通知：任意标签页的验证窗口关闭（旗帜被清除）后，本标签页错峰重试翻译
    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener(CAPTCHA_FLAG_KEY, (name, oldVal, newVal, remote) => {
            if (!remote) return;               // 只处理其他标签页的变化
            if (!newVal && oldVal) {           // 旗帜从“有”变“无” = 验证完成
                setTimeout(() => {
                    if (typeof runMsTranslation === 'function') runMsTranslation();
                }, 800 + Math.random() * 2200); // 随机错峰，避免多标签页同时爆发请求
            }
        });
    }

    // ---------- 批量翻译（Google 终极版：并发限流 + 风控单例弹窗 + 缓存防污染） ----------
    async function msTranslateBatch(texts) {
        if (!texts.length) return [];

        const cache = getMsCache();
        const results = new Array(texts.length).fill(null);
        const uncachedTexts = [];
        const uncachedIndices = [];

        texts.forEach((text, i) => {
            if (cache[text]) {
                results[i] = cache[text];
            } else {
                uncachedTexts.push(text);
                uncachedIndices.push(i);
            }
        });

        if (uncachedTexts.length === 0) return results;

        // 纯数字分隔符，防止 AI 篡改；即使被破坏也有逐条降级兜底
        const SPLITTER = "\n9527\n";
        const CHUNK_SIZE = 20;
        const chunks = [];
        for (let i = 0; i < uncachedTexts.length; i += CHUNK_SIZE) {
            chunks.push({ startIndex: i, items: uncachedTexts.slice(i, i + CHUNK_SIZE) });
        }

        // 单条请求（深度伪装 + 风控检测 + 单例弹窗）
        const translateOne = (text) => new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://translate.google.com/',
                    'Origin': 'https://translate.google.com'
                },
                data: 'q=' + encodeURIComponent(text),
                timeout: 15000,
                onload: res => {
                    // 🚨 风控检测：状态码 / 重定向 URL / 人机验证页特征
                    const finalUrl = res.finalUrl || res.responseURL || '';
                    const isBlocked = res.status === 429 || res.status === 503 ||
                                      finalUrl.includes('/sorry/') ||
                                      (res.responseText && (res.responseText.includes('captcha') || res.responseText.includes('unusual traffic')));

                    if (isBlocked) {
                        const flag = readCaptchaFlag();
                        const iAmOwner = flag && flag.tabId === TAB_ID &&
                                         window.__javdb_captcha_window && !window.__javdb_captcha_window.closed;

                        if (iAmOwner) {
                            // 本标签页就是弹窗拥有者：只置顶，不重复弹
                            try { window.__javdb_captcha_window.focus(); } catch (e) {}
                        } else if (!flag) {
                            // 全局尚无验证窗口：本标签页成为唯一拥有者，开弹窗
                            writeCaptchaFlag();
                            // 双重检查，降低多标签页同毫秒竞态概率
                            if (!readCaptchaFlag() || readCaptchaFlag().tabId === TAB_ID) {
                                console.warn('[JavDB] 🚨 触发 Google 翻译风控！打开全局唯一验证窗口...');
                                const captchaUrl = finalUrl.includes('/sorry/') ? finalUrl : 'https://www.google.com/sorry/index';
                                window.__javdb_captcha_window = window.open(captchaUrl, '_blank', 'width=500,height=650,scrollbars=yes');
                                const checkClosed = setInterval(() => {
                                    if (!window.__javdb_captcha_window || window.__javdb_captcha_window.closed) {
                                        clearInterval(checkClosed);
                                        window.__javdb_captcha_window = null;
                                        clearCaptchaFlag(); // 广播所有标签页：验证结束，可重试
                                        setTimeout(() => { if (typeof runMsTranslation === 'function') runMsTranslation(); }, 1000);
                                    } else {
                                        writeCaptchaFlag(); // 心跳：维持旗帜新鲜
                                    }
                                }, 1000);
                            }
                        } else {
                            // 别的标签页已开过验证窗口：本标签页静默等待，不再弹窗
                            console.log('[JavDB] ⚠️ 检测到风控，但其他标签页已打开验证窗口，本标签页静默等待');
                        }
                        return resolve(null);
                    }

                    try {
                        const parsed = JSON.parse(res.responseText);
                        if (parsed && parsed[0]) {
                            return resolve(parsed[0].map(s => s[0] || '').join(''));
                        }
                    } catch (e) {}
                    resolve(null);
                },
                onerror: () => resolve(null),
                ontimeout: () => resolve(null)
            });
        });

        // 分块翻译（合并 + 拆分 + 防污染 + 逐条降级）
        const translateChunk = async ({ startIndex, items }) => {
            if (items.length === 1) {
                const t = await translateOne(items[0]);
                // 🛡️ 防缓存污染：译文存在且与原文不同才写缓存
                if (t && t !== items[0]) {
                    cache[items[0]] = t;
                    results[uncachedIndices[startIndex]] = t;
                }
                return;
            }

            const merged = await translateOne(items.join(SPLITTER));
            const parts = merged ? merged.split(/\s*9527\s*/) : null;

            if (parts && parts.length === items.length) {
                items.forEach((orig, j) => {
                    const t = (parts[j] || '').trim();
                    if (t && t !== orig) {
                        cache[orig] = t;
                        results[uncachedIndices[startIndex + j]] = t;
                    }
                });
            } else {
                // 分隔符被破坏 → 降级逐条翻译（同样带防污染）
                for (let j = 0; j < items.length; j++) {
                    const t = await translateOne(items[j]);
                    if (t && t !== items[j]) {
                        cache[items[j]] = t;
                        results[uncachedIndices[startIndex + j]] = t;
                    }
                }
            }
        };

        // 🚀 并发限流池：同时最多 3 个请求在飞，避开瞬时并发风控
        const CONCURRENCY_LIMIT = 3;
        const executing = new Set();
        for (const chunk of chunks) {
            const p = translateChunk(chunk)
                .then(() => executing.delete(p))
                .catch(() => executing.delete(p));
            executing.add(p);
            if (executing.size >= CONCURRENCY_LIMIT) {
                await Promise.race(executing);
            }
        }
        await Promise.all(executing);

        setMsCache(cache);
        return results;
    }

    // ---------- 辅助函数：季集模式转换 ----------
    function applySeasonPatterns(out) {
        if (!out) return out;
        out = out.replace(/\bS(\d{1,2})\s*[-.]?\s*E(\d{1,3})\b/gi, (m, s, e) => `第${parseInt(s,10)}季 第${parseInt(e,10)}集`);
        out = out.replace(/\bSeason\s*(\d+)\b/gi, (m, n) => `第${parseInt(n,10)}季`);
        out = out.replace(/\bEpisode\s*(\d+)\b/gi, (m, n) => `第${parseInt(n,10)}集`);
        out = out.replace(/\bPart\s*(\d+)\b/gi, (m, n) => `第${parseInt(n,10)}部分`);
        return out;
    }

    function restoreCaseFromOriginal(original, translated) {
        if (!original || !translated) return translated;
        const origLower = original.toLowerCase();
        return translated.replace(/[a-z0-9][a-z0-9'\-]*(\s+[a-z0-9'\-]+)*/gi, (frag) => {
            const idx = origLower.indexOf(frag.toLowerCase());
            if (idx !== -1) return original.substr(idx, frag.length);
            return frag;
        });
    }

    // ---------- 辅助函数：残料二次翻译引擎 ----------
    async function polishLeftovers(text) {
        if (!text) return text;
        const fragRegex = /[A-Za-z][A-Za-z'\-]*(?:\s+[A-Za-z][A-Za-z'\-]*)*/g;
        const fragments = [...new Set(text.match(fragRegex) || [])].filter(f => f.length >= 3);
        if (!fragments.length) return text;

        const firstPass = await msTranslateBatch(fragments);
        let out = text;
        for (let i = 0; i < fragments.length; i++) {
            const frag = fragments[i];
            let trans = firstPass[i];

            if (!trans || trans === frag) {
                const lr = (await msTranslateBatch([frag.toLowerCase()]))[0];
                if (lr && lr !== frag.toLowerCase()) {
                    trans = restoreCaseFromOriginal(frag, lr);
                }
            }

            if (trans && trans !== frag && /[\u4e00-\u9fa5]/.test(trans)) {
                out = out.split(frag).join(trans);
            }
        }
        return out;
    }

    // ---------- 辅助函数：判断是否需要跳过翻译 ----------
    function shouldSkipMsTranslate(element) {
        if (element.querySelector('.actor-section-name') || 
            element.querySelector('.section-meta')) {
            return true;
        }
        return false;
    }

    // ---------- 辅助函数：判断是否为列表卡片（含"每周推荐"等无 .box 类的卡片链接） ----------
    function isMsListCard(el) {
        if (!el || !el.classList) return false;
        if (el.classList.contains('box') || el.classList.contains('tile-item') || el.classList.contains('article-item')) return true;
        // "每周推荐"(#recommend-container) 的卡片链接无 .box 类，按容器识别
        return el.tagName === 'A' && !!el.closest('#recommend-container');
    }

    // ---------- 辅助函数：提取纯净核心文本（详情页用） ----------
    function extractCoreText(element) {
        return Array.from(element.childNodes)
            .filter(n => {
                if (n.nodeType === Node.TEXT_NODE) return true;
                if (n.nodeType === Node.ELEMENT_NODE && 
                    !n.classList.contains('copy-btn') && 
                    !n.classList.contains('section-subtitle')) {
                    return true;
                }
                return false;
            })
            .map(n => n.textContent)
            .join('')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ---------- 辅助函数：提取完整显示文本（详情页用） ----------
    function extractDisplayText(element) {
        return Array.from(element.childNodes)
            .filter(n => {
                if (n.nodeType === Node.TEXT_NODE) return true;
                if (n.nodeType === Node.ELEMENT_NODE && !n.classList.contains('copy-btn')) {
                    return true;
                }
                return false;
            })
            .map(n => n.textContent)
            .join('')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ---------- 【核心修复】列表项专用：提取文本并强制补空格 ----------
    function extractListItemText(container) {
        const nodesWithSpaceFlag = []; // 存储 { node, needsLeadingSpace }
        
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode: function(node) {
                if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                if (node.parentElement && node.parentElement.tagName === 'STRONG') {
                    return NodeFilter.FILTER_REJECT;
                }
                // 🚀 核心修复：排除 tile-item 中的番号 div，防止番号被送去翻译
                if (node.parentElement && node.parentElement.classList.contains('video-number')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (node.parentElement && node.parentElement.dataset.msTranslated === 'true') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }, false);

        let node;
        while (node = walker.nextNode()) {
            // 【关键】检查该文本节点的前一个兄弟元素是否为 STRONG
            // 如果是，说明这是紧跟在番号后面的标题文本，需要补空格
            let prevSibling = node.previousSibling;
            // 处理可能存在的空白文本节点干扰
            while (prevSibling && prevSibling.nodeType === Node.TEXT_NODE && !prevSibling.nodeValue.trim()) {
                prevSibling = prevSibling.previousSibling;
            }
            
            const needsSpace = prevSibling && prevSibling.nodeType === Node.ELEMENT_NODE && prevSibling.tagName === 'STRONG';
            
            nodesWithSpaceFlag.push({
                node: node,
                needsSpace: needsSpace
            });
        }
        return nodesWithSpaceFlag;
    }

    // ---------- 创建统一标题容器（影片详情专用） ----------
    function createMovieTitleWrapper(originalTitleEl, translatedText) {
        if (originalTitleEl.nextElementSibling && 
            originalTitleEl.nextElementSibling.classList.contains('ms-title-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'ms-title-wrapper';
        wrapper.style.cssText = `
            margin-top: 4px; margin-bottom: 16px; padding: 10px 14px;
            border-radius: 8px; background: rgba(128, 128, 128, 0.06);
            max-width: 100%; box-sizing: border-box;
        `;

        const originalArea = document.createElement('div');
        originalArea.className = 'ms-original-area';
        originalArea.style.cssText = `
            display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
            padding-bottom: 10px; border-bottom: 1px solid rgba(128, 128, 128, 0.2);
        `;
        
        const fullTitleText = extractDisplayText(originalTitleEl);
        const originalTextSpan = document.createElement('span');
        originalTextSpan.textContent = fullTitleText;
        originalTextSpan.style.cssText = `font-size: 1.2rem; font-weight: bold; line-height: 1.5; word-break: break-all; color: inherit;`;
        originalArea.appendChild(originalTextSpan);

        const origBtn = originalTitleEl.querySelector('.copy-btn');
        if (origBtn) {
            const newBtn = document.createElement('button');
            newBtn.className = 'copy-btn';
            newBtn.textContent = origBtn.textContent || '📋 复制标题';
            newBtn.title = '点击复制标题';
            newBtn.style.marginLeft = '10px';
            newBtn.onclick = function(e) {
                e.stopPropagation();
                navigator.clipboard.writeText(fullTitleText).then(() => {
                    const t = newBtn.textContent; newBtn.textContent = '✅ 已复制';
                    setTimeout(() => newBtn.textContent = t, 1000);
                }).catch(err => console.error('复制失败:', err));
            };
            originalArea.appendChild(newBtn);
        }

        const chineseArea = document.createElement('div');
        chineseArea.className = 'ms-chinese-area';
        chineseArea.style.cssText = `margin-top: 10px; display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; max-width: 100%;`;

        const cleanTrans = translatedText.replace(/\s+/g, ' ').trim();
        const transSpan = document.createElement('span');
        transSpan.textContent = cleanTrans;
        transSpan.style.cssText = `font-weight: bold; font-size: 1.1rem; line-height: 1.4; word-break: break-all; color: #666;`;

        const copyTransBtn = document.createElement('button');
        copyTransBtn.className = 'copy-btn';
        copyTransBtn.textContent = '📋 复制中文标题';
        copyTransBtn.title = '点击复制中文标题';
        copyTransBtn.style.cssText = `font-weight: normal; font-size: 12px; padding: 2px 8px; opacity: 0.8; white-space: nowrap;`;
        copyTransBtn.onclick = function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(cleanTrans).then(() => {
                const t = copyTransBtn.textContent; copyTransBtn.textContent = '✅ 已复制'; copyTransBtn.style.opacity = '1';
                setTimeout(() => { copyTransBtn.textContent = t; copyTransBtn.style.opacity = '0.8'; }, 1000);
            }).catch(() => console.error('复制中文标题失败'));
        };

        chineseArea.appendChild(transSpan);
        chineseArea.appendChild(copyTransBtn);

        wrapper.appendChild(originalArea);
        wrapper.appendChild(chineseArea);
        originalTitleEl.parentNode.insertBefore(wrapper, originalTitleEl.nextSibling);
        originalTitleEl.style.display = 'none';
        applyUnifiedTitleTheme(wrapper);
    }

    // ---------- 创建信息条目容器（系列/导演/片商专用） ----------
    function createInfoItemWrapper(originalEl, translatedText, label) {
        if (originalEl.nextElementSibling && 
            originalEl.nextElementSibling.classList.contains('ms-info-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'ms-info-wrapper';
        wrapper.style.cssText = `
            margin-top: 2px; margin-bottom: 12px; padding: 6px 12px;
            border-radius: 6px; background: rgba(128, 128, 128, 0.04);
            max-width: 100%; box-sizing: border-box;
        `;

        const displayOrig = extractDisplayText(originalEl);
        const coreOrig = extractCoreText(originalEl);
        const cleanTrans = translatedText.replace(/\s+/g, ' ').trim();

        const origRow = document.createElement('div');
        origRow.style.cssText = `display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px;`;
        
        const origSpan = document.createElement('span');
        origSpan.textContent = displayOrig;
        origSpan.style.cssText = `font-size: 1rem; font-weight: bold; color: inherit;`;
        origRow.appendChild(origSpan);

        const origBtn = originalEl.querySelector('.copy-btn');
        if (origBtn) {
            const newBtn = document.createElement('button');
            newBtn.className = 'copy-btn';
            newBtn.textContent = origBtn.textContent;
            newBtn.title = origBtn.title;
            newBtn.style.marginLeft = '10px';
            newBtn.onclick = function(e) {
                e.stopPropagation();
                navigator.clipboard.writeText(coreOrig).then(() => {
                    const t = newBtn.textContent; newBtn.textContent = '✅ 已复制';
                    setTimeout(() => newBtn.textContent = t, 1000);
                });
            };
            origRow.appendChild(newBtn);
        }

        const transRow = document.createElement('div');
        transRow.style.cssText = `display: flex; align-items: center; gap: 10px; flex-wrap: wrap;`;

        const transSpan = document.createElement('span');
        transSpan.textContent = `${label}：${cleanTrans}`;
        transSpan.style.cssText = `font-weight: bold; font-size: 0.95rem; color: #666;`;

        const copyTransBtn = document.createElement('button');
        copyTransBtn.className = 'copy-btn';
        copyTransBtn.textContent = `📋 复制中文${label}`;
        copyTransBtn.title = `点击复制中文${label}`;
        copyTransBtn.style.cssText = `font-weight: normal; font-size: 12px; padding: 2px 8px; opacity: 0.8; white-space: nowrap;`;
        copyTransBtn.onclick = function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(cleanTrans).then(() => {
                const t = copyTransBtn.textContent; copyTransBtn.textContent = '✅ 已复制'; copyTransBtn.style.opacity = '1';
                setTimeout(() => { copyTransBtn.textContent = t; copyTransBtn.style.opacity = '0.8'; }, 1000);
            });
        };

        transRow.appendChild(transSpan);
        transRow.appendChild(copyTransBtn);

        wrapper.appendChild(origRow);
        wrapper.appendChild(transRow);
        originalEl.parentNode.insertBefore(wrapper, originalEl.nextSibling);
        originalEl.style.display = 'none';
        applyInfoWrapperTheme(wrapper);
    }

    // ---------- 主题适配 ----------
    function applyUnifiedTitleTheme(wrapper) {
        if (!wrapper) return;
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const span = wrapper.querySelector('.ms-chinese-area span');
        const div = wrapper.querySelector('.ms-original-area');
        if (theme === 'dark') {
            wrapper.style.background = 'rgba(255,255,255,0.04)';
            if (div) div.style.borderBottomColor = 'rgba(255,255,255,0.1)';
            if (span) span.style.color = '#aaa';
        } else {
            wrapper.style.background = 'rgba(0,0,0,0.03)';
            if (div) div.style.borderBottomColor = 'rgba(0,0,0,0.1)';
            if (span) span.style.color = '#666';
        }
    }

    function applyInfoWrapperTheme(wrapper) {
        if (!wrapper) return;
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const span = wrapper.querySelector('.ms-info-wrapper > div:last-child span');
        if (theme === 'dark') {
            wrapper.style.background = 'rgba(255,255,255,0.03)';
            if (span) span.style.color = '#aaa';
        } else {
            wrapper.style.background = 'rgba(0,0,0,0.02)';
            if (span) span.style.color = '#666';
        }
    }

    function observeMsThemes() {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if (m.attributeName === 'data-theme') {
                    document.querySelectorAll('.ms-title-wrapper').forEach(applyUnifiedTitleTheme);
                    document.querySelectorAll('.ms-info-wrapper').forEach(applyInfoWrapperTheme);
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
    }

    // ---------- 元素级翻译（智能分发 + 列表页强制空格） ----------
    async function msTranslateElement(element) {
        if (!element || element.dataset.msTranslated === 'true' || element.dataset.msTranslated === 'pending') return;
        element.dataset.msTranslated = 'pending';
        element.dataset.msProtected = 'true';

        try {
            // 检查是否为需要跳过的特殊元素
            if (shouldSkipMsTranslate(element)) {
                element.dataset.msTranslated = 'skipped';
                return;
            }

            // 【列表页处理】精准定位、保护番号、强制补空格、翻译Title
            if (isMsListCard(element)) {
                // 1. 翻译悬浮提示 title 属性
                const originalTitleAttr = element.getAttribute('title');
                if (originalTitleAttr && originalTitleAttr.trim().length > 0) {
                    const titleResults = await msTranslateBatch([originalTitleAttr]);
                    if (titleResults[0] && titleResults[0] !== originalTitleAttr) {
                        element.setAttribute('title', titleResults[0].replace(/\s+/g, ' ').trim());
                    }
                }

                // 2. 翻译可见文本（排除 strong 番号，强制补空格）
                const titleContainer = element.querySelector('.video-title, .article-title') || element; // 🚀 增加 .article-title
                const nodesData = extractListItemText(titleContainer);

                if (nodesData.length > 0) {
                    const texts = nodesData.map(d => d.node.textContent);
                    const results = await msTranslateBatch(texts);

                    // 回填译文
                    for (let i = 0; i < results.length; i++) {
                        let translated = results[i];
                        if (!translated) continue;

                        // 🚀 后置抛光：季集转换 + 残料二次翻译
                        translated = applySeasonPatterns(translated);
                        translated = await polishLeftovers(translated);

                        if (translated !== texts[i]) {
                            let finalText = translated.trim();
                            // 【核心修复】如果标记为需要空格，且译文开头不是空格，则手动补一个
                            if (nodesData[i].needsSpace && !finalText.startsWith(' ')) {
                                finalText = ' ' + finalText;
                            }
                            nodesData[i].node.nodeValue = finalText;
                        }
                    }
                }

                element.dataset.msTranslated = 'true';
                return;
            }

            // 【详情页处理】h2.title.is-4
            const isInfoItem = element.querySelector('.section-subtitle') !== null;
            const rawText = extractCoreText(element);

            if (rawText.length === 0) {
                element.dataset.msTranslated = 'true';
                return;
            }

            // 🚀 番号保护：送翻前剥离番号，杜绝 "MIRD-102" 被翻成 "死了-102"
            const CAR_NUM_RE = /^[A-Za-z0-9_.@&-]+-\d+[A-Za-z0-9_.@&-]*$/i;
            let carNum = '';
            let textToTranslate = rawText;

            if (!isInfoItem) {
                // 优先取「复制番号」按钮/首个 strong 的精确番号，并用番号格式校验，防止把整条标题误当番号
                let code = (typeof extractDetailCode === 'function') ? (extractDetailCode() || '') : '';
                if (code && CAR_NUM_RE.test(code)) carNum = code;

                if (carNum && textToTranslate.includes(carNum)) {
                    textToTranslate = textToTranslate.split(carNum).join('').trim();
                } else {
                    // 兜底：按正则剥离开头的番号串
                    const m = textToTranslate.match(/^([A-Za-z0-9_.@&-]+-\d+[A-Za-z0-9_.@&-]*)\s+/);
                    if (m) {
                        carNum = m[1];
                        textToTranslate = textToTranslate.slice(m[0].length).trim();
                    }
                }
            }

            if (textToTranslate.length === 0) {
                element.dataset.msTranslated = 'true';
                return;
            }

            const results = await msTranslateBatch([textToTranslate]);
            let translated = results[0];

            if (translated && translated !== textToTranslate) {
                // 先抛光（季集模式 + 残料二次翻译），再原样拼回番号，
                // 确保番号不会进入谷歌/抛光流程被二次处理
                translated = applySeasonPatterns(translated);
                translated = await polishLeftovers(translated);
                const finalText = carNum ? `${carNum} ${translated}` : translated;

                if (isInfoItem) {
                    const subtitleEl = element.querySelector('.section-subtitle');
                    const label = subtitleEl ? subtitleEl.textContent.trim() : '信息';
                    createInfoItemWrapper(element, finalText, label);
                } else {
                    createMovieTitleWrapper(element, finalText);
                }
            } else {
                // API 失败，不打上 true 标记，允许下次重试
                element.dataset.msTranslated = 'failed';
            }
        } catch (e) {
            console.error('[JavDB 增强助手] 谷歌翻译元素失败:', e);
            element.dataset.msTranslated = 'failed';
        }
    }

    // ---------- 入口函数（列表页并发优化版） ----------
    async function runMsTranslation() {
        if (!config.translation) return;
        try {
            const elements = document.querySelectorAll(MS_TRANSLATE_SELECTORS);
            const pending = Array.from(elements).filter(el =>
                el.dataset.msTranslated !== 'true' && 
                el.dataset.msTranslated !== 'pending' &&
                el.dataset.msTranslated !== 'skipped'
            );
            if (pending.length === 0) return;

            // 【优化】列表页 .box 元素先批量收集文本，一次性翻译后再回填
            // 🚀 核心修复：同时识别 .box、.tile-item、.article-item 及"每周推荐"卡片为列表项，走批量翻译通道
            const listItems = pending.filter(el => isMsListCard(el));
            const detailItems = pending.filter(el => !isMsListCard(el));

            // 列表页并发处理：收集所有待翻译文本 → 单次批量API → 统一回填
            if (listItems.length > 0) {
                const allTexts = [];
                const allNodeRefs = []; // { node, needsSpace, itemIndex }
                const titleAttrMap = []; // { element, originalTitle }

                // 第一轮：收集
                for (const item of listItems) {
                    item.dataset.msTranslated = 'pending';
                    item.dataset.msProtected = 'true';

                    // 收集 title 属性
                    const origTitle = item.getAttribute('title');
                    if (origTitle && origTitle.trim()) {
                        titleAttrMap.push({ element: item, originalTitle: origTitle });
                        allTexts.push(origTitle);
                        allNodeRefs.push(null); // title 占位标记
                    }

                    // 收集可见文本节点
                    const container = item.querySelector('.video-title') || item;
                    const nodesData = extractListItemText(container);
                    for (const d of nodesData) {
                        allTexts.push(d.node.textContent);
                        allNodeRefs.push({ node: d.node, needsSpace: d.needsSpace, isTitle: false });
                    }
                }

                // 第二轮：单次批量翻译
                if (allTexts.length > 0) {
                    const results = await msTranslateBatch(allTexts);

                    // 第三轮：统一回填
                    let titleIdx = 0;
                    for (let i = 0; i < results.length; i++) {
                        const ref = allNodeRefs[i];
                        let translated = results[i];
                        
                        // 如果 API 失败 (null)，跳过
                        if (!translated) continue;

                        // 🚀 后置抛光：季集转换 + 残料二次翻译
                        translated = applySeasonPatterns(translated);
                        translated = await polishLeftovers(translated);

                        if (ref === null) {
                            // 回填 title 属性
                            const map = titleAttrMap[titleIdx++];
                            if (map && translated !== map.originalTitle) {
                                map.element.setAttribute('title', translated.replace(/\s+/g, ' ').trim());
                            }
                        } else {
                            // 回填文本节点
                            let finalText = translated.trim();
                            if (ref.needsSpace && !finalText.startsWith(' ')) {
                                finalText = ' ' + finalText;
                            }
                            if (finalText !== ref.node.textContent) {
                                ref.node.nodeValue = finalText;
                            }
                        }
                    }
                }

                // 标记完成
                for (const item of listItems) {
                    item.dataset.msTranslated = 'true';
                }
            }

            // 详情页仍逐个处理（数量少，且有UI构建开销）
            for (const el of detailItems) {
                await msTranslateElement(el);
            }

            observeMsThemes();
        } catch(e) {
            console.error('[JavDB 增强助手] 谷歌翻译出错:', e);
        }
    }

    // 监听 DOM 变化，处理动态加载的内容 - 恢复原版的高频监听实现
    function observeDOMChanges() {
        const observer = new MutationObserver(() => {
            if (config.translation) {
                translateTextNodes(document.body);
                translatePlaceholders();
                translateTitle();
                translateButtonValues();
                translateTooltipAttributes(); 
                translateTitleAttributes();
                translateDataConfirmAttributes(); 
            }
            // 【已删除】autoClickAgeVerificationFast() 不能放在这里，否则会创建无数个定时器导致卡死
            
            // 自动关闭应用推广横幅（横幅动态注入且尚未写入关闭 cookie 时重新拉起检查）
            if (config.hideBanner && !document.cookie.includes('hide_app_banner_v2=') && document.querySelector('aside.app-banner')) {
                autoClickAppBannerCloseFast();
            }
            // 从顶部域名栏检测最新域名（须在"隐藏顶部外部功能区"移除域名栏之前执行）
            detectLatestDomain();
            if (config.hideTopNavExtras) {
                document.querySelectorAll('nav.sub-header, div.top-meta').forEach(el => el.remove()); 
            }
            if (config.hideSearchKeywords) {
                document.querySelectorAll('div.search-recent-keywords').forEach(el => el.remove()); 
            }
            if (config.fixVipCover) {
                fixMemberExclusiveVideo(); 
            }
            if (config.showOriginTitle) {
                fixOriginTitle(); 
            }
            if (config.copyButtons) {
                addCopyButtons(); 
            }
            if (config.paginationJump) {
                enhancePaginationJump(); 
            }
            if (config.openNewTab) {
                applyOpenInNewTab(); 
            }
            // 内置谷歌翻译增强（在本地词典之后执行，共用翻译开关）
            if (config.translation) {
                setTimeout(runMsTranslation, 500);
            }
            
            // --- 动态加载时补充已下载标记按钮 ---
            if (config.downloadMark) {
                applyDownloadMarks();    // 列表页封面标记
                applyDetailPageMark();   // 详情页封面标记
            }
            if (config.loadReviews) {
                mergeThirdPartyReviews();
            }
            // 🚀 悬浮大图：动态加载/瀑布流追加的封面重新绑定（WeakSet 幂等）
            if (config.hoverBigImg) {
                initHoverBigImg();
            }
            // 🚀 详情页长缩略图 / 更高画质预览视频 / 封面快捷按钮（均幂等）
            // 【修复页面卡死】此前直接挂在 MutationObserver 回调里：enhancePreviewVideo 换源/load()
            // 本身会引发 video 元素 DOM/缓冲变动 → 再次触发本回调 → 反复增强重新拉流，形成
            // "观察→改DOM→再观察"的高频循环拖垮页面。现改为节流+微任务化：每 800ms 最多执行一轮，
            // 且放入 requestIdleCallback/setTimeout 与观察器回调解耦，杜绝同步级联触发。
            let jhsDetailEnhanceTimer = null;
            const runDetailEnhancements = () => {
                if (jhsDetailEnhanceTimer) return;
                jhsDetailEnhanceTimer = setTimeout(() => {
                    jhsDetailEnhanceTimer = null;
                    try {
                        loadScreenShotOnDetail();
                        enhancePreviewVideo();
                        addCoverQuickButtons();
                    } catch (e) {}
                }, 800);
            };
            runDetailEnhancements();
        });
        
        // 尝试安全地添加观察者
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
        if (config.copyButtons) {
            observeThemeChange(); 
        }
    }
  
    // 初始化：执行翻译、自动点击及监听
    function init() {
        loadConfig();
        detectLatestDomain();       // 从顶部域名栏获取最新域名（供链接重写与设置面板展示）
        loadWatched();              // 读取已下载记录
        setupWatchedSync();         // 注册跨标签页同步
        injectStyles();
        setupAutoReloadOn503();     // 503错误页自动重载
        
        // 尽早执行链接重写（在DOMContentLoaded之前）
        if (config.linkRewrite) {
            rewriteLinksToTempDomain();
        }
        setupVipLinkObserver();
        
        if (document.body) {
            const { panel, overlay } = createSettingsPanel();
            createSettingsTrigger(panel, overlay);
            
            // 执行初次翻译
            translationStatus.success = runTranslation();
            if (!translationStatus.success && config.translation) {
                setupAutoRetry();
            }
            
            // 添加手动触发按钮
            if (config.retryButton) {
                addRetryButton();
            }
            addCopyButtons();
            createWatchedUI();      // 已下载列表触发按钮+面板
            fixMemberExclusiveVideo();
            fixOriginTitle();
            enhancePaginationJump();
            applyOpenInNewTab();   // 全局链接新窗口打开
            hookSearchOpenNewTab(); // 🚀 搜索新窗口 + 分页当前页
            autoClickAgeVerificationFast();
            autoClickAppBannerCloseFast(); // 自动关闭底部APP下载推广横幅（自动点击其关闭按钮）
            attachSearchTypeListener();
            // 初始谷歌翻译增强
            if (config.translation) {
                setTimeout(runMsTranslation, 1000);
            }
            observeDOMChanges();
            if (config.copyButtons) {
                applyButtonTheme(); // 初次应用按钮主题
            }
            if (config.downloadMark) {
                applyDownloadMarks(); // 列表页封面标记按钮
                applyDetailPageMark(); // 详情页封面标记按钮
            }
            if (config.loadReviews) {
                mergeThirdPartyReviews();
            }
            if (config.loadRelated) {
                initRelatedEnhancement();
            }
            if (config.loadActressInfo) {
                console.log("[JavDB增强] >>> 即将调用 loadActressInfo()");
                loadActressInfo();
            }
            // 🚀 弹窗方式打开页面 + 悬浮大图
            setupDialogOpenDetail();
            initHoverBigImg();
            // 🚀 封面快捷按钮事件委托（一次性绑定，幂等）+ 详情页长缩略图/高画质预览视频初次执行
            bindCoverQuickButtonEvents();
            ensureNativePreviewHook();
            loadScreenShotOnDetail();
            enhancePreviewVideo();
            addCoverQuickButtons();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                init();
            });
        }
    }
  
    // 确保在DOMContentLoaded时也执行一次链接重写
    document.addEventListener('DOMContentLoaded', () => {
        if (config.linkRewrite) {
            setTimeout(rewriteLinksToTempDomain, 0);
        }
    });
    
    // 等待页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
