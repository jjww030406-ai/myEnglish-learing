/* =========================================================================
 * 音标课（发音基础第 2 步，紧接字母启蒙）
 * 覆盖英语 44 个核心音素：12 单元音 + 8 双元音 + 24 辅音。
 * 每个音素：符号 / 口型描述 / 2 个例词（带音标+中文）。
 * 发音复用全局 speak()：音素本身无法直接念准，统一用「例词发音」来示范。
 * 渲染：按元音 / 辅音分组的音素网格 → 点击展开口型 + 例词。
 * =======================================================================*/
(function () {
  "use strict";

  // 单元音
  const VOWEL_MONO = [
    { sym:"/iː/", mouth:"长‘衣’音：嘴角向两边咧开，舌身平放靠前，拖长", words:[{en:"see",ipa:"/siː/",cn:"看见"},{en:"tree",ipa:"/triː/",cn:"树"}] },
    { sym:"/ɪ/", mouth:"短‘衣’音：嘴微张，舌身稍靠前，轻而短", words:[{en:"sit",ipa:"/sɪt/",cn:"坐"},{en:"pig",ipa:"/pɪɡ/",cn:"猪"}] },
    { sym:"/e/", mouth:"‘哎’音：嘴半张，舌身平放中部", words:[{en:"egg",ipa:"/eɡ/",cn:"鸡蛋"},{en:"bed",ipa:"/bed/",cn:"床"}] },
    { sym:"/æ/", mouth:"张大嘴‘安’音：下巴放低，舌身靠前", words:[{en:"cat",ipa:"/kæt/",cn:"猫"},{en:"apple",ipa:"/ˈæpl/",cn:"苹果"}] },
    { sym:"/ɑː/", mouth:"长‘啊’音：嘴张大，舌身放低靠后", words:[{en:"car",ipa:"/kɑː/",cn:"汽车"},{en:"star",ipa:"/stɑː/",cn:"星星"}] },
    { sym:"/ɒ/", mouth:"短‘奥’音：嘴张圆略小，舌身靠后", words:[{en:"hot",ipa:"/hɒt/",cn:"热"},{en:"dog",ipa:"/dɒɡ/",cn:"狗"}] },
    { sym:"/ɔː/", mouth:"长‘奥’音：双唇收圆向前突，拖长", words:[{en:"door",ipa:"/dɔː/",cn:"门"},{en:"horse",ipa:"/hɔːs/",cn:"马"}] },
    { sym:"/ʊ/", mouth:"短‘乌’音：双唇收圆，舌身后缩，轻短", words:[{en:"book",ipa:"/bʊk/",cn:"书"},{en:"good",ipa:"/ɡʊd/",cn:"好"}] },
    { sym:"/uː/", mouth:"长‘乌’音：双唇收圆突出，舌身后缩，拖长", words:[{en:"food",ipa:"/fuːd/",cn:"食物"},{en:"blue",ipa:"/bluː/",cn:"蓝色"}] },
    { sym:"/ʌ/", mouth:"‘阿’音（不卷舌）：嘴半张自然放松", words:[{en:"cup",ipa:"/kʌp/",cn:"杯子"},{en:"sun",ipa:"/sʌn/",cn:"太阳"}] },
    { sym:"/ɜː/", mouth:"长‘饿’音（不卷舌）：舌身放平中部，拖长", words:[{en:"bird",ipa:"/bɜːd/",cn:"鸟"},{en:"girl",ipa:"/ɡɜːl/",cn:"女孩"}] },
    { sym:"/ə/", mouth:"‘呃’轻音：最放松的中央元音，常在非重读时出现", words:[{en:"about",ipa:"/əˈbaʊt/",cn:"关于"},{en:"teacher",ipa:"/ˈtiːtʃə/",cn:"老师"}] }
  ];
  // 双元音
  const VOWEL_DI = [
    { sym:"/eɪ/", mouth:"由 /e/ 滑向 /ɪ/，像‘诶—’", words:[{en:"day",ipa:"/deɪ/",cn:"白天"},{en:"rain",ipa:"/reɪn/",cn:"雨"}] },
    { sym:"/aɪ/", mouth:"由 /a/ 滑向 /ɪ/，像‘啊—衣’", words:[{en:"eye",ipa:"/aɪ/",cn:"眼睛"},{en:"time",ipa:"/taɪm/",cn:"时间"}] },
    { sym:"/ɔɪ/", mouth:"由 /ɔ/ 滑向 /ɪ/，像‘奥—衣’", words:[{en:"boy",ipa:"/bɔɪ/",cn:"男孩"},{en:"toy",ipa:"/tɔɪ/",cn:"玩具"}] },
    { sym:"/aʊ/", mouth:"由 /a/ 滑向 /ʊ/，像‘啊—乌’", words:[{en:"house",ipa:"/haʊs/",cn:"房子"},{en:"now",ipa:"/naʊ/",cn:"现在"}] },
    { sym:"/əʊ/", mouth:"由 /ə/ 滑向 /ʊ/，像‘欧—’", words:[{en:"go",ipa:"/ɡəʊ/",cn:"去"},{en:"nose",ipa:"/nəʊz/",cn:"鼻子"}] },
    { sym:"/ɪə/", mouth:"由 /ɪ/ 滑向 /ə/，像‘衣—呃’", words:[{en:"ear",ipa:"/ɪə/",cn:"耳朵"},{en:"here",ipa:"/hɪə/",cn:"这里"}] },
    { sym:"/eə/", mouth:"由 /e/ 滑向 /ə/，像‘哎—呃’", words:[{en:"air",ipa:"/eə/",cn:"空气"},{en:"chair",ipa:"/tʃeə/",cn:"椅子"}] },
    { sym:"/ʊə/", mouth:"由 /ʊ/ 滑向 /ə/，像‘乌—呃’", words:[{en:"tour",ipa:"/tʊə/",cn:"旅行"},{en:"sure",ipa:"/ʃʊə/",cn:"确信的"}] }
  ];
  // 辅音
  const CONS = [
    { sym:"/p/", mouth:"双唇紧闭后突然张开，不振动声带（清）", words:[{en:"pen",ipa:"/pen/",cn:"钢笔"},{en:"map",ipa:"/mæp/",cn:"地图"}] },
    { sym:"/b/", mouth:"同 /p/，但声带振动（浊）", words:[{en:"book",ipa:"/bʊk/",cn:"书"},{en:"boy",ipa:"/bɔɪ/",cn:"男孩"}] },
    { sym:"/t/", mouth:"舌尖抵上齿龈后弹开，不振动（清）", words:[{en:"tea",ipa:"/tiː/",cn:"茶"},{en:"cat",ipa:"/kæt/",cn:"猫"}] },
    { sym:"/d/", mouth:"同 /t/，但声带振动（浊）", words:[{en:"dog",ipa:"/dɒɡ/",cn:"狗"},{en:"bed",ipa:"/bed/",cn:"床"}] },
    { sym:"/k/", mouth:"舌后抬起抵软腭后弹开，不振动（清）", words:[{en:"cat",ipa:"/kæt/",cn:"猫"},{en:"key",ipa:"/kiː/",cn:"钥匙"}] },
    { sym:"/ɡ/", mouth:"同 /k/，但声带振动（浊）", words:[{en:"go",ipa:"/ɡəʊ/",cn:"去"},{en:"dog",ipa:"/dɒɡ/",cn:"狗"}] },
    { sym:"/f/", mouth:"上齿轻触下唇，气流挤出，不振动（清）", words:[{en:"fish",ipa:"/fɪʃ/",cn:"鱼"},{en:"fan",ipa:"/fæn/",cn:"扇子"}] },
    { sym:"/v/", mouth:"同 /f/，但声带振动（浊）", words:[{en:"van",ipa:"/væn/",cn:"货车"},{en:"voice",ipa:"/vɔɪs/",cn:"声音"}] },
    { sym:"/θ/", mouth:"舌尖轻触上齿背，气流从缝挤出，不振动（清）咬舌音", words:[{en:"think",ipa:"/θɪŋk/",cn:"想"},{en:"three",ipa:"/θriː/",cn:"三"}] },
    { sym:"/ð/", mouth:"同 /θ/，但声带振动（浊）咬舌音", words:[{en:"this",ipa:"/ðɪs/",cn:"这个"},{en:"mother",ipa:"/ˈmʌðə/",cn:"妈妈"}] },
    { sym:"/s/", mouth:"舌尖靠近上齿龈，气流成缝挤出，不振动（清）", words:[{en:"sun",ipa:"/sʌn/",cn:"太阳"},{en:"see",ipa:"/siː/",cn:"看见"}] },
    { sym:"/z/", mouth:"同 /s/，但声带振动（浊）", words:[{en:"zoo",ipa:"/zuː/",cn:"动物园"},{en:"nose",ipa:"/nəʊz/",cn:"鼻子"}] },
    { sym:"/ʃ/", mouth:"双唇收圆前突，舌身抬起，气流挤出，不振动（清）", words:[{en:"she",ipa:"/ʃiː/",cn:"她"},{en:"fish",ipa:"/fɪʃ/",cn:"鱼"}] },
    { sym:"/ʒ/", mouth:"同 /ʃ/，但声带振动（浊）", words:[{en:"vision",ipa:"/ˈvɪʒən/",cn:"视力"},{en:"measure",ipa:"/ˈmeʒə/",cn:"测量"}] },
    { sym:"/h/", mouth:"气流从喉咙轻轻呼出，像喘气，不振动", words:[{en:"hat",ipa:"/hæt/",cn:"帽子"},{en:"house",ipa:"/haʊs/",cn:"房子"}] },
    { sym:"/tʃ/", mouth:"/t/ 与 /ʃ/ 合一，不振动（清）", words:[{en:"chair",ipa:"/tʃeə/",cn:"椅子"},{en:"watch",ipa:"/wɒtʃ/",cn:"手表"}] },
    { sym:"/dʒ/", mouth:"/d/ 与 /ʒ/ 合一，声带振动（浊）", words:[{en:"jump",ipa:"/dʒʌmp/",cn:"跳"},{en:"orange",ipa:"/ˈɒrɪndʒ/",cn:"橙子"}] },
    { sym:"/m/", mouth:"双唇紧闭，气流从鼻腔出，声带振动", words:[{en:"man",ipa:"/mæn/",cn:"男人"},{en:"milk",ipa:"/mɪlk/",cn:"牛奶"}] },
    { sym:"/n/", mouth:"舌尖抵上齿龈，气流从鼻腔出，声带振动", words:[{en:"no",ipa:"/nəʊ/",cn:"不"},{en:"sun",ipa:"/sʌn/",cn:"太阳"}] },
    { sym:"/ŋ/", mouth:"舌后抵软腭，气流从鼻腔出，声带振动（ng 音）", words:[{en:"sing",ipa:"/sɪŋ/",cn:"唱"},{en:"king",ipa:"/kɪŋ/",cn:"国王"}] },
    { sym:"/l/", mouth:"舌尖抵上齿龈，气流从舌两侧出，声带振动", words:[{en:"lion",ipa:"/ˈlaɪən/",cn:"狮子"},{en:"leg",ipa:"/leɡ/",cn:"腿"}] },
    { sym:"/r/", mouth:"舌尖卷起靠近上齿龈但不接触，声带振动", words:[{en:"red",ipa:"/red/",cn:"红色"},{en:"rain",ipa:"/reɪn/",cn:"雨"}] },
    { sym:"/w/", mouth:"双唇收圆突出后快速滑开，声带振动", words:[{en:"water",ipa:"/ˈwɔːtə/",cn:"水"},{en:"window",ipa:"/ˈwɪndəʊ/",cn:"窗户"}] },
    { sym:"/j/", mouth:"舌身抬起靠近硬腭，像‘衣’的起始，声带振动", words:[{en:"yes",ipa:"/jes/",cn:"是"},{en:"yellow",ipa:"/ˈjeləʊ/",cn:"黄色"}] }
  ];

  window.PHON_GROUPS = [
    { title:"单元音（12）", items: VOWEL_MONO },
    { title:"双元音（8）", items: VOWEL_DI },
    { title:"辅音（24）", items: CONS }
  ];

  let phonOpen = null;
  window.phonPick = function (sym) {
    phonOpen = (phonOpen === sym) ? null : sym;
    if (typeof render === "function") render();
  };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;"); }

  function wordsHtml(words) {
    return words.map(function (w) {
      const safe = w.en.replace(/'/g, "\\'");
      return `<li>
        <button class="mini" onclick="speak('${safe}')" title="听例词发音">🔊</button>
        <b>${esc(w.en)}</b> <i class="w-ipa">${esc(w.ipa)}</i> <span class="w-cn">${esc(w.cn)}</span>
      </li>`;
    }).join("");
  }

  function itemHtml(it) {
    const open = (phonOpen === it.sym);
    return `<button class="ph-cell ${open ? "on" : ""}" onclick="phonPick('${esc(it.sym)}')">
        <span class="ph-sym">${esc(it.sym)}</span>
      </button>${open ? `<div class="ph-expand">
        <div class="ph-mouth"><span class="ph-k">口型</span>${esc(it.mouth)}</div>
        <div class="ph-words"><h4>例词（点 🔊 听发音）</h4><ul>${wordsHtml(it.words)}</ul></div>
      </div>` : ""}`;
  }

  window.viewPhon = function () {
    const groups = PHON_GROUPS.map(function (g) {
      return `<div class="ph-group">
        <h3 class="ph-gtitle">${esc(g.title)}</h3>
        <div class="ph-grid">${g.items.map(itemHtml).join("")}</div>
      </div>`;
    }).join("");

    return `
    <section class="phon-wrap">
      <p class="phon-lead">音标是发音的「拼音」。会了字母，再认这 44 个音标，你就能照着音标自己读出任何生词。
      点任意一个音标，看口型怎么摆、听例词怎么读。</p>
      ${groups}
      <p class="muted phon-tip">提示：音标符号本身点不出声音，所以点开后是听「例词」来感受这个音。建议对着镜子模仿口型。</p>
    </section>`;
  };
})();
