# Validation Summary: How to Use Markdown Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (Markdown output format)
- clickhouse-client CLI
- ClickHouse HTTP interface
- Bash scripting (automation example)

## Sources Consulted
- ClickHouse official documentation — Markdown format: https://clickhouse.com/docs/en/interfaces/formats#markdown
- ClickHouse official documentation — Formats overview: https://clickhouse.com/docs/en/interfaces/formats

## Issues Found

### 1. Incorrect separator row format in sample output
- **What was wrong:** The sample output showed separator rows with padded dashes and no alignment indicators (e.g., `|----------|--------|------------|`). The actual ClickHouse Markdown format output uses a compact separator with right-alignment colons: `|-:|-:|-:|`.
- **What was changed:** Updated both sample output blocks (the code block and the rendered Markdown table) to use the `|-:|-:|-:|` separator format matching actual ClickHouse output.
- **Why:** The official ClickHouse documentation example shows the `|-:|-:|` pattern. The padded-dash format the blog showed is not what ClickHouse produces.

### 2. Inaccurate claim about alignment
- **What was wrong:** The limitations section stated "Column widths are not padded for alignment; alignment is left to the Markdown renderer." ClickHouse actually does specify right-alignment for all columns via the `:` character in the separator row.
- **What was changed:** Updated to: "Column widths are not padded to equal widths. ClickHouse specifies right-alignment for all columns via `:` in the separator row."
- **Why:** The `:` in the separator is a Markdown table alignment directive; ClickHouse generates it, so alignment is not entirely "left to the renderer."

### 3. Updated separator description
- **What was wrong:** The text said "The separator row with dashes and pipes is generated automatically by ClickHouse."
- **What was changed:** Updated to mention "dashes, pipes, and right-alignment colons."
- **Why:** Accuracy — the colons are a significant part of the separator format.

## Review Notes
- The claim that NULL values render as `\N` is consistent with ClickHouse's general NULL serialization behavior across text-based formats, though it is not explicitly documented on the Markdown format page specifically.
- The first query filters `WHERE database NOT IN ('system', 'information_schema')` using only lowercase, while the "Practical Use" query also filters `INFORMATION_SCHEMA`. Both approaches are valid depending on ClickHouse version/configuration, but users should be aware that both casing variants may exist.
- The `Markdown` format also has an alias `MD` which the post does not mention. This is not an error but could be a useful addition in the future.
- All SQL syntax, CLI commands, HTTP interface usage, and shell script examples are correct.
- The comparison table with Pretty, PrettyCompact, Markdown, and Vertical formats is accurate — all are output-only.
