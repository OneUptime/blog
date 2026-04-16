# Validation Summary: How to Store and Query Genomic Data Aggregates in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference (schema design and example queries)

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, LowCardinality, FixedString, window functions, parametric aggregate functions)
- Genomic data concepts (allele frequency, CADD scores, ClinVar classifications, variant consequences)

## Sources Consulted
- ClickHouse Data Types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse `LowCardinality`: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse `quantile` parametric aggregate: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse `countIf` conditional aggregate: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClinVar classification vocabulary: https://www.ncbi.nlm.nih.gov/clinvar/docs/clinsig/
- CADD (Combined Annotation Dependent Depletion): https://cadd.gs.washington.edu/

## Issues Found
No technical issues found.

- `CREATE TABLE variant_summary` uses valid ClickHouse syntax: `MergeTree()` with `ORDER BY (chromosome, position)` and `PARTITION BY chromosome` are correct. The chromosome cardinality (~25 for humans: 1-22, X, Y, MT) is within reasonable partition limits.
- Parametric aggregate calls `quantile(0.5)(af_global)` and `quantile(0.9)(cadd_score)` follow the documented two-parentheses ClickHouse syntax.
- `countIf(...)` uses the supported `-If` combinator.
- `round(100.0 * count() / sum(count()) OVER (), 2)` is the supported ClickHouse pattern for per-group percentage within an aggregated result set.
- `abs(af_eur - af_afr)` is valid.
- `LowCardinality(String)` is a standard optimization for repeated categorical strings such as chromosome, gene symbol, consequence, and clinvar_class.

## Review Notes
- `ref_allele FixedString(4)` is acceptable for SNVs and short substitutions, but real VCF records can contain longer REF alleles for indels and larger variants. Using `String` would be more general, but since the post explicitly scopes to aggregated outputs (not full variant calling), the choice is defensible and not incorrect.
- `af_global`, `af_eur`, `af_afr`, `af_eas` as `Float64` is consistent with gnomAD-style allele-frequency precision; `Float32` could be used to save space but is not required.
- Partitioning by every chromosome is fine at biobank scale, but users storing many per-sample partitions on top of this should be aware of ClickHouse's general recommendation to keep total part count bounded.
- None of these are errors — they are future-improvement notes.
