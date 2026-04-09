# Validation Summary: How to Choose K and M Values for Erasure Coding Profiles in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (erasure coding profiles, OSD recovery, CRUSH failure domains)
- Rook (CephBlockPool CRD with erasureCoded spec)
- Kubernetes (Rook operator deployment context)

## Sources Consulted
- Ceph official documentation on erasure code profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph documentation on erasure code pool creation and CRUSH rules (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Rook documentation on CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Mathematical verification of all storage overhead and efficiency calculations

## Issues Found

### 1. Incorrect raw capacity (TiB-to-PiB conversion error)
- **What was wrong:** The practical example stated "1.44 PiB raw" for 1440 TiB, but 1440 TiB / 1024 = 1.41 PiB, not 1.44 PiB. The author divided by 1000 instead of 1024.
- **What was changed:** Replaced "1.44 PiB raw" with "1440 TiB raw" to avoid the incorrect unit conversion entirely.

### 2. Practical example used three profiles with identical efficiency ratios
- **What was wrong:** The profiles k=4,m=2; k=6,m=3; and k=8,m=4 all have the same 2:1 k:m ratio, giving identical 66.7% storage efficiency. The listed usable capacities (960 TiB, 1.08 PiB, 1.04 PiB) were mathematically incorrect — all three should yield 960 TiB. The different capacity values appear to have been calculated as if k=6,m=2 and k=8,m=3 were the profiles.
- **What was changed:** Replaced the profiles with k=4,m=2 (66.7%, 960 TiB), k=6,m=2 (75.0%, 1080 TiB), and k=8,m=3 (72.7%, 1047 TiB) — profiles that actually demonstrate different efficiency/tolerance trade-offs on a 12-node cluster. Updated the concluding sentence to match.

### 3. Concluding sentence after practical example was incorrect
- **What was wrong:** Stated "The k=6, m=3 profile offers the most usable capacity" — but k=6,m=3 has the same efficiency as k=4,m=2 (both 66.7%).
- **What was changed:** Updated to accurately describe the corrected profiles: k=6,m=2 offers the most capacity; k=8,m=3 provides 3-node fault tolerance at slightly lower capacity.

## Review Notes
- The Rook CephBlockPool YAML example is minimal and correct for demonstrating how to set dataChunks and codingChunks. In production, erasure-coded block pools typically also require a replicated metadata pool configuration. This is outside the scope of the article (which focuses on choosing k and m values) but could be noted in a future update.
- The definitions, formulas, minimum OSD requirements, efficiency table, and recovery impact explanations are all technically accurate.
- The claim that m=2 is "equivalent to 3-way replication's fault tolerance" is correct (both tolerate 2 simultaneous failures).
- The summary claim of "half the storage cost" for k=4,m=2 vs 3-way replication is accurate (1.5x overhead vs 3x overhead).
