/* ============================================================================
   JAMAICA BURGUER DELIVERY — aplicativo oficial  ·  App do Cliente + App do Dono
   Um só sistema, dois apps. Estado compartilhado (localStorage).
   v3 — responsivo (desktop/mobile), sem emojis (ícones SVG), sem combos (promoções no admin)
   ============================================================================ */
'use strict';
var LSKEY = 'jamaica_burguer_v7';           // estado compartilhado (loja, cardápio, pedidos, clientes)
var MEKEY = 'jamaica_burguer_me';           // perfil do cliente (local, não sincroniza entre cliente/dono)
var APP_MODE = (typeof window!=='undefined' && window.DM_APP==='admin') ? 'admin' : 'cliente';
var REVKEY = 'jamaica_burguer_rev';          // token de versão: muda a cada gravação, pra detectar mudança de outra aba/PWA
var CARTKEY = 'jamaica_burguer_cart';        // carrinho do cliente (local, sobrevive ao recarregar)
var ADMKEY = 'jamaica_burguer_adm';          // sessão do painel do dono (fica 24h no aparelho pra não deslogar toda hora)
var CHKKEY = 'jamaica_burguer_chk';          // estado do checkout (retomar na mesma tela se o app recarregar ao voltar do WhatsApp)
var lastRev = null;
var bc = null; try{ if(typeof BroadcastChannel!=='undefined') bc = new BroadcastChannel('jamaica_burguer'); }catch(e){ bc=null; }
/* ===== Sincronização na nuvem (Supabase) — cross-device (celular <-> computador) ===== */
var SUPA_URL = '';
var SUPA_KEY = '';
var CLOUD = !!(SUPA_URL && SUPA_KEY && typeof window!=='undefined' && window.supabase);
var sb = CLOUD ? window.supabase.createClient(SUPA_URL, SUPA_KEY) : null;
// modo vitrine: abrir com ?preview=1 mostra o cardápio do código (seed) SEM tocar na nuvem nem no site real
var PREVIEW = (typeof location!=='undefined') && /[?&]preview=1/.test((location.search||''));
var PERMITIR_PEDIDO_SEMPRE = false; // trava de horário ATIVA (uso oficial): cliente só finaliza dentro do expediente.
var $  = function(id){ return document.getElementById(id); };
var esc = function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
var money = function(v){ return 'R$ ' + (Number(v)||0).toFixed(2).replace('.', ','); };
var uid = function(p){ return (p||'id') + Math.random().toString(36).slice(2,8); };
function nowHM(){ var d=new Date(); return (''+d.getHours()).padStart(2,'0')+':'+(''+d.getMinutes()).padStart(2,'0'); }
function hoje(){ var d=new Date(); return d.toLocaleDateString('pt-BR'); }
function maskTel(t){ t=String(t||''); if(t.length<8) return t; return t.slice(0,-4).replace(/\d/g,'•')+t.slice(-4); }

/* ============================ ÍCONES (SVG, sem emoji) ============================ */
var IC={
  cardapio:'<path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5"/>',
  receipt:'<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  trash:'<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  checkc:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  printer:'<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
  chart:'<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M22 21v-1a5 5 0 0 0-4-4.9"/>',
  tag:'<path d="M20 12.5 12.5 20a1.7 1.7 0 0 1-2.4 0L3 12.9V4a1 1 0 0 1 1-1h8.9l7.1 7.1a1.7 1.7 0 0 1 0 2.4Z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  pix:'<path d="M12 3 3 12l9 9 9-9-9-9Z"/><path d="M8 12h8M12 8v8" opacity=".5"/>',
  cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  delivery:'<circle cx="5.5" cy="17" r="2.8"/><circle cx="18.5" cy="17" r="2.8"/><path d="M8.3 17h4.9l3.4-6.4"/><path d="M13.1 10.6 11.8 7.9H9.3"/><path d="M5.5 17 7.7 10.6H11.4"/><path d="M15.4 10.6H19"/>',
  store:'<path d="M3 9 4.5 4h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-5h6v5"/>',
  pin:'<path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  camera:'<path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z"/><circle cx="12" cy="13" r="3.5"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  warn:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  box:'<path d="m21 8-9-5-9 5v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  star:'<path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 18.6 6.2 21.8l1.1-6.4L2.6 9.8l6.5-.9Z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9 2 2 0 1 1-2.3 3.2 1.7 1.7 0 0 0-2.7 1V21a2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.7-1 2 2 0 1 1-2.3-3.2 1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9 2 2 0 1 1 2.3-3.2 1.7 1.7 0 0 0 2.7-1V3a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.7 1 2 2 0 1 1 2.3 3.2 1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.6 1Z"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  percent:'<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2"/><circle cx="16.5" cy="16.5" r="2"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"/><path d="M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5"/><path d="M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
  paint:'<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.5-.8 1.5-1.5 0-.4-.2-.8-.5-1a1.5 1.5 0 0 1 1-2.5H16a4 4 0 0 0 4-4 8 8 0 0 0-8-9Z"/>',
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  attach:'<path d="M21 8 12 17a4 4 0 0 1-6-6l8-8a2.5 2.5 0 0 1 4 4l-8 8a1 1 0 0 1-2-2l7-7"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  dot:'<circle cx="12" cy="12" r="4"/>'
};
function ic(name,cls){ return '<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(IC[name]||'')+'</svg>'; }

/* glyphs de categoria (placeholder de foto) */
var GLYPH={
  espetinhos:'<path d="M4 20 20 4"/><circle cx="8.5" cy="13" r="2.4"/><circle cx="12.5" cy="9" r="2.4"/>',
  lanches:'<path d="M4 9a8 8 0 0 1 16 0Z"/><rect x="3" y="12" width="18" height="3" rx="1.5"/><path d="M5 18h14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/>',
  porcoes:'<path d="M7 8h10l-1 12H8Z"/><path d="M9.5 8V4M12 8V3M14.5 8V5"/>',
  bebidas:'<path d="M7 4h10l-1.4 16a1 1 0 0 1-1 .9H9.4a1 1 0 0 1-1-.9Z"/><path d="M7 9h10"/>',
  sobremesas:'<path d="M6 12h12l-1.4 8H7.4Z"/><path d="M7 12a5 5 0 0 1 10 0"/><path d="M12 4v3"/>',
  _def:'<path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'
};
GLYPH.espetos=GLYPH.espetinhos; GLYPH.acomp=GLYPH.porcoes; GLYPH.acai=GLYPH.sobremesas; GLYPH.bebida=GLYPH.bebidas;
function catGlyph(id){ return GLYPH[id]||GLYPH._def; }
function phG(glyph, hue){
  hue = hue==null?28:hue;
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220">'+
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'+
    '<stop offset="0" stop-color="hsl('+hue+',46%,26%)"/><stop offset="1" stop-color="hsl('+((hue+22)%360)+',56%,13%)"/></linearGradient></defs>'+
    '<rect width="220" height="220" fill="url(#g)"/>'+
    '<g transform="translate(62,62) scale(4)" fill="none" stroke="rgba(255,248,238,.92)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+glyph+'</g></svg>';
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}
function prodImg(p){ return p.foto ? p.foto : phG(catGlyph(p.cat), p.hue==null?28:p.hue); }
function itemImg(it){ return it.foto ? it.foto : phG(catGlyph(it.cat), it.hue==null?28:it.hue); }

/* QR falso (só visual) */
function fakeQR(){
  var n=21, cell=6, s='', seed=7;
  function rnd(){ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }
  for(var y=0;y<n;y++)for(var x=0;x<n;x++){
    var finder=(x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7);
    var on = finder ? (x===0||x===6||y===0||y===6||(x>=2&&x<=4&&y>=2&&y<=4)) : rnd()>0.5;
    if(on) s+='<rect x="'+(x*cell)+'" y="'+(y*cell)+'" width="'+cell+'" height="'+cell+'"/>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(n*cell)+' '+(n*cell)+'" fill="#171313">'+s+'</svg>';
}

/* ============================ ESTADO / SEED ============================ */
var S, UI, seedCounter=100;
function seed(){
  var H={hamburguer:25,frango:40,especiais:32,porcoes:45,bebida:205};
  // Adicionais (aparecem no popup ao expandir o lanche) — PREÇOS A CONFIRMAR com o Eduardo
  var ADIC=[{nome:'Bacon',preco:4},{nome:'Cheddar',preco:4},{nome:'Queijo mussarela',preco:3},{nome:'Ovo',preco:3},{nome:'Catupiry',preco:4},{nome:'Calabresa',preco:5},{nome:'Cebola caramelizada',preco:3},{nome:'Batata palha',preco:2}];
  var produtos=[], pid=0;
  function novo(o){ pid++; return Object.assign({id:'p'+pid,desc:'',foto:null,disp:'disponivel',ordem:pid-1,variacoes:[],grupos:[]},o); }
  function lanche(nome,preco,cat,hue,desc){ produtos.push(novo({nome:nome,preco:preco,cat:cat,hue:hue,desc:desc,grupos:[{nome:'Adicionais',max:0,itens:ADIC.slice()}]})); }
  // Hambúrgueres (carne)
  lanche('X-Jamaica',34.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer artesanal 180g, presunto, queijo mussarela, bacon, alface, tomate e maionese da casa.');
  lanche('X-Tudo',22.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, presunto, mussarela, bacon, alface, tomate, cebola roxa, milho, ervilha, batata palha e maionese da casa.');
  lanche('X-Egg Cheddar',22.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, cheddar, bacon, ovo, alface e tomate.');
  lanche('X-Nega Burguer',19.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, mussarela, bacon, alface, tomate, cebola roxa e maionese da casa.');
  lanche('X-Bacon',19.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, cheddar, bacon, alface, tomate e maionese da casa.');
  lanche('X-Salada',14.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, mussarela, alface, tomate e maionese da casa.');
  lanche('X-Calabresa',14.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, calabresa, mussarela, ovo, tomate e alface.'); // PREÇO A CONFIRMAR (etiqueta cortada na foto)
  lanche('X-Vegetariano',11.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer de grão de bico, mussarela, alface, tomate e maionese da casa.');
  lanche('X-Burguer',9.99,'hamburguer',H.hamburguer,'Pão brioche, hambúrguer 180g, mussarela, alface, tomate e maionese da casa.');
  // Frango
  lanche('Frango com Bacon',24.99,'frango',H.frango,'Pão brioche, filé de frango empanado, bacon, mussarela, alface, tomate e maionese da casa.');
  lanche('Frango com Calabresa',24.99,'frango',H.frango,'Pão brioche, filé de frango empanado, calabresa, mussarela e maionese da casa.');
  lanche('X-Egg Frango',18.99,'frango',H.frango,'Pão brioche, filé de frango empanado, mussarela, ovo, alface, tomate e maionese da casa.');
  // Especiais
  lanche('Sanduíche Especial',7.99,'especiais',H.especiais,'Pão brioche, hambúrguer 180g, mussarela, bacon, ovo, presunto, alface, tomate e maionese da casa.');
  lanche('Lanche Especial',6.99,'especiais',H.especiais,'Pão, salsicha, queijo, presunto, repolho e batata palha.');
  // Porções (PREÇOS A CONFIRMAR)
  produtos.push(novo({nome:'Batata Frita',preco:15,cat:'porcoes',hue:H.porcoes,desc:'Porção de batata frita crocante.'}));
  produtos.push(novo({nome:'Batata c/ Cheddar e Bacon',preco:22,cat:'porcoes',hue:H.porcoes,desc:'Batata frita com cheddar cremoso e bacon.'}));
  // Bebidas (PREÇOS A CONFIRMAR)
  [['Coca-Cola Lata',6,'Lata 350ml gelada.'],['Coca-Cola 1L',10,'Garrafa 1 litro gelada.'],['Guaraná Lata',6,'Lata 350ml gelada.'],['Guaraná 1L',10,'Garrafa 1 litro gelada.'],['Suco Natural 300ml',8,'Suco natural gelado.'],['Água Mineral',3,'Garrafa 500ml.']].forEach(function(r){
    produtos.push(novo({nome:r[0],preco:r[1],cat:'bebida',hue:H.bebida,desc:r[2]})); });
  var categorias = [
    {id:'hamburguer',nome:'Hambúrgueres',ordem:1,oculta:false},
    {id:'frango',nome:'Frango',ordem:2,oculta:false},
    {id:'especiais',nome:'Especiais',ordem:3,oculta:false},
    {id:'porcoes',nome:'Porções',ordem:4,oculta:false},
    {id:'bebida',nome:'Bebidas',ordem:5,oculta:false}
  ];
  S = {
    loja:{ nome:'Jamaica Burguer', pausado:false, janelas:[['18:00','23:59']], horario:'Todo dia · 18h à meia-noite',
      endereco:'Av. Getúlio Vargas - Centro, Breu Branco - PA', whats:'(94) 99215-4465',
      instagram:'@jamaica_burguer',
      pixKey:'06240421200', pixNome:'Eduardo Santos de Amorim', pixCidade:'BREU BRANCO', banner:'',
      taxaEntrega:3, prazoEntrega:'30-45 min', cupomAtivo:false,
      minPedido:0, retirada:true, aceitaPix:true, aceitaDinheiro:true, aceitaCartao:true },
    categorias:categorias, produtos:produtos, bairros:[],
    promos:[ {id:uid('promo'), titulo:'X-Jamaica', desc:'O carro-chefe: 180g, presunto, mussarela, bacon, salada e maionese da casa.', preco:34.99, ativo:true} ],
    pedidos:[], clientes:[], equipe:[{user:'jamaica',nome:'Jamaica Burguer',papel:'admin'},{user:'atendente',nome:'Atendente',papel:'atendente'}],
    audit:[]
  };
  seedOrder({tel:'(94) 99999-1234',nome:'Mariana Silva',tipo:'delivery',bairro:'Centro',end:'Rua das Palmeiras, 42',ref:'Portão azul',
    itens:[['p1',1,''],['p17',1,'']], pay:'pix', status:'em_validacao', min:15});
  seedOrder({tel:'(94) 98888-7766',nome:'Pedro Almeida',tipo:'retirada',
    itens:[['p9',1,''],['p15',1,'']], pay:'dinheiro', troco:'50', status:'aguardando_aceite', min:8});
  seedOrder({tel:'(94) 97777-3322',nome:'Juliana Costa',tipo:'delivery',bairro:'São José',end:'Rua 7 de Setembro, 210',ref:'Perto do mercado',
    itens:[['p5',2,'']], pay:'cartao', status:'concluido', min:70});
}
function seedOrder(o){
  var itens=o.itens.map(function(it){ var p=prod(it[0]); var varNome=it[3]||'', adics=it[4]||[];
    var base=p.preco, inclui=[];
    if(varNome && p.variacoes){ var v=p.variacoes.filter(function(x){return x.nome===varNome;})[0]; if(v){ base=v.preco; inclui=v.inclui||[]; } }
    var unit=base+adics.reduce(function(a,x){return a+x.preco*(x.qty||1);},0);
    return {prodId:p.id,nome:p.nome,cat:p.cat,hue:p.hue,foto:p.foto,base:base,varNome:varNome,inclui:inclui,adics:adics,qty:it[1],obs:it[2]||'',preco:unit};
  });
  var subtotal=itens.reduce(function(a,i){return a+i.preco*i.qty;},0);
  var taxa=o.tipo==='delivery'?3:0;
  var d=new Date(Date.now()-(o.min||10)*60000);
  var payMap={pix:'Pix com comprovante',dinheiro:'Dinheiro no local',cartao:'Cartão no local'};
  var tt=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  var ped={ id:'#'+(++seedCounter), tel:o.tel, nome:o.nome, tipo:o.tipo,
    bairro:o.bairro||'', end:o.end||'', ref:o.ref||'', comp:'', entregaSobConsulta:false,
    itens:itens, subtotal:subtotal, taxa:taxa, total:subtotal+taxa, obs:'',
    pay:{ metodo:o.pay, label:payMap[o.pay], status:o.pay==='pix'?(o.status==='concluido'?'aprovado':'enviado'):'pendente',
      comprovante:o.pay==='pix'?phG(GLYPH._def,140):null, troco:o.troco||'' },
    status:o.status, criadoEm:tt, dia:d.toLocaleDateString('pt-BR'), ts:d.getTime(),
    historico:[{t:tt,who:'Cliente',act:'Pedido criado'}], reimpressoes:0 };
  S.pedidos.unshift(ped);
  upsertCliente(o.tel,o.nome,o.end?{bairro:o.bairro,end:o.end}:null);
}

/* persistência */
function persistLocal(){ if(APP_MODE==='admin') return; try{ localStorage.setItem(MEKEY, JSON.stringify(UI.me)); localStorage.setItem(CARTKEY, JSON.stringify(UI.cart)); }catch(e){} }
var CHECKOUT_SCREENS=['carrinho','receber','endereco','dados','pagamento'];
// salva o passo do checkout (endereço, forma de pagamento, "já abriu o WhatsApp") pra retomar na mesma tela se o app recarregar
function persistChk(){
  if(APP_MODE==='admin') return;
  try{
    if(UI.cart.length && CHECKOUT_SCREENS.indexOf(UI.cli.screen)>=0){
      var ck=Object.assign({},UI.chk); ck.comprov=null;   // não guarda a imagem do comprovante (pode ser grande) — re-anexa se recarregar
      localStorage.setItem(CHKKEY, JSON.stringify({chk:ck, screen:UI.cli.screen, t:Date.now()}));
    } else { localStorage.removeItem(CHKKEY); }
  }catch(e){}
}
function restoreChk(){
  if(APP_MODE==='admin') return;
  try{
    var raw=localStorage.getItem(CHKKEY); if(!raw) return;
    var d=JSON.parse(raw); if(!d||!d.chk){ localStorage.removeItem(CHKKEY); return; }
    if(!UI.cart.length || CHECKOUT_SCREENS.indexOf(d.screen)<0 || (d.t && Date.now()-d.t > 6*60*60*1000)){ localStorage.removeItem(CHKKEY); return; } // sem sacola ou sessão velha (6h)
    UI.chk=Object.assign(UI.chk, d.chk);
    UI.cli.screen=d.screen;
  }catch(e){}
}
function saveCliente(){ persistLocal(); if(CLOUD) cloudCliUpsert(); }   // salva perfil + carrinho do cliente (local + conta na nuvem)
function save(){ if(PREVIEW) return; try{ localStorage.setItem(LSKEY, JSON.stringify(S)); persistLocal(); if(CLOUD) cloudPush(); else marcarRev(); }catch(e){} }

/* ---- conta do cliente (login por WhatsApp, tabela 'clientes' no Supabase) ---- */
function normWhats(t){ return String(t||'').replace(/\D/g,''); }
function normNome(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,' ').normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function estaLogado(){ return !!(typeof UI!=='undefined' && UI.me && telValido(UI.me.tel) && (UI.me.nome||'').trim()); }
function cloudCliGet(whats){ if(!sb) return Promise.resolve(null); return sb.from('clientes').select('*').eq('whats',whats).maybeSingle().then(function(r){ return (r&&r.data)?r.data:null; }).catch(function(){ return null; }); }
function cloudCliUpsert(){ if(!sb) return; var w=normWhats(UI.me&&UI.me.tel); if(!w) return; sb.from('clientes').upsert({whats:w,nome:UI.me.nome||'',foto:UI.me.foto||null,enderecos:UI.me.enderecos||[],updated_at:new Date().toISOString()},{onConflict:'whats'}).then(function(r){ if(r&&r.error) console.warn('DM cli upsert:',r.error.message); }); }
function refreshCliente(){
  if(!CLOUD||!estaLogado()) return;
  cloudCliGet(normWhats(UI.me.tel)).then(function(cli){
    if(!cli){ cloudCliUpsert(); return; }   // conta ainda nao existe na tabela -> cria a partir do local
    var ae=(typeof document!=='undefined')&&document.activeElement;
    if(ae&&ae.tagName&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return; // nao atrapalha quem digita
    if(Array.isArray(cli.enderecos)) UI.me.enderecos=cli.enderecos;
    if(cli.foto) UI.me.foto=cli.foto;
    if(cli.nome && !(UI.me.nome||'').trim()) UI.me.nome=cli.nome;
    persistLocal(); render();
  });
}
function marcarRev(){ try{ lastRev=String(Date.now())+'-'+Math.floor(Math.random()*1e6); localStorage.setItem(REVKEY,lastRev); if(bc){ try{ bc.postMessage(lastRev); }catch(e){} } }catch(e){} }
function reloadShared(){ if(PREVIEW) return false; try{ var raw=localStorage.getItem(LSKEY); if(raw){ var s=JSON.parse(raw); if(s&&s.produtos){ S=s; if(!S.promos)S.promos=[]; return true; } } }catch(e){} return false; }
function syncCheck(){
  var ae=(typeof document!=='undefined')&&document.activeElement;
  if(ae && ae.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return; // não interrompe quem está digitando
  var rev; try{ rev=localStorage.getItem(REVKEY); }catch(e){ return; }
  if(rev && rev!==lastRev){ lastRev=rev; if(reloadShared()) render(); }
}
function load(){
  var had=false;
  if(!PREVIEW){ try{ var raw=localStorage.getItem(LSKEY); if(raw){ var s=JSON.parse(raw); if(s&&s.produtos){ S=s; if(!S.promos)S.promos=[]; had=true; } } }catch(e){} }
  try{ var m=localStorage.getItem(MEKEY); if(m){ var mm=JSON.parse(m); if(mm&&typeof mm==='object') UI.me=mm; } }catch(e){}
  if(APP_MODE!=='admin'){ try{ var ck=localStorage.getItem(CARTKEY); if(ck){ var ct=JSON.parse(ck); if(Array.isArray(ct)) UI.cart=ct; } }catch(e){} }
  return had;
}

/* lookups */
function prod(id){ for(var i=0;i<S.produtos.length;i++) if(S.produtos[i].id===id) return S.produtos[i]; return null; }
function order(id){ for(var i=0;i<S.pedidos.length;i++) if(S.pedidos[i].id===id) return S.pedidos[i]; return null; }
function bairro(n){ for(var i=0;i<S.bairros.length;i++) if(S.bairros[i].nome===n) return S.bairros[i]; return null; }
function cat(id){ return S.categorias.filter(function(x){return x.id===id;})[0]; }
function catNome(id){ var c=cat(id); return c?c.nome:id; }
function catsOrd(){ return S.categorias.slice().sort(function(a,b){return a.ordem-b.ordem;}); }
function audit(act,target){ S.audit.unshift({t:nowHM(),who:UI.adm.user?UI.adm.user.nome:'Sistema',act:act,target:target||''}); if(S.audit.length>60)S.audit.pop(); }
function upsertCliente(tel,nome,addr){
  var c=S.clientes.filter(function(x){return x.tel===tel;})[0];
  if(!c){ c={id:uid('c'),tel:tel,nome:nome,enderecos:[],criadoEm:hoje(),bloq:false,obsInterna:''}; S.clientes.push(c); }
  if(nome) c.nome=nome;
  if(addr&&addr.end){ var ex=c.enderecos.filter(function(e){return e.end===addr.end;})[0]; if(!ex) c.enderecos.push(addr); }
  return c;
}
function clienteStats(tel){
  var ps=S.pedidos.filter(function(p){return p.tel===tel;});
  var concl=ps.filter(function(p){return p.status==='concluido';});
  var gasto=concl.reduce(function(a,p){return a+p.total;},0);
  return {total:ps.length, concl:concl.length, gasto:gasto, ticket:concl.length?gasto/concl.length:0, ultimo:ps[0]};
}
function isAdmin(){ return UI.adm.user && UI.adm.user.papel==='admin'; }
function telValido(t){ return String(t||'').replace(/\D/g,'').length>=10; }

/* ---- horário de funcionamento (aberto/fechado automático, fuso de Breu Branco/PA) ---- */
var DEFAULT_JANELAS=[['11:00','14:00'],['18:00','23:00']];
function hm(s){ var p=String(s||'0:0').split(':'); return (parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0); }
function janelasLoja(){ var j=S.loja&&S.loja.janelas; return (j&&j.length)?j:DEFAULT_JANELAS; }
function agoraMinLoja(){
  try{
    var s=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Belem',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
    var p=s.split(':'); return (parseInt(p[0],10)||0)*60+(parseInt(p[1],10)||0);
  }catch(e){ var d=new Date(); return d.getHours()*60+d.getMinutes(); }
}
function lojaAberta(){
  if(PERMITIR_PEDIDO_SEMPRE && (typeof APP_MODE==='undefined' || APP_MODE!=='admin')) return true; // teste: cliente sempre pode pedir
  var l=S.loja||{};
  if(l.pausado) return false;
  var m=agoraMinLoja(), js=janelasLoja();
  for(var i=0;i<js.length;i++){ var a=hm(js[i][0]), b=hm(js[i][1]);
    if(a<=b){ if(m>=a&&m<b) return true; } else { if(m>=a||m<b) return true; } }
  return false;
}
function fmtHora(s){ var p=String(s).split(':'); var mm=p[1]||'00'; return mm==='00'?(parseInt(p[0],10)+'h'):(parseInt(p[0],10)+'h'+mm); }
function fmtJanelas(js){ js=js||janelasLoja(); return 'Seg a Dom · '+js.map(function(w){return fmtHora(w[0])+'-'+fmtHora(w[1]);}).join(' e '); }
var _lastOpen=null;
function clockWatch(){ try{ var o=lojaAberta(); if(_lastOpen===null){ _lastOpen=o; } else if(o!==_lastOpen){ _lastOpen=o; render(); } }catch(e){} }
function descontoValor(sub){ return UI.cupom&&UI.cupom.pct ? Math.round(sub*UI.cupom.pct*100)/100 : 0; }
function waLink(tel,msg){ return 'https://wa.me/55'+String(tel).replace(/\D/g,'')+(msg?'?text='+encodeURIComponent(msg):''); }
var FEIJOES=['Feijão tropeiro','Feijão de caldo'];
var SABORES_REFRI=['Coca-cola','Guaraná'];
var SABORES_SUCO=['Acerola','Maracujá','Laranja'];
function trocoInfo(o){
  var t=parseFloat(String((o&&o.pay&&o.pay.troco)||'').replace(',','.'))||0;
  var dev=(t>0 && t>=(o.total||0)) ? (t-(o.total||0)) : 0;
  return { para:t, dev:dev };
}
/* ---- Pix EMV (BR Code) REAL: chave do Denis + valor exato do carrinho ---- */
function pixTLV(id,v){ v=String(v); return id+('00'+v.length).slice(-2)+v; }
function pixNorm(s,max){ return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').toUpperCase().trim().slice(0,max||25); }
function pixCRC16(str){ var c=0xFFFF; for(var i=0;i<str.length;i++){ c^=str.charCodeAt(i)<<8; for(var j=0;j<8;j++){ c=(c&0x8000)?((c<<1)^0x1021):(c<<1); c&=0xFFFF; } } return ('000'+c.toString(16).toUpperCase()).slice(-4); }
function pixPayload(key,nome,cidade,valor){
  key=String(key||'').replace(/\s/g,'');
  var mai=pixTLV('26', pixTLV('00','br.gov.bcb.pix')+pixTLV('01',key));
  var val=(valor!=null&&valor>0)?Number(valor).toFixed(2):null;
  var p=pixTLV('00','01')+mai+pixTLV('52','0000')+pixTLV('53','986')+(val?pixTLV('54',val):'')+
    pixTLV('58','BR')+pixTLV('59',pixNorm(nome,25)||'RECEBEDOR')+pixTLV('60',pixNorm(cidade,15)||'BRASIL')+
    pixTLV('62',pixTLV('05','***'))+'6304';
  return p+pixCRC16(p);
}
function pixAtual(){ var sub=cartSubtotal(), total=sub-descontoValor(sub)+chkTaxa(); return { code:pixPayload(S.loja.pixKey,S.loja.pixNome,S.loja.pixCidade||'BRASIL',total), valor:total }; }
function qrDataUrl(txt){ try{ if(typeof qrcode==='undefined') return null; var qr=qrcode(0,'M'); qr.addData(txt); qr.make(); return qr.createDataURL(5,10); }catch(e){ return null; } }

/* ============================ RENDER / DISPATCH ============================ */
function ehNoite(){ return agoraMinLoja() >= 1080; }   // 18:00 em diante = jantar (preço de noite)
function varPreco(v){ return (v && v.precoNoite!=null && ehNoite()) ? v.precoNoite : (v ? v.preco : 0); }
function normalizarCardapio(s){
  if(!s||!s.produtos) return;
  s.produtos.forEach(function(p){
    var nome=String(p.nome||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    var semPrecoNoite = (nome==='picanha' || nome==='file de peixe'); // preço igual no almoço e na janta
    if(nome.indexOf('refrigerante')===0){ p.sabores=SABORES_REFRI.slice(); } // Coca-cola ou Guaraná
    if(nome.indexOf('jarra')===0){ p.sabores=SABORES_SUCO.slice(); } // Acerola, Maracujá ou Laranja (não afeta "Suco Natural")
    (p.variacoes||[]).forEach(function(v){
      if(v.nome==='Completo'){
        v.feijao=true; if(v.inclui) v.inclui=v.inclui.filter(function(x){ return !/feij/i.test(x); });
        if(semPrecoNoite){ delete v.precoNoite; } else { v.precoNoite=25; }
      }
    });
  });
}
function render(){
  normalizarCardapio(S);
  var app=$('app');
  if(UI.app==='admin') app.innerHTML=viewAdmin();
  else app.innerHTML=viewCliente();
}
var H={};
function on(a,fn){ H[a]=fn; }
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-action]'); if(!t) return;
  var a=t.getAttribute('data-action'); if(!H[a]) return;
  e.preventDefault(); H[a](t.dataset, t, e);
});
document.addEventListener('input',function(e){
  var t=e.target.closest('[data-oninput]'); if(!t) return;
  var a=t.getAttribute('data-oninput'); if(H[a]) H[a](t.dataset,t,e);
});
function toast(msg,kind){
  var r=$('toast-root'); var d=document.createElement('div');
  d.className='toast '+(kind||''); d.textContent=msg; r.appendChild(d);
  setTimeout(function(){ d.style.opacity='0'; d.style.transition='.3s'; setTimeout(function(){ d.remove(); },300); },2400);
}
function modal(html,center){
  var r=$('modal-root');
  r.innerHTML='<div class="modal-bg" data-action="close-modal"></div><div class="modal'+(center?' center':'')+'">'+
    (center?'':'<div class="modal-grip"></div>')+'<button class="modal-x" data-action="close-modal" aria-label="Fechar">'+ic('x')+'</button>'+html+'</div>';
  r.hidden=false;
}
function closeModal(){ var r=$('modal-root'); r.hidden=true; r.innerHTML=''; }
on('close-modal',closeModal);
function confirmar(titulo,texto,acaoLabel,cb,perigo){
  modal('<h2>'+esc(titulo)+'</h2><p style="color:var(--text2)">'+esc(texto)+'</p>'+
    '<div class="sticky-cta"><button class="btn '+(perigo?'btn-red':'btn-primary')+' btn-block" id="cf-ok">'+esc(acaoLabel)+'</button>'+
    '<button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="close-modal">Voltar</button></div>',true);
  $('cf-ok').onclick=function(){ closeModal(); cb(); };
}

/* ============================================================================
   APP DO CLIENTE
   ============================================================================ */
function cliLogin(){
  var L=UI.login||{};
  return '<div class="stage cli login-stage"><div class="scroll"><div class="login-wrap">'+
    '<img class="login-logo" src="assets/logo-jamaica.jpg" alt="Jamaica Burguer">'+
    '<h1 class="login-tt">Jamaica Burguer</h1>'+
    '<p class="login-sub">Entre com seu WhatsApp para pedir e salvar seus endereços. Primeiro acesso? A gente cria sua conta na hora.</p>'+
    '<div class="card">'+
      '<div class="field"><label>Nome completo</label><input data-oninput="cli-login-f" data-k="nome" value="'+esc(L.nome||'')+'" placeholder="Nome e sobrenome"></div>'+
      '<div class="field"><label>WhatsApp</label><input inputmode="tel" data-oninput="cli-login-f" data-k="whats" value="'+esc(L.whats||'')+'" placeholder="(94) 9...."></div>'+
      '<button class="btn btn-primary btn-block btn-lg" data-action="cli-login">Entrar / Cadastrar</button>'+
    '</div>'+
    '<p class="login-fine">Ao entrar, você concorda em receber avisos do seu pedido pelo WhatsApp.</p>'+
    '</div></div></div>';
}
function viewCliente(){
  if(!estaLogado()) return cliLogin();
  var s=UI.cli.screen, body;
  if(s==='home') body=cliHome();
  else if(s==='carrinho') body=cliCarrinho();
  else if(s==='receber') body=cliReceber();
  else if(s==='endereco') body=cliEndereco();
  else if(s==='dados') body=cliDados();
  else if(s==='pagamento') body=cliPagamento();
  else if(s==='confirmado') body=cliConfirmado();
  else if(s==='track') body=cliTrack();
  else if(s==='pedidos') body=cliPedidos();
  else if(s==='perfil') body=cliPerfil();
  else body=cliHome();
  var showTabs = ['home','carrinho','pedidos','perfil'].indexOf(s)>=0;
  var showCartFab = s==='home' && cartCount()>0;
  return '<div class="stage cli">'+cliTop(s)+'<div class="scroll">'+body+'</div>'+
    (showCartFab?cartFab():'')+(showTabs?cliTabs(s):'')+'</div>';
}
var CLI_TABS=[['home','cardapio','Cardápio'],['carrinho','cart','Carrinho'],['pedidos','receipt','Pedidos'],['perfil','user','Perfil']];
function cliTop(cur){
  var l=S.loja, navCur=(['home','carrinho','pedidos','perfil'].indexOf(cur)>=0)?cur:'home';
  var nav=CLI_TABS.map(function(t){ var b=(t[0]==='carrinho'&&cartCount()>0)?'<span class="dn-badge">'+cartCount()+'</span>':'';
    return '<button class="dn-item'+(navCur===t[0]?' on':'')+'" data-action="cli-go" data-s="'+t[0]+'">'+ic(t[1])+'<span>'+t[2]+'</span>'+b+'</button>'; }).join('');
  return '<div class="topbar"><img class="logo" src="assets/logo-jamaica.jpg" alt="Jamaica Burguer">'+
    '<div class="tb-id"><div class="tb-tt">'+esc(l.nome)+'</div>'+
    '<div class="tb-sub"><span class="dot '+(lojaAberta()?'on':'off')+'"></span>'+(lojaAberta()?'Aberto agora':'Fechado agora')+'</div></div>'+
    '<nav class="desktop-nav">'+nav+'</nav>'+
    '<div class="tb-right"><button class="iconbtn" data-action="cli-go" data-s="perfil" aria-label="Meu perfil">'+(UI.me.foto?'<img class="ava-mini" src="'+UI.me.foto+'" alt="">':ic('user'))+'</button></div></div>';
}
function cliTabs(cur){
  return '<div class="tabbar">'+CLI_TABS.map(function(t){ var b=(t[0]==='carrinho'&&cartCount()>0)?'<span class="tbadge">'+cartCount()+'</span>':'';
    return '<button class="tab '+(cur===t[0]?'on':'')+'" data-action="cli-go" data-s="'+t[0]+'" aria-label="'+t[2]+'"><span class="ti">'+ic(t[1])+'</span>'+t[2]+b+'</button>'; }).join('')+'</div>';
}
function cartFab(){ return '<button class="cartfab" data-action="cli-go" data-s="carrinho"><span class="cf-count">'+cartCount()+'</span> Ver sacola<span class="cf-total">'+money(cartSubtotal())+'</span></button>'; }

/* Início / cardápio */
function cliHome(){
  var l=S.loja;
  var h;
  if(l.banner) h='<div class="jbanner-wrap"><img class="jbanner" src="'+esc(l.banner)+'" alt="'+esc(l.nome)+'"></div><div class="jreggae"></div>';
  else h='<div class="jhero"><div class="jcover jcover-default"></div><div class="jhero-body"><img class="jhero-logo" src="assets/logo-jamaica.jpg" alt="'+esc(l.nome)+'"></div></div><div class="jreggae"></div>';
  h+='<div class="jinfo"><div class="jinfo-tx"><h1>'+esc(l.nome)+'</h1>'+
     '<div class="jhero-sub">'+ic('pin')+' Breu Branco/PA · '+esc(l.prazoEntrega)+' · entrega '+money(l.taxaEntrega)+'</div></div>'+
     '<div class="storebar"><span class="dot '+(lojaAberta()?'on':'off')+'"></span>'+(lojaAberta()?'Aberto agora · '+esc(l.horario):'Fechado agora · '+esc(l.horario))+'</div></div>';
  if(!lojaAberta()) h+='<div class="notice warn">'+ic('clock')+'<div>A loja está <strong>fechada agora</strong>. Você pode ver o cardápio e montar o pedido; a finalização abre no horário: '+esc(l.horario)+'.</div></div><div class="sp"></div>';
  var promos=(S.promos||[]).filter(function(p){return p.ativo;});
  if(promos.length){ h+='<div class="catlabel">Promoções</div><div class="promos">'+promos.map(function(p){
    return '<div class="promo"><div class="promo-ic">'+ic('percent')+'</div><div class="promo-b"><div class="promo-t">'+esc(p.titulo)+'</div><div class="promo-d">'+esc(p.desc)+'</div></div><div class="promo-p">'+money(p.preco)+'</div></div>';
  }).join('')+'</div>'; }
  h+='<div class="search">'+ic('search')+'<input placeholder="Buscar no cardápio..." value="'+esc(UI.cli.q||'')+'" data-oninput="cli-search" aria-label="Buscar no cardápio"></div>';
  h+='<div class="cats" id="cli-cats">'+catsChips()+'</div>';
  h+='<div id="menu-list">'+menuInner()+'</div>';
  return h;
}
function catsChips(){
  var q=(UI.cli.q||'').trim();
  var cats=['Todos'].concat(catsOrd().filter(function(c){return !c.oculta;}).map(function(c){return c.nome;}));
  return cats.map(function(c){ return '<button class="chip '+((!q&&UI.cli.cat===c)?'on':'')+'" data-action="cli-cat" data-c="'+esc(c)+'">'+esc(c)+'</button>'; }).join('');
}
function menuInner(){
  var q=(UI.cli.q||'').trim().toLowerCase();
  var vis=S.produtos.filter(function(p){ return p.disp!=='oculto' && !(cat(p.cat)&&cat(p.cat).oculta); });
  if(q){ vis=vis.filter(function(p){return (p.nome+' '+p.desc).toLowerCase().indexOf(q)>=0;});
    return vis.length? '<div class="grid">'+vis.map(prodCard).join('')+'</div>' : '<div class="empty">'+ic('search','big')+'Nada encontrado.</div>'; }
  var out='';
  catsOrd().forEach(function(c){
    if(c.oculta) return;
    if(UI.cli.cat!=='Todos'&&UI.cli.cat!==c.nome) return;
    var items=vis.filter(function(p){return p.cat===c.id;}).sort(function(a,b){return a.ordem-b.ordem;});
    if(!items.length) return;
    out+='<div class="catlabel">'+esc(c.nome)+'</div><div class="grid">'+items.map(prodCard).join('')+'</div>';
  });
  return out||'<div class="empty">Sem produtos nesta categoria.</div>';
}
function prodCard(p){
  var off=p.disp==='esgotado';
  var temVar=p.variacoes&&p.variacoes.length;
  var base=temVar?Math.min.apply(null,p.variacoes.map(function(v){return varPreco(v);})):p.preco;
  var priceLabel=temVar?'<span class="pfrom">a partir de </span>'+money(base):money(p.preco);
  return '<div class="prod'+(off?' off':'')+'" '+(off?'':'data-action="cli-prod" data-id="'+p.id+'"')+'>'+
    '<div class="pbody"><div class="pname">'+esc(p.nome)+'</div>'+
    (p.desc?'<div class="pdesc">'+esc(p.desc)+'</div>':'')+
    '<div class="pprice">'+priceLabel+'</div></div>'+
    '<div class="pthumb"><img class="pimg" src="'+prodImg(p)+'" alt="">'+
    (off?'<span class="selo">Esgotado</span>':'<button class="padd" data-action="cli-prod" data-id="'+p.id+'" aria-label="Adicionar '+esc(p.nome)+'">'+ic('plus')+'</button>')+'</div></div>';
}

/* detalhe produto (modal) */
var pdSel;
function pdVars(p){ return (p.variacoes&&p.variacoes.length)?p.variacoes:null; }
function abrirProduto(id, editIdx){
  var p=prod(id); if(!p) return;
  var vars=pdVars(p);
  if(editIdx!=null && UI.cart[editIdx]){ var it=UI.cart[editIdx];
    var vi = vars ? Math.max(0, vars.map(function(v){return v.nome;}).indexOf(it.varNome)) : -1;
    pdSel={qty:it.qty, varIdx:vi, g:{}, obs:it.obs||'', edit:editIdx, feijao:it.feijao||null, sabor:it.sabor||null};
    (p.grupos||[]).forEach(function(gr,gi){ pdSel.g[gi]={}; gr.itens.forEach(function(gt,ii){ var f=(it.adics||[]).filter(function(a){return a.nome===gt.nome;})[0]; if(f) pdSel.g[gi][ii]=f.qty; }); });
  } else { pdSel={qty:1, varIdx: vars?0:-1, g:{}, obs:'', edit:null, feijao:null, sabor:null}; }
  UI._pdId=id; modal(pdHTML(p));
}
function pdBase(p){ var vars=pdVars(p); return vars ? varPreco(vars[pdSel.varIdx]) : p.preco; }
function pdAdicTotal(p){ var t=0; (p.grupos||[]).forEach(function(gr,gi){ var sel=pdSel.g[gi]||{}; gr.itens.forEach(function(it,ii){ if(adicEsgotado_(it.nome)) return; t+=(sel[ii]||0)*it.preco; }); }); return t; }
function pdTotal(p){ return (pdBase(p)+pdAdicTotal(p))*pdSel.qty; }
function grpSum(gi){ var sel=pdSel.g[gi]||{}, s=0; Object.keys(sel).forEach(function(k){ s+=sel[k]; }); return s; }
// adicional indisponível = existe um produto (acompanhamento) com o mesmo nome marcado como ESGOTADO no cardápio
function normAcomp_(s){ return foldAscii(String(s||'')).toLowerCase().trim(); }
function adicEsgotado_(nome){ var n=normAcomp_(nome); return (S.produtos||[]).some(function(p){ return p.disp==='esgotado' && normAcomp_(p.nome)===n; }); }
function pdHTML(p){
  var vars=pdVars(p), varSel = vars ? vars[pdSel.varIdx] : null;
  var h='<img class="pd-img" src="'+prodImg(p)+'" alt="">'+
    '<div class="pd-name">'+esc(p.nome)+'</div>'+(p.desc?'<div class="pd-desc">'+esc(p.desc)+'</div>':'')+
    '<div class="pd-price">'+money(pdBase(p))+'</div>';
  if(vars){
    h+='<div class="grp"><div class="grp-head"><strong>Escolha uma opção</strong><span class="grp-max">obrigatório</span></div>'+
      vars.map(function(v,i){ var sel=pdSel.varIdx===i;
        return '<div class="opt'+(sel?' sel':'')+'" data-action="pd-var" data-v="'+i+'"><span class="ck">'+(sel?ic('check'):'')+'</span><span class="oname">'+esc(v.nome)+'</span><span class="oprice">'+money(varPreco(v))+'</span></div>';
      }).join('')+'</div>';
    if(varSel && varSel.inclui && varSel.inclui.length){
      var acomp=varSel.inclui.slice(); if(varSel.feijao) acomp=acomp.concat([ehNoite()?'Feijão tropeiro':(pdSel.feijao||FEIJOES[0])]);
      h+='<div class="incl">'+ic('checkc')+'<div><strong>Acompanha:</strong> '+acomp.map(esc).join(', ')+'.</div></div>';
    }
    if(varSel && varSel.feijao && !ehNoite()){   // à noite (janta, 18h+) vai só feijão tropeiro, sem escolha
      var fsel=pdSel.feijao||FEIJOES[0];
      h+='<div class="grp"><div class="grp-head"><strong>Escolha o feijão</strong><span class="grp-max">obrigatório</span></div>'+
        FEIJOES.map(function(f){ var s=fsel===f; return '<div class="opt'+(s?' sel':'')+'" data-action="pd-feijao" data-f="'+esc(f)+'"><span class="ck">'+(s?ic('check'):'')+'</span><span class="oname">'+esc(f)+'</span></div>'; }).join('')+'</div>';
    }
  }
  if(p.sabores && p.sabores.length){
    var ssel=pdSel.sabor||p.sabores[0];
    h+='<div class="grp"><div class="grp-head"><strong>Escolha o sabor</strong><span class="grp-max">obrigatório</span></div>'+
      p.sabores.map(function(f){ var s=ssel===f; return '<div class="opt'+(s?' sel':'')+'" data-action="pd-sabor" data-f="'+esc(f)+'"><span class="ck">'+(s?ic('check'):'')+'</span><span class="oname">'+esc(f)+'</span></div>'; }).join('')+'</div>';
  }
  (p.grupos||[]).forEach(function(gr,gi){
    if(!gr.itens||!gr.itens.length) return;
    var sel=pdSel.g[gi]||{};
    h+='<div class="grp"><div class="grp-head"><strong>'+esc(gr.nome)+'</strong>'+(gr.max>0?'<span class="grp-max">escolha até '+gr.max+'</span>':'')+'</div>'+
      gr.itens.map(function(it,ii){ var q=sel[ii]||0;
        if(adicEsgotado_(it.nome)) return '<div class="adrow" style="opacity:.5"><div class="adrow-b"><div class="ad-n">'+esc(it.nome)+' <span class="tag">esgotado</span></div><div class="ad-p">+ '+money(it.preco)+'</div></div><div class="pd-qtyctl"><span class="muted small2">indisponível</span></div></div>';
        return '<div class="adrow"><div class="adrow-b"><div class="ad-n">'+esc(it.nome)+'</div><div class="ad-p">+ '+money(it.preco)+'</div></div>'+
          '<div class="pd-qtyctl"><button class="qtybtn sm" data-action="pd-adic" data-g="'+gi+'" data-i="'+ii+'" data-d="-1" aria-label="Menos"'+(q<=0?' disabled':'')+'>'+ic('minus')+'</button><span>'+q+'</span><button class="qtybtn sm" data-action="pd-adic" data-g="'+gi+'" data-i="'+ii+'" data-d="1" aria-label="Mais">'+ic('plus')+'</button></div></div>';
      }).join('')+'</div>';
  });
  h+='<div class="field"><label>Alguma observação?</label><textarea data-oninput="pd-obs" placeholder="Ex.: sem cebola, bem passado, molho à parte">'+esc(pdSel.obs)+'</textarea></div>'+
    '<div class="sticky-cta"><div class="pd-cta"><div class="pd-qtyctl big"><button class="qtybtn sm" data-action="pd-qty" data-d="-1" aria-label="Menos">'+ic('minus')+'</button><span id="pd-qtyval">'+pdSel.qty+'</span><button class="qtybtn sm" data-action="pd-qty" data-d="1" aria-label="Mais">'+ic('plus')+'</button></div>'+
    '<button class="btn btn-primary btn-lg pd-add-btn" data-action="pd-add" data-id="'+p.id+'">'+(pdSel.edit!=null?'Atualizar · ':'Adicionar · ')+'<span id="pd-total">'+money(pdTotal(p))+'</span></button></div></div>';
  return h;
}

/* carrinho */
function cartCount(){ return UI.cart.reduce(function(a,i){return a+i.qty;},0); }
function cartSubtotal(){ return UI.cart.reduce(function(a,i){return a+i.preco*i.qty;},0); }
function itemLines(it){
  var lines=[];
  if(it.varNome) lines.push(it.varNome);
  if(it.feijao) lines.push(it.feijao);
  if(it.sabor) lines.push(it.sabor);
  (it.adics||[]).forEach(function(a){ lines.push((a.qty>1?a.qty+'x ':'+ ')+a.nome); });
  if(it.obs) lines.push('Obs.: '+it.obs);
  return lines;
}
function itemDet(it){ return itemLines(it).join(' · '); }
function cliCarrinho(){
  if(!UI.cart.length) return '<div class="pagehead"><h2>Sua sacola</h2></div>'+
    '<div class="empty">'+ic('cart','big')+'Sua sacola está vazia.<br><button class="btn btn-outline btn-sm" style="margin-top:14px" data-action="cli-go" data-s="home">Ver cardápio</button></div>';
  var sub=cartSubtotal(), desc=descontoValor(sub);
  var h='<div class="pagehead cart-head"><h2>Sua sacola</h2><span class="cart-count">'+cartCount()+' item(ns)</span></div>';
  h+='<div class="cart-card">'+UI.cart.map(function(it,idx){
    var lines=itemLines(it).map(esc);
    return '<div class="citem2">'+
      '<img class="ci-img" src="'+itemImg(it)+'" alt="" data-action="cart-edit" data-i="'+idx+'">'+
      '<div class="ci-main"><div class="ci-name" data-action="cart-edit" data-i="'+idx+'">'+esc(it.nome)+'</div>'+
      (lines.length?'<div class="ci-adds">'+lines.join('<br>')+'</div>':'')+
      '<div class="stepper"><button data-action="cart-dec" data-i="'+idx+'" aria-label="Menos">'+ic('minus')+'</button><span>'+it.qty+'</span><button data-action="cart-inc" data-i="'+idx+'" aria-label="Mais">'+ic('plus')+'</button></div></div>'+
      '<div class="ci-side"><div class="ci-price">'+money(it.preco*it.qty)+'</div><button class="ci-remove" data-action="cart-rm" data-i="'+idx+'">remover</button></div>'+
      '</div>';
  }).join('')+'</div>';
  h+='<div class="totbox"><div class="totrow"><span>Subtotal</span><span>'+money(sub)+'</span></div>'+
     (desc>0?'<div class="totrow"><span>Desconto ('+esc(UI.cupom.code)+')</span><span class="gold">- '+money(desc)+'</span></div>':'')+
     '<div class="totrow"><span>Entrega</span><span>no checkout</span></div>'+
     '<div class="totrow grand"><span>Total</span><strong>'+money(sub-desc)+'</strong></div></div>';
  if(S.loja.minPedido>0 && sub<S.loja.minPedido)
    h+='<div class="notice warn">'+ic('warn')+'<div>Pedido mínimo de '+money(S.loja.minPedido)+'. Faltam '+money(S.loja.minPedido-sub)+'.</div></div>';
  h+='<div class="sticky-cta"><button class="btn btn-primary btn-block btn-lg" data-action="cart-continuar">Continuar pedido</button></div>';
  return h;
}

/* como receber */
function cliReceber(){
  return backCli('carrinho')+'<div class="pagehead"><h2>Como receber?</h2><p>Escolha entrega ou retirada no local.</p></div>'+
    '<div class="bigopt" data-action="chk-modo" data-m="delivery"><div class="bo-ic">'+ic('delivery')+'</div><div><div class="bo-t">Entrega</div><div class="bo-s">Levamos até o seu endereço · taxa por bairro</div></div></div>'+
    (S.loja.retirada?'<div class="bigopt" data-action="chk-modo" data-m="retirada"><div class="bo-ic">'+ic('store')+'</div><div><div class="bo-t">Retirar no local</div><div class="bo-s">'+esc(S.loja.endereco)+' · sem taxa</div></div></div>':'');
}

/* endereço */
function cliEndereco(){
  var c=UI.chk, salvos=(UI.me.enderecos||[]);
  var h=backCli('receber')+'<div class="pagehead"><h2>Endereço de entrega</h2><p>Preencha os campos marcados com *.</p></div>';
  if(salvos.length){
    h+='<div class="field"><label>Endereços salvos</label>'+salvos.map(function(e,i){
      return '<button class="bigopt'+((c.rua===e.rua&&c.numero===e.numero)?' sel':'')+'" data-action="chk-endsalvo" data-i="'+i+'"><div class="bo-ic">'+ic('pin')+'</div><div><div class="bo-t">'+esc(e.rua)+', '+esc(e.numero)+'</div><div class="bo-s">'+esc(e.bairro||'')+'</div></div></button>';
    }).join('')+'</div>';
  }
  h+='<div class="card">'+
    '<div class="field"><label>Bairro *</label><input data-oninput="chk-f" data-k="bairro" value="'+esc(c.bairro)+'" placeholder="Ex.: Centro"></div>'+
    '<div class="field"><label>Rua ou Avenida *</label><input data-oninput="chk-f" data-k="rua" value="'+esc(c.rua)+'" placeholder="Ex.: Av. Principal"></div>'+
    '<div class="row2"><div class="field"><label>Número *</label><input inputmode="numeric" data-oninput="chk-f" data-k="numero" value="'+esc(c.numero)+'" placeholder="123"></div>'+
    '<div class="field"><label>Complemento</label><input data-oninput="chk-f" data-k="comp" value="'+esc(c.comp)+'" placeholder="Casa, apto (opcional)"></div></div>'+
    '<div class="field"><label>Ponto de referência *</label><input data-oninput="chk-f" data-k="ref" value="'+esc(c.ref)+'" placeholder="Ex.: perto da praça, portão azul"></div></div>';
  h+='<div class="totbox"><div class="totrow"><span>Taxa de entrega</span><strong class="gold">'+money(S.loja.taxaEntrega)+'</strong></div>'+
     '<div class="totrow"><span>Prazo estimado</span><span>'+esc(S.loja.prazoEntrega||'')+'</span></div></div>';
  h+='<div class="sticky-cta"><button class="btn btn-primary btn-block btn-lg" data-action="chk-endok">Confirmar endereço</button></div>';
  return h;
}

/* dados */
function cliDados(){
  var c=UI.chk, back=c.modo==='delivery'?'endereco':'receber';
  var h=backCli(back)+'<div class="pagehead"><h2>Dados do pedido</h2></div>';
  h+='<div class="card"><div class="field"><label>Nome completo</label><input data-oninput="chk-f" data-k="nome" value="'+esc(c.nome||UI.me.nome||'')+'" placeholder="Seu nome"></div>'+
     '<div class="field"><label>WhatsApp</label><input inputmode="tel" data-oninput="chk-f" data-k="whats" value="'+esc(c.whats||UI.me.tel||'')+'" placeholder="(94) 9....."></div>'+
     '<div class="field"><label>Observação geral (opcional)</label><textarea data-oninput="chk-f" data-k="obs" placeholder="Ex.: portão preto, ligar ao chegar">'+esc(c.obs)+'</textarea></div></div>';
  h+=resumoValores();
  h+='<div class="sticky-cta"><button class="btn btn-primary btn-block btn-lg" data-action="chk-dadosok">Escolher pagamento</button></div>';
  return h;
}
function chkTaxa(){ return UI.chk.modo==='delivery' ? (S.loja.taxaEntrega||0) : 0; }
function resumoValores(){
  var sub=cartSubtotal(), taxa=chkTaxa(), desc=descontoValor(sub);
  return '<div class="totbox"><div class="totrow"><span>Subtotal</span><span>'+money(sub)+'</span></div>'+
    (desc>0?'<div class="totrow"><span>Desconto ('+esc(UI.cupom.code)+')</span><span class="gold">- '+money(desc)+'</span></div>':'')+
    (UI.chk.modo==='delivery'?'<div class="totrow"><span>Taxa de entrega</span><span>'+money(taxa)+'</span></div>':'<div class="totrow"><span>Retirada no local</span><span>sem taxa</span></div>')+
    '<div class="totrow grand"><span>Total</span><strong>'+money(sub-desc+taxa)+'</strong></div></div>';
}

/* pagamento */
function cliPagamento(){
  var c=UI.chk;
  var h=backCli('dados')+'<div class="pagehead"><h2>Pagamento</h2><p>Escolha como pagar.</p></div>';
  var opts=[];
  if(S.loja.aceitaPix) opts.push(['pix','pix','Pix com comprovante','Pague pelo Pix e anexe o comprovante']);
  if(S.loja.aceitaDinheiro) opts.push(['dinheiro','cash','Dinheiro',(c.modo==='delivery'?'Na entrega':'Na retirada')]);
  if(S.loja.aceitaCartao) opts.push(['cartao','card','Cartão',(c.modo==='delivery'?'Maquininha na entrega':'Maquininha na retirada')]);
  h+=opts.map(function(o){ return '<div class="pay'+(c.pay===o[0]?' sel':'')+'" data-action="chk-pay" data-p="'+o[0]+'"><div class="pic">'+ic(o[1])+'</div><div><div class="pt">'+o[2]+'</div><div class="ps">'+o[3]+'</div></div></div>'; }).join('');
  if(c.pay==='pix'){
    var pix=pixAtual(), qimg=qrDataUrl(pix.code);
    h+='<div class="pixbox">'+
      '<div class="pix-cap">Pague <strong>'+money(pix.valor)+'</strong> com Pix</div>'+
      (qimg?'<img class="pix-qr" src="'+qimg+'" alt="QR Code Pix">':'<div class="notice info left" style="margin:0 0 10px">'+ic('info')+'<div>Use o código Pix abaixo (copia e cola).</div></div>')+
      '<div class="pix-cap">'+esc(S.loja.pixNome)+' · chave '+esc(S.loja.pixKey)+'</div>'+
      '<button class="btn btn-primary btn-sm btn-block" data-action="chk-copiapix">'+ic('copy')+' Copiar código Pix</button>'+
      '<textarea class="pix-code" readonly onclick="this.select()" aria-label="Código Pix copia e cola">'+esc(pix.code)+'</textarea>'+
      '<div class="upload-wrap"><label class="up-lb">Comprovante do Pix</label>'+
      '<div class="upload'+(c.comprov?' has':'')+'" data-action="chk-upload">'+(c.comprov?ic('check')+' Comprovante anexado<img src="'+c.comprov+'">':ic('attach')+' Toque para anexar o comprovante')+'</div>'+
      '<button class="btn btn-outline btn-sm btn-block" style="margin-top:8px" data-action="chk-pix-whats-abrir">'+ic('chat')+' 1. Enviar comprovante no WhatsApp</button>'+
      '<button class="btn '+(c.waAberto?'btn-primary':'btn-ghost')+' btn-sm btn-block" style="margin-top:8px" data-action="chk-pix-whats-enviei"'+(c.waAberto?'':' disabled')+'>'+ic(c.waAberto?'check':'lock')+' 2. Já enviei o comprovante - fazer pedido</button></div>'+
      '<div class="notice info left">'+ic('info')+'<div><strong>Não consegue anexar?</strong> <strong>1)</strong> Toque em "Enviar comprovante no WhatsApp" e mande o print do Pix. <strong>2)</strong> Volte aqui e toque em "Já enviei o comprovante" pra fazer o pedido'+(c.waAberto?'':' (esse botão libera depois do passo 1)')+'. Quem consegue anexar, anexa acima e toca em "Enviar pedido para validação".</div></div></div>';
  } else if(c.pay==='dinheiro'){
    h+='<div class="card"><div class="field"><label>Precisa de troco? Para quanto? (opcional)</label><input inputmode="numeric" data-oninput="chk-f" data-k="troco" value="'+esc(c.troco)+'" placeholder="Ex.: 50"></div></div>';
  } else if(c.pay==='cartao'){
    h+='<div class="notice info">'+ic('card')+'<div>A maquininha vai '+(c.modo==='delivery'?'com o entregador':'estar no balcão')+'. Crédito ou débito. O sistema não guarda dados do cartão.</div></div>';
  }
  h+=resumoValores();
  var label = c.pay==='pix'?'Enviar pedido para validação':'Confirmar pedido';
  h+='<div class="sticky-cta"><button class="btn btn-primary btn-block btn-lg" data-action="chk-finalizar"'+(c.pay?'':' disabled')+'>'+label+'</button></div>';
  return h;
}

/* confirmado + tracker */
function precisaComprovanteWhats(o){ return o.pay.metodo==='pix' && o.pay.viaWhats && o.pay.status!=='aprovado' && ['em_validacao','aguardando_comprovante'].indexOf(o.status)>=0; }
function cliConfirmado(){
  var o=order(UI.curOrder); if(!o) return cliHome();
  var wa;
  if(precisaComprovanteWhats(o))
    wa='<div class="notice ok left" style="margin-top:12px">'+ic('checkc')+'<div><strong>Comprovante enviado pelo WhatsApp.</strong> Aguarde o restaurante conferir o Pix e confirmar seu pedido. Precisa reenviar?</div></div>'+
       '<a class="btn btn-outline btn-block" style="text-decoration:none;margin-top:8px" href="'+waLink(S.loja.whats,waComprovanteMsg_(o))+'" target="_blank" rel="noopener">'+ic('chat')+' Reenviar comprovante no WhatsApp</a>';
  else
    wa='<a class="btn btn-outline btn-block" style="text-decoration:none;margin-top:12px" href="'+waLink(S.loja.whats,'')+'" target="_blank" rel="noopener">'+ic('chat')+' Falar no WhatsApp</a>';
  return '<div class="ok-hero">'+ic('checkc','xl gold')+'<h2>Pedido enviado!</h2>'+
    '<p>Pedido '+esc(o.id)+' · '+esc(statusCliente(o).lbl)+'</p></div>'+
    trackerHTML(o)+resumoPedidoBox(o)+wa+
    '<div class="sp"></div><button class="btn btn-primary btn-block" data-action="cli-go" data-s="pedidos">Ver meus pedidos</button>';
}
function cliTrack(){
  var o=order(UI.curOrder); if(!o) return cliPedidos();
  var h=backCli('pedidos')+'<div class="pagehead"><h2>Pedido '+esc(o.id)+' '+statusBadge(o)+'</h2><p>'+esc(o.dia)+' · '+esc(o.criadoEm)+'</p></div>';
  h+=trackerHTML(o)+resumoPedidoBox(o);
  if(o.status==='aguardando_comprovante')
    h+='<div class="sp"></div><button class="btn btn-primary btn-block" data-action="cli-reenviar" data-id="'+o.id+'">'+ic('attach')+' Reenviar comprovante</button>';
  if(['em_validacao','aguardando_comprovante','aguardando_aceite'].indexOf(o.status)>=0)
    h+='<div class="sp-sm"></div><button class="btn btn-red btn-block" data-action="cli-cancelar" data-id="'+o.id+'">Cancelar pedido</button>';
  if(precisaComprovanteWhats(o))
    h+='<div class="notice ok left" style="margin-top:12px">'+ic('checkc')+'<div><strong>Comprovante enviado pelo WhatsApp.</strong> Aguardando o restaurante conferir e confirmar. Precisa reenviar?</div></div>'+
       '<a class="btn btn-outline btn-block" style="text-decoration:none;margin-top:8px" href="'+waLink(S.loja.whats,waComprovanteMsg_(o))+'" target="_blank" rel="noopener">'+ic('chat')+' Reenviar comprovante no WhatsApp</a>';
  else
    h+='<a class="btn btn-outline btn-block" style="text-decoration:none;margin-top:10px" href="'+waLink(S.loja.whats,'')+'" target="_blank" rel="noopener">'+ic('chat')+' Falar no WhatsApp</a>';
  return h;
}
function trackerHTML(o){
  var steps=[['Pedido recebido','receipt'],['Pagamento','pix'],['Em preparo','clock'],['Pronto','check'],[o.tipo==='delivery'?'Saiu para entrega':'Retirada',o.tipo==='delivery'?'delivery':'store']];
  var idx=stepIndex(o);
  if(o.status==='recusado'||o.status==='cancelado')
    return '<div class="card"><div class="notice err">'+ic('x')+'<div>'+(o.status==='recusado'?'Pedido recusado':'Pedido cancelado')+(o.pay.motivoRecusa?' · '+esc(o.pay.motivoRecusa):'')+'</div></div></div>';
  return '<div class="card"><div class="tracker">'+steps.map(function(s,i){
    var cls=i<idx?'done':i===idx?'cur':'future';
    var sub=i===idx?statusCliente(o).sub:'';
    return '<div class="tstep '+cls+'"><div class="tline"></div><div class="tdot">'+(i<idx?ic('check'):ic(s[1]))+'</div>'+
      '<div><div class="tt">'+s[0]+'</div>'+(sub?'<div class="ts">'+esc(sub)+'</div>':'')+'</div></div>';
  }).join('')+'</div></div>';
}
function stepIndex(o){
  switch(o.status){
    case 'aguardando_comprovante': return 1;
    case 'em_validacao': return 1;
    case 'aguardando_aceite': return 1;
    case 'em_preparo': return 2;
    case 'pronto': return 3;
    case 'saiu': return 4;
    case 'concluido': return 5;
    default: return 0;
  }
}
function statusCliente(o){
  var m={
    aguardando_comprovante:{lbl:'Aguardando comprovante',sub:'Reenvie o comprovante do Pix'},
    em_validacao:{lbl:'Comprovante em validação',sub:'Aguardando o restaurante confirmar seu Pix'},
    aguardando_aceite:{lbl:'Aguardando o restaurante',sub:'O restaurante vai aceitar seu pedido'},
    em_preparo:{lbl:'Em preparo',sub:'Seu pedido está sendo feito'},
    pronto:{lbl:o.tipo==='retirada'?'Pronto para retirada':'Pronto',sub:o.tipo==='retirada'?'Pode vir buscar!':'Aguardando o entregador'},
    saiu:{lbl:'Saiu para entrega',sub:'A caminho do seu endereço'},
    concluido:{lbl:'Concluído',sub:'Pedido finalizado. Bom apetite!'},
    recusado:{lbl:'Pedido recusado',sub:o.pay.motivoRecusa||''},
    cancelado:{lbl:'Cancelado',sub:''}
  };
  return m[o.status]||{lbl:o.status,sub:''};
}
function bairroLabel(o){ return o.bairro||''; }
function resumoPedidoBox(o){
  var h='<div class="dp-block"><h4>Itens</h4>'+o.itens.map(function(i){
    var det=itemDet(i);
    return '<div class="dp-item"><span>'+i.qty+'x '+esc(i.nome)+(det?'<div class="dp-obs">'+esc(det)+'</div>':'')+'</span><strong>'+money(i.preco*i.qty)+'</strong></div>';
  }).join('')+'</div>';
  h+='<div class="dp-block"><div class="dp-line"><span>'+(o.tipo==='delivery'?'Entrega':'Retirada')+'</span><strong>'+(o.tipo==='delivery'?esc(o.end)+' · '+esc(bairroLabel(o)):'No local')+'</strong></div>'+
     (o.tipo==='delivery'&&o.ref?'<div class="dp-line"><span>Referência</span><strong>'+esc(o.ref)+'</strong></div>':'')+
     '<div class="dp-line"><span>Pagamento</span><strong>'+esc(o.pay.label)+'</strong></div>'+
     '<div class="dp-line"><span>Subtotal</span><span>'+money(o.subtotal)+'</span></div>'+
     (o.desconto>0?'<div class="dp-line"><span>Desconto'+(o.cupom?' ('+esc(o.cupom)+')':'')+'</span><span>- '+money(o.desconto)+'</span></div>':'')+
     (o.tipo==='delivery'?'<div class="dp-line"><span>Taxa</span><span>'+money(o.taxa)+'</span></div>':'')+
     '<div class="dp-line big"><strong>Total</strong><strong class="gold">'+money(o.total)+'</strong></div>'+
     (o.pay.troco?'<div class="dp-line"><span>Troco para</span><strong>'+money(o.pay.troco)+'</strong></div>':'')+
     (trocoInfo(o).dev>0?'<div class="dp-line"><span>Troco a devolver</span><strong class="gold">'+money(trocoInfo(o).dev)+'</strong></div>':'')+
     '</div>';
  return h;
}

/* meus pedidos */
function cliPedidos(){
  var meus=S.pedidos.filter(function(p){return p.tel===(UI.me.tel||'');});
  if(!meus.length) return '<div class="pagehead"><h2>Meus pedidos</h2></div><div class="empty">'+ic('receipt','big')+'Você ainda não fez pedidos.<br><button class="btn btn-outline btn-sm" style="margin-top:14px" data-action="cli-go" data-s="home">Ver cardápio</button></div>';
  var ativos=meus.filter(function(p){return ['concluido','recusado','cancelado'].indexOf(p.status)<0;});
  var hist=meus.filter(function(p){return ['concluido','recusado','cancelado'].indexOf(p.status)>=0;});
  var h='<div class="pagehead"><h2>Meus pedidos</h2></div>';
  if(ativos.length) h+='<div class="catlabel">Em andamento</div>'+ativos.map(ordCardCli).join('');
  if(hist.length) h+='<div class="catlabel">Histórico</div>'+hist.map(ordCardCli).join('');
  return h;
}
function ordCardCli(o){
  var itemsTxt=o.itens.map(function(i){return i.qty+'x '+i.nome;}).join(', ');
  return '<div class="ordcard" data-action="cli-track" data-id="'+o.id+'">'+
    '<div class="oc-top"><span class="oc-id">'+esc(o.id)+'</span>'+statusBadge(o)+'</div>'+
    '<div class="oc-meta">'+esc(o.dia)+' · '+esc(o.criadoEm)+' · '+(o.tipo==='delivery'?'Entrega':'Retirada')+'</div>'+
    '<div class="oc-items">'+esc(itemsTxt)+'</div>'+
    '<div class="oc-foot"><span class="oc-total">'+money(o.total)+'</span>'+
    (o.status==='concluido'?'<button class="btn btn-outline btn-sm" data-action="cli-repetir" data-id="'+o.id+'">Pedir novamente</button>':'<span class="muted">Toque para acompanhar '+ic('chev')+'</span>')+'</div></div>';
}

/* perfil */
function cliPerfil(){
  var me=UI.me, inicial=(me.nome||'?').trim().charAt(0).toUpperCase();
  var h='<div class="pagehead"><h2>Meu perfil</h2></div>';
  var avatar = me.foto ? '<img class="avatar-lg" src="'+me.foto+'" alt="">' : '<div class="avatar-lg">'+esc(inicial)+'</div>';
  h+='<div class="perfil-top">'+avatar+
     '<div><div class="pf-nome">'+esc(me.nome||'Visitante')+'</div><div class="pf-tel">'+esc(me.tel||'Sem telefone')+'</div>'+
     '<button class="btn btn-outline btn-sm" style="margin-top:8px" data-action="me-foto">'+ic('camera')+' '+(me.foto?'Trocar foto':'Adicionar foto')+'</button></div></div>';
  h+='<div class="card"><div class="field"><label>Nome</label><input data-oninput="me-f" data-k="nome" value="'+esc(me.nome||'')+'"></div>'+
     '<div class="field"><label>WhatsApp</label><input inputmode="tel" data-oninput="me-f" data-k="tel" value="'+esc(me.tel||'')+'"></div>'+
     '<button class="btn btn-outline btn-sm btn-block" data-action="me-salvar">Salvar dados</button></div>';
  h+='<div class="catlabel">Endereços salvos</div>';
  if((me.enderecos||[]).length){
    h+=me.enderecos.map(function(e,i){
      return '<div class="addr"><span class="ad-ic">'+ic('pin')+'</span><div class="ad-b"><div class="ad-t">'+esc((e.rua||'')+(e.numero?', '+e.numero:''))+'</div><div class="ad-s">'+esc(e.bairro||'')+(e.comp?' · '+esc(e.comp):'')+'</div></div>'+
        (i===0?'<span class="ad-def">Padrão</span>':'')+'<button class="ci-trash" data-action="me-endrm" data-i="'+i+'" aria-label="Remover endereço">'+ic('trash')+'</button></div>';
    }).join('');
  } else h+='<div class="empty" style="padding:24px">Nenhum endereço salvo ainda.</div>';
  h+='<button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="me-endadd">'+ic('plus')+' Adicionar endereço</button>';
  h+='<div class="sp"></div><button class="btn btn-red btn-block" data-action="cli-logout">'+ic('x')+' Sair da conta</button>';
  return h;
}
function backCli(to){ return '<div class="backbar"><button class="backbtn" data-action="cli-go" data-s="'+to+'">'+ic('back')+' Voltar</button></div>'; }

/* status badge */
function statusBadge(o){
  var map={ aguardando_comprovante:['valid','attach','Aguard. comprovante'], em_validacao:['valid','clock','Em validação'],
    aguardando_aceite:['aceite','bell','Aguard. aceite'], em_preparo:['preparo','clock','Em preparo'],
    pronto:['pronto','check','Pronto'], saiu:['entrega','delivery','Saiu p/ entrega'],
    concluido:['ok','checkc','Concluído'], recusado:['recusado','x','Recusado'], cancelado:['cancel','x','Cancelado'] };
  var m=map[o.status]||['novo','dot',o.status];
  return '<span class="st '+m[0]+'">'+ic(m[1])+m[2]+'</span>';
}

/* ============================================================================
   APP DO DONO (ADMIN)
   ============================================================================ */
var ADM_MODS=[
  ['promocoes','percent','Promoções e ofertas','Combos, cupons e destaques'],
  ['entregas','delivery','Entregas','Bairros, taxas e retirada'],
  ['horarios','clock','Horários','Abrir, fechar ou pausar'],
  ['pagamentos','pix','Pagamentos','Chave Pix e formas aceitas'],
  ['impressao','printer','Impressão','Testar e configurar cupom'],
  ['relatorios','chart','Relatórios','Vendas, produtos e dias'],
  ['clientes','users','Clientes','Base e histórico'],
  ['equipe','lock','Equipe','Logins e permissões'],
  ['marca','paint','Marca','Logo, banner e aparência']
];
var ATENDENTE_MODS=['impressao'];
function modAllowed(m){ return isAdmin() || ATENDENTE_MODS.indexOf(m)>=0; }

/* Alerta flutuante fixo: pedidos esperando ação (validação/aceite). Some quando não há pendências. */
function admAlerta(){
  if(!UI.adm.logged) return '';
  var pend=S.pedidos.filter(function(p){return ['em_validacao','aguardando_aceite'].indexOf(p.status)>=0 && p.dia===hoje();}).length;
  if(!pend) return '';
  // não mostra quando já está na própria lista de pedidos
  if(!UI.adm.order && !UI.adm.mais && UI.adm.tab==='pedidos') return '';
  return '<button class="adm-alert" data-action="adm-kpi" data-f="todos"><span class="aa-ic">'+ic('bell')+'</span>'+
    '<span class="aa-tx"><strong>'+pend+' pedido(s) esperando ação</strong><span>Toque para ver e agilizar</span></span>'+
    '<span class="aa-cta">Ver pedidos</span></button>';
}

function viewAdmin(){
  if(!UI.adm.logged) return '<div class="stage">'+admLogin()+'</div>';
  var content;
  if(UI.adm.order) content=admDetalhe(order(UI.adm.order));
  else if(UI.adm.mais) content=modAllowed(UI.adm.mais)?admMaisModulo(UI.adm.mais):admSemPermissao();
  else if(UI.adm.tab==='visao') content=admVisao();
  else if(UI.adm.tab==='pedidos') content=admPedidos();
  else if(UI.adm.tab==='cardapio') content=admCardapio();
  else if(UI.adm.tab==='mais') content=admMais();
  else content=admVisao();
  return '<div class="stage wide">'+admTop()+admSidebar()+'<div class="adm-scroll">'+content+'</div>'+admAlerta()+admTabs()+'</div>';
}
function admSemPermissao(){ return '<div class="empty">'+ic('lock','big')+'Este módulo é exclusivo do dono.</div>'; }
function admLogin(){
  return '<div class="login"><img class="l-logo" src="assets/logo-jamaica.jpg" alt=""><h1>Jamaica Burguer · Painel</h1>'+
    '<p>Acesso exclusivo do dono e da equipe.</p>'+
    '<div class="l-form"><div class="field"><label>Usuário</label><input id="lg-user" placeholder="Usuário" autocomplete="username"></div>'+
    '<div class="field"><label>Senha</label><input id="lg-pass" type="password" placeholder="Senha" autocomplete="current-password"></div>'+
    '<button class="btn btn-primary btn-block btn-lg" data-action="adm-login">Entrar</button></div></div>';
}
function admTop(){
  var pend=S.pedidos.filter(function(p){return ['em_validacao','aguardando_aceite'].indexOf(p.status)>=0 && p.dia===hoje();}).length;
  return '<div class="topbar"><img class="logo" src="assets/logo-jamaica.jpg" alt="">'+
    '<div class="tb-id"><div class="tb-tt">Jamaica Burguer</div><div class="tb-sub">'+esc(UI.adm.user.nome)+' · '+(isAdmin()?'Dono':'Atendente')+'</div></div>'+
    '<div class="tb-right"><button class="iconbtn" data-action="adm-tab" data-t="pedidos" aria-label="Pedidos pendentes">'+ic('bell')+(pend?'<span class="badge">'+pend+'</span>':'')+'</button>'+
    '<button class="iconbtn" data-action="adm-logout" aria-label="Sair" title="Sair">'+ic('logout')+'</button></div></div>';
}
function admSidebar(){
  var items=[['visao','chart','Visão geral'],['pedidos','receipt','Pedidos'],['cardapio','cardapio','Cardápio'],['mais','gear','Mais']];
  return '<div class="sidebar">'+items.map(function(it){
    var on=(!UI.adm.order&&!UI.adm.mais&&UI.adm.tab===it[0]);
    return '<button class="sidebtn'+(on?' on':'')+'" data-action="adm-tab" data-t="'+it[0]+'"><span class="si">'+ic(it[1])+'</span>'+it[2]+'</button>';
  }).join('')+'</div>';
}
function admTabs(){
  var pend=S.pedidos.filter(function(p){return ['em_validacao','aguardando_aceite'].indexOf(p.status)>=0 && p.dia===hoje();}).length;
  function t(k,icn,lb){ var on=(!UI.adm.order&&!UI.adm.mais&&UI.adm.tab===k);
    var b=(k==='pedidos'&&pend)?'<span class="tbadge">'+pend+'</span>':'';
    return '<button class="tab'+(on?' on':'')+'" data-action="adm-tab" data-t="'+k+'" aria-label="'+lb+'"><span class="ti">'+ic(icn)+'</span>'+lb+b+'</button>'; }
  return '<div class="tabbar">'+t('visao','chart','Visão')+t('pedidos','receipt','Pedidos')+t('cardapio','cardapio','Cardápio')+t('mais','gear','Mais')+'</div>';
}

/* Visão geral */
function admVisao(){
  var P=S.pedidos;
  function c(fn){ return P.filter(function(p){return p.dia===hoje()&&fn(p);}).length; }   // KPIs do topo = só de hoje (não mistura dia anterior)
  var novos=c(function(p){return p.status==='aguardando_aceite';});
  var valid=c(function(p){return p.status==='em_validacao';});
  var preparo=c(function(p){return p.status==='em_preparo';});
  var prontos=c(function(p){return p.status==='pronto';});
  var entrega=c(function(p){return p.status==='saiu';});
  var h='<div class="pagehead"><h2>Visão geral</h2><p>Resumo da operação · '+hoje()+'</p></div>';
  h+='<div class="kpi-grid">'+
    kpi('em_validacao',valid,'Aguard. validação','clock',valid>0)+
    kpi('aguardando_aceite',novos,'Novos pedidos','bell',novos>0)+
    kpi('em_preparo',preparo,'Em preparo','clock')+
    kpi('pronto',prontos,'Prontos','check')+
    kpi('saiu',entrega,'Em entrega','delivery')+'</div>';
  if(isAdmin()){
    var conclHoje=P.filter(function(p){return p.status==='concluido'&&p.dia===hoje();}).length;
    var fatHoje=P.filter(function(p){return p.status==='concluido'&&p.dia===hoje();}).reduce(function(a,p){return a+p.total;},0);
    var novosCli=S.clientes.filter(function(cl){return cl.criadoEm===hoje();}).length;
    h+='<div class="adm-sec-t">Hoje</div><div class="kpi-grid">'+
      kpiPlain(money(fatHoje),'Faturamento','tag',true)+kpiPlain(conclHoje,'Concluídos','checkc')+
      kpiPlain(S.clientes.length,'Clientes na base','users')+kpiPlain('+'+novosCli,'Novos hoje','star')+'</div>';
    var cx=caixaDoDia(hoje());
    function cxr(lb,v,n){ return '<div class="dp-line"><span>'+lb+' <span class="muted">('+n+')</span></span><strong>'+money(v)+'</strong></div>'; }
    h+='<div class="adm-sec-t">Caixa de hoje</div><div class="card">'+
      cxr('Dinheiro',cx.val.dinheiro,cx.qtd.dinheiro)+
      cxr('PIX',cx.val.pix,cx.qtd.pix)+
      cxr('Cartão Débito',cx.val.debito,cx.qtd.debito)+
      cxr('Cartão Crédito',cx.val.credito,cx.qtd.credito)+
      (cx.qtd.cartao?cxr('Cartão (sem tipo)',cx.val.cartao,cx.qtd.cartao):'')+
      '<div class="dp-line" style="border-top:1px solid var(--line);margin-top:4px;padding-top:8px"><span>Almoço / Janta</span><strong>'+money(cx.almT)+' / '+money(cx.janT)+'</strong></div>'+
      '<div class="dp-line big"><strong>Total do dia</strong><strong class="gold">'+money(cx.tot)+'</strong></div>'+
      (ehNoite()
        ? '<button class="btn btn-primary btn-block" style="margin-top:10px" data-action="adm-fechar-caixa" data-p="janta">'+ic('printer')+' Fechar Caixa Janta</button>'+
          '<button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="adm-fechar-caixa" data-p="almoco">'+ic('printer')+' Fechar Caixa Almoço</button>'
        : '<button class="btn btn-primary btn-block" style="margin-top:10px" data-action="adm-fechar-caixa" data-p="almoco">'+ic('printer')+' Fechar Caixa Almoço</button>'+
          '<button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="adm-fechar-caixa" data-p="janta">'+ic('printer')+' Fechar Caixa Janta</button>')+
      '</div>';
  }
  var esgotados=S.produtos.filter(function(p){return p.disp==='esgotado';}).length;
  if(esgotados) h+='<div class="notice info" style="margin-top:16px">'+ic('info')+'<div>'+esgotados+' produto(s) marcados como esgotados hoje.</div></div>';
  return h;
}
function kpi(filter,n,label,icn,hl){ return '<button class="kpi'+(hl?' hl':'')+'" data-action="adm-kpi" data-f="'+filter+'"><span class="k-ic">'+ic(icn)+'</span><div class="k-n">'+n+'</div><div class="k-l">'+label+'</div></button>'; }
function kpiPlain(n,label,icn,hl){ return '<div class="kpi'+(hl?' hl':'')+'"><span class="k-ic">'+ic(icn)+'</span><div class="k-n">'+n+'</div><div class="k-l">'+label+'</div></div>'; }

/* Pedidos */
var FILTERS=[['todos','Todos'],['aguardando_aceite','Novos'],['em_validacao','Validação'],['em_preparo','Preparo'],['pronto','Prontos'],['saiu','Entrega'],['concluido','Concluídos'],['recusado','Recusados']];
function admPedidos(){
  var f=UI.adm.filter||'todos', ft=UI.adm.filterTipo||'todos', fp=UI.adm.filterPay||'todos', fd=UI.adm.filterDia||'hoje';
  function diaOk(p){ return fd==='hoje'?p.dia===hoje():(fd==='anteriores'?p.dia!==hoje():true); }
  var base=S.pedidos.filter(diaOk);
  var list=base.filter(function(p){
    if(f!=='todos'&&p.status!==f) return false;
    if(ft!=='todos'&&p.tipo!==ft) return false;
    if(fp!=='todos'&&p.pay.metodo!==fp) return false;
    return true;
  });
  var h='<div class="pagehead"><h2>Pedidos</h2><p>'+list.length+' pedido(s)'+(fd==='hoje'?' · hoje':(fd==='anteriores'?' · dias anteriores':' · todos os dias'))+'</p></div>';
  h+='<div class="filters">'+[['hoje','Hoje'],['anteriores','Anteriores'],['todos','Todos os dias']].map(function(x){
    var n=S.pedidos.filter(function(p){ return x[0]==='hoje'?p.dia===hoje():(x[0]==='anteriores'?p.dia!==hoje():true); }).length;
    return '<button class="chip'+(fd===x[0]?' on':'')+'" data-action="adm-filter-dia" data-f="'+x[0]+'">'+x[1]+' ('+n+')</button>';
  }).join('')+'</div>';
  h+='<div class="filters">'+FILTERS.map(function(x){
    var n=x[0]==='todos'?base.length:base.filter(function(p){return p.status===x[0];}).length;
    return '<button class="chip'+(f===x[0]?' on':'')+'" data-action="adm-filter" data-f="'+x[0]+'">'+x[1]+' ('+n+')</button>';
  }).join('')+'</div>';
  h+='<div class="filters">'+
    [['todos','Tipo: todos'],['delivery','Entrega'],['retirada','Retirada']].map(function(x){return '<button class="chip'+(ft===x[0]?' on':'')+'" data-action="adm-filter-tipo" data-f="'+x[0]+'">'+x[1]+'</button>';}).join('')+
    [['todos','Pgto: todos'],['pix','Pix'],['dinheiro','Dinheiro'],['cartao','Cartão']].map(function(x){return '<button class="chip'+(fp===x[0]?' on':'')+'" data-action="adm-filter-pay" data-f="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(!list.length) h+='<div class="empty">'+ic('receipt','big')+(fd==='hoje'?'Nenhum pedido hoje ainda.':'Nenhum pedido neste filtro.')+'</div>';
  else h+='<div class="ord-grid">'+list.map(admOrderItem).join('')+'</div>';
  return h;
}
function admOrderItem(o){
  var acao=proximaAcaoLabel(o);
  return '<button class="oitem" data-action="adm-open" data-id="'+o.id+'">'+
    '<div class="oi-top"><span class="oi-id">'+esc(o.id)+'</span>'+statusBadge(o)+'</div>'+
    '<div class="oi-cli">'+esc(o.nome)+' · '+esc(o.tel)+'</div>'+
    '<div class="oi-tags"><span class="tag">'+(o.tipo==='delivery'?'Entrega':'Retirada')+'</span><span class="tag">'+esc(o.pay.label)+'</span><span class="tag">'+esc(o.criadoEm)+'</span></div>'+
    '<div class="oi-mid"><span class="oi-total">'+money(o.total)+'</span>'+(acao?'<span class="oi-acao">'+esc(acao)+' '+ic('chev')+'</span>':'<span class="muted">ver detalhes '+ic('chev')+'</span>')+'</div></button>';
}
function proximaAcaoLabel(o){
  switch(o.status){
    case 'em_validacao': return 'Validar Pix';
    case 'aguardando_aceite': return 'Aceitar';
    case 'em_preparo': return 'Marcar pronto';
    case 'pronto': return o.tipo==='delivery'?'Saiu p/ entrega':'Confirmar retirada';
    case 'saiu': return 'Concluir';
    default: return '';
  }
}

/* Mensagens rápidas do dono para o cliente (via WhatsApp, com o número cadastrado) */
function admMensagens(o){
  if(!telValido(o.tel)) return '<div class="dp-block"><h4>Mensagem ao cliente</h4><div class="notice warn">'+ic('warn')+'<div>Este cliente não tem um número válido cadastrado, então não dá pra enviar mensagem. Peça o WhatsApp e cadastre no pedido.</div></div></div>';
  var nome=(o.nome||'').split(' ')[0], loja=S.loja.nome;
  var msgs=[
    ['A caminho','Olá '+nome+'! Seu pedido '+o.id+' do '+loja+' já saiu e está a caminho.'],
    ['Vai atrasar','Olá '+nome+', aqui é do '+loja+'. Seu pedido '+o.id+' vai atrasar um pouquinho. Obrigado pela paciência!'],
    ['Achar endereço','Olá '+nome+', o entregador está com dificuldade para achar seu endereço. Pode mandar um ponto de referência ou a localização?'],
    ['Pronto p/ retirada','Olá '+nome+'! Seu pedido '+o.id+' já está pronto para retirada no '+loja+'.']
  ];
  return '<div class="dp-block"><h4>Mensagem ao cliente</h4><div class="msg-grid">'+
    msgs.map(function(m){ return '<a class="btn btn-outline btn-sm" href="'+waLink(o.tel,m[1])+'" target="_blank" rel="noopener">'+ic('chat')+' '+m[0]+'</a>'; }).join('')+'</div>'+
    '<a class="btn btn-ghost btn-sm btn-block" style="margin-top:8px" href="'+waLink(o.tel,'')+'" target="_blank" rel="noopener">'+ic('edit')+' Escrever mensagem livre</a></div>';
}
/* Detalhe do pedido */
function admDetalhe(o){
  if(!o) return admPedidos();
  var h='<div class="backbar"><button class="backbtn" data-action="adm-back">'+ic('back')+' Voltar aos pedidos</button></div>';
  h+='<div class="pagehead"><h2>Pedido '+esc(o.id)+' '+statusBadge(o)+'</h2><p>'+esc(o.dia)+' · '+esc(o.criadoEm)+'</p></div>';
  if(isAdmin()) h+='<div style="text-align:right;margin:-6px 0 10px"><button class="btn btn-primary btn-sm" data-action="adm-editar" data-id="'+esc(o.id)+'">'+ic('edit')+' Editar pedido</button></div>';
  h+='<div class="det-cols">';
  h+='<div class="det-col"><div class="dp-block"><h4>Cliente</h4>'+
     '<div class="dp-line"><span>Nome</span><strong>'+esc(o.nome)+'</strong></div>'+
     '<div class="dp-line"><span>WhatsApp</span><strong>'+esc(o.tel)+'</strong></div>'+
     (o.tipo==='delivery'?'<div class="dp-line"><span>Endereço</span><strong>'+esc(o.end)+'</strong></div>'+
        '<div class="dp-line"><span>Bairro</span><strong>'+esc(bairroLabel(o))+'</strong></div>'+(o.comp?'<div class="dp-line"><span>Complemento</span><strong>'+esc(o.comp)+'</strong></div>':'')+(o.ref?'<div class="dp-line"><span>Referência</span><strong>'+esc(o.ref)+'</strong></div>':''):'<div class="dp-line"><span>Tipo</span><strong>Retirada no local</strong></div>')+
     '</div>'+admMensagens(o);
  h+='<div class="dp-block"><h4>Itens</h4>'+o.itens.map(function(i){
    var det=itemDet(i);
    return '<div class="dp-item"><span>'+i.qty+'x '+esc(i.nome)+(det?'<div class="dp-obs">'+esc(det)+'</div>':'')+'</span><strong>'+money(i.preco*i.qty)+'</strong></div>';
  }).join('')+(o.obs?'<div class="notice info">'+ic('edit')+'<div>'+esc(o.obs)+'</div></div>':'')+'</div></div>';
  h+='<div class="det-col"><div class="dp-block"><h4>Pagamento</h4>'+
     '<div class="dp-line"><span>Forma</span><strong>'+esc(o.pay.label)+'</strong></div>'+
     '<div class="dp-line"><span>Situação</span><strong>'+payStatusLabel(o)+'</strong></div>'+
     (o.pay.troco?'<div class="dp-line"><span>Troco para</span><strong>'+money(o.pay.troco)+'</strong></div>':'')+
     (trocoInfo(o).dev>0?'<div class="dp-line"><span>Troco a devolver</span><strong class="gold">'+money(trocoInfo(o).dev)+'</strong></div>':'')+
     '<div class="dp-line"><span>Subtotal</span><span>'+money(o.subtotal)+'</span></div>'+
     (o.desconto>0?'<div class="dp-line"><span>Desconto'+(o.cupom?' ('+esc(o.cupom)+')':'')+'</span><span>- '+money(o.desconto)+'</span></div>':'')+
     (o.tipo==='delivery'?'<div class="dp-line"><span>Taxa de entrega</span><span>'+money(o.taxa)+'</span></div>':'')+
     '<div class="dp-line big"><strong>Total</strong><strong class="gold">'+money(o.total)+'</strong></div>'+
     (o.pay.comprovante?'<div class="comprov-wrap"><div class="up-lb">Comprovante enviado:</div><img class="comprov" src="'+o.pay.comprovante+'" data-action="ver-img" data-src="'+o.pay.comprovante+'"><div class="comprov-hint">'+ic('search')+' Toque para ampliar</div></div>':(o.pay.viaWhats?'<div class="notice info" style="margin-top:10px">'+ic('chat')+'<div><strong>Comprovante pelo WhatsApp.</strong> O cliente não conseguiu anexar no app e vai mandar o comprovante no WhatsApp do restaurante. Confira lá pelo nome (<strong>'+esc(o.nome)+'</strong>) e confirme o Pix.</div></div>':''))+'</div>';
  h+='<div class="actionbar">'+admAcoes(o)+'</div>';
  h+='<div class="dp-block"><h4>Histórico</h4>'+(o.historico||[]).map(function(x){
    return '<div class="dp-line"><span>'+esc(x.t)+' · '+esc(x.who)+'</span><span>'+esc(x.act)+'</span></div>';
  }).join('')+'</div></div>';
  h+='</div>';
  return h;
}
function payStatusLabel(o){
  if(o.pay.metodo==='pix') return o.pay.status==='aprovado'?'Pix confirmado':o.pay.status==='enviado'?'Comprovante em validação':'Aguardando comprovante';
  return o.status==='concluido'?'Recebido no local':'A receber no local';
}
function admAcoes(o){
  switch(o.status){
    case 'em_validacao':
      return '<button class="btn btn-green btn-block" data-action="adm-aprovar-pix" data-id="'+o.id+'">'+ic('check')+' Aprovar pagamento (Pix confirmado)</button>'+
             '<button class="btn btn-outline btn-block" data-action="adm-solicitar-comprov" data-id="'+o.id+'">'+ic('attach')+' Solicitar novo comprovante</button>'+
             '<button class="btn btn-red btn-block" data-action="adm-recusar" data-id="'+o.id+'">Recusar pedido</button>';
    case 'aguardando_comprovante':
      return '<div class="notice info">'+ic('info')+'<div>Aguardando o cliente reenviar o comprovante.</div></div>'+
             '<button class="btn btn-red btn-block" data-action="adm-recusar" data-id="'+o.id+'">Recusar pedido</button>';
    case 'aguardando_aceite':
      return '<button class="btn btn-primary btn-block btn-lg" data-action="adm-aceitar" data-id="'+o.id+'">'+ic('printer')+' Aceitar e imprimir cupom</button>'+
             '<button class="btn btn-red btn-block" data-action="adm-recusar" data-id="'+o.id+'">Recusar pedido</button>';
    case 'em_preparo':
      return '<button class="btn btn-green btn-block btn-lg" data-action="adm-pronto" data-id="'+o.id+'">'+ic('check')+' Marcar como pronto</button>'+
             '<button class="btn btn-outline btn-block" data-action="adm-reimprimir" data-id="'+o.id+'">'+ic('printer')+' Reimprimir cupom</button>'+
             (isAdmin()?'<button class="btn btn-red btn-block" data-action="adm-cancelar-admin" data-id="'+o.id+'">Cancelar pedido (dono)</button>':'');
    case 'pronto':
      return (o.tipo==='delivery'
        ? '<button class="btn btn-primary btn-block btn-lg" data-action="adm-saiu" data-id="'+o.id+'">'+ic('delivery')+' Saiu para entrega</button>'
        : '<button class="btn btn-green btn-block btn-lg" data-action="adm-concluir" data-id="'+o.id+'">'+ic('check')+' Confirmar retirada e pagamento</button>')+
        (isAdmin()?'<button class="btn btn-red btn-block" data-action="adm-cancelar-admin" data-id="'+o.id+'">Cancelar pedido (dono)</button>':'');
    case 'saiu':
      return '<button class="btn btn-green btn-block btn-lg" data-action="adm-concluir" data-id="'+o.id+'">'+ic('check')+' Concluir entrega</button>';
    case 'concluido': return '<div class="notice ok">'+ic('checkc')+'<div>Pedido concluído.</div></div>';
    case 'recusado': return '<div class="notice err">'+ic('x')+'<div>Pedido recusado'+(o.pay.motivoRecusa?': '+esc(o.pay.motivoRecusa):'')+'</div></div>';
    case 'cancelado': return '<div class="notice">'+ic('x')+'<div>Pedido cancelado'+(o.pay.motivoRecusa?': '+esc(o.pay.motivoRecusa):'')+'</div></div>';
    default: return '';
  }
}

/* Cupom */
function cupomHTML(o,reimp){
  var itens=o.itens.map(function(i){
    var base=[]; if(i.varNome) base.push(i.varNome); (i.adics||[]).forEach(function(a){ base.push((a.qty>1?a.qty+'x ':'+ ')+a.nome); });
    var obs=[]; if(i.feijao) obs.push(i.feijao); if(i.sabor) obs.push(i.sabor); if(i.obs) obs.push(i.obs);
    return '<div class="tk-l"><span>'+i.qty+'x '+esc(i.nome)+'</span><span>'+money(i.preco*i.qty)+'</span></div>'+
      (base.length?'<div class="tk-obs">'+esc(base.join(' · '))+'</div>':'')+
      (obs.length?'<div class="tk-obs"><strong>OBS:</strong> '+esc(obs.join(' · '))+'</div>':'');
  }).join('');
  return '<div class="ticket"><h1>JAMAICA BURGUER</h1><div class="tk-c tk-strong">— DELIVERY —</div><div class="tk-c">CUPOM DE COZINHA</div>'+
    (reimp?'<div class="reimp">*** REIMPRESSAO ***</div>':'<div class="tk-c tk-strong">ORIGINAL</div>')+
    '<div class="tk-big">'+esc(o.id)+'</div><hr>'+
    '<div class="tk-l"><span>'+esc(o.dia)+'</span><span>'+esc(o.criadoEm)+'</span></div>'+
    '<div class="tk-l"><span>Tipo</span><strong>'+(o.tipo==='delivery'?'ENTREGA':'RETIRADA')+'</strong></div>'+
    '<div class="tk-l"><span>Cliente</span><span>'+esc(o.nome)+'</span></div>'+
    '<div class="tk-l"><span>Fone</span><span>'+esc(o.tel)+'</span></div>'+
    (o.tipo==='delivery'?'<div class="tk-l"><span>End.</span><span>'+esc(o.end)+' - '+esc(bairroLabel(o))+'</span></div>':'')+
    '<hr>'+itens+'<hr>'+
    '<div class="tk-l"><strong>TOTAL</strong><strong>'+(o.entregaSobConsulta?money(o.subtotal)+'+ent':money(o.total))+'</strong></div>'+
    '<div class="tk-l"><span>Pagto</span><span>'+esc(o.pay.label)+'</span></div>'+
    (o.pay.troco?'<div class="tk-l"><span>Troco p/</span><span>'+money(o.pay.troco)+'</span></div>':'')+
    (trocoInfo(o).dev>0?'<div class="tk-l"><strong>TROCO (devolver)</strong><strong>'+money(trocoInfo(o).dev)+'</strong></div>':'')+
    (o.obs?'<div class="tk-obs">Obs.: '+esc(o.obs)+'</div>':'')+
    '<hr><div class="tk-c">Levar este cupom a cozinha</div></div>';
}
function abrirCupom(o,reimp){
  var pa=$('print-area'); if(pa) pa.innerHTML=cupomHTML(o,reimp);
  UI._cupom={o:o,reimp:reimp};
  var btns='';
  if(isIOS()) btns+='<button class="btn btn-primary btn-block" data-action="do-mpu">'+ic('printer')+' Imprimir (Mobile Print Util)</button>';
  if(isTouchShare()) btns+='<button class="btn btn-outline btn-block" style="margin-top:8px" data-action="do-share-img">'+ic('printer')+' Compartilhar imagem</button>';
  btns+='<button class="btn '+(isIOS()?'btn-ghost':'btn-primary')+' btn-block" style="margin-top:8px" data-action="do-print">'+ic('printer')+' Impressão do sistema</button>'+
    '<button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="close-modal">Fechar</button>';
  modal('<h2 class="center">Cupom · Delivery</h2>'+cupomHTML(o,reimp)+'<div class="sticky-cta">'+btns+'</div>',true);
  if(!isTouchShare()) setTimeout(function(){ try{ window.print(); }catch(e){} }, 400); // computador: imprime direto
}
on('do-print',function(){ window.print(); });
on('do-mpu',function(){ if(UI._cupom) imprimirMPU(UI._cupom.o, UI._cupom.reimp); });
on('do-share-img',function(){ if(UI._cupom) compartilharCupomImagem(UI._cupom.o, UI._cupom.reimp); });

/* ===== Impressora Bluetooth (Android Chrome / Web Bluetooth) — imprime direto na KP-1025 (58mm ESC/POS), sem app ===== */
var BTP = { device:null, char:null };
var BTP_SVC='000018f0-0000-1000-8000-00805f9b34fb', BTP_CHR='00002af1-0000-1000-8000-00805f9b34fb';
// serviços de impressora térmica BLE conhecidos — algumas KP-1025 NÃO anunciam o serviço padrão (por isso o filtro antigo não achava);
// listar em optionalServices libera o acesso a eles depois de conectar via acceptAllDevices.
var BTP_OPT=[BTP_SVC,'0000ff00-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000ffe5-0000-1000-8000-00805f9b34fb','49535343-fe7d-4ae5-8fa9-9fafd205e455','e7810a71-73ae-499d-8c15-faa9aef0c3f2'];
function btpSupported(){ return typeof navigator!=='undefined' && !!navigator.bluetooth; }
function btpConectado(){ return !!(BTP.char && BTP.device && BTP.device.gatt && BTP.device.gatt.connected); }
// acha uma característica GRAVÁVEL: tenta o serviço/char padrão de impressora; senão varre os serviços conhecidos e pega a 1ª que dá pra escrever.
function acharCharImpressora_(server){
  return server.getPrimaryService(BTP_SVC)
    .then(function(svc){ return svc.getCharacteristic(BTP_CHR); })
    .catch(function(){
      return server.getPrimaryServices().then(function(svcs){
        return (function prox(i){
          if(i>=svcs.length) return null;
          return svcs[i].getCharacteristics().then(function(chs){
            for(var k=0;k<chs.length;k++){ var p=chs[k].properties||{}; if(p.write||p.writeWithoutResponse) return chs[k]; }
            return prox(i+1);
          }).catch(function(){ return prox(i+1); });
        })(0);
      });
    });
}
function btpConnect(){
  if(!btpSupported()){ toast('Este aparelho não imprime por Bluetooth. Use um Android no Chrome.','err'); return; }
  // lista TODAS as impressoras (algumas não anunciam o serviço padrão) — o dono escolhe a KP-1025 na janela do Chrome
  navigator.bluetooth.requestDevice({ acceptAllDevices:true, optionalServices:BTP_OPT })
    .then(function(dev){ BTP.device=dev; try{ dev.addEventListener('gattserverdisconnected',function(){ BTP.char=null; render(); }); }catch(e){} return dev.gatt.connect(); })
    .then(function(server){ return acharCharImpressora_(server); })
    .then(function(ch){ if(!ch) throw new Error('essa impressora não tem canal de impressão compatível'); BTP.char=ch; toast('Impressora conectada','ok'); render(); })
    .catch(function(e){ var m=(e&&(e.message||e.name))||''; if(/cancel|User cancelled|chooser/i.test(m)) return; toast('Não conectou na impressora: '+m,'err'); });
}
function btpDisconnect(){ try{ if(BTP.device&&BTP.device.gatt&&BTP.device.gatt.connected) BTP.device.gatt.disconnect(); }catch(e){} BTP.char=null; BTP.device=null; toast('Impressora desconectada','info'); render(); }
function btpReconnect(){
  if(btpConectado()) return Promise.resolve(true);
  if(BTP.device && BTP.device.gatt){ return BTP.device.gatt.connect().then(function(s){return acharCharImpressora_(s);}).then(function(c){ if(!c) return false; BTP.char=c; return true; }).catch(function(){return false;}); }
  return Promise.resolve(false);
}
function btpWrite(bytes){
  if(!BTP.char) return Promise.reject(new Error('sem impressora'));
  var CH=100, i=0;
  function step(){ if(i>=bytes.length) return Promise.resolve(); var slice=bytes.slice(i, i+CH); i+=CH; return BTP.char.writeValue(slice).then(function(){ return new Promise(function(r){ setTimeout(r,20); }); }).then(step); }
  return step();
}
/* monta os bytes ESC/POS do cupom (acentos removidos p/ nao sair embaralhado em impressora barata) */
function foldAscii(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\x20-\x7E]/g,'?'); }
function ln2(a,b){ a=foldAscii(String(a)); b=foldAscii(String(b)); var sp=32-a.length-b.length; if(sp<1){ a=a.slice(0,Math.max(0,31-b.length)); sp=Math.max(1,32-a.length-b.length); } var pad=''; while(pad.length<sp)pad+=' '; return a+pad+b; }
function escposCupom(o,reimp){
  var B=[];
  function raw(){ for(var i=0;i<arguments.length;i++) B.push(arguments[i]&0xFF); }
  function txt(s){ s=foldAscii(s); for(var i=0;i<s.length;i++) B.push(s.charCodeAt(i)&0xFF); }
  function nl(n){ n=n||1; while(n-->0) B.push(0x0A); }
  function center(){ raw(0x1B,0x61,0x01); } function left(){ raw(0x1B,0x61,0x00); }
  function bold(on){ raw(0x1B,0x45,on?1:0); }
  function big(on){ raw(0x1D,0x21,on?0x11:0x00); }
  var SEP='--------------------------------';
  raw(0x1B,0x40);                       // init
  center(); big(true); bold(true); txt('JAMAICA BURGUER'); nl(); big(false);
  txt('-- DELIVERY --'); nl(); bold(false);
  txt('CUPOM DE COZINHA'); nl();
  txt(reimp?'*** REIMPRESSAO ***':'ORIGINAL'); nl();
  big(true); txt(o.id); nl(); big(false);
  left(); txt(SEP); nl();
  txt(ln2(o.dia, o.criadoEm)); nl();
  bold(true); txt(ln2('Tipo', o.tipo==='delivery'?'ENTREGA':'RETIRADA')); nl(); bold(false);
  txt('Cliente: '+o.nome); nl();
  txt('Fone: '+o.tel); nl();
  if(o.tipo==='delivery'){ txt('End.: '+o.end+' - '+bairroLabel(o)); nl(); }
  txt(SEP); nl();
  (o.itens||[]).forEach(function(i){
    var base=[]; if(i.varNome) base.push(i.varNome); (i.adics||[]).forEach(function(a){ base.push((a.qty>1?a.qty+'x ':'+ ')+a.nome); });
    var obs=[]; if(i.feijao) obs.push(i.feijao); if(i.sabor) obs.push(i.sabor); if(i.obs) obs.push(i.obs);
    bold(true); txt(ln2(i.qty+'x '+i.nome, money(i.preco*i.qty))); nl(); bold(false);
    if(base.length){ txt('  '+base.join(' / ')); nl(); }
    if(obs.length){ txt('  OBS: '+obs.join(' / ')); nl(); }
  });
  txt(SEP); nl();
  bold(true); txt(ln2('TOTAL', o.entregaSobConsulta?money(o.subtotal)+'+ent':money(o.total))); nl(); bold(false);
  txt(ln2('Pagto', o.pay.label)); nl();
  if(o.pay.troco){ txt(ln2('Troco p/', money(o.pay.troco))); nl(); }
  if(trocoInfo(o).dev>0){ bold(true); txt(ln2('TROCO devolver', money(trocoInfo(o).dev))); nl(); bold(false); }
  if(o.obs){ txt('Obs.: '+o.obs); nl(); }
  txt(SEP); nl();
  center(); txt('Levar este cupom a cozinha'); nl(4);
  return new Uint8Array(B);
}
/* ---- iPhone: gera o cupom como IMAGEM 58mm (384px) e compartilha pro app de impressora (Simple Bluetooth Printer / BR RawPrinter etc.) ---- */
function isTouchShare(){ return typeof navigator!=='undefined' && !!navigator.canShare && (((navigator.maxTouchPoints||0)>0) || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'')); }
function dataURLtoFile(durl,name){ var a=durl.split(','), mime=((a[0].match(/:(.*?);/)||[])[1])||'image/png', bin=atob(a[1]), n=bin.length, u=new Uint8Array(n); while(n--) u[n]=bin.charCodeAt(n); return new File([u], name, {type:mime}); }
function wrapLine(s,w){ s=foldAscii(String(s)); var out=[], line=''; s.split(' ').forEach(function(word){ while(word.length>w){ if(line){ out.push(line); line=''; } out.push(word.slice(0,w)); word=word.slice(w); } var t=line?line+' '+word:word; if(t.length>w){ if(line) out.push(line); line=word; } else line=t; }); if(line) out.push(line); return out.length?out:['']; }
function cupomRows(o,reimp){
  var COLS=32, S=19, rows=[];               // 58mm util = 384 dots; 32 col monoespacado ~19px
  function row(t,size,bold,align){ rows.push({t:t,size:size||S,bold:!!bold,align:align||'left'}); }
  function body(t,bold){ wrapLine(t,COLS).forEach(function(l){ row(l,S,bold,'left'); }); }
  function sep(){ row('--------------------------------',S,false,'left'); }
  row('JAMAICA BURGUER',34,true,'center');
  row('-- DELIVERY --',22,false,'center');
  row('CUPOM DE COZINHA',20,false,'center');
  row(reimp?'*** REIMPRESSAO ***':'ORIGINAL',20,true,'center');
  row(foldAscii(o.id),28,true,'center');
  sep();
  row(ln2(o.dia,o.criadoEm),S,false);
  row(ln2('Tipo', o.tipo==='delivery'?'ENTREGA':'RETIRADA'),S,true);
  body('Cliente: '+o.nome); body('Fone: '+o.tel);
  if(o.tipo==='delivery') body('End.: '+o.end+' - '+bairroLabel(o));
  sep();
  (o.itens||[]).forEach(function(i){
    var base=[]; if(i.varNome) base.push(i.varNome); (i.adics||[]).forEach(function(a){ base.push((a.qty>1?a.qty+'x ':'+ ')+a.nome); });
    var obs=[]; if(i.feijao) obs.push(i.feijao); if(i.sabor) obs.push(i.sabor); if(i.obs) obs.push(i.obs);
    row(ln2(i.qty+'x '+foldAscii(i.nome), money(i.preco*i.qty)),S,true);
    if(base.length) body('  '+base.join(' / '));
    if(obs.length) body('  OBS: '+obs.join(' / '),true);
  });
  sep();
  row(ln2('TOTAL', o.entregaSobConsulta?money(o.subtotal)+'+ent':money(o.total)),S,true);
  row(ln2('Pagto', o.pay.label),S,false);
  if(o.pay.troco) row(ln2('Troco p/', money(o.pay.troco)),S,false);
  if(trocoInfo(o).dev>0) row(ln2('TROCO devolver', money(trocoInfo(o).dev)),S,true);
  if(o.obs) body('Obs.: '+o.obs);
  sep(); row('Levar este cupom a cozinha',S,false,'center');
  return rows;
}
function cupomCanvas(o,reimp){
  var W=384, PAD=6, rows=cupomRows(o,reimp);
  function lh(sz){ return Math.round(sz*1.32); }
  var H=PAD*2; rows.forEach(function(r){ H+=lh(r.size); });
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var g=cv.getContext('2d');
  g.fillStyle='#fff'; g.fillRect(0,0,W,H);
  g.fillStyle='#000'; g.textBaseline='top';
  var y=PAD;
  rows.forEach(function(r){
    g.font=(r.bold?'bold ':'')+r.size+'px Menlo, "Courier New", monospace';
    var tx=PAD; if(r.align==='center'){ var tw=g.measureText(r.t).width; tx=Math.max(PAD,(W-tw)/2); }
    g.fillText(r.t, tx, y); y+=lh(r.size);
  });
  return cv;
}
/* HTML autocontido (monoespacado 58mm) pro Mobile Print Util renderizar via #deb64# */
function cupomHTMLthermal(o,reimp){
  var rows=cupomRows(o,reimp), h='<div style="width:384px;max-width:100%;padding:6px;font-family:\'Courier New\',monospace;color:#000;background:#fff">';
  rows.forEach(function(r){ h+='<div style="font-size:'+r.size+'px;line-height:1.3;white-space:pre;'+(r.bold?'font-weight:bold;':'')+(r.align==='center'?'text-align:center;':'')+'">'+esc(r.t)+'</div>'; });
  return h+'</div>';
}
function isIOS(){ return typeof navigator!=='undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent||''); }
/* iPhone: abre o Mobile Print Util (grátis) com o cupom em HTML base64 e ele imprime na KP-1025 */
function imprimirMPU(o,reimp){
  try{ var b64=btoa(unescape(encodeURIComponent(cupomHTMLthermal(o,reimp)))); window.location.href='com.samathosoft.webprint://#deb64#'+b64; return true; }
  catch(e){ return false; }
}
function compartilharCupomImagem(o,reimp){
  try{
    var cv=cupomCanvas(o,reimp);
    var file=dataURLtoFile(cv.toDataURL('image/png'),'cupom-'+String(o.id).replace(/\W/g,'')+'.png');
    if(navigator.canShare && navigator.canShare({files:[file]})){
      navigator.share({files:[file]}).then(function(){ toast('Escolha o app da impressora','info'); }, function(){});
      return true;
    }
  }catch(e){}
  return false;
}
/* imprime: Bluetooth do Android manda direto; iPhone/celular compartilha a imagem 58mm pro app; computador usa a impressao do sistema */
function imprimirCupom(o,reimp){
  if(btpConectado()){ return btpWrite(escposCupom(o,reimp)).then(function(){ toast('Cupom enviado a impressora','ok'); }, function(){ toast('Falha na impressora, abrindo impressao do sistema','info'); abrirCupom(o,reimp); }); }
  if(btpSupported() && BTP.device){ return btpReconnect().then(function(ok){ if(ok){ return btpWrite(escposCupom(o,reimp)).then(function(){ toast('Cupom enviado a impressora','ok'); }); } if(isIOS()&&imprimirMPU(o,reimp)) return; if(isTouchShare()&&compartilharCupomImagem(o,reimp)) return; abrirCupom(o,reimp); }); }
  if(isIOS() && imprimirMPU(o,reimp)) return;                      // iPhone: Mobile Print Util (grátis)
  if(isTouchShare() && compartilharCupomImagem(o,reimp)) return;   // outros celulares: compartilhar imagem
  abrirCupom(o,reimp);                                             // computador: impressão do sistema
}
on('adm-bt-connect',function(){ btpConnect(); });
on('adm-bt-disconnect',function(){ btpDisconnect(); });

/* ===== CAIXA: forma de pagamento + período + impressão do fechamento ===== */
function metodoCaixa(o){ var p=(o&&o.pay)||{}; if(p.metodo==='pix')return 'pix'; if(p.metodo==='dinheiro')return 'dinheiro'; if(p.metodo==='cartao')return p.cartaoTipo==='debito'?'debito':(p.cartaoTipo==='credito'?'credito':'cartao'); return 'dinheiro'; }
function periodoPedido(o){ var h=parseInt(String((o&&o.criadoEm)||'0').split(':')[0],10)||0; return h<16?'almoco':'janta'; }
function caixaDoDia(dia,periodo){
  dia=dia||hoje();
  var concl=(S.pedidos||[]).filter(function(p){return p.status==='concluido'&&p.dia===dia&&(!periodo||periodoPedido(p)===periodo);});
  var val={pix:0,debito:0,credito:0,dinheiro:0,cartao:0}, qtd={pix:0,debito:0,credito:0,dinheiro:0,cartao:0};
  var almT=0,janT=0,almN=0,janN=0,tot=0;
  concl.forEach(function(p){ var k=metodoCaixa(p); val[k]+=p.total; qtd[k]++; tot+=p.total; if(periodoPedido(p)==='almoco'){almT+=p.total;almN++;}else{janT+=p.total;janN++;} });
  return {dia:dia,val:val,qtd:qtd,almT:almT,janT:janT,almN:almN,janN:janN,tot:tot,n:concl.length};
}
// resumo de itens vendidos (do que saiu no período) pra noção de estoque
function caixaItens(dia,periodo){
  var concl=(S.pedidos||[]).filter(function(p){return p.status==='concluido'&&p.dia===dia&&(!periodo||periodoPedido(p)===periodo);});
  var m={};
  concl.forEach(function(p){ (p.itens||[]).forEach(function(i){ var nome=i.nome||'Item'; m[nome]=(m[nome]||0)+(i.qty||1); }); });
  return Object.keys(m).map(function(k){return {nome:k,qty:m[k]};}).sort(function(a,b){return b.qty-a.qty || String(a.nome).localeCompare(String(b.nome));});
}
/* impressão genérica por linhas (reaproveita o mesmo caminho: BT Android / iPhone MPU / compartilhar / sistema) */
function escposFromRows(rows){
  var B=[];
  function raw(){ for(var i=0;i<arguments.length;i++) B.push(arguments[i]&0xFF); }
  function txt(s){ s=foldAscii(s); for(var i=0;i<s.length;i++) B.push(s.charCodeAt(i)&0xFF); }
  raw(0x1B,0x40);
  rows.forEach(function(r){ raw(0x1B,0x61, r.align==='center'?1:0); raw(0x1B,0x45, r.bold?1:0); raw(0x1D,0x21, r.size>=26?0x11:0x00); txt(r.t); B.push(0x0A); });
  raw(0x1D,0x21,0x00); raw(0x1B,0x45,0); raw(0x1B,0x61,0); B.push(0x0A); B.push(0x0A); B.push(0x0A); B.push(0x0A);
  return new Uint8Array(B);
}
function canvasFromRows(rows){
  var W=384, PAD=6; function lh(sz){ return Math.round(sz*1.32); }
  var H=PAD*2; rows.forEach(function(r){ H+=lh(r.size); });
  var cv=document.createElement('canvas'); cv.width=W; cv.height=H;
  var g=cv.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H); g.fillStyle='#000'; g.textBaseline='top';
  var y=PAD; rows.forEach(function(r){ g.font=(r.bold?'bold ':'')+r.size+'px Menlo, "Courier New", monospace'; var tx=PAD; if(r.align==='center'){ var tw=g.measureText(r.t).width; tx=Math.max(PAD,(W-tw)/2); } g.fillText(r.t,tx,y); y+=lh(r.size); });
  return cv;
}
function htmlThermalFromRows(rows){
  var h='<div style="width:384px;max-width:100%;padding:6px;font-family:\'Courier New\',monospace;color:#000;background:#fff">';
  rows.forEach(function(r){ h+='<div style="font-size:'+r.size+'px;line-height:1.3;white-space:pre;'+(r.bold?'font-weight:bold;':'')+(r.align==='center'?'text-align:center;':'')+'">'+esc(r.t)+'</div>'; });
  return h+'</div>';
}
function mpuRows_(rows){ try{ var b64=btoa(unescape(encodeURIComponent(htmlThermalFromRows(rows)))); window.location.href='com.samathosoft.webprint://#deb64#'+b64; return true; }catch(e){ return false; } }
function shareRows_(rows,nome){ try{ var f=dataURLtoFile(canvasFromRows(rows).toDataURL('image/png'),(nome||'doc')+'.png'); if(navigator.canShare&&navigator.canShare({files:[f]})){ navigator.share({files:[f]}).then(function(){toast('Escolha o app da impressora','info');},function(){}); return true; } }catch(e){} return false; }
function fechamentoRows(dia,periodo){
  var cx=caixaDoDia(dia,periodo), Sz=19, rows=[];
  function row(t,size,bold,align){ rows.push({t:t,size:size||Sz,bold:!!bold,align:align||'left'}); }
  function sep(){ row('--------------------------------',Sz); }
  row('JAMAICA BURGUER',30,true,'center');
  row(periodo==='almoco'?'FECHAMENTO ALMOCO':(periodo==='janta'?'FECHAMENTO JANTA':'FECHAMENTO DE CAIXA'),20,true,'center');
  row(cx.dia,Sz,false,'center');
  row('Emitido as '+nowHM(),14,false,'center');
  sep();
  row(ln2('FORMA','VALOR'),Sz,true);
  row(ln2('Dinheiro ('+cx.qtd.dinheiro+')', money(cx.val.dinheiro)),Sz);
  row(ln2('PIX ('+cx.qtd.pix+')', money(cx.val.pix)),Sz);
  row(ln2('Cartao Debito ('+cx.qtd.debito+')', money(cx.val.debito)),Sz);
  row(ln2('Cartao Credito ('+cx.qtd.credito+')', money(cx.val.credito)),Sz);
  if(cx.qtd.cartao) row(ln2('Cartao s/ tipo ('+cx.qtd.cartao+')', money(cx.val.cartao)),Sz);
  sep();
  if(!periodo){ row(ln2('Almoco ('+cx.almN+')', money(cx.almT)),Sz); row(ln2('Janta ('+cx.janN+')', money(cx.janT)),Sz); sep(); }
  row(ln2('TOTAL ('+cx.n+' pedidos)', money(cx.tot)),24,true);
  sep();
  var itens=caixaItens(dia,periodo);
  if(itens.length){ row('ITENS VENDIDOS',Sz,true,'center'); itens.forEach(function(x){ row(ln2(x.nome, x.qty+'x'),Sz); }); sep(); }
  row('Conferido por:',Sz); row('',Sz); row('____________________________',Sz);
  return rows;
}
function imprimirFechamento(dia,periodo){
  var rows=fechamentoRows(dia,periodo);
  if(btpConectado()){ return btpWrite(escposFromRows(rows)).then(function(){ toast('Fechamento enviado a impressora','ok'); }, function(){ abrirFechamento_(rows); }); }
  if(btpSupported() && BTP.device){ return btpReconnect().then(function(ok){ if(ok){ return btpWrite(escposFromRows(rows)).then(function(){ toast('Fechamento enviado a impressora','ok'); }); } if(isIOS()&&mpuRows_(rows)) return; if(isTouchShare()&&shareRows_(rows,'fechamento')) return; abrirFechamento_(rows); }); }
  if(isIOS() && mpuRows_(rows)) return;
  if(isTouchShare() && shareRows_(rows,'fechamento')) return;
  abrirFechamento_(rows);
}
function abrirFechamento_(rows){
  var html=htmlThermalFromRows(rows); var pa=$('print-area'); if(pa) pa.innerHTML=html; UI._docRows=rows;
  var btns='';
  if(isIOS()) btns+='<button class="btn btn-primary btn-block" data-action="do-doc-mpu">'+ic('printer')+' Imprimir (Mobile Print Util)</button>';
  if(isTouchShare()) btns+='<button class="btn btn-outline btn-block" style="margin-top:8px" data-action="do-doc-share">'+ic('printer')+' Compartilhar imagem</button>';
  btns+='<button class="btn '+(isIOS()?'btn-ghost':'btn-primary')+' btn-block" style="margin-top:8px" data-action="do-print">'+ic('printer')+' Impressão do sistema</button><button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="close-modal">Fechar</button>';
  modal('<h2 class="center">Fechamento de caixa</h2>'+html+'<div class="sticky-cta">'+btns+'</div>',true);
  if(!isTouchShare()) setTimeout(function(){ try{ window.print(); }catch(e){} },400);
}
on('do-doc-mpu',function(){ if(UI._docRows) mpuRows_(UI._docRows); });
on('do-doc-share',function(){ if(UI._docRows) shareRows_(UI._docRows,'fechamento'); });
on('adm-fechamento',function(){ imprimirFechamento(hoje()); });
on('adm-fechar-caixa',function(d){ imprimirFechamento(hoje(), d.p==='janta'?'janta':'almoco'); });

/* Cardápio (admin) */
function admCardapio(){
  var admin=isAdmin();
  var h='<div class="pagehead"><h2>Cardápio</h2><p>'+S.produtos.filter(function(p){return p.disp!=='oculto';}).length+' produtos ativos</p></div>';
  if(admin) h+='<div class="row2"><button class="btn btn-primary" data-action="adm-novo-produto">'+ic('plus')+' Novo produto</button><button class="btn btn-ghost" data-action="adm-mais" data-m="categorias">'+ic('tag')+' Categorias</button></div><div class="sp-sm"></div>';
  else h+='<div class="notice info">'+ic('info')+'<div>Você (atendente) pode ligar/desligar a venda do dia. Preço, foto e cadastro são com o dono.</div></div>';
  catsOrd().forEach(function(c){
    var items=S.produtos.filter(function(p){return p.cat===c.id;}).sort(function(a,b){return a.ordem-b.ordem;});
    if(!items.length) return;
    h+='<div class="adm-sec-t">'+esc(c.nome)+' ('+items.length+')'+(c.oculta?' · <span class="tag">oculta</span>':'')+'</div>';
    h+='<div class="padm-grid">'+items.map(function(p){
      var on=p.disp==='disponivel';
      var nameCell='<div class="pa-b"'+(admin?' data-action="adm-edit-produto" data-id="'+p.id+'" style="cursor:pointer"':'')+'><div class="pa-n">'+esc(p.nome)+(p.disp==='oculto'?' <span class="tag">oculto</span>':p.disp==='esgotado'?' <span class="tag">esgotado</span>':'')+'</div><div class="pa-p">'+money(p.preco)+'</div></div>';
      return '<div class="padm"><img class="pa-img" src="'+prodImg(p)+'" alt="">'+nameCell+
        '<div class="switch'+(on?' on':'')+'" data-action="adm-toggle-disp" data-id="'+p.id+'" role="button" aria-label="Disponível hoje"></div></div>';
    }).join('')+'</div>';
  });
  return h;
}
function admCategorias(){
  var cs=catsOrd();
  var h='<div class="pagehead"><h2>Categorias</h2><p>Organize as seções do cardápio</p></div>';
  h+=cs.map(function(c,i){
    return '<div class="padm"><div class="pa-b"><div class="pa-n">'+esc(c.nome)+(c.oculta?' <span class="tag">oculta</span>':'')+'</div><div class="pa-p muted">'+S.produtos.filter(function(p){return p.cat===c.id;}).length+' produto(s)</div></div>'+
      '<div class="cat-actions">'+
      '<button class="btn btn-sm btn-ghost" data-action="cat-up" data-id="'+c.id+'" aria-label="Subir"'+(i===0?' disabled':'')+'>'+ic('back','rot90')+'</button>'+
      '<button class="btn btn-sm btn-ghost" data-action="cat-down" data-id="'+c.id+'" aria-label="Descer"'+(i===cs.length-1?' disabled':'')+'>'+ic('chev','rot90')+'</button>'+
      '<button class="btn btn-sm btn-ghost" data-action="cat-ren" data-id="'+c.id+'" aria-label="Renomear">'+ic('edit')+'</button>'+
      '<div class="switch'+(!c.oculta?' on':'')+'" data-action="cat-oculta" data-id="'+c.id+'" role="button" aria-label="Visível"></div></div></div>';
  }).join('');
  h+='<button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="cat-add">'+ic('plus')+' Nova categoria</button>';
  h+='<div class="notice info">'+ic('info')+'<div>Ocultar uma categoria some ela do cardápio do cliente sem apagar o histórico de pedidos.</div></div>';
  return h;
}
/* Promoções */
function admPromos(){
  var h='<div class="pagehead"><h2>Promoções e ofertas</h2><p>Combos, cupons e destaques que aparecem no app do cliente</p></div>';
  h+='<button class="btn btn-primary btn-block" data-action="adm-promo-novo">'+ic('plus')+' Nova promoção / combo</button><div class="sp-sm"></div>';
  if(!(S.promos||[]).length){ h+='<div class="empty">'+ic('percent','big')+'Nenhuma promoção cadastrada.</div>'; }
  else h+=S.promos.map(function(p){
    return '<div class="padm"><div class="pa-img promo-mini">'+ic('percent')+'</div>'+
      '<div class="pa-b" data-action="adm-promo-edit" data-id="'+p.id+'" style="cursor:pointer"><div class="pa-n">'+esc(p.titulo)+(p.ativo?'':' <span class="tag">inativa</span>')+'</div><div class="pa-p">'+esc(p.desc)+' · <span class="gold">'+money(p.preco)+'</span></div></div>'+
      '<div class="switch'+(p.ativo?' on':'')+'" data-action="adm-promo-toggle" data-id="'+p.id+'" role="button" aria-label="Ativa"></div></div>';
  }).join('');
  h+='<div class="notice info">'+ic('info')+'<div>Promoções ativas aparecem em destaque no topo do cardápio do cliente. O combo/oferta é um cartão promocional (o pedido continua sendo montado pelos itens do cardápio).</div></div>';
  return h;
}
function promoForm(p){
  var novo=!p; p=p||{titulo:'',desc:'',preco:'',ativo:true,id:null};
  return '<h2>'+(novo?'Nova promoção':'Editar promoção')+'</h2>'+
    '<div class="field"><label>Título</label><input id="pr-t" value="'+esc(p.titulo)+'" placeholder="Ex.: Combo Casal"></div>'+
    '<div class="field"><label>Descrição</label><textarea id="pr-d" placeholder="O que inclui a oferta">'+esc(p.desc)+'</textarea></div>'+
    '<div class="field"><label>Preço da oferta (R$)</label><input id="pr-p" inputmode="decimal" value="'+esc(p.preco)+'"></div>'+
    '<div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="adm-promo-save" data-id="'+(p.id||'')+'">'+(novo?'Criar promoção':'Salvar')+'</button>'+
    (novo?'':'<button class="btn btn-red btn-block" style="margin-top:8px" data-action="adm-promo-rm" data-id="'+p.id+'">Remover</button>')+'</div>';
}

/* Mais */
function admMais(){
  var h='<div class="pagehead"><h2>Mais</h2><p>Configurações e relatórios</p></div>';
  var mods=ADM_MODS.filter(function(m){return modAllowed(m[0]);});
  h+='<div class="mod-grid">'+mods.map(function(m){ return '<button class="modrow" data-action="adm-mais" data-m="'+m[0]+'"><div class="m-ic">'+ic(m[1])+'</div><div><div class="m-t">'+m[2]+'</div><div class="m-s">'+m[3]+'</div></div><div class="m-ch">'+ic('chev')+'</div></button>'; }).join('')+'</div>';
  if(!isAdmin()) h+='<div class="notice info">'+ic('lock')+'<div>Os demais módulos (promoções, pagamentos, relatórios, clientes, equipe, entregas, marca) são exclusivos do dono.</div></div>';
  return h;
}
function admMaisModulo(m){
  var back='<div class="backbar"><button class="backbtn" data-action="adm-mais-back">'+ic('back')+' Voltar</button></div>';
  var fn={promocoes:admPromos,categorias:admCategorias,entregas:admEntregas,horarios:admHorarios,pagamentos:admPagamentos,impressao:admImpressao,relatorios:admRelatorios,clientes:admClientes,equipe:admEquipe,marca:admMarca}[m];
  return back+(fn?fn():'');
}
function admEntregas(){
  var l=S.loja;
  return '<div class="pagehead"><h2>Entregas</h2><p>Taxa e retirada</p></div>'+
    '<div class="card"><div class="field"><label>Taxa de entrega (R$) — fixa para todos os endereços</label><input id="ent-taxa" inputmode="decimal" value="'+esc(l.taxaEntrega)+'"></div>'+
    '<div class="field"><label>Prazo estimado</label><input id="ent-prazo" value="'+esc(l.prazoEntrega||'')+'"></div>'+
    '<div class="bigopt'+(l.retirada?' sel':'')+'" data-action="adm-toggle-retirada"><div class="bo-ic">'+ic('store')+'</div><div><div class="bo-t">Retirada no local</div><div class="bo-s">'+(l.retirada?'Ativada':'Desligada')+'</div></div></div>'+
    '<button class="btn btn-primary btn-block" data-action="adm-save-entregas">Salvar</button></div>'+
    '<div class="notice info">'+ic('info')+'<div>A taxa de entrega é a mesma para qualquer bairro (definição do Jamaica Burguer). O cliente digita o bairro manualmente no endereço.</div></div>';
}
function admHorarios(){
  var l=S.loja, js=janelasLoja(), ab=lojaAberta();
  var linhas=js.map(function(w,i){
    return '<div class="field" style="display:flex;gap:8px;align-items:flex-end">'+
      '<div style="flex:1"><label>Abre</label><input type="time" id="jr-a'+i+'" value="'+esc(w[0])+'"></div>'+
      '<div style="flex:1"><label>Fecha</label><input type="time" id="jr-b'+i+'" value="'+esc(w[1])+'"></div>'+
      '<button class="btn btn-ghost" data-action="adm-jan-rm" data-i="'+i+'">Remover</button></div>';
  }).join('');
  return '<div class="pagehead"><h2>Horários</h2></div>'+
    '<div class="notice '+(ab?'info':'warn')+'">'+ic(ab?'checkc':'clock')+'<div>Agora a loja está <strong>'+(ab?'ABERTA':'FECHADA')+'</strong> (horário de Breu Branco/PA). Ela abre e fecha sozinha conforme as janelas abaixo.</div></div>'+
    '<div class="card"><div class="field"><label>Janelas de funcionamento (todos os dias)</label></div><div id="janelas">'+linhas+'</div>'+
    '<button class="btn btn-ghost btn-block" data-action="adm-jan-add">'+ic('plus')+' Adicionar horário</button>'+
    '<div class="sp"></div><button class="btn btn-primary btn-block" data-action="adm-save-horarios">Salvar horários</button></div>'+
    '<div class="bigopt'+(l.pausado?' sel':'')+'" data-action="adm-toggle-pausa"><div class="bo-ic">'+ic(l.pausado?'x':'checkc')+'</div><div><div class="bo-t">'+(l.pausado?'PAUSADA manualmente (fechada)':'Seguindo o horário automático')+'</div><div class="bo-s">'+(l.pausado?'Toque para voltar a abrir no horário':'Toque para fechar agora, mesmo dentro do horário')+'</div></div></div>'+
    '<div class="notice info">'+ic('info')+'<div>Fora do horário, o cliente monta o pedido normalmente, mas ao avançar vê "Infelizmente estamos fechado no momento". A pausa serve pra fechar antes por algum imprevisto.</div></div>';
}
function admPagamentos(){
  var l=S.loja;
  return '<div class="pagehead"><h2>Pagamentos</h2></div>'+
    '<div class="card"><div class="field"><label>Chave Pix</label><input id="pg-key" value="'+esc(l.pixKey)+'"></div>'+
    '<div class="field"><label>Nome do favorecido</label><input id="pg-nome" value="'+esc(l.pixNome)+'"></div>'+
    '<div class="bigopt'+(l.aceitaPix?' sel':'')+'" data-action="adm-toggle-pag" data-k="aceitaPix"><div class="bo-ic">'+ic('pix')+'</div><div><div class="bo-t">Pix com comprovante</div><div class="bo-s">'+(l.aceitaPix?'Aceitando':'Desligado')+'</div></div></div>'+
    '<div class="bigopt'+(l.aceitaDinheiro?' sel':'')+'" data-action="adm-toggle-pag" data-k="aceitaDinheiro"><div class="bo-ic">'+ic('cash')+'</div><div><div class="bo-t">Dinheiro no local</div><div class="bo-s">'+(l.aceitaDinheiro?'Aceitando':'Desligado')+'</div></div></div>'+
    '<div class="bigopt'+(l.aceitaCartao?' sel':'')+'" data-action="adm-toggle-pag" data-k="aceitaCartao"><div class="bo-ic">'+ic('card')+'</div><div><div class="bo-t">Cartão no local</div><div class="bo-s">'+(l.aceitaCartao?'Aceitando':'Desligado')+'</div></div></div>'+
    '<button class="btn btn-primary btn-block" data-action="adm-save-pag">Salvar</button></div>'+
    '<div class="notice info">'+ic('info')+'<div>O sistema nunca guarda dados de cartão. Pix automático (confirmação sozinha) é a próxima fase.</div></div>';
}
function admImpressao(){
  var androidBt=btpSupported();
  return '<div class="pagehead"><h2>Impressão</h2></div>'+
    '<div class="card"><p class="muted" style="margin-top:0">Toque para imprimir um cupom de teste e conferir na impressora.</p>'+
    '<button class="btn btn-primary btn-block" data-action="adm-test-print">'+ic('printer')+' Imprimir cupom de teste</button></div>'+
    (androidBt
      ? '<div class="card"><div class="dp-line"><span>Impressora Bluetooth</span><strong>'+(btpConectado()?'Conectada':'Desconectada')+'</strong></div>'+
        '<button class="btn '+(btpConectado()?'btn-outline':'btn-primary')+' btn-block" data-action="'+(btpConectado()?'adm-bt-disconnect':'adm-bt-connect')+'">'+ic('printer')+(btpConectado()?' Desconectar impressora':' Conectar impressora Bluetooth')+'</button>'+
        '<p class="muted" style="margin-top:8px">No Android (Chrome): toque em Conectar, escolha a <strong>KP-1025</strong> e pronto. Depois, "Aceitar e imprimir" já sai na hora, sem app.</p></div>'
      : '<div class="notice info">'+ic('info')+'<div><strong>No iPhone:</strong> instale o app grátis <strong>Mobile Print Util</strong> e pareie a KP-1025 nele uma vez. Depois, ao tocar em "Aceitar e imprimir", o iPhone abre o app e o cupom sai em 58mm (2 a 3 toques). Deixe o app pareado no balcão.</div></div>')+
    '<div class="notice warn">'+ic('warn')+'<div>Como o celular não confirma se o papel saiu, todo pedido tem "Reimprimir cupom", e a 2ª via vem marcada como REIMPRESSÃO pra não duplicar produção.</div></div>';
}
function admRelatorios(){
  var per=UI.adm.relPer||'tudo';
  var lim = per==='hoje'?0 : per==='7'?7 : per==='30'?30 : null;
  var agora=Date.now();
  var concl=S.pedidos.filter(function(p){ if(p.status!=='concluido') return false;
    if(per==='hoje') return p.dia===hoje();
    if(lim) return (agora-(p.ts||agora))<=lim*86400000;
    return true; });
  var fat=concl.reduce(function(a,p){return a+p.total;},0);
  var ticket=concl.length?fat/concl.length:0;
  var canc=S.pedidos.filter(function(p){return p.status==='recusado'||p.status==='cancelado';});
  var contagem={}; concl.forEach(function(p){ p.itens.forEach(function(i){ contagem[i.nome]=(contagem[i.nome]||0)+i.qty; }); });
  var rank=Object.keys(contagem).map(function(k){return [k,contagem[k]];}).sort(function(a,b){return b[1]-a[1];}).slice(0,5);
  var pag={pix:0,dinheiro:0,cartao:0}; concl.forEach(function(p){ pag[p.pay.metodo]=(pag[p.pay.metodo]||0)+1; });
  var deliv=concl.filter(function(p){return p.tipo==='delivery';}).length, ret=concl.length-deliv;
  var dias=[0,0,0,0,0,0,0]; concl.forEach(function(p){ dias[new Date(p.ts||agora).getDay()]+=p.total; });
  var maxd=Math.max.apply(null,dias.concat([1])); var nomes=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  var h='<div class="pagehead"><h2>Relatórios</h2><p>Só pedidos concluídos</p></div>';
  h+='<div class="filters">'+[['hoje','Hoje'],['7','7 dias'],['30','30 dias'],['tudo','Tudo']].map(function(x){return '<button class="chip'+(per===x[0]?' on':'')+'" data-action="adm-rel-per" data-p="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  h+='<div class="kpi-grid">'+kpiPlain(money(fat),'Faturamento','tag',true)+kpiPlain(concl.length,'Pedidos','checkc')+kpiPlain(money(ticket),'Ticket médio','star')+kpiPlain(canc.length,'Recusados/cancel.','x')+'</div>';
  h+='<div class="adm-sec-t">Faturamento por dia</div><div class="card"><div class="chart">'+dias.map(function(v,i){ return '<div class="bar-wrap"><div class="bar" style="height:'+Math.round(v/maxd*100)+'%" title="'+money(v)+'"></div><small>'+nomes[i]+'</small></div>'; }).join('')+'</div>'+(fat===0?'<div class="empty" style="padding:12px">Sem faturamento no período.</div>':'')+'</div>';
  h+='<div class="admin-cols"><div><div class="adm-sec-t">Mais vendidos</div><div class="card">'+(rank.length?rank.map(function(r,i){return '<div class="rank"><span class="rn">'+(i+1)+'</span><div class="rb"><div class="rt">'+esc(r[0])+'</div><div class="rs">'+r[1]+' unidades</div></div></div>';}).join(''):'<div class="empty">Sem dados.</div>')+'</div></div>';
  h+='<div><div class="adm-sec-t">Por pagamento</div><div class="card"><div class="dp-line"><span>Pix</span><strong>'+pag.pix+'</strong></div><div class="dp-line"><span>Dinheiro</span><strong>'+pag.dinheiro+'</strong></div><div class="dp-line"><span>Cartão</span><strong>'+pag.cartao+'</strong></div></div>'+
     '<div class="adm-sec-t">Entrega x Retirada</div><div class="card"><div class="dp-line"><span>Delivery</span><strong>'+deliv+'</strong></div><div class="dp-line"><span>Retirada</span><strong>'+ret+'</strong></div></div></div></div>';
  h+='<div class="adm-sec-t">Recusas e cancelamentos</div><div class="card">'+(canc.length?canc.slice(0,8).map(function(p){return '<div class="dp-line"><span>'+esc(p.id)+' · '+esc(p.dia)+'</span><span>'+esc(p.pay.motivoRecusa||(p.status==='cancelado'?'cancelado':'recusado'))+'</span></div>';}).join(''):'<div class="empty">Nenhuma.</div>')+'</div>';
  return h;
}
function admClientes(){
  var q=(UI.adm.cliQ||'').trim().toLowerCase(), f=UI.adm.cliFilter||'todos';
  var lista=S.clientes.filter(function(c){
    if(q && (c.nome+' '+c.tel).toLowerCase().indexOf(q)<0) return false;
    var s=clienteStats(c.tel);
    if(f==='novos') return c.criadoEm===hoje();
    if(f==='compraram') return s.concl>=1;
    if(f==='recorrentes') return s.concl>=2;
    if(f==='sem') return s.total===0;
    if(f==='bloq') return c.bloq;
    return true;
  });
  var recorrentes=S.clientes.filter(function(c){return clienteStats(c.tel).concl>=2;}).length;
  var h='<div class="pagehead"><h2>Clientes</h2><p>'+S.clientes.length+' na base · '+recorrentes+' recorrentes</p></div>';
  h+='<div class="search">'+ic('search')+'<input placeholder="Buscar por nome ou telefone..." value="'+esc(UI.adm.cliQ||'')+'" data-oninput="cli-busca"></div>';
  h+='<div class="filters">'+[['todos','Todos'],['novos','Novos'],['compraram','Compraram'],['recorrentes','Recorrentes'],['sem','Sem pedidos'],['bloq','Bloqueados']].map(function(x){return '<button class="chip'+(f===x[0]?' on':'')+'" data-action="adm-cli-filter" data-f="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div>';
  if(!lista.length){ h+='<div class="empty">Nenhum cliente neste filtro.</div>'; return h; }
  h+='<div class="cli-grid">'+lista.map(function(c){ var s=clienteStats(c.tel);
    return '<button class="clirow" data-action="adm-cliente" data-tel="'+esc(c.tel)+'"><div class="cl-av">'+esc((c.nome||'?').charAt(0).toUpperCase())+'</div>'+
      '<div><div class="cl-n">'+esc(c.nome)+(c.bloq?' <span class="tag">bloqueado</span>':'')+'</div><div class="cl-s">'+esc(maskTel(c.tel))+' · '+s.concl+' pedido(s)</div></div>'+
      '<div class="cl-r"><b>'+money(s.gasto)+'</b><div class="muted small2">gasto</div></div></button>';
  }).join('')+'</div>';
  return h;
}
function admEquipe(){
  return '<div class="pagehead"><h2>Equipe</h2><p>Quem acessa o painel</p></div>'+
    S.equipe.map(function(u){ return '<div class="clirow"><div class="cl-av">'+esc(u.nome.charAt(0))+'</div><div><div class="cl-n">'+esc(u.nome)+'</div><div class="cl-s">@'+esc(u.user)+' · '+(u.papel==='admin'?'Dono (acesso total)':'Atendente (pedidos e cardápio do dia)')+'</div></div></div>'; }).join('')+
    '<div class="notice info">'+ic('info')+'<div>Na versão final cada pessoa tem login próprio; o atendente não mexe em Pix, relatórios nem exclui produto. Toda ação fica registrada com data/hora/usuário.</div></div>';
}
function admMarca(){
  var l=S.loja;
  return '<div class="pagehead"><h2>Marca</h2></div>'+
    '<div class="card"><div class="mk-logo-wrap"><img id="mk-logo" src="assets/logo-jamaica.jpg" alt=""><button class="btn btn-outline btn-sm" data-action="adm-trocar-logo">'+ic('camera')+' Trocar logo</button></div>'+
    '<div class="field" style="margin-top:12px"><label>Nome exibido</label><input id="mk-nome" value="'+esc(l.nome)+'"></div>'+
    '<div class="field"><label>Banner promocional (texto)</label><input id="mk-banner" value="'+esc(l.banner)+'" placeholder="Ex.: Peça pelo app e ganhe brinde"></div>'+
    '<div class="field"><label>Endereço</label><input id="mk-end" value="'+esc(l.endereco)+'"></div>'+
    '<div class="field"><label>WhatsApp oficial</label><input id="mk-whats" value="'+esc(l.whats)+'"></div>'+
    '<button class="btn btn-primary btn-block" data-action="adm-save-marca">Salvar</button></div>';
}

/* ============================================================================
   HANDLERS — CLIENTE
   ============================================================================ */
on('cli-go',function(d){ UI.cli.screen=d.s; render(); var sc=document.querySelector('.scroll'); if(sc)sc.scrollTop=0; window.scrollTo(0,0); });
on('cli-search',function(d,t){ UI.cli.q=t.value; var l=$('menu-list'); if(l) l.innerHTML=menuInner(); var cc=$('cli-cats'); if(cc) cc.innerHTML=catsChips(); });
on('cli-cat',function(d){ UI.cli.cat=d.c; UI.cli.q=''; render(); });
on('cli-prod',function(d){ abrirProduto(d.id); });
on('cart-edit',function(d){ var i=+d.i; var it=UI.cart[i]; if(it) abrirProduto(it.prodId,i); });
on('pd-var',function(d){ pdSel.varIdx=+d.v; patchPd(); });
on('pd-feijao',function(d){ pdSel.feijao=d.f; patchPd(); });
on('pd-sabor',function(d){ pdSel.sabor=d.f; patchPd(); });
on('ver-img',function(d){
  if(!d.src) return;
  modal('<div class="imgzoom-wrap" data-action="img-zoom"><img class="imgzoom" src="'+d.src+'" alt="Comprovante"></div>'+
    '<div class="imgzoom-cap">'+ic('search')+' Toque na imagem para ampliar ou reduzir</div>'+
    '<div class="sticky-cta"><button class="btn btn-ghost btn-block" data-action="close-modal">Fechar</button></div>', true);
});
on('img-zoom',function(d,t){ if(t) t.classList.toggle('zoomed'); });
on('pd-adic',function(d){ var g=+d.g, i=+d.i, dd=+d.d; var p=prod(UI._pdId); if(!p)return; var gr=(p.grupos||[])[g]; if(!gr)return;
  var git=gr.itens[i]; if(dd>0 && git && adicEsgotado_(git.nome)){ toast(git.nome+' está esgotado hoje','err'); return; }
  pdSel.g[g]=pdSel.g[g]||{}; var cur=pdSel.g[g][i]||0;
  if(dd>0 && gr.max>0 && grpSum(g)>=gr.max){ toast('Você pode escolher até '+gr.max+' em '+gr.nome,'err'); return; }
  var nv=cur+dd; if(nv<0)nv=0; pdSel.g[g][i]=nv; patchPd(); });
on('pd-qty',function(d){ pdSel.qty=Math.max(1,pdSel.qty+(+d.d)); patchPd(); });
on('pd-obs',function(d,t){ pdSel.obs=t.value; });
function patchPd(){ var p=prod(UI._pdId); if(!p) return; var m=document.querySelector('#modal-root .modal'); if(!m) return;
  m.innerHTML='<div class="modal-grip"></div><button class="modal-x" data-action="close-modal" aria-label="Fechar">'+ic('x')+'</button>'+pdHTML(p); }
on('pd-add',function(d){
  var p=prod(d.id); if(!p) return;
  var vars=pdVars(p), varNome='', inclui=[], base=p.preco;
  if(vars){ if(pdSel.varIdx<0){ toast('Escolha uma opção','err'); return; } var v=vars[pdSel.varIdx]; varNome=v.nome; inclui=v.inclui||[]; base=varPreco(v); }
  var adics=[];
  (p.grupos||[]).forEach(function(gr,gi){ var sel=pdSel.g[gi]||{}; gr.itens.forEach(function(it,ii){ var q=sel[ii]||0; if(q>0 && !adicEsgotado_(it.nome)) adics.push({nome:it.nome,preco:it.preco,qty:q}); }); });
  var unit=base+adics.reduce(function(a,x){return a+x.preco*x.qty;},0);
  var feijao=(vars&&vars[pdSel.varIdx]&&vars[pdSel.varIdx].feijao)?(ehNoite()?'Feijão tropeiro':(pdSel.feijao||FEIJOES[0])):null;
  var sabor=(p.sabores&&p.sabores.length)?(pdSel.sabor||p.sabores[0]):null;
  var item={prodId:p.id,nome:p.nome,cat:p.cat,hue:p.hue,foto:p.foto,base:base,varNome:varNome,inclui:inclui,adics:adics,feijao:feijao,sabor:sabor,qty:pdSel.qty,obs:pdSel.obs,preco:unit};
  if(pdSel.edit!=null){ UI.cart[pdSel.edit]=item; toast('Item atualizado','ok'); }
  else { UI.cart.push(item); toast(pdSel.qty+'x '+p.nome+' na sacola','ok'); }
  saveCliente(); closeModal(); render();
});
on('cart-inc',function(d){ UI.cart[+d.i].qty++; saveCliente(); render(); });
on('cart-dec',function(d){ var i=+d.i; if(UI.cart[i].qty>1){ UI.cart[i].qty--; saveCliente(); render(); } else H['cart-rm'](d); });
on('cart-rm',function(d){ var i=+d.i; var it=UI.cart[i]; if(!it) return;
  confirmar('Remover item?','Remover "'+it.nome+'" da sacola?','Remover',function(){ UI.cart.splice(i,1); saveCliente(); render(); toast('Item removido','info'); },true); });
function revalidarCarrinho(){
  var avisos=[];
  for(var i=UI.cart.length-1;i>=0;i--){
    var it=UI.cart[i], p=prod(it.prodId);
    if(!p || p.disp!=='disponivel'){ avisos.push(it.nome+' saiu do cardápio'); UI.cart.splice(i,1); continue; }
    var novo=(it.base||p.preco)+(it.adics||[]).reduce(function(a,x){return a+x.preco*(x.qty||1);},0);
    if(novo!==it.preco){ it.preco=novo; }
  }
  return avisos;
}
on('cart-continuar',function(){
  if(!UI.cart.length){ toast('Sua sacola está vazia','err'); return; }
  var av=revalidarCarrinho();
  if(av.length){ render(); toast(av[0],'info'); if(!UI.cart.length) return; }
  if(S.loja.minPedido>0 && cartSubtotal()<S.loja.minPedido){ toast('Pedido mínimo de '+money(S.loja.minPedido),'err'); render(); return; }
  UI.cli.screen='receber'; render();
});
on('chk-modo',function(d){ UI.chk.modo=d.m; UI.cli.screen=(d.m==='delivery'?'endereco':'dados'); render(); });
on('chk-endsalvo',function(d){ var e=UI.me.enderecos[+d.i]; UI.chk.bairro=e.bairro||''; UI.chk.rua=e.rua||''; UI.chk.numero=e.numero||''; UI.chk.comp=e.comp||''; UI.chk.ref=e.ref||''; render(); });
on('chk-f',function(d,t){ UI.chk[d.k]=t.value; });
on('chk-endok',function(){
  var c=UI.chk;
  if(!(c.bairro||'').trim()){ toast('Informe o bairro','err'); return; }
  if(!(c.rua||'').trim()){ toast('Informe a rua ou avenida','err'); return; }
  if(!(c.numero||'').trim()){ toast('Informe o número','err'); return; }
  if(!(c.ref||'').trim()){ toast('Informe um ponto de referência','err'); return; }
  if(!lojaAberta()){ toast('Infelizmente estamos fechado no momento','err'); return; }
  UI.cli.screen='dados'; render();
});
on('chk-dadosok',function(){
  var c=UI.chk;
  var nome=(c.nome||UI.me.nome||'').trim(), whats=(c.whats||UI.me.tel||'').trim();
  if(!nome){ toast('Informe seu nome','err'); return; }
  if(!telValido(whats)){ toast('Cadastre um WhatsApp válido com DDD — o restaurante precisa dele pra avisar sobre o pedido','err'); return; }
  c.nome=nome; c.whats=whats;   // fixa os valores (inclusive quando vieram do perfil já cadastrado)
  if(!lojaAberta()){ toast('Infelizmente estamos fechado no momento','err'); return; }
  UI.cli.screen='pagamento'; render();
});
on('chk-pay',function(d){ UI.chk.pay=d.p; render(); });
on('chk-copiapix',function(){ var code=pixAtual().code; try{ navigator.clipboard.writeText(code).then(function(){ toast('Código Pix copiado','ok'); },function(){ toast('Toque no código e segure para copiar','info'); }); }catch(e){ toast('Toque no código e segure para copiar','info'); } });
on('chk-upload',function(){ pickImage(function(u){ UI.chk.comprov=u; render(); toast('Comprovante anexado','ok'); }); });
on('chk-finalizar',function(){
  var c=UI.chk;
  if(!lojaAberta()){ toast('Infelizmente estamos fechado no momento','err'); return; }
  if(!c.pay){ toast('Escolha a forma de pagamento','err'); return; }
  if(c.pay==='pix' && !c.comprov){ toast('Anexe o comprovante do Pix','err'); return; }
  var av=revalidarCarrinho();
  if(av.length){ toast(av[0]+'. Confira a sacola.','err'); UI.cli.screen='carrinho'; render(); return; }
  if(c.modo==='delivery' && c.bairro!=='__outro'){ var b=bairro(c.bairro); if(b&&b.min>0&&cartSubtotal()<b.min){ toast('Pedido mínimo de '+money(b.min)+' para '+c.bairro,'err'); return; } }
  criarPedido();
});
// Pix sem conseguir anexar: cria o pedido do mesmo jeito (cai no painel "em validação") e abre o WhatsApp pra mandar o comprovante
// PASSO 1: só abre o WhatsApp (NÃO cria o pedido) e destrava o botão "já enviei"
on('chk-pix-whats-abrir',function(){
  var c=UI.chk; if(c.pay!=='pix') return;
  var nome=(c.nome||UI.me.nome||'').trim();
  var msg='Olá! Sou '+(nome||'cliente')+' e vou enviar o comprovante do Pix do meu pedido do Jamaica Burguer por aqui.';
  c.waAberto=true; persistChk();   // salva ANTES de sair pro WhatsApp: se o app recarregar, volta na tela do Pix com o botão liberado
  try{ window.open(waLink(S.loja.whats,msg),'_blank'); }catch(e){}
  render();
  toast('Mande o print no WhatsApp e volte pra tocar em "Já enviei o comprovante".','info');
});
// PASSO 2: só libera depois do passo 1 -> aí sim cria o pedido e vai pra guia do pedido (igual cartão/dinheiro)
on('chk-pix-whats-enviei',function(){
  var c=UI.chk;
  if(c.pay!=='pix'){ toast('Escolha o Pix','err'); return; }
  if(!c.waAberto){ toast('Primeiro toque em "Enviar comprovante no WhatsApp" e mande o print.','err'); return; }
  if(!lojaAberta()){ toast('Infelizmente estamos fechado no momento','err'); return; }
  var av=revalidarCarrinho();
  if(av.length){ toast(av[0]+'. Confira a sacola.','err'); UI.cli.screen='carrinho'; render(); return; }
  if(c.modo==='delivery' && c.bairro!=='__outro'){ var b=bairro(c.bairro); if(b&&b.min>0&&cartSubtotal()<b.min){ toast('Pedido mínimo de '+money(b.min)+' para '+c.bairro,'err'); return; } }
  c.comprov=null; c.viaWhats=true;
  criarPedido();   // status em_validacao (comprovante pelo WhatsApp) -> vai pra guia do pedido
});
function waComprovanteMsg_(o){ return 'Olá! Fiz o pedido '+o.id+' pelo app'+(o.nome?' no nome de '+o.nome:'')+' e vou enviar o comprovante do Pix por aqui.'; }
function criarPedido(){
  var c=UI.chk, sub=cartSubtotal(), taxa=c.modo==='delivery'?(S.loja.taxaEntrega||0):0, desc=descontoValor(sub);
  var payMap={pix:'Pix com comprovante',dinheiro:'Dinheiro no local',cartao:'Cartão no local'};
  var status = c.pay==='pix' ? 'em_validacao' : 'aguardando_aceite';
  var endComp = c.modo==='delivery' ? ((c.rua||'')+', '+(c.numero||'')) : '';
  var ped={ id:'#'+(++seedCounter), tel:c.whats, nome:c.nome, tipo:c.modo,
    bairro:c.modo==='delivery'?c.bairro:'', end:endComp, comp:c.comp||'', ref:c.ref||'', entregaSobConsulta:false,
    itens:JSON.parse(JSON.stringify(UI.cart)), subtotal:sub, taxa:taxa, desconto:desc, cupom:(UI.cupom?UI.cupom.code:''), total:sub-desc+taxa, obs:c.obs||'',
    pay:{ metodo:c.pay, label:payMap[c.pay], status:c.pay==='pix'?'enviado':'pendente', comprovante:c.comprov||null, viaWhats:!!c.viaWhats, troco:c.troco||'' },
    status:status, criadoEm:nowHM(), dia:hoje(), ts:Date.now(),
    historico:[{t:nowHM(),who:'Cliente',act:'Pedido criado'}], reimpressoes:0 };
  S.pedidos.unshift(ped);
  UI.me.nome=c.nome; UI.me.tel=c.whats;
  if(c.modo==='delivery'&&c.rua){ var ex=(UI.me.enderecos||[]).filter(function(e){return e.rua===c.rua&&e.numero===c.numero;})[0]; if(!ex) UI.me.enderecos.unshift({bairro:c.bairro,rua:c.rua,numero:c.numero,comp:c.comp,ref:c.ref,end:endComp}); }
  upsertCliente(c.whats,c.nome,c.modo==='delivery'?{end:endComp,bairro:c.bairro,rua:c.rua,numero:c.numero,comp:c.comp,ref:c.ref}:null);
  if(CLOUD) cloudCliUpsert();   // sincroniza a conta/endereços do cliente na nuvem
  UI.curOrder=ped.id; UI.cart=[]; UI.cupom=null;
  UI.chk={modo:null,bairro:'',rua:'',numero:'',comp:'',ref:'',nome:c.nome,whats:c.whats,pay:null,troco:'',comprov:null,obs:''};
  try{ localStorage.removeItem(CHKKEY); }catch(e){}   // checkout concluído: não retomar depois
  UI.cli.screen='confirmado'; save(); render();
  return ped;
}
on('cli-track',function(d){ UI.curOrder=d.id; UI.cli.screen='track'; render(); });
on('cli-repetir',function(d){
  var o=order(d.id); if(!o) return;
  o.itens.forEach(function(i){ UI.cart.push(JSON.parse(JSON.stringify(i))); });
  var av=revalidarCarrinho();
  saveCliente(); UI.cli.screen='home'; render();
  toast(av.length?('Itens adicionados. '+av[0]):'Itens adicionados à sacola','ok');
});
on('cli-cancelar',function(d){
  var o=order(d.id); if(!o) return;
  if(['em_validacao','aguardando_comprovante','aguardando_aceite'].indexOf(o.status)<0){ toast('Não dá mais para cancelar','err'); return; }
  confirmar('Cancelar pedido?','O pedido '+o.id+' será cancelado.','Cancelar pedido',function(){
    o.status='cancelado'; o.historico.unshift({t:nowHM(),who:'Cliente',act:'Cancelou o pedido'}); save(); toast('Pedido cancelado','info'); render();
  },true);
});
on('cli-reenviar',function(d){ var o=order(d.id); if(!o) return; pickImage(function(u){ o.pay.comprovante=u; o.pay.status='enviado'; o.status='em_validacao'; o.historico.unshift({t:nowHM(),who:'Cliente',act:'Reenviou o comprovante'}); save(); toast('Comprovante reenviado','ok'); render(); }); });
on('cli-login-f',function(d,t){ UI.login=UI.login||{}; UI.login[d.k]=t.value; });
on('cli-login',function(){
  var L=UI.login||{}; var nome=(L.nome||'').trim().replace(/\s+/g,' '); var whats=(L.whats||'').trim();
  if(nome.split(' ').length<2 || nome.replace(/\s/g,'').length<3){ toast('Digite seu nome completo (nome e sobrenome)','err'); return; }
  if(!telValido(whats)){ toast('Digite um WhatsApp válido com DDD','err'); return; }
  function entrarNovo(){ UI.me.nome=nome; UI.me.tel=whats; if(!Array.isArray(UI.me.enderecos))UI.me.enderecos=[]; persistLocal(); if(CLOUD) cloudCliUpsert(); UI.login=null; UI.cli.screen='home'; render(); toast('Cadastro feito! Bem-vindo, '+nome.split(' ')[0]+'!','ok'); }
  function entrarExistente(cli){ UI.me.nome=cli.nome||nome; UI.me.tel=whats; UI.me.foto=cli.foto||null; UI.me.enderecos=Array.isArray(cli.enderecos)?cli.enderecos:[]; persistLocal(); UI.login=null; UI.cli.screen='home'; render(); toast('Bem-vindo de volta, '+(UI.me.nome.split(' ')[0])+'!','ok'); }
  if(!CLOUD){ entrarNovo(); return; }
  cloudCliGet(normWhats(whats)).then(function(cli){
    if(cli && (cli.nome||'').trim()){
      if(normNome(cli.nome)===normNome(nome)) entrarExistente(cli);
      else toast('Esse WhatsApp já tem cadastro em outro nome. Confira o nome completo.','err');
    } else entrarNovo();
  });
});
on('cli-logout',function(){ confirmar('Sair da conta?','Seus dados continuam salvos. Você pode entrar de novo com o mesmo WhatsApp e nome.','Sair',function(){ UI.me={nome:'',tel:'',foto:null,enderecos:[]}; UI.cart=[]; UI.login=null; UI.cli.screen='home'; persistLocal(); render(); },false); });
on('me-f',function(d,t){ UI.me[d.k]=t.value; });
on('me-salvar',function(){ saveCliente(); toast('Dados salvos','ok'); render(); });
on('me-foto',function(){ pickImage(function(u){ UI.me.foto=u; saveCliente(); render(); toast('Foto de perfil atualizada','ok'); }); });
on('me-endrm',function(d){ var i=+d.i; confirmar('Remover endereço?','','Remover',function(){ UI.me.enderecos.splice(i,1); saveCliente(); render(); },true); });
on('me-endadd',function(){
  modal('<h2>Novo endereço</h2>'+
    '<div class="field"><label>Bairro *</label><input id="na-bairro" placeholder="Ex.: Centro"></div>'+
    '<div class="field"><label>Rua ou Avenida *</label><input id="na-rua" placeholder="Ex.: Av. Principal"></div>'+
    '<div class="row2"><div class="field"><label>Número *</label><input id="na-num" inputmode="numeric" placeholder="123"></div>'+
    '<div class="field"><label>Complemento</label><input id="na-comp" placeholder="opcional"></div></div>'+
    '<div class="field"><label>Ponto de referência *</label><input id="na-ref" placeholder="Perto de..."></div>'+
    '<div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="me-endsave">Salvar endereço</button></div>');
});
on('me-endsave',function(){
  var bairro=$('na-bairro').value.trim(), rua=$('na-rua').value.trim(), num=$('na-num').value.trim(), ref=$('na-ref').value.trim();
  if(!bairro||!rua||!num||!ref){ toast('Preencha bairro, rua, número e referência','err'); return; }
  UI.me.enderecos.unshift({bairro:bairro,rua:rua,numero:num,comp:$('na-comp').value.trim(),ref:ref,end:rua+', '+num}); saveCliente(); closeModal(); toast('Endereço salvo','ok'); render(); });

/* ============================================================================
   HANDLERS — ADMIN
   ============================================================================ */
function needAdmin(){ if(!isAdmin()){ toast('Sem permissão para esta ação','err'); return false; } return true; }
on('adm-login',function(){
  var u=($('lg-user').value||'').trim().toLowerCase(), p=$('lg-pass').value;
  var acc=S.equipe.filter(function(x){return x.user===u;})[0];
  if(!acc || p!=='2045'){ toast('Usuário ou senha inválidos','err'); return; }
  UI.adm.logged=true; UI.adm.user=acc; UI.adm.tab='visao'; UI.adm.order=null; UI.adm.mais=null;
  salvarSessaoAdm_(acc);   // fica logado 24h neste aparelho (só a conta do dono)
  audit('Entrou no painel',''); render(); pedirWakeLock_(); btpAutoReconnect_();
});
on('adm-logout',function(){ UI.adm.logged=false; UI.adm.user=null; UI.adm.order=null; UI.adm.mais=null; limparSessaoAdm_(); soltarWakeLock_(); render(); });
on('adm-tab',function(d){ UI.adm.tab=d.t; UI.adm.order=null; UI.adm.mais=null; render(); scrollAdmTop(); });
on('adm-kpi',function(d){ UI.adm.tab='pedidos'; UI.adm.filter=d.f; UI.adm.filterTipo='todos'; UI.adm.filterPay='todos'; UI.adm.filterDia='hoje'; UI.adm.order=null; UI.adm.mais=null; render(); });
on('adm-filter',function(d){ UI.adm.filter=d.f; render(); });
on('adm-filter-dia',function(d){ UI.adm.filterDia=d.f; render(); });
on('adm-filter-tipo',function(d){ UI.adm.filterTipo=d.f; render(); });
on('adm-filter-pay',function(d){ UI.adm.filterPay=d.f; render(); });
on('adm-open',function(d){ UI.adm.order=d.id; render(); scrollAdmTop(); });
on('adm-back',function(){ UI.adm.order=null; render(); });
on('adm-mais',function(d){ if(!modAllowed(d.m)){ toast('Módulo exclusivo do dono','err'); return; } UI.adm.mais=d.m; render(); scrollAdmTop(); });
on('adm-mais-back',function(){ UI.adm.mais=null; render(); });
function scrollAdmTop(){ var sc=document.querySelector('.adm-scroll'); if(sc)sc.scrollTop=0; }
function addHist(o,act){ o.historico.unshift({t:nowHM(),who:UI.adm.user.nome,act:act}); }
function guard(o,st){ if(!o||st.indexOf(o.status)<0){ toast('Ação indisponível para o estado atual','err'); render(); return false; } return true; }
on('adm-aprovar-pix',function(d){ var o=order(d.id); if(!guard(o,['em_validacao']))return; o.pay.status='aprovado'; o.status='aguardando_aceite'; addHist(o,'Aprovou o Pix'); audit('Aprovou Pix '+o.id,o.id); save(); toast('Pix confirmado. Agora aceite e imprima.','ok'); render(); });
on('adm-solicitar-comprov',function(d){ var o=order(d.id); if(!guard(o,['em_validacao']))return; o.status='aguardando_comprovante'; o.pay.status='pendente'; addHist(o,'Pediu novo comprovante'); save(); toast('Cliente vai poder reenviar o comprovante','info'); render(); });
on('adm-recusar',function(d){ var o=order(d.id); if(!guard(o,['em_validacao','aguardando_comprovante','aguardando_aceite']))return; pedirMotivo('Recusar pedido',['Comprovante ilegível','Valor divergente','Fora da área de entrega','Produto indisponível'],function(m){ o.status='recusado'; o.pay.motivoRecusa=m; addHist(o,'Recusou: '+m); audit('Recusou '+o.id,o.id); save(); toast('Pedido recusado','err'); render(); }); });
on('adm-aceitar',function(d){ var o=order(d.id); if(!guard(o,['aguardando_aceite']))return; o.status='em_preparo'; o.reimpressoes=0; addHist(o,'Aceitou e imprimiu o cupom'); audit('Aceitou '+o.id,o.id); save(); imprimirCupom(o,false); toast('Pedido aceito. Foi para a cozinha.','ok'); });
on('adm-reimprimir',function(d){ var o=order(d.id); if(!o)return; o.reimpressoes=(o.reimpressoes||0)+1; addHist(o,'Reimprimiu (via '+(o.reimpressoes+1)+')'); save(); imprimirCupom(o,true); });
on('adm-pronto',function(d){ var o=order(d.id); if(!guard(o,['em_preparo']))return; o.status='pronto'; addHist(o,'Marcou como pronto'); save(); toast('Pedido pronto','ok'); render(); });
on('adm-saiu',function(d){ var o=order(d.id); if(!guard(o,['pronto']))return; if(o.tipo!=='delivery'){ toast('Retirada não sai para entrega','err'); return; } o.status='saiu'; addHist(o,'Saiu para entrega'); save(); toast('Saiu para entrega','ok'); render(); });
on('adm-concluir',function(d){ var o=order(d.id); if(!guard(o,['pronto','saiu']))return;
  if(o.pay.metodo==='cartao' && !o.pay.cartaoTipo){ pedirCartaoTipo_(o,function(){ concluir_(o); }); return; }
  concluir_(o);
});
function concluir_(o){ o.status='concluido'; if(o.pay.metodo!=='pix')o.pay.status='recebido'; addHist(o,'Concluiu o pedido'); audit('Concluiu '+o.id,o.id); save(); toast('Pedido concluído','ok'); render(); }
function pedirCartaoTipo_(o,cb){
  UI._cartaoCb=cb;
  modal('<h2 class="center">Cartão: Débito ou Crédito?</h2><p style="color:var(--text2);text-align:center;margin-top:0">Só pra separar certinho no caixa.</p>'+
    '<div class="sticky-cta"><button class="btn btn-primary btn-block btn-lg" data-action="adm-cartao-tipo" data-id="'+esc(o.id)+'" data-t="debito">'+ic('card')+' Débito</button>'+
    '<button class="btn btn-primary btn-block btn-lg" style="margin-top:8px" data-action="adm-cartao-tipo" data-id="'+esc(o.id)+'" data-t="credito">'+ic('card')+' Crédito</button></div>',true);
}
on('adm-cartao-tipo',function(d){ var o=order(d.id); if(o){ o.pay.cartaoTipo=(d.t==='credito')?'credito':'debito'; } closeModal(); var cb=UI._cartaoCb; UI._cartaoCb=null; if(cb) cb(); });

/* ===== EDITAR PEDIDO (dono): tipo entrega/retirada + itens + forma de pagamento -> recalcula (o caixa soma certo) ===== */
function edicaoCalc_(e){ var sub=(e.itens||[]).reduce(function(a,i){return a+i.preco*i.qty;},0); var taxa=e.tipo==='delivery'?(S.loja.taxaEntrega||0):0; var desc=Math.min(e.desconto||0,sub); return {sub:sub,taxa:taxa,desc:desc,total:Math.max(0,sub-desc+taxa)}; }
function edicaoHTML(){
  var e=UI.adm._edit; if(!e) return '';
  var cc=edicaoCalc_(e);
  var h='<h2>Editar pedido '+esc(e.id)+'</h2>';
  h+='<div class="grp"><div class="grp-head"><strong>Tipo</strong></div><div class="row2">'+
     '<button class="btn '+(e.tipo==='delivery'?'btn-primary':'btn-ghost')+'" data-action="ed-tipo" data-t="delivery">'+ic('delivery')+' Entrega</button>'+
     '<button class="btn '+(e.tipo!=='delivery'?'btn-primary':'btn-ghost')+'" data-action="ed-tipo" data-t="retirada">Retirada</button></div></div>';
  h+='<div class="grp"><div class="grp-head"><strong>Itens</strong></div>'+((e.itens&&e.itens.length)?e.itens.map(function(i,ix){
    return '<div class="adrow"><div class="adrow-b"><div class="ad-n">'+esc(i.nome)+(i.varNome?' · '+esc(i.varNome):'')+'</div><div class="ad-p">'+money(i.preco*i.qty)+'</div></div>'+
      '<div class="pd-qtyctl"><button class="qtybtn sm" data-action="ed-qty" data-i="'+ix+'" data-d="-1" aria-label="Menos">'+ic('minus')+'</button><span>'+i.qty+'</span><button class="qtybtn sm" data-action="ed-qty" data-i="'+ix+'" data-d="1" aria-label="Mais">'+ic('plus')+'</button><button class="qtybtn sm" data-action="ed-rm" data-i="'+ix+'" aria-label="Remover">'+ic('trash')+'</button></div></div>';
  }).join('') : '<div class="muted small2">Sem itens.</div>')+'</div>';
  var pm=e.pay.metodo, ct=e.pay.cartaoTipo||'';
  function pb(k,lb){ var on=(k==='debito'||k==='credito')?(pm==='cartao'&&ct===k):(pm===k&&k!=='cartao'); return '<button class="btn btn-sm '+(on?'btn-primary':'btn-ghost')+'" data-action="ed-pay" data-m="'+k+'">'+lb+'</button>'; }
  h+='<div class="grp"><div class="grp-head"><strong>Pagamento</strong></div><div style="display:flex;gap:8px;flex-wrap:wrap">'+pb('pix','PIX')+pb('dinheiro','Dinheiro')+pb('debito','Cartão Débito')+pb('credito','Cartão Crédito')+'</div></div>';
  h+='<div class="card"><div class="dp-line"><span>Subtotal</span><span>'+money(cc.sub)+'</span></div>'+
     (cc.desc>0?'<div class="dp-line"><span>Desconto</span><span>- '+money(cc.desc)+'</span></div>':'')+
     '<div class="dp-line"><span>Taxa de entrega</span><span>'+money(cc.taxa)+'</span></div>'+
     '<div class="dp-line big"><strong>Total</strong><strong class="gold">'+money(cc.total)+'</strong></div></div>';
  h+='<div class="sticky-cta"><button class="btn btn-primary btn-block btn-lg" data-action="ed-salvar">Salvar alterações</button><button class="btn btn-ghost btn-block" style="margin-top:8px" data-action="close-modal">Cancelar</button></div>';
  return h;
}
function patchEdit_(){ var m=document.querySelector('#modal-root .modal'); if(!m)return; m.innerHTML='<div class="modal-grip"></div><button class="modal-x" data-action="close-modal" aria-label="Fechar">'+ic('x')+'</button>'+edicaoHTML(); }
on('adm-editar',function(d){ if(!isAdmin()){ toast('Só o dono edita o pedido','err'); return; } var o=order(d.id); if(!o)return; UI.adm._edit=JSON.parse(JSON.stringify(o)); if(!UI.adm._edit.pay)UI.adm._edit.pay={metodo:'dinheiro',label:'Dinheiro no local'}; modal(edicaoHTML()); });
on('ed-tipo',function(d){ if(!UI.adm._edit)return; UI.adm._edit.tipo=(d.t==='delivery')?'delivery':'retirada'; patchEdit_(); });
on('ed-qty',function(d){ var e=UI.adm._edit; if(!e)return; var i=e.itens[+d.i]; if(!i)return; i.qty=Math.max(1,(i.qty||1)+(+d.d)); patchEdit_(); });
on('ed-rm',function(d){ var e=UI.adm._edit; if(!e)return; e.itens.splice(+d.i,1); patchEdit_(); });
on('ed-pay',function(d){ var e=UI.adm._edit; if(!e)return; var m=d.m; if(m==='debito'||m==='credito'){ e.pay.metodo='cartao'; e.pay.cartaoTipo=m; } else { e.pay.metodo=m; e.pay.cartaoTipo=''; } patchEdit_(); });
on('ed-salvar',function(){
  var e=UI.adm._edit; if(!e)return; var o=order(e.id); if(!o){ closeModal(); return; }
  var cc=edicaoCalc_(e);
  var payMap={pix:'Pix com comprovante',dinheiro:'Dinheiro no local',cartao:'Cartão no local'};
  o.itens=e.itens; o.tipo=e.tipo; o.subtotal=cc.sub; o.taxa=cc.taxa; o.desconto=cc.desc; o.total=cc.total;
  o.pay.metodo=e.pay.metodo; o.pay.cartaoTipo=e.pay.cartaoTipo||''; o.pay.label=payMap[e.pay.metodo]||o.pay.label;
  addHist(o,'Dono editou o pedido (total '+money(cc.total)+')'); audit('Editou pedido '+o.id,o.id); save(); closeModal(); toast('Pedido atualizado','ok'); render();
});
on('adm-cancelar-admin',function(d){ if(!needAdmin())return; var o=order(d.id); if(!guard(o,['em_preparo','pronto']))return; pedirMotivo('Cancelar pedido (dono)',['Cliente desistiu','Sem insumo','Erro no pedido','Fora de área'],function(m){ o.status='cancelado'; o.pay.motivoRecusa=m; addHist(o,'Dono cancelou: '+m); audit('Cancelou '+o.id,o.id); save(); toast('Pedido cancelado','info'); render(); }); });
function pedirMotivo(titulo,ops,cb){
  modal('<h2>'+esc(titulo)+'</h2><p style="color:var(--text2)">Escolha ou escreva o motivo (vai para o cliente).</p>'+
    ops.map(function(o){return '<div class="bigopt" data-mot="'+esc(o)+'"><div class="bo-ic">'+ic('dot')+'</div><div class="bo-t">'+esc(o)+'</div></div>';}).join('')+
    '<div class="field"><label>Outro motivo</label><input id="mot-outro" placeholder="Escreva..."></div>'+
    '<div class="sticky-cta"><button class="btn btn-red btn-block" id="mot-ok">Confirmar</button></div>',true);
  var sel='', root=$('modal-root');
  root.querySelectorAll('[data-mot]').forEach(function(el){ el.onclick=function(){ sel=el.getAttribute('data-mot'); root.querySelectorAll('[data-mot]').forEach(function(x){x.classList.remove('sel');}); el.classList.add('sel'); }; });
  $('mot-ok').onclick=function(){ var m=($('mot-outro').value||'').trim()||sel; if(!m){ toast('Escolha um motivo','err'); return; } closeModal(); cb(m); };
}
/* cardápio */
on('adm-novo-produto',function(){ if(!needAdmin())return; openProdForm(null); });
on('adm-edit-produto',function(d){ if(!needAdmin())return; openProdForm(prod(d.id)); });
on('adm-toggle-disp',function(d){ var p=prod(d.id); p.disp=(p.disp==='disponivel')?'esgotado':'disponivel'; audit((p.disp==='esgotado'?'Esgotou ':'Reativou ')+p.nome,''); save(); toast(p.nome+' · '+(p.disp==='disponivel'?'disponível':'esgotado'),'info'); render(); });
function openProdForm(p){
  UI.adm._pedit = p ? JSON.parse(JSON.stringify(p)) : {nome:'',desc:'',preco:'',cat:S.categorias[0].id,hue:20,disp:'disponivel',foto:null,ordem:S.produtos.length,variacoes:[],grupos:[]};
  if(!UI.adm._pedit.variacoes) UI.adm._pedit.variacoes=[];
  if(!UI.adm._pedit.grupos) UI.adm._pedit.grupos=[];
  UI.adm._pedit._id = p?p.id:null;
  modal(prodFormHTML());
}
function captureProdForm(){
  var e=UI.adm._pedit; if(!e) return;
  if($('pf-nome'))e.nome=$('pf-nome').value; if($('pf-desc'))e.desc=$('pf-desc').value;
  if($('pf-preco'))e.preco=$('pf-preco').value; if($('pf-cat'))e.cat=$('pf-cat').value;
  if($('pf-disp'))e.disp=$('pf-disp').value; if($('pf-ordem'))e.ordem=parseInt($('pf-ordem').value,10)||0;
}
function admFormProduto(p){ openProdForm(p); return ''; }
function prodFormHTML(){
  var p=UI.adm._pedit, novo=!p._id;
  var cats=S.categorias.map(function(c){return '<option value="'+c.id+'"'+(p.cat===c.id?' selected':'')+'>'+esc(c.nome)+'</option>';}).join('');
  var vars=(p.variacoes||[]).map(function(v,i){ return '<div class="opt sel nohover"><span class="oname">'+esc(v.nome)+(v.inclui&&v.inclui.length?' <span class="muted small2">(inclui '+esc(v.inclui.join(', '))+')</span>':'')+'</span><span class="oprice">'+money(v.preco)+'</span><button class="ci-trash sm" data-action="pf-rm-var" data-i="'+i+'" aria-label="Remover">'+ic('trash')+'</button></div>'; }).join('');
  var grupos=(p.grupos||[]).map(function(g,gi){
    var itens=(g.itens||[]).map(function(it,ii){ return '<div class="opt sel nohover"><span class="oname">'+esc(it.nome)+'</span><span class="oprice">+ '+money(it.preco)+'</span><button class="ci-trash sm" data-action="pf-rm-gitem" data-g="'+gi+'" data-i="'+ii+'" aria-label="Remover">'+ic('trash')+'</button></div>'; }).join('');
    return '<div class="soft"><div class="soft-head"><strong>'+esc(g.nome)+(g.max>0?' <span class="muted small2">(até '+g.max+')</span>':'')+'</strong><button class="ci-trash sm" data-action="pf-rm-grupo" data-g="'+gi+'" aria-label="Remover">'+ic('trash')+'</button></div>'+(itens||'<div class="muted small2 mb6">Sem itens</div>')+'<button class="btn btn-ghost btn-sm btn-block" data-action="pf-add-gitem" data-g="'+gi+'">'+ic('plus')+' Item</button></div>';
  }).join('');
  return '<h2>'+(novo?'Novo produto':'Editar produto')+'</h2>'+
    '<div class="pf-imgwrap"><img id="pf-img" src="'+prodImg(p)+'"><div class="pf-imgbtns"><button class="btn btn-outline btn-sm" data-action="pf-foto">'+ic('camera')+' '+(p.foto?'Trocar foto':'Adicionar foto')+'</button>'+(p.foto?'<button class="btn btn-red btn-sm" data-action="pf-rm-foto">'+ic('trash')+' Remover foto</button>':'')+'</div></div>'+
    '<div class="field"><label>Nome</label><input id="pf-nome" value="'+esc(p.nome)+'"></div>'+
    '<div class="field"><label>Descrição</label><textarea id="pf-desc">'+esc(p.desc)+'</textarea></div>'+
    '<div class="row2"><div class="field"><label>Preço base (R$)</label><input id="pf-preco" inputmode="decimal" value="'+esc(p.preco)+'"></div>'+
    '<div class="field"><label>Categoria</label><select id="pf-cat">'+cats+'</select></div></div>'+
    '<div class="row2"><div class="field"><label>Disponibilidade</label><select id="pf-disp">'+
      '<option value="disponivel"'+(p.disp==='disponivel'?' selected':'')+'>Disponível agora</option>'+
      '<option value="esgotado"'+(p.disp==='esgotado'?' selected':'')+'>Esgotado hoje</option>'+
      '<option value="oculto"'+(p.disp==='oculto'?' selected':'')+'>Oculto (rascunho)</option></select></div>'+
    '<div class="field"><label>Ordem</label><input id="pf-ordem" inputmode="numeric" value="'+esc(p.ordem)+'"></div></div>'+
    '<div class="field"><label>Opções (ex.: Simples / Completo)</label>'+(vars||'<div class="muted small2 mb6">Nenhuma — usa o preço base.</div>')+'<button class="btn btn-ghost btn-sm btn-block" data-action="pf-add-var">'+ic('plus')+' Opção</button></div>'+
    '<div class="field"><label>Grupos de adicionais</label>'+(grupos||'<div class="muted small2 mb6">Nenhum</div>')+'<button class="btn btn-ghost btn-sm btn-block" data-action="pf-add-grupo">'+ic('plus')+' Grupo de adicionais</button></div>'+
    '<div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="pf-save">'+(novo?'Publicar produto':'Salvar alterações')+'</button>'+
    (novo?'':'<div class="row2" style="margin-top:8px"><button class="btn btn-ghost" data-action="pf-dup">Duplicar</button><button class="btn btn-red" data-action="pf-arquivar">Arquivar</button></div>')+'</div>';
}
on('pf-foto',function(){ captureProdForm(); pickImage(function(u){ UI.adm._pedit.foto=u; modal(prodFormHTML()); toast('Foto adicionada','ok'); }); });
on('pf-rm-foto',function(){ captureProdForm(); UI.adm._pedit.foto=null; modal(prodFormHTML()); toast('Foto removida (usa o ícone da categoria)','info'); });
on('pf-add-var',function(){ captureProdForm(); modal('<h2>Nova opção</h2><div class="field"><label>Nome</label><input id="v-nome" placeholder="Ex.: Completo"></div><div class="field"><label>Preço (R$)</label><input id="v-preco" inputmode="decimal" value="0"></div><div class="field"><label>Acompanha (separado por vírgula, opcional)</label><input id="v-incl" placeholder="Arroz, Feijão, Macaxeira, Vinagrete"></div><div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="pf-add-var-ok">Adicionar</button></div>',true); });
on('pf-add-var-ok',function(){ var n=$('v-nome').value.trim(); if(!n){ toast('Informe o nome','err'); return; } var incl=($('v-incl').value||'').split(',').map(function(s){return s.trim();}).filter(Boolean); UI.adm._pedit.variacoes.push({nome:n,preco:parseFloat(String($('v-preco').value).replace(',','.'))||0,inclui:incl}); modal(prodFormHTML()); });
on('pf-rm-var',function(d){ captureProdForm(); UI.adm._pedit.variacoes.splice(+d.i,1); modal(prodFormHTML()); });
on('pf-add-grupo',function(){ captureProdForm(); modal('<h2>Grupo de adicionais</h2><div class="field"><label>Nome do grupo</label><input id="g-nome" placeholder="Ex.: Adicionais, Molhos"></div><div class="field"><label>Escolha até (0 = sem limite)</label><input id="g-max" inputmode="numeric" value="0"></div><div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="pf-add-grupo-ok">Criar grupo</button></div>',true); });
on('pf-add-grupo-ok',function(){ var n=$('g-nome').value.trim(); if(!n){ toast('Informe o nome','err'); return; } UI.adm._pedit.grupos.push({nome:n,max:parseInt($('g-max').value,10)||0,itens:[]}); modal(prodFormHTML()); });
on('pf-rm-grupo',function(d){ captureProdForm(); UI.adm._pedit.grupos.splice(+d.g,1); modal(prodFormHTML()); });
on('pf-add-gitem',function(d){ captureProdForm(); UI.adm._pedit._gi=+d.g; modal('<h2>Novo adicional</h2><div class="field"><label>Nome</label><input id="gi-nome" placeholder="Ex.: Bacon extra"></div><div class="field"><label>Preço (R$)</label><input id="gi-preco" inputmode="decimal" value="0"></div><div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="pf-add-gitem-ok">Adicionar</button></div>',true); });
on('pf-add-gitem-ok',function(){ var gi=UI.adm._pedit._gi, g=UI.adm._pedit.grupos[gi]; if(!g)return; var n=$('gi-nome').value.trim(); if(!n){ toast('Informe o nome','err'); return; } g.itens.push({nome:n,preco:parseFloat(String($('gi-preco').value).replace(',','.'))||0}); modal(prodFormHTML()); });
on('pf-rm-gitem',function(d){ captureProdForm(); var g=UI.adm._pedit.grupos[+d.g]; if(g)g.itens.splice(+d.i,1); modal(prodFormHTML()); });
on('pf-save',function(){
  captureProdForm(); var e=UI.adm._pedit;
  if(!(e.nome||'').trim()){ toast('Informe o nome','err'); return; }
  e.preco=parseFloat(String(e.preco).replace(',','.'))||0;
  if(e._id){ var p=prod(e._id); ['nome','desc','preco','cat','disp','foto','ordem','variacoes','grupos'].forEach(function(k){p[k]=e[k];}); audit('Editou '+e.nome,''); }
  else { S.produtos.push({id:uid('p'),nome:e.nome,desc:e.desc,preco:e.preco,cat:e.cat,disp:e.disp,foto:e.foto,hue:20,ordem:e.ordem||S.produtos.length,variacoes:e.variacoes||[],grupos:e.grupos||[]}); audit('Criou '+e.nome,''); }
  save(); closeModal(); toast('Produto salvo','ok'); render();
});
on('pf-dup',function(){ var e=UI.adm._pedit; if(!e._id)return; var p=prod(e._id); var c=JSON.parse(JSON.stringify(p)); c.id=uid('p'); c.nome=p.nome+' (cópia)'; S.produtos.push(c); save(); closeModal(); toast('Produto duplicado','ok'); render(); });
on('pf-arquivar',function(){ var e=UI.adm._pedit; if(!e._id)return; var p=prod(e._id); confirmar('Arquivar produto?','"'+p.nome+'" some do cardápio (histórico é preservado).','Arquivar',function(){ p.disp='oculto'; audit('Arquivou '+p.nome,''); save(); closeModal(); toast('Produto arquivado','info'); render(); },true); });
/* promoções */
on('adm-promo-novo',function(){ if(!needAdmin())return; modal(promoForm(null)); });
on('adm-promo-edit',function(d){ if(!needAdmin())return; var p=(S.promos||[]).filter(function(x){return x.id===d.id;})[0]; modal(promoForm(p)); });
on('adm-promo-save',function(d){
  var t=$('pr-t').value.trim(); if(!t){ toast('Informe o título','err'); return; }
  var desc=$('pr-d').value.trim(), preco=parseFloat(String($('pr-p').value).replace(',','.'))||0;
  if(d.id){ var p=(S.promos||[]).filter(function(x){return x.id===d.id;})[0]; p.titulo=t; p.desc=desc; p.preco=preco; }
  else { S.promos.push({id:uid('promo'),titulo:t,desc:desc,preco:preco,ativo:true}); }
  audit('Salvou promoção '+t,''); save(); closeModal(); render(); toast('Promoção salva','ok');
});
on('adm-promo-toggle',function(d){ var p=(S.promos||[]).filter(function(x){return x.id===d.id;})[0]; if(p){ p.ativo=!p.ativo; save(); render(); } });
on('adm-promo-rm',function(d){ confirmar('Remover promoção?','','Remover',function(){ S.promos=S.promos.filter(function(x){return x.id!==d.id;}); save(); closeModal(); render(); toast('Promoção removida','info'); },true); });
/* categorias */
on('cat-add',function(){ if(!needAdmin())return; modal('<h2>Nova categoria</h2><div class="field"><label>Nome</label><input id="ct-nome" placeholder="Ex.: Promoções"></div><div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="cat-add-ok">Criar</button></div>',true); });
on('cat-add-ok',function(){ var n=$('ct-nome').value.trim(); if(!n){ toast('Informe o nome','err'); return; } S.categorias.push({id:uid('cat'),nome:n,ordem:S.categorias.length+1,oculta:false}); save(); closeModal(); render(); toast('Categoria criada','ok'); });
on('cat-ren',function(d){ if(!needAdmin())return; var c=cat(d.id); modal('<h2>Renomear categoria</h2><div class="field"><label>Nome</label><input id="ct-nome" value="'+esc(c.nome)+'"></div><div class="sticky-cta"><button class="btn btn-primary btn-block" data-action="cat-ren-ok" data-id="'+d.id+'">Salvar</button></div>',true); });
on('cat-ren-ok',function(d){ var c=cat(d.id); var n=$('ct-nome').value.trim(); if(!n){ toast('Informe o nome','err'); return; } c.nome=n; save(); closeModal(); render(); toast('Categoria renomeada','ok'); });
on('cat-up',function(d){ moveCat(d.id,-1); });
on('cat-down',function(d){ moveCat(d.id,1); });
function moveCat(id,dir){ var cs=catsOrd(); var i=cs.findIndex(function(c){return c.id===id;}); var j=i+dir; if(j<0||j>=cs.length)return; var t=cs[i].ordem; cs[i].ordem=cs[j].ordem; cs[j].ordem=t; save(); render(); }
on('cat-oculta',function(d){ var c=cat(d.id); c.oculta=!c.oculta; save(); render(); });
/* entregas/horários/pagamentos */
on('adm-save-entregas',function(){ if(!needAdmin())return; S.loja.taxaEntrega=parseFloat(String($('ent-taxa').value).replace(',','.'))||0; S.loja.prazoEntrega=$('ent-prazo').value; save(); toast('Entregas salvas','ok'); });
on('adm-toggle-retirada',function(){ S.loja.retirada=!S.loja.retirada; render(); });
on('adm-toggle-pausa',function(){ if(!needAdmin())return; S.loja.pausado=!S.loja.pausado; save(); toast(S.loja.pausado?'Loja pausada (fechada agora)':'Loja voltou ao horário automático', S.loja.pausado?'info':'ok'); render(); });
function _janelasAtuais(){ var js=(S.loja.janelas&&S.loja.janelas.length)?S.loja.janelas:DEFAULT_JANELAS; return js.map(function(w){return [w[0],w[1]];}); }
on('adm-jan-add',function(){ if(!needAdmin())return; var js=_janelasAtuais(); js.push(['18:00','23:00']); S.loja.janelas=js; render(); });
on('adm-jan-rm',function(d){ if(!needAdmin())return; var js=_janelasAtuais(); js.splice(+d.i,1); S.loja.janelas=js; render(); });
on('adm-save-horarios',function(){ if(!needAdmin())return; var js=[]; for(var i=0;;i++){ var a=$('jr-a'+i), b=$('jr-b'+i); if(!a||!b) break; if(a.value&&b.value) js.push([a.value,b.value]); } if(!js.length){ toast('Adicione pelo menos uma janela de horário','err'); return; } S.loja.janelas=js; S.loja.horario=fmtJanelas(js); save(); toast('Horários salvos','ok'); render(); });
on('adm-toggle-pag',function(d){ S.loja[d.k]=!S.loja[d.k]; render(); });
on('adm-save-pag',function(){ if(!needAdmin())return; S.loja.pixKey=$('pg-key').value; S.loja.pixNome=$('pg-nome').value; save(); toast('Pagamentos salvos','ok'); });
on('adm-test-print',function(){ var demo={id:'#TESTE',dia:hoje(),criadoEm:nowHM(),tipo:'delivery',nome:'Cliente Teste',tel:'(00) 00000-0000',end:'Rua de Teste, 1',bairro:'Centro',entregaSobConsulta:false,itens:[{qty:2,nome:'Espetinho de Carne',preco:8,adic:[],obs:'',opc:{}}],total:16,subtotal:16,pay:{label:'Pix',troco:''},obs:''}; imprimirCupom(demo,false); });
on('adm-rel-per',function(d){ UI.adm.relPer=d.p; render(); });
/* clientes */
on('cli-busca',function(d,t){ UI.adm.cliQ=t.value; var sc=document.querySelector('.adm-scroll'); var st=sc?sc.scrollTop:0; render(); sc=document.querySelector('.adm-scroll'); if(sc)sc.scrollTop=st; var inp=document.querySelector('[data-oninput="cli-busca"]'); if(inp){ var v=inp.value; inp.focus(); inp.value=''; inp.value=v; } });
on('adm-cli-filter',function(d){ UI.adm.cliFilter=d.f; render(); });
on('adm-cliente',function(d){
  var c=S.clientes.filter(function(x){return x.tel===d.tel;})[0]; if(!c)return;
  var s=clienteStats(c.tel), pedidos=S.pedidos.filter(function(p){return p.tel===c.tel;});
  modal('<h2>'+esc(c.nome)+'</h2><p class="muted mt0">'+esc(c.tel)+' · desde '+esc(c.criadoEm)+(c.bloq?' · <span class="err-txt">bloqueado</span>':'')+'</p>'+
    '<div class="kpi-grid"><div class="kpi hl"><div class="k-n">'+s.concl+'</div><div class="k-l">Pedidos</div></div>'+
    '<div class="kpi"><div class="k-n sm">'+money(s.gasto)+'</div><div class="k-l">Total gasto</div></div>'+
    '<div class="kpi"><div class="k-n sm">'+money(s.ticket)+'</div><div class="k-l">Ticket médio</div></div>'+
    '<div class="kpi"><div class="k-n">'+(c.enderecos.length)+'</div><div class="k-l">Endereços</div></div></div>'+
    '<div class="adm-sec-t">Últimos pedidos</div>'+(pedidos.length?pedidos.slice(0,5).map(function(p){return '<div class="dp-line"><span>'+esc(p.id)+' · '+esc(p.dia)+'</span><strong>'+money(p.total)+' · '+esc(statusCliente(p).lbl)+'</strong></div>';}).join(''):'<div class="empty">Sem pedidos.</div>')+
    '<a class="btn btn-outline btn-block" style="margin-top:12px;text-decoration:none" href="https://wa.me/55'+c.tel.replace(/\D/g,'')+'" target="_blank" rel="noopener">'+ic('chat')+' WhatsApp</a>'+
    (isAdmin()?'<button class="btn '+(c.bloq?'btn-ghost':'btn-red')+' btn-block" style="margin-top:8px" data-action="adm-cli-bloq" data-tel="'+esc(c.tel)+'">'+(c.bloq?'Desbloquear cliente':'Bloquear novos pedidos')+'</button>':''),true);
});
on('adm-cli-bloq',function(d){ if(!needAdmin())return; var c=S.clientes.filter(function(x){return x.tel===d.tel;})[0]; if(!c)return;
  if(c.bloq){ c.bloq=false; audit('Desbloqueou cliente '+c.nome,''); save(); closeModal(); render(); toast('Cliente desbloqueado','ok'); }
  else pedirMotivo('Bloquear cliente',['Golpe/comprovante falso','Trote recorrente','Comportamento abusivo'],function(m){ c.bloq=true; c.obsInterna=m; audit('Bloqueou cliente '+c.nome+': '+m,''); save(); closeModal(); render(); toast('Cliente bloqueado','info'); }); });
/* marca */
on('adm-trocar-logo',function(){ pickImage(function(u){ var im=$('mk-logo'); if(im)im.src=u; toast('Logo atualizada (visual)','ok'); }); });
on('adm-save-marca',function(){ if(!needAdmin())return; S.loja.nome=$('mk-nome').value; S.loja.banner=$('mk-banner').value; S.loja.endereco=$('mk-end').value; S.loja.whats=$('mk-whats').value; save(); toast('Marca salva','ok'); });

/* ============================================================================
   UPLOAD DE IMAGEM
   ============================================================================ */
function pickImage(cb){
  var inp=$('filepick'); inp.value='';
  inp.onchange=function(){ var f=inp.files[0]; if(!f) return;
    var r=new FileReader();
    r.onload=function(ev){ var img=new Image();
      img.onload=function(){ var max=900,w=img.width,h=img.height;
        if(w>h&&w>max){ h=h*max/w; w=max; } else if(h>max){ w=w*max/h; h=max; }
        var cv=$('imgcanvas'); cv.width=w; cv.height=h; cv.getContext('2d').drawImage(img,0,0,w,h); cb(cv.toDataURL('image/jpeg',0.75));
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };
  inp.click();
}

/* ============================================================================
   TROCA DE APP (Cliente/Dono) + INIT
   ============================================================================ */
function initUI(){
  UI={ app:APP_MODE, cli:{screen:'home',cat:'Todos',q:''},
    chk:{modo:null,bairro:'',rua:'',numero:'',comp:'',ref:'',nome:'',whats:'',pay:null,troco:'',comprov:null,obs:''}, cupom:null,
    cart:[], login:null, me:{nome:'',tel:'',foto:null,enderecos:[]},
    curOrder:null, _pdId:null,
    adm:{logged:false,user:null,tab:'visao',filter:'todos',filterTipo:'todos',filterPay:'todos',filterDia:'hoje',order:null,mais:null,relPer:'tudo',cliQ:'',cliFilter:'todos',_pedit:null} };
}
/* ---- Sessão do painel do DONO: fica salva 24h no aparelho pra a Fábia não deslogar toda hora ---- */
var ADM_SESSAO_MS = 24*60*60*1000;  // 24 horas (mude aqui se quiser menos)
function salvarSessaoAdm_(acc){ try{ if(acc && acc.papel==='admin') localStorage.setItem(ADMKEY, JSON.stringify({user:acc.user, exp:Date.now()+ADM_SESSAO_MS})); }catch(e){} }
function limparSessaoAdm_(){ try{ localStorage.removeItem(ADMKEY); }catch(e){} }
function restaurarSessaoAdm_(){
  if(APP_MODE!=='admin' || (UI.adm&&UI.adm.logged)) return;
  var s=null; try{ s=JSON.parse(localStorage.getItem(ADMKEY)||'null'); }catch(e){}
  if(!s || !s.user || !s.exp || Date.now()>s.exp){ if(s) limparSessaoAdm_(); return; }   // sem sessão ou expirou (24h) -> pede login
  var acc=(S.equipe||[]).filter(function(x){return x.user===s.user && x.papel==='admin';})[0];  // só a conta do dono
  if(!acc) return;
  UI.adm.logged=true; UI.adm.user=acc; UI.adm.tab='visao';
}
/* ---- Wake Lock: mantém a TELA ligada com o painel aberto (dono) pra o Android não matar a aba/impressora ---- */
var _wakeLock=null;
function pedirWakeLock_(){
  try{
    if(APP_MODE!=='admin' || !(UI.adm&&UI.adm.logged)) return;
    if(typeof navigator==='undefined' || !navigator.wakeLock || _wakeLock) return;
    navigator.wakeLock.request('screen').then(function(wl){ _wakeLock=wl; try{ wl.addEventListener('release',function(){ _wakeLock=null; }); }catch(e){} }).catch(function(){});
  }catch(e){}
}
function soltarWakeLock_(){ try{ if(_wakeLock){ _wakeLock.release(); _wakeLock=null; } }catch(e){} }
/* ---- Reconexão automática da impressora quando o navegador já a autorizou antes (best-effort, sem janela) ---- */
function btpAutoReconnect_(){
  try{
    if(APP_MODE!=='admin' || !btpSupported() || btpConectado() || !navigator.bluetooth.getDevices) return;
    navigator.bluetooth.getDevices().then(function(devs){
      if(!devs || !devs.length) return;
      var dev=devs[0]; BTP.device=dev;
      try{ dev.addEventListener('gattserverdisconnected',function(){ BTP.char=null; render(); }); }catch(e){}
      return dev.gatt.connect().then(function(srv){ return acharCharImpressora_(srv); }).then(function(ch){ if(ch){ BTP.char=ch; render(); } });
    }).catch(function(){});
  }catch(e){}
}
function admOnReady_(){ if(APP_MODE!=='admin') return; pedirWakeLock_(); btpAutoReconnect_(); }
function boot(){
  initUI(); seed();
  var restored=load();
  if(restored){ var maxN=100; S.pedidos.forEach(function(p){ var n=parseInt(String(p.id).replace('#',''),10); if(n>maxN)maxN=n; }); seedCounter=maxN; }
  try{ lastRev=localStorage.getItem(REVKEY); }catch(e){}
  restaurarSessaoAdm_(); restoreChk(); render(); admOnReady_();
}
/* Sincronização entre abas E apps instalados (PWA): storage + BroadcastChannel + polling + foco/visibilidade.
   O polling (a cada 1.5s) garante o sync mesmo no PWA, onde o evento 'storage' não cruza a janela. */
/* ---- nuvem (Supabase): estado compartilhado entre todos os aparelhos ---- */
function cloudPush(){
  if(!sb) return;
  lastRev = String(Date.now())+'-'+Math.floor(Math.random()*1e6);
  sb.from('estado').upsert({id:1,data:S,rev:lastRev,updated_at:new Date().toISOString()}).then(function(r){ if(r&&r.error) console.warn('DM cloud push:', r.error.message); });
}
function aplicarNuvem(row){
  if(!row||!row.rev||row.rev===lastRev) return false;
  if(!row.data||!row.data.produtos) return false;
  lastRev=row.rev; S=row.data; if(!S.promos)S.promos=[];
  var maxN=100; S.pedidos.forEach(function(p){ var n=parseInt(String(p.id).replace('#',''),10); if(n>maxN)maxN=n; }); if(maxN>seedCounter)seedCounter=maxN;
  return true;
}
function cloudPull(){
  if(!sb) return Promise.resolve();
  return sb.from('estado').select('data,rev').eq('id',1).single().then(function(r){ if(r&&r.data&&aplicarNuvem(r.data)) render(); }).catch(function(){});
}
function cloudSubscribe(){ if(!sb) return; try{ sb.channel('estado-rt').on('postgres_changes',{event:'*',schema:'public',table:'estado'}, function(){ cloudPull(); }).subscribe(); }catch(e){} }
function cloudBoot(){
  initUI(); seed(); load(); restaurarSessaoAdm_(); restoreChk(); render(); admOnReady_();   // pinta na hora com cache local; a nuvem sobrescreve em seguida
  refreshCliente();   // puxa a conta/endereços do cliente logado (ou cria a linha se ainda não existir)
  sb.from('estado').select('data,rev').eq('id',1).single().then(function(r){
    if(r&&r.data&&r.data.data&&r.data.data.produtos){ if(aplicarNuvem(r.data)) render(); }
    else { cloudPush(); }   // nuvem vazia -> sobe o cardápio atual
  }).catch(function(e){ console.warn('DM cloud boot:', e&&e.message); });
  cloudSubscribe();
  setInterval(cloudPull, 5000);   // reforço caso o tempo-real caia
}

if(CLOUD && !PREVIEW){
  cloudBoot();
  window.addEventListener('focus', function(){ cloudPull(); refreshCliente(); admOnReady_(); });
  if(typeof document!=='undefined') document.addEventListener('visibilitychange', function(){ if(document.hidden){ persistChk(); } else { cloudPull(); refreshCliente(); admOnReady_(); } });
  window.addEventListener('pagehide', function(){ persistChk(); });
} else {
  if(bc){ bc.onmessage=function(ev){ if(ev&&ev.data&&ev.data!==lastRev){ lastRev=ev.data; if(reloadShared()) render(); } }; }
  window.addEventListener('storage', function(e){ if(e.key===LSKEY||e.key===REVKEY) syncCheck(); });
  window.addEventListener('focus', syncCheck);
  if(typeof document!=='undefined') document.addEventListener('visibilitychange', function(){ if(!document.hidden) syncCheck(); });
  setInterval(syncCheck, 1000);
  boot();
}
if(typeof window!=='undefined') setInterval(clockWatch, 30000);   // vira Aberto/Fechado sozinho ao cruzar o horário
