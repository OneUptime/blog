# Validation Summary: How to Check OSD Utilization and Variance in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph OSD (Object Storage Daemon) management
- CRUSH algorithm (Controlled Replication Under Scalable Hashing)
- Ceph balancer module (upmap mode)
- Rook (Ceph operator for Kubernetes, referenced in tags)

## Sources Consulted
- Ceph official documentation: OSD management commands (`ceph osd df`, `ceph osd tree`, `ceph osd crush reweight`)
- Ceph official documentation: `ceph osd reweight-by-utilization` and `ceph osd test-reweight-by-utilization` — https://docs.ceph.com/en/latest/rados/operations/control/#osd-reweight-by-utilization
- Ceph official documentation: Balancer module — https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph official documentation: CRUSH map management — https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found

### 1. Incorrect preview command for reweight-by-utilization (Critical)
- **What was wrong:** The post used `ceph osd reweight-by-utilization 120 0.01 5 --no-increasing` as a "preview" command, stating it would show changes "without applying." This is incorrect — `ceph osd reweight-by-utilization` **applies changes immediately**. Running it as shown would actually reweight OSDs in a live cluster.
- **What was changed:** Replaced with `ceph osd test-reweight-by-utilization 120 0.01 5 --no-increasing`, which is the correct dry-run/preview variant that shows proposed changes without applying them.
- **Why:** `ceph osd test-reweight-by-utilization` is the dedicated simulation command. Using the non-test variant could cause unintended data movement on a production cluster if a reader follows the instructions expecting a harmless preview.

## Review Notes
- The `sort -k7` column number in the sorting command (`ceph osd df | sort -k7 -n -r | head -10`) was correct for older Ceph versions (Luminous and earlier) where `%USE` was the 7th whitespace-delimited field. In Ceph Nautilus (14.x) and later, additional columns (RAW USE, DATA, OMAP, META) were added to `ceph osd df` output, shifting `%USE` to a higher column number (approximately field 11 or higher depending on unit formatting). Users on modern Ceph should verify the correct column number from the header row of their `ceph osd df` output.
- The explanation of CRUSH weights in TiB for `ceph osd crush reweight` is correct. Worth noting that this adjusts the CRUSH weight (which controls data placement), while `ceph osd reweight-by-utilization` adjusts the OSD reweight value (0.0-1.0), which is a different mechanism. The post correctly uses both but doesn't explicitly contrast them, which could be a useful clarification in the future.
- The balancer commands (`ceph balancer on`, `ceph balancer mode upmap`, `ceph balancer status`) are correct and represent current best practice for Ceph Luminous and later.
