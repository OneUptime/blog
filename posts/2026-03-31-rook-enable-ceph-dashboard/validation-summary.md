# Validation Summary: How to Enable the Ceph Dashboard in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph Dashboard (mgr module)
- Kubernetes (CephCluster CRD, Services, Secrets, kubectl)

## Sources Consulted
- Rook Ceph Dashboard Documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/)
- Rook CephCluster CRD specification (https://github.com/rook/rook/blob/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md)
- Ceph Dashboard Documentation (https://docs.ceph.com/en/latest/mgr/dashboard/)
- Rook GitHub repository examples and issues

## Issues Found
- **Misleading YAML comment**: In the "Enabling the Dashboard" YAML snippet, the comment `# Optional: provide a custom TLS secret` was placed directly before the commented-out `urlPrefix` field. The `urlPrefix` field configures a URL path prefix for reverse proxy setups and has nothing to do with TLS secrets. There is no field in the CephCluster dashboard spec for directly referencing a TLS secret; custom SSL certificates are configured via `ceph dashboard` commands as correctly shown later in the post. Fixed the comment to read `# Optional: set a URL prefix for reverse proxy setups`.

## Review Notes
- The default ports (8443 for HTTPS, 7000 for HTTP) are correct for Rook deployments. Note that Ceph itself defaults to 8080 for HTTP, but Rook overrides this to 7000.
- The `ceph dashboard ac-user-set-password admin --force-password 'password'` command syntax is version-dependent. In newer Ceph versions (Quincy/Reef), the password is typically provided via `-i <file>` rather than as a positional argument. The blog doesn't target a specific Ceph version, so this is acceptable but could be noted in a future update.
- The SSL certificate commands (`ceph dashboard set-ssl-certificate -i /path`) work without specifying a manager name (applies to the active manager). Some documentation shows an optional manager name parameter.
- The `urlPrefix` field exists in the CephCluster CRD and the `ceph dashboard set-url-prefix` command is correctly shown as an alternative approach.
- All kubectl commands, service names, secret names, and CRD field paths are accurate.
