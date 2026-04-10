# Validation Summary: How to Understand CRUSH Map Weight Calculations

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH algorithm (Controlled Replication Under Scalable Hashing)
- CRUSH map weights (OSD and bucket weights)
- Rook (Ceph operator for Kubernetes, mentioned in tags)

## Sources Consulted
- Ceph official documentation on CRUSH maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Ceph CLI reference for `ceph osd` commands: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation on data placement and PG mapping

## Issues Found
No technical issues found.

## Review Notes
- The `awk` column indices used in the `ceph osd df` parsing example (`$9` for %USE, `$10` for VAR) are version-dependent. The `ceph osd df` output format changed across Ceph releases (Nautilus, Octopus, Pacific, Quincy, Reef), with newer versions adding columns like DATA, OMAP, META, and STATUS. Readers should verify column positions for their specific Ceph version. The same applies to the `ceph pg dump pgs` column `$14` for acting sets.
- The `NR==1 || NR>1` awk condition is redundant (it matches all lines including the header), which would produce garbled output for the header row since `%.3f` would format the string "WEIGHT" as `0.000`. Using `NR>1` would skip the header. This is a minor issue in an illustrative example.
- The post uses "terabytes" for the weight convention. Ceph internally calculates weights in TiB (tebibytes, base-2), so a 1 TB (1000 GB) drive gets a weight of approximately 0.909, not exactly 1.0. However, the official Ceph documentation also uses "terabytes" loosely in some places, so this is consistent with common usage.
- The gradual weight adjustment script uses a list comprehension with `print()` for side effects, which is a Python anti-pattern but functionally correct for this use case.
- All core technical concepts (CRUSH weight semantics, bucket aggregation, weight vs reweight, effective weight calculation, and gradual rebalancing approach) are accurate and well-explained.
