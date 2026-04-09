# Validation Summary: How to Fix OLD_CRUSH_TUNABLES Health Warnings

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH (Controlled Replication Under Scalable Hashing) map and tunables
- Rook (Kubernetes operator for Ceph)
- crushtool (offline CRUSH map testing utility)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph CRUSH Map Editing documentation: https://docs.ceph.com/en/reef/rados/operations/crush-map-edits/
- Ceph Control Commands documentation: https://docs.ceph.com/en/latest/rados/operations/control/
- ceph(8) man page: https://docs.ceph.com/en/reef/man/8/ceph/
- crushtool(8) man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- Ceph source code (CrushWrapper.h): https://github.com/ceph/ceph/blob/main/src/crush/CrushWrapper.h
- Ceph source code (mon.yaml.in): https://github.com/ceph/ceph/blob/main/src/common/options/mon.yaml.in
- Ceph PR #27568 (changed default mon_crush_min_required_version to hammer): https://github.com/ceph/ceph/pull/27568

## Issues Found

1. **Incorrect default for `mon_crush_min_required_version`** (line 44): The post stated the default is "typically 'firefly' or higher." Since Nautilus (PR #27568), the default is `hammer`. Fixed to: "Default is 'hammer' in modern Ceph versions (Nautilus and later)."

2. **Misleading tunable profile ordering and descriptions** (lines 60-69): The post listed `hammer` as "For Hammer-era clients" and `jewel` as "For maximum compatibility (still resolves most warnings)." This is backwards — `hammer` is older and more compatible than `jewel`. Since the default warning threshold is `hammer`, using the `hammer` profile provides maximum compatibility while still resolving the default warning. Fixed the ordering to: `optimal` (modern clients) > `jewel` (Jewel-era clients) > `hammer` (maximum compatibility).

3. **"Estimating Data Movement" section applied changes to live cluster without revert step** (lines 104-119): The section was titled "Before applying, estimate how many PGs will be remapped" but the code actually applied `ceph osd crush tunables optimal` to the live cluster to obtain the new CRUSH map, with only a vague comment "(revert first if needed)." Fixed to include an explicit revert step using `ceph osd setcrushmap -i crush-old.bin` immediately after exporting the new map, and clarified comments.

4. **Non-recommended warning suppression method** (lines 125-129): The post suggested setting `mon_crush_min_required_version` to `argonaut` to suppress the warning. While technically functional, this lowers important compatibility guardrails. The recommended approach per Ceph documentation is to set `mon_warn_on_legacy_crush_tunables` to `false`. Fixed to use the recommended method.

## Review Notes
- All Ceph CLI commands (`ceph osd crush show-tunables`, `ceph osd getcrushmap -o`, `ceph features`, `ceph osd set norebalance/norecover`, `crushtool --test`) are valid and correctly documented.
- The `optimal` tunable profile currently maps to jewel-era tunables plus `straw_calc_version=1`, as stated in the source code (`CrushWrapper.h`). The blog's claim that it "enables all CRUSH improvements through the Jewel release" is accurate.
- The `crushtool` test syntax with `--rule 0 --num-rep 3 --min-x 0 --max-x 10000 --show-mappings` is valid per the crushtool(8) man page.
- The maintenance script approach (set norebalance/norecover, apply tunables, then unset flags) is a well-established production best practice.
- The post mentions Rook in the tags but does not include any Rook-specific commands or configuration. This is acceptable since the CRUSH tunable fix is the same whether Ceph is deployed via Rook or standalone, but users may need to exec into the Rook toolbox pod to run these commands.
