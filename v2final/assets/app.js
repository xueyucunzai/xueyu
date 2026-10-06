const API = "/api/";

const NAV = [
  ["dashboard", "Dashboard"],
  ["search", "Search"],
  ["ecosystems", "Ecosystems"],
  ["protocols", "Protocols"],
  ["tokens", "Tokens"],
  ["research", "Research"],
  ["reports", "Reports"],
  ["learning", "Learning"],
  ["system", "System"]
];

const state = {
  page: location.hash.slice(1) || "dashboard",
  search: [],
  query: "",
  selectedChain: null,

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
  const r = await fetch(API + path, {
    cache: "no-store"
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok || data.ok === false) {
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
  const n = Number(value);

  if (!Number.isFinite(n)) {
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
  const n = Number(value);

  if (!Number.isFinite(n)) {
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
  const n = Number(timestamp);

  if (!Number.isFinite(n)) {
    return "-";
  }

  const d = new Date(
    n * 1000
  );

  if (Number.isNaN(d.getTime())) {
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


/* =========================
   重置指标
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
   通用指标读取器
========================= */

async function loadMetric(
  key,
  chain,
  targetBuilder,
  parser,
  loadingKey
) {

  const name = String(
    chain?.name ||
    chain?.chain ||
    ""
  ).trim();


  if (!name) {
    return;
  }


  state.chainMetrics[loadingKey] = true;

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
      await fetchProxy(target);


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

  if (!Array.isArray(data)) {
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

async function loadChainTvl(chain) {

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

  }
  else {

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
                    "D1"
                  )}

                </div>

              </div>


              ${
                type === "chain"

                  ? `

                    <div class="search-action">
                      进入生态 →
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
            placeholder="例如：Ethereum / Solana / BNB"
            value="${esc(state.query)}"
          >


          <button
            id="searchButton"
            class="button"
          >
            搜索
          </button>

        </div>


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
                  输入关键词开始搜索。
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

            ? `

              <p class="muted">

                TVL 数据读取失败：

                ${esc(
                  m.tvlError
                )}

              </p>

            `

            : ""
        }


        ${
          m.stablecoinsError

            ? `

              <p class="muted">

                Stablecoins
                数据读取失败：

                ${esc(
                  m.stablecoinsError
                )}

              </p>

            `

            : ""
        }


        ${
          m.dexVolumeError

            ? `

              <p class="muted">

                DEX Volume
                数据读取失败：

                ${esc(
                  m.dexVolumeError
                )}

              </p>

            `

            : ""
        }


        ${
          m.feesError

            ? `

              <p class="muted">

                Fees
                数据读取失败：

                ${esc(
                  m.feesError
                )}

              </p>

            `

            : ""
        }


        ${
          m.revenueError

            ? `

              <p class="muted">

                Revenue
                数据读取失败：

                ${esc(
                  m.revenueError
                )}

              </p>

            `

            : ""
        }


        ${
          m.usersError

            ? `

              <p class="muted">

                Users
                数据读取失败：

                ${esc(
                  m.usersError
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
   Bind
========================= */

function bind() {


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


    try {

      const result =
        await api(
          "search?q=" +
          encodeURIComponent(q)
        );


      state.search =
        result.items || [];


    } catch (error) {

      console.error(
        "Search error:",
        error
      );

      state.search = [];

    }


    render();

  }


  if (input) {

    input.onkeydown =
      (e) => {

        if (e.key === "Enter") {

          doSearch();

        }

      };

  }


  if (searchButton) {

    searchButton.onclick =
      doSearch;

  }


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


        if (
          type !== "chain"
        ) {

          alert(

            `${x?.name || "Unknown"}\n\n` +

            `类型：${
              x?.object_type || "-"
            }\n` +

            `来源：${
              x?.source ||
              x?.source_label ||
              "-"
            }`

          );

          return;

        }


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


        /*
          六个指标同时读取。

          如果某个接口失败，
          该指标保持 NO_DATA，
          不影响其他指标。
        */

        loadChainTvl(x);

        loadChainStablecoins(x);

        loadChainDexVolume(x);

        loadChainFees(x);

        loadChainRevenue(x);

        loadChainUsers(x);

      };

    });


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
