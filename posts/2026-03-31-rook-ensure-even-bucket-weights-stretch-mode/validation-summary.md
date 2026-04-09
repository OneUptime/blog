# Validation Summary: How to Ensure Even Bucket Weights in Stretch Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CRUSH map, OSD management, balancer module, stretch mode)
- Rook (Ceph orchestration on Kubernetes)
- Ceph CLI (`ceph osd`, `ceph balancer`, `ceph orch`)

## Sources Consulted
- Ceph Balancer Module documentation — https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph Control Commands documentation — https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph CRUSH Maps documentation — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph Monitoring a Cluster documentation — https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph source code (OSD.cc) for CRUSH weight unit definition — https://github.com/ceph/ceph/blob/main/src/osd/OSD.cc

## Issues Found

1. **TB/TiB conflation in CRUSH weight comment (line 46)**: The comment said "2TB = 2.0" but CRUSH weights are measured in TiB (tebibytes), not TB (terabytes). A drive marketed as 2 TB is approximately 1.82 TiB. Fixed the comment to say "2 TiB drive = 2.0" to accurately reflect the unit.

2. **Broken awk command for checking %USE (lines 103-105)**: The command `ceph osd df | awk '{print $1, $7}' | sort -k2 -n` was intended to extract OSD ID and %USE, but `ceph osd df` output includes unit suffixes (e.g., "3.6 TiB") that count as separate awk fields, making $7 the numeric part of RAW USE rather than %USE. Replaced with plain `ceph osd df` and added a JSON-based alternative for reliable scripted parsing.

3. **TB/TiB conflation in drive size example comments (lines 82, 88)**: Comments said "4 x 4TB = 16TB" and "8 x 2TB = 16TB" but since CRUSH weights are in TiB, changed to "4 x 4 TiB = 16 TiB" and "8 x 2 TiB = 16 TiB" for consistency.

## Review Notes
- `ceph osd reweight-by-utilization` adjusts the OSD reweight value (0.0–1.0 range), not the CRUSH weight. The post's description ("normalize based on actual usage") is accurate for what the command does, but readers should understand this is a different mechanism than `ceph osd crush reweight`. The post could benefit from a brief clarification in a future revision.
- The Python script for checking site-level weights filters for `type == 'datacenter'`. This works for common stretch mode setups but won't match clusters using custom CRUSH types (e.g., `zone` or `region`) for site buckets.
- `ceph balancer show <plan>` was verified as a valid command that shows plan contents (proposed PG movements), distinct from `ceph balancer eval <plan>` which calculates quality scores. The usage in the post is correct.
- The `ceph osd df | sort -k3 -n` command earlier in the post is fine because the WEIGHT column is a bare number without unit suffixes.
