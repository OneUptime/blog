# How to Implement Search and Filtering in APIs with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Search, Filter, REST API, Query Builder

Description: Implement safe, flexible search and filtering for REST APIs backed by MySQL using dynamic query building with parameterized queries.

---

## The Challenge of Dynamic Filtering

REST APIs often need to support multiple optional filters: `?status=pending&user_id=5&from=2026-01-01&search=laptop`. Building these queries safely requires dynamic query construction that always uses parameterized values to prevent SQL injection.

## Building Safe Dynamic Queries

The key principle: dynamically build the WHERE clause structure, but always use placeholders for values:

```javascript
// Node.js Express - dynamic filter builder
function buildOrderQuery(filters) {
  const conditions = [];
  const params = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }

  if (filters.user_id) {
    conditions.push('user_id = ?');
    params.push(parseInt(filters.user_id));
  }

  if (filters.from) {
    conditions.push('created_at >= ?');
    params.push(filters.from);
  }

  if (filters.to) {
    conditions.push('created_at <= ?');
    params.push(filters.to);
  }

  if (filters.min_total) {
    conditions.push('total >= ?');
    params.push(parseFloat(filters.min_total));
  }

  const where = conditions.length > 0
    ? 'WHERE ' + conditions.join(' AND ')
    : '';

  return { where, params };
}

router.get('/orders', async (req, res) => {
  const { where, params } = buildOrderQuery(req.query);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (Math.max(1, parseInt(req.query.page) || 1) - 1) * limit;

  const [rows] = await pool.query(
    `SELECT id, user_id, total, status, created_at FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({ data: rows });
});
```

## Full-Text Search

For text search on product names or descriptions, use MySQL's `FULLTEXT` index:

```sql
-- Create the FULLTEXT index
ALTER TABLE products ADD FULLTEXT INDEX idx_name_desc (name, description);
```

```javascript
// Full-text search handler
router.get('/products', async (req, res) => {
  const { q, category_id } = req.query;
  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('MATCH(name, description) AGAINST(? IN BOOLEAN MODE)');
    params.push(q + '*');
  }

  if (category_id) {
    conditions.push('category_id = ?');
    params.push(parseInt(category_id));
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT id, name, price, category_id,
            ${q ? 'MATCH(name, description) AGAINST(? IN BOOLEAN MODE) AS relevance_score' : '0 AS relevance_score'}
     FROM products ${where}
     ORDER BY relevance_score DESC, created_at DESC
     LIMIT 20`,
    q ? [q + '*', ...params] : params
  );

  res.json({ data: rows });
});
```

## LIKE Search for Simple String Matching

For simple substring search without full-text indexing:

```sql
-- Use a leading wildcard only when needed - leading wildcards disable index usage
SELECT id, name FROM customers WHERE name LIKE 'Smith%';

-- Leading wildcard forces full table scan - use only on small tables or with FULLTEXT
SELECT id, name FROM customers WHERE name LIKE '%Smith%';
```

```javascript
if (filters.search) {
  // Escape special LIKE characters to prevent injection
  const escaped = filters.search.replace(/[%_\\]/g, '\\$&');
  conditions.push('name LIKE ?');
  params.push(escaped + '%');
}
```

## Validating Filter Inputs

Always validate allowed filter fields to prevent parameter pollution:

```javascript
const ALLOWED_STATUSES = new Set(['pending', 'processing', 'shipped', 'completed', 'cancelled']);
const ALLOWED_SORT_COLUMNS = new Set(['created_at', 'total', 'status']);

if (filters.status && !ALLOWED_STATUSES.has(filters.status)) {
  return res.status(400).json({ error: 'Invalid status filter' });
}

// Column name cannot be parameterized - validate against allowlist
const sortCol = ALLOWED_SORT_COLUMNS.has(req.query.sort) ? req.query.sort : 'created_at';
const sortDir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
```

## Summary

Implementing safe search and filtering in MySQL REST APIs requires dynamic WHERE clause construction with parameterized values, full-text indexes for relevance-based text search, and strict allowlist validation for column names and enumerated values that cannot be parameterized. This approach prevents SQL injection while supporting flexible, multi-criteria filtering across any combination of fields.
