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
const id = () => crypto.randomUUID();

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

function err(code, message, status = 400, field) {
  return json({
    ok: false,
    error: {
      code,
      message,
      field
    }
  }, status);
}

function table(x) {
  return TABLES.has(x) ? x : null;
}

function routeParts(context) {
  return (
    Array.isArray(context.params?.path)
      ? context.params.path
      : String(context.params?.path || '').split('/')
  )
    .filter(Boolean)
    .map(decodeURIComponent);
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

  const x = { ...obj };

  for (const k of Object.keys(x)) {
    const key = k.toLowerCase();

    if (
      key.includes('secret') ||
      key.includes('private_key') ||
      key.includes('cookie')
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

async function list(db, t, url) {
  const p = Number(url.searchParams.get('limit') || 50);
  const limit = Math.min(Math.max(p, 1), 200);
  const offset = Math.max(
    Number(url.searchParams.get('offset') || 0),
    0
  );

  const order = [
    'snapshots',
    'metrics',
    'events',
    'alerts',
    'research',
    'evidence',
    'documents'
  ].includes(t)
    ? 'created_at DESC'
    : 'updated_at DESC';

  const r = await db
    .prepare(
      `SELECT * FROM ${t} ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .bind(limit, offset)
    .all();

  return r.results || [];
}

async function one(db, t, key) {
  return await db
    .prepare(`SELECT * FROM ${t} WHERE id=? LIMIT 1`)
    .bind(key)
    .first();
}

function cols(item) {
  return Object.keys(item).filter(
    k =>
      k !== 'id' &&
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)
  );
}

async function insert(db, t, item) {
  const x = sanitize(item);

  if (!x.id) x.id = id();

  const keys = cols(x);

  if (!keys.length) {
    throw Error('empty payload');
  }

  const qs = keys.map(() => '?').join(',');

  const vals = keys.map(k =>
    typeof x[k] === 'object'
      ? JSON.stringify(x[k])
      : x[k]
  );

  await db
    .prepare(
      `INSERT INTO ${t}(id,${keys.join(',')})
       VALUES(?,${qs})`
    )
    .bind(x.id, ...vals)
    .run();

  return x;
}

async function update(db, t, key, item) {
  const x = sanitize(item);

  const keys = cols(x).filter(
    k => k !== 'created_at'
  );

  if (!keys.length) {
    return one(db, t, key);
  }

  const set = keys
    .map(k => `${k}=?`)
    .join(',');

  const vals = keys.map(k =>
    typeof x[k] === 'object'
      ? JSON.stringify(x[k])
      : x[k]
  );

  await db
    .prepare(
      `UPDATE ${t} SET ${set} WHERE id=?`
    )
    .bind(...vals, key)
    .run();

  return one(db, t, key);
}

async function seed(db) {
  const now = NOW();

  const e = {
    id: 'ecosystem:solana',
    name: 'Solana',
    symbol: 'SOL',
    description: 'Solana ecosystem research root',
    website: 'https://solana.com',
    created_at: now,
    updated_at: now
  };

  await db
    .prepare(
      `INSERT OR IGNORE INTO ecosystems
       (id,name,symbol,description,website,created_at,updated_at)
       VALUES(?,?,?,?,?,?,?)`
    )
    .bind(
      e.id,
      e.name,
      e.symbol,
      e.description,
      e.website,
      e.created_at,
      e.updated_at
    )
    .run();

  const source = {
    id:
