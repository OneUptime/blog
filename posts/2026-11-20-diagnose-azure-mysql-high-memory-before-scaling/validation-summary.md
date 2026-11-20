# Validation summary

Reviewed Azure memory metric and tier definitions, parameter controls and low-memory guidance alongside MySQL memory use, buffer pool, status counters, memory instrumentation and internal temporary-table documentation. Examples are scoped to MySQL 8.0.46; modern TempTable behavior is distinguished from older MEMORY-engine advice.

All three SELECT examples parsed with sqlglot 28.0.0. The exact current-allocation query ran on synthetic SQLite data, verifying MiB conversion, ordering by current rather than historical allocation and exclusion of zero-current rows. The illustrative interval hit ratio was checked arithmetically. These checks do not establish MySQL runtime behavior or instrumentation completeness.

The generated social image was visually reviewed without clipping. No Azure metric query, MySQL inspection, performance test, parameter change or scaling operation was executed. Sources are listed in validation.json and linked beside claims.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
