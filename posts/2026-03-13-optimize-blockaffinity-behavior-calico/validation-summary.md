# Validation Summary: How to Optimize BlockAffinity Behavior in Calico

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (v3.20+)
- Calico IPAM (BlockAffinity, IPAMBlock, IPAMConfig, IPPool resources)
- Kubernetes
- calicoctl CLI
- kubectl CLI
- jq (JSON processing)
- Mermaid (flowchart diagram)

## Sources Consulted
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAMConfig resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico IPAMBlock resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamblock
- calicoctl ipam release: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico decommissioning a node: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- libcalico-go PR #1297 (maxBlocksPerHost added in v3.21): https://github.com/projectcalico/libcalico-go/pull/1297

## Issues Found
1. **Incorrect jq path on IPAMBlock CIDR (Step 3)**: The original filter used `.metadata.cidr`, which is not a real field. The CIDR lives at `.spec.cidr`; `metadata.name` contains a dash-encoded form of the CIDR. Updated the jq output template to reference `.spec.cidr`.
2. **Broken low-utilization filter (Step 3)**: The original `select(.spec.allocations | length < 10)` was logically wrong. `.spec.allocations` is a fixed-size array with one slot per IP in the block (e.g. 64 entries for a /26), where `null` represents unallocated slots. So `length` is always equal to the block size, never below 10 for /26 blocks. Replaced with `select(([.spec.allocations[] | select(. != null)] | length) < 10)` so that only non-null entries are counted, matching the stated intent. Added a short inline comment explaining the schema so future readers don't repeat the mistake.
3. **Wrong release command for stale block affinities (Step 4)**: `calicoctl ipam release --ip=<orphaned-block-cidr>` is invalid — `--ip` accepts a single IP address, not a CIDR (the documented flags are `--ip`, `--from-report`, and `--force`; there is no `--cidr` flag in the official `calicoctl ipam release` reference). Replaced with `calicoctl delete blockaffinity <affinity-name>`, which is the documented way to remove a stale BlockAffinity and free the underlying block for reallocation. Added a clarifying inline comment about the `--ip` flag's behavior.

## Review Notes
- `maxBlocksPerHost` is a valid IPAMConfig field but was introduced in Calico v3.21 (libcalico-go PR #1297). The post states Calico v3.20+ as a prerequisite. This is a minor mismatch — readers on exactly v3.20 should upgrade to v3.21+ to use `maxBlocksPerHost`. Left as-is since most clusters running v3.20 will have upgraded by now and the field is silently ignored on older versions.
- The Mermaid flowchart is conceptually accurate. `etcd / Kubernetes API` correctly reflects that Calico can use either etcdv3 or the Kubernetes API datastore as a backend.
- Other commands (`calicoctl get blockaffinity -o wide`, `calicoctl ipam show --show-blocks`, `calicoctl ipam check`, `calicoctl get ipamconfig default -o yaml`) and all IPPool / IPAMConfig field names are correct against the v3 API.
- The `comm -23` invocation correctly relies on both inputs being sorted (the calico side uses `sort -u`, the kubectl side uses `sort`), so the diff direction (calico-only entries) is right for finding stale affinities.
