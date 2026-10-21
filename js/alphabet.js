/* =========================================================================
 * 字母启蒙（纯 0 基础第一步）
 * 26 个字母：字母名 / 字母音（在单词里的典型发音）/ 笔顺口诀 / 例词。
 * 发音统一复用全局 speak()（浏览器内置语音合成，零外部音频）。
 * 渲染：字母九宫格 → 点击展开该字母详情（大字形 + 发声 + 笔顺 + 例词）。
 * =======================================================================*/
(function () {
  "use strict";

  // l=大写 lo=小写 name=字母名(IPA) sound=字母音(IPA) stroke=笔顺口诀
  // words=[{en,ipa,cn}]
  const ALPHA = [
    { l:"A", lo:"a", name:"/eɪ/", sound:"/æ/", stroke:"先写左斜撇，再写右斜捺，最后中间一横",
      words:[{en:"apple",ipa:"/ˈæpl/",cn:"苹果"},{en:"ant",ipa:"/ænt/",cn:"蚂蚁"},{en:"ax",ipa:"/æks/",cn:"斧子"}] },
    { l:"B", lo:"b", name:"/biː/", sound:"/b/", stroke:"先写竖，再写上弯圈，最后下弯圈",
      words:[{en:"ball",ipa:"/bɔːl/",cn:"球"},{en:"book",ipa:"/bʊk/",cn:"书"},{en:"bus",ipa:"/bʌs/",cn:"公交车"}] },
    { l:"C", lo:"c", name:"/siː/", sound:"/k/", stroke:"从右上起笔，向左下画一个开口半圆",
      words:[{en:"cat",ipa:"/kæt/",cn:"猫"},{en:"cup",ipa:"/kʌp/",cn:"杯子"},{en:"car",ipa:"/kɑː/",cn:"汽车"}] },
    { l:"D", lo:"d", name:"/diː/", sound:"/d/", stroke:"先写竖，再写右边一个半圆",
      words:[{en:"dog",ipa:"/dɒɡ/",cn:"狗"},{en:"door",ipa:"/dɔː/",cn:"门"},{en:"duck",ipa:"/dʌk/",cn:"鸭子"}] },
    { l:"E", lo:"e", name:"/iː/", sound:"/e/", stroke:"先写短横，再写竖，最后中横和底横",
      words:[{en:"egg",ipa:"/eɡ/",cn:"鸡蛋"},{en:"elephant",ipa:"/ˈelɪfənt/",cn:"大象"},{en:"pen",ipa:"/pen/",cn:"钢笔"}] },
    { l:"F", lo:"f", name:"/ef/", sound:"/f/", stroke:"先写竖，再写上横，最后中横",
      words:[{en:"fish",ipa:"/fɪʃ/",cn:"鱼"},{en:"fan",ipa:"/fæn/",cn:"扇子"},{en:"foot",ipa:"/fʊt/",cn:"脚"}] },
    { l:"G", lo:"g", name:"/dʒiː/", sound:"/ɡ/", stroke:"先画半圆，再加一横和向右的小钩",
      words:[{en:"go",ipa:"/ɡəʊ/",cn:"去"},{en:"gun",ipa:"/ɡʌn/",cn:"枪"},{en:"gate",ipa:"/ɡeɪt/",cn:"大门"}] },
    { l:"H", lo:"h", name:"/eɪtʃ/", sound:"/h/", stroke:"先写左竖，再写右竖，最后中间一横",
      words:[{en:"hat",ipa:"/hæt/",cn:"帽子"},{en:"hand",ipa:"/hænd/",cn:"手"},{en:"house",ipa:"/haʊs/",cn:"房子"}] },
    { l:"I", lo:"i", name:"/aɪ/", sound:"/ɪ/", stroke:"先写竖，再写上点和下点",
      words:[{en:"igloo",ipa:"/ˈɪɡluː/",cn:"冰屋"},{en:"ink",ipa:"/ɪŋk/",cn:"墨水"},{en:"pig",ipa:"/pɪɡ/",cn:"猪"}] },
    { l:"J", lo:"j", name:"/dʒeɪ/", sound:"/dʒ/", stroke:"先写竖弯钩，最后上方加一点",
      words:[{en:"jump",ipa:"/dʒʌmp/",cn:"跳"},{en:"jam",ipa:"/dʒæm/",cn:"果酱"},{en:"jet",ipa:"/dʒet/",cn:"喷气飞机"}] },
    { l:"K", lo:"k", name:"/keɪ/", sound:"/k/", stroke:"先写竖，再写左斜、右斜两条斜线",
      words:[{en:"kite",ipa:"/kaɪt/",cn:"风筝"},{en:"key",ipa:"/kiː/",cn:"钥匙"},{en:"king",ipa:"/kɪŋ/",cn:"国王"}] },
    { l:"L", lo:"l", name:"/el/", sound:"/l/", stroke:"先写竖，再在底部向右写一横",
      words:[{en:"lion",ipa:"/ˈlaɪən/",cn:"狮子"},{en:"leg",ipa:"/leɡ/",cn:"腿"},{en:"lamp",ipa:"/læmp/",cn:"台灯"}] },
    { l:"M", lo:"m", name:"/em/", sound:"/m/", stroke:"先写左竖，再写两座山峰（右斜下、右斜上），最后右竖",
      words:[{en:"monkey",ipa:"/ˈmʌŋki/",cn:"猴子"},{en:"milk",ipa:"/mɪlk/",cn:"牛奶"},{en:"map",ipa:"/mæp/",cn:"地图"}] },
    { l:"N", lo:"n", name:"/en/", sound:"/n/", stroke:"先写左竖，再写右斜线，最后右竖",
      words:[{en:"nose",ipa:"/nəʊz/",cn:"鼻子"},{en:"net",ipa:"/net/",cn:"网"},{en:"nine",ipa:"/naɪn/",cn:"九"}] },
    { l:"O", lo:"o", name:"/əʊ/", sound:"/ɒ/", stroke:"从左上起笔，顺时针画一个圆，留一个小开口",
      words:[{en:"octopus",ipa:"/ˈɒktəpəs/",cn:"章鱼"},{en:"orange",ipa:"/ˈɒrɪndʒ/",cn:"橙子"},{en:"ox",ipa:"/ɒks/",cn:"公牛"}] },
    { l:"P", lo:"p", name:"/piː/", sound:"/p/", stroke:"先写竖，再写右边一个半圆",
      words:[{en:"pen",ipa:"/pen/",cn:"钢笔"},{en:"pig",ipa:"/pɪɡ/",cn:"猪"},{en:"park",ipa:"/pɑːk/",cn:"公园"}] },
    { l:"Q", lo:"q", name:"/kjuː/", sound:"/kw/", stroke:"先画一个圆，再在右下加一个小钩",
      words:[{en:"queen",ipa:"/kwiːn/",cn:"女王"},{en:"quiet",ipa:"/ˈkwaɪət/",cn:"安静的"},{en:"question",ipa:"/ˈkwestʃən/",cn:"问题"}] },
    { l:"R", lo:"r", name:"/ɑː/", sound:"/r/", stroke:"先写竖，再写半圆，最后向右下一小斜腿",
      words:[{en:"rabbit",ipa:"/ˈræbɪt/",cn:"兔子"},{en:"red",ipa:"/red/",cn:"红色"},{en:"rain",ipa:"/reɪn/",cn:"雨"}] },
    { l:"S", lo:"s", name:"/es/", sound:"/s/", stroke:"从上起笔，先向右下弯，再向右上弯（像半个 8）",
      words:[{en:"sun",ipa:"/sʌn/",cn:"太阳"},{en:"snake",ipa:"/sneɪk/",cn:"蛇"},{en:"six",ipa:"/sɪks/",cn:"六"}] },
    { l:"T", lo:"t", name:"/tiː/", sound:"/t/", stroke:"先写上一横，再写竖（竖不顶到最上面）",
      words:[{en:"tiger",ipa:"/ˈtaɪɡə/",cn:"老虎"},{en:"tree",ipa:"/triː/",cn:"树"},{en:"ten",ipa:"/ten/",cn:"十"}] },
    { l:"U", lo:"u", name:"/juː/", sound:"/ʌ/", stroke:"先写左竖、右竖，再写底部连成一弯",
      words:[{en:"umbrella",ipa:"/ʌmˈbrelə/",cn:"雨伞"},{en:"up",ipa:"/ʌp/",cn:"向上"},{en:"cup",ipa:"/kʌp/",cn:"杯子"}] },
    { l:"V", lo:"v", name:"/viː/", sound:"/v/", stroke:"先写左斜线，再写右斜线，两线在下相交",
      words:[{en:"van",ipa:"/væn/",cn:"厢式货车"},{en:"vest",ipa:"/vest/",cn:"背心"},{en:"vase",ipa:"/vɑːz/",cn:"花瓶"}] },
    { l:"W", lo:"w", name:"/ˈdʌbl juː/", sound:"/w/", stroke:"像连写两个 V：四笔斜线在下相交",
      words:[{en:"water",ipa:"/ˈwɔːtə/",cn:"水"},{en:"window",ipa:"/ˈwɪndəʊ/",cn:"窗户"},{en:"watch",ipa:"/wɒtʃ/",cn:"手表"}] },
    { l:"X", lo:"x", name:"/eks/", sound:"/ks/", stroke:"先写左斜线，再写右斜线，两线交叉",
      words:[{en:"box",ipa:"/bɒks/",cn:"盒子"},{en:"fox",ipa:"/fɒks/",cn:"狐狸"},{en:"six",ipa:"/sɪks/",cn:"六"}] },
    { l:"Y", lo:"y", name:"/waɪ/", sound:"/j/", stroke:"先写左斜、右斜，最后中间一竖向下",
      words:[{en:"yellow",ipa:"/ˈjeləʊ/",cn:"黄色"},{en:"yes",ipa:"/jes/",cn:"是"},{en:"yoyo",ipa:"/ˈjəʊjəʊ/",cn:"悠悠球"}] },
    { l:"Z", lo:"z", name:"/zed/", sound:"/z/", stroke:"先写上横，再写斜线，最后下横",
      words:[{en:"zebra",ipa:"/ˈzebrə/",cn:"斑马"},{en:"zoo",ipa:"/zuː/",cn:"动物园"},{en:"zero",ipa:"/ˈzɪərəʊ/",cn:"零"}] }
  ];

  window.ALPHA = ALPHA;

  // 当前展开的字母（首页/本视图内的临时状态）
  let alphaOpen = null;

  window.alphaPick = function (l) {
    alphaOpen = (alphaOpen === l) ? null : l;
    if (typeof render === "function") render();
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;"); }

  function wordsHtml(words) {
    return words.map(function (w) {
      const safe = w.en.replace(/'/g, "\\'");
      return `<li>
        <button class="mini" onclick="speak('${safe}')" title="听发音">🔊</button>
        <b>${esc(w.en)}</b> <i class="w-ipa">${esc(w.ipa)}</i> <span class="w-cn">${esc(w.cn)}</span>
      </li>`;
    }).join("");
  }

  function detailHtml(a) {
    const lo = a.lo, up = a.l;
    const safeLo = lo.replace(/'/g, "\\'");
    const safeUp = up.replace(/'/g, "\\'");
    return `
    <div class="al-detail">
      <div class="al-big">
        <span class="al-up">${up}</span><span class="al-lo">${lo}</span>
      </div>
      <div class="al-meta">
        <div class="al-row"><span class="al-k">字母名</span><b>${esc(a.name)}</b>
          <button class="mini" onclick="speak('${safeUp}')" title="听字母名">🔊 字母名</button></div>
        <div class="al-row"><span class="al-k">字母音</span><b>${esc(a.sound)}</b>
          <span class="muted">（在单词里的声音，听下面的例词）</span></div>
        <div class="al-row"><span class="al-k">笔顺</span><span>${esc(a.stroke)}</span></div>
      </div>
      <div class="al-words">
        <h4>例词（点 🔊 跟读）</h4>
        <ul>${wordsHtml(a.words)}</ul>
      </div>
      <p class="muted al-tip">小窍门：先盯着大字描红两遍，再点 🔊 听字母名，最后跟读例词三遍。</p>
    </div>`;
  }

  window.viewAlpha = function () {
    const grid = ALPHA.map(function (a) {
      const open = (alphaOpen === a.l);
      return `<button class="al-cell ${open ? "on" : ""}" onclick="alphaPick('${a.l}')">
        <span class="al-letter">${a.l}</span>
        <span class="al-sound">${esc(a.sound)}</span>
      </button>${open ? `<div class="al-expand">${detailHtml(a)}</div>` : ""}`;
    }).join("");

    return `
    <section class="alpha-wrap">
      <p class="alpha-lead">零基础第一步：先认识 26 个字母，会读、会写、知道它在单词里发什么音。
      点任意一个字母，下面会展开它的写法、读音和例词。</p>
      <div class="alpha-grid">${grid}</div>
    </section>`;
  };
})();
