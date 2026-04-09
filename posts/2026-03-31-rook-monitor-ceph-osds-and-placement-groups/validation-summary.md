# Validation Summary: How to Monitor Ceph OSDs and Placement Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph OSDs (Object Storage Daemons)
- Ceph Placement Groups (PGs)
- kubectl (Kubernetes CLI)
- Ceph CLI tools (ceph osd, ceph pg)

## Sources Consulted
- Ceph official documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph official documentation: Placement Group concepts (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation: ceph osd perf (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook documentation: Ceph toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
1. **Mismatched description for `ceph pg ls-by-osd` command**: The section text said "Check PGs in a specific state:" but the command `ceph pg ls-by-osd 0` lists PGs mapped to a specific OSD, not PGs in a specific state. The command for listing PGs by state would be `ceph pg ls-by-state <state>`. Fixed the description to "List PGs on a specific OSD:" to accurately match the command.

## Review Notes
- The variance threshold guidance ("above 10-15%") for `ceph osd df` is reasonable but slightly imprecise. The VAR column in `ceph osd df` output is a ratio where 1.0 is average, so a variance of 1.10-1.15 corresponds to 10-15% deviation. The current wording is understandable in context.
- The 50ms latency threshold for `ceph osd perf` is a reasonable general guideline, though actual thresholds vary by workload and storage media (NVMe vs HDD).
- The `ceph pg dump stuck` command works, though the canonical form in newer Ceph versions is `ceph pg dump_stuck`. Both forms are accepted by the CLI parser.
- All kubectl exec patterns correctly use `deploy/rook-ceph-tools` which is the standard Rook toolbox deployment name.
