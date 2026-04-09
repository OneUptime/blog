# Validation Summary: How to Map PGs to OSDs with ceph pg map

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- Ceph (Placement Groups, OSDs, CRUSH algorithm)
- Rook (Kubernetes Ceph operator)
- kubectl (Kubernetes CLI)
- crushtool (CRUSH map testing utility)

## Sources Consulted
- Ceph man page (`ceph.rst`): https://github.com/ceph/ceph/blob/main/doc/man/8/ceph.rst
- Ceph Monitoring OSDs and PGs docs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph control commands docs: https://docs.ceph.com/en/latest/rados/operations/control/
- crushtool man page: https://github.com/ceph/ceph/blob/main/doc/man/8/crushtool.rst
- Ceph PGMap.cc source (column layout verification): https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc

## Issues Found
- **`ceph pg dump` awk column number was wrong**: The post used `$16` to extract the acting set from `ceph pg dump` output. In current Ceph versions (Quincy, Reef, Squid), columns like OMAP_BYTES, OMAP_KEYS, and LOG_DUPS were added in later releases, shifting the acting set to column `$19`. Changed `$16` to `$19`.

## Review Notes
- The `ceph pg dump` awk column approach is inherently fragile across Ceph versions. A more robust alternative would be `ceph pg dump --format json | jq`, but this is a common pattern in Ceph tutorials and works correctly for current releases with the fixed column number.
- `ceph osd lspools` (used in the performance diagnostics section) is not formally deprecated but `ceph osd pool ls` is the more modern equivalent preferred in current documentation.
- The `crushtool` example assumes a compiled CRUSH map already exists at `/tmp/crushmap`. Users would first need to extract it with `ceph osd getcrushmap -o /tmp/crushmap`. This is not an error but could be a helpful addition in a future revision.
