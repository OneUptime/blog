# Validation Summary: How to Build a Referrer Analysis System with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, partitioning, URL functions, aggregate functions)
- SQL (CASE expressions, subqueries, GROUP BY, ORDER BY)

## Sources Consulted
- ClickHouse URL Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse `domain` function — confirmed it returns the full hostname including `www.` prefix
- ClickHouse `domainWithoutWWW` function — confirmed it strips the leading `www.` prefix
- ClickHouse `extractURLParameter` function documentation
- ClickHouse `argMin` aggregate function documentation
- ClickHouse `toYYYYMMDD` and `toStartOfDay` date function documentation

## Issues Found

### Issue 1: `domain()` used instead of `domainWithoutWWW()` for domain matching
- **What was wrong:** The post used `domain(referrer)` in IN clauses comparing against bare domain names like `'google.com'`, `'facebook.com'`, etc. However, ClickHouse's `domain()` function returns the full hostname including the `www.` prefix (e.g., `domain('https://www.google.com/search')` returns `www.google.com`, not `google.com`). This means the IN comparisons would fail to match most real-world referrer URLs.
- **What was changed:** Replaced `domain()` with `domainWithoutWWW()` in all categorization and filtering queries (Categorizing Traffic Sources, Top Referring Domains, Search Engine Keyword Analysis, Referrer Trends Over Time, Landing Page by Source). Kept `domain()` in the "Parsing Referrer URLs" section since it correctly demonstrates the function for display purposes.
- **Why:** `domainWithoutWWW()` strips the leading `www.` before comparison, making the IN clauses work correctly with bare domain names.

### Issue 2: Missing `visitor_id` in subquery of "Landing Page by Source"
- **What was wrong:** The outer query used `uniq(visitor_id)` but the subquery only selected `session_id`, `url`, and `referrer` — `visitor_id` was not available in the outer scope, which would cause a query error.
- **What was changed:** Added `any(visitor_id) AS visitor_id` to the subquery's SELECT list. `any()` is appropriate here because each session belongs to a single visitor.
- **Why:** The column must be available in the subquery output for the outer query to reference it.

### Issue 3: Simplified NOT IN clause in "Top Referring Domains"
- **What was wrong:** The original used `domain(referrer) NOT IN ('yoursite.com', 'www.yoursite.com')` listing both www and non-www variants.
- **What was changed:** With the switch to `domainWithoutWWW()`, simplified to `domainWithoutWWW(referrer) NOT IN ('yoursite.com')` since the function already handles www stripping.
- **Why:** Eliminates redundancy now that `domainWithoutWWW()` normalizes the domain.

## Review Notes
- The "Parsing Referrer URLs" section correctly uses `domain()` since it is demonstrating raw URL parsing for display, not matching against known domains.
- The Search Engine Keyword Analysis section uses `extractURLParameter(referrer, 'q')` which is syntactically correct, but in practice most modern search engines (especially Google since 2013) encrypt search queries via HTTPS, so the `q` parameter is rarely present in referrer URLs. This is a real-world limitation rather than a code error.
- Yahoo search referrers typically come from `search.yahoo.com` (not `yahoo.com`) and use the `p` parameter (not `q`). In a production system, the domain lists and parameter names would need to be expanded. The post is demonstrating the pattern, so this is acceptable.
- The `domain()` function is kept in the Summary's function list alongside `domainWithoutWWW` since the post demonstrates both.
- All other ClickHouse functions used (`protocol`, `path`, `extractURLParameter`, `argMin`, `uniq`, `toStartOfDay`, `toYYYYMMDD`, `today()`) are valid and correctly used.
- The schema design with `MergeTree`, `PARTITION BY toYYYYMMDD(ts)`, and `ORDER BY (visitor_id, ts)` is valid ClickHouse syntax.
