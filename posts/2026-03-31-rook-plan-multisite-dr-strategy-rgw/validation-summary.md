# Validation Summary: How to Plan Multisite DR Strategy with Ceph RGW

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph RGW Multisite (realms, zone groups, zones)
- radosgw-admin CLI
- AWS CLI (for S3-compatible endpoint testing)
- DNS-based failover

## Sources Consulted
- Ceph official documentation: Multisite configuration (https://docs.ceph.com/en/latest/radosgw/multisite/)
- Ceph official documentation: RGW frontends (https://docs.ceph.com/en/latest/radosgw/frontends/)
- Ceph official documentation: radosgw-admin CLI reference

## Issues Found
1. **Incorrect characterization of master zone write behavior (line 29)**: The post originally stated "Master zone - receives writes; non-master zones receive via sync", implying an active-passive model where only the master zone accepts client writes. This is incorrect. Since the Kraken release, Ceph RGW multisite operates in active-active mode by default -- all zones accept writes from clients, and data is replicated bidirectionally via sync. The master zone distinction is about authoritative metadata operations (bucket creation, user management), not write-path exclusivity. **Fixed** to: "Master zone - handles authoritative metadata operations (e.g., bucket and user creation); all zones accept writes which are replicated via sync."

## Review Notes
- Port 7480 used in the example endpoint (`http://us-west-rgw.example.com:7480`) was the default for the older Civetweb frontend. The Beast frontend (default since Nautilus) uses port 80. Since the post uses it as an example endpoint URL rather than claiming it is the default, this is acceptable but worth noting for readers on modern deployments.
- The zone creation commands omit `--endpoints` for the master zone and `--access-key`/`--secret` for the system user, which are typically part of a full multisite setup. This is acceptable since the post is focused on DR planning rather than a step-by-step configuration tutorial.
- The sync lag parsing in the DR test script (`grep "behind" | awk '{print $1}'`) is a rough approximation. The actual output format of `radosgw-admin sync status` varies by version, so the parsed value may not always be meaningful. This is adequate for an illustrative example.
