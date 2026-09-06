# Validation Summary: How to Update Every Nested Key Matching a Name Pattern with Recursive yq Queries

## Status

validated

## Post Type

Tutorial / command-line configuration management guide.

## Technologies Covered

- Mike Farah yq v4, tested with v4.53.6.
- YAML scalar types, mappings, sequences, anchors, aliases, merge keys, and document streams.
- Bash quoting and command-scoped environment variables.
- Go regular expressions and RE2 syntax.

## Sources Consulted

- Recursive descent and alias traversal boundaries: https://mikefarah.gitbook.io/yq/operators/recursive-descent-glob
- Map keys, array indexes, and `is_key`: https://mikefarah.gitbook.io/yq/operators/keys
- Node kinds: https://mikefarah.gitbook.io/yq/operators/kind
- Regex matching and substitution: https://mikefarah.gitbook.io/yq/operators/string-operators
- Plain and relative assignment: https://mikefarah.gitbook.io/yq/operators/assign-update
- Matching paths: https://mikefarah.gitbook.io/yq/operators/path
- Environment variable parsing: https://mikefarah.gitbook.io/yq/operators/env-variable-operators
- Boolean operators: https://mikefarah.gitbook.io/yq/operators/boolean-operators
- Wildcard equality: https://mikefarah.gitbook.io/yq/operators/equals
- Anchor expansion and merge behavior flag: https://mikefarah.gitbook.io/yq/operators/anchor-and-alias-operators
- Whole-stream evaluation: https://mikefarah.gitbook.io/yq/commands/evaluate-all
- Document splitting: https://mikefarah.gitbook.io/yq/operators/split-into-documents
- Release and executable: https://github.com/mikefarah/yq/releases/tag/v4.53.6
- Version-specific string operator implementation: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/operator_strings.go
- Version-specific boolean operator implementation: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/operator_booleans.go
- Go regular expression syntax: https://pkg.go.dev/regexp
- Local official v4.53.6 executable: `yq --version` and `yq --help`.

## Issues Found

1. **The key-renaming selector did not exclude non-string YAML keys.** `is_key` accepts numeric and boolean mapping keys too, so the original expression failed on a numeric key with `cannot match with !!int, can only match strings`. Added `(tag == "!!str")` before `test` and updated the adjacent explanation. Verified that matching string keys are renamed while numeric and boolean keys remain intact.
2. **The relative-update explanation described integer keys instead of integer values.** The selector tests the value tag for `!!int` and the key tag for `!!str`. Changed the sentence to say it doubles every integer value whose string key ends in `_limit`.

## Review Notes

- Executed all nine Bash command blocks using Mike Farah yq v4.53.6 on temporary fixtures. Confirmed both published input/output pairs and the three expected timeout matches and paths.
- Verified scalar-only selection preserves matching containers while still updating matching descendants, and handles numeric keys, array values, and a scalar document root.
- Verified integer doubling and string replacement with matching fixtures. Integer values were doubled; string and floating-point values were left unchanged by the integer selector.
- Checked `env` parsing of integer, boolean, null, sequence, and mapping values, and the `strenv` string-update example.
- Confirmed the single-document `-e -i` guard returns exit status 1 and preserves the original file when no match exists. Confirmed successful guarded edits produce the expected document.
- Confirmed the per-document guard omits unmatched documents from a mixed stream, as stated. Also tested a collected `eval-all` expression with a global count and `.[] | split_doc`, preserving both matching and unmatched documents.
- Verified `explode(.)` with the explicit merge-behavior flag materializes an anchor, an alias, and a merged mapping, updating all three timeout values and removing anchor/alias syntax.
- The collision warning remains appropriate: restricting key types does not prevent two names from becoming the same key.
- The linked release exists. The operators and flags used are supported in the tested release; compatibility with every historical v4 release was not established. Keep the explicit merge flag because defaults can vary by version.
- All six technical reference links resolve to the intended official documentation or release. No sections were added or reorganized in the post.
