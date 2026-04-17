# Validation Summary: How to Use categoricalInformationValue() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- `categoricalInformationValue` aggregate function
- Information Value (IV) / Weight of Evidence (WoE) statistical measure
- ClickHouse functions: `toUInt8`, `cityHash64`, `multiIf`, `toStartOfWeek`, `today`, `count`

## Sources Consulted
- [ClickHouse Docs — categoricalInformationValue](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/categoricalinformationvalue)
- [ClickHouse PR #8117 — Add aggregate function categoricalInformationValue](https://github.com/ClickHouse/ClickHouse/pull/8117)
- [ClickHouse Issue #41443 — Crash in categoricalInformationValue](https://github.com/ClickHouse/ClickHouse/issues/41443)

## Issues Found
Several technical errors were corrected:

1. **Function signature was wrong.** The post described the signature as `categoricalInformationValue(category, outcome)` returning a scalar `iv`. The actual signature is `categoricalInformationValue(category1[, category2, ...], tag)` — it accepts one or more categories followed by a binary tag, and returns `Array(Float64)` (one IV per category column). Updated the introduction, the Concept section's framing, and the Syntax section to reflect this.

2. **Argument types were wrong.** Both the categories and the tag must be `UInt8`. The original examples passed string columns (`browser`, `plan_tier`, `country`, `service_name`, `region`, `endpoint_group`, `host_name`, `error_type`, `user_tier`) directly, which would fail with a type error. Updated every example to encode strings into the `UInt8` range using `toUInt8(cityHash64(col) % 200)`, and added an explanatory note in the Syntax section.

3. **Bucketing example produced strings.** The high-cardinality bucketing example used `multiIf(... 'fast', 'medium', ...)` which yields `String`, not `UInt8`. Replaced the string labels with small integers (0/1/2/3) and wrapped the result in `toUInt8(...)`.

4. **Result was treated as a scalar.** Examples aliased single calls as `iv_browser`, `iv_region`, etc. as if scalars. Clarified that the result is `Array(Float64)`, demonstrated single-element extraction with `arrayElement(...)` / `[1]`, and updated the time-series and segmented-analysis examples accordingly.

5. **Multi-feature ranking idiom was wrong.** The original "Comparing Multiple Features" and "Root-Cause Analysis" sections issued one `categoricalInformationValue` call per feature. The function natively accepts multiple categories in a single call, returning one IV per category column in argument order. Rewrote both examples to use the proper multi-category form, which is also what the documentation specifies.

6. **IV formula was inverted.** The post wrote `IV = sum over c of (P(outcome=1 | c) - P(outcome=0 | c)) * WoE(c)`, which uses conditional probabilities the wrong way around (the standard WoE-based IV uses `P(c|outcome=...)`, not `P(outcome=...|c)`). Replaced the formula with the per-category contribution as documented by ClickHouse: `(P(tag=1) - P(tag=0)) * (log(P(tag=1)) - log(P(tag=0)))`, and clarified that the function returns one IV per category column.

## Review Notes
- The `cityHash64(...) % 200` encoding used in the examples is a generic illustration; for production use with high-cardinality strings it will collide many distinct categories into the same bucket and inflate or distort IVs. For low-cardinality features, an explicit `transform()` mapping or pre-encoded numeric ID column is preferable.
- The IV interpretation thresholds (0.02 / 0.1 / 0.3) are the standard credit-scoring rule of thumb (Siddiqi); they were left unchanged as they are widely accepted.
- The Mermaid flowchart and the rule-of-thumb thresholds are conceptual guidance, not ClickHouse-specific behavior, and were left unchanged.
- ClickHouse Issue #41443 documents that the function can crash on `Nullable` inputs; consider filtering or coalescing nulls before calling. Not added to the post since it is a separate operational concern.
