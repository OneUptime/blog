# Validation Summary: How to Use Pretty Format and Its Variants in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- ClickHouse Pretty output format and variants (Pretty, PrettyCompact, PrettyCompactMonoBlock, PrettyNoEscapes, PrettyCompactNoEscapes, PrettySpace)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse official documentation — Formats overview: https://clickhouse.com/docs/en/interfaces/formats#pretty
- ClickHouse official documentation — Pretty format: https://clickhouse.com/docs/en/interfaces/formats#pretty
- ClickHouse official documentation — PrettyCompact format: https://clickhouse.com/docs/en/interfaces/formats#prettycompact
- ClickHouse official documentation — Format settings (output_format_pretty_max_rows, output_format_pretty_max_column_pad_width, output_format_pretty_max_value_width): https://clickhouse.com/docs/en/operations/settings/formats

## Issues Found

1. **Incorrect default format claim (line 11 & section heading):** The post stated that Pretty is the default format in interactive clickhouse-client. Per the official docs, **PrettyCompact** is the default, not Pretty. Fixed the intro paragraph and moved the "(Default)" label from the Pretty section heading to the PrettyCompact section.

2. **Incorrect sample output characters (lines 30–38):** The Pretty format example output used ASCII characters (`+`, `|`, `=`), but ClickHouse Pretty format uses Unicode box-drawing characters (`┌`, `─`, `┬`, `┐`, `│`, `├`, `┼`, `┤`, `└`, `┴`, `┘`) by default (UTF-8 grid charset). Replaced the example with correct Unicode box-drawing output. Also added `FORMAT Pretty;` to the query since Pretty is not the default.

3. **Misleading PrettyCompact description (line 43):** The post said PrettyCompact "removes the separator lines between rows." More accurately, Pretty draws a full grid where each row occupies two terminal lines, while PrettyCompact uses a more compact grid layout without separator lines between data rows. Clarified the description.

4. **Inaccurate PrettyCompactMonoBlock description (line 55):** The post said it "reads all data into memory before rendering." Per the docs, it buffers up to 10,000 rows and outputs them as a single table rather than by blocks. Corrected to reflect the buffering limit and block-vs-single-table distinction.

5. **Summary section:** Updated to correctly state that PrettyCompact (not Pretty) is the default for interactive sessions.

## Review Notes
- The `output_format_pretty_grid_charset` setting can switch between UTF-8 (default) and ASCII grid characters. The blog could mention this setting for users who prefer ASCII output, but it is not a technical error to omit it.
- PrettySpaceNoEscapes and PrettySpaceMonoBlock also exist as format variants but are not covered — this is fine for a blog post focused on the most common variants.
- The `output_format_pretty_color` setting (default: true) controls whether ANSI color codes are used, which is related to but distinct from the NoEscapes format variants. Could be mentioned as an alternative to using NoEscapes formats.
