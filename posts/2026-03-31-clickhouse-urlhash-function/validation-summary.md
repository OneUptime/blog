# Validation Summary: How to Use URLHash() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL query engine)
- URLHash() hash function
- URLHierarchy() URL function (referenced for level semantics)

## Sources Consulted
- ClickHouse official documentation — Hash Functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions#urlhash
- ClickHouse official documentation — URL Functions (URLHierarchy): https://clickhouse.com/docs/en/sql-reference/functions/url-functions#urlhierarchy

## Issues Found

### 1. Off-by-one error in N parameter indexing (throughout post)
**What was wrong:** The blog post used 1-based indexing for the `N` parameter, claiming `N=1` hashes the domain only and `N=2` hashes the first path segment. According to ClickHouse documentation, `URLHash(url, N)` uses the same 0-based levels as `URLHierarchy`: `N=0` is the domain level and `N=1` includes the first path segment.
**What was changed:** Corrected all `N` values throughout the post — `N=1` for domain became `N=0`, `N=2` for first path segment became `N=1`, and so on. Updated the "Understanding URL Depth" example from levels 1-4 to levels 0-3 with corrected alias names.

### 2. Incorrect description of URLHash(url, N) semantics in introduction
**What was wrong:** The intro stated URLHash "extracts and hashes the first `n` elements of the URL path hierarchy." The official docs describe it as calculating "a hash from a string up to the N level in the URL hierarchy, where levels are the same as in URLHierarchy."
**What was changed:** Rewrote the intro to accurately reflect the documented behavior and mention the relationship to `URLHierarchy`.

### 3. Missing documentation of the single-argument form URLHash(url)
**What was wrong:** The post only showed `URLHash(url, N)` and used `URLHash(url, 5)` with a large N to approximate hashing the full URL. ClickHouse supports `URLHash(url)` without `N`, which hashes the entire URL (with trailing `/`, `?`, or `#` removed).
**What was changed:** Replaced `URLHash(url, 5)` with `URLHash(url)` in the "Basic Usage" section and mentioned the single-argument form in the introduction and summary.

### 4. Inaccurate comment in URL-Based Routing section
**What was wrong:** The comment said "based on the first path element" but used `N=2`, which actually covers the first two path segments.
**What was changed:** Corrected the comment to "based on the first two path elements."

### 5. Inaccurate comment in Web Analytics section
**What was wrong:** The comment said "first-level path sections" but used `N=2`, which covers up to the second path level.
**What was changed:** Corrected to "up to 2nd path level."

### 6. Summary section depth descriptions incorrect
**What was wrong:** Summary stated "Use depth 1 to group by domain, depth 2 to group by the first path segment."
**What was changed:** Corrected to "Use depth 0 to group by domain, depth 1 to group by the first path segment." Also added mention of `URLHash(url)` without N for full-URL hashing.

## Review Notes
- The SQL query syntax throughout the post is correct and would execute in ClickHouse (the queries use hypothetical table names which is fine for a tutorial).
- The use cases described (routing, caching, analytics) are valid applications of URLHash.
- URLHash is classified as a "fast, decent-quality non-cryptographic hash function" — the post does not make claims about cryptographic properties, which is appropriate.
