# Validation Summary: How to Merge YAML Arrays by a Unique Key Instead of Replacing Them with yq

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Mike Farah yq v4, tested with v4.53.6
- YAML maps, sequences, scalar types, and configuration overlays
- Bash commands, exit-status checks, and output redirection
- Keyed array merging and identity validation

## Sources Consulted
- [Multiply (Merge), including keyed array merging](https://mikefarah.gitbook.io/yq/operators/multiply-merge#merge-arrays-of-objects-together-matching-on-a-key)
- [Reduce operator](https://mikefarah.gitbook.io/yq/operators/reduce)
- [Entries operator](https://mikefarah.gitbook.io/yq/operators/entries)
- [Unique operator](https://mikefarah.gitbook.io/yq/operators/unique)
- [Boolean operators and all_c](https://mikefarah.gitbook.io/yq/operators/boolean-operators)
- [Evaluate All command](https://mikefarah.gitbook.io/yq/commands/evaluate-all)
- [File operators and fi](https://mikefarah.gitbook.io/yq/operators/file-operators)
- [Alternative/default-value operator](https://mikefarah.gitbook.io/yq/operators/alternative-default-value)
- [Sort operator](https://mikefarah.gitbook.io/yq/operators/sort)
- [yq v4.53.6 release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
- Local Mike Farah yq v4.53.6 executable: version output and eval-all --help.

## Issues Found
1. The merge instructions did not state their single-document-per-file assumption. `fi` identifies an input file, so selecting `fi == 0` or `fi == 1` does not isolate one document when a file contains multiple documents. Added the assumption immediately before the main command, keeping the existing two-file algorithm intact.
2. The identity-field adaptation incorrectly said to replace “both references” to `.name`, although the main merge expression has one such reference and the example also changes the array path to `.rules`. Corrected the instruction to specify `.id`, `.rules`, and corresponding changes to the validation expression.

## Review Notes
- Executed the main command using the exact supplied fixtures; its output matched the published YAML exactly, including field and service ordering.
- Executed the positional merge example and confirmed its index-based behavior. Executed the `id` variant with appropriately renamed fixture fields.
- Ran the Bash validation loop successfully on the supplied files. Separately verified acceptance of valid and empty arrays, and rejection of duplicate, missing, empty, null, boolean, and numeric identities, scalar array elements, and a non-array services value.
- Verified nested-map merging, preservation of earlier-only fields, later scalar precedence, explicit scalar null overrides, default nested-array replacement, and nested-array appending with `*+`.
- Tested reordered overlay entries: updates retained the base identity position, while new identities followed. Verified explicit name sorting and both default and explicit namespaces in the composite-key expression.
- The composite identity requires the stated component validation and delimiter restrictions. The `//` operator also defaults false values, so rejecting invalid namespace types remains necessary.
- Confirmed the linked operator pages and release exist and match the described features. No deprecated syntax was found in the examples.
- The warning against in-place source edits is a workflow recommendation: yq officially supports in-place multi-file merges, but retaining source layers is consistent with the post’s stated review policy.
- Testing covered single-document configuration files and the stated schema; it does not establish behavior for arbitrary multi-document streams, custom YAML tags, or alias-heavy inputs.
