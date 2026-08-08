# Validation Summary: Choose Unique, Composite, and Expression Indexes in Gel

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Gel schema definition language (SDL)
- EdgeQL
- Gel constraints and indexes
- Gel CLI query analysis and migrations
- PostgreSQL query planning and index behavior

## Sources Consulted

- [Gel indexes](https://docs.geldata.com/reference/datamodel/indexes)
- [Gel constraints](https://docs.geldata.com/reference/datamodel/constraints)
- [Gel computed properties and links](https://docs.geldata.com/reference/datamodel/computeds)
- [Gel schema guide](https://docs.geldata.com/learn/schema)
- [Gel string functions](https://docs.geldata.com/reference/stdlib/string)
- [EdgeQL query parameters](https://docs.geldata.com/reference/edgeql/parameters)
- [EdgeQL analyze](https://docs.geldata.com/reference/edgeql/analyze)
- [Gel analyze CLI](https://docs.geldata.com/reference/using/cli/gel_analyze)
- [EdgeQL cardinality](https://docs.geldata.com/reference/reference/edgeql/cardinality)
- [EdgeQL volatility](https://docs.geldata.com/reference/reference/edgeql/volatility)
- [Gel migrations](https://docs.geldata.com/reference/datamodel/migrations)
- [Gel CLI source: interactive analyzer parameter handling](https://github.com/geldata/gel-cli/blob/7c602f7c1efeb2a34fd231519bba95a08a94a566/src/analyze/mod.rs#L24-L49)
- [Gel CLI source: standalone analyzer execution](https://github.com/geldata/gel-cli/blob/7c602f7c1efeb2a34fd231519bba95a08a94a566/src/analyze/mod.rs#L96-L113)
- [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
- [PostgreSQL indexes and ordering](https://www.postgresql.org/docs/current/indexes-ordering.html)
- [PostgreSQL indexes on expressions](https://www.postgresql.org/docs/current/indexes-expressional.html)
- [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)

## Issues Found

- The standalone `gel analyze --expand` example used the parameter `$status`, but that subcommand executes without query arguments and has no option for supplying parameter values. Changed the example to use the representative literal `'open'` and clarified that the REPL or an application test harness is required to analyze the exact parameterized query.
- The normalization text said `str_trim(str_lower(.username))` removes surrounding whitespace. With no second argument, `str_trim()` removes the default U+0020 space character, not arbitrary whitespace. Changed the wording to "surrounding spaces" and "space-padded."
- The post said an expression index makes lookup faster even though PostgreSQL may choose another plan. Changed this to say it may make lookup faster, preserving the distinction between an available index and guaranteed planner use.

## Review Notes

All remaining SDL and EdgeQL snippets match current Gel syntax. The schema examples were also checked with an ephemeral Gel 7.1 instance; negative tests confirmed that volatile and multi-valued index expressions are rejected and that the default `str_trim()` does not remove surrounding tabs. The claims about automatic indexes, composite and partial constraints, immutable singleton index expressions, concurrent index builds, `.gel` schema files, legacy EdgeDB naming, and PostgreSQL index types are consistent with the current official documentation. All external links in the post returned HTTP 200 during validation.
