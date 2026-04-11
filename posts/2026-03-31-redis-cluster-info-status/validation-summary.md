# Validation Summary: How to Use CLUSTER INFO in Redis to Check Cluster Status

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Cluster
- Redis CLI (`redis-cli`)
- Bash scripting for monitoring

## Sources Consulted
- Official Redis CLUSTER INFO documentation: https://redis.io/docs/latest/commands/cluster-info/
- Redis source code (`cluster.c`, `cluster_legacy.c`, `server.c`) for field definitions and `clusterUpdateState()` logic
- Redis cluster specification: https://redis.io/docs/latest/operate/oss_and_stack/reference/cluster-spec/

## Issues Found

1. **`cluster_enabled` is not a CLUSTER INFO field (sample output, line 30):** The sample output included `cluster_enabled:1` as the first field. This field belongs to the `INFO` command (`# Cluster` section), not `CLUSTER INFO`. Removed it from the sample output and field reference table.

2. **`cluster_enabled:0` section was factually incorrect (lines 126-136):** The post claimed that `CLUSTER INFO` still works when cluster mode is disabled and returns a reduced output. In reality, `CLUSTER INFO` returns `(error) ERR This instance has cluster support disabled` when cluster mode is off. Rewrote the section to show the correct error and explain how to check cluster mode via the `INFO cluster` command instead.

3. **Field reference table missing `total_cluster_links_buffer_limit_exceeded`:** This field appeared in the sample output but was not documented in the field reference table. Added it with a note that it was introduced in Redis 7.0.

4. **`cluster_state:fail` causes were incomplete and partially inaccurate (lines 140-144):** The original listed three causes, but items 1 and 3 were essentially the same condition (quorum loss), and the critical case of unassigned slots was omitted. Also missing was mention of the `cluster-require-full-coverage` configuration directive, which controls whether unserved slots trigger fail state. Rewrote to accurately reflect the two distinct conditions from the source code.

5. **Minor field description improvements:** Updated `cluster_slots_pfail` and `cluster_slots_fail` descriptions to use the standard PFAIL/FAIL terminology. Clarified that `cluster_known_nodes` includes nodes in HANDSHAKE state and that `cluster_size` counts primaries serving at least one slot.

## Review Notes
- The post does not mention per-message-type breakdown fields (e.g., `cluster_stats_messages_ping_sent`, `cluster_stats_messages_pong_received`) that conditionally appear in CLUSTER INFO output. This is acceptable for an introductory reference but could be expanded in the future.
- The shell script for health monitoring runs `redis-cli CLUSTER INFO` twice (once for state, once for fail slots). This works but could be optimized to call it once and parse both values from the cached output.
- The mermaid diagram's flow from the "No" branch of `cluster_slots_fail > 0` to `cluster_slots_pfail > 0` lacks an explicit "No" label, which could be confusing. This is a minor style issue, not a technical error.
