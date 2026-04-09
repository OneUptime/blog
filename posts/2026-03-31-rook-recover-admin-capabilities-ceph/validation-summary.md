# Validation Summary: How to Recover Admin Capabilities in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CephX authentication, admin socket, auth subsystem)
- Rook (Kubernetes-based Ceph operator)
- Kubernetes (kubectl, Secrets)

## Sources Consulted
- [User Management — Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/user-management/) — verified `ceph auth caps`, `ceph auth get`, `ceph auth get-or-create` syntax and capability strings
- [ceph — ceph administration tool — Ceph Documentation](https://docs.ceph.com/en/reef/man/8/ceph/) — verified `--admin-daemon` flag and admin socket path format `/var/run/ceph/ceph-mon.<id>.asok`
- [CephX Config Reference — Ceph Documentation](https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/) — confirmed CephX authentication bypass via admin socket
- [Troubleshooting Monitors — Ceph Documentation](https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-mon/) — confirmed monitor admin socket usage for auth recovery
- [Disaster Recovery — Rook Ceph Documentation](https://www.rook.io/docs/rook/latest-release/Troubleshooting/disaster-recovery/) — confirmed `rook-ceph-admin-keyring` secret name and recovery procedures
- [Monitor Health — Rook Ceph Documentation](https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-mon-health/) — confirmed monitor pod labels (`app=rook-ceph-mon`)

## Issues Found
No technical issues found.

## Review Notes
- In Scenario 1, the description mentions using the admin socket to bypass CephX, and the initial `ceph --admin-daemon ... auth get` command uses the admin socket. However, the subsequent `ceph auth caps` fix command is a regular `ceph` command (not via admin socket). This works when running from inside a Rook mon pod (which has the mon keyring) or when the admin user retains enough residual capabilities to modify auth. If the admin's caps are severely restricted (e.g., no monitor write access), the user would need to use the admin socket for the fix as well, similar to the approach in Scenario 3. This is a minor clarity concern, not a technical error.
- The admin socket path `/var/run/ceph/ceph-mon.*.asok` is the traditional default. In newer containerized deployments (cephadm), the socket may be under `/var/run/ceph/<cluster-fsid>/`. The post correctly separates bare-metal and Rook approaches, so this does not cause confusion.
- All `kubectl` commands, secret names, pod labels, and `ceph auth` commands are syntactically correct and match current official documentation.
