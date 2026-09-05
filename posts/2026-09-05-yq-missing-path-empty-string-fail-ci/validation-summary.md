# Validation Summary: How to Return an Empty String—or Fail CI—When a yq Path Is Missing

## Status
validated

## Post Type
Tutorial / command-line and CI validation guide.

## Technologies Covered
- Mike Farah yq v4 (tested with v4.53.6).
- YAML maps, scalar types, tags, and document streams.
- Bash command substitution, assignments, conditionals, exit status, and pipelines.
- CI/CD validation and sed output formatting.

## Sources Consulted
- [yq alternative/default operator](https://mikefarah.gitbook.io/yq/operators/alternative-default-value).
- [yq evaluate command](https://mikefarah.gitbook.io/yq/commands/evaluate), also verified with `yq eval --help` from v4.53.6.
- [yq has operator](https://mikefarah.gitbook.io/yq/operators/has).
- [yq tag operator](https://mikefarah.gitbook.io/yq/operators/tag).
- [yq length operator](https://mikefarah.gitbook.io/yq/operators/length).
- [yq boolean operators](https://mikefarah.gitbook.io/yq/operators/boolean-operators).
- [yq variable operators](https://mikefarah.gitbook.io/yq/operators/variable-operators).
- [yq environment variable operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators).
- [yq string operators](https://mikefarah.gitbook.io/yq/operators/string-operators).
- [yq v4.53.6 operator precedence definitions](https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/operation.go).
- [GNU Bash pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html).
- [GNU Bash command substitution](https://www.gnu.org/software/bash/manual/html_node/Command-Substitution.html).
- [GNU Bash simple command expansion](https://www.gnu.org/software/bash/manual/html_node/Simple-Command-Expansion.html).
- [GNU Bash set builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html).

## Issues Found
- **Incorrect grouping in both non-empty-string validation expressions.** The original standalone check and combined parent/field check returned false and exit status 1 for the valid sample endpoint. In the tested release, `|` has precedence 30 and `and` has precedence 20. Without grouping the complete conjunction after the binding pipeline, the second check is evaluated outside that pipeline and does not receive the bound variable. Added parentheses around the entire `and` expression in both examples. Updated the adjacent explanation to require that grouping; binding alone does not prevent the error. Both commands now accept the sample endpoint and reject invalid values.

## Review Notes
- Executed all 19 Bash code blocks against the supplied configuration and a matching Deployment fixture; checked shell syntax and expected exit statuses. Examples intentionally demonstrating failure or fragile behavior were evaluated according to their stated purpose.
- Tested each corrected expression against 12 inputs: absent parent, array parent, scalar parent, absent endpoint, null, false, number, empty string, non-empty string, whitespace-only string, array value, and map value. Valid non-empty strings passed; invalid cases failed. Whitespace-only strings passed as the post explicitly permits pending a separate schema policy.
- Confirmed default missing-path output, blank fallback output, command-substitution newline removal, null/false rejection with `-e`, empty-string truthiness, membership tests, dynamic string keys, YAML tags, and structured presence output.
- Confirmed pipeline failure is masked without `pipefail` and propagated with it. The assignment inside `if` retains the lookup status.
- Confirmed mixed-document output can succeed with `-e` when one document returns a truthy value, in either document order. A selection with no matching Deployment fails. The post correctly cautions that selecting a resource does not establish uniqueness or validate every document.
- Official GitBook pages could not consistently be fetched directly in this environment. Their operator documentation was read from the official v4.53.6 Go module under `pkg/yqlib/doc/operators`, supplemented by official search results, CLI help, and source code. Documentation link targets match the relevant official resources; no incorrect link was identified. The example API URL is illustrative and was not treated as a live service dependency.
- The commands target Mike Farah yq v4, not the separate Python/jq-based yq tool. No deprecated flags or operators were identified. Only the two faulty expressions and their explanatory sentence were changed in the post.
