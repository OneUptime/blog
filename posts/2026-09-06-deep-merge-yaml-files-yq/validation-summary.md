# Validation Summary: How to Deep-Merge Multiple YAML Files with Explicit Override Precedence in yq

## Status
validated

## Post Type
Tutorial / command-line configuration guide.

## Technologies Covered
- Mike Farah yq v4, tested with v4.53.6.
- YAML maps, sequences, scalar values, custom tags, and document streams.
- Bash arrays, filename expansion, redirection, and exit-status handling.
- Ordered configuration overlays and atomic file replacement.

## Sources Consulted
- yq Multiply (Merge): https://mikefarah.gitbook.io/yq/operators/multiply-merge — checked the official version-pinned documentation at https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/multiply-merge.md.
- yq Reduce: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/reduce.md.
- yq File Operators: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/file-operators.md.
- yq Document Index: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/document-index.md.
- yq Boolean Operators: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/boolean-operators.md.
- yq Tag: https://github.com/mikefarah/yq/blob/v4.53.6/pkg/yqlib/doc/operators/tag.md.
- yq Evaluate All: https://mikefarah.gitbook.io/yq/commands/evaluate-all.md, plus the downloaded v4.53.6 binary's `eval-all --help` output.
- Official release: https://github.com/mikefarah/yq/releases/tag/v4.53.6.
- Installed Bash manual (`man bash`), sections on lists, arrays, and pathname expansion. GNU web manual requests timed out; the local manual and executable checks supplied verification.
- POSIX rename specification: https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html.
- Author profile link: https://www.github.com/nawazdhandala.

## Issues Found
- The validation command returned failure without stopping the subsequent write in a normal Bash script. Added `|| exit 1` and explained it. Verified that invalid input leaves an existing destination untouched, while valid input produces output.
- The two-file `fi` example implied that two filenames alone guarantee a single overlay result. Added the requirement that each file contain one document. Multiple documents produce pairwise results with this expression, whereas `ireduce` combines the whole stream.
- Document-index wording was ambiguous about whether numbering spans files. Clarified that `di` restarts at zero for each file, and that a single-document contract means one configuration document per file.
- The shape-check explanation omitted two limits: empty files can contribute no documents and go unnoticed alongside valid maps, while custom-tagged maps fail the exact `!!map` test. Added these caveats without changing the intended ordinary-map policy.
- The statement that a merge needs all documents available together was broader than necessary: yq also supports merging using `load`. Scoped the statement to this reducer.

## Review Notes
- Executed the main example with the official v4.53.6 binary; output matched the published YAML exactly, including nested values, retained keys, array replacement, and ordering.
- Executed append and positional merge variants, file-index selection, source/value previews, and file/document metadata expressions. Confirmed positional merging preserves unmatched trailing array elements and does not match by object identity.
- Checked all merge flags against official examples; executed existing-only, new-only, and combined existing-only/append cases. Confirmed appending preserves duplicates and verified string multiplication.
- Tested the shape predicate with scalar, sequence, null, empty, custom-tagged, multi-document, and malformed inputs. Multiple ordinary-map documents pass this predicate; it does not enforce one document per file or application schema rules.
- Ran `bash -n` on every Bash code block and tested the revised validation/write sequence for both success and failure.
- Verified the referenced release exists. The examples use supported v4 syntax; no deprecated feature was identified. Tests establish behavior for v4.53.6 rather than every historical v4 release.
- Same-directory temporary output followed by successful validation and rename is consistent with POSIX atomic replacement. The simple direct-redirection example is not itself an atomic publishing workflow, as the post explains.
