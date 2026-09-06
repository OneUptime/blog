# Validation Summary: How to Convert Selected YAML Fields to CSV with yq Without Losing Quoting

## Status
validated

## Post Type
Tutorial / command-line data transformation guide.

## Technologies Covered
- Mike Farah yq v4, tested with v4.53.6.
- YAML scalar values, tags, maps, and sequences.
- CSV encoding, quoting, multiline fields, and decoding.
- JSON serialization of nested values.
- Bash output redirection.
- Spreadsheet formula injection considerations.

## Sources Consulted
- Mike Farah yq CSV/TSV documentation: https://mikefarah.gitbook.io/yq/usage/csv-tsv
- Encode/decode operators: https://mikefarah.gitbook.io/yq/operators/encode-decode
- Alternative/default operator: https://mikefarah.gitbook.io/yq/operators/alternative-default-value
- Has operator: https://mikefarah.gitbook.io/yq/operators/has
- Boolean operators and `all_c`: https://mikefarah.gitbook.io/yq/operators/boolean-operators
- Tag operator: https://mikefarah.gitbook.io/yq/operators/tag
- Version-pinned CSV encoder implementation: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/encoder_csv.go
- Version-pinned CSV decoder implementation: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/decoder_csv_object.go
- Collection and traversal implementations: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/operator_collect.go and https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/operator_traverse_path.go
- Official release and executable: https://github.com/mikefarah/yq/releases/tag/v4.53.6 ; local `yq --version` and `yq --help`.
- OWASP CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection

## Issues Found
1. **Missing replica values shortened the rows.** The sample YAML has no `replicas` field. In the header-plus-rows expression, `.replicas` contributed no cell, producing two-column data rows beneath a three-column header. Changed it to `([.replicas] | .[0])`, which materializes a null cell. Verified that every output row now has three columns.
2. **The missing/null explanation was too broad.** A standalone row expression can materialize missing paths as null, but the header concatenation expressions can omit them. Replaced the unconditional claim with the observed v4.53.6 behavior and the explicit materialization expression. Also clarified that explicit YAML null spellings are emitted as their scalar text: `null`, `~`, and an empty value do not necessarily produce identical CSV text. The encoder writes each scalar node's value directly before CSV escaping.

## Review Notes
- Executed all 11 complete CLI examples with the official v4.53.6 macOS ARM64 executable in a temporary directory. All completed successfully after correction. Also executed the JSON and list-joining expression fragments.
- Compared both published CSV output blocks against actual output; both matched exactly. Parsed the main output with Python's CSV reader and verified the embedded newline, doubled quotes, and JSON cell contents.
- Tested absent owners, explicit nulls, false, tilde nulls, and empty YAML values. The existing default expression emits blanks as described; the presence/tag expression retains four columns and distinguishes absence from explicit null and false.
- Verified direct-object header inference excludes keys absent from the first object, and nested map cells fail with the documented scalar-array error.
- Tested the source-shape validator with the supplied valid data, empty arrays, missing items, map-valued items, scalar elements, missing required fields, and valid false booleans. Invalid shapes returned nonzero; an empty array is accepted.
- Confirmed that `--csv-auto-parse=false` still parses simple scalar text in v4.53.6: a leading-zero identifier became numeric in JSON output, booleans and null were typed, and a JSON object remained a string. The existing version-specific caveat is accurate.
- The CSV-to-YAML command works, but v4.53.6 emits a compatibility warning about automatic output-format selection. Explicit `-o=yaml` would avoid that warning; the existing command remains functional and was retained.
- Official yq documentation links resolved through direct HTTP retrieval after the browsing tool could not process their content. The release and OWASP links resolved; the pinned GitHub source files were checked through raw.githubusercontent.com.
- Output redirection was exercised only with separate temporary input/output files. The GNU Bash online manual retrieval timed out; the truncation statement is consistent with shell redirection semantics.
- Correct CSV escaping does not restore YAML metadata or neutralize spreadsheet formulas. The existing limitations and separate spreadsheet-policy guidance are accurate; no formula payload execution was needed.
