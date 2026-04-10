# Validation Summary: How to Configure Primary OSD Selection and Primary Affinity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Ceph OSD (Object Storage Daemon)
- Ceph CRUSH map and primary affinity
- Ceph balancer module (read balancing)
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation: monitoring OSD and PG output (`monitoring-osd-pg.rst`) — confirms `ceph osd tree` includes `PRI-AFF` column
- Ceph man page (`ceph.rst`) — confirms `ceph osd primary-affinity <osdname (id|osd.id)> <float>` syntax accepts both `osd.N` and bare numeric IDs
- Ceph source code `MonCommands.h` — confirms `osd crush class ls-osd` is a valid command returning numeric OSD IDs
- Ceph source code `OSDMap.cc` — confirms `read_balance_score` is a calculated read-only metric, not a settable pool property
- Ceph source code `PGMap.cc` — confirms `ceph pg dump pgs` column layout: column `$14` is `STATE_STAMP`, `ACTING_PRIMARY` is column `$20` (full output) or `$6` (brief output)
- Ceph CLI reference — confirms `ceph osd stats` is not a valid command; valid alternatives are `ceph osd stat`, `ceph osd perf`, `ceph osd df`

## Issues Found

1. **Incorrect verification command in "Biasing Primaries Toward SSD OSDs" section**: The command `ceph pg dump | grep primary | awk '{print $14}'` was wrong on two counts: `grep primary` only matches the header row (not data rows), and column `$14` is `STATE_STAMP`, not the acting primary. Fixed to use `ceph pg dump pgs_brief` with `awk '{print "osd." $6}'` which correctly extracts `ACTING_PRIMARY` from the brief output format.

2. **Invalid `read_balance_score` pool setting in "Read Affinity" section**: The commands `ceph osd pool set mypool read_balance_score 1` and `ceph osd pool get mypool read_balance_score` were incorrect. `read_balance_score` is a read-only computed metric, not a settable pool property. Fixed to use the correct balancer module commands (`ceph balancer on`, `ceph balancer mode upmap-read`) and the correct way to view the score (`ceph osd pool ls detail | grep read_balance_score`).

3. **Wrong awk extraction logic in "Monitoring Primary Distribution" section**: The command `ceph pg dump pgs | awk '{print $14}' | tr ',' '\n' | awk 'NR==1 || (NR%3==1)'` used the wrong column (`$14` = `STATE_STAMP`) and flawed logic for extracting primaries. Fixed to use `ceph pg dump pgs_brief` with the correct column `$6` for `ACTING_PRIMARY`.

4. **Invalid `ceph osd stats` command in "Monitoring Primary Distribution" section**: `ceph osd stats` is not a valid Ceph CLI command. Replaced with `ceph osd perf`, which shows per-OSD commit and apply latency and is appropriate for verifying load distribution changes.

## Review Notes
- The `ceph balancer mode upmap-read` command is available starting from Ceph Squid (v19.x). In Ceph Reef (v18.x), read balancing is only available via the offline `osdmaptool` optimizer. The post could note this version requirement in a future update.
- The core `ceph osd primary-affinity` commands and explanations are accurate and well-presented.
- The `ceph osd dump | awk '{print $1, $NF}'` approach for checking primary affinity is fragile (the last field may vary by version), but it works as a quick inspection technique and is accompanied by more reliable alternatives, so no change was made.
