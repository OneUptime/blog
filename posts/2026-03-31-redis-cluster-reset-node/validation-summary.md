# Validation Summary: How to Use CLUSTER RESET in Redis to Reset a Node

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Redis Cluster
- CLUSTER RESET command (SOFT and HARD variants)
- CLUSTER MEET, CLUSTER REPLICATE, CLUSTER INFO commands
- redis-cli

## Sources Consulted
- Redis official documentation for CLUSTER RESET: https://redis.io/docs/latest/commands/cluster-reset/
- Redis source code (`src/cluster.c` — `clusterReset` function and command handler) for behavioral verification
- Redis official documentation for CLUSTER INFO: https://redis.io/docs/latest/commands/cluster-info/

## Issues Found

### 1. Incorrect restriction condition and error message (Restrictions section)
- **What was wrong:** The post stated that `CLUSTER RESET` cannot be issued on a primary node that "has assigned slots and has replicas" with the error `"ERR master still has attached slaves"`.
- **What was changed:** Corrected to state that `CLUSTER RESET` cannot be issued on a master node that contains keys, with the actual error message `"ERR CLUSTER RESET can't be called with master nodes containing keys"`. Updated the remediation advice from "Disconnect replicas first" to "Run FLUSHALL first to empty the database."
- **Why:** The Redis source code checks `dictSize(c->db->dict) != 0` for master nodes — it checks for non-empty databases, not for replicas or slot assignments. The error message in the blog was fabricated and does not match any Redis error string.

### 2. Incorrect data flushing behavior (SOFT vs HARD differentiation)
- **What was wrong:** The post claimed SOFT reset "retains data" while HARD reset "flushes all data (equivalent to FLUSHALL)." This incorrectly presented data flushing as the key difference between SOFT and HARD modes.
- **What was changed:** Corrected both SOFT and HARD effect lists to clarify that both modes flush data when the node is a replica (converting it to an empty master), and both modes require the master database to be empty. Updated the Syntax section descriptions, the mermaid diagram, and the Summary section accordingly.
- **Why:** Per the Redis source code, `emptyData()` is called for replica nodes in both SOFT and HARD modes (outside the `if (hard)` block). The actual differences between SOFT and HARD are: HARD generates a new node ID and resets currentEpoch/configEpoch to 0.

### 3. Missing epoch reset information (HARD reset effects)
- **What was wrong:** The HARD reset effects list did not mention that currentEpoch and configEpoch are reset to 0.
- **What was changed:** Added "The currentEpoch and configEpoch are reset to 0" to the HARD reset effects and "The currentEpoch and configEpoch are preserved" to the SOFT reset effects.
- **Why:** Epoch reset is one of the key behavioral differences between SOFT and HARD modes, documented in the official Redis docs and confirmed in source code.

### 4. Misleading mermaid diagram
- **What was wrong:** The SOFT flow path ended with "New node ID generated only for HARD" (confusing placement in the SOFT diagram). The HARD flow showed "Flush all data" as a HARD-specific step, which is inaccurate.
- **What was changed:** Rebuilt both flows to accurately represent the shared behavior (replica data flush) and HARD-specific behavior (new node ID, epoch reset).
- **Why:** The diagram should accurately reflect the command's behavior per the official documentation.

### 5. Unused variable in bash workflow
- **What was wrong:** Step 3 computed `NEW_NODE_ID` (the reset node's ID) but then used `<primary-id>` placeholder for `CLUSTER REPLICATE`. The variable was never used and its name was misleading — `CLUSTER REPLICATE` requires the primary's node ID, not the new node's ID.
- **What was changed:** Replaced with `PRIMARY_ID=$(redis-cli -h 192.168.1.10 -p 7001 CLUSTER MYID)` and used `$PRIMARY_ID` in the `CLUSTER REPLICATE` command.
- **Why:** The workflow should demonstrate a complete, functional script. `CLUSTER MYID` retrieves the node ID of the intended primary, which is what `CLUSTER REPLICATE` requires.

## Review Notes
- The post could benefit from noting that `CLUSTER RESET` on a replica node always flushes data regardless of SOFT/HARD mode — this is a common source of confusion for operators.
- The `CLUSTER INFO` output after reset showing `cluster_state:ok` is correct because the node has no slot responsibility, so it considers itself healthy. This could be briefly clarified for readers unfamiliar with cluster state semantics.
- The "Convert cluster node back to standalone" use case correctly notes removing `cluster-enabled yes` from `redis.conf`, but could mention that a restart is required for this config change to take effect (it does mention "and restart" which is correct).
