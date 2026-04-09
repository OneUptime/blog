# Validation Summary: How to Compare Erasure Coding Space Savings vs Replication in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Erasure coding (Reed-Solomon style data protection)
- Ceph CLI tools (`ceph df`, `ceph osd pool`)
- Python 3 (one-liner calculations)

## Sources Consulted
- Ceph official documentation on erasure coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph official documentation on pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph df detail` and `ceph osd pool` commands: https://docs.ceph.com/en/latest/man/8/ceph/
- Erasure coding math fundamentals (Reed-Solomon coding theory)

## Issues Found
No technical issues found.

All erasure coding formulas are correct: overhead factor = (k + m) / k, usable ratio = k / (k + m). Every entry in the EC profile table was verified mathematically. The real-world capacity calculations are accurate. Ceph CLI commands are valid and correctly described. The fault tolerance comparison between k=4,m=2 EC (tolerates 2 failures) and 3x replication (tolerates 2 OSD failures without data loss) is correct. The guidance on when to use EC vs replication is sound and aligns with Ceph best practices.

## Review Notes
- The overhead factor for k=6,m=2 is shown as 1.33x (rounded from 1.3333...). The video archive example uses this rounded value, yielding 665 TB instead of the precise 666.7 TB. This is acceptable rounding for a blog post and the calculations are internally consistent.
- The post correctly notes that RBD workloads are better suited to replicated pools due to partial write patterns, though it's worth noting that Ceph does support EC pools as the data pool for RBD (since Luminous) using a replicated metadata pool. The post's recommendation remains sound guidance for most use cases.
- The `ceph osd pool stats` command output description could be more detailed about which fields to examine, but what's stated is accurate.
