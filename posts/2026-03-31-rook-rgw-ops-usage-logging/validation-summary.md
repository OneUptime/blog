# Validation Summary: How to Set Up Operations and Usage Logging in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- Ceph configuration system (`ceph config set`)

## Sources Consulted
- Ceph official documentation: RGW configuration reference for `rgw_enable_ops_log`, `rgw_enable_usage_log`, `rgw_usage_log_tick_interval`, `rgw_usage_log_flush_threshold`, `rgw_usage_max_shards` (https://docs.ceph.com/en/latest/radosgw/config-ref/)
- Ceph official documentation: radosgw-admin usage commands (https://docs.ceph.com/en/latest/radosgw/admin/)
- Rook documentation: Ceph configuration override via ConfigMap (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)

## Issues Found
1. **Incorrect comment for `--show-log-sum=false` flag**: The comment stated "Show summary only (no per-category breakdown)" but `--show-log-sum=false` does the opposite — it suppresses the summary totals and shows per-category entries. Fixed the comment to: "Show per-category breakdown without summary totals".

## Review Notes
- The `ceph osd pool create default.rgw.log 32 32` command uses the older two-argument form (pg_num, pgp_num). In newer Ceph releases (Nautilus+), specifying a single pg_num is sufficient as pgp_num defaults to match. This is not incorrect but could be simplified.
- The sample JSON output is a simplified representation. Real `radosgw-admin usage show` output includes additional fields like `categories` with per-operation breakdowns. The simplified version is acceptable for illustration.
- The Rook ConfigMap section name `[client.rgw.my-store.a]` is a placeholder — users will need to replace `my-store.a` with their actual RGW daemon identifier.
