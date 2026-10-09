const API = "/api/";

const NAV = [
  ["dashboard", "Dashboard"],
  ["search", "Search"],
  ["ecosystem", "Ecosystems"],
  ["protocol", "Protocols"],
  ["token", "Tokens"],
  ["research", "Research"],
  ["reports", "Reports"],
  ["learning", "Learning"],
  ["system", "System"]
];

const state = {
  page: location.hash.slice(1) || "dashboard",

  search: [],
  searchError: "",
  query: "",

  selfCheck: {
    running: false,
    checkedAt: null,
    results: []
  },

  selectedChain: null,
  selectedProtocol: null,
  selectedToken: null,

  chainMetrics: {
    tvl: null,
    tvlDate: null,
    tvlLoading: false,
    tvlError: null,

    stablecoins: null,
    stablecoinsDate: null,
    stablecoinsLoading: false,
    stablecoinsError: null,

    dexVolume: null,
    dexVolumeDate: null,
    dexVolumeLoading: false,
    dexVolumeError: null,

    fees: null,
    feesDate: null,
    feesLoading: false,
    feesError: null,

    revenue: null,
    revenueDate: null,
    revenueLoading: false,
    revenueError: null,

    users: null,
    usersDate: null,
    usersLoading: false,
    usersError: null
  },

  protocolMetrics: {
    tvl: null,
    tvlDate: null,
    tvlLoading: false,
    tvlError: null
  }
};


/* =========================
   基础工具
========================= */

const esc = (x) =>
  String(x ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);


async function api(path) {

  const r = await fetch(
    API + path,
    {
      cache: "no-store"
    }
  );

  const data =
    await r.json().catch(
      () => ({})
    );

  if (
    !r.ok ||
    data.ok === false
  ) {

    throw new Error(
      data.error?.message ||
      `HTTP ${r.status}`
    );

  }

  return data;
}


async function fetchProxy(target) {

  const r = await fetch(
    API +
    "proxy?url=" +
    encodeURIComponent(target),
    {
      cache: "no-store"
    }
  );

  if (!r.ok) {

    throw new Error(
      `HTTP ${r.status}`
    );

  }

  return r.json();
}


/* =========================
   数字 / 日期
========================= */

function formatUSD(value) {

  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {

    return "NO_DATA";

  }

  if (n >= 1e12) {

    return "$" +
      (n / 1e12).toFixed(2) +
      "T";

  }

  if (n >= 1e9) {

    return "$" +
      (n / 1e9).toFixed(2) +
      "B";

  }

  if (n >= 1e6) {

    return "$" +
      (n / 1e6).toFixed(2) +
      "M";

  }

  if (n >= 1e3) {

    return "$" +
      (n / 1e3).toFixed(2) +
      "K";

  }

  return "$" +
    n.toFixed(2);
}


function formatNumber(value) {

  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {

    return "NO_DATA";

  }

  return new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits: 0
    }
  ).format(n);
}


function formatDate(timestamp) {

  const n =
    Number(timestamp);

  if (
    !Number.isFinite(n)
  ) {

    return "-";

  }

  const d =
    new Date(
      n * 1000
    );

  if (
    Number.isNaN(
      d.getTime()
    )
  ) {

    return "-";

  }

  return d.toLocaleString(
    "zh-CN",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function isFiniteNumber(value) {

  return Number.isFinite(
    Number(value)
  );

}


/* =========================
   重置 Chain 指标
========================= */

function resetMetrics() {

  state.chainMetrics = {

    tvl: null,
    tvlDate: null,
    tvlLoading: false,
    tvlError: null,

    stablecoins: null,
    stablecoinsDate: null,
    stablecoinsLoading: false,
    stablecoinsError: null,

    dexVolume: null,
    dexVolumeDate: null,
    dexVolumeLoading: false,
    dexVolumeError: null,

    fees: null,
    feesDate: null,
    feesLoading: false,
    feesError: null,

    revenue: null,
    revenueDate: null,
    revenueLoading: false,
    revenueError: null,

    users: null,
    usersDate: null,
    usersLoading: false,
    usersError: null

  };

}


/* =========================
   重置 Protocol 指标
========================= */

function resetProtocolMetrics() {

  state.protocolMetrics = {

    tvl: null,
    tvlDate: null,
    tvlLoading: false,
    tvlError: null

  };

}


/* =========================
   通用 Chain 指标读取器
========================= */

async function loadMetric(
  key,
  chain,
  targetBuilder,
  parser,
  loadingKey
) {

  const name =
    String(
      chain?.name ||
      chain?.chain ||
      ""
    ).trim();


  if (!name) {

    return;

  }


  state.chainMetrics[
    loadingKey
  ] = true;

  state.chainMetrics[
    key + "Error"
  ] = null;

  render();


  try {

    const target =
      targetBuilder(name);


    console.log(
      `[${key}] Request:`,
      target
    );


    const raw =
      await fetchProxy(
        target
      );


    console.log(
      `[${key}] Response:`,
      raw
    );


    const result =
      parser(raw);


    if (
      !result ||
      !Number.isFinite(
        Number(result.value)
      )
    ) {

      throw new Error(
        "没有找到有效数据"
      );

    }


    state.chainMetrics[key] =
      Number(result.value);


    state.chainMetrics[
      key + "Date"
    ] =
      result.date ||
      Math.floor(
        Date.now() / 1000
      );


    state.chainMetrics[
      key + "Error"
    ] = null;


  } catch (error) {

    console.error(
      `[${key}] Error:`,
      error
    );


    state.chainMetrics[key] =
      null;

    state.chainMetrics[
      key + "Date"
    ] = null;

    state.chainMetrics[
      key + "Error"
    ] =
      error?.message ||
      String(error);

  }


  state.chainMetrics[
    loadingKey
  ] = false;


  if (
    state.page === "ecosystem"
  ) {

    render();

  }

}


/* =========================
   数组最新数据
========================= */

function parseLatestArray(
  data,
  valueGetter
) {

  if (
    !Array.isArray(data)
  ) {

    return null;

  }


  for (
    let i = data.length - 1;
    i >= 0;
    i--
  ) {

    const row =
      data[i];


    const value =
      Number(
        valueGetter(row)
      );


    const date =
      Number(
        row?.date ??
        row?.timestamp
      );


    if (
      Number.isFinite(value) &&
      Number.isFinite(date)
    ) {

      return {
        value,
        date
      };

    }

  }


  return null;

}


/* =========================
   TVL
========================= */

async function loadChainTvl(
  chain
) {

  return loadMetric(

    "tvl",

    chain,

    (name) =>
      "https://api.llama.fi/v2/historicalChainTvl/" +
      encodeURIComponent(name),

    (data) =>
      parseLatestArray(
        data,
        (row) =>
          row?.tvl
      ),

    "tvlLoading"

  );

}


/* =========================
   Stablecoins
========================= */

async function loadChainStablecoins(
  chain
) {

  return loadMetric(

    "stablecoins",

    chain,

    (name) =>
      "https://stablecoins.llama.fi/stablecoincharts/" +
      encodeURIComponent(name),

    (data) =>
      parseLatestArray(
        data,
        (row) =>
          row
            ?.totalCirculatingUSD
            ?.peggedUSD
      ),

    "stablecoinsLoading"

  );

}


/* =========================
   DEX Volume
========================= */

async function loadChainDexVolume(
  chain
) {

  return loadMetric(

    "dexVolume",

    chain,

    (name) =>
      "https://api.llama.fi/overview/dexs/" +
      encodeURIComponent(name),

    (data) => {

      const value =
        Number(
          data?.total24h
        );


      if (
        Number.isFinite(value)
      ) {

        return {

          value,

          date:
            Math.floor(
              Date.now() / 1000
            )

        };

      }


      return null;

    },

    "dexVolumeLoading"

  );

}


/* =========================
   Fees
========================= */

async function loadChainFees(
  chain
) {

  return loadMetric(

    "fees",

    chain,

    (name) =>
      "https://api.llama.fi/overview/fees/" +
      encodeURIComponent(name) +
      "?excludeTotalDataChart=true" +
      "&excludeTotalDataChartBreakdown=true" +
      "&dataType=dailyFees",

    (data) => {

      const value =
        Number(
          data?.total24h
        );


      if (
        Number.isFinite(value)
      ) {

        return {

          value,

          date:
            Math.floor(
              Date.now() / 1000
            )

        };

      }


      return null;

    },

    "feesLoading"

  );

}


/* =========================
   Revenue
========================= */

async function loadChainRevenue(
  chain
) {

  return loadMetric(

    "revenue",

    chain,

    (name) =>
      "https://api.llama.fi/overview/fees/" +
      encodeURIComponent(name) +
      "?excludeTotalDataChart=true" +
      "&excludeTotalDataChartBreakdown=true" +
      "&dataType=dailyRevenue",

    (data) => {

      const value =
        Number(
          data?.total24h
        );


      if (
        Number.isFinite(value)
      ) {

        return {

          value,

          date:
            Math.floor(
              Date.now() / 1000
            )

        };

      }


      return null;

    },

    "revenueLoading"

  );

}


/* =========================
   Users
========================= */

async function loadChainUsers(
  chain
) {

  return loadMetric(

    "users",

    chain,

    (name) =>
      "https://api.llama.fi/v2/metrics/active-users/chain/" +
      encodeURIComponent(name) +
      "?dataType=dailyActiveUsers",

    (data) => {

      const value =
        Number(
          data?.total24h
        );


      if (
        Number.isFinite(value)
      ) {

        return {

          value,

          date:
            Math.floor(
              Date.now() / 1000
            )

        };

      }


      if (
        Array.isArray(data)
      ) {

        return parseLatestArray(
          data,
          (row) =>
            row?.value ??
            row?.activeUsers
        );

      }


      return null;

    },

    "usersLoading"

  );

}


/* =========================
   Protocol TVL
========================= */

async function loadProtocolTvl(
  protocol
) {

  const slug =
    String(
      protocol?.source_id ||
      protocol?.id ||
      ""
    ).trim();


  if (!slug) {

    state.protocolMetrics
      .tvlLoading = false;

    state.protocolMetrics
      .tvlError =
        "缺少 DeFiLlama Source ID";

    render();

    return;

  }


  state.protocolMetrics
    .tvlLoading = true;

  state.protocolMetrics
    .tvlError = null;


  render();


  try {

    const target =
      "https://api.llama.fi/protocol/" +
      encodeURIComponent(
        slug
      );


    console.log(
      "[protocol-tvl] Request:",
      target
    );


    const data =
      await fetchProxy(
        target
      );


    console.log(
      "[protocol-tvl] Response:",
      data
    );


    let value =
      Number(
        data?.tvl
      );


    let date =
      Math.floor(
        Date.now() / 1000
      );


    if (
      !Number.isFinite(value) &&
      Array.isArray(
        data?.tvl
      )
    ) {

      const latest =
        parseLatestArray(
          data.tvl,
          (row) =>
            row?.totalLiquidityUSD ??
            row?.tvl ??
            row?.liquidity
        );


      if (latest) {

        value =
          latest.value;

        date =
          latest.date;

      }

    }


    if (
      !Number.isFinite(value)
    ) {

      throw new Error(
        "没有找到有效 TVL 数据"
      );

    }


    state.protocolMetrics.tvl =
      value;

    state.protocolMetrics
      .tvlDate =
      date;

    state.protocolMetrics
      .tvlError = null;


  } catch (error) {

    console.error(
      "[protocol-tvl] Error:",
      error
    );


    state.protocolMetrics.tvl =
      null;

    state.protocolMetrics
      .tvlDate = null;

    state.protocolMetrics
      .tvlError =
        error?.message ||
        String(error);

  }


  state.protocolMetrics
    .tvlLoading = false;


  if (
    state.page === "protocol"
  ) {

    render();

  }

}


/* =========================
   Protocol Token 提取
========================= */

/*
  后端返回结构目前可能存在不同版本。

  这里不制造数据，只从已经返回的
  protocol 对象中寻找关联 Token。

  支持：

  protocol.token
  protocol.tokens
  protocol.protocol_tokens
  protocol.associated_token
  protocol.associated_tokens

  如果后端没有返回 Token，
  页面明确显示 NO_DATA。
*/

function getProtocolTokens(
  protocol
) {

  if (!protocol) {

    return [];

  }


  const candidates = [];


  const add = (value) => {

    if (!value) {

      return;

    }


    if (Array.isArray(value)) {

      value.forEach(add);

      return;

    }


    if (
      typeof value === "object"
    ) {

      candidates.push(value);

    }

  };


  add(protocol.token);

  add(protocol.tokens);

  add(protocol.protocol_token);

  add(protocol.protocol_tokens);

  add(protocol.associated_token);

  add(protocol.associated_tokens);


  const result = [];


  const seen = new Set();


  candidates.forEach((token) => {

    const key =
      String(
        token.id ||
        token.address ||
        token.contract_address ||
        token.symbol ||
        token.name ||
        ""
      ).toLowerCase();


    if (!key) {

      return;

    }


    if (
      seen.has(key)
    ) {

      return;

    }


    seen.add(key);

    result.push(token);

  });


  return result;

}


/* =========================
   Token Identity
========================= */

function tokenIdentity(
  token
) {

  if (!token) {

    return {
      name: "Unknown",
      symbol: "-",
      chain: "NO_DATA",
      contract: "NO_DATA",
      source: "NO_DATA"
    };

  }


  return {

    name:
      token.name ||
      token.token_name ||
      "Unknown",

    symbol:
      token.symbol ||
      token.ticker ||
      "-",

    chain:
      token.chain ||
      token.chain_name ||
      token.network ||
      "NO_DATA",

    contract:
      token.contract_address ||
      token.address ||
      token.contract ||
      "NO_DATA",

    source:
      token.source ||
      token.source_label ||
      "NO_DATA"

  };

}


/* =========================
   Metric Card
========================= */

function metricCard(
  title,
  value,
  description
) {

  return `

    <div class="card">

      <b>
        ${esc(title)}
      </b>

      <h2>
        ${esc(value)}
      </h2>

      <p class="muted">
        ${esc(description)}
      </p>

    </div>

  `;

}


/* =========================
   Metric Value
========================= */

function metricValue(
  metrics,
  key,
  title,
  description,
  money = true
) {

  const loading =
    metrics[
      key + "Loading"
    ];


  const value =
    metrics[key];


  const date =
    metrics[
      key + "Date"
    ];


  let displayValue;


  if (loading) {

    displayValue =
      "读取中...";

  } else {

    displayValue =
      money
        ? formatUSD(value)
        : formatNumber(value);

  }


  let text =
    description;


  if (
    date &&
    Number.isFinite(
      Number(value)
    )
  ) {

    text +=
      " · 数据时间 " +
      formatDate(date);

  }


  return metricCard(
    title,
    displayValue,
    text
  );

}


/* =========================
   Render
========================= */

function render() {

  const app =
    document.querySelector(
      "#app"
    );


  if (!app) {

    return;

  }


  app.innerHTML = `

    <header class="header">

      <div class="brand">
        加密货币生态研究工具 V2 Final
      </div>


      <nav>

        ${NAV.map(
          ([id, name]) => `

            <button
              class="nav ${
                state.page === id
                  ? "active"
                  : ""
              }"
              data-page="${id}"
            >
              ${name}
            </button>

          `
        ).join("")}

      </nav>

    </header>


    <main>

      ${
        state.page === "search"

          ? searchPage()

          : state.page === "ecosystem"

            ? ecosystemPage()

            : state.page === "protocol"

              ? protocolPage()

              : state.page === "token"

                ? tokenPage()

                : state.page === "system"

                  ? systemPage()

                  : dashboardPage()
      }

    </main>

  `;


  bind();

}


/* =========================
   Dashboard
========================= */

function dashboardPage() {

  return `

    <section class="hero">

      <h1>
        加密货币生态研究工具
      </h1>

      <p class="muted">
        V2 Final
      </p>


      <div class="panel">

        <h2>
          系统状态
        </h2>

        <p>
          前端已经启动。
        </p>

        <p class="muted">
          Search、D1 和 DeFiLlama
          公链搜索已经连接。
        </p>

      </div>

    </section>

  `;

}


/* =========================
   System Self-Check
========================= */

function systemPage() {

  const results = state.selfCheck.results || [];

  const statusText = (status) => {
    if (status === "ok") return "正常";
    if (status === "error") return "异常";
    if (status === "checking") return "检查中";
    if (status === "registered") return "已接入";
    return "未检查";
  };

  const statusClass = (status) => {
    if (status === "ok") return "status-ok";
    if (status === "error") return "status-wait";
    return "muted";
  };

  const modules = [
    {
      name: "前端界面",
      detail: "已定义前端应用与页面分发；实际运行状态以本页接口检查为准",
      status: "registered"
    },
    {
      name: "搜索模块",
      detail: "查询公链、协议和代币；运行时检查会发起一次 Ethereum 搜索",
      status: results.find(x => x.id === "search")?.status || "idle"
    },
    {
      name: "后端健康接口",
      detail: "请求 /api/health；用于确认 API 服务可响应",
      status: results.find(x => x.id === "health")?.status || "idle"
    },
    {
      name: "D1 数据表自检",
      detail: "请求 /api/self-check；逐表检查 D1 表是否存在且可读取",
      status: results.find(x => x.id === "self-check")?.status || "idle"
    },
    {
      name: "公链详情模块",
      detail: "页面入口已接入；公链指标数据需单独验证",
      status: "registered"
    },
    {
      name: "协议详情模块",
      detail: "页面入口已接入；TVL 等外部数据需单独验证",
      status: "registered"
    },
    {
      name: "代币详情模块",
      detail: "页面入口已接入；市场字段可能显示 NO_DATA",
      status: "registered"
    }
  ];

  return `<br><br>    <section class="hero"><br><br>      <h1>系统自检中心</h1><br><br>      <p class="muted"><br>        检查模块入口、后端健康接口、搜索接口和 D1 数据表可读取状态。模块“已接入”不代表所有外部数据源都正常。<br>      </p><br><br>      <div class="panel"><br>        <h2>运行检查</h2><br>        <button id="runSelfCheck" class="button" ${state.selfCheck.running ? "disabled" : ""}><br>          ${state.selfCheck.running ? "检查中…" : "运行自检"}<br>        </button><br>        <button id="copySelfCheckReport" class="button" type="button">复制检查结果</button><br>        <p class="muted"><br>          ${state.selfCheck.checkedAt ? "最近检查：" + esc(state.selfCheck.checkedAt) : "尚未运行接口检查。"}<br>        </p><br>      </div><br><br>      <div class="panel"><br>        <h2>模块状态</h2><br>        <div class="status-list"><br>          ${modules.map((m) => `
            <div class="card">
              <b>${esc(m.name)}</b>
              <span class="${statusClass(m.status)}" style="float:right">
                ${statusText(m.status)}
              </span>
              <p class="muted">${esc(m.detail)}</p>
            </div>
          `).join("")}<br>        </div><br>      </div><br><br>      ${results.length ? `
        <div class="panel">
          <h2>接口检查结果</h2>
          <div class="status-list">
            ${results.map((r) => `<br>              <div class="card"><br>                <b>${esc(r.name)}</b><br>                <span class="${statusClass(r.status)}" style="float:right"><br>                  ${statusText(r.status)}<br>                </span><br>                <p class="muted">${esc(r.detail)}</p><br>                ${Number.isFinite(r.durationMs) ? `<p class="muted">耗时：${r.durationMs} ms</p>` : ""}<br>                ${r.id === "self-check" && Array.isArray(r.tableResults) ? `<details><summary>查看逐表结果（${r.tableResults.length} 张）</summary><div class="status-list">${r.tableResults.map(t => `<p>${esc(t.table)}：${t.ok ? "正常" : "异常"}；记录数 ${esc(t.count ?? "NO_DATA")}${t.error ? "；" + esc(t.error) : ""}</p>`).join("")}</div></details>` : ""}<br>              </div><br>            `).join("")}
          </div>
        </div>
      ` : ""}<br><br>      <div class="panel"><br>        <h2>检查范围说明</h2><br>        <p class="muted"><br>          本自检会检查前端模块入口、健康接口、一次 Ethereum 搜索，并读取 /api/self-check 的逐表结果。D1 表检查只确认表可读取及记录数查询成功，不代表表内业务数据完整；若汇总字段与逐表结果不一致，应按异常处理。此检查也不会逐项验证 DeFiLlama 各指标或 CoinGecko 全部代币数据。<br>        </p><br>      </div><br><br>    </section><br><br>  `;

}


/* =========================
   Search Group
========================= */

function searchGroup(
  title,
  items,
  type
) {

  if (!items.length) {

    return `

      <section class="search-section">

        <h2>
          ${title}
        </h2>

        <div class="empty">
          暂无相关结果
        </div>

      </section>

    `;

  }


  return `

    <section class="search-section">

      <h2>
        ${title}
      </h2>


      <div class="search-list">

        ${items.map((x) => {

          const index =
            state.search.indexOf(x);


          return `

            <div
              class="card search-card"
              data-result="${index}"
              data-type="${type}"
              style="cursor:pointer"
            >

              <div class="search-main">

                <div class="search-name">

                  ${esc(
                    x.name ||
                    x.symbol ||
                    "Unknown"
                  )}

                  ${
                    x.symbol

                      ? `

                        <span class="tag">
                          ${esc(x.symbol)}
                        </span>

                      `

                      : ""
                  }

                </div>


                <div class="search-source">

                  ${
                    esc(
                      x.object_type === "chain"
                        ? "公链"
                        : x.object_type === "protocol"
                          ? "协议"
                          : x.object_type === "token"
                            ? "代币"
                            : "对象"
                    )
                  }

                  ·

                  ${esc(
                    x.source ||
                    x.source_label ||
                    (
                      x.is_external === true
                        ? "外部来源未知"
                        : x.is_external === false
                          ? "D1"
                          : "来源未知"
                    )
                  )}

                  ${x.is_external === true
                    ? " · 外部结果，未确认入库"
                    : x.is_external === false
                      ? " · 本地结果"
                      : " · 入库状态未知"
                  }

                </div>

              </div>


              ${
                type === "chain"

                  ? `

                    <div class="search-action">
                      进入生态 →
                    </div>

                  `

                  : type === "protocol"

                    ? `

                      <div class="search-action">
                        进入协议 →
                      </div>

                    `

                    : type === "token"

                      ? `

                        <div class="search-action">
                          查看代币 →
                        </div>

                      `

                      : ""

              }

            </div>

          `;

        }).join("")}

      </div>

    </section>

  `;

}


/* =========================
   Search Page
========================= */

function searchPage() {

  const chains =
    state.search
      .filter(
        x =>
          x.object_type === "chain"
      )
      .slice(0, 10);


  const protocols =
    state.search
      .filter(
        x =>
          x.object_type === "protocol"
      )
      .slice(0, 10);


  const tokens =
    state.search
      .filter(
        x =>
          x.object_type === "token"
      )
      .slice(0, 10);


  return `

    <section>

      <h1>
        Search / Identity
      </h1>


      <p class="muted">
        搜索公链、协议和代币。
        公链优先显示。
      </p>


      <div class="panel">

        <div class="search-box">

          <input
            id="searchInput"
            class="input"
            placeholder="例如：Ethereum / Solana / Uniswap"
            value="${esc(state.query)}"
          >


          <button
            id="searchButton"
            class="button"
          >
            搜索
          </button>

        </div>

        ${
          state.searchError
            ? `<p class="muted" role="status">${esc(state.searchError)}</p>`
            : ""
        }

        <div id="searchResults">

          ${
            state.search.length

              ? `

                ${searchGroup(
                  "⭐ 公链 Chain",
                  chains,
                  "chain"
                )}

                ${searchGroup(
                  "🧩 协议 Protocol",
                  protocols,
                  "protocol"
                )}

                ${searchGroup(
                  "🪙 代币 Token",
                  tokens,
                  "token"
                )}

              `

              : `

                <div class="empty">
                  ${state.searchError ? "" : (state.query ? "没有找到匹配结果。" : "输入关键词开始搜索。")}
                </div>

              `
          }

        </div>

      </div>

    </section>

  `;

}


/* =========================
   Ecosystem Page
========================= */

function ecosystemPage() {

  const chain =
    state.selectedChain || {};


  const name =
    chain.name ||
    "Unknown";


  const symbol =
    chain.symbol ||
    "-";


  const m =
    state.chainMetrics;


  const loadedCount = [

    m.tvl,
    m.stablecoins,
    m.dexVolume,
    m.fees,
    m.revenue,
    m.users

  ].filter(
    x => x !== null
  ).length;


  const allMain =
    loadedCount === 6;


  return `

    <section>


      <button
        id="backSearch"
        class="button"
      >
        ← 返回搜索
      </button>


      <div class="hero">

        <h1>
          ${esc(name)}
        </h1>

        <p class="muted">
          ${esc(name)}
          ·
          ${esc(symbol)}
        </p>

      </div>


      <div class="panel">

        <h2>
          基本身份
        </h2>


        <div class="data-grid">


          <div class="card">

            <b>
              类型
            </b>

            <p>
              Chain / 公链
            </p>

          </div>


          <div class="card">

            <b>
              Symbol
            </b>

            <p>
              ${esc(symbol)}
            </p>

          </div>


          <div class="card">

            <b>
              数据来源
            </b>

            <p>
              ${esc(
                chain.source ||
                chain.source_label ||
                "DeFiLlama"
              )}
            </p>

          </div>


        </div>

      </div>


      <div class="panel">

        <h2>
          生态研究
        </h2>


        <div class="data-grid">


          ${metricValue(
            m,
            "tvl",
            "TVL",
            "Total Value Locked · 总锁仓价值"
          )}


          ${metricValue(
            m,
            "stablecoins",
            "Stablecoins",
            "稳定币规模"
          )}


          ${metricValue(
            m,
            "dexVolume",
            "DEX Volume",
            "去中心化交易所 24h 交易量"
          )}


          ${metricValue(
            m,
            "fees",
            "Fees",
            "协议 / 网络 24h 费用"
          )}


          ${metricValue(
            m,
            "revenue",
            "Revenue",
            "协议 / 网络 24h 收入"
          )}


          ${metricValue(
            m,
            "users",
            "Users",
            "24h 活跃地址 / 用户",
            false
          )}


        </div>


        ${
          m.tvlError
            ? `<p class="muted">TVL 数据读取失败：${esc(m.tvlError)}</p>`
            : ""
        }


        ${
          m.stablecoinsError
            ? `<p class="muted">Stablecoins 数据读取失败：${esc(m.stablecoinsError)}</p>`
            : ""
        }


        ${
          m.dexVolumeError
            ? `<p class="muted">DEX Volume 数据读取失败：${esc(m.dexVolumeError)}</p>`
            : ""
        }


        ${
          m.feesError
            ? `<p class="muted">Fees 数据读取失败：${esc(m.feesError)}</p>`
            : ""
        }


        ${
          m.revenueError
            ? `<p class="muted">Revenue 数据读取失败：${esc(m.revenueError)}</p>`
            : ""
        }


        ${
          m.usersError
            ? `<p class="muted">Users 数据读取失败：${esc(m.usersError)}</p>`
            : ""
        }


        <p class="muted">

          数据源：DeFiLlama

          · 页面只显示成功取得的真实数据；

          无法确认时保持 NO_DATA。

        </p>


      </div>


      <div class="panel">

        <h2>
          Protocols / 协议
        </h2>


        <div class="empty">

          生态协议数据将在下一阶段接入。

        </div>

      </div>


      <div class="panel">

        <h2>
          研究状态
        </h2>


        <div class="status-list">


          <div>

            Identity

            <span class="status-ok">
              ✓ 已识别
            </span>

          </div>


          <div>

            Ecosystem

            <span class="status-ok">
              ✓ 已建立
            </span>

          </div>


          <div>

            Metrics

            <span
              class="${
                allMain
                  ? "status-ok"
                  : "status-wait"
              }"
            >

              ${
                allMain

                  ? "✓ 6 项核心指标已接入"

                  : `已接入 ${loadedCount}/6 项`
              }

            </span>

          </div>


          <div>

            Research

            <span class="status-wait">
              未开始
            </span>

          </div>


        </div>

      </div>


    </section>

  `;

}


/* =========================
   Protocol Token Card
========================= */

function protocolTokenCard(
  token
) {

  const t =
    tokenIdentity(token);


  return `

    <div
      class="card"
      data-protocol-token="true"
      style="cursor:pointer"
    >

      <div class="search-main">

        <div class="search-name">

          ${esc(t.name)}

          ${
            t.symbol !== "-"

              ? `

                <span class="tag">
                  ${esc(t.symbol)}
                </span>

              `

              : ""
          }

        </div>


        <div class="search-source">

          Token / 关联代币

          ·

          ${esc(t.chain)}

        </div>

      </div>


      <div class="muted">

        Contract：

        ${esc(t.contract)}

      </div>

    </div>

  `;

}


/* =========================
   Protocol Page
========================= */

function protocolPage() {

  const protocol =
    state.selectedProtocol || {};


  const name =
    protocol.name ||
    "Unknown";


  const symbol =
    protocol.symbol ||
    "-";


  const category =
    protocol.category ||
    protocol.protocol_type ||
    "NO_DATA";


  const chains =
    Array.isArray(
      protocol.chains
    )
      ? protocol.chains
      : [];


  const website =
    protocol.website ||
    "";


  const associatedTokens =
    getProtocolTokens(
      protocol
    );


  const tvl =
    state.protocolMetrics.tvl;


  const tvlLoading =
    state.protocolMetrics
      .tvlLoading;


  let tvlDisplay =
    "NO_DATA";


  if (tvlLoading) {

    tvlDisplay =
      "读取中...";

  } else {

    tvlDisplay =
      formatUSD(tvl);

  }


  return `

    <section>


      <button
        id="backSearch"
        class="button"
      >
        ← 返回搜索
      </button>


      <div class="hero">

        <h1>
          ${esc(name)}
        </h1>

        <p class="muted">
          ${esc(name)}
          ·
          ${esc(symbol)}
        </p>

      </div>


      <div class="panel">

        <h2>
          基本身份
        </h2>


        <div class="data-grid">


          <div class="card">

            <b>
              类型
            </b>

            <p>
              Protocol / 协议
            </p>

          </div>


          <div class="card">

            <b>
              Symbol
            </b>

            <p>
              ${esc(symbol)}
            </p>

          </div>


          <div class="card">

            <b>
              Category
            </b>

            <p>
              ${esc(category)}
            </p>

          </div>


          <div class="card">

            <b>
              数据来源
            </b>

            <p>
              ${esc(
                protocol.source ||
                protocol.source_label ||
                "DeFiLlama"
              )}
            </p>

          </div>


          <div class="card">

            <b>
              Identity Status
            </b>

            <p>
              ${esc(
                protocol.identity_status ||
                "PROPOSED"
              )}
            </p>

          </div>


          <div class="card">

            <b>
              Source ID
            </b>

            <p>
              ${esc(
                protocol.source_id ||
                "NO_DATA"
              )}
            </p>

          </div>


        </div>

      </div>


      <div class="panel">

        <h2>
          Protocol Metrics / 协议指标
        </h2>


        <div class="data-grid">


          <div class="card">

            <b>
              TVL
            </b>

            <h2>
              ${esc(tvlDisplay)}
            </h2>

            <p class="muted">

              Total Value Locked
              · 协议总锁仓价值

              ${
                state.protocolMetrics
                  .tvlDate &&
                Number.isFinite(
                  Number(tvl)
                )

                  ? " · 数据时间 " +
                    formatDate(
                      state.protocolMetrics
                        .tvlDate
                    )

                  : ""
              }

            </p>

          </div>


        </div>


        ${
          state.protocolMetrics
            .tvlError

            ? `

              <p class="muted">

                TVL 数据读取失败：

                ${esc(
                  state.protocolMetrics
                    .tvlError
                )}

              </p>

            `

            : ""
        }


        <p class="muted">

          数据源：DeFiLlama

          · 页面只显示成功取得的真实数据；

          无法确认时保持 NO_DATA。

        </p>

      </div>


      <div class="panel">

        <h2>
          Associated Token / 关联代币
        </h2>


        ${
          associatedTokens.length

            ? `

              <div class="search-list">

                ${associatedTokens
                  .map(
                    protocolTokenCard
                  )
                  .join("")}

              </div>

            `

            : `

              <div class="empty">

                NO_DATA

                <p class="muted">

                  当前 Protocol 对象没有返回
                  可确认的关联 Token。

                  不根据协议名称猜测 Token。

                </p>

              </div>

            `
        }

      </div>


      <div class="panel">

        <h2>
          Supported Chains / 所属链
        </h2>


        ${
          chains.length

            ? `

              <div class="search-list">

                ${chains.map(
                  (chain) => `

                    <div class="card">

                      <b>
                        ${esc(chain)}
                      </b>

                    </div>

                  `
                ).join("")}

              </div>

            `

            : `

              <div class="empty">
                NO_DATA
              </div>

            `
        }

      </div>


      <div class="panel">

        <h2>
          Official Website / 官方网站
        </h2>


        ${
          website

            ? `

              <p>

                <a
                  href="${esc(website)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${esc(website)}
                </a>

              </p>

            `

            : `

              <div class="empty">
                NO_DATA
              </div>

            `
        }

      </div>


      <div class="panel">

        <h2>
          研究状态
        </h2>


        <div class="status-list">


          <div>

            Identity

            <span class="status-ok">
              ✓ 已识别
            </span>

          </div>


          <div>

            Protocol

            <span class="status-ok">
              ✓ 已建立
            </span>

          </div>


          <div>

            Associated Token

            <span
              class="${
                associatedTokens.length
                  ? "status-ok"
                  : "status-wait"
              }"
            >

              ${
                associatedTokens.length
                  ? "✓ 已找到关联 Token"
                  : "NO_DATA"
              }

            </span>

          </div>


          <div>

            TVL

            <span
              class="${
                Number.isFinite(
                  Number(tvl)
                )
                  ? "status-ok"
                  : "status-wait"
              }"
            >

              ${
                Number.isFinite(
                  Number(tvl)
                )

                  ? "✓ 已取得真实数据"

                  : "NO_DATA"
              }

            </span>

          </div>


          <div>

            Research

            <span class="status-wait">
              未开始
            </span>

          </div>


        </div>

      </div>


    </section>

  `;

}


/* =========================
   Token Page
========================= */

function tokenPage() {

  const token =
    state.selectedToken || {};


  const t =
    tokenIdentity(token);


  const price =
    token.price ??
    token.current_price ??
    token.price_usd;


  const marketCap =
    token.market_cap ??
    token.marketCap;


  const fdv =
    token.fdv ??
    token.fully_diluted_valuation;


  const totalSupply =
    token.total_supply ??
    token.totalSupply;


  const circulatingSupply =
    token.circulating_supply ??
    token.circulatingSupply;


  return `

    <section>


      <button
        id="backSearch"
        class="button"
      >
        ← 返回搜索
      </button>


      <div class="hero">

        <h1>
          ${esc(t.name)}
        </h1>

        <p class="muted">

          ${esc(t.name)}

          ·

          ${esc(t.symbol)}

        </p>

      </div>


      <div class="panel">

        <h2>
          Token Identity / 代币身份
        </h2>


        <div class="data-grid">


          <div class="card">

            <b>
              Name
            </b>

            <p>
              ${esc(t.name)}
            </p>

          </div>


          <div class="card">

            <b>
              Symbol
            </b>

            <p>
              ${esc(t.symbol)}
            </p>

          </div>


          <div class="card">

            <b>
              Chain
            </b>

            <p>
              ${esc(t.chain)}
            </p>

          </div>


          <div class="card">

            <b>
              Contract Address
            </b>

            <p>
              ${esc(t.contract)}
            </p>

          </div>


          <div class="card">

            <b>
              Data Source
            </b>

            <p>
              ${esc(t.source)}
            </p>

          </div>


        </div>

      </div>


      <div class="panel">

        <h2>
          Market Data / 市场数据
        </h2>


        <div class="data-grid">


          ${metricCard(
            "Price / 价格",
            isFiniteNumber(price)
              ? formatUSD(price)
              : "NO_DATA",
            "只有后端确认的市场数据才显示"
          )}


          ${metricCard(
            "Market Cap / 市值",
            isFiniteNumber(marketCap)
              ? formatUSD(marketCap)
              : "NO_DATA",
            "流通市值"
          )}


          ${metricCard(
            "FDV / 全稀释估值",
            isFiniteNumber(fdv)
              ? formatUSD(fdv)
              : "NO_DATA",
            "Fully Diluted Valuation"
          )}


          ${metricCard(
            "Total Supply / 总供应量",
            isFiniteNumber(totalSupply)
              ? formatNumber(totalSupply)
              : "NO_DATA",
            "Token 总供应量"
          )}


          ${metricCard(
            "Circulating Supply / 流通量",
            isFiniteNumber(circulatingSupply)
              ? formatNumber(circulatingSupply)
              : "NO_DATA",
            "当前流通供应量"
          )}


        </div>


        <p class="muted">

          页面不会根据 Symbol 或名称猜测价格、市值或 FDV。

          无法确认时保持 NO_DATA。

        </p>

      </div>


      <div class="panel">

        <h2>
          Research Status / 研究状态
        </h2>


        <div class="status-list">


          <div>

            Identity

            <span class="status-ok">
              ✓ 已建立
            </span>

          </div>


          <div>

            Chain

            <span
              class="${
                t.chain !== "NO_DATA"
                  ? "status-ok"
                  : "status-wait"
              }"
            >

              ${
                t.chain !== "NO_DATA"
                  ? "✓ 已确认"
                  : "NO_DATA"
              }

            </span>

          </div>


          <div>

            Contract

            <span
              class="${
                t.contract !== "NO_DATA"
                  ? "status-ok"
                  : "status-wait"
              }"
            >

              ${
                t.contract !== "NO_DATA"
                  ? "✓ 已确认"
                  : "NO_DATA"
              }

            </span>

          </div>


          <div>

            Market Data

            <span
              class="${
                isFiniteNumber(price) ||
                isFiniteNumber(marketCap) ||
                isFiniteNumber(fdv)
                  ? "status-ok"
                  : "status-wait"
              }"
            >

              ${
                isFiniteNumber(price) ||
                isFiniteNumber(marketCap) ||
                isFiniteNumber(fdv)

                  ? "✓ 已取得部分真实数据"

                  : "NO_DATA"
              }

            </span>

          </div>


          <div>

            Research

            <span class="status-wait">
              未开始
            </span>

          </div>


        </div>

      </div>


    </section>

  `;

}


/* =========================
   Bind
========================= */

function bind() {

  const selfCheckButton =
    document.querySelector("#runSelfCheck");

  if (selfCheckButton) {
    selfCheckButton.onclick = async () => {
      state.selfCheck.running = true;
      state.selfCheck.results = [
        {
          id: "health",
          name: "后端健康接口",
          status: "checking",
          detail: "正在请求 /api/health"
        },
        {
          id: "search",
          name: "搜索接口",
          status: "checking",
          detail: "正在查询 Ethereum"
        },
        {
          id: "self-check",
          name: "D1 数据表自检",
          status: "checking",
          detail: "正在请求 /api/self-check"
        }
      ];
      render();

      const runProbe = async (id, name, path, describe) => {
        const started = performance.now();
        try {
          const data = await api(path);
          const durationMs = Math.round(performance.now() - started);

          if (id === "search" && !Array.isArray(data.items)) {
            throw new Error("接口响应缺少 items 数组");
          }

          if (id === "self-check" && (
            !Array.isArray(data.results) ||
            !Number.isFinite(Number(data.total)) ||
            !Number.isFinite(Number(data.failed))
          )) {
            throw new Error("D1 自检响应格式不符合预期");
          }

          if (id === "self-check" && Number(data.failed) > 0) {
            const failedTables = data.results
              .filter(x => !x.ok)
              .map(x => x.table);
            return {
              id, name, status: "error", durationMs,
              detail: "D1 表检查：" + (data.passed ?? 0) + "/" + data.total +
                " 通过，失败 " + data.failed + " 张" +
                (failedTables.length ? "；失败表：" + failedTables.join("、") : ""),
              tableResults: data.results
            };
          }

          if (id === "search" && data.items.length === 0) {
            return {
              id, name, status: "error", durationMs,
              detail: "接口可响应，但 Ethereum 查询返回 0 条结果；需进一步检查数据源"
            };
          }

          return {
            id, name, status: "ok", durationMs,
            detail: describe(data),
            ...(id === "self-check" ? { tableResults: data.results } : {})
          };
        } catch (error) {
          return {
            id, name, status: "error",
            durationMs: Math.round(performance.now() - started),
            detail: error?.message || "请求失败"
          };
        }
      };

      const results = await Promise.all([
        runProbe(
          "health",
          "后端健康接口",
          "health",
          () => "健康接口返回成功响应"
        ),
        runProbe(
          "search",
          "搜索接口",
          "search?q=ethereum",
          (data) => "成功返回 " + data.items.length + " 条结果"
        ),
        runProbe(
          "self-check",
          "D1 数据表自检",
          "self-check",
          (data) => "D1 表检查：" + data.passed + "/" + data.total +
            " 通过，失败 " + data.failed + " 张"
        )
      ]);

      state.selfCheck.results = results;
      state.selfCheck.running = false;
      state.selfCheck.checkedAt = new Date().toLocaleString();
      render();
    };
  }



  const copySelfCheckButton = document.querySelector("#copySelfCheckReport");

  if (copySelfCheckButton) {
    copySelfCheckButton.onclick = async () => {
      const health = state.selfCheck.results.find(x => x.id === "health");
      const search = state.selfCheck.results.find(x => x.id === "search");
      const selfCheck = state.selfCheck.results.find(x => x.id === "self-check");
      const report = [
        "加密货币生态研究工具 V2 Final · 系统自检报告",
        "最近检查：" + (state.selfCheck.checkedAt || "尚未运行"),
        "",
        "模块状态：",
        "前端界面：已接入",
        "搜索模块：" + (search?.status === "ok" ? "正常" : search?.status === "error" ? "异常" : "未检查"),
        "后端健康接口：" + (health?.status === "ok" ? "正常" : health?.status === "error" ? "异常" : "未检查"),
        "D1 数据表自检：" + (selfCheck?.status === "ok" ? "正常" : selfCheck?.status === "error" ? "异常" : "未检查"),
        "D1 自检详情：" + (selfCheck?.detail || "尚未运行 D1 表检查"),
        "公链详情模块：已接入（指标数据需单独验证）",
        "协议详情模块：已接入（TVL 等外部数据需单独验证）",
        "代币详情模块：已接入（市场字段可能显示 NO_DATA）",
        "",
        "接口检查结果：",
        ...(state.selfCheck.results.length
          ? state.selfCheck.results.map(x => [
              x.name + "：" + (x.status === "ok" ? "正常" : x.status === "error" ? "异常" : "检查中"),
              "详情：" + x.detail,
              ...(x.id === "self-check" && Array.isArray(x.tableResults)
                ? ["逐表结果：", ...x.tableResults.map(t =>
                    "  " + t.table + "：" + (t.ok ? "正常" : "异常") +
                    "；记录数 " + (t.count ?? "NO_DATA") +
                    (t.error ? "；" + t.error : "")
                  )]
                : []),
              Number.isFinite(x.durationMs) ? "耗时：" + x.durationMs + " ms" : ""
            ].filter(Boolean).join("\n"))
          : ["尚未运行接口检查。"]),
        "",
        "检查范围：本自检检查前端模块入口、/api/health、一次 Ethereum 搜索，以及 /api/self-check 返回的 D1 表可读取状态；不会验证每张表的数据完整性，也不会逐项验证 DeFiLlama 各指标或 CoinGecko 全部代币数据。"
      ].join("\n");

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(report);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = report;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          const copied = document.execCommand("copy");
          textarea.remove();
          if (!copied) throw new Error("浏览器未允许复制");
        }
        copySelfCheckButton.textContent = "已复制检查结果";
      } catch (error) {
        copySelfCheckButton.textContent = "复制失败，请检查浏览器权限";
      }
    };
  }

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach((button) => {


      button.onclick = () => {

        state.page =
          button.dataset.page;

        location.hash =
          state.page;

        render();

      };


    });


  const input =
    document.querySelector(
      "#searchInput"
    );


  const searchButton =
    document.querySelector(
      "#searchButton"
    );


  async function doSearch() {

    const q =
      input?.value.trim();


    if (!q) {

      return;

    }


    state.query =
      q;

    state.searchError = "";


    try {

      const result =
        await api(
          "search?q=" +
          encodeURIComponent(q)
        );


      state.search =
        result.items || [];

      state.searchError = "";


    } catch (error) {

      console.error(
        "Search error:",
        error
      );

      state.search = [];

      state.searchError =
        error?.message ||
        "搜索失败，请稍后重试";

    }


    render();

  }


  if (input) {

    input.onkeydown =
      (e) => {

        if (
          e.key === "Enter"
        ) {

          doSearch();

        }

      };

  }


  if (searchButton) {

    searchButton.onclick =
      doSearch;

  }


  /* =====================
     Search Result
  ===================== */

  document
    .querySelectorAll(
      "[data-result]"
    )
    .forEach((item) => {


      item.onclick = () => {

        const index =
          Number(
            item.dataset.result
          );


        const type =
          item.dataset.type;


        const x =
          state.search[index];


        if (!x) {

          return;

        }


        /* =====================
           Protocol
        ===================== */

        if (
          type === "protocol"
        ) {

          state.selectedProtocol =
            x;


          resetProtocolMetrics();


          state.protocolMetrics
            .tvlLoading = true;


          state.page =
            "protocol";


          location.hash =
            "protocol";


          render();


          loadProtocolTvl(x);


          return;

        }


        /* =====================
           Token
        ===================== */

        if (
          type === "token"
        ) {

          state.selectedToken =
            x;


          state.page =
            "token";


          location.hash =
            "token";


          render();


          return;

        }


        /* =====================
           Chain
        ===================== */

        state.selectedChain =
          x;


        resetMetrics();


        state.chainMetrics
          .tvlLoading = true;

        state.chainMetrics
          .stablecoinsLoading = true;

        state.chainMetrics
          .dexVolumeLoading = true;

        state.chainMetrics
          .feesLoading = true;

        state.chainMetrics
          .revenueLoading = true;

        state.chainMetrics
          .usersLoading = true;


        state.page =
          "ecosystem";


        location.hash =
          "ecosystem";


        render();


        loadChainTvl(x);

        loadChainStablecoins(x);

        loadChainDexVolume(x);

        loadChainFees(x);

        loadChainRevenue(x);

        loadChainUsers(x);

      };

    });


  /* =====================
     Protocol Token
  ===================== */

  document
    .querySelectorAll(
      "[data-protocol-token]"
    )
    .forEach((item, index) => {

      item.onclick = () => {

        const tokens =
          getProtocolTokens(
            state.selectedProtocol
          );


        const token =
          tokens[index];


        if (!token) {

          return;

        }


        state.selectedToken =
          token;


        state.page =
          "token";


        location.hash =
          "token";


        render();

      };

    });


  /* =====================
     Back Search
  ===================== */

  const backSearch =
    document.querySelector(
      "#backSearch"
    );


  if (backSearch) {

    backSearch.onclick = () => {

      state.page =
        "search";

      location.hash =
        "search";

      render();

    };

  }

}


/* =========================
   Hash Change
========================= */

addEventListener(
  "hashchange",
  () => {

    state.page =
      location.hash.slice(1) ||
      "dashboard";

    render();

  }
);


/* =========================
   Start
========================= */

render();
