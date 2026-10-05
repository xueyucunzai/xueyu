const NAV=[
  ['dashboard','Dashboard'],
  ['search','Search'],
  ['ecosystems','Ecosystems'],
  ['protocols','Protocols'],
  ['tokens','Tokens'],
  ['research','Research'],
  ['reports','Reports'],
  ['learning','Learning'],
  ['system','System']
];

const API='/api/';

const errLog=[];

const esc=x=>String(x??'').replace(
  /[&<>"']/g,
  c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c])
);

const now=()=>Date.now();

const uid=()=>crypto.randomUUID();

addEventListener('error',e=>{
  errLog.push(String(e.message||e.error));
});

addEventListener('unhandledrejection',e=>{
  errLog.push(String(e.reason?.message||e.reason));
});


const state={
  page:location.hash.slice(1)||'dashboard',
  online:false,
  search:[],
  query:'',
  detail:null,
  detailType:'',
  searchTimer:null
};


/* =========================
   API
========================= */

async function api(path,opt={}){
  const r=await fetch(
    API+path,
    {
      cache:'no-store',
      headers:{
        'content-type':'application/json',
        ...(opt.headers||{})
      },
      ...opt
    }
  );

  const j=await r.json().catch(()=>({}));

  if(!r.ok||j.ok===false){
    throw Error(
      j.error?.message||
      `HTTP ${r.status}`
    );
  }

  return j;
}


/* =========================
   LOCAL DB
========================= */

const localDB=(()=>{
  let p;

  const stores=[
    'workspace',
    'drafts',
    'cache',
    'sync'
  ];

  function open(){
    return p||=new Promise((res,rej)=>{
      const r=indexedDB.open(
        'crypto-ecosystem-research-v2-final',
        1
      );

      r.onupgradeneeded=()=>{
        stores.forEach(s=>{
          if(
            !r.result.objectStoreNames.contains(s)
          ){
            r.result.createObjectStore(
              s,
              {keyPath:'id'}
            );
          }
        });
      };

      r.onsuccess=()=>res(r.result);

      r.onerror=()=>rej(r.error);
    });
  }

  async function put(store,v){
    const d=await open();

    return new Promise((res,rej)=>{
      const t=d.transaction(
        store,
        'readwrite'
      );

      t.objectStore(store).put(v);

      t.oncomplete=res;

      t.onerror=()=>rej(t.error);
    });
  }

  return{
    open,
    put
  };
})();


/* =========================
   BOOT
========================= */

async function boot(){

  try{
    const h=await api('health');
    state.online=!!h.ok;
  }catch{
    state.online=false;
  }

  await localDB.open().catch(
    e=>errLog.push(
      'IndexedDB: '+e.message
    )
  );

  render();
}


/* =========================
   SHELL
========================= */

function shell(content){

  document.querySelector('#app').innerHTML=`
    <header>

      <div class="brand">
        加密货币生态研究工具 V2 Final
      </div>

      <nav>
        ${NAV.map(
          ([k,n])=>`
            <button
              class="nav ${state.page===k?'active':''}"
              data-page="${k}"
            >
              ${n}
            </button>
          `
        ).join('')}
      </nav>

      <span class="status">
        ${
          state.online
            ? '🟢 D1 已连接'
            : '🟡 本地模式'
        }
      </span>

      <div class="searchbar">
        <div class="global-search-wrap">
          <input
            class="input search"
            id="globalSearch"
            autocomplete="off"
            placeholder="搜索名称 / Symbol / Contract / Chain / Protocol"
            value="${esc(state.query)}"
          >

          <div
            id="globalSearchResults"
            class="search-dropdown"
          ></div>
        </div>
      </div>

    </header>

    <main>
      ${content}
    </main>
  `;

  bind();
}


/* =========================
   CARD
========================= */

function card(
  title,
  value,
  sub=''
){

  return `
    <div class="card">

      <span class="muted">
        ${esc(title)}
      </span>

      <strong>
        ${esc(value)}
      </strong>

      <small class="muted">
        ${esc(sub)}
      </small>

    </div>
  `;
}


/* =========================
   COUNT
========================= */

async function count(t){

  try{

    return (
      await api(
        t+'?limit=1'
      )
    ).items?.length||0;

  }catch{

    return 0;

  }
}


/* =========================
   DASHBOARD
========================= */

async function pageDashboard(){

  const [
    e,
    p,
    t,
    r,
    s,
    a
  ]=await Promise.all(
    [
      'ecosystems',
      'protocols',
      'tokens',
      'research',
      'snapshots',
      'alerts'
    ].map(count)
  );

  return `
    <section class="hero">

      <div class="eyebrow">
        Research Operating System
      </div>

      <h1>
        研究工作台
      </h1>

      <p class="muted">
        事实、证据、研究、风险、估值、复盘与学习分层保存。
        AI 与自动化只能提出建议，不能越权修改核心判断。
      </p>

    </section>

    <div class="grid">

      ${card('Ecosystems',e)}
      ${card('Protocols',p)}
      ${card('Tokens',t)}
      ${card('Research',r)}
      ${card('Snapshots',s)}
      ${card('Alerts',a)}

      ${card(
        '运行状态',
        state.online?'D1':'Local',
        'D1 是正式事实源'
      )}

      ${card(
        '版本',
        'V2 Final',
        'Schema 2.89'
      )}

    </div>

    <section class="panel">

      <h2>
        主研究路径
      </h2>

      <div class="timeline">

        ${
          [
            'Search → Identity',
            'Identity → Data Quality',
            'Snapshot → History',
            'Evidence → Research',
            'Research → Risk / Valuation / Scenario / Causal',
            'Conclusion → Report',
            'Review → Learning → Mistake Bank'
          ].map(
            (x,i)=>`
              <div>
                <b>${i+1}.</b>
                ${x}
              </div>
            `
          ).join('')
        }

      </div>

    </section>
  `;
}


/* =========================
   TABLE PAGE
========================= */

async function tablePage(
  t,
  title,
  columns
){

  let rows=[];

  try{

    rows=(
      await api(
        t+'?limit=100'
      )
    ).items||[];

  }catch(e){

    return `
      <section class="panel">

        <h1>
          ${esc(title)}
        </h1>

        <div class="dangerbox">
          ${esc(e.message)}
        </div>

      </section>
    `;
  }

  return `
    <section>

      <h1>
        ${esc(title)}
      </h1>

      <div class="toolbar">

        <button
          class="btn"
          data-create="${esc(t)}"
        >
          ＋ 新建
        </button>

        <button
          class="btn secondary"
          data-refresh
        >
          刷新
        </button>

      </div>

      <div class="tablewrap">

        <table>

          <thead>

            <tr>

              ${
                columns.map(
                  c=>`<th>${esc(c[1])}</th>`
                ).join('')
              }

              <th>
                操作
              </th>

            </tr>

          </thead>

          <tbody>

            ${
              rows.map(
                x=>`

                  <tr>

                    ${
                      columns.map(
                        c=>`
                          <td>
                            ${esc(
                              typeof x[c[0]]==='object'
                                ? JSON.stringify(x[c[0]])
                                : x[c[0]]??'—'
                           
