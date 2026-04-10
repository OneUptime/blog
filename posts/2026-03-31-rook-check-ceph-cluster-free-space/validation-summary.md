# Validation Summary: How to Check Ceph Cluster Free Space Quickly

## Status
validated

## Post Type
Reference / Quick-start CLI guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph CLI (`ceph df`, `ceph osd df`, `ceph status`, `ceph osd dump`)
- Ceph MGR Prometheus module
- PromQL (Prometheus query language)
- Rook (mentioned in tags, not directly in post content)

## Sources Consulted
- Ceph official documentation: Monitoring a Cluster - https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation: Health Checks - https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph official documentation: Troubleshooting OSDs - https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph MGR Prometheus module source code (GitHub) for metric name verification
- Red Hat Ceph Storage documentation for `ceph osd dump` ratio output verification

## Issues Found

### 1. Incorrect `sort -k7` column in `ceph osd df` pipeline (Line 69)

**What was wrong:** The blog suggested `ceph osd df | sort -k7 -n -r | head -20` to sort OSDs by utilization percentage. In modern Ceph (Nautilus through Squid), the `ceph osd df` output includes columns like CLASS, RAW USE, DATA, OMAP, and META that were not present in very old versions (Jewel era). Column 7 in a whitespace-delimited sort targets the DATA column, not %USE. Additionally, Ceph formats size values as two whitespace-delimited tokens (e.g., "3.6 TiB"), making `sort -k` field positions inconsistent across rows depending on unit formatting. This makes the `sort -k` approach fundamentally unreliable for this command's output.

**What was changed:** Replaced the fragile `sort -k7` pipeline with `ceph osd df tree`, which provides a hierarchical view of OSD utilization grouped by the CRUSH topology (host, rack, etc.). This is a correct, commonly used command that gives a clear overview of per-OSD utilization without version-dependent column numbering issues.

**Why:** The `ceph osd df tree` command is documented in official Ceph docs, works across all modern Ceph versions, and provides a more readable view of OSD utilization organized by physical topology — which is often more useful than a flat sorted list when investigating capacity issues.

## Review Notes
- The `DIRTY` column mentioned in the `ceph df detail` section relates to cache tiering, which has been deprecated since Ceph Nautilus. The column still appears in output but is rarely relevant for modern deployments. Not changed since it remains technically accurate.
- The parenthetical "(not recommended below defaults)" in the threshold configuration section is slightly ambiguous — the examples show ratios lower than defaults (0.80 and 0.90 vs defaults of 0.85 and 0.95), which is actually a more conservative/safe configuration. Lowering these ratios gives earlier warnings, which is beneficial. The wording could be clearer but is not technically incorrect.
- All core CLI commands (`ceph df`, `ceph df detail`, `ceph osd df`, `ceph status`, `ceph osd dump`) are verified correct.
- Default threshold values (nearfull=0.85, full=0.95) are verified correct.
- `ceph osd set-nearfull-ratio` and `ceph osd set-full-ratio` commands are verified as valid in modern Ceph.
- Prometheus metrics (`ceph_cluster_total_bytes`, `ceph_cluster_total_used_bytes`) are verified correct against the MGR Prometheus module source.
- The PromQL alerting query is syntactically and logically correct.
- The sample `ceph df` output format accurately reflects modern Ceph output structure.
