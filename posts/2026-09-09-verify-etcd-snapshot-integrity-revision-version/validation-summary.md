# Validation Summary: How to Verify etcd Snapshot Integrity, Revision, and Restore Compatibility

## Status

validated

## Post Type

Technical guide with snapshot capture, offline inspection, and isolated restore commands.

## Technologies Covered

- etcd 3.7.1, etcdctl, and etcdutl
- etcd snapshots, MVCC revisions, storage versions, and WAL recovery
- bbolt structural checks, CRC32C checksums, and SHA-256 integrity checks
- TLS client certificates and etcd authentication
- Kubernetes encryption at rest and watch-based caches
- Bash commands and environment variables

## Sources Consulted

- [etcd 3.7 disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [etcd 3.7 versioning policy](https://etcd.io/docs/v3.7/op-guide/versioning/)
- [Upgrade etcd from 3.6 to 3.7](https://etcd.io/docs/v3.7/upgrades/upgrade_3_7/)
- [etcd 3.7 configuration options](https://etcd.io/docs/v3.7/op-guide/configuration/)
- [etcd 3.7 role-based access control](https://etcd.io/docs/v3.7/op-guide/authentication/rbac/)
- [etcdutl snapshot implementation at v3.7.1](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdutl/snapshot/v3_snapshot.go)
- [etcdutl snapshot command definitions at v3.7.1](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdutl/etcdutl/snapshot_command.go)
- [etcdctl snapshot command definitions at v3.7.1](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/ctlv3/command/snapshot_command.go)
- [etcdctl command reference at v3.7.1](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
- [etcdutl command reference at v3.7.1](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdutl/README.md)
- [Kubernetes: Encrypting Confidential Data at Rest](https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/)

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. The post is technically relevant and contains implementation details requiring review.
- Checked all four fenced Bash blocks with `bash -n`; all passed. Verified command names, environment-variable conventions, output formats, restore flags, and server listener options against official references and version-pinned source. No live etcd cluster or snapshot was used, so this review does not certify an actual backup or an environment-specific restore.
- Confirmed that snapshot status computes CRC32C over database content and invokes the bbolt transaction structural check. Restore separately validates the appended SHA-256 digest; a digest of the complete transferred file serves a different purpose.
- Confirmed that status reads the storage version, which can be absent for snapshots from releases before 3.6. It does not identify the exact source server patch release. Revision and capture time correctly serve different purposes.
- Confirmed the distinction between a client snapshot and a raw database copy, including possible WAL-only state and the missing appended integrity digest in raw copies.
- The restore creates persistent cluster membership before server startup. The launch command uses that restored directory and loopback listeners; the official etcdutl reference likewise starts restored members without repeating the initial cluster token and membership flags.
- Password-disabled users require certificate CN authentication. The post correctly requires a TLS test listener and the corresponding trusted client CA for that case. Kubernetes data checks also require the appropriate external encryption configuration and keys or KMS access.
- The v3.7.1 CLI requires a positive `--bump-revision` and `--mark-compacted` together. The post correctly separates a basic isolated restore rehearsal from the production watch-recovery plan.
- The linked official documentation and version-pinned implementation resolve to the intended resources. Some documentation examples omit the storage-version output field; the v3.7.1 implementation confirms the post's description.
- The current 3.6-to-3.7 upgrade guide requires 3.6.11 or later before a rolling upgrade. The post appropriately delegates release-specific prerequisites to that guide rather than promising arbitrary snapshot or downgrade compatibility.
