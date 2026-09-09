# Validation Summary: How to Move an etcd Data Directory to SSD Without Rebuilding

## Status
validated

## Post Type
Guide / operational tutorial with Linux commands and etcd/systemd configuration.

## Technologies Covered
- etcd 3.6 and 3.7, etcdctl, Raft membership, WAL, backend storage, and snapshots
- Linux filesystems, SSD storage, util-linux, and GNU coreutils
- rsync, file ownership, ACLs, extended attributes, and SELinux considerations
- systemd service management and mount dependencies

## Sources Consulted
- etcd persistent storage files: https://etcd.io/docs/v3.6/learning/persistent-storage-files/
- etcd hardware recommendations: https://etcd.io/docs/v3.7/op-guide/hardware/
- etcd configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/ and https://etcd.io/docs/v3.7/op-guide/configuration/
- etcdctl 3.6 command reference: https://raw.githubusercontent.com/etcd-io/etcd/release-3.6/etcdctl/README.md
- etcdctl 3.7 command reference: https://github.com/etcd-io/etcd/blob/release-3.7/etcdctl/README.md
- etcd disaster recovery: https://etcd.io/docs/v3.6/op-guide/recovery/
- etcd runtime reconfiguration: https://etcd.io/docs/v3.6/op-guide/runtime-configuration/
- etcd disk metrics: https://etcd.io/docs/v3.6/metrics/
- Upstream rsync manual: https://download.samba.org/pub/rsync/rsync.1
- systemd unit manual source: https://github.com/systemd/systemd/blob/main/man/systemd.unit.xml
- systemctl manual source: https://raw.githubusercontent.com/systemd/systemd/main/man/systemctl.xml
- journalctl manual source: https://raw.githubusercontent.com/systemd/systemd/main/man/journalctl.xml
- util-linux findmnt manual: https://man7.org/linux/man-pages/man8/findmnt.8.html
- util-linux lsblk manual: https://man7.org/linux/man-pages/man8/lsblk.8.html
- GNU coreutils install implementation and help: https://raw.githubusercontent.com/coreutils/coreutils/master/src/install.c
- GNU coreutils df implementation and help: https://raw.githubusercontent.com/coreutils/coreutils/master/src/df.c

## Issues Found
1. **The health/status commands did not select all voters.** Without endpoint configuration, etcdctl targets its default local endpoint, so the example did not establish the stated three-voter health prerequisite. Added an explicit three-endpoint `ETCDCTL_ENDPOINTS` example and instructions to substitute real voting endpoints and apply credentials to every command. The snapshot command retains its explicit single endpoint.
2. **The initial checks did not record the cluster ID required later.** Table status output omits the cluster ID. Added JSON status output, included the cluster ID in the recording instructions, and explained that the JSON output must be saved for the identity comparison.
3. **The rsync implementation was incorrectly called GNU rsync.** Replaced that description with the actual requirement: rsync with ACL and extended-attribute support. The existing options are valid upstream rsync options.

## Review Notes
- The complete stopped-member copy is consistent with etcd's documented storage layout and persisted member/cluster metadata. Snapshot restoration rewrites identity and is correctly excluded from this migration.
- The guide correctly preserves quorum by moving one member at a time and requiring catch-up before the next move. A separate configured WAL directory needs the stated independent handling.
- The YAML key and CLI data/WAL paths are documented for both versions. Configuration-file settings override flags and environment variables, supporting the warning to verify effective file paths after restart.
- rsync archive mode plus `HAX` preserves the listed metadata where supported; checksum dry-run checks source-file differences. The procedure assumes a new empty destination, since these commands do not remove or report destination-only files. Source directory metadata can replace the initial destination mode created by install.
- `RequiresMountsFor` adds mount requirement and ordering dependencies. Its effectiveness depends on the persistent mount configuration; it does not independently verify SSD device identity. A separate WAL filesystem should also have appropriate service dependencies.
- `systemctl is-active` returns nonzero for the expected inactive state. These are interactive maintenance commands; automation must handle that result explicitly.
- The stale-copy rollback warning is correct, including the instruction never to run duplicate member identities. A rollback copy must include the currently active WAL state as well as the backend and snapshots.
- The four technical documentation links in the post resolve to the intended resources. No deprecated command used by the procedure was identified; snapshot restoration belongs to etcdutl in these versions.
- Validation consisted of official documentation/source review and Bash syntax checks. No live etcd cluster or SSD migration was executed, so host-specific mount, permissions, SELinux, and service behavior remain deployment checks.
