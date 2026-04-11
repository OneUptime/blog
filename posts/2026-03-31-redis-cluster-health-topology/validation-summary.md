# Validation Summary: How to Monitor Redis Cluster Health and Topology

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Cluster
- redis-cli (command-line interface)
- Bash scripting for automated health checks
- CLUSTER INFO, CLUSTER NODES, CLUSTER SHARDS, CLUSTER LINKS commands

## Sources Consulted
- Redis official documentation for CLUSTER INFO: https://redis.io/docs/latest/commands/cluster-info/
- Redis official documentation for CLUSTER NODES: https://redis.io/docs/latest/commands/cluster-nodes/
- Redis official documentation for CLUSTER LINKS: https://redis.io/docs/latest/commands/cluster-links/
- Redis official documentation for CLUSTER SHARDS: https://redis.io/docs/latest/commands/cluster-shards/
- Redis official documentation for ROLE: https://redis.io/docs/latest/commands/role/
- Redis official documentation for INFO replication: https://redis.io/docs/latest/commands/info/

## Issues Found

### 1. CLUSTER NODES grep patterns missed current node (Fixed)
**What was wrong:** The grep patterns `grep " master "` and `grep " slave "` (with surrounding spaces) would miss the node being queried, because that node's flags include `myself,master` or `myself,slave` — the space-bounded pattern doesn't match comma-prefixed flags.
**What was changed:** Removed surrounding spaces so the patterns are `grep master` and `grep slave`, which correctly match both `master` and `myself,master` (and likewise for slave). This is safe because no other field in CLUSTER NODES output contains these strings as substrings.
**Why:** The original patterns caused `MASTER_COUNT` to be off by 1, which is incorrect for a monitoring guide.

### 2. Incorrect flag name in fail-state grep (Fixed)
**What was wrong:** The grep pattern `grep -E "pfail|fail"` used `pfail` as an alternative, but CLUSTER NODES output represents PFAIL state as `fail?` (with a question mark), not `pfail`. While the grep still functioned (because `fail` matched both `fail` and `fail?` as a substring), the `pfail` alternative was misleading and never matched anything.
**What was changed:** Updated to `grep -E "fail\?|fail "` which correctly matches the actual CLUSTER NODES flag names (`fail?` for PFAIL, `fail` followed by a space for FAIL state), and avoids false positives on flags like `nofailover`.
**Why:** Accuracy matters in a monitoring guide; using the correct flag representation prevents confusion.

### 3. Missing version note for CLUSTER LINKS (Fixed)
**What was wrong:** The CLUSTER LINKS section did not mention that the command requires Redis 7.0+, while the adjacent CLUSTER SHARDS section correctly noted its version requirement.
**What was changed:** Added a `# Redis 7.0+` comment above the CLUSTER LINKS command.
**Why:** Readers running older Redis versions need to know which commands are available to them.

## Review Notes
- The `total_cluster_links_buffer_limit_exceeded` field in the CLUSTER INFO example output was also introduced in Redis 7.0, but since it's shown as part of an example output block rather than a critical monitoring field, this is acceptable.
- The ROLE command still returns "master" and "slave" (not "replica") in its output even in Redis 7.x, so the script's `if [ "$ROLE" = "slave" ]` check is correct.
- The automated health check script uses Nagios-compatible exit codes (0=OK, 1=WARNING, 2=CRITICAL), which is a good practice for monitoring integration.
