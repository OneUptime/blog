# Validation Summary: How to Fix Too Many PGs Per OSD Warning in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- Placement Groups (PGs) and OSDs
- PG Autoscaler module

## Sources Consulted
- Ceph official documentation on Placement Groups (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation on PG Autoscaler (https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups)
- Ceph Nautilus release notes for PG merging feature (https://docs.ceph.com/en/latest/releases/nautilus/)
- Ceph documentation on `mon_max_pg_per_osd` configuration (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph CLI reference for `ceph osd df`, `ceph osd pool` commands

## Issues Found

1. **Incorrect Ceph version for PG merging**: The post stated "`pg_num` can be decreased since Luminous." This is incorrect — PG merging (the ability to decrease `pg_num`) was introduced in **Nautilus (14.2.x)**, not Luminous. Luminous only supported increasing `pg_num`. Changed "Luminous" to "Nautilus (14.2.x)".

2. **Overstated per-PG memory consumption**: The post claimed "Each PG consumes approximately 10 MB of RAM per OSD." For modern BlueStore OSDs, per-PG memory overhead is typically a few megabytes, varying significantly with object count and configuration. 10 MB per PG is on the extreme high end and misleading as a general claim. Changed to "typically a few megabytes per PG per OSD, varying with object count."

3. **Fragile awk parsing of `ceph osd df` output**: The command `ceph osd df | awk 'NR>1 && NF>0 {print $1, "PGs:", $14}'` used column `$14` for PGs, but the actual column position varies across Ceph versions. Additionally, size values with units (e.g., "932 GiB") can split into multiple awk fields, making positional parsing unreliable. Replaced with plain `ceph osd df` and a note to check the PGS column.

4. **Deprecated command `ceph osd lspools`**: This command is deprecated in favor of `ceph osd pool ls`. Changed to the current command.

5. **Inconsistent PG-per-OSD recommendation**: The introduction said "between 100 and 250" while the summary said "100-200." The Ceph PG autoscaler targets approximately 100 PGs per OSD by default, and 100-200 is the more commonly cited recommendation. Changed the introduction to "between 100 and 200" for consistency.

## Review Notes
- The `watch ceph health` command in the "Verifying Resolution" section relies on `watch` being available inside the rook-ceph-tools container. This is typically the case, but could fail in minimal container images.
- The pool delete command syntax (`ceph osd pool delete unused-pool unused-pool --yes-i-really-really-mean-it`) is correct and includes the required double pool name and confirmation flag.
- The `ceph config set global mon_max_pg_per_osd 350` command is correct syntax for adjusting the warning threshold.
- All kubectl commands correctly target the `rook-ceph` namespace and the `rook-ceph-tools` deployment, which is the standard Rook toolbox pattern.
