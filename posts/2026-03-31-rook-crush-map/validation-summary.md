# Validation Summary: How to Configure Ceph CRUSH Map in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH map, OSD management, pool configuration)
- Rook (CephBlockPool CRD, rook-ceph-tools deployment)
- Kubernetes (kubectl exec, YAML CRD manifests)
- crushtool (CRUSH map decompilation)

## Sources Consulted
- Ceph source code `src/mon/MonCommands.h` (command syntax definitions for `osd crush rule create-replicated`, `osd crush rule create-erasure`, `osd reweight-by-utilization`) — https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph source code `src/mgr/MgrCommands.h` (Mgr command definitions for `osd reweight-by-utilization`) — https://github.com/ceph/ceph/blob/main/src/mgr/MgrCommands.h
- Ceph source code `src/osd/OSDMap.cc` (default CRUSH bucket type definitions, lines 4922–4933) — https://github.com/ceph/ceph/blob/main/src/osd/OSDMap.cc
- Rook CephBlockPool CRD documentation — https://rook.github.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found

### 1. Incorrect `ceph osd crush rule create-erasure` syntax
**What was wrong:** The command `ceph osd crush rule create-erasure hdd-erasure default hdd` used the same argument pattern as `create-replicated` (name, root, device-class). However, `create-erasure` only accepts `<name> [<profile>]` where `<profile>` is an erasure code profile name. The extra argument "hdd" would cause a command parsing error.
**What was changed:** Replaced with a two-step approach: first create an erasure code profile with `crush-device-class=hdd` via `ceph osd erasure-code-profile set`, then create the erasure rule referencing that profile.
**Why:** Confirmed via `MonCommands.h` — `create-erasure` signature is `name=name,type=CephString` and `name=profile,type=CephString,req=false`. Device class restrictions for erasure coded pools must be set in the erasure code profile, not in the rule creation command.

### 2. Missing `ceph osd crush move datacenter root=default` in zone-aware topology section
**What was wrong:** The datacenter bucket was created with `ceph osd crush add-bucket datacenter datacenter` and zones were moved under it, but the datacenter was never placed under the CRUSH root. This would leave the entire datacenter sub-hierarchy orphaned and unreachable for data placement.
**What was changed:** Added `ceph osd crush move datacenter root=default` after moving zones under the datacenter.
**Why:** CRUSH buckets must be connected to the root hierarchy to participate in data placement. An orphaned bucket and its children will not receive any data.

### 3. Incorrect description for `ceph osd reweight-by-utilization`
**What was wrong:** The comment said "Reweight all OSDs based on actual disk size" but the command actually reweights OSDs based on current utilization (usage patterns), not disk size. The official description from `MgrCommands.h` is "reweight OSDs by utilization."
**What was changed:** Updated the comment to "Reweight OSDs to balance utilization across the cluster."
**Why:** `ceph osd reweight-by-utilization` adjusts OSD reweight values (0.0–1.0) to shift data away from overutilized OSDs toward underutilized ones. It is not related to disk size. CRUSH weight (set via `ceph osd crush reweight`) is the one that corresponds to disk size in TiB.

### 4. Misleading comment for `ceph osd map` command
**What was wrong:** The comment said "Show where PG 1.0 would be placed" but the command `ceph osd map replicapool myobject` maps an object name to its PG and OSD set — it doesn't specifically show "PG 1.0."
**What was changed:** Updated the comment to "Show which PG and OSDs an object maps to."
**Why:** The command takes a pool name and object name, and returns the PG hash and OSD mapping for that specific object. The comment should accurately describe the command's behavior.

## Review Notes
- The `ceph osd crush reweight` command correctly notes that weight is "in TiB" — this aligns with Ceph convention where CRUSH weight 1.0 = 1 TiB of storage capacity.
- The Rook CephBlockPool CRD usage of `spec.deviceClass` and `spec.parameters.crush_rule` is correct per Rook documentation.
- The `ceph osd crush add-bucket` and `ceph osd crush move` commands all use correct syntax.
- "zone" is confirmed as a standard predefined CRUSH bucket type (type ID 9) in Ceph's default type hierarchy, as defined in `OSDMap.cc`.
- The `ceph osd crush rule create-replicated ssd-replicated default host ssd` command uses the correct 4-argument syntax (name, root, failure-domain-type, device-class).
- The post uses `rook-ceph` namespace and `deploy/rook-ceph-tools` consistently, which is the standard Rook toolbox deployment pattern.
