# Validation Summary: How to Monitor Redis Command Stats with INFO commandstats

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INFO commandstats section)
- redis-cli
- awk / sort / head (shell pipeline for parsing output)
- Python redis-py client library

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CONFIG RESETSTAT documentation: https://redis.io/docs/latest/commands/config-resetstat/
- Redis 7.0 release notes (for rejected_calls/failed_calls fields): https://redis.io/docs/latest/operate/rs/release-notes/
- redis-py library documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Incorrect awk field indices in "Find the Most Expensive Commands"
**What was wrong:** The awk command used `{print $2, $8}` which, with the delimiter set `[:,=]`, would print the literal strings `calls` and `rejected_calls` instead of the command name and usec_per_call value.
**What was changed:** Fixed to `{print $1, $7}` which correctly prints the command name (e.g., `cmdstat_get`) and the usec_per_call value (e.g., `2.60`).
**Why:** With delimiters `:`, `,`, and `=`, the fields split as: $1=cmdstat_get, $2=calls, $3=482930, $4=usec, $5=1254832, $6=usec_per_call, $7=2.60, etc. The original indices targeted label strings rather than values.

### 2. Incorrect awk field indices in "Find the Most Used Commands"
**What was wrong:** The awk command used `{print $2, $4}` which would print `calls` and `usec` (label strings) instead of the command name and call count.
**What was changed:** Fixed to `{print $1, $3}` which correctly prints the command name and the calls count value.
**Why:** Same field-splitting issue as above.

### 3. Inaccurate description of `rejected_calls` field
**What was wrong:** The table described `rejected_calls` as "Calls rejected due to errors (e.g., wrong type)". WRONGTYPE errors occur during command execution and are counted under `failed_calls`, not `rejected_calls`.
**What was changed:** Updated to "Calls rejected before execution (e.g., wrong number of arguments, ACL denials)" which accurately reflects that these are pre-execution rejections.
**Why:** Redis distinguishes between calls rejected before execution (rejected_calls) and calls that executed but returned an error (failed_calls). The original example ("wrong type") belongs to the latter category.

### 4. Unused `import time` in Python script
**What was wrong:** The `time` module was imported but never used in the script.
**What was changed:** Removed the unused import.
**Why:** Unused imports are misleading and suggest the script needs `time` for some functionality it doesn't actually use.

## Review Notes
- The `rejected_calls` and `failed_calls` fields in INFO commandstats output were introduced in Redis 7.0. The post does not specify a minimum Redis version; readers on Redis 6.x or earlier will see output without these fields.
- The sample output arithmetic is correct (all usec_per_call values match usec/calls).
- The Python script correctly uses `r.info("commandstats")` which returns a parsed dict in redis-py.
- The recommendation to use CONFIG RESETSTAT for baselining is correct and practical advice.
