# Validation Summary: How to Implement Ceph RGW Multisite

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Ceph RGW multisite realms, zonegroups, zones, and periods
- `radosgw-admin`
- Ceph configuration database and `ceph.conf`
- Prometheus monitoring for Ceph
- S3-compatible object storage replication

## Sources Consulted
- Ceph Object Gateway Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph Multisite Sync Policy documentation: https://docs.ceph.com/en/latest/radosgw/multisite-sync-policy/
- Ceph Object Gateway Metrics documentation: https://docs.ceph.com/en/latest/radosgw/metrics/
- Ceph Manager Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- `radosgw-admin` manual page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
- The master zone creation command supplied `--access-key` and `--secret` before the system user was created. Updated the flow to match Ceph documentation: create the zone without keys, create the system user, then add the keys with `radosgw-admin zone modify`.
- The sync user section granted admin caps that are not part of the documented multisite setup. Replaced that with the documented zone credential update.
- The active-active advantages overstated failover behavior. Updated the wording to reflect that object writes can continue in non-master zones, while metadata master failover is a separate operation.
- The Prometheus section scraped RGW endpoints directly and listed metric names that are not documented in current Ceph RGW metrics docs. Updated it to scrape the Ceph manager Prometheus endpoint and recommend using release-specific Ceph exporter metrics plus `radosgw-admin sync status`.
- The failover examples used `--master=false` and `--yes-i-really-mean-it`, which are not part of the documented failover flow. Updated the commands to promote the secondary with `--master --default`, commit the period, and restart RGW.
- The disaster recovery section recreated the recovered zone, which is unsafe and not the documented recovery flow for an existing zone. Updated it to pull the current realm configuration and restart RGW.
- The bandwidth throttling section claimed to set a maximum sync bandwidth but used unrelated or non-bandwidth options, including an error-injection setting. Renamed the section to sync tuning and kept only sync worker tuning options.

## Review Notes
The post is technically relevant and now aligns with the current upstream Ceph documentation at a general command level. Exact service restart commands and Prometheus metric names can vary by deployment method and Ceph release, especially for cephadm-managed clusters.
