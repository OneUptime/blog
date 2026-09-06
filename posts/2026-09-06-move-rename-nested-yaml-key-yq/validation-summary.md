# Validation Summary: How to Move or Rename a Nested YAML Key Without Losing Its Children in yq

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Mike Farah yq v4.53.6
- YAML mappings, sequences, tags, comments, anchors, and aliases
- Bash environment variables and command exit statuses
- Configuration transformation and validation

## Sources Consulted
- Keys: https://mikefarah.gitbook.io/yq/operators/keys
- Assign Update: https://mikefarah.gitbook.io/yq/operators/assign-update
- Delete: https://mikefarah.gitbook.io/yq/operators/delete
- Path and setpath: https://mikefarah.gitbook.io/yq/operators/path
- Variables: https://mikefarah.gitbook.io/yq/operators/variable-operators
- Environment variables and strenv: https://mikefarah.gitbook.io/yq/operators/env-variable-operators
- Has: https://mikefarah.gitbook.io/yq/operators/has
- Tags: https://mikefarah.gitbook.io/yq/operators/tag
- Boolean operators: https://mikefarah.gitbook.io/yq/operators/boolean-operators
- Default values: https://mikefarah.gitbook.io/yq/operators/alternative-default-value
- Multiply merge: https://mikefarah.gitbook.io/yq/operators/multiply-merge
- Anchors and aliases: https://mikefarah.gitbook.io/yq/operators/anchor-and-alias-operators
- YAML 1.2.2, particularly alias nodes and preceding anchor requirements: https://yaml.org/spec/1.2.2/#alias-nodes
- Official release and binary: https://github.com/mikefarah/yq/releases/tag/v4.53.6
- Official v4.53.6 executable's `--help` output for `-e` and `-i`.

## Issues Found
1. **The move guard could allow source data loss with scalar destination parents.** On v4.53.6, an existing string or false value at `infrastructure` or `infrastructure.databases` could cause the original expression to delete the source without inserting its value, yet return success. Added destination parent map checks to both move guards, allowing missing/null parents through `// {}` and explicitly rejecting false because the default operator also replaces false. Clarified the parent-type requirement beside the unguarded move example. Verified rejected inputs leave the file unchanged.
2. **Checking anchor existence alone was insufficient.** A moved anchor may appear after an alias, making emitted YAML invalid despite the anchor still existing. Clarified that aliases must resolve to the intended earlier anchor in the same document. Reproduced the failure by moving the anchored example and parsing its output.
3. **Multi-document guidance omitted preservation of unmatched documents.** Enforcing an exact-one identity match does not prevent a top-level `select` from dropping other documents during in-place output. Clarified that other documents must be preserved explicitly.

## Review Notes
- Executed all 12 Bash code blocks using the official macOS ARM64 yq v4.53.6 binary in temporary fixtures. All examples behaved as described after corrections; the deliberately incorrect delete-before-read example correctly produced a null destination.
- Passed 40 command/fixture checks, plus output parsing checks. Verified exact displayed rename/move output, subtree preservation, in-place updates, selected array renaming, literal dots/brackets through strenv, setpath, post-move membership checks, missing sources, existing destinations including null, and scalar/sequence destination parents.
- Confirmed null and absent destination parents allow creation, valid existing maps preserve unrelated entries, and rejected guarded operations leave input bytes unchanged.
- Verified direct key renaming preserves the sample anchor and alias names; moving the anchor after its alias causes the emitted document to fail parsing.
- The referenced v4.53.6 release exists. Validation is specific to this version; the post does not claim compatibility with every earlier v4 release.
- Single-document assumptions and the need to exclude concurrent writers remain relevant. Guards do not provide file locking.
- Metadata preservation remains layout-dependent, as the post already explains. The unguarded examples assume valid source paths and compatible destination parents.
