# Validation Summary: How to Use EXPLAIN PLAN in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- EXPLAIN PLAN statement and its options (`description`, `header`, `actions`)
- MergeTree storage engine

## Sources Consulted
- Official ClickHouse EXPLAIN documentation: https://clickhouse.com/docs/sql-reference/statements/explain
- ClickHouse test reference files (expected output):
  - `tests/queries/0_stateless/01508_explain_header.reference`
  - `tests/queries/0_stateless/02227_union_match_by_name.reference`
  - `tests/queries/0_stateless/02835_join_step_explain.reference`
- ClickHouse `tests/queries/0_stateless/` SQL test sources for `EXPLAIN header = 1` and `EXPLAIN ... actions = 1`

## Issues Found

1. **"Plan with Descriptions" section showed a fictitious output format.** The post rendered descriptions on separate `description:` lines with full sentences (e.g. `description: Project and rename columns for the final SELECT list.`). ClickHouse does not produce such lines. Descriptions are emitted inline as parenthetical annotations on the node name itself (e.g. `Expression (Projection)`, `Filter (WHERE)`). Additionally, the post implied `description = 1` must be enabled, but it is the **default** value per the ClickHouse docs. Fixed by rewriting the section to correctly state the default, explain what the annotations look like, and replace the fabricated output with the real format (which matches the basic plan).

2. **"Plan with Header" section used comma-separated single-line headers.** The post showed `Header: user_id UInt64, events UInt64`. ClickHouse's actual text output places each column on its own line with whitespace alignment under `Header:`. Fixed the example to use the correct multi-line column listing, matching the format in the ClickHouse test reference files.

3. **"Plan with Actions" section used comma-separated single-line actions.** The post rendered multiple actions joined by commas on one line. ClickHouse emits each action on its own indented line under `Actions:`, and typically follows with a `Positions:` line. Fixed the example to use the correct multi-line format and added a representative `Positions:` line consistent with real EXPLAIN output.

4. **Sorting Nodes example used comma-separated header format.** The header line `Header: user_id UInt64, total Float64` was updated to the correct multi-line format with aligned columns.

## Review Notes

- The conceptual content of the post (what `description`, `header`, and `actions` control, how to read the tree, when sorting is required, and how filter pushdown appears in the plan) is accurate.
- The post does not mention other EXPLAIN PLAN options (`indexes`, `json`, `optimize`) that a reader might also want to know about. This is a scope choice and not a technical error.
- Because `description = 1` is the default, the "Plan with Descriptions" example visually coincides with the basic plan. This is an unavoidable consequence of the option's default value and is now explained in the corrected text.
- Filter pushdown in modern ClickHouse is typically represented as a `Prewhere` step or as predicates attached directly to `ReadFromMergeTree` rather than as a separate `Filter` child — the post's description is a simplification but remains a reasonable rule of thumb for reading query plans.
- No version-specific caveats are called out in the post; the behaviors described match recent ClickHouse 24.x releases.
