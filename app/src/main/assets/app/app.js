/* راكان — واجهة التطبيق. كل الشاشات والألعاب هنا.
   الجسر مع أندرويد اسمه window.Rakan ومعرّف في MainActivity.kt */
(function(){
"use strict";

var B = window.Rakan || null;
var view=document.getElementById('view'), dock=document.getElementById('dock'), screenEl=document.getElementById('screen');
var brand=document.getElementById('brand'), starsEl=document.getElementById('stars'), minsLeftEl=document.getElementById('minsLeft');
var ringPath=document.getElementById('ringPath'), meBadge=document.getElementById('meBadge'), hintSlot=document.getElementById('hintSlot');
var fileFace=document.getElementById('fileFace');

var AR=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function ar(n){return String(n).split('').map(function(c){return /[0-9]/.test(c)?AR[+c]:c;}).join('');}

/* ---------------- الصوت ---------------- */
var ac=null;
function tone(f,d,t){
  if(state.mute) return;
  try{
    ac=ac||new (window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    var o=ac.createOscillator(),g=ac.createGain();
    o.type=t||'sine'; o.frequency.value=f; o.connect(g); g.connect(ac.destination);
    var n=ac.currentTime;
    g.gain.setValueAtTime(0.0001,n);
    g.gain.exponentialRampToValueAtTime(.12,n+.02);
    g.gain.exponentialRampToValueAtTime(.0001,n+(d||.18));
    o.start(n); o.stop(n+(d||.18)+.03);
  }catch(e){}
}

/* ---------------- الرسومات ---------------- */
function rakan(mood,cls){
  var eye = mood==='sleep'
    ? '<path d="M21 21q5 4 10 0" stroke="#22324F" stroke-width="2" fill="none" stroke-linecap="round"/>'
    : '<circle cx="26" cy="21" r="5.2" fill="#fff"/><circle cx="27.2" cy="21.6" r="2.7" fill="#22324F"/><circle cx="28.3" cy="20.4" r="1" fill="#fff"/>';
  var zzz = mood==='sleep' ? '<text x="52" y="22" font-size="13" font-weight="800" fill="#8A74E8">zZ</text>' : '';
  var arm = mood==='cheer' ? '<rect x="30" y="44" width="8" height="20" rx="4" fill="#E0BE8E" transform="rotate(-38 34 54)"/>' : '';
  return '<svg class="'+(cls||'')+'" viewBox="0 0 100 100" aria-hidden="true">'+
    '<rect x="26" y="66" width="8" height="19" rx="4" fill="#D8B383"/><rect x="62" y="66" width="8" height="19" rx="4" fill="#D8B383"/>'+
    '<rect x="38" y="68" width="8" height="18" rx="4" fill="#E8C799"/><rect x="52" y="68" width="8" height="18" rx="4" fill="#E8C799"/>'+
    '<ellipse cx="50" cy="57" rx="26" ry="17" fill="#F2D5A8"/>'+
    '<path d="M33 46 Q50 23 67 46 Z" fill="#F2D5A8"/>'+
    '<path d="M39 44 Q50 31 61 44 L61 49 Q50 43 39 49 Z" fill="#EF5B42"/>'+
    '<path d="M76 50 Q85 53 82 64" stroke="#E0BE8E" stroke-width="3.6" fill="none" stroke-linecap="round"/>'+arm+
    '<path d="M27 56 Q18 41 23 27 L36 29 Q31 44 38 54 Z" fill="#F2D5A8"/>'+
    '<ellipse cx="32" cy="13.5" rx="3.6" ry="5.4" fill="#E0BE8E"/>'+
    '<ellipse cx="26" cy="24" rx="14" ry="12.4" fill="#F2D5A8"/>'+
    '<ellipse cx="15.5" cy="28.5" rx="8.4" ry="6.6" fill="#FBE7C8"/>'+
    '<circle cx="11.5" cy="27" r="1.3" fill="#C49A68"/>'+
    '<path d="M11.5 31.5 Q15.5 34 19.5 31.5" stroke="#C49A68" stroke-width="1.5" fill="none" stroke-linecap="round"/>'+eye+
    '<path d="M20.5 14.5 Q26 11.5 31.5 14.5" stroke="#22324F" stroke-width="1.7" fill="none" stroke-linecap="round"/>'+zzz+'</svg>';
}

var SKIN=['#F8D9BF','#F0C4A0','#E0A878','#C98B5E','#A86A42','#7E4A2B'];
var HAIRC=['#1E1710','#3B2A1C','#6E4B2A','#A9703A','#D7B36B','#8C8C8C'];
var SHIRT=['#3FA9E0','#EF5B42','#23AE84','#8A74E8','#F5A623','#E8608F'];
var FACES=['بيضاوي','دائري','مربّع','مدبّب'];
var HAIRS=['قصير','كيرلي','بغرة','مموّج','طويل','حليقة'];
var EYES=['واسعة','لوزية','صغيرة','ضاحكة'];

function avatarSvg(p){
  var skin=SKIN[p.skin], hair=HAIRC[p.hairColor], shirt=SHIRT[p.shirt];
  var face=[
    '<ellipse cx="50" cy="50" rx="25" ry="29" fill="'+skin+'"/>',
    '<circle cx="50" cy="50" r="27" fill="'+skin+'"/>',
    '<rect x="24" y="22" width="52" height="56" rx="18" fill="'+skin+'"/>',
    '<path d="M50 80 C 26 68, 23 44, 27 34 C 34 22, 66 22, 73 34 C 77 44, 74 68, 50 80 Z" fill="'+skin+'"/>'
  ][p.face];
  var hairs=[
    '<path d="M23 44 C 24 22, 76 22, 77 44 C 72 36, 64 31, 50 31 C 36 31, 28 36, 23 44 Z" fill="'+hair+'"/>',
    '<g fill="'+hair+'"><circle cx="32" cy="30" r="11"/><circle cx="50" cy="24" r="12"/><circle cx="68" cy="30" r="11"/><circle cx="24" cy="42" r="8"/><circle cx="76" cy="42" r="8"/></g>',
    '<path d="M22 46 C 22 22, 78 22, 78 46 L 78 36 C 66 44, 44 40, 30 48 Z" fill="'+hair+'"/><rect x="22" y="33" width="56" height="12" rx="6" fill="'+hair+'"/>',
    '<path d="M22 46 C 24 20, 76 20, 78 46 C 72 38, 68 44, 60 36 C 52 44, 46 34, 38 42 C 32 36, 28 42, 22 46 Z" fill="'+hair+'"/>',
    '<path d="M20 46 C 20 20, 80 20, 80 46 L 80 72 C 76 60, 74 50, 72 44 C 62 36, 38 36, 28 44 C 26 50, 24 60, 20 72 Z" fill="'+hair+'"/>',
    '<path d="M26 42 C 28 26, 72 26, 74 42 C 68 36, 32 36, 26 42 Z" fill="'+hair+'" opacity=".82"/>'
  ][p.hair];
  var eyes=[
    '<circle cx="39" cy="50" r="5" fill="#fff"/><circle cx="61" cy="50" r="5" fill="#fff"/><circle cx="39.8" cy="50.6" r="2.7" fill="#22324F"/><circle cx="61.8" cy="50.6" r="2.7" fill="#22324F"/>',
    '<path d="M33 50 q6 -6 12 0 q-6 6 -12 0z" fill="#fff"/><path d="M55 50 q6 -6 12 0 q-6 6 -12 0z" fill="#fff"/><circle cx="39" cy="50" r="2.6" fill="#22324F"/><circle cx="61" cy="50" r="2.6" fill="#22324F"/>',
    '<circle cx="39" cy="50" r="2.9" fill="#22324F"/><circle cx="61" cy="50" r="2.9" fill="#22324F"/>',
    '<path d="M33 52 q6 -7 12 0" stroke="#22324F" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M55 52 q6 -7 12 0" stroke="#22324F" stroke-width="3" fill="none" stroke-linecap="round"/>'
  ][p.eyes];
  return '<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="#E8EFF7"/>'+
    '<path d="M18 100 C 20 84, 34 76, 50 76 C 66 76, 80 84, 82 100 Z" fill="'+shirt+'"/>'+
    '<rect x="43" y="68" width="14" height="12" fill="'+skin+'"/>'+
    '<ellipse cx="24" cy="52" rx="5" ry="6" fill="'+skin+'"/><ellipse cx="76" cy="52" rx="5" ry="6" fill="'+skin+'"/>'+
    face+hairs+eyes+
    '<path d="M41 62 q9 7 18 0" stroke="#B4654A" stroke-width="2.6" fill="none" stroke-linecap="round"/>'+
    '<path d="M33 41 q6 -3 11 -1" stroke="'+hair+'" stroke-width="2.4" fill="none" stroke-linecap="round"/>'+
    '<path d="M56 40 q5 -2 11 1" stroke="'+hair+'" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
}

function iPhoto(){return '<svg width="46" height="46" viewBox="0 0 48 48"><rect x="6" y="12" width="36" height="27" rx="6" fill="#fff" opacity=".95"/><circle cx="17" cy="21" r="4" fill="#F5A623"/><path d="M10 35l9-9 6 6 5-5 8 8v2a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-2z" fill="#23AE84"/></svg>';}
function iPlay(){return '<svg width="46" height="46" viewBox="0 0 48 48"><rect x="12" y="7" width="24" height="34" rx="7" fill="#fff" opacity=".95"/><path d="M21 17.5l9 6.5-9 6.5v-13z" fill="#EF5B42"/></svg>';}
function iPuzzle(s){s=s||46;return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 48 48"><circle cx="17" cy="17" r="8" fill="#fff" opacity=".95"/><rect x="25" y="9" width="16" height="16" rx="4" fill="#fff" opacity=".8"/><path d="M24 40l-9-14h18l-9 14z" fill="#fff" opacity=".9"/></svg>';}
function iHeart(s){s=s||46;return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 48 48"><path d="M24 39S9 30 9 20.5C9 15.8 12.6 12 17.2 12c2.9 0 5.4 1.5 6.8 3.8 1.4-2.3 3.9-3.8 6.8-3.8C35.4 12 39 15.8 39 20.5 39 30 24 39 24 39z" fill="#fff" opacity=".95"/></svg>';}
function iPray(){return '<svg width="46" height="46" viewBox="0 0 48 48"><rect x="7" y="33" width="34" height="7" rx="3" fill="#fff" opacity=".8"/><circle cx="18" cy="15" r="5" fill="#fff" opacity=".95"/><path d="M13 33c0-7 3-12 7-12s5 3 11 5c2 .7 2.5 3 1 4.5-1.3 1.3-3.2.7-5-.2V33H13z" fill="#fff" opacity=".95"/></svg>';}
function iBook(){return '<svg width="46" height="46" viewBox="0 0 48 48"><path d="M24 14c-4-3-9-4-14-3v22c5-1 10 0 14 3 4-3 9-4 14-3V11c-5-1-10 0-14 3z" fill="#fff" opacity=".95"/><path d="M24 14v22" stroke="#5A9A46" stroke-width="2.2" stroke-linecap="round"/></svg>';}
function iHome(){return '<svg width="28" height="28" viewBox="0 0 24 24"><path d="M3.6 10.6L12 4l8.4 6.6V20a1 1 0 0 1-1 1h-4.6v-6h-5.6v6H4.6a1 1 0 0 1-1-1v-9.4z" fill="#22324F"/></svg>';}
function iBack(){return '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke="#22324F" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
function iStar(on,s){s=s||12;return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9L12 2.6z" fill="'+(on?'#F5A623':'#CDD6E2')+'"/></svg>';}
function iSpk(){return '<svg width="17" height="17" viewBox="0 0 24 24"><path d="M5 9.5h3.5L13 5.5v13L8.5 14.5H5v-5z" fill="#fff"/><path d="M16 9a4.5 4.5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';}
function iChev(d){return '<svg width="24" height="24" viewBox="0 0 24 24"><path d="'+(d==='up'?'M6 15l6-6 6 6':'M6 9l6 6 6-6')+'" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';}
function iGear(){return '<svg width="21" height="21" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2" stroke="#22324F" stroke-width="2" fill="none"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" stroke="#22324F" stroke-width="2" stroke-linecap="round"/></svg>';}

function shapeSvg(k,c,s){s=s||56;var m={
  circle:'<circle cx="32" cy="32" r="24" fill="'+c+'"/>',
  square:'<rect x="9" y="9" width="46" height="46" rx="9" fill="'+c+'"/>',
  triangle:'<path d="M32 7l25 46H7L32 7z" fill="'+c+'"/>',
  star:'<path d="M32 6l7.6 16 17.4 2.4-12.7 12.1L47.5 54 32 45.7 16.5 54l3.2-17.5L7 24.4 24.4 22 32 6z" fill="'+c+'"/>',
  heart:'<path d="M32 55S8 42 8 25.5C8 17.5 14 12 21 12c4.6 0 8.6 2.5 11 6.3C34.4 14.5 38.4 12 43 12c7 0 13 5.5 13 13.5C56 42 32 55 32 55z" fill="'+c+'"/>'};
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 64 64">'+m[k]+'</svg>';}

/* ---------------- المحتوى ---------------- */
var APPS=[
  {id:'photos',name:'الصور',color:'var(--sky)',art:iPhoto},
  {id:'reels',name:'فيديوهات',color:'var(--melon)',art:iPlay},
  {id:'letters',name:'الحروف',color:'var(--grape)',glyph:'أ'},
  {id:'numbers',name:'الأرقام',color:'var(--mint)',glyph:'٣'},
  {id:'games',name:'ألعاب',color:'var(--sun)',art:iPuzzle},
  {id:'manners',name:'أخلاقي',color:'var(--rose)',art:iHeart},
  {id:'prayer',name:'الصلاة',color:'var(--teal)',art:iPray},
  {id:'quran',name:'القرآن',color:'var(--olive)',art:iBook}
];
var AR_L=[['أ','أرنب'],['ب','بطة'],['ت','تفاحة'],['ث','ثعلب'],['ج','جمل'],['ح','حصان'],['خ','خروف'],['د','دُب'],['ذ','ذرة'],['ر','رمان'],['ز','زرافة'],['س','سمكة'],['ش','شمس'],['ص','صاروخ'],['ض','ضفدع'],['ط','طيارة'],['ظ','ظرف'],['ع','عصفور'],['غ','غزال'],['ف','فيل'],['ق','قطة'],['ك','كتاب'],['ل','ليمونة'],['م','موزة'],['ن','نحلة'],['ه','هدية'],['و','وردة'],['ي','يد']];
var EN_L=[['A','Apple'],['B','Ball'],['C','Cat'],['D','Duck'],['E','Egg'],['F','Fish'],['G','Goat'],['H','Hat'],['I','Ice'],['J','Jam'],['K','Kite'],['L','Lion'],['M','Moon'],['N','Nest'],['O','Owl'],['P','Pen'],['Q','Queen'],['R','Rain'],['S','Sun'],['T','Tree'],['U','Umbrella'],['V','Van'],['W','Water'],['X','Box'],['Y','Yoyo'],['Z','Zebra']];
var MANNERS=['لمّا حد يديك حاجة، قول: شكراً يا حبيبي','اغسل إيديك كويس قبل ما تاكل','لمّا تدخل البيت قول: السلام عليكم','ماتاخدش لعبة حد من غير ما تستأذن','لمّا تغلط، قول: أنا آسف — دي شجاعة','كلّم ماما وبابا بصوت هادي ومتعلّيش صوتك','شارك لعبك مع أخواتك وأصحابك','لمّا تاخد حاجة، خدها بإيدك اليمين'];
var PRAYER=[['نجهّز نفسنا','نتوضّا ونلبس هدوم نضيفة'],['نقف ونتجه للقبلة','نقف مستعدلين ونبصّ ناحية القبلة'],['نكبّر','نرفع إيدينا ونقول: الله أكبر'],['نقرا','نقرا الفاتحة وسورة قصيرة'],['نركع','نحني ضهرنا ونقول: سبحان ربي العظيم'],['نسجد','نسجد على الأرض ونقول: سبحان ربي الأعلى'],['نسلّم','في الآخر نقول: السلام عليكم ورحمة الله']];
var SURAHS=[['الفاتحة',7],['الإخلاص',4],['الفلق',5],['الناس',6],['الكوثر',3],['المسد',5],['النصر',3],['الماعون',7]];
var DEMO_PHOTOS=[['#8ED8F8','#FFD98A','sun'],['#FFC2D6','#F6A5C0','balloon'],['#B9E8C4','#6CBF72','sun'],['#FFE1A8','#F5A623','balloon'],['#C9C2F7','#8A74E8','sun'],['#A8E4EA','#128C9B','balloon']];
function sceneSvg(seed){
  var sky=seed[0],a=seed[1],k=seed[2];
  var ex = k==='sun'
    ? '<circle cx="78" cy="26" r="13" fill="#FFF0B8"/><path d="M0 72 C 22 50, 44 58, 62 70 C 80 82, 92 60, 100 66 L100 100 L0 100 Z" fill="'+a+'"/>'
    : '<circle cx="34" cy="38" r="12" fill="'+a+'"/><circle cx="62" cy="30" r="9" fill="#FFF0B8"/><rect x="33" y="50" width="2" height="26" fill="#9AA6B5"/><path d="M0 78 L100 78 L100 100 L0 100 Z" fill="'+a+'" opacity=".7"/>';
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><rect width="100" height="100" fill="'+sky+'"/>'+ex+'</svg>';
}

var GAMES=[
  {id:'balloons',name:'فرقع البلالين',color:'var(--rose)'},
  {id:'fruit',name:'اقطف الفاكهة',color:'var(--mint)'},
  {id:'car',name:'العربية',color:'var(--melon)'},
  {id:'shapes',name:'طابق الأشكال',color:'var(--grape)'},
  {id:'memory',name:'الذاكرة',color:'var(--teal)',minAge:'4-5'}
];
var CFG={
  '2-3':{bSpeed:.45,bR:38,bTarget:8,fSpeed:1.1,fRocks:false,fTarget:8,cSpeed:1.4,cTarget:6,shapes:3,pairs:0},
  '4-5':{bSpeed:.75,bR:31,bTarget:12,fSpeed:1.7,fRocks:true,fTarget:12,cSpeed:2.1,cTarget:10,shapes:5,pairs:4},
  '6+' :{bSpeed:1.1,bR:25,bTarget:16,fSpeed:2.4,fRocks:true,fTarget:16,cSpeed:3,cTarget:14,shapes:5,pairs:6}
};
function cfg(){return CFG[state.age]||CFG['4-5'];}

/* ---------------- الحالة ---------------- */
var state={
  pin:'1234', childName:'', age:'4-5', minutes:20, mute:false,
  hidden:{}, hasAvatar:false, avatar:{face:0,skin:1,hair:0,hairColor:1,eyes:0,shirt:0},
  hintShown:false
};
var ui={app:null,lang:'ar',picked:null,photoIndex:0,reelIndex:0,mannerIndex:0,prayerStep:0,surah:null,
  gameRound:0,gameScore:0,gameTarget:null,gameOpts:[]};
var photos=[], videos=[], hasAccess=true;

function savePrefs(){
  if(!B)return;
  try{B.setPrefs(JSON.stringify({pin:state.pin,childName:state.childName,age:state.age,minutes:state.minutes,
    mute:state.mute,hidden:state.hidden,hasAvatar:state.hasAvatar,avatar:state.avatar,hintShown:state.hintShown}));}catch(e){}
}
function loadPrefs(){
  if(!B)return;
  try{
    var raw=B.getPrefs();
    if(raw){var p=JSON.parse(raw); for(var k in p){if(p[k]!==undefined)state[k]=p[k];}}
  }catch(e){}
}
function loadMedia(){
  photos=[]; videos=[];
  if(B){
    try{ hasAccess = !!B.hasAccess(); }catch(e){ hasAccess=true; }
    try{
      JSON.parse(B.listMedia('photos')).forEach(function(f){photos.push({kind:'file',url:f.url,title:f.title});});
      JSON.parse(B.listMedia('videos')).forEach(function(f){videos.push({kind:'file',url:f.url,title:f.title});});
    }catch(e){}
  }
  if(!photos.length) photos=DEMO_PHOTOS.map(function(s){return {kind:'demo',seed:s};});
}
function folder(kind){ try{ return B?B.folderPath(kind):'/storage/emulated/0/Rakan/'+kind; }catch(e){ return '/storage/emulated/0/Rakan/'+kind; } }

/* ---------------- وقت اللعب ---------------- */
var sessionStart=Date.now(), timeUpShown=false;
function minutesLeft(){
  var used=(Date.now()-sessionStart)/60000;
  return Math.max(0,Math.ceil(state.minutes-used));
}
setInterval(function(){
  renderStatus();
  if(!timeUpShown && minutesLeft()<=0 && !document.getElementById('settings') && !document.getElementById('gate')){
    timeUpShown=true; stopGame(); closeLayer('reelLayer'); closeLayer('viewer'); showTimeUp(true);
  }
},20000);

function renderStatus(){
  var left=minutesLeft();
  var on=Math.max(0,Math.ceil(left/state.minutes*5)), h='';
  for(var i=0;i<5;i++) h+=iStar(i<on);
  starsEl.innerHTML=h;
  minsLeftEl.textContent=ar(left)+' د';
  meBadge.innerHTML = state.hasAvatar ? avatarSvg(state.avatar) : rakan('happy');
}

/* ---------------- الشاشة الرئيسية ---------------- */
function visibleApps(){return APPS.filter(function(a){return !state.hidden[a.id];});}
function appTile(a){
  var art=a.glyph?'<span class="glyph">'+a.glyph+'</span>':a.art();
  return '<button class="app" data-app="'+a.id+'"><span class="tile" style="background:'+a.color+'">'+art+'</span><span class="label">'+a.name+'</span></button>';
}
function renderHome(){
  var who=state.childName?' يا '+state.childName:' يا بطل';
  var apps=visibleApps();
  view.innerHTML='<div class="greetrow"><span class="rk bobbing">'+rakan('happy')+'</span>'+
    '<p class="greet">أهلاً'+who+'!<br><span>تحب تلعب إيه النهارده؟</span></p></div>'+
    '<div class="grid">'+apps.map(appTile).join('')+'</div>';
  dock.innerHTML=apps.slice(0,3).map(function(a){
    var art=a.glyph?'<span class="glyph" style="font-size:22px">'+a.glyph+'</span>':a.art().replace(/width="46" height="46"/,'width="26" height="26"');
    return '<button class="dock-mini" data-app="'+a.id+'" style="background:'+a.color+'" aria-label="'+a.name+'">'+art+'</button>';
  }).join('');
  if(!state.hintShown){
    hintSlot.innerHTML='<div class="hint">اضغط مطوّل على «راكان» عشان تفتح إعدادات ولي الأمر<button data-act="hide-hint">تمام</button></div>';
  }
}
function bar(t,x){return '<div class="appbar"><button class="rbtn" data-act="home" style="background:rgba(255,255,255,.7);width:38px;height:38px">'+iBack()+'</button><h2>'+t+'</h2>'+(x||'')+'</div>';}
function homeDock(){dock.innerHTML='<button class="homebtn" data-act="home" aria-label="الرئيسية">'+iHome()+'</button>';}

/* ---------------- الحروف والأرقام ---------------- */
function renderLetters(){
  var set=ui.lang==='ar'?AR_L:EN_L, p=ui.picked, body;
  if(p){
    body='<div class="bigcard"><div class="big" style="direction:ltr">'+p[0]+'</div>'+
      '<div class="wave"><i></i><i></i><i></i><i></i><i></i></div>'+
      (state.age==='2-3'?'':'<div class="word">'+p[1]+'</div>')+
      '<div class="rowbtns" style="width:100%"><button data-act="again">تاني</button><button data-act="back-grid">كل الحروف</button></div></div>';
  } else {
    body='<div class="chips"><button class="chip" data-lang="ar" aria-pressed="'+(ui.lang==='ar')+'">عربي</button>'+
      '<button class="chip" data-lang="en" aria-pressed="'+(ui.lang==='en')+'">English</button></div>'+
      '<div class="tilegrid">'+set.map(function(l,i){return '<button class="lt" data-letter="'+i+'" style="direction:ltr">'+l[0]+'</button>';}).join('')+'</div>';
  }
  view.innerHTML=bar('الحروف','<span class="pill">'+(state.age==='2-3'?'نطق':'نطق + كلمة')+'</span>')+body; homeDock();
}
function renderNumbers(){
  var p=ui.picked, body, max=state.age==='6+'?20:10;
  if(p){var d='';for(var i=0;i<Math.min(p,20);i++)d+='<i></i>';
    body='<div class="bigcard"><div class="big" style="color:var(--mint)">'+ar(p)+'</div>'+
      '<div class="wave"><i></i><i></i><i></i><i></i><i></i></div><div class="dots">'+d+'</div>'+
      '<div class="rowbtns" style="width:100%"><button data-act="again">تاني</button><button data-act="back-grid">كل الأرقام</button></div></div>';
  } else {
    var t='';for(var n=1;n<=max;n++)t+='<button class="lt" data-num="'+n+'" style="color:var(--mint)">'+ar(n)+'</button>';
    body='<div class="tilegrid'+(max>10?'':' wide')+'">'+t+'</div>';
  }
  view.innerHTML=bar('الأرقام','<span class="pill">١ إلى '+ar(max)+'</span>')+body; homeDock();
}

/* ---------------- الصور ---------------- */
function photoHtml(p){return p.kind==='file'?'<img src="'+p.url+'" alt="">':sceneSvg(p.seed);}
function emptyBox(what,path){
  return '<div class="empty"><span class="rk">'+rakan('happy')+'</span>'+
    '<b>مفيش '+what+' لسه</b>'+
    '<p>حط الملفات في المجلد ده على الموبايل:<br><code>'+path+'</code><br>وهتظهر هنا على طول.</p></div>';
}
function renderPhotos(){
  var body = photos.length
    ? '<div class="photogrid">'+photos.map(function(p,i){return '<button class="ph" data-photo="'+i+'">'+photoHtml(p)+'</button>';}).join('')+'</div>'
    : emptyBox('صور',folder('photos'));
  view.innerHTML=bar('الصور','<span class="pill">'+ar(photos.length)+'</span>')+body; homeDock();
}
function openViewer(){
  var p=photos[ui.photoIndex];
  var el=document.createElement('div'); el.className='viewer'; el.id='viewer';
  el.innerHTML='<div class="frame">'+photoHtml(p)+'</div><div class="bar">'+
    '<button class="rbtn" data-act="ph-prev">'+iChev('up')+'</button>'+
    '<span class="count">'+ar(ui.photoIndex+1)+' / '+ar(photos.length)+'</span>'+
    '<button class="rbtn" data-act="ph-next">'+iChev('down')+'</button>'+
    '<button class="rbtn" data-act="ph-close">✕</button></div>';
  screenEl.appendChild(el);
}

/* ---------------- الفيديوهات ---------------- */
function renderReelsScreen(){
  if(!videos.length){
    view.innerHTML=bar('فيديوهات')+emptyBox('فيديوهات',folder('videos')); homeDock(); return;
  }
  view.innerHTML=''; homeDock(); renderReels();
}
function renderReels(){
  var v=videos[ui.reelIndex]; if(!v)return;
  var el=document.createElement('div'); el.className='reel'; el.id='reelLayer';
  el.innerHTML='<div class="stageview"><video id="reelVideo" src="'+v.url+'" playsinline autoplay></video>'+
    '<button class="bigplay" data-act="reel-play" hidden id="reelPlay"><svg width="32" height="32" viewBox="0 0 24 24"><path d="M8 5.5l11 6.5-11 6.5v-13z" fill="#fff"/></svg></button>'+
    '<div class="overlay"><div class="top"><span class="tag">'+ar(ui.reelIndex+1)+' من '+ar(videos.length)+'</span>'+
    '<button class="rbtn" data-act="home" style="width:36px;height:36px">✕</button></div>'+
    '<div class="bottom"><div style="flex:1;min-width:0"><div class="title">'+v.title+'</div>'+
    '<div class="progress"><i id="reelBar"></i></div></div>'+
    '<div class="side"><button class="rbtn" data-act="reel-prev">'+iChev('up')+'</button>'+
    '<button class="rbtn" data-act="reel-next">'+iChev('down')+'</button></div></div></div></div>';
  screenEl.appendChild(el);
  var vid=document.getElementById('reelVideo'), bar2=document.getElementById('reelBar'), pb=document.getElementById('reelPlay');
  if(vid){
    vid.addEventListener('timeupdate',function(){ if(bar2&&vid.duration)bar2.style.width=(vid.currentTime/vid.duration*100)+'%'; });
    vid.addEventListener('ended',function(){ nextReel(1); });
    vid.addEventListener('pause',function(){ if(pb)pb.hidden=false; });
    vid.addEventListener('play',function(){ if(pb)pb.hidden=true; });
    var p=vid.play(); if(p&&p.catch)p.catch(function(){ if(pb)pb.hidden=false; });
  }
}
function nextReel(d){
  var nx=ui.reelIndex+d;
  if(nx>=videos.length){ closeLayer('reelLayer'); showTimeUp(false); return; }
  ui.reelIndex=(nx+videos.length)%videos.length;
  closeLayer('reelLayer'); renderReels(); tone(480,.08,'triangle');
}

/* ---------------- بطاقات ---------------- */
function renderManners(){
  view.innerHTML=bar('أخلاقي','<span class="pill">بصوت ماما</span>')+
    '<div class="card"><div style="width:70px;height:70px;border-radius:24px;background:var(--rose);display:grid;place-items:center">'+iHeart(42)+'</div>'+
    '<p class="say">'+MANNERS[ui.mannerIndex]+'</p><button class="speak" data-act="say">'+iSpk()+' اسمعها</button></div>'+
    '<div class="rowbtns"><button data-act="manner-prev">اللي قبله</button><button data-act="manner-next">اللي بعده</button></div>';
  homeDock();
}
function renderPrayer(){
  var s=PRAYER[ui.prayerStep];
  view.innerHTML=bar('الصلاة','<span class="pill">'+ar(ui.prayerStep+1)+' من '+ar(PRAYER.length)+'</span>')+
    '<div class="card"><div style="width:78px;height:78px;border-radius:26px;background:var(--teal);display:grid;place-items:center">'+iPray()+'</div>'+
    '<p class="say" style="font-size:21px">'+s[0]+'</p><p style="margin:0;font-size:15px;color:var(--ink-soft);line-height:1.8">'+s[1]+'</p>'+
    '<button class="speak" data-act="say">'+iSpk()+' اسمعها</button></div>'+
    '<div class="rowbtns"><button data-act="pray-prev">السابقة</button><button data-act="pray-next">التالية</button></div>';
  homeDock();
}
function renderQuran(){
  var body;
  if(ui.surah!==null){var s=SURAHS[ui.surah];
    body='<div class="card"><div style="width:78px;height:78px;border-radius:26px;background:var(--olive);display:grid;place-items:center">'+iBook()+'</div>'+
      '<p class="say" style="font-size:23px">سورة '+s[0]+'</p>'+
      '<p style="margin:0;font-size:14px;color:var(--ink-soft)">'+ar(s[1])+' آيات · بصوت المصحف المعلّم</p>'+
      '<div class="wave"><i></i><i></i><i></i><i></i><i></i></div>'+
      '<div class="rowbtns" style="width:100%"><button data-act="quran-back">كل السور</button></div></div>';
  } else {
    body='<div class="list">'+SURAHS.map(function(s,i){
      return '<button class="row" data-surah="'+i+'"><span class="n" style="background:var(--olive)">'+ar(i+1)+'</span><span class="t">سورة '+s[0]+'</span><span class="s">'+ar(s[1])+' آيات</span></button>';}).join('')+'</div>';
  }
  view.innerHTML=bar('القرآن','<span class="pill">قصار السور</span>')+body; homeDock();
}

/* ---------------- الألعاب ---------------- */
function availableGames(){ return GAMES.filter(function(g){ return !(g.minAge && state.age==='2-3'); }); }
function renderGamesHub(){
  var lvl=state.age==='2-3'?'سهل':(state.age==='4-5'?'متوسط':'صعب');
  var art={
    balloons:'<svg width="44" height="44" viewBox="0 0 48 48"><ellipse cx="24" cy="19" rx="12" ry="14" fill="#fff" opacity=".95"/><path d="M24 33v10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>',
    fruit:'<svg width="44" height="44" viewBox="0 0 48 48"><circle cx="24" cy="22" r="12" fill="#fff" opacity=".95"/><path d="M24 10V6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M10 34h28l-4 8H14z" fill="#fff" opacity=".75"/></svg>',
    car:'<svg width="44" height="44" viewBox="0 0 48 48"><path d="M9 28l3-8a4 4 0 0 1 4-3h16a4 4 0 0 1 4 3l3 8v6H9z" fill="#fff" opacity=".95"/><circle cx="16" cy="35" r="4" fill="#fff"/><circle cx="32" cy="35" r="4" fill="#fff"/></svg>',
    shapes:iPuzzle(44),
    memory:'<svg width="44" height="44" viewBox="0 0 48 48"><rect x="7" y="10" width="15" height="21" rx="4" fill="#fff" opacity=".95"/><rect x="26" y="17" width="15" height="21" rx="4" fill="#fff" opacity=".75"/></svg>'};
  view.innerHTML=bar('ألعاب','<span class="pill">'+lvl+'</span>')+
    '<div class="gamegrid">'+availableGames().map(function(g){
      return '<button class="gtile" data-game="'+g.id+'" style="background:'+g.color+'">'+art[g.id]+g.name+'</button>';}).join('')+'</div>';
  homeDock();
}

var loop=null, canvas=null, ctx=null, lastGame=null, winScore=0;
function stopGame(){ if(loop){cancelAnimationFrame(loop);loop=null;} var l=document.getElementById('glayer'); if(l)l.remove(); canvas=null;ctx=null; }
function gameLayer(title){
  var el=document.createElement('div'); el.className='glayer'; el.id='glayer';
  el.innerHTML='<div class="gtop"><button class="rbtn" data-act="game-exit" style="background:rgba(255,255,255,.85);width:38px;height:38px">'+iBack()+'</button>'+
    '<span class="nm">'+title+'</span><span class="sc">'+iStar(true,16)+'<span id="gScore">٠</span></span></div>';
  screenEl.appendChild(el); return el;
}
function setScore(n){var e=document.getElementById('gScore'); if(e)e.textContent=ar(n); winScore=n;}
function mkCanvas(el){
  canvas=document.createElement('canvas'); el.appendChild(canvas);
  var r=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.max(1,Math.round(r.width*dpr)); canvas.height=Math.max(1,Math.round(r.height*dpr));
  ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  return {w:r.width,h:r.height};
}
function canvasPt(e){var r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function rrect(x,y,w,h,r){ if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);} else {ctx.beginPath();ctx.rect(x,y,w,h);} }

function winScreen(){
  stopGame();
  var el=document.createElement('div'); el.className='timeup'; el.id='timeup';
  el.innerHTML='<span class="rk bobbing">'+rakan('cheer')+'</span><p class="t">برافو عليك!</p>'+
    '<p class="s">جمعت '+ar(winScore)+' نجمة</p>'+
    '<button class="speak" style="background:#fff;color:var(--ink)" data-act="win-again">نلعب تاني</button>'+
    '<button class="speak" style="background:rgba(255,255,255,.18)" data-act="win-home">خلاص</button>';
  screenEl.appendChild(el);
  tone(660,.2); setTimeout(function(){tone(820,.25);},180);
}

function startBalloons(){
  lastGame='balloons'; var el=gameLayer('فرقع البلالين'); var d=mkCanvas(el);
  var c=cfg(), cols=['#EF5B42','#3FA9E0','#23AE84','#F5A623','#8A74E8','#E8608F'];
  var items=[], parts=[], score=0; setScore(0);
  function spawn(){items.push({x:30+Math.random()*(d.w-60),y:d.h+40,r:c.bR*(.85+Math.random()*.35),s:c.bSpeed*(.7+Math.random()*.8),c:cols[(Math.random()*cols.length)|0]});}
  for(var i=0;i<4;i++)spawn();
  canvas.addEventListener('pointerdown',function(e){
    var p=canvasPt(e);
    for(var i=items.length-1;i>=0;i--){var b=items[i];
      if((p.x-b.x)*(p.x-b.x)+(p.y-b.y)*(p.y-b.y)<b.r*b.r*1.4){
        for(var k=0;k<12;k++)parts.push({x:b.x,y:b.y,vx:(Math.random()-.5)*6,vy:(Math.random()-.5)*6,l:1,c:b.c});
        items.splice(i,1); score++; setScore(score); tone(500+score*25,.12,'triangle');
        if(score>=c.bTarget){setTimeout(winScreen,280);return;}
        spawn(); break;
      }}
  });
  function frame(){
    ctx.clearRect(0,0,d.w,d.h);
    if(items.length<5&&Math.random()<.02)spawn();
    items.forEach(function(b){
      b.y-=b.s*1.7; b.x+=Math.sin(b.y/40)*.4;
      if(b.y<-b.r*2){b.y=d.h+b.r;b.x=30+Math.random()*(d.w-60);}
      ctx.beginPath(); ctx.ellipse(b.x,b.y,b.r*.85,b.r,0,0,6.3); ctx.fillStyle=b.c; ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x-b.r*.3,b.y-b.r*.35,b.r*.18,b.r*.26,-.4,0,6.3); ctx.fillStyle='rgba(255,255,255,.5)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(b.x,b.y+b.r); ctx.quadraticCurveTo(b.x+7,b.y+b.r+16,b.x,b.y+b.r+30);
      ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=2; ctx.stroke();
    });
    for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.x+=p.vx;p.y+=p.vy;p.l-=.04;
      if(p.l<=0){parts.splice(i,1);continue;}
      ctx.globalAlpha=p.l; ctx.beginPath(); ctx.arc(p.x,p.y,5,0,6.3); ctx.fillStyle=p.c; ctx.fill(); ctx.globalAlpha=1;}
    loop=requestAnimationFrame(frame);
  }
  frame();
}

function startFruit(){
  lastGame='fruit'; var el=gameLayer('اقطف الفاكهة'); var d=mkCanvas(el);
  var c=cfg(), score=0, bx=d.w/2, items=[], shake=0; setScore(0);
  var F=[{c:'#EF5B42',r:18},{c:'#F5A623',r:17},{c:'#8FB83E',r:16},{c:'#E8608F',r:17},{c:'#8A74E8',r:15}];
  function spawn(){var rock=c.fRocks&&Math.random()<.22;
    items.push({x:28+Math.random()*(d.w-56),y:-24,rock:rock,f:F[(Math.random()*F.length)|0],s:c.fSpeed*(.8+Math.random()*.6)});}
  function move(e){var p=canvasPt(e); bx=Math.max(40,Math.min(d.w-40,p.x));}
  canvas.addEventListener('pointerdown',move);
  canvas.addEventListener('pointermove',function(e){ if(e.buttons||e.pointerType==='touch') move(e); });
  function frame(){
    ctx.clearRect(0,0,d.w,d.h);
    if(Math.random()<.028)spawn();
    var by=d.h-60;
    for(var i=items.length-1;i>=0;i--){var it=items[i]; it.y+=it.s*2.1;
      if(it.y>by-20&&it.y<by+18&&Math.abs(it.x-bx)<46){
        items.splice(i,1);
        if(it.rock){shake=10;tone(180,.18,'sawtooth');}
        else{score++;setScore(score);tone(520+score*20,.12,'triangle');
          if(score>=c.fTarget){setTimeout(winScreen,260);return;}}
        continue;}
      if(it.y>d.h+30){items.splice(i,1);continue;}
      if(it.rock){ctx.beginPath();ctx.arc(it.x,it.y,15,0,6.3);ctx.fillStyle='#8B96A5';ctx.fill();}
      else{ctx.beginPath();ctx.arc(it.x,it.y,it.f.r,0,6.3);ctx.fillStyle=it.f.c;ctx.fill();
        ctx.beginPath();ctx.moveTo(it.x,it.y-it.f.r);ctx.lineTo(it.x+3,it.y-it.f.r-8);
        ctx.strokeStyle='#5A9A46';ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();}
    }
    var sx=shake>0?(Math.random()-.5)*7:0; if(shake>0)shake--;
    ctx.save(); ctx.translate(sx,0);
    ctx.beginPath(); ctx.moveTo(bx-46,by-16); ctx.lineTo(bx+46,by-16); ctx.lineTo(bx+34,by+22); ctx.lineTo(bx-34,by+22); ctx.closePath();
    ctx.fillStyle='#C98B5E'; ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.3)'; ctx.fillRect(bx-46,by-16,92,7);
    ctx.restore();
    loop=requestAnimationFrame(frame);
  }
  frame();
}

function startCar(){
  lastGame='car'; var el=gameLayer('العربية'); var d=mkCanvas(el);
  var c=cfg(), lanes=[d.w*.25,d.w*.5,d.w*.75], li=1, score=0, items=[], flash=0, road=0; setScore(0);
  function spawn(){items.push({l:(Math.random()*3)|0,y:-36,star:Math.random()<.58});}
  canvas.addEventListener('pointerdown',function(e){var p=canvasPt(e);
    if(p.x<d.w/2){li=Math.max(0,li-1);}else{li=Math.min(2,li+1);} tone(420,.07,'triangle');});
  function frame(){
    ctx.fillStyle='#55606E'; ctx.fillRect(0,0,d.w,d.h);
    ctx.fillStyle='#7A8794'; ctx.fillRect(0,0,d.w*.1,d.h); ctx.fillRect(d.w*.9,0,d.w*.1,d.h);
    road=(road+c.cSpeed*2)%44;
    ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=5; ctx.setLineDash([20,24]);
    [d.w*.375,d.w*.625].forEach(function(x){ctx.beginPath();ctx.moveTo(x,road-44);ctx.lineTo(x,d.h);ctx.stroke();});
    ctx.setLineDash([]);
    if(Math.random()<.026)spawn();
    var cy=d.h-90, cx=lanes[li];
    for(var i=items.length-1;i>=0;i--){var it=items[i]; it.y+=c.cSpeed*2.3; var ix=lanes[it.l];
      if(it.y>cy-38&&it.y<cy+38&&it.l===li){
        items.splice(i,1);
        if(it.star){score++;setScore(score);tone(620+score*18,.12,'triangle');
          if(score>=c.cTarget){setTimeout(winScreen,260);return;}}
        else{flash=12;tone(170,.2,'sawtooth');}
        continue;}
      if(it.y>d.h+40){items.splice(i,1);continue;}
      if(it.star){ctx.save();ctx.translate(ix,it.y);
        ctx.beginPath();for(var k=0;k<5;k++){var a=-Math.PI/2+k*2*Math.PI/5;
          ctx.lineTo(Math.cos(a)*17,Math.sin(a)*17);var b2=a+Math.PI/5;ctx.lineTo(Math.cos(b2)*8,Math.sin(b2)*8);}
        ctx.closePath();ctx.fillStyle='#F5D23A';ctx.fill();ctx.restore();}
      else{ctx.fillStyle='#E04A2E';rrect(ix-23,it.y-16,46,32,9);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(ix-18,it.y-4,36,6);}
    }
    if(flash>0){flash--;ctx.globalAlpha=flash%4<2?.5:1;}
    ctx.fillStyle='#3FA9E0'; rrect(cx-25,cy-34,50,68,14); ctx.fill();
    ctx.fillStyle='#CFEAF8'; rrect(cx-17,cy-23,34,20,7); ctx.fill();
    ctx.fillStyle='#22324F'; ctx.fillRect(cx-30,cy-20,7,16); ctx.fillRect(cx+23,cy-20,7,16);
    ctx.fillRect(cx-30,cy+12,7,16); ctx.fillRect(cx+23,cy+12,7,16);
    ctx.globalAlpha=1;
    loop=requestAnimationFrame(frame);
  }
  frame();
}

function newRound(){
  var pool=['circle','square','triangle','star','heart'].slice(0,cfg().shapes);
  var cols=['var(--sky)','var(--melon)','var(--grape)','var(--mint)','var(--sun)','var(--rose)'];
  var t=pool[(Math.random()*pool.length)|0], others=pool.filter(function(s){return s!==t;});
  var opts=[{kind:t,correct:true}];
  while(opts.length<3&&others.length)opts.push({kind:others.splice((Math.random()*others.length)|0,1)[0],correct:false});
  opts.sort(function(){return Math.random()-.5;});
  opts.forEach(function(o,i){o.color=cols[(i+((Math.random()*3)|0))%cols.length];});
  ui.gameTarget=t; ui.gameOpts=opts;
}
function startShapes(){ lastGame='shapes'; ui.gameRound=0; ui.gameScore=0; gameLayer('طابق الأشكال'); newRound(); renderShapes(); }
function renderShapes(){
  var el=document.getElementById('glayer'); if(!el)return;
  setScore(ui.gameScore);
  var w=el.querySelector('.shapes-wrap'); if(!w){w=document.createElement('div');w.className='shapes-wrap';el.appendChild(w);}
  if(ui.gameRound>=5){ setTimeout(winScreen,120); return; }
  w.innerHTML='<div class="target">'+shapeSvg(ui.gameTarget,'#CBD5E1',82)+'</div>'+
    '<p style="margin:0;font-weight:700;font-size:16px">هات الشكل اللي زيه</p>'+
    '<div class="opts">'+ui.gameOpts.map(function(o,i){return '<button class="opt" data-opt="'+i+'">'+shapeSvg(o.kind,o.color,52)+'</button>';}).join('')+'</div>';
}
function startMemory(){
  lastGame='memory'; var pairs=cfg().pairs||4; var el=gameLayer('الذاكرة');
  var kinds=['circle','square','triangle','star','heart','circle'];
  var cols=['var(--sky)','var(--melon)','var(--mint)','var(--sun)','var(--rose)','var(--grape)'];
  var cards=[]; for(var i=0;i<pairs;i++){cards.push({k:kinds[i],c:cols[i]},{k:kinds[i],c:cols[i]});}
  cards.sort(function(){return Math.random()-.5;});
  var grid=document.createElement('div'); grid.className='memgrid';
  grid.innerHTML=cards.map(function(c,i){return '<button class="mem" data-mem="'+i+'">؟</button>';}).join('');
  el.appendChild(grid);
  var open=[], done=0, lock=false; setScore(0);
  grid.addEventListener('click',function(e){
    var b=e.target.closest('.mem'); if(!b||lock)return;
    var i=+b.dataset.mem;
    if(b.classList.contains('open')||b.classList.contains('done'))return;
    b.classList.add('open'); b.innerHTML=shapeSvg(cards[i].k,cards[i].c,44); open.push(i); tone(520,.1,'triangle');
    if(open.length===2){
      lock=true; var a=open[0], c2=open[1];
      if(cards[a].k===cards[c2].k&&cards[a].c===cards[c2].c){
        setTimeout(function(){
          grid.querySelector('[data-mem="'+a+'"]').classList.add('done');
          grid.querySelector('[data-mem="'+c2+'"]').classList.add('done');
          done++; setScore(done); open=[]; lock=false; tone(700,.16);
          if(done===pairs)setTimeout(winScreen,380);
        },420);
      } else {
        setTimeout(function(){
          [a,c2].forEach(function(x){var e2=grid.querySelector('[data-mem="'+x+'"]');e2.classList.remove('open');e2.innerHTML='؟';});
          open=[]; lock=false;
        },700);
      }
    }
  });
}
function startGame(id){
  stopGame(); tone(560,.12,'triangle');
  if(id==='balloons')startBalloons();
  else if(id==='fruit')startFruit();
  else if(id==='car')startCar();
  else if(id==='shapes')startShapes();
  else if(id==='memory')startMemory();
}

/* ---------------- بوابة ولي الأمر ---------------- */
var pinBuf='', pinMode='open';
function openGate(mode){
  pinBuf=''; pinMode=mode||'open';
  var el=document.createElement('div'); el.className='gate'; el.id='gate';
  var keys=''; for(var i=1;i<=9;i++)keys+='<button class="key" data-key="'+i+'">'+ar(i)+'</button>';
  keys+='<button class="key ghost" data-key="x">⌫</button><button class="key" data-key="0">٠</button><button class="key ghost" data-key="c">✕</button>';
  el.innerHTML='<h3>'+(pinMode==='set'?'رقم سري جديد':'دخول ولي الأمر')+'</h3>'+
    '<p>'+(pinMode==='set'?'اكتب أربع أرقام جديدة':'اكتب الرقم السري عشان تفتح الإعدادات')+'</p>'+
    '<div class="pins" id="pins"><i></i><i></i><i></i><i></i></div><div class="err" id="pinErr"></div>'+
    '<div class="keypad">'+keys+'</div>';
  screenEl.appendChild(el);
}
function updatePins(){var p=document.getElementById('pins'); if(!p)return;
  Array.prototype.forEach.call(p.children,function(d,i){ if(i<pinBuf.length)d.classList.add('on'); else d.classList.remove('on'); });}
function pinKey(k){
  var err=document.getElementById('pinErr');
  if(k==='c'){closeLayer('gate'); if(pinMode==='set')openSettings(); return;}
  if(k==='x'){pinBuf=pinBuf.slice(0,-1);updatePins();return;}
  if(pinBuf.length>=4)return;
  pinBuf+=k; tone(600+pinBuf.length*60,.08,'triangle'); updatePins();
  if(pinBuf.length===4)setTimeout(function(){
    if(pinMode==='set'){ state.pin=pinBuf; savePrefs(); closeLayer('gate'); openSettings(); tone(700,.2); return; }
    if(pinBuf===state.pin){closeLayer('gate');openSettings();}
    else{pinBuf='';updatePins();if(err)err.textContent='الرقم غلط، جرّب تاني';tone(180,.22,'sawtooth');}
  },160);
}

/* ---------------- الإعدادات ---------------- */
function openSettings(){
  loadMedia();
  var el=document.createElement('div'); el.className='settings'; el.id='settings';
  el.innerHTML='<header><button class="rbtn" data-act="settings-close" style="background:#EDF1F7;width:36px;height:36px">'+iBack()+'</button><h3>إعدادات ولي الأمر</h3>'+iGear()+'</header><div class="body">'+
    (hasAccess?'':'<div class="warn">التطبيق محتاج إذن يقرا الملفات عشان يعرض الصور والفيديوهات.<br><br><button class="primary" data-act="ask-access" style="width:100%">افتح الإذن دلوقتي</button></div>')+
    '<div class="sgroup"><h4>الطفل</h4><div class="avatarrow"><span class="pic">'+(state.hasAvatar?avatarSvg(state.avatar):rakan('happy'))+'</span>'+
      '<div style="flex:1;min-width:0"><input class="field" id="childName" type="text" placeholder="اسم الطفل" value="'+state.childName+'">'+
      '<button class="primary" style="margin-top:9px;width:100%" data-act="open-studio">'+(state.hasAvatar?'غيّر الأفاتار':'اعمل أفاتار من صورة')+'</button></div></div></div>'+
    '<div class="sgroup"><h4>الفئة العمرية</h4><div class="seg">'+
      '<button data-age="2-3" aria-pressed="'+(state.age==='2-3')+'">٢ – ٣</button>'+
      '<button data-age="4-5" aria-pressed="'+(state.age==='4-5')+'">٤ – ٥</button>'+
      '<button data-age="6+" aria-pressed="'+(state.age==='6+')+'">٦ +</button></div>'+
      '<p class="note">الألعاب وصعوبتها ومستوى الحروف والأرقام بيتغيّروا لوحدهم على حسب الاختيار ده.</p></div>'+
    '<div class="sgroup"><h4>وقت اللعب في الجلسة</h4><div class="seg">'+
      '<button data-min="15" aria-pressed="'+(state.minutes===15)+'">١٥ د</button>'+
      '<button data-min="20" aria-pressed="'+(state.minutes===20)+'">٢٠ د</button>'+
      '<button data-min="30" aria-pressed="'+(state.minutes===30)+'">٣٠ د</button>'+
      '<button data-min="45" aria-pressed="'+(state.minutes===45)+'">٤٥ د</button></div>'+
      '<p class="note">لما الوقت يخلص، راكان بيقول للطفل إنه تعب وهينام والتطبيق بيقفل الشاشة.</p></div>'+
    '<div class="sgroup"><h4>المجلدات على الموبايل</h4>'+
      '<div class="path"><span>فيديوهات</span><code>'+folder('videos')+'</code><span>'+ar(videos.length)+'</span></div>'+
      '<div style="height:9px"></div>'+
      '<div class="path"><span>صور</span><code>'+folder('photos')+'</code><span>'+ar(photos.length)+'</span></div>'+
      '<button class="primary" style="width:100%;margin-top:10px;background:var(--mint)" data-act="rescan">أعد قراءة المجلدات</button>'+
      '<p class="note">حط أي صورة أو فيديو في المجلد ده وهيظهر للطفل على طول. ولو ظبّطت تطبيق مزامنة مع جوجل درايف على نفس المجلد، اللي ترفعه على درايف هينزل هنا لوحده.</p></div>'+
    '<div class="sgroup"><h4>الأقسام الظاهرة للطفل</h4><div class="toggles">'+APPS.map(function(a){
      return '<button class="tg" data-toggle="'+a.id+'" aria-pressed="'+(!state.hidden[a.id])+'"><span class="sw"></span><span class="nm">'+a.name+'</span></button>';}).join('')+'</div></div>'+
    '<div class="sgroup"><h4>عام</h4>'+
      '<button class="tg" data-toggle-mute aria-pressed="'+(!state.mute)+'"><span class="sw"></span><span class="nm">أصوات التطبيق</span></button>'+
      '<button class="primary" style="width:100%;margin-top:10px" data-act="change-pin">غيّر الرقم السري</button>'+
      '<button class="primary" style="width:100%;margin-top:9px;background:#8A94A6" data-act="pinning">إعدادات تثبيت الشاشة</button>'+
      '<p class="note">لو الخروج من التطبيق سهل، افتح «تثبيت الشاشة / Screen pinning» من إعدادات الأمان في الموبايل وفعّله.</p></div>'+
    '<button class="danger" data-act="exit-app">الخروج من التطبيق</button></div>';
  screenEl.appendChild(el);
}
function grabName(){var n=document.getElementById('childName'); if(n)state.childName=n.value.trim();}
function refreshSettings(){ grabName(); savePrefs(); closeLayer('settings'); openSettings(); render(); }

/* ---------------- الأفاتار ---------------- */
function openStudio(){
  var el=document.createElement('div'); el.className='studio'; el.id='studio';
  el.innerHTML='<header><button class="rbtn" data-act="studio-close" style="background:#EDF1F7;width:36px;height:36px">'+iBack()+'</button><h3>أفاتار الطفل</h3></header><div class="body">'+
    '<div class="bigavatar">'+avatarSvg(state.avatar)+'</div>'+
    '<button class="primary" style="width:100%" data-act="pick-face">اختار صورة لابنك</button>'+
    '<p class="note" style="margin:0;font-size:12.5px;color:var(--ink-soft);line-height:1.7;text-align:center">الصورة بتتحلل على الجهاز نفسه ومش بتتحفظ. اللي بيتحفظ هو شكل الأفاتار بس.</p>'+
    '<div class="sgroup"><h4>لون البشرة</h4><div class="swatches">'+SKIN.map(function(c,i){
      return '<button class="sw2" data-skin="'+i+'" style="background:'+c+'" aria-pressed="'+(state.avatar.skin===i)+'"></button>';}).join('')+'</div></div>'+
    '<div class="sgroup"><h4>لون الشعر</h4><div class="swatches">'+HAIRC.map(function(c,i){
      return '<button class="sw2" data-hc="'+i+'" style="background:'+c+'" aria-pressed="'+(state.avatar.hairColor===i)+'"></button>';}).join('')+'</div></div>'+
    '<div class="sgroup"><h4>الملامح</h4>'+
      ctrlRow('شكل الوش','face',FACES[state.avatar.face])+
      ctrlRow('الشعر','hair',HAIRS[state.avatar.hair])+
      ctrlRow('العيون','eyes',EYES[state.avatar.eyes])+
      ctrlRow('لون التيشرت','shirt',ar(state.avatar.shirt+1))+'</div>'+
    '<button class="primary" style="width:100%;background:var(--mint)" data-act="save-avatar">احفظ الأفاتار</button></div>';
  screenEl.appendChild(el);
}
function ctrlRow(label,key,val){
  return '<div class="ctrl"><span class="nm">'+label+'</span><button data-dec="'+key+'">‹</button>'+
    '<span class="val">'+val+'</span><button data-inc="'+key+'">›</button></div>';
}
var LIMITS={face:4,hair:6,eyes:4,shirt:6,skin:6,hairColor:6};
function bumpAvatar(key,dir){
  state.avatar[key]=(state.avatar[key]+dir+LIMITS[key])%LIMITS[key];
  tone(460,.07,'triangle'); closeLayer('studio'); openStudio();
}
function analyzeFace(file){
  var img=new Image(), url=URL.createObjectURL(file);
  img.onload=function(){
    try{
      var cv=document.createElement('canvas'); cv.width=64; cv.height=64;
      var cx=cv.getContext('2d'); cx.drawImage(img,0,0,64,64);
      var dd=cx.getImageData(0,0,64,64).data;
      function avg(x0,y0,x1,y1){var r=0,g=0,b=0,n=0;
        for(var y=y0;y<y1;y++)for(var x=x0;x<x1;x++){var i=(y*64+x)*4;r+=dd[i];g+=dd[i+1];b+=dd[i+2];n++;}
        return [r/n,g/n,b/n];}
      function nearest(c,pal){var best=0,bd=1e9;
        pal.forEach(function(hex,i){
          var R=parseInt(hex.substr(1,2),16),G=parseInt(hex.substr(3,2),16),Bv=parseInt(hex.substr(5,2),16);
          var q=(R-c[0])*(R-c[0])+(G-c[1])*(G-c[1])+(Bv-c[2])*(Bv-c[2]);
          if(q<bd){bd=q;best=i;}});
        return best;}
      state.avatar.skin=nearest(avg(22,34,42,50),SKIN);
      state.avatar.hairColor=nearest(avg(20,4,44,16),HAIRC);
    }catch(e){}
    URL.revokeObjectURL(url);
    state.hasAvatar=true; savePrefs();
    closeLayer('studio'); openStudio(); renderStatus(); tone(660,.2);
  };
  img.onerror=function(){URL.revokeObjectURL(url);};
  img.src=url;
}

function closeLayer(id){var el=document.getElementById(id); if(el)el.remove();}
function showTimeUp(hard){
  var el=document.createElement('div'); el.className='timeup'; el.id='timeup';
  el.innerHTML='<span class="rk bobbing">'+rakan('sleep')+'</span>'+
    '<p class="t">'+(hard?'خلاص كفاية النهارده يا حبيبي':'خلصنا الفيديوهات')+'</p>'+
    '<p class="s">'+(hard?'راكان تعب وهينام.<br>نكمّل بكرة إن شاء الله.':'مفيش فيديوهات تانية دلوقتي.')+'</p>'+
    (hard?'':'<button class="speak" style="background:#fff;color:var(--ink)" data-act="timeup-close">تمام</button>');
  screenEl.appendChild(el);
}

/* ---------------- التوجيه ---------------- */
function render(){
  hintSlot.innerHTML='';
  if(!ui.app){renderHome();renderStatus();return;}
  switch(ui.app){
    case 'letters':renderLetters();break;
    case 'numbers':renderNumbers();break;
    case 'photos':renderPhotos();break;
    case 'games':renderGamesHub();break;
    case 'manners':renderManners();break;
    case 'prayer':renderPrayer();break;
    case 'quran':renderQuran();break;
    case 'reels':renderReelsScreen();break;
  }
  renderStatus();
}
function openApp(id){
  tone(520,.12,'triangle');
  if(id==='photos'||id==='reels')loadMedia();
  ui.app=id; ui.picked=null; ui.surah=null; ui.reelIndex=0; render();
}
function goHome(){
  stopGame(); closeLayer('reelLayer'); closeLayer('viewer'); closeLayer('timeup');
  ui.app=null; ui.picked=null; tone(380,.1,'triangle'); render();
}
/* زرار الرجوع في أندرويد */
window.rakanBack=function(){
  if(document.getElementById('gate')){closeLayer('gate');return;}
  if(document.getElementById('studio')){closeLayer('studio');openSettings();return;}
  if(document.getElementById('settings')){grabName();savePrefs();closeLayer('settings');goHome();return;}
  if(document.getElementById('viewer')){closeLayer('viewer');return;}
  if(document.getElementById('glayer')){stopGame();ui.app='games';render();return;}
  if(ui.app)goHome();
};
window.onRakanPermissionResult=function(){ loadMedia(); if(document.getElementById('settings')){closeLayer('settings');openSettings();} };

/* ---------------- الأحداث ---------------- */
screenEl.addEventListener('click',function(e){
  var t=e.target.closest('button,.row'); if(!t)return;
  if(t.dataset.app){openApp(t.dataset.app);return;}
  if(t.dataset.game){startGame(t.dataset.game);return;}
  var act=t.dataset.act;

  if(act==='hide-hint'){state.hintShown=true;savePrefs();hintSlot.innerHTML='';return;}
  if(act==='home'){goHome();return;}
  if(act==='game-exit'){stopGame();ui.app='games';render();return;}
  if(act==='win-again'){closeLayer('timeup');startGame(lastGame);return;}
  if(act==='win-home'){closeLayer('timeup');ui.app='games';render();return;}
  if(act==='say'){tone(440,.3);return;}

  if(t.dataset.lang){ui.lang=t.dataset.lang;render();return;}
  if(t.dataset.letter!==undefined){var s=ui.lang==='ar'?AR_L:EN_L;ui.picked=s[+t.dataset.letter];
    tone(400+(+t.dataset.letter)*18,.26);render();return;}
  if(t.dataset.num!==undefined){ui.picked=+t.dataset.num;tone(380+(+t.dataset.num)*40,.26);render();return;}
  if(act==='again'){tone(520,.26);return;}
  if(act==='back-grid'){ui.picked=null;render();return;}

  if(t.dataset.photo!==undefined){ui.photoIndex=+t.dataset.photo;tone(560,.1,'triangle');openViewer();return;}
  if(act==='ph-close'){closeLayer('viewer');return;}
  if(act==='ph-next'||act==='ph-prev'){var d1=act==='ph-next'?1:-1;
    ui.photoIndex=(ui.photoIndex+d1+photos.length)%photos.length;
    closeLayer('viewer');openViewer();tone(500,.08,'triangle');return;}

  if(act==='reel-next'){nextReel(1);return;}
  if(act==='reel-prev'){nextReel(-1);return;}
  if(act==='reel-play'){var v=document.getElementById('reelVideo'); if(v){v.play();} return;}
  if(act==='timeup-close'){closeLayer('timeup');goHome();return;}

  if(t.dataset.opt!==undefined){
    var o=ui.gameOpts[+t.dataset.opt];
    if(o.correct){t.classList.add('ok');tone(700,.18);ui.gameScore++;ui.gameRound++;
      setTimeout(function(){if(ui.gameRound<5)newRound();renderShapes();},420);}
    else{t.classList.add('no');tone(200,.2,'sawtooth');}
    return;}

  if(act==='manner-next'||act==='manner-prev'){var m=act==='manner-next'?1:-1;
    ui.mannerIndex=(ui.mannerIndex+m+MANNERS.length)%MANNERS.length;tone(460,.1,'triangle');render();return;}
  if(act==='pray-next'||act==='pray-prev'){var p2=act==='pray-next'?1:-1;
    ui.prayerStep=Math.min(PRAYER.length-1,Math.max(0,ui.prayerStep+p2));tone(460,.1,'triangle');render();return;}
  if(t.dataset.surah!==undefined){ui.surah=+t.dataset.surah;tone(500,.14);render();return;}
  if(act==='quran-back'){ui.surah=null;render();return;}

  if(t.dataset.key){pinKey(t.dataset.key);return;}
  if(act==='settings-close'){grabName();savePrefs();closeLayer('settings');goHome();return;}
  if(t.dataset.age){state.age=t.dataset.age;refreshSettings();return;}
  if(t.dataset.min){state.minutes=+t.dataset.min;sessionStart=Date.now();timeUpShown=false;refreshSettings();return;}
  if(t.dataset.toggle){var id=t.dataset.toggle;
    if(!state.hidden[id]&&visibleApps().length<=2){tone(200,.18,'sawtooth');return;}
    state.hidden[id]=!state.hidden[id];refreshSettings();return;}
  if(t.hasAttribute('data-toggle-mute')){state.mute=!state.mute;refreshSettings();return;}
  if(act==='rescan'){refreshSettings();tone(640,.16);return;}
  if(act==='ask-access'){ if(B){try{B.requestAllFilesAccess();}catch(e){}} return; }
  if(act==='pinning'){ if(B){try{B.openPinningSettings();}catch(e){}} return; }
  if(act==='change-pin'){grabName();savePrefs();closeLayer('settings');openGate('set');return;}
  if(act==='open-studio'){grabName();savePrefs();closeLayer('settings');openStudio();return;}

  if(act==='studio-close'){closeLayer('studio');openSettings();return;}
  if(act==='pick-face'){fileFace.click();return;}
  if(act==='save-avatar'){state.hasAvatar=true;savePrefs();closeLayer('studio');openSettings();renderStatus();tone(680,.2);return;}
  if(t.dataset.skin!==undefined){state.avatar.skin=+t.dataset.skin;closeLayer('studio');openStudio();tone(500,.08,'triangle');return;}
  if(t.dataset.hc!==undefined){state.avatar.hairColor=+t.dataset.hc;closeLayer('studio');openStudio();tone(500,.08,'triangle');return;}
  if(t.dataset.inc){bumpAvatar(t.dataset.inc,1);return;}
  if(t.dataset.dec){bumpAvatar(t.dataset.dec,-1);return;}

  if(act==='exit-app'){
    grabName(); savePrefs();
    if(B){try{B.exitApp();return;}catch(e){}}
    closeLayer('settings'); goHome(); return;}
});

fileFace.addEventListener('change',function(){
  if(fileFace.files&&fileFace.files[0])analyzeFace(fileFace.files[0]);
  fileFace.value='';
});

/* الضغط المطوّل على اللوجو */
var holdTimer=null, holdRaf=null;
function startHold(e){
  e.preventDefault(); brand.classList.add('holding');
  var t0=performance.now();
  (function step(){
    var p=Math.min(1,(performance.now()-t0)/1200);
    if(ringPath)ringPath.setAttribute('stroke-dashoffset',String(272*(1-p)));
    if(p<1)holdRaf=requestAnimationFrame(step);
  })();
  holdTimer=setTimeout(function(){
    endHold(); tone(300,.16,'triangle');
    state.hintShown=true; savePrefs();
    if(!document.getElementById('gate')&&!document.getElementById('settings'))openGate('open');
  },1200);
}
function endHold(){
  brand.classList.remove('holding');
  if(ringPath)ringPath.setAttribute('stroke-dashoffset','272');
  if(holdTimer){clearTimeout(holdTimer);holdTimer=null;}
  if(holdRaf){cancelAnimationFrame(holdRaf);holdRaf=null;}
}
brand.addEventListener('pointerdown',startHold);
['pointerup','pointerleave','pointercancel'].forEach(function(ev){brand.addEventListener(ev,endHold);});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
document.addEventListener('gesturestart',function(e){e.preventDefault();});

/* ---------------- البداية ---------------- */
loadPrefs();
loadMedia();
render();
})();
