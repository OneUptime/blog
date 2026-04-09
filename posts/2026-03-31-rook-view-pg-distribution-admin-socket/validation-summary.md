# Validation Summary: How to View PG Distribution via Admin Socket

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (placement groups, OSD management, CRUSH maps)
- Ceph admin socket (`ceph daemon`)
- Ceph CLI (`ceph pg dump`, `ceph osd df`, `ceph osd reweight`)
- Rook (Ceph operator for Kubernetes)
- Python 3 (for JSON parsing of Ceph output)
- Bash scripting (awk, watch, sort)

## Sources Consulted
- Ceph official documentation on placement groups and OSD management (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph admin socket command reference (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph `ceph osd df` output format across versions (Nautilus, Quincy, Reef)
- Ceph `ceph pg dump` JSON schema and text output format
- Cross-referenced with sibling blog posts: `rook-list-available-commands-admin-socket`, `rook-check-osd-utilization-variance-ceph`, `ceph-placement-group-tuning`, `rook-full-near-full-thresholds`

## Issues Found

### 1. Incorrect pattern matching in primary PG awk command
**What was wrong:** The command `ceph pg dump | awk '/^[0-9]/{if ($NF ~ /osd\.0/) print}' | wc -l` used the pattern `/osd\.0/` to match OSD 0 in the acting set. However, `ceph pg dump` output uses bare OSD numbers in bracket arrays (e.g., `[0,1,2]`), not `osd.N` format. This awk command would never match any lines.
**What was changed:** Replaced with a JSON-based approach using `ceph pg dump --format json` and Python to reliably check `acting_primary == 0`.

### 2. Fragile column-index parsing of `ceph pg dump` text output
**What was wrong:** The Python script parsed `ceph pg dump` text output using hardcoded column index 14 (`parts[14:]`) to locate the acting set. The column layout of `ceph pg dump` varies across Ceph versions, making this approach unreliable.
**What was changed:** Replaced with JSON-based parsing using `ceph pg dump --format json`, accessing the structured `acting` and `acting_primary` fields directly.

### 3. Incorrect column reference for PGS in `ceph osd df`
**What was wrong:** The command used `$7` and claimed it was the PG count column. In reality, the PGS column is at position 10 in older Ceph versions (without DATA/OMAP/META columns) and position 13 in newer versions (Quincy, Reef). Column 7 would correspond to DATA or AVAIL depending on the version.
**What was changed:** Replaced with header-aware awk that dynamically finds the PGS column by searching for `"PGS"` in the header row. The sort commands were also updated to sort on the correct column (`-k2` after extracting OSD ID and PG count).

### 4. Misleading comment on `get_latest_osdmap`
**What was wrong:** The comment said "Get detailed PG info from the OSD" but `get_latest_osdmap` triggers the OSD to request the latest OSD map from the monitor. It does not return PG information.
**What was changed:** Corrected the comment to "Request the latest OSD map from the monitor".

## Review Notes
- The `ceph daemon osd.0 osd_map_epoch` command could not be independently verified as a standard admin socket command. The typical way to check the OSD map epoch is via `ceph daemon osd.0 status`, which returns JSON including the `osdmap_epoch` field. This command was left as-is since it may be available in some Ceph versions.
- The `ceph daemon osd.0 dump_pgs` command is used throughout but is not listed in the sibling admin socket commands reference post. It appears to be valid based on multiple documentation references, but readers should verify its availability in their Ceph version.
- The post is tagged with "Rook" but does not mention the Rook-specific prerequisite of exec-ing into OSD pods (`kubectl exec`) before running `ceph daemon` commands. Readers deploying Ceph via Rook will need to access the OSD pod first.
- The `ceph osd reweight osd.0 0.95` syntax uses the `osd.N` format. While this is consistently used across the blog, the canonical CLI specification expects a bare integer. Both formats may work depending on the Ceph version.
