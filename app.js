/**
 * 课程目录 H5 - 核心应用逻辑
 *
 * 功能：
 * 1. 四列筛选器（年级/学科/班型/版本），动态生成选项
 * 2. 强制筛选限制：必须选至少一项才展示数据
 * 3. 卡片列表渲染 + 动画
 * 4. 海报大图预览弹窗
 * 5. 图片下载保存（移动端适配）
 */

(function () {
  'use strict';

  // ===== DOM 引用 =====
  const dom = {
    selectGrade:    document.getElementById('selectGrade'),
    selectSubject:  document.getElementById('selectSubject'),
    selectClassType:document.getElementById('selectClassType'),
    selectVersion:  document.getElementById('selectVersion'),
    selectSeason:   document.getElementById('selectSeason'),
    resetBtn:       document.getElementById('resetBtn'),
    filterHint:     document.getElementById('filterHint'),
    resultCount:    document.getElementById('resultCount'),
    countNum:       document.getElementById('countNum'),
    contentArea:    document.getElementById('contentArea'),
    emptyState:     document.getElementById('emptyState'),
    previewOverlay: document.getElementById('previewOverlay'),
    previewTitle:   document.getElementById('previewTitle'),
    previewImage:   document.getElementById('previewImage'),
    previewTags:    document.getElementById('previewTags'),
    previewClose:   document.getElementById('previewClose'),
    downloadBtn:    document.getElementById('downloadBtn'),
    loadingMask:    document.getElementById('loadingMask'),
    btnSummaryPoster: document.getElementById('btnSummaryPoster'),
    guideBanner:     document.getElementById('guideBanner'),
    guideDismiss:    document.getElementById('guideDismiss'),
    galleryGrid:     document.getElementById('galleryGrid'),
  };

  // ===== 状态 =====
  const state = {
    allData: [],
    filteredData: [],
    hasFilter: false,
    currentPreview: null,
  };

  // ===== 初始化 =====
  function init() {
    state.allData = CATALOG_DATA;
    populateFilters();
    bindEvents();
    showHint();
    initGuide();
    renderPosterGallery();
  }

  // ===== 1. 填充筛选器下拉选项（从数据动态聚合） =====
  function populateFilters() {
    const grades     = [...new Set(state.allData.map(d => d.grade))].sort(gradeSort);
    const subjects   = [...new Set(state.allData.map(d => d.subject))].sort();
    const classTypes = [...new Set(state.allData.map(d => d.classType))].sort();
    const versions   = [...new Set(state.allData.map(d => d.version))].sort();

    // 季节：固定4个选项（不从数据聚合，因为当前数据可能只有暑假）
    const seasons = ['寒假', '春季', '暑假', '秋季'];

    fillSelect(dom.selectGrade, grades);
    fillSelect(dom.selectSubject, subjects);
    fillSelect(dom.selectClassType, classTypes);
    fillSelect(dom.selectVersion, versions);
    fillSelect(dom.selectSeason, seasons);
  }

  /**
   * 年级自定义排序：三~六年级 → 七~九年级
   */
  function gradeSort(a, b) {
    const order = [
      '三年级','四年级','五年级','六年级',
      '七年级','八年级','九年级'
    ];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    // indexOf 返回 0 时不能用 || (0 是 falsy)，必须显式判断
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  }

  function fillSelect(selectEl, options) {
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      selectEl.appendChild(el);
    });
  }

  // ===== 2. 事件绑定 =====
  function bindEvents() {
    [dom.selectGrade, dom.selectSubject, dom.selectClassType, dom.selectVersion, dom.selectSeason].forEach(el => {
      el.addEventListener('change', onFilterChange);
    });

    dom.resetBtn.addEventListener('click', resetFilters);
    dom.previewClose.addEventListener('click', closePreview);
    dom.previewOverlay.addEventListener('click', function(e) {
      if (e.target === this) closePreview();
    });
    dom.downloadBtn.addEventListener('click', onDownload);
    dom.btnSummaryPoster.addEventListener('click', showSummaryPoster);

    // 操作引导关闭
    if (dom.guideDismiss) {
      dom.guideDismiss.addEventListener('click', function() {
        dom.guideBanner.classList.add('hidden');
        try { localStorage.setItem('catalog_guide_dismissed', '1'); } catch(e) {}
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closePreview();
    });
  }

  /**
   * 操作引导初始化
   * 用户关过一次就不再显示
   */
  function initGuide() {
    try {
      if (localStorage.getItem('catalog_guide_dismissed')) {
        dom.guideBanner.classList.add('hidden');
      }
    } catch(e) {}
  }

  /**
   * 渲染预生成海报画廊
   * 从 posters/ 目录读取所有 JPG，按年级+学科展示缩略图+下载按钮
   */
  function renderPosterGallery() {
    const grid = dom.galleryGrid;
    if (!grid) return;

    // 从数据聚合出所有 年级×学科 组合
    const grades = [...new Set(state.allData.map(d => d.grade))].sort(gradeSort);
    const subjects = [...new Set(state.allData.map(d => d.subject))].sort();
    const SEASON = '暑假';

    let html = '';
    let count = 0;

    grades.forEach(grade => {
      subjects.forEach(subject => {
        const items = state.allData.filter(d => d.grade === grade && d.subject === subject);
        if (items.length === 0) return;
        count++;

        const filename = `未来书房_${grade}_${subject}_${SEASON}_课程上新.jpg`;
        const stage = isPrimarySchool(grade) ? '小学' : '初中';

        // 预生成海报路径
        const posterUrl = `posters/${filename}`;

        html += `
          <div class="gallery-item" onclick="window.open('${posterUrl}','_blank')" title="点击下载 ${stage}${subject} 课程海报">
            <img src="${posterUrl}" alt="${grade} ${subject}" loading="lazy" onerror="this.parentElement.style.display='none'">
            <div class="gallery-label"><span>${grade} · ${subject}</span></div>
            <div class="gallery-download-hint">下载</div>
          </div>
        `;
      });
    });

    if (count > 0) {
      grid.innerHTML = html;
    } else {
      document.getElementById('posterGallery').style.display = 'none';
    }
  }

  // ===== 3. 核心筛选逻辑 =====
  function onFilterChange() {
    updateSelectStyles();
    checkHasFilter();

    if (!state.hasFilter) {
      showHint();
      return;
    }

    doFilter();
  }

  function updateSelectStyles() {
    [dom.selectGrade, dom.selectSubject, dom.selectClassType, dom.selectVersion, dom.selectSeason].forEach(el => {
      el.classList.toggle('active', !!el.value);
    });
  }

  function checkHasFilter() {
    state.hasFilter = !!(
      dom.selectGrade.value ||
      dom.selectSubject.value ||
      dom.selectClassType.value ||
      dom.selectVersion.value ||
      dom.selectSeason.value
    );
  }

  /** 执行筛选 */
  function doFilter() {
    const grade     = dom.selectGrade.value;
    const subject   = dom.selectSubject.value;
    const classType = dom.selectClassType.value;
    const version   = dom.selectVersion.value;
    const season    = dom.selectSeason.value;

    state.filteredData = state.allData.filter(item => {
      if (grade && item.grade !== grade) return false;
      if (subject && item.subject !== subject) return false;
      if (classType && item.classType !== classType) return false;
      if (version && item.version !== version) return false;
      if (season && (item.season || '暑假') !== season) return false;
      return true;
    });

    // 按 lessonNo 升序排列（讲次顺序）
    state.filteredData.sort((a, b) => (a.lessonNo || 0) - (b.lessonNo || 0));

    renderList();
  }

  /** 重置所有筛选条件 */
  function resetFilters() {
    dom.selectGrade.value = '';
    dom.selectSubject.value = '';
    dom.selectClassType.value = '';
    dom.selectVersion.value = '';
    dom.selectSeason.value = '';
    updateSelectStyles();
    checkHasFilter();
    showHint();

    dom.resetBtn.style.transform = 'scale(0.8) rotate(-180deg)';
    setTimeout(() => { dom.resetBtn.style.transform = ''; }, 250);
  }

  // ===== 4. 渲染列表 =====
  function renderList() {
    const data = state.filteredData;

    dom.countNum.textContent = data.length;
    dom.resultCount.style.display = data.length > 0 ? 'block' : 'none';
    dom.filterHint.style.display = 'none';
    dom.emptyState.style.display = 'none';

    if (data.length === 0) {
      dom.contentArea.innerHTML = '';
      dom.emptyState.style.display = 'block';
      dom.resultCount.style.display = 'none';
      return;
    }

    let html = '<div class="card-list">';
    data.forEach((item, index) => {
      html += buildCardHTML(item, index);
    });
    html += '</div>';

    dom.contentArea.innerHTML = html;
  }

  function buildCardHTML(item, index) {
    const delay = Math.min(index * 40, 500);
    const posterSrc = item.posterUrl || generatePlaceholder(item);

    return `
      <div class="catalog-card card-appear"
           style="animation-delay:${delay}ms"
           data-id="${item.id}"
           onclick="App.previewItem(${item.id})">
        <div class="card-poster-wrap">
          <img class="card-poster" src="${posterSrc}" alt="${escapeHtml(item.title)}" loading="lazy">
        </div>
        <div class="card-info">
          <h3 class="card-title">${escapeHtml(item.title)}</h3>
          <div class="card-meta">
            <span class="meta-classType">${escapeHtml(item.classType)}</span>
            <span class="meta-sep">·</span>
            <span class="meta-version">${escapeHtml(item.version)}</span>
            <span class="meta-sep">·</span>
            <span class="meta-season">${item.season || '暑假'}</span>
            <span class="meta-sep">·</span>
            <span class="meta-lessonNo">第${item.lessonNo}讲</span>
          </div>
        </div>
      </div>
    `;
  }

  /** 根据讲次内容生成差异化海报 SVG */
  function generatePlaceholder(item) {
    const subject = item.subject;
    const title = item.title || '';
    const lessonNo = item.lessonNo || 1;

    // 每个科目的配色方案
    const theme = getSubjectTheme(subject);

    // 从标题中解析内容类型
    const contentType = parseContentType(title, subject);
    const icon = contentType.icon;
    const subtitle = contentType.subtitle;
    const shortTitle = title
      .replace(/^第\d+讲[【\[]?[阅作复读写]?[】\]]?\s*/, '')
      .replace(/^(第[一二三四五六七八九十百千\d]+讲)\s*/, '$1\n')
      .substring(0, 20);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <defs>
        <linearGradient id="bg${item.id}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.bg}"/>
          <stop offset="100%" stop-color="${theme.bgDark}"/>
        </linearGradient>
      </defs>

      <!-- 背景 -->
      <rect width="300" height="400" fill="url(#bg${item.id})"/>

      <!-- 装饰圆 -->
      <circle cx="260" cy="40" r="120" fill="${theme.accent}" opacity="0.15"/>
      <circle cx="20" cy="380" r="80" fill="${theme.fg}" opacity="0.08"/>

      <!-- 科目标签条 -->
      <rect x="0" y="0" width="300" height="52" fill="${theme.fg}" opacity="0.12"/>
      <text x="24" y="33" font-size="15" font-weight="600" fill="${theme.fg}" opacity="0.95">${subject}</text>
      <text x="276" y="33" text-anchor="end" font-size="13" fill="${theme.fg}" opacity="0.7">第${lessonNo}讲</text>

      <!-- 图标区域 -->
      <text x="150" y="130" text-anchor="middle" font-size="56" fill="${theme.fg}" opacity="0.9">${icon}</text>

      <!-- 讲次类型标签 -->
      <rect x="90" y="155" width="120" height="28" rx="14" fill="${theme.fg}" opacity="0.18"/>
      <text x="150" y="174" text-anchor="middle" font-size="13" font-weight="500" fill="${theme.fg}" opacity="0.9">${subtitle}</text>

      <!-- 分割线 -->
      <line x1="40" y1="200" x2="260" y2="200" stroke="${theme.fg}" stroke-width="1" opacity="0.2"/>

      <!-- 讲次标题（最多显示两行） -->
      <text x="150" y="240" text-anchor="middle" font-size="22" font-weight="600" fill="${theme.fg}">
        ${escapeSvgText(shortTitle)}
      </text>

      <!-- 底部品牌 -->
      <rect x="0" y="368" width="300" height="32" fill="${theme.fg}" opacity="0.08"/>
      <text x="150" y="389" text-anchor="middle" font-size="13" fill="${theme.fg}" opacity="0.5">未来书房 · 课程目录</text>
    </svg>`;

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /** 科目主题配置 */
  function getSubjectTheme(subject) {
    const themes = {
      "语文": { bg: "#b71c1c", bgDark: "#d32f2f", fg: "#ffffff", accent: "#ff8a80" },
      "数学": { bg: "#0d47a1", bgDark: "#1565c0", fg: "#ffffff", accent: "#82b1ff" },
      "英语": { bg: "#1b5e20", bgDark: "#2e7d32", fg: "#ffffff", accent: "#a5d6a7" },
      "物理": { bg: "#4a148c", bgDark: "#7b1fa2", fg: "#ffffff", accent: "#ce93d8" },
      "化学": { bg: "#bf360c", bgDark: "#e65100", fg: "#ffffff", accent: "#ffab91" },
      "科学": { bg: "#004d40", bgDark: "#00695c", fg: "#ffffff", accent: "#80cbc4" },
    };
    return themes[subject] || themes["数学"];
  }

  /** 根据标题解析内容类型，返回图标和副标题 */
  function parseContentType(title, subject) {
    if (subject === "语文") {
      if (/【阅】|阅读|理解|概括|梳理|信息|环境描写|说明文|议论文|古文|名著|词语|略读|浏览|批注|关键语句|段落大意|重点段|评价人物|文题/.test(title))
        return { icon: "\ud83d\udcda", subtitle: "\u9605\u8bfe\u4e13\u9879" };       // 📚 阅读专项
      if (/【作】|写作|作文|演讲稿|日记|自述|推荐|介绍|变形记|心理|神态|活动|聚焦情境|扩写|想象|视角|比喻|拟人|设问|借物抒情|漫画|多人/.test(title))
        return { icon: "\u270f\ufe0f", subtitle: "\u4f5c\u6587\u4e13\u9879" };         // ✏️ 作文专项
      if (/复习|期末/.test(title))
        return { icon: "\ud83d\udccb", subtitle: "\u9636\u6bb5\u590d\u4e60" };          // 📋 阶段复习
      return { icon: "\ud83d\udcda", subtitle: "\u8bed\u6587\u8bfe\u7a0b" };             // 📚 语文课程
    }

    if (subject === "数学") {
      if (/计算|运算|混合|加减乘除|分数|小数|整除|因数|倍数/.test(title))
        return { icon: "\ud83d\uddee", subtitle: "\u8ba1\u7b97\u80fd\u529b" };           // 🧮 计算能力
      if (/几何|图形|角|三角形|四边形|圆|面积|体积|周长|测量|观察物体|射线|直线|线段|平行|垂直|对称|平移|旋转/.test(title))
        return { icon: "\ud83d\udccd", subtitle: "\u51e0\u4f55\u56fe\u5f62" };          // 📐 几何图形
      if (/应用题|解决问题|搭配|广角|优化|植树|行程|工程/.test(title))
        return { icon: "\ud83e\udee0", subtitle: "\u5e94\u7528\u4e0e\u601d\u7ef4" };       // 🧠 应用与思维
      if (/方程|等式|比例|百分数|比/.test(title))
        return { icon: "\ud83c\udfaf", subtitle: "\u4ee3\u6570\u4e0e\u6570\u5f62" };     // 🎯 代数与数形
      if (/统计|概率|数据|平均|可能/.test(title))
        return { icon: "\ud83d\udcca", subtitle: "\u7edf\u8ba1\u4e0e\u6982\u7387" };       // 📊 统计与概率
      if (/复习|期末|整理/.test(title))
        return { icon: "\ud83d\udccb", subtitle: "\u9636\u6bb5\u590d\u4e60" };
      return { icon: "\ud83d\uddee", subtitle: "\u6570\u5b66\u8bfe\u7a0b" };
    }

    if (subject === "英语") {
      if (/Sports|运动|play|game|fun/.test(title))
        return { icon: "\u26bd\ufe0f", subtitle: "\u8fd0\u52a8\u4e13\u9898" };          // ⚽ 运动专题
      if (/Weather|天气|season|month|nature/.test(title))
        return { icon: "\u2600\ufe0f", subtitle: "\u81ea\u7136\u4e16\u754c" };            // ☀️ 自然世界
      if (/Chores|家务|family|home|house/.test(title))
        return { icon: "\ud83c\udfe0", subtitle: "\u751f\u6d3b\u573a\u666f" };           // 🏠 生活场景
      if (/Travel|trip|road|safety|transport|restaurant|food/.test(title))
        return { icon: "\u2708\ufe0f", subtitle: "\u51fa\u884c\u4ea4\u9645" };           // ✈️ 出行交际
      if (/School|class|subject|friend/.test(title))
        return { icon: "\ud83c\udfeb", subtitle: "\u6821\u56ed\u751f\u6d3b" };           // 🏫 校园生活
      if (/review|Review|复习|期末/.test(title))
        return { icon: "\ud83d\udccb", subtitle: "\u9636\u6bb5\u590d\u4e60" };
      return { icon: "\ud83c\udf93", subtitle: "\u82f1\u8bed\u8bfe\u7a0b" };             // 📓 英语课程
    }

    if (subject === "物理") {
      if (/长度|测量|质量|密度|单位/.test(title))
        return { icon: "\ud83d\udccf", subtitle: "\u6d4b\u91cf\u4e0e\u5b9a\u91cf" };     // 📏 测量与定量
      if (/运动|速度|路程|时间|声|光|波|热|温度|物态变化|熔|沸|汽化/.test(title))
        return { icon: "\ud83c\udfaf", subtitle: "\u529b\u5b66\u4e0e\u58f0\u5149" };     // 🎯 力学与声光
      if (/力|压强|浮力|杠杆|滑轮|简单机械|功|功率|能量|电/.test(title))
        return { icon: "\u26a1", subtitle: "\u529b\u4e0e\u7535\u78c1" };               // ⚡ 力与电磁
      if (/实验|探究|仪器|操作|观察|验证/.test(title))
        return { icon: "\ud83d\udd2c", subtitle: "\u5b9e\u9a8c\u63a2\u7a76" };          // 🔬 实验探究
      if (/复习|阶段/.test(title))
        return { icon: "\ud83d\udccb", subtitle: "\u9636\u6bb5\u590d\u4e60" };
      return { icon: "\u26a1", subtitle: "\u7269\u7406\u8bfe\u7a0b" };                  // ⚡ 物理课程
    }

    if (subject === "化学") {
      if (/原子|分子|离子|元素|化合价|化学式|符号/.test(title))
        return { icon: "\u2697\ufe0f", subtitle: "\u7269\u8d28\u7ec4\u6210" };          // ⚛️ 物质组成
      if (/水|空气|氧气|氢气|碳|氧化物|酸|碱|盐|金属|溶液/.test(title))
        return { icon: "\ud83e\udeb0", subtitle: "\u7269\u8d28\u53d8\u5316" };          // 🧰 物质性质/变化
      if (/实验|仪器|操作|制取|检验|探究|净化/.test(title))
        return { icon: "\ud83d\udd2c", subtitle: "\u5b9e\u9a8c\u64cd\u4f5c" };          // 🔬 实验操作
      if (/复习|阶段/.test(title))
        return { icon: "\ud83d\udccb", subtitle: "\u9636\u6bb5\u590d\u4e60" };
      return { icon: "\u2697\ufe0f", subtitle: "\u5316\u5b66\u8bfe\u7a0b" };              // ⚛️ 化学课程
    }

    if (subject === "科学") {
      if (/声|光|电|磁|电路|电流|电压|电阻|欧姆/.test(title))
        return { icon: "\ud83d\udd26", subtitle: "\u58f0\u5149\u7535\u78c1" };         // 🔦 声光电磁
      if (/力|运动|机械|浮力|压强|杠杆/.test(title))
        return { icon: "\u26a1", subtitle: "\u529b\u4e0e\u8fd0\u52a8" };                // ⚡ 力与运动
      if (/水|地球|宇宙|太阳|生物|溶解|物质|空气|粒子/.test(title))
        return { icon: "\ud83c\udf0d", subtitle: "\u5730\u7403\u4e0e\u7269\u8d28" };     // 🌍 地球与物质
      if (/感觉|人体|健康|生命/.test(title))
        return { icon: "\ud83e\udde1", subtitle: "\u751f\u547d\u79d1\u5b66" };          // 🧡 生命科学
      if (/复习|阶段/.test(title))
        return { icon: "\ud83d\udccb", subtitle: "\u9636\u6bb5\u590d\u4e60" };
      return { icon: "\ud83d\udd2c", subtitle: "\u79d1\u5b66\u63a2\u7a76" };             // 🔬 科学探究
    }

    // 兜底
    return { icon: "\ud83d\udcdc", subtitle: "\u8bfe\u7a0b\u5185\u5bb9" };              // 📜 课程内容
  }

  /** SVG 文本转义（防止 XSS 和 SVG 注入） */
  function escapeSvgText(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function getBadgeLabel(subject) {
    const labels = {
      "语文": "📖 语文",
      "数学": "📐 数学",
      "英语": "🔤 英语",
      "物理": "⚛️ 物理",
      "化学": "🧪 化学",
      "科学": "🔬 科学",
    };
    return labels[subject] || subject;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== 5. 显示/隐藏 UI 状态 =====

  function showHint() {
    dom.filterHint.style.display = 'block';
    dom.resultCount.style.display = 'none';
    dom.emptyState.style.display = 'none';
    dom.contentArea.innerHTML = '';
  }

  // ===== 6. 预览弹窗 =====

  window.App = window.App || {};

  App.previewItem = function(id) {
    const item = state.filteredData.find(d => d.id === id) ||
                 state.allData.find(d => d.id === id);
    if (!item) return;

    state.currentPreview = item;
    dom.previewTitle.textContent = item.title;
    dom.previewImage.src = item.posterUrl || generatePlaceholder(item);
    dom.previewImage.alt = item.title;

    // 预览弹窗只显示简洁的元信息
    dom.previewTags.innerHTML = `
      <span class="preview-meta">${item.grade} · ${item.subject} · ${item.classType} · ${item.version}</span>
      <span class="preview-meta highlight">${item.season || '暑假'} · 第${item.lessonNo}讲</span>
    `;

    dom.previewOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  function closePreview() {
    dom.previewOverlay.style.display = 'none';
    document.body.style.overflow = '';
    state.currentPreview = null;
  }

  // ===== 7. 下载功能 =====

  async function onDownload() {
    const item = state.currentPreview;
    if (!item) return;

    const imgSrc = dom.previewImage.src;

    try {
      dom.downloadBtn.disabled = true;
      dom.downloadBtn.textContent = '保存中...';

      if (isMobile()) {
        await downloadOnMobile(imgSrc, item.title);
      } else {
        downloadOnPC(imgSrc, item.title);
      }
    } catch (err) {
      console.error('下载失败:', err);
      fallbackDownload(imgSrc);
    } finally {
      setTimeout(() => {
        dom.downloadBtn.disabled = false;
        dom.downloadBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          保存到手机
        `;
      }, 800);
    }
  }

  function downloadOnPC(src, title) {
    const link = document.createElement('a');
    link.href = src;
    link.download = sanitizeFilename(title) + '.png';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function downloadOnMobile(src, title) {
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      downloadOnPC(src, title);
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = sanitizeFilename(title) + '.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (e) {
      fallbackDownload(src);
    }
  }

  function fallbackDownload(src) {
    const win = window.open(src, '_blank');
    if (!win) {
      alert('请在浏览器中打开此页面以保存图片，或长按图片保存。');
    }
  }

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth <= 768;
  }

  function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').substring(0, 80);
  }

  // ===== 8. 汇总海报功能 =====

  /**
   * 显示汇总海报：将当前筛选结果生成为参考海报样式的长图
   * 样式还原自"课程上新长图.docx"中的237张参考海报：
   *   - 品牌头图（未来书房 logo）
   *   - 大标题："2026年XX课程上新"
   *   - 学科版本标签条
   *   - 结构化表格（小学：年级|难度|课程大纲；初中：年级|天数|讲次|内容分段|使用建议）
   */
  function showSummaryPoster() {
    const data = state.filteredData;
    if (data.length === 0) return;

    // 构建筛选条件信息
    const grade = dom.selectGrade.value || '';
    const subject = dom.selectSubject.value || '';
    const classType = dom.selectClassType.value || '';
    const version = dom.selectVersion.value || '';
    const season = dom.selectSeason.value || '暑假';

    // 检查是否选择了秋季且无数据
    if (season === '秋季' && data.every(d => (d.season || '暑假') !== '秋季')) {
      showSummaryOverlay([], { grade, subject, classType, version, season }, true);
      return;
    }

    showSummaryOverlay(data, { grade, subject, classType, version, season }, false);
  }

  /**
   * 判断是否为初中年级（7~9年级用于选择表格模板）
   */
  function isJuniorHigh(grade) {
    return ['七年级','八年级','九年级'].includes(grade);
  }

  /**
   * 判断是否为小学年级
   */
  function isPrimarySchool(grade) {
    return ['三年级','四年级','五年级','六年级'].includes(grade);
  }

  /**
   * 获取季节对应的显示名称和配色
   */
  function getSeasonStyle(season) {
    const map = {
      '寒假': { text: '寒假', color: '#1565c0', bg: '#e3f2fd' },
      '春季': { text: '春季', color: '#2e7d32', bg: '#e8f5e9' },
      '暑假': { text: '暑假', color: '#c62828', bg: '#ffebee' },
      '秋季': { text: '秋季', color: '#6a1b9a', bg: '#f3e5f5' },
    };
    return map[season] || map['暑假'];
  }

  /**
   * 将课程数据按年级分组
   */
  function groupByGrade(items) {
    const groups = {};
    items.forEach(item => {
      const g = item.grade;
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    // 按年级排序
    const gradeOrder = ['三年级','四年级','五年级','六年级','七年级','八年级','九年级'];
    const sorted = {};
    Object.keys(groups).sort((a,b) => {
      return (gradeOrder.indexOf(a) === -1 ? 99 : gradeOrder.indexOf(a)) -
             (gradeOrder.indexOf(b) === -1 ? 99 : gradeOrder.indexOf(b));
    }).forEach(k => sorted[k] = groups[k]);
    return sorted;
  }

  /**
   * 从标题中提取内容分段描述（去除讲次前缀后精简）
   */
  function extractContentSegment(title) {
    return title
      .replace(/^第\d+讲\s*【[阅作读写复]+】?\s*/, '')
      .replace(/^第\d+讲\s*(复习)?\s*/, '')
      .substring(0, 30);
  }

  function showSummaryOverlay(items, filters, isEmptySeason) {
    const overlay = document.createElement('div');
    overlay.className = 'summary-overlay';
    overlay.id = 'summaryOverlay';

    const filterText = [filters.grade, filters.subject, filters.classType, filters.version, filters.season]
      .filter(Boolean).join(' · ');

    const seasonStyle = getSeasonStyle(filters.season || '暑假');

    // 判断学科标签名
    const subject = filters.subject || '';
    let subjectBadge = '';
    if (subject) {
      const stage = isPrimarySchool((filters.grade || items[0]?.grade || '')) ? '小学' : '初中';
      subjectBadge = `${stage}${subject}`;
      if (filters.version) subjectBadge += ` ${filters.version}`;
    } else {
      subjectBadge = '课程目录';
    }

    // 如果是空季节（如秋季无数据）
    let bodyContent = '';
    if (isEmptySeason) {
      bodyContent = renderEmptySeasonHTML(filters.season, seasonStyle, subjectBadge);
    } else {
      bodyContent = renderSummaryLongImage(items, filters, seasonStyle, subjectBadge);
    }

    overlay.innerHTML = `
      <div class="summary-modal">
        <div class="summary-header">
          <div>
            <span class="summary-title">汇总海报</span>
            <span class="summary-filter">${escapeHtml(filterText || '全部')}</span>
          </div>
          <button class="summary-close" id="summaryClose">&times;</button>
        </div>
        <div class="summary-body" id="summaryBody">
          ${bodyContent}
        </div>
        <div class="summary-actions">
          <button class="btn-download-summary" id="btnDownloadSummary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            保存海报图片
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    document.getElementById('summaryClose').addEventListener('click', closeSummaryOverlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeSummaryOverlay();
    });
    document.addEventListener('keydown', function eh(e) {
      if (e.key === 'Escape') {
        closeSummaryOverlay();
        document.removeEventListener('keydown', eh);
      }
    });

    // 绑定下载事件
    const dlBtn = document.getElementById('btnDownloadSummary');
    if (dlBtn) {
      dlBtn.addEventListener('click', () => downloadSummaryAsImage(filters));
    }
  }

  /**
   * 渲染空季节占位页面（如秋季"等待更新"）
   */
  function renderEmptySeasonHTML(season, style, badgeName) {
    return `
      <div class="sp-long-image" id="spLongImage">
        <!-- 头部品牌区 -->
        <div class="sp-brand-header">
          <div class="sp-logo">📚 未来书房</div>
          <div class="sp-logo-en">FUTURE STUDIO</div>
        </div>

        <!-- 季节大标题 -->
        <div class="sp-season-title" style="color:${style.color}">
          <span class="sp-year">2026年</span><span class="sp-season-name">${season}</span>
          <br>课程上新
        </div>

        <!-- 学科标签 -->
        <div class="sp-subject-badge" style="border-color:${style.color};color:${style.color}">
          ${badgeName}
        </div>

        <!-- 空状态 -->
        <div class="sp-empty-season">
          <div class="sp-empty-icon">📅</div>
          <p class="sp-empty-text">敬请期待</p>
          <p class="sp-empty-hint">${season}课程正在紧锣密鼓准备中</p>
        </div>

        <!-- 底部装饰 -->
        <div class="sp-footer-deco">
          <p>未来书房 · 让学习更高效</p>
        </div>
      </div>
    `;
  }

  /**
   * 渲染汇总长图 HTML —— 还原参考海报样式
   */
  function renderSummaryLongImage(items, filters, style, badgeName) {
    // 按年级分组
    const grouped = groupByGrade(items);

    // 判断用哪种表格模板：只要有初中学段就用初中模板，否则用小学模板
    const grades = Object.keys(grouped);
    const hasJunior = grades.some(g => isJuniorHigh(g));
    const useJuniorTemplate = hasJunior;

    // 构建表格行
    let tableRows = '';
    if (useJuniorTemplate) {
      // 初中模板：年级 | 天数 | 讲次 | 内容分段 | 使用建议
      grades.forEach(grade => {
        const lessons = grouped[grade];
        // 初中按天数/讲次排列
        lessons.sort((a,b) => (a.lessonNo||0) - (b.lessonNo||0));

        lessons.forEach((item, idx) => {
          const content = extractContentSegment(item.title);
          const suggestion = item.classType || '单独做一次课';
          const dayLabel = `第${idx + 1}天`;

          tableRows += `
            <tr class="sp-row ${idx % 2 === 0 ? 'sp-row-even' : 'sp-row-odd'}">
              ${idx === 0 ? `<td class="sp-cell-grade" rowspan="${lessons.length}">${grade.replace('年级','')}<br>年级</td>` : ''}
              <td class="sp-cell-day">${dayLabel}</td>
              <td class="sp-cell-lesson">第${item.lessonNo}讲 ${content.substring(0, 10)}</td>
              <td class="sp-cell-content">${escapeHtml(content)}</td>
              <td class="sp-cell-suggest">${escapeHtml(suggestion)}</td>
            </tr>
          `;
        });
      });
    } else {
      // 小学模板：年级 | 难度 | 课程大纲（每行一讲）
      grades.forEach(grade => {
        const lessons = grouped[grade];
        lessons.sort((a,b) => (a.lessonNo||0) - (b.lessonNo||0));

        lessons.forEach((item, idx) => {
          const difficulty = item.classType || '培优';
          tableRows += `
            <tr class="sp-row ${idx % 2 === 0 ? 'sp-row-even' : 'sp-row-odd'}">
              ${idx === 0 ? `<td class="sp-cell-grade" rowspan="${lessons.length}">${grade.replace('年级','')}<br>年级</td>` : ''}
              <td class="sp-cell-difficulty">${difficulty}</td>
              <td class="sp-cell-syllabus"><strong>第${item.lessonNo}讲</strong> ${escapeHtml(extractContentSegment(item.title))}</td>
            </tr>
          `;
        });
      });
    }

    // 表头根据模板不同
    const theadHTML = useJuniorTemplate ? `
      <tr class="sp-head-row">
        <th class="sp-th">年级</th>
        <th class="sp-th">天数</th>
        <th class="sp-th">讲次</th>
        <th class="sp-th">内容分段</th>
        <th class="sp-th">使用建议</th>
      </tr>
    ` : `
      <tr class="sp-head-row">
        <th class="sp-th">年级</th>
        <th class="sp-th">难度</th>
        <th class="sp-th">课程大纲</th>
      </tr>
    `;

    return `
      <div class="sp-long-image" id="spLongImage">
        <!-- 头部品牌区 -->
        <div class="sp-brand-header">
          <div class="sp-logo">📚 未来书房</div>
          <div class="sp-logo-en">FUTURE STUDIO</div>
        </div>

        <!-- 季节大标题 -->
        <div class="sp-season-title" style="color:${style.color}">
          <span class="sp-year">2026年</span><span class="sp-season-name">${style.text}</span>
          <br>课程上新
        </div>

        <!-- 学科版本标签 -->
        <div class="sp-subject-badge" style="border-color:${style.color};color:${style.color}">
          ${badgeName}
        </div>

        <!-- 表格区域 -->
        <div class="sp-table-wrap">
          <table class="sp-data-table">
            <thead>${theadHTML}</thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>

        <!-- 底部 -->
        <div class="sp-footer-deco">
          <p>未来书房 · 让学习更高效</p>
          <p class="sp-footer-hint">共 ${items.length} 讲 · ${filters.season || ''}</p>
        </div>
      </div>
    `;
  }

  /**
   * 将汇总海报导出为纯 SVG 图片并触发下载（即时生成，无需等待）
   * 完全在浏览器本地完成，不依赖任何外部 CDN 或 API
   */
  function downloadSummaryAsImage(filters) {
    const data = state.filteredData;
    if (data.length === 0) return;

    const btn = document.getElementById('btnDownloadSummary');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="sp-mini-spin"></span> 生成中...`;
    }

    try {
      const season = filters.season || '暑假';
      const style = getSeasonStyle(season);

      // 构建筛选条件信息
      const filterText = [filters.grade, filters.subject, filters.classType, filters.version, season]
        .filter(Boolean).join(' · ');

      // 判断学科标签名
      const subject = filters.subject || '';
      let subjectBadge = '';
      if (subject) {
        const stage = isPrimarySchool((filters.grade || data[0]?.grade || '')) ? '小学' : '初中';
        subjectBadge = `${stage}${subject}`;
        if (filters.version) subjectBadge += ` ${filters.version}`;
      } else {
        subjectBadge = '课程目录';
      }

      // 生成 SVG 字符串
      const svgString = buildSummarySVG(data, filters, style, subjectBadge, filterText);

      // SVG → Canvas → JPG 导出
      const SCALE = 2; // 2x 分辨率，保证清晰度
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = function() {
        URL.revokeObjectURL(url);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth * SCALE;
        canvas.height = img.naturalHeight * SCALE;
        const ctx = canvas.getContext('2d');

        // 白色背景（JPG 不透明，必须填底色）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制 SVG 到 Canvas（2x 缩放保证清晰）
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 转 JPG 并下载
        canvas.toBlob(function(jpgBlob) {
          const jpgUrl = URL.createObjectURL(jpgBlob);
          const link = document.createElement('a');
          const name = [filters.subject, filters.grade, filters.season].filter(Boolean).join('_') || '课程汇总';
          link.download = `未来书房_${name}_课程上新.jpg`;
          link.href = jpgUrl;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(jpgUrl), 5000);

          // 恢复按钮
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              保存海报图片
            `;
          }
        }, 'image/jpeg', 0.92);
      };

      img.onerror = function() {
        URL.revokeObjectURL(url);
        console.error('SVG 转图片失败');
        alert('图片生成失败，请稍后重试。');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            保存海报图片
          `;
        }
      };

      img.src = url;

    } catch (err) {
      console.error('导出失败:', err);
      alert('图片生成失败，请稍后重试。');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          保存海报图片
        `;
      }
    }
  }

  /**
   * 构建汇总海报的完整 SVG 字符串
   * 包含：品牌头 → 季节标题 → 学科标签 → 数据表格 → 底部
   */
  function buildSummarySVG(items, filters, style, badgeName, filterText) {
    const W = 440; // 画布宽度
    const grouped = groupByGrade(items);
    const grades = Object.keys(grouped);
    const useJuniorTemplate = false; // 统一使用四列模板：年级 / 科目 / 难度 / 课程大纲

    // 计算表格区域高度：每行约 28px + 表头 34px
    let totalRows = 0;
    grades.forEach(g => { totalRows += grouped[g].length; });
    const tableHeaderH = 34;
    const rowH = 28;
    const tableBodyH = totalRows * rowH;
    const tableH = tableHeaderH + tableBodyH;

    // 各区域高度
    const headerH = 52;       // 品牌 head
    const titleH = 80;        // 季节大标题
    const badgeH = 40;        // 学科标签
    const tablePad = 16;      // 表格上下 padding
    const footerH = 50;       // 底部装饰
    const pad = 0;

    const totalH = pad + headerH + titleH + badgeH + tablePad + tableH + tablePad + footerH + pad;

    // 统一四列表头：年级 | 科目 | 难度 | 课程大纲
    const theadSVG = `
      <rect x="0" y="0" width="${W}" height="${tableHeaderH}" fill="#1a1a2e"/>
      <text x="20" y="${tableHeaderH/2 + 5}" fill="#ffffff" font-size="13" font-weight="600">年级</text>
      <text x="70" y="${tableHeaderH/2 + 5}" fill="#ffffff" font-size="13" font-weight="600">科目</text>
      <text x="130" y="${tableHeaderH/2 + 5}" fill="#ffffff" font-size="13" font-weight="600">难度</text>
      <text x="190" y="${tableHeaderH/2 + 5}" fill="#ffffff" font-size="13" font-weight="600">课程大纲</text>
      <line x1="0" y1="${tableHeaderH}" x2="${W}" y2="${tableHeaderH}" stroke="#333" stroke-width="1"/>
    `;

    // 统一四列表格行：年级 | 科目 | 难度 | 课程大纲
    let tbodySVG = '';
    let yOffset = 0;

    grades.forEach(grade => {
      const lessons = grouped[grade];
      lessons.sort((a,b) => (a.lessonNo||0) - (b.lessonNo||0));

      lessons.forEach((item, idx) => {
        const subject = item.subject || '';
        const difficulty = item.classType || '培优';
        const bg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
        const y = yOffset * rowH;

        // 年级单元格（仅第一行绘制合并效果）
        let gradeCell = '';
        if (idx === 0 && lessons.length > 0) {
          const cellH = lessons.length * rowH;
          gradeCell = `
            <rect x="0" y="${y}" width="50" height="${cellH}" fill="url(#gradeGrad_${grade})" stroke="#e0e0e0" stroke-width="1"/>
            <text x="25" y="${y + cellH/2 + 5}" text-anchor="middle" fill="#333" font-size="14" font-weight="700">${grade.replace(/年级/g,'')}</text>
            <text x="25" y="${y + cellH/2 + 20}" text-anchor="middle" fill="#666" font-size="10">年级</text>
          `;
        }

        tbodySVG += `
          ${gradeCell}
          <rect x="${idx === 0 ? 50 : 0}" y="${y}" width="${W - (idx===0?50:0)}" height="${rowH}" fill="${bg}"/>
          <line x1="0" y1="${y + rowH}" x2="${W}" y2="${y + rowH}" stroke="#eee" stroke-width="1"/>
          ${idx === 0 ? `<line x1="50" y="${y}" x2="50" y2="${y + rowH}" stroke="#e0e0e0" stroke-width="1.5"/>` : ''}
          <text x="70" y="${y + rowH/2 + 4}" fill="#2e7d32" font-size="11.5" font-weight="600">${escapeSvgText(subject)}</text>
          <text x="130" y="${y + rowH/2 + 4}" fill="#1565c0" font-size="11.5" font-weight="600" text-anchor="middle">${difficulty}</text>
          <text x="190" y="${y + rowH/2 + 4}" fill="#333" font-size="11.5">${escapeSvgText(extractContentSegment(item.title))}</text>
        `;
        yOffset++;
      });
    });

    // 为每个年级创建渐变定义
    let gradeGrads = '';
    grades.forEach(g => {
      gradeGrads += `<linearGradient id="gradeGrad_${g}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f5f5f5"/><stop offset="100%" stop-color="#eeeeee"/></linearGradient>`;
    });

    const tableY = pad + headerH + titleH + badgeH + tablePad;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" viewBox="0 0 ${W} ${totalH}" text-rendering="geometricPrecision" shape-rendering="crispEdges">
      <defs>
        ${gradeGrads}
        <linearGradient id="brandBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff8e1"/>
          <stop offset="50%" stop-color="#fff3e0"/>
          <stop offset="100%" stop-color="#fce4ec"/>
        </linearGradient>
        <linearGradient id="footerBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e3f2fd"/>
          <stop offset="100%" stop-color="#bbdefb"/>
        </linearGradient>
      </defs>

      <!-- 背景 -->
      <rect width="${W}" height="${totalH}" fill="#ffffff"/>

      <!-- 品牌头部 -->
      <rect x="0" y="${pad}" width="${W}" height="${headerH}" fill="url(#brandBg)"/>
      <text x="24" y="${pad + 30}" fill="#e65100" font-size="17" font-weight="700" letter-spacing="1" text-rendering="geometricPrecision">\u{1F4DA} \u672A\u6765\u4E66\u623F</text>
      <text x="200" y="${pad + 26}" fill="#bf360c" font-size="10" letter-spacing="2" font-weight="500" text-rendering="geometricPrecision">FUTURE STUDIO</text>

      <!-- 季节大标题 -->
      <text x="${W/2}" y="${pad + headerH + 42}" text-anchor="middle" fill="${style.color}" font-size="30" font-weight="700" letter-spacing="3" text-rendering="geometricPrecision">2026${style.text}</text>
      <text x="${W/2}" y="${pad + headerH + 68}" text-anchor="middle" fill="${style.color}" font-size="17" font-weight="600" letter-spacing="2" text-rendering="geometricPrecision">\u8BFE\u7A0B\u65B0\u4E0A</text>

      <!-- 学科标签 -->
      <rect x="20" y="${pad + headerH + titleH + 6}" width="4" height="26" fill="${style.color}" rx="1"/>
      <rect x="18" y="${pad + headerH + titleH + 4}" width="${badgeName.length * 16 + 40}" height="30" rx="15" fill="#f5f5f5"/>
      <text x="32" y="${pad + headerH + titleH + 24}" fill="${style.color}" font-size="15" font-weight="700" text-rendering="geometricPrecision">${badgeName}</text>

      <!-- 表格区域背景 -->
      <rect x="0" y="${tableY}" width="${W}" height="${tableH + tablePad*2}" fill="#fafafa"/>

      <!-- 表格表头 -->
      <g transform="translate(${(W - 420)/2}, ${tableY})">
        ${theadSVG}
      </g>

      <!-- 表格内容 -->
      <g transform="translate(${(W - 420)/2}, ${tableY + tableHeaderH})">
        ${tbodySVG}
      </g>

      <!-- 底部装饰 -->
      <rect x="0" y="${totalH - footerH}" width="${W}" height="${footerH}" fill="url(#footerBg)"/>
      <text x="${W/2}" y="${totalH - footerH + 22}" text-anchor="middle" fill="#1565c0" font-size="12" font-weight="500" text-rendering="geometricPrecision">\u672A\u6765\u4E66\u623F \u00B7 \u8BA9\u5B66\u4E60\u66F4\u9AD8\u6548</text>
      <text x="${W/2}" y="${totalH - footerH + 40}" text-anchor="middle" fill="#64b5f6" font-size="11" text-rendering="geometricPrecision">\u5171 ${items.length} \u8BB2 \u00B7 ${filters.season || ''}</text>
    </svg>`;
  }

  function closeSummaryOverlay() {
    const el = document.getElementById('summaryOverlay');
    if (el) {
      el.remove();
      document.body.style.overflow = '';
    }
  }

  // ===== 启动 =====
  init();

})();
