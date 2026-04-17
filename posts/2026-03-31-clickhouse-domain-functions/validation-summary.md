# Validation Summary: How to Use domain() and domainWithoutWWW() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- URL parsing functions (`domain`, `domainWithoutWWW`)
- Aggregate functions (`count`, `uniq`)
- Date/time functions (`now`, `today`, `INTERVAL`)

## Sources Consulted
- ClickHouse URL functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse aggregate functions documentation (for `count()` and `uniq()`)
- ClickHouse date/time function reference (for `now()`, `today()`, `INTERVAL`)

## Issues Found
No technical issues found.

All technical claims were verified against the official ClickHouse documentation:
- `domain()` correctly extracts the hostname (including `www.` if present) from a URL string.
- `domainWithoutWWW()` correctly returns the hostname with a leading `www.` stripped (and only the leading `www.` — other subdomains are preserved, which matches the "Handling Subdomains" example).
- Both functions return an empty string when the input cannot be parsed as a URL (e.g., `''` or `'not a url'`).
- The example output values (`www.example.com`, `example.com`, `blog.example.com`, `valid.com`) match actual function behavior.
- SQL syntax is valid ClickHouse: `INTERVAL 30 DAY`, `today() - 7` (Date arithmetic), `GROUP BY`/`ORDER BY`/`LIMIT`, `CASE WHEN ... END`, `IN (...)` — all correctly used.

## Review Notes
- The post correctly notes that `domainWithoutWWW` only strips a leading `www.` and not other subdomains. This is an important nuance that the author handled well.
- ClickHouse also offers related functions such as `domainRFC`, `topLevelDomain`, `firstSignificantSubdomain`, and `cutWWW`. The post stays focused on the two functions in scope, which is appropriate.
- No version-specific caveats; these functions have been stable in ClickHouse for a long time.
