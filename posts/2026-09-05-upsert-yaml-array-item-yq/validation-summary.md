# Validation Summary: How to Upsert a YAML Array Item with yq When the Object May Not Exist

## Status
validated

## Post Type
Tutorial / command-line configuration management guide.

## Technologies Covered
- Mike Farah yq v4, tested with v4.53.3 and v4.53.6.
- YAML arrays, mappings, scalar tags, and presentation preservation.
- Bash environment variables, parameter expansion, exit statuses, and conditional execution.
- Idempotent configuration updates, duplicate detection, and concurrent file writes.

## Sources Consulted
- [yq With](https://mikefarah.gitbook.io/yq/operators/with)
- [yq Boolean Operators](https://mikefarah.gitbook.io/yq/operators/boolean-operators)
- [yq Multiply (Merge)](https://mikefarah.gitbook.io/yq/operators/multiply-merge)
- [yq Add](https://mikefarah.gitbook.io/yq/operators/add)
- [yq Unique](https://mikefarah.gitbook.io/yq/operators/unique)
- [yq Equals](https://mikefarah.gitbook.io/yq/operators/equals)
- [yq Contains](https://mikefarah.gitbook.io/yq/operators/contains)
- [yq Alternative (Default Value)](https://mikefarah.gitbook.io/yq/operators/alternative-default-value)
- [yq Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [yq Map](https://mikefarah.gitbook.io/yq/operators/map)
- [yq Assign (Update)](https://mikefarah.gitbook.io/yq/operators/assign-update)
- [yq Tag](https://mikefarah.gitbook.io/yq/operators/tag)
- [yq v4.53.3 equality implementation](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_equals.go), confirming scalar textual comparison and special handling of nulls.
- [yq v4.53.3 in-place writer implementation](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/write_in_place_handler.go), confirming temporary-file replacement without a writer lock.
- [yq v4.53.3 README](https://github.com/mikefarah/yq/blob/v4.53.3/README.md), including presentation-preservation limitations.
- [Official yq releases](https://github.com/mikefarah/yq/releases), plus downloaded official v4.53.3 and v4.53.6 binaries and local CLI help for `-e`, `-r`, and `-i`.
- Local Bash `man bash`, sections on parameter expansion and AND/OR lists. GNU web manual requests timed out; the installed manual supplied the authoritative shell reference.

## Issues Found
1. **Validation failure did not explicitly stop automation.** The shape/type check and both duplicate checks returned a nonzero status through `yq -e`, but an ordinary Bash script could continue to an edit afterward. Added `|| exit 1` to all three checks and clarified that the shape/type check exits the script on failure. Tested that invalid input terminates each check before a subsequent command runs.
2. **Concurrency guidance left the single-expression limitation unclear.** The original wording recommended one expression when the file was unlocked without explaining its own read-modify-write race. Clarified that one expression removes the extra membership-check window but still requires a lock shared by all writers to protect concurrent updates. The in-place writer uses temporary-file replacement and provides no such lock.

## Review Notes
- Both displayed output fixtures match the main expression on v4.53.3 and v4.53.6. Repeated appends are idempotent, existing item order is retained, and unspecified fields survive merging.
- Tested absent, null, and empty arrays; updating all duplicate matches; complete replacement of matched objects; and both in-place Bash branches, including repeated execution.
- Tested shape rejection for false, mappings, strings, scalar array elements, missing names, and integer names. Tested replica rejection for zero, negative values, floats, quoted numeric strings, booleans, arrays, and mappings.
- Tested target-specific and global duplicate detectors against unique, duplicate, and missing-array fixtures. Confirmed that `unique_by` keeps the first representative.
- Confirmed `*` and `?` wildcard equality and the integer/string equality caveat at runtime. The complete mutual-containment variant correctly updates or appends literal wildcard names, preserves other names, and remains idempotent.
- v4.53.6 was the latest official release returned during review. The v4.53.3-specific claim remains accurate, and the tested examples also work on v4.53.6; no deprecated operators or flags were identified.
- All five linked operator documentation pages resolve to the intended official resources; their Markdown endpoints were used for readable documentation. The author link redirects successfully to the intended GitHub profile.
- The examples assume a single YAML configuration document and the stated input-validation and identity policies. The exact-match variant also depends on validated string names. Comments, anchors, aliases, and byte-for-byte formatting remain fixture-dependent as the post correctly explains; no universal presentation guarantee was inferred.
- Changes were limited to technical corrections and these validation deliverables; no sections or stylistic restructuring were added to the article.
