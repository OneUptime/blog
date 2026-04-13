# Validation Summary: How to Use MongoDB Atlas Performance Advisor

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Performance Advisor
- MongoDB Atlas CLI (`atlas` CLI)
- mongosh (MongoDB Shell)
- MongoDB indexing (`createIndex`, `explain`)
- MongoDB profiler (`setProfilingLevel`)

## Sources Consulted
- MongoDB Atlas CLI v1.53.2 help output for `performanceAdvisor suggestedIndexes list`, `slowQueryLogs list`, `slowOperationThreshold`, and `clusters update`
- MongoDB official documentation on index builds and the `background` option (deprecated in 4.2)
- MongoDB Atlas documentation on Performance Advisor and managed slow operation threshold
- MongoDB documentation on `db.setProfilingLevel()` and `db.currentOp()`
- MongoDB documentation on the ESR (Equality, Sort, Range) index rule

## Issues Found

### 1. Incorrect MongoDB version for non-blocking index builds (Step 4)
- **What was wrong:** The post stated "On MongoDB 4.4+, index builds are non-blocking by default." The optimized (non-blocking) index build process was introduced in MongoDB 4.2, not 4.4. The `background` option has been ignored since 4.2.
- **What was changed:** Updated to "On MongoDB 4.2+, index builds use an optimized build process and the `background` option is ignored."
- **Why:** MongoDB 4.2 introduced the hybrid index build mechanism that replaced foreground/background builds. The `background` option is accepted but ignored starting in 4.2, not 4.4.

### 2. Invalid `--until` flag in slow query logs command (Step 6)
- **What was wrong:** The command used `--until 1704153600` which is not a valid flag for `atlas performanceAdvisor slowQueryLogs list`.
- **What was changed:** Replaced `--until 1704153600` with `--duration 86400000` (86400 seconds = 24 hours, expressed in milliseconds).
- **Why:** The Atlas CLI `slowQueryLogs list` command supports `--since` (UNIX epoch seconds) and `--duration` (milliseconds), not `--until`.

### 3. Completely incorrect command for adjusting slow query threshold (Step 7)
- **What was wrong:** The command `atlas clusters update myCluster --mongoDBMajorVersion 7.0` was presented as setting the slow query threshold to 50ms. This command updates the MongoDB version of the cluster — it has nothing to do with the slow query threshold. Additionally, the flag name is `--mdbVersion`, not `--mongoDBMajorVersion`.
- **What was changed:** Replaced the entire Step 7 section with the correct workflow: using `atlas performanceAdvisor slowOperationThreshold disable` to disable Atlas's automatic threshold management, then `db.setProfilingLevel(1, { slowms: 50 })` via mongosh to set a custom threshold, with an option to re-enable automatic management.
- **Why:** Atlas manages the slow operation threshold automatically on dedicated clusters. To set a custom threshold, you must first disable the managed threshold, then use `db.setProfilingLevel()` to set your desired value.

## Review Notes
- The `background: true` option is still shown in the Step 4 code example with a comment "Non-blocking in older versions." While this is technically accepted (and silently ignored) by MongoDB 4.2+, future revisions could remove it entirely to avoid confusion since Atlas M10+ clusters run modern MongoDB versions.
- The ESR (Equality, Sort, Range) rule explanation and example are correct and well-illustrated.
- The `explain("executionStats")` guidance in Step 8 is accurate.
- The Atlas CLI commands in Steps 5 and 6 use `--clusterName`, which may need to be `--processName` depending on the Atlas CLI version. Current Atlas CLI v1.53.2 documentation shows `--processName` as the required identifier for performance advisor commands. This was not changed as there is ambiguity across CLI versions, but authors should verify against their target CLI version.
