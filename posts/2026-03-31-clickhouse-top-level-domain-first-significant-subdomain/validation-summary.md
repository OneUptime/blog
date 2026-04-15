# Validation Summary: How to Use topLevelDomain() and firstSignificantSubdomain() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- ClickHouse URL functions: `topLevelDomain()`, `firstSignificantSubdomain()`, `domain()`
- ClickHouse aggregate functions: `count()`, `uniq()`, `groupArray(DISTINCT ...)`
- ClickHouse window functions: `sum(...) OVER ()`

## Sources Consulted
- ClickHouse official documentation — URL functions: https://clickhouse.com/docs/en/sql-reference/functions/url-functions
- ClickHouse official documentation — `topLevelDomain()`: https://clickhouse.com/docs/en/sql-reference/functions/url-functions#topleveldomain
- ClickHouse official documentation — `firstSignificantSubdomain()`: https://clickhouse.com/docs/en/sql-reference/functions/url-functions#firstsignificantsubdomain
- ClickHouse official documentation — `firstSignificantSubdomainCustom()`: https://clickhouse.com/docs/en/sql-reference/functions/url-functions#firstsignificantsubdomaincustom

## Issues Found
- **Misleading `gov.in` example in the multi-part TLD section.** The section "Understanding firstSignificantSubdomain() for Multi-Part TLDs" states that "ClickHouse knows to skip both parts and return the domain immediately to the left" for country-code second-level domains. The `mail.gov.in` example was included alongside `co.uk`, `com.au`, and `co.jp`, implying that `gov.in` is handled the same way. However, ClickHouse's built-in list only treats `co`, `com`, `net`, and `org` as insignificant second-level domains — `gov` is NOT in this list. The output `gov` is correct (it is the second-level domain returned because it is not in the special list), but the explanation was misleading. Added a clarifying note explaining this limitation and pointing readers to `firstSignificantSubdomainCustom()` for handling additional compound TLDs.

## Review Notes
- All SQL syntax is valid ClickHouse SQL. Column alias references in SELECT (e.g., `tld NOT IN (...)` using an alias defined earlier in the same SELECT) are supported by ClickHouse's non-standard alias resolution.
- Window function syntax (`sum(count()) OVER ()`) is correct and available since ClickHouse 21.1.
- The claim that both functions "internally call `domain()`" is a simplification — they extract the hostname from the URL using shared parsing logic, but the blog's description is directionally correct for a tutorial audience.
- The ClickHouse documentation notes that "the list of 'insignificant' second-level domains and other implementation details may change in the future," so the exact behavior of `firstSignificantSubdomain()` may evolve in newer versions.
