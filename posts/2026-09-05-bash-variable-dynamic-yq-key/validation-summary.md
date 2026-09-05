# Validation Summary: How to Use a Bash Variable as a Dynamic yq Key Without Getting `null`

## Status
validated

## Post Type
Tutorial / command-line guide

## Technologies Covered
- Mike Farah yq v4 (tested with v4.53.6)
- Bash variables, environment assignments, quoting, and command substitution
- YAML mappings, sequences, scalar types, and configuration updates

## Sources Consulted
- Official yq environment variable operators: https://mikefarah.gitbook.io/yq/operators/env-variable-operators
- Official yq traversal documentation: https://mikefarah.gitbook.io/yq/operators/traverse-read
- Official yq eval documentation: https://mikefarah.gitbook.io/yq/operators/eval
- Official yq has documentation: https://mikefarah.gitbook.io/yq/operators/has
- Official yq contains documentation, read in the upstream repository: https://github.com/mikefarah/yq/blob/master/pkg/yqlib/doc/operators/contains.md
- Official yq equality documentation, read in the upstream repository: https://github.com/mikefarah/yq/blob/master/pkg/yqlib/doc/operators/equals.md
- Official yq variable documentation, read in the upstream repository: https://github.com/mikefarah/yq/blob/master/pkg/yqlib/doc/operators/variable-operators.md
- Upstream wildcard implementation: https://github.com/mikefarah/yq/blob/master/pkg/yqlib/matchKeyString.go
- Upstream unbound-variable implementation: https://github.com/mikefarah/yq/blob/master/pkg/yqlib/operator_variables.go
- Upstream CLI flag definitions: https://github.com/mikefarah/yq/blob/master/cmd/root.go
- Release metadata: https://api.github.com/repos/mikefarah/yq/releases/latest
- GNU Bash environment documentation: https://www.gnu.org/software/bash/manual/html_node/Environment.html
- GNU Bash single-quote documentation: https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
- GNU Bash command substitution documentation: https://www.gnu.org/s/bash/manual/html_node/Command-Substitution.html

## Issues Found
- The introduction grouped dashes with punctuation that causes the demonstrated null result. The dotted lookup of `worker-blue` works. Narrowed the explanation to dots being interpreted as path separators and clarified that a dash alone does not cause this failure.
- The complete-path example used `.services[0].image`, although the supplied services configuration is a map. Testing showed that this adds a numeric `0` map key instead of updating an existing service. Changed the prose and path assignment to `.services["api.example.com"].image` so the example works with the supplied mapping.
- The unbound-variable example did not explain its actual result. In v4.53.6, `$key` produces an empty result list, making the brackets act as a splat and returning both service images. Added a version-specific clarification so readers do not assume an undefined-variable error.

## Review Notes
- Built the official upstream source at commit `8b5af06`; the binary reports v4.53.6, also reported by the release API as the latest release at review time.
- GitBook pages could not be rendered by the browser tool because they returned Markdown. Consulted the matching documentation directly from the official yq repository. The referenced documentation URLs correspond to the intended resources; GNU Bash documentation was also verified through indexed official pages after direct fetches timed out.
- Checked every Bash code block with `bash -n`. Executed representative examples and edge cases covering dotted-key failure, environment-based lookup, exported/unexported variable behavior, multiple keys, assignments, numeric versus string tags, corrected eval lookup, exit status, map membership, parent-type checks, wildcard traversal, exact mutual containment, and raw scalar output. Verified both in-place update forms on a temporary configuration.
- Confirmed that both `*` and `?` are traversal patterns in the tested version and that the mutual-containment expression selects literal wildcard-bearing string keys exactly.
- The membership example checks the service key, not whether its image field exists; this matches the stated service-key check. Parent preflight commands return failure statuses, which calling automation must honor before updating.
- Examples target Mike Farah yq, not other tools named yq. Unbound-variable behavior is an implementation detail and should not be used as a lookup technique. The post’s single-document examples do not establish per-document validation for YAML streams.
