# Validation Summary: How to Use cutToFirstSignificantSubdomain() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (URL functions: `domain`, `firstSignificantSubdomain`, `cutToFirstSignificantSubdomain`)
- SQL
- Web analytics / referrer attribution patterns

## Sources Consulted
- ClickHouse URL functions reference: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse PR #5030 (built-in public suffix list via gperf from publicsuffix.org)
- ClickHouse PR #16845 (introduces `cutToFirstSignificantSubdomainWithWWW`, confirms plain variant strips `www.`)

## Issues Found
- **Basic Usage output table — IP address row was missing the `full_domain` value.** The post showed `https://192.168.1.1/admin` with all three derived columns blank. `domain()` returns the hostname verbatim and does not special-case IP literals, so `domain('https://192.168.1.1/admin')` returns `'192.168.1.1'`, not an empty string. `firstSignificantSubdomain` and `cutToFirstSignificantSubdomain` correctly return empty strings for IPs (no TLD to anchor against). Fixed the row to show `192.168.1.1` under `full_domain` while leaving the other two columns empty.

## Review Notes
- Multi-part TLD claims (`.co.uk`, `.com.au`) are accurate: ClickHouse's built-in public suffix list (introduced in PR #5030) covers these, so `cutToFirstSignificantSubdomain` returns `bbc.co.uk` and `google.com.au` out of the box without needing `cutToFirstSignificantSubdomainCustom`.
- The plain `cutToFirstSignificantSubdomain` does strip `www.` — the `WithWWW` variant was added later specifically to preserve it. The post's behaviour for `www.example.com` → `example.com` matches the documented behaviour.
- The Domain Allowlist example includes entries like `'docs.example.com'` and `'support.example.com'` in a `NOT IN` list compared against `cutToFirstSignificantSubdomain(link_url)`. Because the function normalises all subdomains to the registrable domain (`example.com`), those specific subdomain entries can never match and are effectively dead. The SQL is syntactically valid and functions correctly (the intent of allowlisting `example.com` and `github.com` still works), so this was left as-is — it's a suboptimal illustration rather than a technical error. A future edit could trim the redundant entries.
- The intro phrasing "combines the work of `domain()` and `firstSignificantSubdomain()`" is a pedagogical simplification rather than a literal implementation description, but it reads correctly for the intended audience.
