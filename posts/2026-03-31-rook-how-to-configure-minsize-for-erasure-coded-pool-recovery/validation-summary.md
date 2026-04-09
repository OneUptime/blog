# Validation Summary: How to Configure min_size for Erasure Coded Pool Recovery

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (erasure coded pools, min_size parameter, PG management)
- Rook (Ceph operator for Kubernetes)
- Erasure coding (k+m profiles, data/parity shards)

## Sources Consulted
- Ceph official documentation on erasure coded pools and pool parameters (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph documentation on pool operations (`ceph osd pool set/get`) (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph documentation on PG repair and recovery (https://docs.ceph.com/en/latest/rados/operations/pg-repair/)
- Ceph stretch cluster documentation (https://docs.ceph.com/en/latest/rados/operations/stretch-mode/)
- Other Ceph/Rook posts in this repository for cross-reference

## Issues Found

1. **EC pool `size` cannot be set manually** (Recommended min_size Values section): The post included `ceph osd pool set my-ec-pool size N` commands for EC pools. EC pool `size` is automatically determined by the erasure code profile (k+m) and cannot be changed via `ceph osd pool set`. These commands would fail. Fixed by removing the `size` commands and changing them to comments indicating the size is set by the profile.

2. **Misleading safety table wording** (Understanding the Safety Implications section): The row for min_size=4 said "0 parity, recoverable." This is misleading because the remaining 4 shards could include parity shards — the actual issue is that there is zero fault tolerance margin (any k shards out of k+m can reconstruct data). Changed to "no fault tolerance margin."

3. **Inaccurate shard breakdown in recovery scenario** (min_size During Recovery Scenarios section): The post stated the acting set after one OSD failure would be "4 data + 1 parity." This is only true if the failed OSD held a parity shard. If a data OSD failed, the remaining would be 3 data + 2 parity. Fixed to use the more accurate description "5 of the 6 data+parity shards."

4. **Incorrect use of `ceph pg repair`** (Temporarily Lowering min_size section): The post used `ceph pg repair <pgid>` with the comment "Force PGs to become active." `ceph pg repair` is a data integrity operation that fixes inconsistencies found during scrub — it does not force PGs into an active state. After lowering min_size, PGs that now meet the threshold automatically transition to active. Replaced with a status check command and appropriate comment.

## Review Notes
- The stretch cluster section claims min_size is "Often set to 1." While this can vary by deployment, other posts in this repository show min_size=2 for stretch clusters (with size=4). The value of 1 is possible but aggressive; it depends on the specific configuration. Left as-is since it's presented as a general observation with hedging ("Often"), but readers should verify against their specific stretch cluster setup.
- The emergency recovery section suggests lowering min_size below k (to 3 for a 4+2 pool). In modern Ceph versions, this may require the `--yes-i-really-mean-it` flag since Ceph enforces min_size >= k as a safety floor for EC pools. The post already warns this is risky, but could mention the required flag.
- The post focuses on write operations but min_size also affects read availability in degraded states. This is a minor omission that doesn't affect correctness.
