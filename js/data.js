'use strict';
/* =====================================================================
   CONTENT — the lessons follow the units of the 人教版 (2024) 一年级上册 数学
   textbook: 数学游戏 · 5以内数的认识和加、减法 · 6~10的认识和加、减法 ·
   认识立体图形 · 11~20的认识 · 20以内的进位加法 · 复习与关联 (30 lessons).
   The questions, pictures and stories are written for this game.
   ===================================================================== */

// Things to count. e: emoji · zh: name · cl: measure word (量词) · en / pl: English name, one and many
// kind / color: for the sorting games.
const OBJ = {
  apple:     {e:'🍎', zh:'苹果', cl:'个', en:'apple', pl:'apples', kind:'fruit', color:'red'},
  strawberry:{e:'🍓', zh:'草莓', cl:'个', en:'strawberry', pl:'strawberries', kind:'fruit', color:'red'},
  banana:    {e:'🍌', zh:'香蕉', cl:'根', en:'banana', pl:'bananas', kind:'fruit', color:'yellow'},
  pear:      {e:'🍐', zh:'梨', cl:'个', en:'pear', pl:'pears', kind:'fruit'},
  orange:    {e:'🍊', zh:'橘子', cl:'个', en:'orange', pl:'oranges', kind:'fruit'},
  lemon:     {e:'🍋', zh:'柠檬', cl:'个', en:'lemon', pl:'lemons', kind:'fruit', color:'yellow'},
  peach:     {e:'🍑', zh:'桃子', cl:'个', en:'peach', pl:'peaches', kind:'fruit'},
  carrot:    {e:'🥕', zh:'胡萝卜', cl:'根', en:'carrot', pl:'carrots'},
  corn:      {e:'🌽', zh:'玉米', cl:'根', en:'corn cob', pl:'corn cobs', color:'yellow'},
  duck:      {e:'🦆', zh:'小鸭', cl:'只', en:'duck', pl:'ducks', kind:'animal'},
  chick:     {e:'🐥', zh:'小鸡', cl:'只', en:'chick', pl:'chicks', kind:'animal', color:'yellow'},
  fish:      {e:'🐟', zh:'小鱼', cl:'条', en:'fish', pl:'fish', kind:'animal'},
  bird:      {e:'🐦', zh:'小鸟', cl:'只', en:'bird', pl:'birds', kind:'animal'},
  bee:       {e:'🐝', zh:'蜜蜂', cl:'只', en:'bee', pl:'bees', kind:'animal'},
  ladybug:   {e:'🐞', zh:'瓢虫', cl:'只', en:'ladybug', pl:'ladybugs', kind:'animal', color:'red'},
  butterfly: {e:'🦋', zh:'蝴蝶', cl:'只', en:'butterfly', pl:'butterflies', kind:'animal'},
  frog:      {e:'🐸', zh:'青蛙', cl:'只', en:'frog', pl:'frogs', kind:'animal'},
  turtle:    {e:'🐢', zh:'乌龟', cl:'只', en:'turtle', pl:'turtles', kind:'animal'},
  whale:     {e:'🐳', zh:'鲸鱼', cl:'条', en:'whale', pl:'whales', kind:'animal', color:'blue'},
  rabbit:    {e:'🐰', zh:'小兔', cl:'只', en:'bunny', pl:'bunnies', kind:'animal'},
  cat:       {e:'🐱', zh:'小猫', cl:'只', en:'cat', pl:'cats', kind:'animal'},
  dog:       {e:'🐶', zh:'小狗', cl:'只', en:'dog', pl:'dogs', kind:'animal'},
  monkey:    {e:'🐵', zh:'小猴', cl:'只', en:'monkey', pl:'monkeys', kind:'animal'},
  panda:     {e:'🐼', zh:'熊猫', cl:'只', en:'panda', pl:'pandas', kind:'animal'},
  pig:       {e:'🐷', zh:'小猪', cl:'只', en:'pig', pl:'pigs', kind:'animal'},
  bear:      {e:'🐻', zh:'小熊', cl:'只', en:'bear', pl:'bears', kind:'animal'},
  fox:       {e:'🦊', zh:'狐狸', cl:'只', en:'fox', pl:'foxes', kind:'animal'},
  tiger:     {e:'🐯', zh:'老虎', cl:'只', en:'tiger', pl:'tigers', kind:'animal'},
  squirrel:  {e:'🐿️', zh:'松鼠', cl:'只', en:'squirrel', pl:'squirrels', kind:'animal'},
  flower:    {e:'🌸', zh:'花', cl:'朵', en:'flower', pl:'flowers'},
  sunflower: {e:'🌻', zh:'向日葵', cl:'朵', en:'sunflower', pl:'sunflowers', color:'yellow'},
  tree:      {e:'🌳', zh:'树', cl:'棵', en:'tree', pl:'trees'},
  mushroom:  {e:'🍄', zh:'蘑菇', cl:'个', en:'mushroom', pl:'mushrooms'},
  leaf:      {e:'🍁', zh:'树叶', cl:'片', en:'leaf', pl:'leaves'},
  star:      {e:'⭐', zh:'星星', cl:'颗', en:'star', pl:'stars', color:'yellow'},
  balloon:   {e:'🎈', zh:'气球', cl:'个', en:'balloon', pl:'balloons'},
  ball:      {e:'⚽', zh:'足球', cl:'个', en:'ball', pl:'balls'},
  car:       {e:'🚗', zh:'小汽车', cl:'辆', en:'car', pl:'cars', kind:'vehicle', color:'red'},
  bluecar:   {e:'🚙', zh:'小汽车', cl:'辆', en:'car', pl:'cars', kind:'vehicle', color:'blue'},
  bus:       {e:'🚌', zh:'公共汽车', cl:'辆', en:'bus', pl:'buses', kind:'vehicle'},
  bike:      {e:'🚲', zh:'自行车', cl:'辆', en:'bike', pl:'bikes', kind:'vehicle'},
  plane:     {e:'✈️', zh:'飞机', cl:'架', en:'plane', pl:'planes', kind:'vehicle'},
  boat:      {e:'⛵', zh:'小船', cl:'只', en:'boat', pl:'boats', kind:'vehicle'},
  train:     {e:'🚂', zh:'火车', cl:'列', en:'train', pl:'trains', kind:'vehicle'},
  candy:     {e:'🍬', zh:'糖果', cl:'颗', en:'candy', pl:'candies'},
  cookie:    {e:'🍪', zh:'饼干', cl:'块', en:'cookie', pl:'cookies'},
  cupcake:   {e:'🧁', zh:'蛋糕', cl:'个', en:'cupcake', pl:'cupcakes'},
  egg:       {e:'🥚', zh:'鸡蛋', cl:'个', en:'egg', pl:'eggs'},
  pencil:    {e:'✏️', zh:'铅笔', cl:'支', en:'pencil', pl:'pencils'},
  book:      {e:'📕', zh:'书', cl:'本', en:'book', pl:'books'},
  shell:     {e:'🐚', zh:'贝壳', cl:'个', en:'shell', pl:'shells'},
  kid:       {e:'🧒', zh:'小朋友', cl:'个', en:'kid', pl:'kids'},
  heart:     {e:'❤️', zh:'爱心', cl:'颗', en:'heart', pl:'hearts', color:'red'},
  cap:       {e:'🧢', zh:'帽子', cl:'顶', en:'cap', pl:'caps', color:'blue'},
  gem:       {e:'💎', zh:'宝石', cl:'颗', en:'gem', pl:'gems', color:'blue'},
  rose:      {e:'🌹', zh:'玫瑰花', cl:'朵', en:'rose', pl:'roses', color:'red'},
};

// Sorting: the groups and what goes in them
const SORTS = {
  kind:  {bins:[['fruit','🍎'], ['animal','🐶'], ['vehicle','🚗']],
          items:['apple','banana','pear','orange','strawberry','peach','cat','dog','rabbit','duck','monkey','panda','car','bus','bike','plane','boat']},
  color: {bins:[['red','🔴'], ['yellow','🟡'], ['blue','🔵']],
          items:['apple','strawberry','ladybug','heart','rose','banana','lemon','star','chick','sunflower','whale','bluecar','cap','gem']},
  size:  {bins:[['big','🐘'], ['small','🐭']],
          items:['apple','ball','star','duck','flower','car','fish','balloon','cookie','heart']},
  shape: {bins:[['cuboid'], ['cube'], ['cylinder'], ['sphere']]},
};

// 3D shapes and everyday things that have them
const SHAPES = ['cuboid', 'cube', 'cylinder', 'sphere'];
const SHAPE_ITEMS = {
  box:{e:'📦', shape:'cuboid', zh:'纸箱', en:'box'},
  brick:{e:'🧱', shape:'cuboid', zh:'砖块', en:'brick'},
  juice:{e:'🧃', shape:'cuboid', zh:'果汁盒', en:'juice box'},
  book2:{e:'📘', shape:'cuboid', zh:'书', en:'book'},
  dice:{e:'🎲', shape:'cube', zh:'骰子', en:'dice'},
  ice:{e:'🧊', shape:'cube', zh:'冰块', en:'ice cube'},
  can:{e:'🥫', shape:'cylinder', zh:'罐头', en:'can'},
  drum:{e:'🥁', shape:'cylinder', zh:'鼓', en:'drum'},
  battery:{e:'🔋', shape:'cylinder', zh:'电池', en:'battery'},
  candle:{e:'🕯️', shape:'cylinder', zh:'蜡烛', en:'candle'},
  soccer:{e:'⚽', shape:'sphere', zh:'足球', en:'soccer ball'},
  basket:{e:'🏀', shape:'sphere', zh:'篮球', en:'basketball'},
  globe:{e:'🌍', shape:'sphere', zh:'地球', en:'globe'},
  tennis:{e:'🎾', shape:'sphere', zh:'网球', en:'tennis ball'},
};

// Positions: who sits where
const POS_ANIMALS = ['cat', 'dog', 'rabbit', 'panda'];
const POS_FRUITS = ['apple', 'banana', 'pear', 'strawberry'];
const POS_RUNNERS = ['rabbit', 'dog', 'duck', 'turtle'];
// Lining up (第几)
const LINE_ANIMALS = ['dog', 'cat', 'rabbit', 'bear', 'panda', 'monkey', 'fox', 'tiger', 'pig', 'frog'];

// Stories (解决问题). t: arrive · combine · leave · eat · part · chain
// o: thing · p: place · n: numbers · s: steps of a chain story ('+' comes, '-' goes)
const st = (t, o, p, ...n) => ({t, o, p, n});
const chain = (o, p, s, ...n) => ({t:'chain', o, p, s, n});

// Each lesson: n, unit, title, chips (shown on the lesson page), acts (its games, in order).
// An act: key (unique in the lesson), type (which game), and the game's settings.
const LESSONS = [
  // ---------------- 数学游戏 ----------------
  {n:1, unit:0, title:{zh:'数一数', en:'Counting'}, chips:[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], acts:[
    {key:'count', type:'count', min:1, max:10, learn:[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], scene:true,
     objs:['apple', 'duck', 'flower', 'car', 'star']},
    {key:'place', type:'place', min:1, max:10, objs:['apple', 'strawberry', 'egg']},
    {key:'draw', type:'draw', nums:[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]},
  ]},
  {n:2, unit:0, title:{zh:'比一比', en:'Compare'}, acts:[
    {key:'more', type:'more', max:6},
    {key:'long', type:'length', what:'pencil'},
    {key:'tall', type:'length', what:'building'},
  ]},
  {n:3, unit:0, title:{zh:'认位置', en:'Positions'}, acts:[
    {key:'updown', type:'pos', axis:'ud'},
    {key:'leftright', type:'pos', axis:'lr'},
    {key:'frontback', type:'pos', axis:'fb'},
  ]},
  {n:4, unit:0, title:{zh:'分一分', en:'Sorting'}, acts:[
    {key:'kind', type:'sort', by:'kind'},
    {key:'color', type:'sort', by:'color'},
    {key:'size', type:'sort', by:'size'},
  ]},
  // ---------------- 第一单元 5以内数的认识和加、减法 ----------------
  {n:5, unit:1, title:{zh:'1～5的认识', en:'1 to 5'}, chips:[1, 2, 3, 4, 5], acts:[
    {key:'count', type:'count', min:1, max:5, learn:[1, 2, 3, 4, 5], objs:['apple', 'chick', 'flower', 'fish', 'star', 'car']},
    {key:'write', type:'write', digits:['1', '2', '3', '4', '5']},
    {key:'place', type:'place', min:1, max:5, objs:['strawberry', 'cookie', 'egg', 'candy']},
  ]},
  {n:6, unit:1, title:{zh:'比大小', en:'Greater, less'}, chips:['>', '<', '='], acts:[
    {key:'signs', type:'signs', max:5, pics:true},
    {key:'compare', type:'signs', max:5, pick:true},
    {key:'order', type:'order', max:5},
  ]},
  {n:7, unit:1, title:{zh:'第几', en:'First, second'}, acts:[
    {key:'which', type:'ordinal', len:5, mode:'which'},
    {key:'rank', type:'ordinal', len:5, mode:'rank'},
    {key:'few', type:'ordinal', len:5, mode:'few'},
  ]},
  {n:8, unit:1, title:{zh:'分与合', en:'Number bonds'}, chips:[2, 3, 4, 5], acts:[
    {key:'split', type:'bond', nums:[2, 3, 4, 5], mode:'split', obj:'peach'},
    {key:'join', type:'bond', nums:[2, 3, 4, 5], mode:'join', obj:'strawberry'},
    {key:'pairs', type:'pairs', nums:[4, 5]},
  ]},
  {n:9, unit:1, title:{zh:'加法', en:'Adding'}, chips:['+'], acts:[
    {key:'add', type:'calc', ops:'+', max:5, objs:['duck', 'apple', 'flower', 'fish'], demo:['duck', 3, 2]},
    {key:'train', type:'train', ops:'+', max:5},
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 2, 1), st('arrive', 'bird', 'tree', 3, 2), st('combine', 'apple', '', 1, 3),
      st('arrive', 'rabbit', 'grass', 2, 2), st('combine', 'flower', '', 2, 3), st('arrive', 'fish', 'pond', 1, 4), st('combine', 'car', '', 3, 1), st('arrive', 'chick', 'grass', 4, 1)]},
  ]},
  {n:10, unit:1, title:{zh:'减法', en:'Taking away'}, chips:['−'], acts:[
    {key:'sub', type:'calc', ops:'-', max:5, objs:['balloon', 'cookie', 'bird', 'apple'], demo:['balloon', 5, 2]},
    {key:'train', type:'train', ops:'-', max:5},
    {key:'story', type:'story', stories:[st('leave', 'bird', 'tree', 5, 2), st('eat', 'cookie', 'plate', 4, 1), st('leave', 'duck', 'pond', 3, 1),
      st('eat', 'strawberry', 'plate', 5, 3), st('leave', 'rabbit', 'grass', 4, 2), st('leave', 'balloon', 'sky', 5, 1), st('eat', 'apple', 'basket', 3, 2), st('leave', 'fish', 'pond', 5, 4)]},
  ]},
  {n:11, unit:1, title:{zh:'0的认识', en:'Zero'}, chips:[0], acts:[
    {key:'count', type:'count', min:0, max:5, learn:[0, 1, 2, 3], objs:['apple', 'fish', 'egg', 'cookie'], zero:true},
    {key:'write', type:'write', digits:['0', '0', '1', '2', '3', '4', '5'], count:4},
    {key:'calc', type:'calc', ops:'+-', max:5, zero:true, objs:['apple', 'bird', 'cookie'], demo:['apple', 3, 3]},
  ]},
  // ---------------- 第二单元 6～10的认识和加、减法 ----------------
  {n:12, unit:2, title:{zh:'6和7', en:'6 and 7'}, chips:[6, 7], acts:[
    {key:'count', type:'count', min:3, max:7, focus:[6, 7], learn:[6, 7], objs:['ladybug', 'star', 'flower', 'duck', 'apple']},
    {key:'write', type:'write', digits:['6', '7', '6', '7']},
    {key:'bond', type:'bond', nums:[6, 7], mode:'mix', obj:'strawberry'},
    {key:'rank', type:'ordinal', len:7, mode:'which'},
  ]},
  {n:13, unit:2, title:{zh:'6和7的加减法', en:'Adding to 7'}, chips:['+', '−'], acts:[
    {key:'calc', type:'calc', ops:'+-', max:7, min:6, objs:['duck', 'balloon', 'apple', 'bird'], demo:['duck', 4, 2]},
    {key:'train', type:'train', ops:'+-', max:7, min:6},
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 4, 2), st('combine', 'apple', '', 3, 4), st('leave', 'bird', 'tree', 7, 3), st('eat', 'cookie', 'plate', 6, 2),
      st('part', 'ball', 'box', 7, 4), st('arrive', 'rabbit', 'grass', 5, 2), st('leave', 'fish', 'pond', 6, 1), st('part', 'candy', 'box', 6, 2)]},
  ]},
  {n:14, unit:2, title:{zh:'8和9', en:'8 and 9'}, chips:[8, 9], acts:[
    {key:'count', type:'count', min:4, max:9, focus:[8, 9], learn:[8, 9], objs:['bee', 'star', 'fish', 'balloon', 'strawberry']},
    {key:'write', type:'write', digits:['8', '9', '8', '9']},
    {key:'bond', type:'bond', nums:[8, 9], mode:'mix', obj:'apple'},
    {key:'compare', type:'signs', max:9, pick:true},
  ]},
  {n:15, unit:2, title:{zh:'8和9的加减法', en:'Adding to 9'}, chips:['+', '−'], acts:[
    {key:'calc', type:'calc', ops:'+-', max:9, min:8, objs:['fish', 'cookie', 'flower', 'chick'], demo:['fish', 5, 3]},
    {key:'train', type:'train', ops:'+-', max:9, min:8},
    {key:'story', type:'story', stories:[st('arrive', 'bird', 'tree', 5, 3), st('combine', 'flower', '', 4, 5), st('leave', 'duck', 'pond', 9, 4), st('eat', 'strawberry', 'plate', 8, 3),
      st('part', 'egg', 'box', 9, 6), st('arrive', 'chick', 'grass', 6, 3), st('leave', 'balloon', 'sky', 8, 2), st('part', 'ball', 'box', 8, 5)]},
  ]},
  {n:16, unit:2, title:{zh:'10的认识', en:'Ten'}, chips:[10], acts:[
    {key:'count', type:'count', min:6, max:10, focus:[10], learn:[10], objs:['apple', 'star', 'duck', 'candy', 'flower']},
    {key:'write', type:'write', digits:['10', '1', '0', '10']},
    {key:'bond', type:'bond', nums:[10], mode:'mix', obj:'peach'},
    {key:'pairs', type:'pairs', nums:[10]},
  ]},
  {n:17, unit:2, title:{zh:'10的加减法', en:'Adding to 10'}, chips:['+', '−'], acts:[
    {key:'calc', type:'calc', ops:'+-', max:10, min:10, objs:['duck', 'balloon', 'apple', 'star'], demo:['bird', 6, 4]},
    {key:'train', type:'train', ops:'+-', max:10},
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 6, 4), st('combine', 'apple', '', 7, 3), st('leave', 'bird', 'tree', 10, 3), st('eat', 'cookie', 'plate', 10, 6),
      st('part', 'ball', 'box', 10, 7), st('arrive', 'butterfly', 'grass', 8, 2), st('leave', 'rabbit', 'grass', 10, 5), st('part', 'egg', 'box', 10, 4)]},
  ]},
  {n:18, unit:2, title:{zh:'连加 连减', en:'Add, add again'}, chips:['+ +', '− −'], acts:[
    {key:'calc', type:'calc', ops:'++--', max:10, objs:['duck', 'cookie', 'bird'], three:true, demo:['duck', 2, 3, 1]},
    {key:'story', type:'story', stories:[chain('bird', 'tree', '++', 3, 2, 4), chain('cookie', 'plate', '--', 9, 3, 2), chain('kid', 'bus', '++', 2, 3, 3),
      chain('duck', 'pond', '++', 4, 1, 3), chain('fish', 'pond', '--', 8, 2, 3), chain('kid', 'bus', '--', 10, 4, 3)]},
    {key:'train', type:'train', ops:'++--', max:10, three:true},
  ]},
  {n:19, unit:2, title:{zh:'加减混合', en:'Add and take away'}, chips:['+ −'], acts:[
    {key:'story', type:'story', stories:[chain('kid', 'bus', '-+', 6, 2, 3), chain('bird', 'tree', '+-', 5, 3, 4), chain('duck', 'pond', '-+', 7, 4, 2),
      chain('kid', 'bus', '+-', 4, 4, 5), chain('rabbit', 'grass', '-+', 8, 5, 6), chain('fish', 'pond', '+-', 6, 3, 2)]},
    {key:'calc', type:'calc', ops:'+-mix', max:10, objs:['kid', 'bird', 'duck'], three:true, demo:['kid', 6, 2, 3]},
    {key:'train', type:'train', ops:'+-mix', max:10, three:true},
  ]},
  // ---------------- 第三单元 认识立体图形 ----------------
  {n:20, unit:3, title:{zh:'认识立体图形', en:'3D shapes'}, chips:['cuboid', 'cube', 'cylinder', 'sphere'], acts:[
    {key:'shape', type:'shape', mode:'name'},
    {key:'find', type:'shape', mode:'find'},
    {key:'count', type:'shape', mode:'count'},
    {key:'sort', type:'sort', by:'shape'},
  ]},
  // ---------------- 第四单元 11～20的认识 ----------------
  {n:21, unit:4, title:{zh:'11～20的认识', en:'11 to 20'}, chips:[11, 12, 13, 14, 15, 16, 17, 18, 19, 20], acts:[
    {key:'sticks', type:'tens', mode:'sticks'},
    {key:'count', type:'count', min:11, max:20, learn:[11, 12, 13, 14, 15, 16, 17, 18, 19, 20], objs:['star', 'apple', 'duck']},
    {key:'place', type:'place', min:11, max:20, sticks:true},
  ]},
  {n:22, unit:4, title:{zh:'数的顺序', en:'Number order'}, chips:[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], acts:[
    {key:'abacus', type:'tens', mode:'abacus'},
    {key:'line', type:'numline', min:0, max:20},
    {key:'compare', type:'signs', max:20, min:10, pick:true},
    {key:'order', type:'order', max:20, min:8},
  ]},
  {n:23, unit:4, title:{zh:'十加几', en:'Ten and some more'}, chips:['10 + 3'], acts:[
    {key:'calc', type:'calc', ops:'teen', max:20, objs:['star']},
    {key:'train', type:'train', ops:'teen', max:20},
  ]},
  // ---------------- 第五单元 20以内的进位加法 ----------------
  {n:24, unit:5, title:{zh:'9加几', en:'9 plus'}, chips:['9 + 4'], acts:[
    {key:'maketen', type:'maketen', pairs:[[9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [9, 8], [9, 9]], demo:[9, 4]},
    {key:'train', type:'train', ops:'carry', firsts:[9], max:20},
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 9, 4), st('combine', 'apple', '', 9, 6), st('arrive', 'bird', 'tree', 9, 3),
      st('combine', 'candy', '', 9, 8), st('arrive', 'chick', 'grass', 9, 5), st('combine', 'flower', '', 9, 7)]},
  ]},
  {n:25, unit:5, title:{zh:'8、7、6加几', en:'8, 7, 6 plus'}, chips:['8 + 5'], acts:[
    {key:'maketen', type:'maketen', pairs:[[8, 3], [8, 4], [8, 5], [8, 6], [8, 7], [8, 8], [8, 9], [7, 4], [7, 5], [7, 6], [7, 7], [7, 8], [7, 9], [6, 5], [6, 6], [6, 7], [6, 8], [6, 9]], demo:[8, 5]},
    {key:'train', type:'train', ops:'carry', firsts:[9, 8, 7, 6], max:20},
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 8, 5), st('combine', 'apple', '', 7, 6), st('arrive', 'bird', 'tree', 6, 6),
      st('combine', 'star', '', 8, 7), st('arrive', 'rabbit', 'grass', 7, 4), st('combine', 'cookie', '', 6, 9)]},
  ]},
  {n:26, unit:5, title:{zh:'5、4、3、2加几', en:'5, 4, 3, 2 plus'}, chips:['3 + 9'], acts:[
    {key:'maketen', type:'maketen', pairs:[[5, 6], [5, 7], [5, 8], [5, 9], [4, 7], [4, 8], [4, 9], [3, 8], [3, 9], [2, 9]], demo:[3, 9]},
    {key:'train', type:'train', ops:'carry', firsts:[9, 8, 7, 6, 5, 4, 3, 2], max:20},
  ]},
  {n:27, unit:5, title:{zh:'解决问题', en:'Word problems'}, chips:['?'], acts:[
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 8, 6), st('combine', 'apple', '', 5, 9), st('leave', 'bird', 'tree', 15, 5), st('eat', 'cookie', 'plate', 13, 3),
      st('part', 'ball', 'box', 12, 10), st('arrive', 'fish', 'pond', 7, 7), st('combine', 'flower', '', 6, 8), st('part', 'candy', 'box', 16, 6)]},
    {key:'story2', type:'story', stories:[st('arrive', 'chick', 'grass', 9, 9), st('combine', 'star', '', 4, 8), st('leave', 'balloon', 'sky', 18, 8), st('eat', 'strawberry', 'plate', 17, 7),
      st('part', 'egg', 'box', 14, 4), st('arrive', 'butterfly', 'grass', 5, 7), st('combine', 'car', '', 8, 8), st('leave', 'duck', 'pond', 19, 9)], pick:true},
  ]},
  // ---------------- 第六单元 复习与关联 ----------------
  {n:28, unit:6, title:{zh:'复习·数', en:'Review: numbers'}, chips:[0, 5, 10, 15, 20], acts:[
    {key:'count', type:'count', min:5, max:20, objs:['star', 'fish', 'apple', 'flower'], scene:true},
    {key:'line', type:'numline', min:0, max:20},
    {key:'compare', type:'signs', max:20, pick:true},
    {key:'rank', type:'ordinal', len:10, mode:'mix'},
  ]},
  {n:29, unit:6, title:{zh:'复习·计算', en:'Review: sums'}, chips:['+', '−'], acts:[
    {key:'train', type:'train', ops:'review', max:20},
    {key:'calc', type:'calc', ops:'review', max:20, missing:true, objs:['apple', 'star']},
    {key:'story', type:'story', stories:[st('arrive', 'duck', 'pond', 9, 6), st('leave', 'bird', 'tree', 9, 4), st('part', 'ball', 'box', 10, 6), st('combine', 'apple', '', 8, 4),
      st('eat', 'cookie', 'plate', 14, 4), chain('kid', 'bus', '-+', 9, 3, 4), st('combine', 'flower', '', 7, 9), chain('bird', 'tree', '++', 2, 4, 3)], pick:true},
  ]},
  {n:30, unit:6, title:{zh:'复习·图形', en:'Review: shapes'}, chips:['cuboid', 'cube', 'cylinder', 'sphere'], acts:[
    {key:'shape', type:'shape', mode:'mix'},
    {key:'pos', type:'pos', axis:'mix'},
    {key:'sort', type:'sort', by:'mix'},
  ]},
];
const LESSON_BY_N = Object.fromEntries(LESSONS.map(l => [l.n, l]));
const UNITS = [[0, '🎲'], [1, '🔢'], [2, '🧮'], [3, '🧊'], [4, '🔟'], [5, '🚀'], [6, '🏁']];

// One sticker per lesson
const STICKERS = [
  ['🚀', '小火箭', 'rocket'], ['🛸', '飞碟', 'flying saucer'], ['🪐', '土星', 'planet'], ['🌈', '彩虹', 'rainbow'], ['🦄', '独角兽', 'unicorn'],
  ['🐳', '小鲸鱼', 'whale'], ['🐬', '小海豚', 'dolphin'], ['🐙', '小章鱼', 'octopus'], ['🦀', '小螃蟹', 'crab'], ['🐠', '热带鱼', 'tropical fish'],
  ['🦕', '恐龙', 'dinosaur'], ['🦖', '霸王龙', 'T-rex'], ['🐉', '小龙', 'dragon'], ['🦒', '长颈鹿', 'giraffe'], ['🐘', '大象', 'elephant'],
  ['🦓', '斑马', 'zebra'], ['🦘', '袋鼠', 'kangaroo'], ['🐨', '考拉', 'koala'], ['🐧', '企鹅', 'penguin'], ['🦉', '猫头鹰', 'owl'],
  ['🦜', '鹦鹉', 'parrot'], ['🦩', '火烈鸟', 'flamingo'], ['🐞', '瓢虫', 'ladybug'], ['🦋', '蝴蝶', 'butterfly'], ['🐝', '小蜜蜂', 'bee'],
  ['🐢', '小乌龟', 'turtle'], ['🦔', '刺猬', 'hedgehog'], ['🐿️', '松鼠', 'squirrel'], ['🦊', '狐狸', 'fox'], ['🐼', '大熊猫', 'panda'],
];

// Drawing colours (the name is read out when a colour is picked)
const DRAW_COLORS = [
  ['black', '#212121'], ['red', '#e53935'], ['orange', '#fb8c00'], ['yellow', '#fdd835', true], ['green', '#43a047'],
  ['blue', '#1e88e5'], ['purple', '#8e24aa'], ['pink', '#f48fb1', true], ['brown', '#795548'],
];
