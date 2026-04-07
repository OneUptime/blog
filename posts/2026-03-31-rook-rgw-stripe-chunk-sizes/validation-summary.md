# Validation Summary: How to Set Object Stripe and Chunk Sizes in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- RADOS (Reliable Autonomic Distributed Object Store)
- Kubernetes ConfigMaps
- radosgw-admin CLI
- AWS CLI (S3-compatible endpoint usage)

## Sources Consulted
- Ceph RGW Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/
- Ceph RGW Data Layout in RADOS: https://docs.ceph.com/en/reef/radosgw/layout/
- Rook Ceph Advanced Configuration (rook-config-override): https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- radosgw-admin manpage and CLI reference
- Ceph centralized config (`ceph config set/get`) documentation

## Issues Found
No technical issues found.

## Review Notes
- The `ceph config get client.rgw <key>` command only returns values explicitly set in the centralized config database. If no override has been set, it may return empty rather than the compiled-in default. Users wanting to see the effective running value should use `ceph config show <daemon-name>` on a running RGW daemon instead. This is a minor UX note rather than an error.
- The `kubectl rollout restart deployment` command assumes RGW runs as a Deployment, which is the standard in most Rook versions. In some configurations, RGW could run as a StatefulSet. Users should verify with `kubectl -n rook-ceph get deploy,sts | grep rgw`.
- For modern Ceph (Nautilus+), using `ceph config set` via the centralized config database is generally preferred over ceph.conf file overrides via the ConfigMap. The post correctly shows both approaches.
