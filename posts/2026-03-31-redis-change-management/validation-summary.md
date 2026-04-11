# Validation Summary: How to Set Up Redis Change Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (CONFIG SET, CONFIG GET, CONFIG REWRITE, ACLs, Cluster, Sentinel)
- Bash scripting
- Git (for GitOps configuration management)

## Sources Consulted
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis CONFIG GET documentation: https://redis.io/docs/latest/commands/config-get/
- Redis CONFIG REWRITE documentation: https://redis.io/docs/latest/commands/config-rewrite/
- Redis redis-server --test-memory documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- Redis maxmemory configuration: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found

### 1. Audit script used wrong variable for CONFIG GET (before/after capture)
- **What was wrong:** `BEFORE=$(redis-cli CONFIG GET "${2}")` and `AFTER=$(redis-cli CONFIG GET "${2}")` used `$2` (the new value, e.g., `8gb`) as the parameter name. With the example usage `./redis-change.sh maxmemory 8gb`, this would run `CONFIG GET 8gb` instead of `CONFIG GET maxmemory`, returning nothing useful.
- **What was changed:** Replaced `"${2}"` with `"$1"` in both CONFIG GET calls so the script correctly queries the parameter name.

### 2. Audit script passed extra argument to CONFIG SET
- **What was wrong:** `redis-cli CONFIG SET "$1" "$2" "$3"` included a third positional parameter `$3` which is empty/unset when called with two arguments. This sends an extra empty string argument to Redis, causing a "wrong number of arguments" error since CONFIG SET expects exactly a parameter name and value.
- **What was changed:** Removed `"$3"` from the CONFIG SET command and the log_change call, making the command `redis-cli CONFIG SET "$1" "$2"`.

### 3. GitOps section misused `--test-memory` as config validation
- **What was wrong:** `redis-server --test-memory 1024 /etc/redis/redis.conf` was presented as a CI/CD config validation step. However, `--test-memory` is a system RAM diagnostic tool that allocates the specified megabytes to test for hardware memory errors. It does not parse or validate a Redis configuration file.
- **What was changed:** Replaced with `diff <(git show HEAD~1:etc/redis/redis.conf) /etc/redis/redis.conf` which is a practical CI/CD step that shows what changed in the config file between commits. Updated the comment from "validate changes" to "diff and lint changes" to accurately describe the operation.

## Review Notes
- Redis does not provide a built-in `--check-config` or `--validate` flag for config files. The GitOps section was updated to use a git diff approach which is more practical for CI/CD review of config changes.
- The `8589934592` value in the success criteria is correct: 8 GB = 8 × 1,024 × 1,024 × 1,024 = 8,589,934,592 bytes.
- The `paste - -` approach in the drift detection script correctly joins alternating key/value lines from CONFIG GET output into tab-separated pairs for comparison.
- The change category classifications and change request template are reasonable operational practices, though specific approval requirements will vary by organization.
