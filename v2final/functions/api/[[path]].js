const TABLES = new Set([
  'ecosystems','chains','protocols','protocol_chains','tokens',
  'token_identifiers','protocol_tokens','sources','documents','evidence',
  'snapshots','metrics','token_supply_snapshots','token_allocations',
  'vesting_schedules','unlock_schedules','unlock_events','emissions',
  'research','risks','conclusions','valuations','money_flows','scenarios',
  'comparisons','causal_claims','methodologies','evaluations','events',
  'relationships','kg_nodes','kg_edges','research_projects','research_tasks',
  'research_sessions','learning_records','mistake_bank','reviews',
  'sync_queue','sync_logs','backups','automation_jobs','automation_runs',
  'alerts','notifications','error_logs','review_queue','app_settings'
]);

const NOW = () => Date.now();
const makeId = () => crypto.randomUUID();

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
      'cache-control': 'no-store',
      ...extra
    }
  });
}

function err(code, message, status = 400, field = undefined) {
  return json({
    ok: false,
    error: {
      code,
      message,
      ...(field ? { field } : {})
    }
  }, status);
}

function table(name) {
  return TABLES.has(name) ? name : null;
}

function routeParts(context) {
  const p = context?.params?.path;

  if (Array.isArray(p)) {
    return p
      .filter(Boolean)
      .map(decodeURIComponent);
  }

  return String(p || '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const x = { ...obj };

  for (const k of Object.keys(x)) {
    const key = k.toLowerCase();

    if (
      key.includes('secret') ||
      key.includes('private_key') ||
      key.includes('privatekey') ||
      key.includes('cookie') ||
      key.includes('authorization')
    ) {
      delete x[k];
    }
  }

  return x;
}

async function body(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

/* =========================================================
   DATABASE HELPERS
========================================================= */

async function tableColumns(db, tableName) {
  const r = await db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all();

  return (r.results || []).map(x => x.name);
}

function normalizeValue(value) {
  if (value === undefined) return null;

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    return JSON.stringify(value);
  }

  return value;
}

async function dynamicInsert(db, tableName, data) {
  const columns = await tableColumns(db, tableName);

  const safe = sanitize(data);

  const keys = Object.keys(safe).filter(k =>
    columns.includes(k) &&
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)
  );

  if (!keys.length) {
    throw new Error(`No valid columns for ${tableName}`);
  }

  const placeholders = keys.map(() => '?').join(',');

  const values = keys.map(k =>
    normalizeValue(safe[k])
  );

  await db
    .prepare(
      `INSERT OR IGNORE INTO ${tableName}
       (${keys.join(',')})
       VALUES (${placeholders})`
    )
    .bind(...values)
    .run();

  return safe;
}

async function list(db, tableName, url) {
  const rawLimit = Number(
    url.searchParams.get('limit') || 50
  );

  const limit = Math.min(
    Math.max(
      Number.isFinite(rawLimit) ? rawLimit : 50,
      1
    ),
    200
  );

  const rawOffset = Number(
    url.searchParams.get('offset') || 0
  );

  const offset = Math.max(
    Number.isFinite(rawOffset) ? rawOffset : 0,
    0
  );

  let order = 'rowid DESC';

  try {
    const columns = await tableColumns(db, tableName);

    if (columns.includes('updated_at')) {
      order = 'updated_at DESC';
    } else if (columns.includes('created_at')) {
      order = 'created_at DESC';
    }
  } catch {}

  const r = await db
    .prepare(
      `SELECT * FROM ${tableName}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all();

  return r.results || [];
}

async function one(db, tableName, key) {
  const columns = await tableColumns(db, tableName);

  if (!columns.includes('id')) {
    throw new Error(
      `Table ${tableName} has no id column`
    );
  }

  return await db
    .prepare(
      `SELECT * FROM ${tableName}
       WHERE id=?
       LIMIT 1`
    )
    .bind(key)
    .first();
}

async function insert(db, tableName, item) {
  const x = sanitize(item);

  if (!x.id) {
    x.id = makeId();
  }

  const columns = await tableColumns(db, tableName);

  const keys = Object.keys(x).filter(k =>
    columns.includes(k) &&
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)
  );

  if (!keys.length) {
    throw new Error('empty payload');
  }

  const qs = keys.map(() => '?').join(',');

  const vals = keys.map(k =>
    normalizeValue(x[k])
  );

  await db
    .prepare(
      `INSERT INTO ${tableName}
       (${keys.join(',')})
       VALUES (${qs})`
    )
    .bind(...vals)
    .run();

  return x;
}

async function update(db, tableName, key, item) {
  const x = sanitize(item);

  const columns = await tableColumns(db, tableName);

  const keys = Object.keys(x).filter(k =>
    k !== 'id' &&
    k !== 'created_at' &&
    columns.includes(k) &&
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)
  );

  if (!keys.length) {
    return one(db, tableName, key);
  }

  const set = keys
    .map(k => `${k}=?`)
    .join(',');

  const vals = keys.map(k =>
    normalizeValue(x[k])
  );

  await db
    .prepare(
      `UPDATE ${tableName}
       SET ${set}
       WHERE id=?`
    )
    .bind(...vals, key)
    .run();

  return one(db, tableName, key);
}

/* =========================================================
   SEED
========================================================= */

async function seed(db) {
  const now = NOW();

  const ecosystem = {
    id: 'ecosystem:solana',
    name: 'Solana',
    symbol: 'SOL',
    description: 'Solana ecosystem research root',
    website: 'https://solana.com',
    created_at: now,
    updated_at: now
  };

  const source = {
    id: 'source:solana:official',
    name: 'Solana Official',
    title: 'Solana Official',
    url: 'https://solana.com',
    website: 'https://solana.com',
    source_type: 'official',
    type: 'official',
    publisher: 'Solana Foundation',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  };

  const chain = {
    id: 'chain:solana',
    name: 'Solana',
    symbol: 'SOL',
    chain: 'Solana',
    chain_name: 'Solana',
    ecosystem_id: ecosystem.id,
    native_token_id: 'token:solana:sol',
    website: 'https://solana.com',
    status: 'ACTIVE',
    created_at: now,
    updated_at: now
  };

  const tokens = [
    {
      id: 'token:solana:sol',
      name: 'Solana',
      symbol: 'SOL',
      chain: 'Solana',
      ecosystem_id: ecosystem.id,
      website: 'https://solana.com',
      identity_status: 'CONFIRMED',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'token:solana:jto',
      name: 'Jito',
      symbol: 'JTO',
      chain: 'Solana',
      ecosystem_id: ecosystem.id,
      website: 'https://www.jito.network',
      identity_status: 'CONFIRMED',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'token:solana:jup',
      name: 'Jupiter',
      symbol: 'JUP',
      chain: 'Solana',
      ecosystem_id: ecosystem.id,
      website: 'https://jup.ag',
      identity_status: 'CONFIRMED',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'token:solana:ray',
      name: 'Raydium',
      symbol: 'RAY',
      chain: 'Solana',
      ecosystem_id: ecosystem.id,
      website: 'https://raydium.io',
      identity_status: 'CONFIRMED',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'token:solana:cloud',
      name: 'Sanctum',
      symbol: 'CLOUD',
      chain: 'Solana',
      ecosystem_id: ecosystem.id,
      website: 'https://www.sanctum.so',
      identity_status: 'CONFIRMED',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    }
  ];

  const protocols = [
    {
      id: 'protocol:solana:jito',
      name: 'Jito',
      symbol: 'JTO',
      protocol_type: 'MEV',
      category: 'MEV',
      ecosystem_id: ecosystem.id,
      chain_id: chain.id,
      website: 'https://www.jito.network',
      token_id: 'token:solana:jto',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'protocol:solana:jupiter',
      name: 'Jupiter',
      symbol: 'JUP',
      protocol_type: 'DEX',
      category: 'DEX',
      ecosystem_id: ecosystem.id,
      chain_id: chain.id,
      website: 'https://jup.ag',
      token_id: 'token:solana:jup',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'protocol:solana:raydium',
      name: 'Raydium',
      symbol: 'RAY',
      protocol_type: 'DEX',
      category: 'DEX',
      ecosystem_id: ecosystem.id,
      chain_id: chain.id,
      website: 'https://raydium.io',
      token_id: 'token:solana:ray',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    },
    {
      id: 'protocol:solana:sanctum',
      name: 'Sanctum',
      symbol: 'CLOUD',
      protocol_type: 'Liquid Staking',
      category: 'Liquid Staking',
      ecosystem_id: ecosystem.id,
      chain_id: chain.id,
      website: 'https://www.sanctum.so',
      token_id: 'token:solana:cloud',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    }
  ];

  const protocolTokens = [
    {
      id: 'protocol-token:jito:jto',
      protocol_id: 'protocol:solana:jito',
      token_id: 'token:solana:jto',
      relationship: 'associated_token',
      created_at: now,
      updated_at: now
    },
    {
      id: 'protocol-token:jupiter:jup',
      protocol_id: 'protocol:solana:jupiter',
      token_id: 'token:solana:jup',
      relationship: 'associated_token',
      created_at: now,
      updated_at: now
    },
    {
      id: 'protocol-token:raydium:ray',
      protocol_id: 'protocol:solana:raydium',
      token_id: 'token:solana:ray',
      relationship: 'associated_token',
      created_at: now,
      updated_at: now
    },
    {
      id: 'protocol-token:sanctum:cloud',
      protocol_id: 'protocol:solana:sanctum',
      token_id: 'token:solana:cloud',
      relationship: 'associated_token',
      created_at: now,
      updated_at: now
    }
  ];

  const results = {
    ecosystems: 0,
    sources: 0,
    chains: 0,
    tokens: 0,
    protocols: 0,
    protocol_tokens: 0
  };

  async function trySeed(tableName, data, counter) {
    if (!TABLES.has(tableName)) return;

    try {
      await dynamicInsert(
        db,
        tableName,
        data
      );

      results[counter]++;
    } catch {}
  }

  await trySeed(
    'ecosystems',
    ecosystem,
    'ecosystems'
  );

  await trySeed(
    'sources',
    source,
    'sources'
  );

  await trySeed(
    'chains',
    chain,
    'chains'
  );

  for (const token of tokens) {
    await trySeed(
      'tokens',
      token,
      'tokens'
    );
  }

  for (const protocol of protocols) {
    await trySeed(
      'protocols',
      protocol,
      'protocols'
    );
  }

  for (const pt of protocolTokens) {
    await trySeed(
      'protocol_tokens',
      pt,
      'protocol_tokens'
    );
  }

  return {
    ok: true,
    results
  };
}

/* =========================================================
   SEARCH
========================================================= */

function normalizeSearchText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function aliasesForQuery(q) {
  const normalized =
    normalizeSearchText(q);

  const aliases =
    new Set([q]);

  const map = {
    '以太坊': ['Ethereum', 'ETH'],
    '以太': ['Ethereum', 'ETH'],
    'ethereum': ['以太坊', 'ETH'],
    'eth': ['Ethereum', '以太坊'],

    '比特币': ['Bitcoin', 'BTC'],
    'bitcoin': ['比特币', 'BTC'],
    'btc': ['Bitcoin', '比特币'],

    '币安': [
      'BNB',
      'BNB Chain',
      'Binance'
    ],

    '币安币': [
      'BNB',
      'Binance Coin'
    ],

    'bnb': [
      'BNB',
      'Binance Coin',
      'BNB Chain'
    ],

    'binance': [
      'BNB',
      'Binance Coin',
      'BNB Chain'
    ],

    '索拉纳': [
      'Solana',
      'SOL'
    ],

    'solana': [
      '索拉纳',
      'SOL'
    ],

    'sol': [
      'Solana',
      '索拉纳'
    ],

    '雪崩': [
      'Avalanche',
      'AVAX'
    ],

    'avalanche': [
      '雪崩',
      'AVAX'
    ],

    'avax': [
      'Avalanche',
      '雪崩'
    ],

    '狗狗币': [
      'Dogecoin',
      'DOGE'
    ],

    'dogecoin': [
      '狗狗币',
      'DOGE'
    ],

    'doge': [
      'Dogecoin',
      '狗狗币'
    ],

    '瑞波': [
      'XRP',
      'XRP Ledger'
    ],

    'ripple': [
      'XRP',
      'XRP Ledger'
    ],

    'xrp': [
      'Ripple',
      'XRP Ledger'
    ],

    '波卡': [
      'Polkadot',
      'DOT'
    ],

    'polkadot': [
      '波卡',
      'DOT'
    ],

    'dot': [
      'Polkadot',
      '波卡'
    ],

    '卡尔达诺': [
      'Cardano',
      'ADA'
    ],

    'cardano': [
      '卡尔达诺',
      'ADA'
    ],

    'ada': [
      'Cardano',
      '卡尔达诺'
    ],

    '阿比特拉姆': [
      'Arbitrum',
      'ARB'
    ],

    'arbitrum': [
      '阿比特拉姆',
      'ARB'
    ],

    'arb': [
      'Arbitrum',
      '阿比特拉姆'
    ],

    'polygon': [
      'Polygon',
      'POL',
      'MATIC'
    ],

    'matic': [
      'Polygon',
      'POL',
      'MATIC'
    ],

    'pol': [
      'Polygon',
      'POL',
      'MATIC'
    ],

    'base': [
      'Base',
      'ETH'
    ],

    'optimism': [
      'OP Mainnet',
      'OP'
    ],

    'op': [
      'OP Mainnet',
      'Optimism'
    ],

    'sui': [
      'Sui',
      'SUI'
    ],

    'aptos': [
      'Aptos',
      'APT'
    ],

    'apt': [
      'Aptos',
      'APT'
    ],

    'near': [
      'NEAR',
      'NEAR Protocol'
    ],

    'near protocol': [
      'NEAR',
      'NEAR Protocol'
    ],

    'cosmos': [
      'Cosmos',
      'ATOM'
    ],

    'atom': [
      'Cosmos',
      'ATOM'
    ],

    'tron': [
      'TRON',
      'TRX'
    ],

    'trx': [
      'TRON',
      'TRX'
    ]
  };

  const list =
    map[normalized] || [];

  for (const x of list) {
    aliases.add(x);
  }

  return [...aliases];
}

function rankLocalResult(item, q) {
  const query =
    normalizeSearchText(q);

  const name =
    normalizeSearchText(
      item.name
    );

  const symbol =
    normalizeSearchText(
      item.symbol
    );

  const chain =
    normalizeSearchText(
      item.chain
    );

  const contract =
    normalizeSearchText(
      item.contract_address ||
      item.address ||
      item.token_address
    );

  const idValue =
    normalizeSearchText(
      item.id
    );

  const cg =
    normalizeSearchText(
      item.coingecko_id ||
      item.coin_id ||
      item.coingecko
    );

  if (chain === query) return 1;

  if (
    contract &&
    contract === query
  ) {
    return 2;
  }

  if (symbol === query) return 3;

  if (name === query) return 4;

  if (name.startsWith(query)) return 5;

  if (symbol.startsWith(query)) return 6;

  if (idValue.includes(query)) return 7;

  if (cg.includes(query)) return 8;

  if (name.includes(query)) return 9;

  if (symbol.includes(query)) return 10;

  return 99;
}

/* =========================================================
   LOCAL SEARCH
========================================================= */

async function searchLocal(db, q) {
  const like =
    `%${q}%`;

  const output = [];

  const queries = [
    {
      table: 'ecosystems',

      sql: `
        SELECT
          id,
          name,
          symbol,
          website
        FROM ecosystems
        WHERE
          name LIKE ? OR
          symbol LIKE ? OR
          id LIKE ?
        LIMIT 30
      `
    },

    {
      table: 'chains',

      sql: `
        SELECT
          id,
          name,
          symbol,
          website,
          chain
        FROM chains
        WHERE
          name LIKE ? OR
          symbol LIKE ? OR
          chain LIKE ? OR
          id LIKE ?
        LIMIT 30
      `
    },

    {
      table: 'protocols',

      sql: `
        SELECT
          id,
          name,
          symbol,
          website,
          category,
          protocol_type
        FROM protocols
        WHERE
          name LIKE ? OR
          symbol LIKE ? OR
          id LIKE ?
        LIMIT 30
      `
    },

    {
      table: 'tokens',

      sql: `
        SELECT
          id,
          name,
          symbol,
          website
        FROM tokens
        WHERE
          name LIKE ? OR
          symbol LIKE ? OR
          id LIKE ?
        LIMIT 50
      `
    }
  ];

  for (const qx of queries) {
    try {
      let stmt;

      if (
        qx.table === 'chains'
      ) {
        stmt = db
          .prepare(qx.sql)
          .bind(
            like,
            like,
            like,
            like
          );
      } else {
        stmt = db
          .prepare(qx.sql)
          .bind(
            like,
            like,
            like
          );
      }

      const r =
        await stmt.all();

      for (
        const row of
        r.results || []
      ) {
        output.push({
          ...row,

          object_type:
            qx.table === 'ecosystems'
              ? 'ecosystem'
              : qx.table === 'chains'
                ? 'chain'
                : qx.table === 'protocols'
                  ? 'protocol'
                  : 'token',

          source: 'D1',

          is_external: false,

          identity_status:
            'CONFIRMED'
        });
      }
    } catch {}
  }

  return output;
}

/* =========================================================
   DEFILLAMA CHAIN SEARCH
========================================================= */

async function getDefiLlamaChains() {
  const url =
    'https://api.llama.fi/v2/chains';

  try {
    const response =
      await fetch(
        url,
        {
          method: 'GET',

          headers: {
            'accept':
              'application/json',

            'user-agent':
              'crypto-ecosystem-research/2.0'
          }
        }
      );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    if (
      !Array.isArray(data)
    ) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

function rankDefiLlamaChain(
  chain,
  q
) {
  const query =
    normalizeSearchText(q);

  const name =
    normalizeSearchText(
      chain.name
    );

  const symbol =
    normalizeSearchText(
      chain.tokenSymbol ||
      chain.symbol
    );

  const chainId =
    normalizeSearchText(
      chain.chainId
    );

  const gecko =
    normalizeSearchText(
      chain.gecko_id
    );

  if (
    name === query
  ) {
    return 1;
  }

  if (
    symbol &&
    symbol === query
  ) {
    return 2;
  }

  if (
    chainId &&
    chainId === query
  ) {
    return 3;
  }

  if (
    gecko &&
    gecko === query
  ) {
    return 4;
  }

  if (
    name.startsWith(query)
  ) {
    return 5;
  }

  if (
    symbol &&
    symbol.startsWith(query)
  ) {
    return 6;
  }

  if (
    name.includes(query)
  ) {
    return 7;
  }

  if (
    symbol &&
    symbol.includes(query)
  ) {
    return 8;
  }

  if (
    gecko &&
    gecko.includes(query)
  ) {
    return 9;
  }

  return 99;
}

async function searchDefiLlamaChains(q) {
  const chains =
    await getDefiLlamaChains();

  if (!chains.length) {
    return [];
  }

  const aliases =
    aliasesForQuery(q);

  const candidates = [];

  for (
    const query of aliases
  ) {
    const normalized =
      normalizeSearchText(
        query
      );

    if (!normalized) {
      continue;
    }

    for (
      const chain of chains
    ) {
      const rank =
        rankDefiLlamaChain(
          chain,
          query
        );

      if (
        rank >= 99
      ) {
        continue;
      }

      const safeName =
        String(
          chain.name || ''
        )
          .toLowerCase()
          .replace(
            /[^a-z0-9]+/g,
            '-'
          )
          .replace(
            /^-|-$/g,
            ''
          );

      candidates.push({
        id:
          `external:defillama:chain:${safeName}`,

        name:
          chain.name ||
          null,

        symbol:
          chain.tokenSymbol ||
          chain.symbol ||
          null,

        chain:
          chain.name ||
          null,

        chain_id:
          chain.chainId ??
          null,

        gecko_id:
          chain.gecko_id ||
          null,

        tvl:
          chain.tvl ??
          null,

        object_type:
          'chain',

        source:
          'DeFiLlama',

        source_id:
          chain.name ||
          null,

        source_label:
          'DeFiLlama',

        identity_status:
          'PROPOSED',

        is_external:
          true,

        chain_type:
          'UNKNOWN',

        query_used:
          query,

        _rank:
          rank
      });
    }
  }

  const unique = [];

  const seen =
    new Set();

  for (
    const item of candidates
  ) {
    const key =
      String(
        item.source_id ||
        item.name ||
        ''
      ).toLowerCase();

    if (
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    unique.push(item);
  }

  unique.sort(
    (a, b) => {
      if (
        a._rank !==
        b._rank
      ) {
        return (
          a._rank -
          b._rank
        );
      }

      return String(
        a.name || ''
      ).localeCompare(
        String(
          b.name || ''
        )
      );
    }
  );

  return unique
    .slice(0, 40)
    .map(
      ({
        _rank,
        ...item
      }) => item
    );
}

/* =========================================================
   DEFILLAMA PROTOCOL SEARCH
========================================================= */

function rankDefiLlamaProtocol(
  protocol,
  q
) {
  const query =
    normalizeSearchText(q);

  const name =
    normalizeSearchText(
      protocol?.name
    );

  const symbol =
    normalizeSearchText(
      protocol?.symbol
    );

  const slug =
    normalizeSearchText(
      protocol?.slug ||
      protocol?.id
    );

  if (name === query) {
    return 1;
  }

  if (slug === query) {
    return 2;
  }

  if (symbol === query) {
    return 3;
  }

  if (name.startsWith(query)) {
    return 4;
  }

  if (slug.startsWith(query)) {
    return 5;
  }

  if (symbol.startsWith(query)) {
    return 6;
  }

  if (name.includes(query)) {
    return 7;
  }

  if (slug.includes(query)) {
    return 8;
  }

  if (symbol.includes(query)) {
    return 9;
  }

  return 99;
}

async function getDefiLlamaProtocols() {
  const urls = [
    'https://api.llama.fi/protocols',
    'https://api.llama.fi/v2/protocols'
  ];

  for (
    const url of urls
  ) {
    try {
      const response =
        await fetch(
          url,
          {
            method: 'GET',

            headers: {
              'accept':
                'application/json',

              'user-agent':
                'crypto-ecosystem-research/2.0'
            }
          }
        );

      if (!response.ok) {
        continue;
      }

      const data =
        await response.json();

      if (
        Array.isArray(data)
      ) {
        return data;
      }

      if (
        Array.isArray(
          data?.protocols
        )
      ) {
        return data.protocols;
      }

    } catch {}
  }

  return [];
}

async function searchDefiLlamaProtocols(q) {
  const query =
    normalizeSearchText(q);

  if (!query) {
    return [];
  }

  const protocols =
    await getDefiLlamaProtocols();

  if (!protocols.length) {
    return [];
  }

  const aliases =
    aliasesForQuery(q);

  const candidates = [];

  for (
    const alias of aliases
  ) {
    const normalized =
      normalizeSearchText(
        alias
      );

    if (!normalized) {
      continue;
    }

    for (
      const protocol of protocols
    ) {
      const rank =
        rankDefiLlamaProtocol(
          protocol,
          alias
        );

      if (
        rank >= 99
      ) {
        continue;
      }

      candidates.push({
        id:
          'external:defillama:protocol:' +
          (
            protocol?.slug ||
            protocol?.id ||
            protocol?.name
          ),

        name:
          protocol?.name ||
          null,

        symbol:
          protocol?.symbol ||
          null,

        object_type:
          'protocol',

        source:
          'DeFiLlama',

        source_label:
          'DeFiLlama',

        source_id:
          protocol?.slug ||
          protocol?.id ||
          protocol?.name ||
          null,

        category:
          protocol?.category ||
          protocol?.protocol_type ||
          null,

        protocol_type:
          protocol?.category ||
          protocol?.protocol_type ||
          null,

        chains:
          Array.isArray(
            protocol?.chains
          )
            ? protocol.chains
            : [],

        tvl:
          Number.isFinite(
            Number(
              protocol?.tvl
            )
          )
            ? Number(
                protocol.tvl
              )
            : null,

        mcap:
          Number.isFinite(
            Number(
              protocol?.mcap
            )
          )
            ? Number(
                protocol.mcap
              )
            : null,

        change_1h:
          protocol?.change_1h ??
          null,

        change_1d:
          protocol?.change_1d ??
          null,

        change_7d:
          protocol?.change_7d ??
          null,

        website:
          protocol?.url ||
          protocol?.website ||
          null,

        logo:
          protocol?.logo ||
          null,

        identity_status:
          'PROPOSED',

        is_external:
          true,

        query_used:
          alias,

        _rank:
          rank
      });
    }
  }

  candidates.sort(
    (a, b) => {
      if (
        a._rank !==
        b._rank
      ) {
        return (
          a._rank -
          b._rank
        );
      }

      return String(
        a.name || ''
      ).localeCompare(
        String(
          b.name || ''
        )
      );
    }
  );

  const unique = [];

  const seen =
    new Set();

  for (
    const item of candidates
  ) {
    const key =
      String(
        item.source_id ||
        item.name ||
        ''
      ).toLowerCase();

    if (
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    unique.push(item);
  }

  return unique
    .slice(0, 20)
    .map(
      ({
        _rank,
        ...item
      }) => item
    );
}

/* =========================================================
   COINGECKO TOKEN SEARCH
========================================================= */

async function searchCoinGecko(q) {
  const aliases =
    aliasesForQuery(q);

  const results = [];

  for (
    const query of
    aliases.slice(0, 4)
  ) {
    try {
      const url =
        'https://api.coingecko.com/api/v3/search?query=' +
        encodeURIComponent(query);

      const response =
        await fetch(
          url,
          {
            method: 'GET',

            headers: {
              'accept':
                'application/json',

              'user-agent':
                'crypto-ecosystem-research/2.0'
            }
          }
        );

      if (
        !response.ok
      ) {
        continue;
      }

      const data =
        await response.json();

      for (
        const coin of
        data?.coins || []
      ) {
        results.push({
          id:
            `external:coingecko:${coin.id}`,

          name:
            coin.name ||
            null,

          symbol:
            coin.symbol ||
            null,

          image:
            coin.large ||
            coin.thumb ||
            null,

          market_cap_rank:
            coin.market_cap_rank ??
            null,

          object_type:
            'token',

          source:
            'CoinGecko',

          source_id:
            coin.id,

          coingecko_id:
            coin.id,

          identity_status:
            'PROPOSED',

          is_external:
            true,

          source_label:
            'CoinGecko',

          query_used:
            query
        });
      }
    } catch {}
  }

  const unique = [];

  const seen =
    new Set();

  for (
    const item of results
  ) {
    const key =
      item.source_id;

    if (
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    unique.push(item);
  }

  return unique.slice(
    0,
    30
  );
}

/* =========================================================
   MERGED SEARCH
========================================================= */

async function search(db, q) {

  /*
   * 1. Local D1
   */

  const local =
    await searchLocal(
      db,
      q
    );

  const localMap =
    new Map();

  for (
    const item of local
  ) {
    const key =
      `${item.object_type}:${item.id}`;

    if (
      !localMap.has(key)
    ) {
      localMap.set(
        key,
        item
      );
    }
  }

  const localResults =
    [...localMap.values()]
      .map(x => ({
        ...x,

        _rank:
          rankLocalResult(
            x,
            q
          )
      }))
      .sort(
        (a, b) => {
          if (
            a._rank !==
            b._rank
          ) {
            return (
              a._rank -
              b._rank
            );
          }

          return String(
            a.name || ''
          ).localeCompare(
            String(
              b.name || ''
            )
          );
        }
      )
      .map(
        ({
          _rank,
          ...x
        }) => x
      );

  /*
   * 2. DeFiLlama chains
   */

  const defiLlamaChains =
    await searchDefiLlamaChains(
      q
    );

  /*
   * 3. DeFiLlama protocols
   */

  const externalProtocols =
    await searchDefiLlamaProtocols(
      q
    );

  /*
   * 4. CoinGecko tokens
   */

  const externalTokens =
    await searchCoinGecko(
      q
    );

  /*
   * 5. Merge
   */

  const merged = [
    ...localResults,
    ...defiLlamaChains,
    ...externalProtocols,
    ...externalTokens
  ];

  /*
   * 6. Deduplicate
   */

  const seen =
    new Set();

  const final = [];

  for (
    const item of merged
  ) {
    const key =
      item.is_external
        ? `${item.source}:${item.source_id}`
        : `${item.object_type}:${item.id}`;

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    final.push(item);
  }

  /*
   * 7. Return results
   */

  return final.slice(
    0,
    80
  );
}

/* =========================================================
   EXTERNAL TOKEN DETAIL
========================================================= */

async function coinGeckoCoin(id) {
  if (!id) {
    return null;
  }

  const url =
    'https://api.coingecko.com/api/v3/coins/' +
    encodeURIComponent(id) +
    '?localization=false' +
    '&tickers=false' +
    '&market_data=true' +
    '&community_data=false' +
    '&developer_data=false' +
    '&sparkline=false';

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            'accept':
              'application/json',

            'user-agent':
              'crypto-ecosystem-research/2.0'
          }
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    const d =
      await response.json();

    return {
      id:
        `external:coingecko:${d.id}`,

      name:
        d.name ||
        null,

      symbol:
        d.symbol ||
        null,

      object_type:
        'token',

      source:
        'CoinGecko',

      source_id:
        d.id,

      coingecko_id:
        d.id,

      identity_status:
        'PROPOSED',

      is_external:
        true,

      website:
        d.links?.homepage?.find(
          Boolean
        ) || null,

      description:
        d.description?.en ||
        null,

      image:
        d.image?.large ||
        d.image?.small ||
        null,

      market_data: {
        current_price_usd:
          d.market_data
            ?.current_price
            ?.usd ??
          null,

        market_cap_usd:
          d.market_data
            ?.market_cap
            ?.usd ??
          null,

        fully_diluted_valuation_usd:
          d.market_data
            ?.fully_diluted_valuation
            ?.usd ??
          null,

        total_volume_usd:
          d.market_data
            ?.total_volume
            ?.usd ??
          null,

        circulating_supply:
          d.market_data
            ?.circulating_supply ??
          null,

        total_supply:
          d.market_data
            ?.total_supply ??
          null,

        max_supply:
          d.market_data
            ?.max_supply ??
          null
      }
    };
  } catch {
    return null;
  }
}

/* =========================================================
   PROXY
========================================================= */

const PROXY_HOSTS = new Set([
  'api.coingecko.com',
  'defillama.com',
  'api.llama.fi',
  'stablecoins.llama.fi',
  'api.dexscreener.com',
  'pro-api.coingecko.com'
]);

function allowedProxy(url) {
  return (
    url.protocol === 'https:' &&
    PROXY_HOSTS.has(
      url.hostname
    )
  );
}

async function proxy(request) {
  const requestUrl =
    new URL(request.url);

  const target =
    requestUrl.searchParams.get(
      'url'
    );

  if (!target) {
    return err(
      'PROXY_URL_REQUIRED',
      'Missing url parameter',
      400
    );
  }

  let targetUrl;

  try {
    targetUrl =
      new URL(target);
  } catch {
    return err(
      'PROXY_URL_INVALID',
      'Invalid target URL',
      400
    );
  }

  if (
    !allowedProxy(targetUrl)
  ) {
    return err(
      'PROXY_HOST_NOT_ALLOWED',
      'Target host is not allowed',
      403
    );
  }

  try {
    const response =
      await fetch(
        targetUrl.toString(),
        {
          method: 'GET',

          headers: {
            'accept':
              'application/json',

            'user-agent':
              'crypto-ecosystem-research/2.0'
          }
        }
      );

    const text =
      await response.text();

    return new Response(
      text,
      {
        status:
          response.status,

        headers: {
          'content-type':
            response.headers.get(
              'content-type'
            ) ||
            'application/json;charset=utf-8',

          'cache-control':
            'no-store'
        }
      }
    );
  } catch (e) {
    return err(
      'PROXY_FETCH_FAILED',
      String(
        e?.message || e
      ),
      502
    );
  }
}

/* =========================================================
   HEALTH
========================================================= */

async function health(db) {
  try {
    const result =
      await db
        .prepare(
          'SELECT 1 AS ok'
        )
        .first();

    return json({
      ok: true,

      service:
        'crypto-ecosystem-research',

      database:
        result?.ok === 1,

      time:
        new Date().toISOString()
    });
  } catch (e) {
    return json(
      {
        ok: false,

        service:
          'crypto-ecosystem-research',

        database: false,

        error:
          String(
            e?.message || e
          ),

        time:
          new Date().toISOString()
      },
      500
    );
  }
}

/* =========================================================
   SELF CHECK
========================================================= */

async function selfCheck(db) {
  const results = [];

  for (
    const tableName of TABLES
  ) {
    try {
      const r =
        await db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM ${tableName}`
          )
          .first();

      results.push({
        table:
          tableName,

        ok: true,

        count:
          Number(
            r?.count || 0
          )
      });
    } catch (e) {
      results.push({
        table:
          tableName,

        ok: false,

        count:
          null,

        error:
          String(
            e?.message || e
          )
      });
    }
  }

  const passed =
    results.filter(
      x => x.ok
    ).length;

  const failed =
    results.filter(
      x => !x.ok
    ).length;

  return json({
    ok:
      failed === 0,

    total:
      results.length,

    passed,

    failed,

    results
  });
}

/* =========================================================
   BACKUP
========================================================= */

async function backup(db) {
  const output = {
    version:
      '2.0',

    created_at:
      new Date().toISOString(),

    tables: {}
  };

  for (
    const tableName of TABLES
  ) {
    try {
      const r =
        await db
          .prepare(
            `SELECT * FROM ${tableName}`
          )
          .all();

      output.tables[
        tableName
      ] =
        r.results || [];
    } catch {
      output.tables[
        tableName
      ] = [];
    }
  }

  return json(
    output
  );
}

/* =========================================================
   SYNC
========================================================= */

async function sync(db) {
  const seeded =
    await seed(db);

  return json({
    ok: true,

    mode:
      'safe-seed',

    message:
      'Initial confirmed project data synchronized',

    seeded
  });
}

/* =========================================================
   SEARCH ROUTE
========================================================= */

async function handleSearch(
  db,
  request
) {
  const url =
    new URL(
      request.url
    );

  const q = (
    url.searchParams.get(
      'q'
    ) || ''
  ).trim();

  if (!q) {
    return json({
      ok: true,

      query: '',

      items: []
    });
  }

  try {
    const items =
      await search(
        db,
        q
      );

    return json({
      ok: true,

      query: q,

      count:
        items.length,

      items
    });
  } catch (e) {
    return json(
      {
        ok: false,

        query: q,

        items: [],

        error: {
          code:
            'SEARCH_FAILED',

          message:
            String(
              e?.message || e
            )
        }
      },
      500
    );
  }
}

/* =========================================================
   EXTERNAL TOKEN DETAIL ROUTE
========================================================= */

async function handleExternalToken(
  request,
  tokenId
) {
  const prefix =
    'coingecko:';

  let cgId =
    tokenId;

  if (
    cgId.startsWith(
      prefix
    )
  ) {
    cgId =
      cgId.slice(
        prefix.length
      );
  }

  const item =
    await coinGeckoCoin(
      cgId
    );

  if (!item) {
    return err(
      'EXTERNAL_TOKEN_NOT_FOUND',
      'External token was not found',
      404
    );
  }

  return json({
    ok: true,

    item
  });
}

/* =========================================================
   GENERIC CRUD
========================================================= */

async function handleCrud(
  db,
  request,
  tableName,
  key
) {
  const method =
    request.method;

  if (
    !table(tableName)
  ) {
    return err(
      'TABLE_NOT_ALLOWED',
      `Table "${tableName}" is not allowed`,
      404
    );
  }

  if (
    method === 'GET'
  ) {
    if (key) {
      const item =
        await one(
          db,
          tableName,
          key
        );

      if (!item) {
        return err(
          'NOT_FOUND',
          'Record not found',
          404
        );
      }

      return json({
        ok: true,

        item
      });
    }

    const url =
      new URL(
        request.url
      );

    const items =
      await list(
        db,
        tableName,
        url
      );

    return json({
      ok: true,

      table:
        tableName,

      count:
        items.length,

      items
    });
  }

  if (
    method === 'POST'
  ) {
    const data =
      await body(
        request
      );

    if (
      tableName ===
        'snapshots' &&
      !data.id
    ) {
      /*
       * Snapshot creation is allowed,
       * but no automatic market data is generated.
       */
    }

    try {
      const item =
        await insert(
          db,
          tableName,
          data
        );

      return json(
        {
          ok: true,
          item
        },
        201
      );
    } catch (e) {
      return err(
        'INSERT_FAILED',
        String(
          e?.message || e
        ),
        400
      );
    }
  }

  if (
    method === 'PUT'
  ) {
    if (!key) {
      return err(
        'ID_REQUIRED',
        'Record id is required',
        400
      );
    }

    const data =
      await body(
        request
      );

    try {
      const item =
        await update(
          db,
          tableName,
          key,
          data
        );

      return json({
        ok: true,

        item
      });
    } catch (e) {
      return err(
        'UPDATE_FAILED',
        String(
          e?.message || e
        ),
        400
      );
    }
  }

  if (
    method === 'DELETE'
  ) {
    if (!key) {
      return err(
        'ID_REQUIRED',
        'Record id is required',
        400
      );
    }

    try {
      await db
        .prepare(
          `DELETE FROM ${tableName}
           WHERE id=?`
        )
        .bind(key)
        .run();

      return json({
        ok: true,

        deleted:
          true,

        id:
          key
      });
    } catch (e) {
      return err(
        'DELETE_FAILED',
        String(
          e?.message || e
        ),
        400
      );
    }
  }

  return err(
    'METHOD_NOT_ALLOWED',
    'Method not allowed',
    405
  );
}

/* =========================================================
   MAIN REQUEST HANDLER
========================================================= */

export async function onRequest(
  context
) {
  const {
    request,
    env
  } = context;

  const db =
    env?.DB;

  if (!db) {
    return err(
      'DB_BINDING_MISSING',
      'D1 binding DB is missing',
      500
    );
  }

  const parts =
    routeParts(
      context
    );

  const route =
    parts[0] || '';

  try {

    /* ---------------------------------------------
       ROOT
    --------------------------------------------- */

    if (!route) {
      return json({
        ok: true,

        service:
          'crypto-ecosystem-research',

        version:
          '2.0-final',

        api:
          '/api',

        endpoints: [
          '/api/health',
          '/api/self-check',
          '/api/search?q=',
          '/api/proxy?url=',
          '/api/sync',
          '/api/backup'
        ]
      });
    }

    /* ---------------------------------------------
       HEALTH
    --------------------------------------------- */

    if (
      route === 'health' &&
      request.method === 'GET'
    ) {
      return await health(
        db
      );
    }

    /* ---------------------------------------------
       SELF CHECK
    --------------------------------------------- */

    if (
      route === 'self-check' &&
      request.method === 'GET'
    ) {
      return await selfCheck(
        db
      );
    }

    /* ---------------------------------------------
       SEARCH
    --------------------------------------------- */

    if (
      route === 'search' &&
      request.method === 'GET'
    ) {
      return await handleSearch(
        db,
        request
      );
    }

    /* ---------------------------------------------
       EXTERNAL TOKEN
       /api/external-token/coingecko:bitcoin
    --------------------------------------------- */

    if (
      route ===
        'external-token' &&
      parts[1]
    ) {
      if (
        request.method !==
        'GET'
      ) {
        return err(
          'METHOD_NOT_ALLOWED',
          'Method not allowed',
          405
        );
      }

      return await handleExternalToken(
        request,
        parts
          .slice(1)
          .join('/')
      );
    }

    /* ---------------------------------------------
       PROXY
    --------------------------------------------- */

    if (
      route === 'proxy' &&
      request.method === 'GET'
    ) {
      return await proxy(
        request
      );
    }

    /* ---------------------------------------------
       SYNC
    --------------------------------------------- */

    if (
      route === 'sync' &&
      request.method === 'POST'
    ) {
      return await sync(
        db
      );
    }

    /* ---------------------------------------------
       BACKUP
    --------------------------------------------- */

    if (
      route === 'backup' &&
      request.method === 'GET'
    ) {
      return await backup(
        db
      );
    }

    /* ---------------------------------------------
       SEED
    --------------------------------------------- */

    if (
      route === 'seed' &&
      request.method === 'POST'
    ) {
      const result =
        await seed(
          db
        );

      return json(
        result
      );
    }

    /* ---------------------------------------------
       GENERIC TABLE CRUD
       /api/tokens
       /api/tokens/:id
    --------------------------------------------- */

    const tableName =
      table(route);

    if (tableName) {
      const key =
        parts.length > 1
          ? parts
              .slice(1)
              .join('/')
          : null;

      return await handleCrud(
        db,
        request,
        tableName,
        key
      );
    }

    /* ---------------------------------------------
       404
    --------------------------------------------- */

    return err(
      'ROUTE_NOT_FOUND',
      `Unknown API route: /api/${parts.join('/')}`,
      404
    );

  } catch (e) {

    /*
     * Attempt to record server errors.
     * Failure to write the error log must never
     * hide the original error.
     */

    try {
      const errorRecord = {
        id:
          `error:${makeId()}`,

        code:
          'API_ERROR',

        message:
          String(
            e?.message || e
          ),

        route:
          request.url,

        method:
          request.method,

        created_at:
          NOW(),

        updated_at:
          NOW()
      };

      await dynamicInsert(
        db,
        'error_logs',
        errorRecord
      );
    } catch {}

    return err(
      'API_ERROR',
      String(
        e?.message || e
      ),
      500
    );
  }
}
