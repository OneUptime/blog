# Validation Summary: How to Append to a yq List Only If the Value Is Not Already Present

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Mike Farah yq v4, with implementation-specific behavior verified on v4.53.3
- YAML sequences, mappings, scalar types, tags, and presentation
- Bash environment variables, redirection, and CLI execution
- Idempotent configuration management and CI validation

## Sources Consulted
- Subtract operator: https://mikefarah.gitbook.io/yq/operators/subtract
- Add operator: https://mikefarah.gitbook.io/yq/operators/add
- Unique operator: https://mikefarah.gitbook.io/yq/operators/unique
- Contains operator: https://mikefarah.gitbook.io/yq/operators/contains
- Environment variable operators: https://mikefarah.gitbook.io/yq/operators/env-variable-operators
- Alternative/default operator: https://mikefarah.gitbook.io/yq/operators/alternative-default-value
- Equals operator: https://mikefarah.gitbook.io/yq/operators/equals
- Boolean operators: https://mikefarah.gitbook.io/yq/operators/boolean-operators
- v4.53.3 recursive comparison implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/lib.go
- v4.53.3 subtraction implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_subtract.go
- v4.53.3 uniqueness implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_unique.go
- v4.53.3 containment implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_contains.go
- v4.53.3 equality implementation: https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_equals.go
- Official README, including CLI usage and presentation limitations: https://github.com/mikefarah/yq/blob/v4.53.3/README.md
- Official v4.53.3 release binary and its local --version and --help output: https://github.com/mikefarah/yq/releases/tag/v4.53.3

## Issues Found
- The array-shape guard used `.plugins == null`, which accepts the string `"null"` in v4.53.3. Replaced this with an explicit missing-key check and null/sequence tag checks. Verified that missing keys, YAML null, and arrays pass, while strings, false, numbers, and mappings fail.
- The description of subtraction implied that all scalar tags define identity. Qualified it to explain that built-in scalar tags participate, custom scalar tags are resolved to underlying types, collection tags are ignored, and scalar text is compared. The implementation and a custom-tag fixture confirm this distinction.
- The multiple-candidate explanation suggested deduplicating either candidates or the final array could guarantee global uniqueness. Clarified that candidate-only deduplication leaves existing duplicates intact; global uniqueness requires deduplicating the final result.

## Review Notes
- Executed all 14 Bash command examples using the official v4.53.3 binary with temporary fixtures. Also passed 51 behavior assertions covering append idempotence, missing/null initialization, preserved old duplicates, literal wildcard and empty strings, scalar string preservation, corrected shape validation, custom tags, reordered object keys, differing object values, first-object-wins behavior, CI occurrence checks, mixed scalar types, and repeated candidates.
- Confirmed -i and -e against CLI help. Preview and in-place commands are supported; Bash assignment syntax passes values through the environment without interpolating them into yq expressions.
- Confirmed scalar-text uniqueness, exact built-in string/integer distinction under subtraction, wildcard equality behavior, and tag-sensitive mutual string containment against the version-pinned source and executable.
- All linked operator documentation and implementation resources were accessible through direct HTTP retrieval. The documentation web reader could not render several GitBook pages, so their HTML was retrieved and read directly.
- Version-specific findings are validated for v4.53.3; this review does not claim that it is the latest release or that implementation details are invariant across all v4 releases.
- The CI occurrence check assumes scalar strings as stated; mixed collection elements can cause containment errors. A homogeneous element-type check remains appropriate when the schema requires strings. CI must stop when validation exits unsuccessfully.
- Presentation preservation and concurrent-writer caveats are accurate. Tests used isolated temporary files; no concurrent-write or exhaustive comment/anchor preservation testing was performed.
