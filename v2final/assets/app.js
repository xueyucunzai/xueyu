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
  query: ""
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
          Search 已连接 D1，
          并支持 DeFiLlama 公链搜索。
        </p>

      </div>

    </section>
  `;
}

function searchGroup(title, items) {
  if (!items.length) {
    return "";
  }

  return `
    <div class="search-group">

      <h3>
        ${title}
      </h3>

      ${items.map((x) => {

        const index =
          state.search.indexOf(x);

        return `
          <div
            class="card"
            data-result="${index}"
            style="cursor:pointer"
          >

            <b>
              ${esc(
                x.name ||
                x.symbol ||
                "Unknown"
              )}
            </b>

            ${
              x.symbol
                ? `
                  <span class="tag">
                    ${esc(x.symbol)}
                  </span>
                `
                : ""
            }

            <p class="muted">
              ${esc(
                x.object_type ||
                "object"
              )}
              ·
              ${esc(
                x.source ||
                x.source_label ||
                "D1"
              )}
            </p>

          </div>
        `;
      }).join("")}

    </div>
  `;
}

function searchPage() {

  const chains =
    state.search.filter(
      x => x.object_type === "chain"
    );

  const protocols =
    state.search.filter(
      x => x.object_type === "protocol"
    );

  const tokens =
    state.search.filter(
      x => x.object_type === "token"
    );

  const others =
    state.search.filter(
      x =>
        x.object_type !== "chain" &&
        x.object_type !== "protocol" &&
        x.object_type !== "token"
    );

  return `
    <section>

      <h1>
        Search / Identity
      </h1>

      <div class="panel">

        <input
          id="searchInput"
          class="input"
          placeholder="搜索 Ethereum / Solana / BNB / JUP..."
          value="${esc(state.query)}"
        >

        <div id="searchResults">

          ${
            state.search.length
              ? `
                ${searchGroup(
                  "⭐ Chain / 公链",
                  chains
                )}

                ${searchGroup(
                  "Protocol / 协议",
                  protocols
                )}

                ${searchGroup(
                  "Token / 代币",
                  tokens
                )}

                ${searchGroup(
                  "Other / 其他",
                  others
                )}
              `
              : `
                <div class="empty">
                  输入关键词搜索。
                </div>
              `
          }

        </div>

      </div>

    </section>
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

  if (input) {

    input.onkeydown = async (e) => {

      if (e.key !== "Enter") {
        return;
      }

      const q =
        input.value.trim();

      if (!q) {
        return;
      }

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

    };

  }

  document.querySelectorAll("[data-result]")
    .forEach((item) => {

      item.onclick = () => {

        const index =
          Number(
            item.dataset.result
          );

        const x =
          state.search[index];

        alert(
          `${x?.name || "Unknown"}\n\n` +
          `类型：${x?.object_type || "-"}\n` +
          `来源：${
            x?.source ||
            x?.source_label ||
            "-"
          }`
        );

      };

    });

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
