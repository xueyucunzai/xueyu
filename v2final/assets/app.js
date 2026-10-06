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
  selectedChain: null
};

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

  const data = await r.json();

  if (!r.ok || data.ok === false) {
    throw new Error(
      data.error?.message || `HTTP ${r.status}`
    );
  }

  return data;
}

function render() {
  const app = document.querySelector("#app");

  if (!app) return;

  app.innerHTML = `
    <header class="header">

      <div class="brand">
        加密货币生态研究工具 V2 Final
      </div>

      <nav>
        ${NAV.map(([id, name]) => `
          <button
            class="nav"
            data-page="${id}"
          >
            ${name}
          </button>
        `).join("")}
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

function searchGroup(title, items, type) {
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

          const isChain =
            type === "chain";

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
                  ${esc(
                    x.object_type === "chain"
                      ? "公链"
                      : x.object_type === "protocol"
                        ? "协议"
                        : x.object_type === "token"
                          ? "代币"
                          : "对象"
                  )}

                  ·

                  ${esc(
                    x.source ||
                    x.source_label ||
                    "D1"
                  )}
                </div>

              </div>

              ${
                isChain
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

function searchPage() {

  const chains =
    state.search
      .filter(
        x => x.object_type === "chain"
      )
      .slice(0, 10);

  const protocols =
    state.search
      .filter(
        x => x.object_type === "protocol"
      )
      .slice(0, 10);

  const tokens =
    state.search
      .filter(
        x => x.object_type === "token"
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

function ecosystemPage() {

  const chain =
    state.selectedChain || {};

  const name =
    chain.name ||
    "Unknown";

  const symbol =
    chain.symbol ||
    "-";

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
            <b>类型</b>
            <p>Chain / 公链</p>
          </div>

          <div class="card">
            <b>Symbol</b>
            <p>${esc(symbol)}</p>
          </div>

          <div class="card">
            <b>数据来源</b>
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

          ${metricCard(
            "TVL",
            "NO_DATA",
            "Total Value Locked · 总锁仓价值"
          )}

          ${metricCard(
            "Stablecoins",
            "NO_DATA",
            "稳定币规模"
          )}

          ${metricCard(
            "DEX Volume",
            "NO_DATA",
            "去中心化交易所交易量"
          )}

          ${metricCard(
            "Fees",
            "NO_DATA",
            "协议产生的费用"
          )}

          ${metricCard(
            "Revenue",
            "NO_DATA",
            "协议收入"
          )}

          ${metricCard(
            "Users",
            "NO_DATA",
            "用户 / 活跃地址"
          )}

        </div>

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
            <span class="status-wait">
              NO_DATA
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

function metricCard(title, value, description) {
  return `
    <div class="card">

      <b>
        ${title}
      </b>

      <h2>
        ${value}
      </h2>

      <p class="muted">
        ${description}
      </p>

    </div>
  `;
}

function bind() {

  document.querySelectorAll("[data-page]")
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
    document.querySelector("#searchInput");

  const searchButton =
    document.querySelector("#searchButton");

  async function doSearch() {

    const q =
      input?.value.trim();

    if (!q) return;

    state.query = q;

    try {

      const result =
        await api(
          "search?q=" +
          encodeURIComponent(q)
        );

      state.search =
        result.items || [];

    } catch (error) {

      state.search = [];

      console.error(
        "Search error:",
        error
      );

    }

    render();
  }

  if (input) {

    input.onkeydown = (e) => {

      if (e.key === "Enter") {
        doSearch();
      }

    };

  }

  if (searchButton) {
    searchButton.onclick =
      doSearch;
  }

  document.querySelectorAll("[data-result]")
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

        if (type === "chain") {

          state.selectedChain = x;

          state.page =
            "ecosystem";

          location.hash =
            "ecosystem";

          render();

          return;
        }

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

      };

    });

  const backSearch =
    document.querySelector("#backSearch");

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

addEventListener(
  "hashchange",
  () => {

    state.page =
      location.hash.slice(1) ||
      "dashboard";

    render();

  }
);

render();
