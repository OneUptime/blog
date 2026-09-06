# Validation Summary: How to Keep Every Conflicting Value When Merging YAML Files with yq

## Status
validated

## Post Type
Tutorial / configuration management guide.

## Technologies Covered
- Mike Farah yq v4.53.6 and its expression language.
- YAML mappings, sequences, scalars, and explicit null values.
- Bash commands and array argument expansion.
- Configuration merging, provenance reporting, and CI validation.

## Sources Consulted
- Multiply (Merge): https://mikefarah.gitbook.io/yq/operators/multiply-merge
- Collect into Array: https://mikefarah.gitbook.io/yq/operators/collect-into-array
- Has: https://mikefarah.gitbook.io/yq/operators/has
- File Operators: https://mikefarah.gitbook.io/yq/operators/file-operators
- Unique: https://mikefarah.gitbook.io/yq/operators/unique
- Reduce: https://mikefarah.gitbook.io/yq/operators/reduce
- Boolean Operators: https://mikefarah.gitbook.io/yq/operators/boolean-operators
- Evaluate All: https://mikefarah.gitbook.io/yq/commands/evaluate-all
- Official v4.53.6 release: https://github.com/mikefarah/yq/releases/tag/v4.53.6
- Official v4.53.6 executable: `yq --version` and `yq ea --help`.

## Issues Found
- The discussion of deduplication and distinct-value CI checks omitted the documented distinction between null spellings. In v4.53.6, `[null, ~] | unique | length` returns `2`, although both entries represent YAML null. Added a clarification in the existing deduplication paragraph explaining that normalization is necessary when those spellings should count as one value. No command changes were needed.

## Review Notes
- Executed the complete merge, selected-path collection, scalar-wrapping append merge, source-report, and root-validation commands using the official macOS ARM64 v4.53.6 executable. Their data outputs matched the post. Filename-label comments in the array examples can also appear in output because yq preserves comments.
- Confirmed normal right-hand scalar precedence, replacement of unrelated arrays with `*`, deep merging of logging keys, and appending of all conflicting arrays with `*+`.
- Verified collection with missing keys, a missing service mapping, explicit null, repeated values, multiple YAML documents, a single occurrence, and no occurrences. Missing values were excluded, explicit null remained, input order and duplicates were preserved, and zero occurrences produced an empty array.
- Verified that `unique` preserves first-occurrence order with `[b, a, b, c, a]`, producing `[b, a, c]`, and reproduced the null-spelling caveat separately.
- Verified root validation succeeds for mappings and exits nonzero for sequences, scalar strings, explicit null, empty input, and a mixed mapping/sequence document stream. This checks root types; it does not validate the nested consumer schema.
- The shell array assignment and quoted array expansion are valid Bash syntax. The standalone deduplication block is a yq expression fragment to use inside a yq command.
- The report records source filenames before reduction; multiple documents from the same file share that filename. Adding document indices could improve future audit reports, but is not required for the two-file example.
- The referenced documentation and release URLs resolve to the intended official resources. No deprecated syntax was identified for the tested version. The explicit warning about changing scalar fields into arrays is appropriate.
