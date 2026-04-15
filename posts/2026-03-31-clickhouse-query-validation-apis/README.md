# How to Implement Query Validation for ClickHouse APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Query Validation, Security, API Design, SQL Parsing

Description: Validate and sanitize user-supplied ClickHouse queries in API layers to prevent dangerous operations, enforce resource limits, and reject invalid SQL.

---

## Why Query Validation Matters

APIs that accept user-supplied SQL queries (like embedded analytics or query builders) need validation to prevent destructive operations (DROP, DELETE, TRUNCATE), enforce complexity limits, and ensure only allowed tables are accessed. ClickHouse's `EXPLAIN` feature helps validate queries before execution.

## Basic Validation Middleware

```javascript
// middleware/queryValidator.js

const FORBIDDEN_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE',
  'INSERT', 'UPDATE', 'SYSTEM', 'KILL', 'ATTACH', 'DETACH'
];

function validateQuery(query) {
  const errors = [];

  if (!query || typeof query !== 'string') {
    errors.push('Query must be a non-empty string');
    return errors;
  }

  if (query.length > 10000) {
    errors.push('Query exceeds maximum length of 10,000 characters');
  }

  // Check for forbidden keywords (case-insensitive)
  const upperQuery = query.toUpperCase();
  for (const keyword of FORBIDDEN_KEYWORDS) {
    // Check for keyword followed by space or end of statement
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(upperQuery)) {
      errors.push(`Forbidden keyword: ${keyword}`);
    }
  }

  // Require SELECT at the start
  if (!upperQuery.trim().startsWith('SELECT') && !upperQuery.trim().startsWith('WITH')) {
    errors.push('Only SELECT queries are allowed');
  }

  return errors;
}

module.exports = { validateQuery };
```

## Dry-Run Validation with ClickHouse EXPLAIN

Use ClickHouse's `EXPLAIN` to parse the query without executing it:

```javascript
async function dryRunQuery(client, query, params) {
  try {
    const result = await client.query({
      query: `EXPLAIN SYNTAX ${query}`,
      query_params: params,
      format: 'TSV',
    });
    await result.text(); // consume response
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
```

## Estimate Query Cost Before Execution

```javascript
async function estimateQueryRows(client, query, params) {
  try {
    const result = await client.query({
      query: `EXPLAIN ESTIMATE ${query}`,
      query_params: params,
      format: 'JSONEachRow',
    });
    const rows = await result.json();
    // Returns estimated number of rows to be read
    return rows[0]?.rows ?? null;
  } catch (err) {
    return null;
  }
}
```

## Complete Validation Middleware

```javascript
// middleware/queryValidation.js
const { validateQuery } = require('./queryValidator');

function queryValidationMiddleware(maxEstimatedRows = 1_000_000_000) {
  return async (req, res, next) => {
    const { query, params = {} } = req.body;

    // Step 1: Syntax/allowlist validation
    const errors = validateQuery(query);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Step 2: ClickHouse dry run (catches syntax errors)
    const dryRun = await dryRunQuery(req.clickhouseClient, query, params);
    if (!dryRun.valid) {
      return res.status(400).json({ error: `Query syntax error: ${dryRun.error}` });
    }

    // Step 3: Estimate rows to be scanned
    const estimatedRows = await estimateQueryRows(req.clickhouseClient, query, params);
    if (estimatedRows && estimatedRows > maxEstimatedRows) {
      return res.status(400).json({
        error: `Query would scan too many rows: estimated ${estimatedRows.toLocaleString()}`,
        max_allowed: maxEstimatedRows,
      });
    }

    next();
  };
}

module.exports = queryValidationMiddleware;
```

## Apply to Routes

```javascript
app.post('/api/query',
  queryValidationMiddleware(500_000_000),  // max 500M rows
  async (req, res) => {
    const result = await client.query({
      query: req.body.query,
      query_params: req.body.params,
      format: 'JSONEachRow',
    });
    res.json({ data: await result.json() });
  }
);
```

## Summary

Query validation for ClickHouse APIs uses a layered approach: keyword allowlist/denylist checks at the application level, ClickHouse EXPLAIN SYNTAX for parse-time validation, and EXPLAIN ESTIMATE for cost estimation before execution. Together these prevent destructive queries, catch syntax errors early, and block expensive scans that would degrade cluster performance.
