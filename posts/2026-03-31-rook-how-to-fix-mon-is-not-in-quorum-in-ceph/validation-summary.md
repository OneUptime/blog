# Validation Summary: How to Fix 'mon is not in quorum' in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (monitor subsystem, Paxos consensus, monmap)
- Rook-Ceph operator (Kubernetes)
- kubectl CLI
- monmaptool / ceph-mon utilities

## Sources Consulted
- [Ceph Troubleshooting Monitors](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/) — official procedure for monitor recovery
- [Ceph Adding/Removing Monitors](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/) — `ceph mon remove` syntax and monmap manipulation
- [Ceph monmaptool man page](https://docs.ceph.com/en/latest/man/8/monmaptool/) — monmap extraction/injection commands
- [Ceph Monitoring a Cluster](https://docs.ceph.com/en/reef/rados/operations/monitoring/) — `ceph mon stat` and `ceph quorum_status` output formats
- [Ceph MonCommands.h (GitHub)](https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h) — verified available mon CLI commands

## Issues Found

### 1. Fabricated `ceph mon stat` output format (Step 1)
- **What was wrong:** The example output showed `leader a, quorum a,b out of quorum: c`. The real `ceph mon stat` output does not include an "out of quorum" field. It only lists monitors that ARE in quorum (e.g., `quorum 0,1 a,b`), using both rank numbers and names. The v1 address was also missing from the monmap entries.
- **What was changed:** Corrected the output to `quorum 0,1 a,b` with both v1 and v2 addresses, and added a note explaining that the missing mon is inferred by its absence from the quorum list.

### 2. Non-existent `ceph mon force-quorum` command (Step 7)
- **What was wrong:** The command `ceph mon force-quorum <mon-id>` does not exist in any version of Ceph. This was a fabricated command.
- **What was changed:** Replaced with the correct emergency monmap manipulation procedure: extract the monmap with `ceph-mon --extract-monmap`, remove dead monitors with `monmaptool --rm`, and inject the modified monmap with `ceph-mon --inject-monmap`. Added instructions to restart the pod afterward.

### 3. Incorrect `ceph mon stat` output in Step 8
- **What was wrong:** The verification output used `leader a, quorum a,b,c` which doesn't match the real format.
- **What was changed:** Corrected to `quorum 0,1,2 a,b,c` to match the actual output format.

## Review Notes
- The overall structure and troubleshooting approach of the post is sound and follows a logical escalation from diagnosis to recovery.
- The `auth: failed to find entity client.mon` error message in Step 2 is somewhat unusual — monitor entities authenticate as `mon.<id>`, not `client.mon`. However, this could appear in certain misconfiguration scenarios, so it was left as-is.
- The post's description mentions "monmap manipulation" but the original Step 7 did not actually use monmap manipulation. The fix now aligns the content with the description.
- In a Rook context, the emergency monmap procedure in Step 7 requires careful handling since the mon process is running inside a container. Users may need to stop the mon process within the container before extracting/injecting the monmap. The post could benefit from a note about this in a future update.
