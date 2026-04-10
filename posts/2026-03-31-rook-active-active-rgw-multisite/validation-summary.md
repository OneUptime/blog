# Validation Summary: How to Set Up Active-Active RGW Multisite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway) multisite
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- Kubernetes Services / LoadBalancer
- AWS CLI (for S3-compatible verification)
- AWS Route53 (latency-based routing mention)

## Sources Consulted
- Ceph official multisite documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/
- Rook Ceph RGW multisite documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-multisite/

## Issues Found

1. **Missing `realm default` command on Cluster B (secondary site):** After `realm pull`, the secondary cluster must run `radosgw-admin realm default --rgw-realm=mycompany` to set the pulled realm as the default. Without this step, subsequent `zone create` and `period update` commands may not reference the correct realm. Added the missing command between `realm pull` and `zone create`.

2. **Incorrect flag `--secret-key` on `zone create` for Cluster B:** The `zone create` command used `--secret-key=sync-secret`, but the official Ceph multisite documentation specifies `--secret` for zone operations (not `--secret-key`, which is used for user management commands like `user create`). This was also inconsistent with the `realm pull` command immediately above, which correctly used `--secret`. Changed to `--secret=sync-secret`.

## Review Notes
- The post does not include the step to create a system user with `radosgw-admin user create --system` on the master zone. The placeholder credentials (`sync-key`, `sync-secret`) imply this has been done, but readers new to Ceph multisite may not know this prerequisite. A future revision could mention this.
- The Kubernetes Service manifest in Step 3 targets pods within a single cluster. For true active-active across two Kubernetes clusters, this Service would need to be deployed in each cluster independently, then DNS-based routing (Route53) would direct clients. The post mentions Route53 but doesn't explicitly state the Service should be deployed in both clusters.
- The post correctly describes the eventual consistency model of Ceph RGW multisite. Conflict resolution for simultaneous writes to the same object across zones follows a last-writer-wins strategy based on timestamp, which could be mentioned for completeness.
