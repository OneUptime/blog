# Validation Summary: How to Evaluate SSDs for Ceph WAL and DB

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph BlueStore (WAL and RocksDB DB partitions)
- RocksDB (LSM-tree compaction, write amplification)
- NVMe / SATA SSDs (enterprise and consumer categories)
- fio (flexible I/O tester for benchmarking)
- nvme-cli (NVMe SMART health monitoring)
- gdisk (GPT partitioning)
- bash / bc (calculation scripting)

## Sources Consulted
- fio documentation on `--runtime` vs `--time_based` behavior: without `--time_based`, fio stops after `--size` bytes are written even if `--runtime` has not elapsed
- gdisk interactive prompt sequence: partition number, first sector, last sector, hex code; `w` requires `Y` confirmation
- Micron 9300 product line: 9300 Pro (1 DWPD, read-optimized), 9300 MAX (3 DWPD, write-intensive)
- Samsung PM9A3 datasheet: available in 1 DWPD and 3 DWPD variants
- Intel Optane P5800X specifications: 100 DWPD, highest endurance class
- Ceph BlueStore documentation on WAL/DB sizing recommendations
- NVMe specification for SMART/Health Information Log (Percentage Used field)

## Issues Found
1. **fio commands missing `--time_based` flag**: Both fio benchmark commands used `--runtime=60` with `--size=10g` but omitted `--time_based`. Without this flag, fio stops after writing 10 GB (which takes only a few seconds on NVMe), not after 60 seconds. Added `--time_based` to both commands.

2. **gdisk heredoc had extra blank lines**: Each partition creation block had two blank lines between the partition number and the size, but gdisk only expects one blank (for the default first sector). The extra blank would be consumed as the last sector default (using all remaining space), causing the subsequent size input to be misinterpreted. Removed the extra blank lines.

3. **gdisk heredoc missing `Y` confirmation**: The `w` (write) command in gdisk prompts for "Do you want to proceed? (Y/N):" confirmation. The heredoc was missing this, which would cause the script to hang or fail. Added `Y` after `w`.

4. **Micron 9300 model variant incorrect**: The post listed "Micron 9300" under Write-Intensive NVMe and "Micron 9300 Pro" in heavy_load recommendations. The 9300 Pro is the read-optimized (1 DWPD) model. The write-intensive variant is the Micron 9300 MAX (3 DWPD). Changed both references to "Micron 9300 MAX".

## Review Notes
- Intel has discontinued the Optane product line, including the P5800X. While it remains a valid reference point for write-intensive endurance, readers should be aware it is no longer in production. No change made since the post doesn't claim current availability.
- The `nvme smart-log --output-format=json` field name `percentage_used` is correct for nvme-cli 1.x. In nvme-cli 2.x, the JSON field naming may differ. The post doesn't specify a version, so this is acceptable but version-sensitive.
- The Step 1 calculation yields ~58 TB/day of metadata writes (assuming 100% sustained write load), while Step 2 uses a separate example value of 2.5 TB/day. This disconnect is intentional (Step 2 is a standalone example), but could confuse readers who expect the values to carry forward.
- The Samsung PM9A3 appears in both the "Write-Intensive NVMe" category (now clarified as "3 DWPD" variant) and the "moderate_load" recommendation. This is valid since the PM9A3 comes in different endurance tiers, but could benefit from explicit variant callout in the moderate_load section as well.
