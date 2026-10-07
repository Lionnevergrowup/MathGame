'use strict';
/* =====================================================================
   WORDS — everything on the screen and everything 乐乐 / Leo says, in Chinese and English.
   T: fixed lines he says · SHOW: what his bubble shows for some of them · U: words on the screen
   P: lines built from numbers and things · every spoken line is recorded (tools/build_audio.py)
   ===================================================================== */

/* ---------- Chinese numbers ---------- */
const CN_D = '零一二三四五六七八九';
// 1 → 一, 12 → 十二, 30 → 三十
const cn = n => n <= 10 ? (n === 10 ? '十' : CN_D[n]) : n < 20 ? '十' + CN_D[n - 10] : CN_D[Math.floor(n / 10)] + '十' + (n % 10 ? CN_D[n % 10] : '');
// with a measure word: 两个苹果, not 二个
const cnum = n => n === 2 ? '两' : cn(n);
const PY_D = ['líng', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ', 'shí'];
const cnPy = n => n <= 10 ? PY_D[n] : n < 20 ? 'shí ' + PY_D[n - 10] : PY_D[Math.floor(n / 10)] + ' shí' + (n % 10 ? ' ' + PY_D[n % 10] : '');
// a number said on its own: one syllable is recorded by its pinyin (so its tone is exactly right), longer ones as characters
const zhN = n => n <= 10 ? PY_D[n] : cn(n);

/* ---------- English numbers ---------- */
const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const en = n => n < 20 ? EN_ONES[n] : ['twenty', 'thirty', 'forty'][Math.floor(n / 10) - 2] + (n % 10 ? '-' + EN_ONES[n % 10] : '');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const EN_ORD = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const an = w => (/^(?:[aeio]|u(?!ni))/i.test(w) ? 'an ' : 'a ') + w;
const enCount = (n, o) => n === 0 ? `no ${o.pl}` : `${en(n)} ${n === 1 ? o.en : o.pl}`;
const isAre = n => n === 1 ? 'is' : 'are';

/* ---------- number sentences ---------- */
const zhExpr = e => e.t.map((x, i) => (i ? (e.o[i - 1] === '+' ? '加' : '减') : '') + cn(x)).join('');
const enExpr = e => e.t.map((x, i) => (i ? (e.o[i - 1] === '+' ? ' plus ' : ' minus ') : '') + en(x)).join('');
const eqVal = e => e.t.slice(1).reduce((v, x, i) => e.o[i] === '+' ? v + x : v - x, e.t[0]);

/* ---------- how things come and go in the stories ---------- */
const MOVE = {bird:'fly', bee:'fly', butterfly:'fly', balloon:'fly', duck:'swim', fish:'swim', whale:'swim', turtle:'swim', frog:'swim',
  rabbit:'run', cat:'run', dog:'run', kid:'run', chick:'run', monkey:'run', panda:'run', pig:'run', bear:'run', fox:'run', tiger:'run', squirrel:'run',
  apple:'eat', strawberry:'eat', banana:'eat', pear:'eat', orange:'eat', peach:'eat', cookie:'eat', candy:'eat', cupcake:'eat', carrot:'eat'};
const moveOf = (o, p) => p === 'bus' ? 'bus' : MOVE[o] || 'put';
const ZH_COME = {fly:'飞来了', swim:'游来了', run:'跑来了', eat:'放了', put:'放了', bus:'上车了'};
const ZH_GO = {fly:'飞走了', swim:'游走了', run:'跑走了', eat:'吃掉了', put:'拿走了', bus:'下车了'};
const EN_COME = {fly:['flies over', 'fly over'], swim:['swims over', 'swim over'], run:['runs over', 'run over'], eat:['is added', 'are added'], put:['is added', 'are added'], bus:['gets on', 'get on']};
const EN_GO = {fly:['flies away', 'fly away'], swim:['swims away', 'swim away'], run:['runs away', 'run away'], eat:['is eaten', 'are eaten'], put:['is taken away', 'are taken away'], bus:['gets off', 'get off']};
const ZH_PLACE = {pond:'池塘里', tree:'树上', grass:'草地上', plate:'盘子里', basket:'篮子里', sky:'天上', bus:'车上', box:'盒子里'};
const EN_PLACE = {pond:'in the pond', tree:'in the tree', grass:'on the grass', plate:'on the plate', basket:'in the basket', sky:'in the sky', bus:'on the bus', box:'in the box'};
const keyOf = o => Object.keys(OBJ).find(k => OBJ[k] === o);
const storyEqOf = s => s.t === 'chain' ? {t:s.n, o:s.s.split('')} : {t:[s.n[0], s.n[1]], o:[s.t === 'arrive' || s.t === 'combine' ? '+' : '-']};

const LESSON_INTRO = {
  zh:[null, '一个一个地数，不重复，也不漏掉。', '比一比：哪个多？哪个长？哪个高？', '上下、左右、前后，说一说东西在哪里。', '一样的东西放在一起，这就是分类。',
    '一、二、三、四、五，我们来认数。', '大于号、小于号、等于号，比一比两个数。', '“几个”说的是多少，“第几”说的是位置。', '一个数可以分成两个数，两个数可以合成一个数。',
    '把两部分合起来，用加法。', '从里面去掉一些，用减法。', '一个也没有，用零表示。', '认识六和七：数一数，写一写，分一分。', '六和七的加法和减法。',
    '认识八和九：数一数，写一写，分一分。', '八和九的加法和减法。', '认识十，记住凑成十的好朋友。', '十的加法和减法。', '三个数连着加或者连着减，从左往右算。',
    '有加也有减，从左往右，一步一步地算。', '长方体、正方体、圆柱和球。', '十个一是一个十，十几就是一个十和几个一。', '个位、十位，还有数的顺序和大小。',
    '十加几就是十几，十几减几还是十几。', '九加几，先把九凑成十。', '八、七、六加几，也是先凑成十。', '小数加大数，先看大数，凑成十。', '看图想一想：用加法还是减法？',
    '二十以内的数：数一数，比一比，排一排。', '二十以内的加法和减法，算得又对又快。', '图形、位置和分类，我们都学会了。'],
  en:[null, "Count one by one. Don't skip any, and don't count any twice.", 'Compare: which has more? Which is longer? Which is taller?',
    'Above and below, left and right, in front and behind: where is it?', 'Putting things that are alike together is called sorting.',
    "Let's learn the numbers one to five.", 'Greater than, less than, equal: compare two numbers.', 'How many is an amount. Which place is a position.',
    'A number can be split into two numbers, and two numbers can make one number.', 'When we put two groups together, we add.', 'When we take some away, we subtract.',
    'When there is nothing at all, we write zero.', "Let's learn six and seven: count them, write them, split them.", "Let's add and take away with six and seven.",
    "Let's learn eight and nine: count them, write them, split them.", "Let's add and take away with eight and nine.", 'Ten! Remember the pairs that make ten.',
    "Let's add and take away with ten.", 'Adding or taking away three numbers: work from left to right.', 'Adding and taking away together: work from left to right, one step at a time.',
    'Rectangular prisms, cubes, cylinders and spheres.', 'Ten ones make one ten. A teen number is one ten and some ones.', 'Tens and ones, and the order of numbers.',
    'Ten plus some ones makes a teen number.', 'Nine plus a number: first make nine into ten.', 'Eight, seven or six plus a number: make a ten first.',
    'A small number plus a big one: start with the big number and make ten.', 'Look at the picture. Should we add or take away?',
    'Numbers up to twenty: count, compare and put them in order.', 'Adding and taking away up to twenty, quick and right!', 'Shapes, positions and sorting: we know them all!'],
};

const TEXT = {
/* =========================== 中文 =========================== */
zh: {
  PRAISE:['真棒！', '太好了！', '你答对了！', '好厉害！', '真聪明！', '非常好！', '了不起！', '做得好！', '你真行！'],
  TRY:['再试一次！', '哎呀，再试试！', '差一点点，再来一次！'],
  NUMW:range(0, 20).map(cn), NUMPY:range(0, 20).map(cnPy),
  RHYME_PIC:{'1':'✏️', '2':'🦆', '3':'👂', '4':'🚩', '5':'⚖️', '6':'🌱', '7':'🌾', '8':'🥨', '9':'🥄', '0':'🥚'},
  POS_HAN:{up:['上面', 'shàng miàn'], down:['下面', 'xià miàn'], left:['左边', 'zuǒ biān'], right:['右边', 'yòu biān'], front:['前面', 'qián miàn'], back:['后面', 'hòu miàn']},
  SHAPE_PY:{cuboid:['长方体', 'cháng fāng tǐ'], cube:['正方体', 'zhèng fāng tǐ'], cylinder:['圆柱', 'yuán zhù'], sphere:['球', 'qiú']},
  T:{
    greet:'你好！我是小狮子乐乐。我们一起学数学吧！', pickLesson:'选一课吧！', playAgain:'再玩一次吗？', hooray:'太棒了！', greatJob:'真棒！',
    earnedStar:'你得到了一颗星星！', finishALesson:'学完一课，就能得到一张贴纸！', hiGrownUps:'家长朋友们好！', readingVoice:'小朋友好！我是乐乐，这是我说话的声音。',
    welcomeBack:'欢迎回来！我们接着玩。', tapEachCard:'点一点每张卡片，跟我一起说！',
    countAgain:'再数一数！', tapToCount:'点一点，一个一个地数。', zeroCard:'零，一个也没有。',
    tooMany:'太多了，拿走一些。', tooFew:'还不够，再放一些。', tapToTake:'放多了，点一点盘子里的就能拿走。', bundleIs10:'一捆是十根。', bundleIt:'满十根，要捆成一捆。',
    drawIntro:'画一画你喜欢的东西，数一数画了几个，再选一个数字！', drawFirst:'先画一幅画吧！', pickNumber:'你画了几个？选一个数字吧！', greatDrawing:'画得真好！',
    writeThis:'写一写：', howToTrace:'从绿点开始，跟着箭头写。', startDot:'从绿点开始哦！', followArrow:'跟着箭头写！', toTheEnd:'写到箭头的尽头哦！',
    matchUp:'一个对一个，比一比。', same:'同样多。', lengthIntro:'比长短，要把一头对齐。', heightIntro:'比高矮，要站在一样平的地上。',
    intro_ud:'看一看，谁在上面，谁在下面。', intro_lr:'举起你的右手，右手这边是右边，另一边是左边。', intro_fb:'小动物们在赛跑，离终点近的在前面。',
    sortIntro:'把东西放进对的筐里。先听一听每个筐。',
    whichSign:'圆圈里填大于号、小于号，还是等于号？', signRule:'开口朝着大数，尖尖朝着小数。',
    sign_gt:'大于号：开口朝着大的数。', sign_lt:'小于号：尖尖朝着小的数。', sign_eq:'等于号：两边同样多。', sign_plus:'加号：合起来，用加法。', sign_minus:'减号：去掉一些，用减法。',
    orderUp:'从小到大，排一排！', orderDown:'从大到小，排一排！', smallFirst:'先找最小的数。', bigFirst:'先找最大的数。',
    lineIntro:'小动物们排好队了。我们从左边数一数。', fewVsNth:'三只小动物，要点三个；第三只，只点一个。',
    splitIntro:'分一分，看看可以怎样分。', joinIntro:'合一合，看看两个数合成几。',
    pickEquation:'看图，选出对的算式。', plusSign:'这是加号。', minusSign:'这是减号。',
    trainIntro:'口算开火车！答对一题，加一节车厢。', trainGo:'火车开动啦！呜——', whichEquation:'用哪个算式？',
    whatShape:'它是什么形状？',
    tenSticks:'数出十根小棒，捆成一捆。', tenOnes:'十个一是一个十。', whatNumber:'这是几？', countBeads:'数一数珠子。', countSticks:'一捆是十，再一根一根地数。',
    abacusIntro:'这是计数器。', onesRod:'右边第一位是个位，一颗珠子是一个一。', tensRod:'右边第二位是十位，一颗珠子是一个十。',
    whatMissing:'空格里是几？', whatInBox:'方框里填几？', makeTenRule:'凑十法：看大数，分小数，凑成十，再加几。', swapRule:'交换两个数的位置，得数不变。',
  },
  SHOW:{
    greet:'你好！我是小狮子乐乐。我们一起学数学吧！🔢', welcomeBack:'欢迎回来！👋', sayWithMe:'跟我说！🗣️', tapEachCard:'点一点每张卡片，跟我一起说！👆',
    tooMany:'太多了，拿走一些。🤏', tooFew:'还不够，再放一些。➕', bundleIt:'满十根，要捆成一捆。🎀',
    drawFirst:'先画一幅画吧！🖍️', pickNumber:'你画了几个？选一个数字吧！🔢', drawIntro:'画一画，数一数，再选一个数字！🎨',
    startDot:'从绿点开始哦！🟢', followArrow:'跟着箭头写！➡️', toTheEnd:'写到箭头的尽头哦！✏️',
    sortIntro:'把东西放进对的筐里！🧺', whichSign:'圆圈里填 >、< 还是 =？🤔', orderUp:'从小到大，排一排！🪜', orderDown:'从大到小，排一排！🪜',
    lineIntro:'从左边数一数！👉', splitIntro:'分一分！✂️', pickEquation:'看图，选出对的算式！🧮', trainGo:'火车开动啦！🚂',
    tenSticks:'十根小棒捆成一捆 🎀', tenOnes:'10 个一 = 1 个十', whatNumber:'这是几？🤔', abacusIntro:'计数器：十位和个位 🧮',
    lookBig:'先看大数！👀', makeTenRule:'凑十法：看大数，分小数，凑成十，再加几。🔟',
  },
  U:{
    appName:'数学乐园', lionName:'小狮子乐乐', lionLabel:'乐乐：点一点再听一遍，按住可以拖动', stars:'星星', back:'返回', listen:'听一听',
    toStart:'数学乐园：回到开始页面', startPage:'开始页面', myStickers:'我的贴纸', parents:'家长', update:'更新到最新版本',
    unitTitle:u => u === 0 ? '数学游戏' : `第${cn(u)}单元 · ${['', '5以内数的认识和加、减法', '6～10的认识和加、减法', '认识立体图形', '11～20的认识', '20以内的进位加法', '复习与关联'][u]}`,
    startPageBtn:'🏁 开始页面', musicOn:'🎵 音乐：开', musicOff:'🔇 音乐：关', switchLang:'Switch to English', otherLang:'🌐 English',
    tagline:'跟小狮子乐乐学数学 · 一年级上册 30 课', soundOn:'🔊 请打开声音！', start:'▶ 开始',
    statusDone:'，已完成', statusSome:(c, t) => `，完成了${c}个，共${t}个`, lessonAria:(n, label) => `第${n}课：${label}`, lessonTitle:n => `第${n}课`,
    listenLesson:'📖 听一听', lessonNext:(n, icon, name) => `第${cn(n)}课！点 ${icon} ${name}。`, lessonAgain:n => `你学完了第${cn(n)}课！🎉 再玩一次吗？`,
    startAgain:'从头开始', actAria:(n, name) => `第${n}课：${name}`, progress:'进度', hearAgain:'再听一遍',
    lessonDone:'这一课学完啦！', nextLesson:n => `第${n}课 ➜`, myStickersBtn:'🏆 我的贴纸', homeBtn:'🏠 首页', hoorayLesson:n => `太棒了！你学完了第${cn(n)}课！🎉`,
    gotStar:'你得到了一颗星星！', doneAgain:'你又完成了一次！', backToLesson:n => `📚 第${n}课`, stickerAria:(n, name) => `第${n}课的贴纸：${name || '还没有得到'}`,
    checking:'正在检查……', soundNoClips:'⚠️ 语音文件没有加载。请点首页右上角的 🔄 更新。',
    soundOk:'✅ 乐乐的声音正在播放。如果听不到，请把音量调大，并检查是否连接了蓝牙耳机或音箱。', soundBlocked:'⚠️ 浏览器暂时不让播放声音。请先点一下页面，再试一次。',
    soundError:'⚠️ 有一个语音文件没有加载。请检查网络，再点 🔄 更新。', soundNone:'⚠️ 声音没有开始播放。如果是在微信里打开的，请点右上角“…”，选“在浏览器打开”。',
    noSuchColumn:'这一课没有这一项', checkAria:(n, col, on) => `第${n}课 ${col}：${on ? '已勾选' : '未勾选'}`, checkCols:{num:'认数·比较', calc:'计算', shape:'图形·位置', story:'解决问题'},
    tickByHand:'这是您勾的，点一下可以改。', tickByGame:'孩子在游戏里完成了，点一下可以改。', tickHere:'点一下打勾',
    parentsTitle:'👪 家长页面', guideTitle:'使用说明',
    guideIntro:['课程顺序参照人教版（2024）一年级上册数学：数学游戏、5以内数的认识和加减法、6～10的认识和加减法、认识立体图形、11～20的认识、20以内的进位加法、复习与关联，共 30 课。每次玩 10–15 分钟就好。',
      '乐乐会把每一句说明读出来，孩子不用认字也能玩。每个游戏的题目越来越难：前两题 3 个选项，后面 4 个，而且更接近。答错不扣分，错两次会提示正确答案。'],
    guideList:['🔢 数一数：点数字卡听一听，再数一数有几个，戳破对的气球；点一点图里的东西，可以一个一个地数。',
      '🧺 摆一摆：按数字把东西放到盘子里（11～20 用一捆一捆的小棒）。✏️ 写数字：从绿点开始，跟着箭头一笔一笔写，写好了还有数字儿歌。',
      '⚖️ 比多少、📏 比长短、🏢 比高矮；🐊 比大小：认识 >、<、=；🪜 排一排：从小到大排数。',
      '📍 认位置：上下、左右、前后；🥇 第几：分清“几个”和“第几”；🗂️ 分一分：按种类、颜色、大小、形状分类，再数一数。',
      '🍑 分与合、🃏 凑数：数的组成；➕ ➖ 加法和减法：看图列式、求得数、填缺的数；🚂 开火车：口算练习；📖 解决问题：听故事，列算式。',
      '🧊 立体图形：长方体、正方体、圆柱、球；🔟 小棒和 🧮 计数器：十和几、十位和个位；🛤️ 数的顺序；凑十法：9加几、8加几……'],
    guideTip:'小提示：请打开声音，平板电脑最好用。点左下角的乐乐可以再听一遍，也可以把乐乐拖到别的地方。玩到一半离开或刷新页面，回来会接着玩。',
    settings:'设置', langNote:'换成 English 后，乐乐说英文，屏幕上的字也变成英文，题目不变。', voiceSpeed:'语速', slow:'🐢 慢', normal:'🙂 正常', fast:'🐇 快',
    pinyin:'拼音', show:'显示', hide:'隐藏', sfx:'音效', on1:'🔔 开', off1:'🔕 关', music:'背景音乐', on2:'🎵 开', off2:'🔇 关',
    captions:'显示乐乐说的话', on3:'💬 开', off3:'关', captionsNote:'关掉声音玩的时候可以打开：乐乐的气泡会显示他说的每一句话。',
    length:'游戏长度', short:'🐣 短', normalLen:'🦁 正常', lengthNote:'短：每个游戏大约 3 题，适合年龄小的孩子。每玩完一个游戏就会保存星星，一课可以分几天学完。',
    putBack:'🦁 把乐乐放回角落', soundTest:'声音测试', testSound:'🔊 测试声音',
    soundHelp:'没有声音？请把音量调大。如果是在微信等 App 里打开的，请点右上角“…”，选“在浏览器打开”。连接了蓝牙耳机或音箱时，声音会从那里播放。关掉声音也能玩：打开“显示乐乐说的话”。',
    updateLabel:'更新', updateBtn:'🔄 更新到最新版本', current:'当前：',
    checkTitle:'家长 / 老师检查表', lessonCol:'课', checkNote:'孩子玩完对应的游戏，格子会自动打勾。您也可以点任何一个格子，自己打勾或取消。', resetBtn:'🗑️ 清除学习记录',
    credits:['课程顺序参照人教版（2024）一年级上册数学。题目、图画和小故事都是为这个游戏编写的，不是课本原文；数字儿歌（1像铅笔细长条……）是传统儿歌。',
      '乐乐的声音由开源模型 Kokoro-82M（Apache-2.0）生成。字体：Fredoka、Andika（SIL Open Font License）和文鼎 AR PL KaitiM GB（Arphic Public License）。',
      '学习进度只保存在这台设备的这个浏览器里，不会上传到任何地方。'],
    wrongAnswer:'不对哦，再试一次。', fillAnswer:'请先填写答案。', cleared:'记录已清除', clearedNote:'这台设备上的星星、贴纸和勾选都已经清除了。', ok:'好的',
    resetTitle:'清除全部学习记录？', resetNote:'这会清除这台设备上所有的星星、贴纸和勾选，不能恢复。', gateQ:(a, b) => `请家长回答：${a} × ${b} = ?`, resetConfirm:'🗑️ 清除', cancel:'取消',
    version:(n, d) => `版本 ${n} · ${d}`, newVersion:n => `🔄 新版本 ${n} 来啦，点这里更新！`, updating:'正在更新……', updatingNote:'正在获取最新版本',
    balloon:'气球 ', go:'🎈 开始 ➜', watchAgain:'🔁 再看一次', plate:'盘子', addOne:'放一个', doneCheck:'✔ 好了', takeBundle:'拿走一捆', takeStick:'拿走一根',
    tensShort:'一捆一捆', onesShort:'一根一根', addBundle:'放一捆', addStick:'放一根', drawArea:'画画的地方', labelTip:'拖动可以移动，点一下可以拿掉',
    thin:'细笔', mid:'中笔', thick:'粗笔', eraser:'橡皮', undo:'撤销', clearAll:'清空', pickNumber:'选一个数', savePic:'保存图片', doneDraw:'✅ 画好了',
    traceArea:'写数字的地方', traceAgain:'🧽 重写', showMe:'👀 看一看', more:'多', fewer:'少', same:'同样多',
    posWord:{up:'上面', down:'下面', left:'左边', right:'右边', front:'前面', back:'后面'}, signName:{gt:'大于号', lt:'小于号', eq:'等于号'},
    countAgainBtn:'👉 再数一次', tensPlace:'十位', onesPlace:'个位', whatShape:'是什么形状？', clearBeads:'🧽 清零',
    actName:a => ({
      count:() => '数一数', place:() => '摆一摆', draw:() => '画一画', write:() => '写数字', more:() => '比多少', length:() => a.what === 'building' ? '比高矮' : '比长短',
      pos:() => ({ud:'上和下', lr:'左和右', fb:'前和后', mix:'认位置'})[a.axis], sort:() => ({kind:'按种类分', color:'按颜色分', size:'按大小分', shape:'按形状分', mix:'按形状分'})[a.by],
      signs:() => a.pics ? '比大小' : '比一比', order:() => '排一排', ordinal:() => ({which:'谁是第几', rank:'排第几', few:'几个和第几', mix:'第几'})[a.mode],
      bond:() => ({split:'分一分', join:'合一合', mix:'分与合'})[a.mode], pairs:() => a.nums.includes(10) ? '凑十' : '凑数',
      calc:() => ({'+':'加法', '-':'减法', '+-':'加和减', teen:'十几加减', carry:'进位加法', '++--':'连加连减', '+-mix':'加减混合', review:'算一算'})[a.ops],
      train:() => '开火车', story:() => a.pick ? '看图列式' : '解决问题', shape:() => ({name:'认图形', find:'找一找', count:'数图形', mix:'认图形'})[a.mode],
      tens:() => a.mode === 'abacus' ? '计数器' : '捆小棒', numline:() => '数的顺序', maketen:() => '凑十法',
    })[a.type](),
  },
  P:{
    n:zhN, ordinal:n => `第${cn(n)}`,
    count:(n, o) => n === 0 ? `没有${o.zh}` : `${cnum(n)}${o.cl}${o.zh}`,
    howMany:o => `数一数，有几${o.cl}${o.zh}？`, howManyShow:o => `数一数，有几${o.cl}${o.zh}？${o.e}`,
    find:(n, o) => n === 0 ? `哪一组没有${o.zh}？` : `哪一组有${cnum(n)}${o.cl}${o.zh}？`, findShow:(n, o) => `哪一组有 ${n} ${o.cl}${o.zh}？${o.e}`,
    place:(n, o) => `放${cnum(n)}${o.cl}${o.zh}到盘子里。`, placeShow:(n, o) => `放 ${n} ${o.cl}${o.zh}到盘子里 ${o.e}`,
    placeSticks:n => `用小棒摆出${cn(n)}。`, placeSticksShow:n => `用小棒摆出 ${n}`,
    teenA:v => v === 10 ? '十个一是一个十。' : v === 20 ? '两个十是二十。' : `一个十和${cnum(v - 10)}个一是${cn(v)}。`,
    drew:n => `你画了${cnum(n)}个！`, drewShow:n => `你画了 ${n} 个！🎨`,
    colorName:c => ({black:'黑色', red:'红色', orange:'橙色', yellow:'黄色', green:'绿色', blue:'蓝色', purple:'紫色', pink:'粉色', brown:'棕色'})[c],
    rhyme:d => ({'1':'一像铅笔细长条。', '2':'二像小鸭水上漂。', '3':'三像耳朵听声音。', '4':'四像小旗迎风飘。', '5':'五像秤钩来卖菜。',
      '6':'六像豆芽咧嘴笑。', '7':'七像镰刀割青草。', '8':'八像麻花拧一道。', '9':'九像勺子能吃饭。', '0':'零像鸡蛋做蛋糕。'})[d],
    rhymeShow:d => ({'1':'1 像铅笔细长条', '2':'2 像小鸭水上漂', '3':'3 像耳朵听声音', '4':'4 像小旗迎风飘', '5':'5 像秤钩来卖菜',
      '6':'6 像豆芽咧嘴笑', '7':'7 像镰刀割青草', '8':'8 像麻花拧一道', '9':'9 像勺子能吃饭', '0':'0 像鸡蛋做蛋糕'})[d],
    writeShow:d => `写一写：${d} ✏️`,
    moreQ:(A, B) => `${A.zh}和${B.zh}，哪个多？`, fewerQ:(A, B) => `${A.zh}和${B.zh}，哪个少？`, moreA:X => `${X.zh}多。`, fewerA:X => `${X.zh}少。`,
    lenQ:(what, big, k) => what === 'building' ? `哪栋楼${k === 2 ? '' : '最'}${big ? '高' : '矮'}？` : `哪支铅笔${k === 2 ? '' : '最'}${big ? '长' : '短'}？`,
    lenA:(what, big, k, c) => `${({red:'红色', yellow:'黄色', blue:'蓝色', green:'绿色', purple:'紫色'})[c]}的${what === 'building' ? '楼' : '铅笔'}${k === 2 ? '更' : '最'}${what === 'building' ? (big ? '高' : '矮') : (big ? '长' : '短')}。`,
    posWord:w => ({up:'上面', down:'下面', left:'左边', right:'右边', front:'前面', back:'后面'})[w],
    posQ:(axis, X, Y) => `${X.zh}在${Y.zh}的${({ud:'上面还是下面', lr:'左边还是右边', fb:'前面还是后面'})[axis]}？`,
    posA:(axis, X, Y, w) => `${X.zh}在${Y.zh}的${({up:'上面', down:'下面', left:'左边', right:'右边', front:'前面', back:'后面'})[w]}。`,
    endQ:(axis, w) => ({up:'谁在最上面？', down:'谁在最下面？', left:'最左边是什么？', right:'最右边是什么？', front:'谁跑在最前面？', back:'谁跑在最后面？'})[w],
    whoA:X => `是${X.zh}！`,
    binName:(by, b) => by === 'shape' ? TEXT.zh.SHAPE_PY[b][0] : ({fruit:'水果', animal:'动物', vehicle:'交通工具', red:'红色', yellow:'黄色', blue:'蓝色', big:'大的', small:'小的'})[b],
    sortAsk:(by, it) => by === 'size' ? '这个是大的还是小的？' : by === 'shape' ? `${SHAPE_ITEMS[it.k].zh}是什么形状？` : `${OBJ[it.k].zh}放在哪个筐里？`,
    sortAskShow:(by, it) => by === 'size' ? '这个是大的还是小的？🐘🐭' : by === 'shape' ? `${SHAPE_ITEMS[it.k].zh}是什么形状？` : `${OBJ[it.k].zh}放在哪个筐里？🧺`,
    sortA:(by, it) => by === 'size' ? (it.bin === 'big' ? '这个是大的。' : '这个是小的。') : by === 'shape' ? `${SHAPE_ITEMS[it.k].zh}是${TEXT.zh.SHAPE_PY[it.bin][0]}。`
      : by === 'kind' ? `${OBJ[it.k].zh}是${({fruit:'水果', animal:'动物', vehicle:'交通工具'})[it.bin]}。` : `${OBJ[it.k].zh}是${({red:'红色', yellow:'黄色', blue:'蓝色'})[it.bin]}的。`,
    binCountQ:(by, b) => `数一数，${TEXT.zh.P.binName(by, b)}${by === 'color' ? '的' : ''}有几个？`,
    binCountA:(by, b, c) => `${TEXT.zh.P.binName(by, b)}${by === 'color' ? '的' : ''}有${cnum(c)}个。`,
    cmpA:(x, y) => `${cn(x)}${x > y ? '大于' : x < y ? '小于' : '等于'}${cn(y)}。`, extremeQ:t => t === 'big' ? '哪个数最大？' : '哪个数最小？',
    nthQ:(p, side) => `从${side === 'left' ? '左' : '右'}边数，第${cn(p)}个是谁？`, rankQ:(X, side) => `从${side === 'left' ? '左' : '右'}边数，${X.zh}排第几？`,
    rankA:p => `排第${cn(p)}。`, tapNth:(p, side) => `从${side === 'left' ? '左' : '右'}边数，点出第${cn(p)}只小动物。`,
    tapFew:(p, side) => `从${side === 'left' ? '左' : '右'}边数，点出${cnum(p)}只小动物。`, fewA:p => `这是${cnum(p)}只小动物。`, nthA:p => `这是第${cn(p)}只。`,
    splitQ:(N, x) => `${cn(N)}可以分成${cn(x)}和几？`, splitA:(N, x, y) => `${cn(N)}可以分成${cn(x)}和${cn(y)}。`,
    joinQ:(x, y) => `${cn(x)}和${cn(y)}合成几？`, joinA:(x, y, N) => `${cn(x)}和${cn(y)}合成${cn(N)}。`,
    pairsQ:N => N === 10 ? '找两个数，凑成十！' : `找两个数，合成${cn(N)}！`, pairsQShow:N => `找两个数，合成 ${N}！🃏`,
    eqQ:e => `${zhExpr(e)}等于几？`, eqA:e => `${zhExpr(e)}等于${cn(eqVal(e))}。`,
    demoHave:(n, o) => `这里有${cnum(n)}${o.cl}${o.zh}。`, demoHaveShow:(n, o) => `这里有 ${n} ${o.cl}${o.zh}。${o.e}`,
    demoMore:(n, o) => `又${ZH_COME[moveOf(keyOf(o), '')]}${cnum(n)}${o.cl}。`, demoMoreShow:(n, o) => `又${ZH_COME[moveOf(keyOf(o), '')]} ${n} ${o.cl}。➕`,
    demoGone:(n, o) => `${ZH_GO[moveOf(keyOf(o), '')]}${cnum(n)}${o.cl}。`, demoGoneShow:(n, o) => `${ZH_GO[moveOf(keyOf(o), '')]} ${n} ${o.cl}。➖`,
    demoEnd:(n, o, op) => op === '+' ? `一共有${cnum(n)}${o.cl}${o.zh}。` : n === 0 ? `${o.zh}一${o.cl}也没有了。` : `还剩${cnum(n)}${o.cl}${o.zh}。`,
    demoEndShow:(n, o, op) => op === '+' ? `一共有 ${n} ${o.cl}${o.zh}。` : `还剩 ${n} ${o.cl}${o.zh}。`,
    story:s => {
      const o = OBJ[s.o], m = moveOf(s.o, s.p), [x, y] = s.n;
      if (s.t === 'combine') return [`左边有${cnum(x)}${o.cl}${o.zh}，右边有${cnum(y)}${o.cl}。`, `一共有几${o.cl}？`];
      if (s.t === 'part') return [`一共有${cnum(x)}${o.cl}${o.zh}。`, `外面有${cnum(y)}${o.cl}。`, `盒子里有几${o.cl}？`];
      const first = `${ZH_PLACE[s.p]}有${cnum(x)}${o.cl}${o.zh}。`;
      if (s.t === 'arrive') return [first, `又${ZH_COME[m]}${cnum(y)}${o.cl}。`, `现在一共有几${o.cl}？`];
      if (s.t === 'leave' || s.t === 'eat') return [first, `${ZH_GO[m]}${cnum(y)}${o.cl}。`, `还剩几${o.cl}？`];
      return [first, ...s.s.split('').map((op, i) => `${op === '+' || i > 0 ? '又' : ''}${op === '+' ? ZH_COME[m] : ZH_GO[m]}${cnum(s.n[i + 1])}${o.cl}。`), `现在有几${o.cl}？`];
    },
    storyShow:s => TEXT.zh.P.story(s).join('').replace(/[零一二两三四五六七八九十]+(?=[个只条朵棵颗块根辆本支片架列])/g, w => String(zhToNum(w))),
    storyA:s => {
      const o = OBJ[s.o], v = eqVal(storyEqOf(s));
      if (s.t === 'arrive' || s.t === 'combine') return `一共有${cnum(v)}${o.cl}${o.zh}。`;
      if (s.t === 'part') return `盒子里有${cnum(v)}${o.cl}。`;
      if (s.t === 'leave' || s.t === 'eat') return v === 0 ? `${o.zh}一${o.cl}也没有了。` : `还剩${cnum(v)}${o.cl}${o.zh}。`;
      return `现在有${cnum(v)}${o.cl}${o.zh}。`;
    },
    shapeName:s => TEXT.zh.SHAPE_PY[s][0],
    shapeLearn:s => ({cuboid:'长方体，长长方方的，像一个盒子。', cube:'正方体，六个面都一样大，像骰子。', cylinder:'圆柱，上下一样粗，能滚来滚去。', sphere:'球，圆圆的，往哪边都能滚。'})[s],
    itemName:k => SHAPE_ITEMS[k].zh, itemNameShow:k => SHAPE_ITEMS[k].zh + SHAPE_ITEMS[k].e,
    shapeItemA:k => `${SHAPE_ITEMS[k].zh}是${TEXT.zh.SHAPE_PY[SHAPE_ITEMS[k].shape][0]}。`, findShape:s => `哪个是${TEXT.zh.SHAPE_PY[s][0]}？`,
    countShape:s => `数一数，有几个${TEXT.zh.SHAPE_PY[s][0]}？`, countShapeA:(s, k) => k === 0 ? `没有${TEXT.zh.SHAPE_PY[s][0]}。` : `有${cnum(k)}个${TEXT.zh.SHAPE_PY[s][0]}。`,
    onesQ:v => `${cn(v)}里面有一个十和几个一？`, whichPicture:v => `哪幅图是${cn(v)}？`, tensQ:v => `${cn(v)}的十位上是几？`, onesQ2:v => `${cn(v)}的个位上是几？`,
    makeAbacus:v => `在计数器上拨出${cn(v)}。`, makeAbacusShow:v => `在计数器上拨出 ${v} 🧮`,
    afterQ:v => `${cn(v)}后面是几？`, afterA:v => `${cn(v)}后面是${cn(v + 1)}。`, beforeQ:v => `${cn(v)}前面是几？`, beforeA:v => `${cn(v)}前面是${cn(v - 1)}。`,
    betweenQ:(x, y) => `${cn(x)}和${cn(y)}中间是几？`, betweenA:(x, y) => `${cn(x)}和${cn(y)}中间是${cn(x + 1)}。`,
    lookBig:b => `先看大数${cn(b)}。`, makeTenQ:b => `${cn(b)}和几凑成十？`, makeTenA:b => `${cn(b)}和${cn(10 - b)}凑成十。`, needShow:b => `${b} + ${10 - b} = 10`,
    lesson:n => `第${cn(n)}课！`, playLesson:n => `我们来学第${cn(n)}课吧！`, finished:n => `你学完了第${cn(n)}课！`, playAct:name => `我们来玩${name}吧！`,
    gotSticker:name => `你得到了一张${name}贴纸！`, aSticker:name => `是${name}！`, finishFor:n => `学完第${cn(n)}课，就能得到这张贴纸！`, haveStickers:c => `你有${cnum(c)}张贴纸了！`,
    intro:n => LESSON_INTRO.zh[n], introShow:n => LESSON_INTRO.zh[n] + ' 📖',
  },
},
/* =========================== English =========================== */
en: {
  PRAISE:['Great job!', 'Awesome!', 'You got it!', 'Super!', 'So smart!', 'Well done!', 'Amazing!', 'Nice work!', 'You did it!'],
  TRY:['Try again!', 'Oops, try again!', 'Almost! One more try!'],
  NUMW:range(0, 20).map(en),
  T:{
    greet:"Hi! I'm Leo the lion. Let's learn math together!", pickLesson:'Pick a lesson!', playAgain:'Play again?', hooray:'Hooray!', greatJob:'Great job!',
    earnedStar:'You earned a star!', finishALesson:'Finish a lesson to get a sticker!', hiGrownUps:'Hello, grown-ups!', readingVoice:"Hi! I'm Leo. This is my voice.",
    welcomeBack:"Welcome back! Let's keep going.", tapEachCard:'Tap each card and say it with me!',
    countAgain:'Count again!', tapToCount:'Tap each one as you count.', zeroCard:'Zero means none at all.',
    tooMany:'Too many! Take some away.', tooFew:'Not enough. Put in some more.', tapToTake:'Put in too many? Tap one on the plate to take it away.',
    bundleIs10:'One bundle is ten sticks.', bundleIt:'Ten single sticks should be tied into a bundle.',
    drawIntro:'Draw some things you like. Count them, then pick a number!', drawFirst:'Draw a picture first!', pickNumber:'How many did you draw? Pick a number!', greatDrawing:'What a great drawing!',
    writeThis:'Trace the number', howToTrace:'Start at the green dot and follow the arrows!', startDot:'Start at the green dot!', followArrow:'Follow the arrow!', toTheEnd:'Keep going to the end of the arrow!',
    matchUp:'Match them up, one to one.', same:'They are the same!', lengthIntro:'To compare lengths, line up the ends.', heightIntro:'To compare heights, stand them on the same flat ground.',
    intro_ud:'Look! Who is above? Who is below?', intro_lr:'Raise your right hand. That side is right. The other side is left.', intro_fb:'The animals are racing. The one closest to the finish is in front.',
    sortIntro:'Put each thing in the right basket. First, listen to each basket.',
    whichSign:'Which sign goes in the circle: greater than, less than, or equal?', signRule:'The open side faces the bigger number. The point faces the smaller number.',
    sign_gt:'Greater than: the open side faces the bigger number.', sign_lt:'Less than: the point faces the smaller number.', sign_eq:'Equal: both sides are the same.',
    sign_plus:'The plus sign: put them together.', sign_minus:'The minus sign: take some away.',
    orderUp:'Put them in order, from smallest to biggest!', orderDown:'Put them in order, from biggest to smallest!', smallFirst:'Find the smallest number first.', bigFirst:'Find the biggest number first.',
    lineIntro:"The animals are in a line. Let's count from the left.", fewVsNth:'Three animals means all three. The third animal is just one.',
    splitIntro:"Let's split it up in different ways.", joinIntro:"Let's put two numbers together.",
    pickEquation:'Look at the picture. Pick the right number sentence.', plusSign:'This is the plus sign.', minusSign:'This is the minus sign.',
    trainIntro:'All aboard the math train! Every right answer adds a car.', trainGo:'The train is leaving! Choo choo!', whichEquation:'Which number sentence fits?',
    whatShape:'What shape is it?',
    tenSticks:'Count ten sticks and tie them into a bundle.', tenOnes:'Ten ones make one ten.', whatNumber:'What number is this?', countBeads:'Count the beads.',
    countSticks:'A bundle is ten. Then count the single sticks.', abacusIntro:'This is an abacus.', onesRod:'The rod on the right is the ones. Each bead is one.',
    tensRod:'The next rod is the tens. Each bead is ten.', whatMissing:'What number is missing?', whatInBox:'What number goes in the box?',
    makeTenRule:'Make a ten: look at the big number, split the small one, make ten, then add the rest.', swapRule:'Switching the two numbers gives the same answer.',
  },
  SHOW:{
    greet:"Hi! I'm Leo the lion. Let's learn math together! 🔢", welcomeBack:'Welcome back! 👋', sayWithMe:'Say it with me! 🗣️', tapEachCard:'Tap each card and say it with me! 👆',
    tooMany:'Too many! Take some away. 🤏', tooFew:'Not enough. Put in some more. ➕', bundleIt:'Tie ten sticks into a bundle! 🎀',
    drawFirst:'Draw a picture first! 🖍️', pickNumber:'How many did you draw? Pick a number! 🔢', drawIntro:'Draw, count, then pick a number! 🎨',
    startDot:'Start at the green dot! 🟢', followArrow:'Follow the arrow! ➡️', toTheEnd:'Keep going to the end of the arrow! ✏️',
    sortIntro:'Put each thing in the right basket! 🧺', whichSign:'Which sign: >, < or =? 🤔', orderUp:'Smallest to biggest! 🪜', orderDown:'Biggest to smallest! 🪜',
    lineIntro:'Count from the left! 👉', splitIntro:'Split it up! ✂️', pickEquation:'Pick the right number sentence! 🧮', trainGo:'Choo choo! 🚂',
    tenSticks:'Ten sticks make a bundle 🎀', tenOnes:'10 ones = 1 ten', whatNumber:'What number is this? 🤔', abacusIntro:'The abacus: tens and ones 🧮',
    lookBig:'Start with the big number! 👀', makeTenRule:'Make a ten: big number, split the small one, make ten, add the rest. 🔟',
  },
  U:{
    appName:'Math Fun', lionName:'Leo the lion', lionLabel:'Leo: tap to hear it again, hold to move him', stars:'Stars', back:'Back', listen:'Listen',
    toStart:'Math Fun: back to the start screen', startPage:'Start screen', myStickers:'My stickers', parents:'Grown-ups', update:'Update to the newest version',
    unitTitle:u => u === 0 ? 'Math games' : `Unit ${u} · ${['', 'Numbers to 5, adding and taking away', 'Numbers to 10, adding and taking away', '3D shapes', 'Numbers 11 to 20', 'Adding within 20', 'Review'][u]}`,
    startPageBtn:'🏁 Start screen', musicOn:'🎵 Music: on', musicOff:'🔇 Music: off', switchLang:'切换到中文', otherLang:'🌐 中文',
    tagline:'Learn math with Leo the lion · 30 first-grade lessons', soundOn:'🔊 Turn the sound on!', start:'▶ Play',
    statusDone:', done', statusSome:(c, t) => `, ${c} of ${t} done`, lessonAria:(n, label) => `Lesson ${n}: ${label}`, lessonTitle:n => `Lesson ${n}`,
    listenLesson:'📖 Listen', lessonNext:(n, icon, name) => `Lesson ${n}! Tap ${icon} ${name}.`, lessonAgain:n => `You finished lesson ${n}! 🎉 Play again?`,
    startAgain:'Start again', actAria:(n, name) => `Lesson ${n}: ${name}`, progress:'Progress', hearAgain:'Hear it again',
    lessonDone:'Lesson done!', nextLesson:n => `Lesson ${n} ➜`, myStickersBtn:'🏆 My stickers', homeBtn:'🏠 Home', hoorayLesson:n => `Hooray! You finished lesson ${n}! 🎉`,
    gotStar:'You earned a star!', doneAgain:'You did it again!', backToLesson:n => `📚 Lesson ${n}`, stickerAria:(n, name) => `Lesson ${n} sticker: ${name || 'not yet'}`,
    checking:'Checking…', soundNoClips:'⚠️ The voice clips did not load. Tap 🔄 on the home screen to update.',
    soundOk:"✅ Leo's voice is playing. If you hear nothing, turn the volume up and check for Bluetooth headphones or speakers.",
    soundBlocked:'⚠️ The browser is not allowing sound right now. Tap the page once, then try again.',
    soundError:'⚠️ A voice clip did not load. Check the connection, then tap 🔄 to update.', soundNone:'⚠️ The sound did not start. In WeChat, tap “…” and choose “Open in browser”.',
    noSuchColumn:'Not in this lesson', checkAria:(n, col, on) => `Lesson ${n} ${col}: ${on ? 'ticked' : 'not ticked'}`, checkCols:{num:'Numbers', calc:'Adding', shape:'Shapes', story:'Stories'},
    tickByHand:'You ticked this. Tap to change it.', tickByGame:'Finished in the game. Tap to change it.', tickHere:'Tap to tick',
    parentsTitle:'👪 Grown-ups', guideTitle:'Quick guide',
    guideIntro:['The lessons follow the first-grade math book used in schools in China (人教版 2024, first semester): math games, numbers to 5, numbers to 10, 3D shapes, numbers 11–20, adding within 20, and a review. 30 lessons in all. Play for 10–15 minutes at a time.',
      'Leo reads every instruction aloud, so children do not need to read. Questions get harder as a game goes on: the first two have 3 choices, later ones 4 that are closer together. A wrong tap costs nothing; after two, the right answer glows.'],
    guideList:['🔢 Count: tap the number cards, then count and pop the right balloon (tap the things in a picture to count them one by one).',
      '🧺 Put it on: put that many things on the plate (11–20 with bundles of ten sticks). ✏️ Write numbers: start at the green dot and follow the arrows, stroke by stroke, with a number rhyme.',
      '⚖️ More or fewer, 📏 longer or shorter, 🏢 taller or shorter; 🐊 greater than, less than, equal; 🪜 put numbers in order.',
      '📍 Positions: above and below, left and right, in front and behind; 🥇 first, second, third, and “how many” versus “which one”; 🗂️ sorting by kind, colour, size and shape, then counting.',
      '🍑 Number bonds and 🃏 make-the-number pairs; ➕ ➖ adding and taking away with pictures, answers and missing numbers; 🚂 the math train for quick sums; 📖 story problems.',
      '🧊 3D shapes: rectangular prisms, cubes, cylinders, spheres; 🔟 bundles of ten and the 🧮 abacus (tens and ones); 🛤️ the number line; making a ten (9 + 4 = 10 + 3).'],
    guideTip:'Tips: turn the sound on; a tablet works best. Tap Leo (bottom left) to hear the last line again, or drag him somewhere else. A game left half-way carries on where it stopped.',
    settings:'Settings', langNote:'Switch the language Leo speaks and the words on the screen. The questions stay the same.', voiceSpeed:'Voice speed', slow:'🐢 Slow', normal:'🙂 Normal', fast:'🐇 Fast',
    pinyin:'Pinyin', show:'Show', hide:'Hide', sfx:'Sound effects', on1:'🔔 On', off1:'🔕 Off', music:'Music', on2:'🎵 On', off2:'🔇 Off',
    captions:'Show what Leo says', on3:'💬 On', off3:'Off', captionsNote:"For playing with the sound off: Leo's bubble shows everything he says.",
    length:'Game length', short:'🐣 Short', normalLen:'🦁 Normal', lengthNote:'Short: about 3 questions per game, for younger children. Stars are saved after every game, so a lesson can take a few days.',
    putBack:'🦁 Put Leo back', soundTest:'Sound test', testSound:'🔊 Test the sound',
    soundHelp:'No sound? Turn the volume up. In WeChat or another app, tap “…” and open the page in the browser. With Bluetooth headphones or a speaker connected, the sound plays there. The game also works with the sound off: switch on “Show what Leo says”.',
    updateLabel:'Update', updateBtn:'🔄 Update to the newest version', current:'Now: ',
    checkTitle:'Parent / teacher check', lessonCol:'Lesson', checkNote:'A box ticks itself when the child finishes the games. Tap any box to tick or untick it yourself.', resetBtn:'🗑️ Reset progress',
    credits:["The lesson order follows the 2024 People's Education Press first-grade math book (first semester). The questions, pictures and stories were written for this game; the number rhyme (“1 is like a pencil…”) comes from a traditional Chinese rhyme.",
      "Leo's voice was made with the open-source Kokoro-82M model (Apache-2.0). Fonts: Fredoka and Andika (SIL Open Font License), AR PL KaitiM GB (Arphic Public License).",
      'Progress is saved in this browser on this device only. Nothing is sent anywhere.'],
    wrongAnswer:'Not quite. Try again.', fillAnswer:'Please type the answer.', cleared:'Progress cleared', clearedNote:'All stars, stickers and ticks on this device are cleared.', ok:'OK',
    resetTitle:'Reset all progress?', resetNote:'This clears every star, sticker and tick on this device. It cannot be undone.', gateQ:(a, b) => `Grown-ups, please answer: ${a} × ${b} = ?`, resetConfirm:'🗑️ Reset', cancel:'Cancel',
    version:(n, d) => `Version ${n} · ${d}`, newVersion:n => `🔄 Version ${n} is ready. Tap to update!`, updating:'Updating…', updatingNote:'Getting the newest version',
    balloon:'Balloon ', go:'🎈 Start ➜', watchAgain:'🔁 Watch again', plate:'Plate', addOne:'Add one', doneCheck:'✔ Done', takeBundle:'Take a bundle away', takeStick:'Take a stick away',
    tensShort:'tens', onesShort:'ones', addBundle:'Add a bundle', addStick:'Add a stick', drawArea:'Drawing area', labelTip:'Drag to move, tap to take it off',
    thin:'Thin pen', mid:'Medium pen', thick:'Thick pen', eraser:'Eraser', undo:'Undo', clearAll:'Clear', pickNumber:'Pick a number', savePic:'Save picture', doneDraw:'✅ Done',
    traceArea:'Tracing area', traceAgain:'🧽 Start again', showMe:'👀 Show me', more:'more', fewer:'fewer', same:'the same',
    posWord:{up:'above', down:'below', left:'left', right:'right', front:'in front', back:'behind'}, signName:{gt:'greater than', lt:'less than', eq:'equal'},
    countAgainBtn:'👉 Count again', tensPlace:'tens', onesPlace:'ones', whatShape:'What shape?', clearBeads:'🧽 Clear',
    actName:a => ({
      count:() => 'Count', place:() => 'Put it on', draw:() => 'Draw', write:() => 'Write numbers', more:() => 'More or fewer', length:() => a.what === 'building' ? 'Tall or short' : 'Long or short',
      pos:() => ({ud:'Above and below', lr:'Left and right', fb:'In front, behind', mix:'Positions'})[a.axis], sort:() => ({kind:'Sort by kind', color:'Sort by color', size:'Big or small', shape:'Sort by shape', mix:'Sort by shape'})[a.by],
      signs:() => a.pics ? 'Greater or less' : 'Compare numbers', order:() => 'Put in order', ordinal:() => ({which:'Who is third?', rank:'Which place?', few:'How many, which one', mix:'In line'})[a.mode],
      bond:() => ({split:'Split it', join:'Put together', mix:'Number bonds'})[a.mode], pairs:() => a.nums.includes(10) ? 'Make ten' : 'Make the number',
      calc:() => ({'+':'Adding', '-':'Taking away', '+-':'Add or take away', teen:'Teen sums', carry:'Carrying', '++--':'Three numbers', '+-mix':'Mixed sums', review:'Work it out'})[a.ops],
      train:() => 'Math train', story:() => a.pick ? 'Number sentences' : 'Story problems', shape:() => ({name:'Name the shape', find:'Find the shape', count:'Count shapes', mix:'Shapes'})[a.mode],
      tens:() => a.mode === 'abacus' ? 'Abacus' : 'Bundles of ten', numline:() => 'Number line', maketen:() => 'Make a ten',
    })[a.type](),
  },
  P:{
    n:en, ordinal:n => EN_ORD[n],
    count:enCount,
    howMany:o => `How many ${o.pl}?`, howManyShow:o => `How many ${o.pl}? ${o.e}`,
    find:(n, o) => `Which group has ${enCount(n, o)}?`, findShow:(n, o) => `Which group has ${n} ${o.pl}? ${o.e}`,
    place:(n, o) => `Put ${enCount(n, o)} on the plate.`, placeShow:(n, o) => `Put ${n} ${n === 1 ? o.en : o.pl} on the plate ${o.e}`,
    placeSticks:n => `Make ${en(n)} with sticks.`, placeSticksShow:n => `Make ${n} with sticks`,
    teenA:v => v === 10 ? 'Ten ones make one ten.' : v === 20 ? 'Two tens make twenty.' : `One ten and ${en(v - 10)} ${v === 11 ? 'one' : 'ones'} make ${en(v)}.`,
    drew:n => `You drew ${en(n)}!`, drewShow:n => `You drew ${n}! 🎨`,
    colorName:c => c,
    rhyme:d => ({'1':'One is like a pencil, tall and thin.', '2':'Two is like a duck swimming on the water.', '3':'Three is like an ear that listens.',
      '4':'Four is like a flag waving in the wind.', '5':'Five is like the hook on a scale.', '6':'Six is like a bean sprout with a big smile.',
      '7':'Seven is like a sickle that cuts the grass.', '8':'Eight is like a twisty pretzel.', '9':'Nine is like a spoon.', '0':'Zero is like an egg.'})[d],
    rhymeShow:d => ({'1':'1 is like a pencil', '2':'2 is like a duck', '3':'3 is like an ear', '4':'4 is like a flag', '5':'5 is like a hook',
      '6':'6 is like a sprout', '7':'7 is like a sickle', '8':'8 is like a pretzel', '9':'9 is like a spoon', '0':'0 is like an egg'})[d],
    writeShow:d => `Trace the number ${d} ✏️`,
    moreQ:(A, B) => `Are there more ${A.pl} or more ${B.pl}?`, fewerQ:(A, B) => `Are there fewer ${A.pl} or fewer ${B.pl}?`,
    moreA:X => `There are more ${X.pl}.`, fewerA:X => `There are fewer ${X.pl}.`,
    lenQ:(what, big, k) => `Which ${what} is ${k === 2 ? (what === 'building' ? (big ? 'taller' : 'shorter') : (big ? 'longer' : 'shorter')) : (what === 'building' ? (big ? 'the tallest' : 'the shortest') : (big ? 'the longest' : 'the shortest'))}?`,
    lenA:(what, big, k, c) => `The ${c} ${what} is ${k === 2 ? (what === 'building' ? (big ? 'taller' : 'shorter') : (big ? 'longer' : 'shorter')) : (what === 'building' ? (big ? 'the tallest' : 'the shortest') : (big ? 'the longest' : 'the shortest'))}.`,
    posWord:w => ({up:'Above.', down:'Below.', left:'Left.', right:'Right.', front:'In front.', back:'Behind.'})[w],
    posQ:(axis, X, Y) => axis === 'ud' ? `Is the ${X.en} above or below the ${Y.en}?` : axis === 'lr' ? `Is the ${X.en} to the left or to the right of the ${Y.en}?` : `Is the ${X.en} in front of or behind the ${Y.en}?`,
    posA:(axis, X, Y, w) => `The ${X.en} is ${({up:'above', down:'below', left:'to the left of', right:'to the right of', front:'in front of', back:'behind'})[w]} the ${Y.en}.`,
    endQ:(axis, w) => ({up:'Who is at the top?', down:'Who is at the bottom?', left:'What is on the far left?', right:'What is on the far right?', front:'Who is running in front?', back:'Who is running at the back?'})[w],
    whoA:X => `The ${X.en}!`,
    binName:(by, b) => by === 'shape' ? cap(TEXT.en.P.shapeName(b)) + 's' : ({fruit:'Fruit', animal:'Animals', vehicle:'Vehicles', red:'Red', yellow:'Yellow', blue:'Blue', big:'Big', small:'Small'})[b],
    sortAsk:(by, it) => by === 'size' ? 'Is this one big or small?' : by === 'shape' ? `What shape is the ${SHAPE_ITEMS[it.k].en}?` : `Where does the ${OBJ[it.k].en} go?`,
    sortAskShow:(by, it) => by === 'size' ? 'Big or small? 🐘🐭' : by === 'shape' ? `What shape is the ${SHAPE_ITEMS[it.k].en}?` : `Where does the ${OBJ[it.k].en} go? 🧺`,
    sortA:(by, it) => by === 'size' ? (it.bin === 'big' ? 'This one is big.' : 'This one is small.') : by === 'shape' ? TEXT.en.P.shapeItemA(it.k)
      : by === 'kind' ? `${cap(an(OBJ[it.k].en))} is ${({fruit:'a fruit', animal:'an animal', vehicle:'a vehicle'})[it.bin]}.` : `The ${OBJ[it.k].en} is ${it.bin}.`,
    binCountQ:(by, b) => `How many ${({fruit:'fruits', animal:'animals', vehicle:'vehicles', red:'red things', yellow:'yellow things', blue:'blue things', big:'big ones', small:'small ones'})[b] || TEXT.en.P.shapeName(b) + 's'} are there?`,
    binCountA:(by, b, c) => {
      const one = ({fruit:'fruit', animal:'animal', vehicle:'vehicle', red:'red thing', yellow:'yellow thing', blue:'blue thing', big:'big one', small:'small one'})[b] || TEXT.en.P.shapeName(b);
      const many = ({fruit:'fruits', animal:'animals', vehicle:'vehicles', red:'red things', yellow:'yellow things', blue:'blue things', big:'big ones', small:'small ones'})[b] || TEXT.en.P.shapeName(b) + 's';
      return c === 0 ? `There are no ${many}.` : c === 1 ? `There is one ${one}.` : `There are ${en(c)} ${many}.`;
    },
    cmpA:(x, y) => x > y ? `${cap(en(x))} is greater than ${en(y)}.` : x < y ? `${cap(en(x))} is less than ${en(y)}.` : `${cap(en(x))} equals ${en(y)}.`,
    extremeQ:t => t === 'big' ? 'Which number is the biggest?' : 'Which number is the smallest?',
    nthQ:(p, side) => `Counting from the ${side}, who is ${EN_ORD[p]}?`, rankQ:(X, side) => `Counting from the ${side}, which place is the ${X.en} in?`,
    rankA:p => `${cap(EN_ORD[p])}!`, tapNth:(p, side) => `Counting from the ${side}, tap the ${EN_ORD[p]} animal.`,
    tapFew:(p, side) => `Counting from the ${side}, tap ${en(p)} animals.`, fewA:p => `That's ${en(p)} animals!`, nthA:p => `That's the ${EN_ORD[p]} animal!`,
    splitQ:(N, x) => `${cap(en(N))} can be split into ${en(x)} and what?`, splitA:(N, x, y) => `${cap(en(N))} can be split into ${en(x)} and ${en(y)}.`,
    joinQ:(x, y) => `What do ${en(x)} and ${en(y)} make?`, joinA:(x, y, N) => `${cap(en(x))} and ${en(y)} make ${en(N)}.`,
    pairsQ:N => `Find two numbers that make ${en(N)}!`, pairsQShow:N => `Find two numbers that make ${N}! 🃏`,
    eqQ:e => `What is ${enExpr(e)}?`, eqA:e => `${cap(enExpr(e))} equals ${en(eqVal(e))}.`,
    demoHave:(n, o) => n === 1 ? `Here is one ${o.en}.` : `Here are ${enCount(n, o)}.`, demoHaveShow:(n, o) => `Here are ${n} ${n === 1 ? o.en : o.pl}. ${o.e}`,
    demoMore:(n, o) => `${cap(en(n))} more ${EN_COME[moveOf(keyOf(o), '')][n === 1 ? 0 : 1]}.`, demoMoreShow:(n, o) => `${n} more ${EN_COME[moveOf(keyOf(o), '')][n === 1 ? 0 : 1]}. ➕`,
    demoGone:(n, o) => `${cap(en(n))} ${EN_GO[moveOf(keyOf(o), '')][n === 1 ? 0 : 1]}.`, demoGoneShow:(n, o) => `${n} ${EN_GO[moveOf(keyOf(o), '')][n === 1 ? 0 : 1]}. ➖`,
    demoEnd:(n, o, op) => op === '+' ? (n === 1 ? `Now there is one ${o.en}.` : `Now there are ${enCount(n, o)}.`) : n === 0 ? `There are no ${o.pl} left.` : `${cap(enCount(n, o))} ${isAre(n)} left.`,
    demoEndShow:(n, o, op) => op === '+' ? `Now there are ${n} ${o.pl}.` : `${n} ${n === 1 ? o.en : o.pl} left.`,
    story:s => {
      const o = OBJ[s.o], m = moveOf(s.o, s.p), [x, y] = s.n;
      if (s.t === 'combine') return [`There ${isAre(x)} ${enCount(x, o)} on the left and ${en(y)} on the right.`, `How many ${o.pl} are there in all?`];
      if (s.t === 'part') return [`There are ${enCount(x, o)} in all.`, `${cap(en(y))} ${isAre(y)} outside the box.`, 'How many are in the box?'];
      const first = `There ${isAre(x)} ${enCount(x, o)} ${EN_PLACE[s.p]}.`;
      if (s.t === 'arrive') return [first, `${cap(en(y))} more ${EN_COME[m][y === 1 ? 0 : 1]}.`, `How many ${o.pl} are there now?`];
      if (s.t === 'leave' || s.t === 'eat') return [first, `${cap(en(y))} ${EN_GO[m][y === 1 ? 0 : 1]}.`, `How many ${o.pl} are left?`];
      return [first, ...s.s.split('').map((op, i) => { const v = s.n[i + 1]; return `${i ? 'Then ' : ''}${i ? en(v) : cap(en(v))}${op === '+' ? ' more ' + EN_COME[m][v === 1 ? 0 : 1] : ' ' + EN_GO[m][v === 1 ? 0 : 1]}.`; }),
        `How many ${o.pl} are there now?`];
    },
    storyShow:s => TEXT.en.P.story(s).join(' ').replace(new RegExp(`\\b(${EN_ONES.join('|')})\\b`, 'gi'), w => String(EN_ONES.indexOf(w.toLowerCase()))),
    storyA:s => {
      const o = OBJ[s.o], v = eqVal(storyEqOf(s));
      if (s.t === 'arrive') return v === 1 ? `Now there is one ${o.en}.` : `Now there are ${enCount(v, o)}.`;
      if (s.t === 'combine') return `There are ${enCount(v, o)} in all.`;
      if (s.t === 'part') return `There ${isAre(v)} ${en(v)} in the box.`;
      if (s.t === 'leave' || s.t === 'eat') return v === 0 ? `There are no ${o.pl} left.` : `${cap(enCount(v, o))} ${isAre(v)} left.`;
      return v === 1 ? `Now there is one ${o.en}.` : `Now there are ${enCount(v, o)}.`;
    },
    shapeName:s => ({cuboid:'rectangular prism', cube:'cube', cylinder:'cylinder', sphere:'sphere'})[s],
    shapeLearn:s => ({cuboid:'A rectangular prism looks like a box.', cube:'A cube has six faces that are all the same size, like a dice.',
      cylinder:'A cylinder is round on top and can roll.', sphere:'A sphere is round like a ball. It can roll any way.'})[s],
    itemName:k => cap(an(SHAPE_ITEMS[k].en)) + '.', itemNameShow:k => cap(an(SHAPE_ITEMS[k].en)) + ' ' + SHAPE_ITEMS[k].e,
    shapeItemA:k => `The ${SHAPE_ITEMS[k].en} is ${an(TEXT.en.P.shapeName(SHAPE_ITEMS[k].shape))}.`, findShape:s => `Which one is ${an(TEXT.en.P.shapeName(s))}?`,
    countShape:s => `How many ${TEXT.en.P.shapeName(s)}s are there?`,
    countShapeA:(s, k) => k === 0 ? `There are no ${TEXT.en.P.shapeName(s)}s.` : k === 1 ? `There is one ${TEXT.en.P.shapeName(s)}.` : `There are ${en(k)} ${TEXT.en.P.shapeName(s)}s.`,
    onesQ:v => `${cap(en(v))} is one ten and how many ones?`, whichPicture:v => `Which picture shows ${en(v)}?`, tensQ:v => `How many tens are in ${en(v)}?`, onesQ2:v => `How many ones are in ${en(v)}?`,
    makeAbacus:v => `Show ${en(v)} on the abacus.`, makeAbacusShow:v => `Show ${v} on the abacus 🧮`,
    afterQ:v => `What number comes after ${en(v)}?`, afterA:v => `After ${en(v)} comes ${en(v + 1)}.`, beforeQ:v => `What number comes before ${en(v)}?`, beforeA:v => `Before ${en(v)} comes ${en(v - 1)}.`,
    betweenQ:(x, y) => `What number is between ${en(x)} and ${en(y)}?`, betweenA:(x, y) => `${cap(en(x + 1))} is between ${en(x)} and ${en(y)}.`,
    lookBig:b => `Start with the big number, ${en(b)}.`, makeTenQ:b => `${cap(en(b))} and what make ten?`, makeTenA:b => `${cap(en(b))} and ${en(10 - b)} make ten.`, needShow:b => `${b} + ${10 - b} = 10`,
    lesson:n => `Lesson ${en(n)}!`, playLesson:n => `Let's do lesson ${en(n)}!`, finished:n => `You finished lesson ${en(n)}!`, playAct:name => `Let's play ${name}!`,
    gotSticker:name => `You got ${an(name)} sticker!`, aSticker:name => `It's ${an(name)}!`, finishFor:n => `Finish lesson ${en(n)} to get this sticker!`,
    haveStickers:c => `You have ${en(c)} sticker${c === 1 ? '' : 's'}!`,
    intro:n => LESSON_INTRO.en[n], introShow:n => LESSON_INTRO.en[n] + ' 📖',
  },
},
};
// numbers in a question shown as digits in the bubble: 从左边数，第三个是谁？ → 从左边数，第 3 个是谁？
const ZH_NUM_RUN = /([零一二两三四五六七八九十]+)(?=[个只条朵棵颗块根辆本支片架列张和加减等大小可合里后前中凑的是像？])/g;
function showDigits(s){
  if (LANG === 'zh') return s.replace(ZH_NUM_RUN, (m, num, at, all) => (at && !/\s/.test(all[at - 1]) ? ' ' : '') + zhToNum(num) + ' ').replace(/ ([，。？！])/g, '$1').trim();
  return s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi,
    w => String(w.toLowerCase() === 'twenty' ? 20 : EN_ONES.indexOf(w.toLowerCase())));
}
// 十三 → 13 (for the story text in the bubble)
function zhToNum(w){
  if (w === '两') return 2;
  const d = c => CN_D.indexOf(c);
  if (w.length === 1) return w === '十' ? 10 : d(w);
  if (w[0] === '十') return 10 + d(w[1]);
  return d(w[0]) * 10 + (w[2] ? d(w[2]) : 0);
}
