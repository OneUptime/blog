# How to Verify etcd Snapshot Integrity, Revision, and Restore Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Backup, Disaster Recovery, Data Integrity, Kubernetes

Description: Inspect an etcd snapshot, distinguish its hashes and storage version, and rehearse an isolated restore before relying on the backup.

An etcd backup is useful only if you can identify its recovery point and restore it with the intended software. A filename containing yesterday's date does not establish either property. Neither does a successful object-storage upload.

Use three layers of verification: provenance and transfer integrity, snapshot structure and revision, and an isolated restore with application checks. This guide uses etcd 3.7.1 tools. For a different source release, start with matching tools and follow that release's documented upgrade and restore path.

## Capture Provenance with the Snapshot

Take a snapshot from one selected healthy endpoint. A client snapshot represents that member's applied state; choose the source deliberately and record its status. Replace the connection details with your configured TLS environment:

```bash
export ETCDCTL_ENDPOINTS=https://etcd-1.example.net:2379
export ETCDCTL_CACERT=/etc/etcd/pki/ca.crt
export ETCDCTL_CERT=/etc/etcd/pki/backup-client.crt
export ETCDCTL_KEY=/etc/etcd/pki/backup-client.key

etcdctl endpoint status --write-out=json > source-status.json
etcdctl snapshot save snapshot.db
etcdutl version
```

Retain the source server version, cluster identity, backup completion time, snapshot filename, and application context in your backup catalog. Preserve a cryptographic file digest through the transfer process, preferably in a separately protected record. For example, `sha256sum snapshot.db` on Linux produces a SHA-256 digest; macOS provides `shasum -a 256`.

A copied `member/snap/db` file differs from an `etcdctl snapshot save` backup. It lacks the appended snapshot integrity hash, and it can omit newer state present only in the WAL. Do not silently treat the two capture methods as interchangeable. See the [recovery guide](https://etcd.io/docs/v3.7/op-guide/recovery/).

## Inspect the Snapshot Offline

Use `etcdutl`, not the removed `etcdctl snapshot status` subcommand:

```bash
etcdutl snapshot status snapshot.db --write-out=table
etcdutl snapshot status snapshot.db --write-out=json > snapshot-status.json
```

The result includes a revision, key count, size, hash, and, for supported snapshots, a storage version. Review them against the backup catalog and previous successful backups. A dramatically smaller key count may be legitimate after cleanup, but it needs explanation before the backup becomes your recovery candidate.

The reported revision is a logical sequence number, not a timestamp. It cannot tell you that a snapshot is exactly ten minutes old. Use the external capture time and retained application markers to assess the recovery point.

The `hash` shown by snapshot status is a computed database-content checksum. It is distinct from both your file SHA-256 and the appended snapshot integrity hash checked during restore. In 3.7.1, status also performs an underlying database structural check; that still does not establish that application data is semantically correct. The [snapshot implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdutl/snapshot/v3_snapshot.go) makes these checks distinguishable.

## Interpret Version Information Conservatively

The status `version` describes the snapshot's storage version. It is not a replacement for recording the exact source server patch release. Older snapshots can have an empty version field, so absence of that field is not proof of corruption.

Keep the source's exact binary version with the backup record. Rehearse recovery with that version first, then apply the documented minor-version upgrade sequence if the destination must run a newer release. Do not infer that every v3 snapshot can start on every v3 binary, or that an arbitrary downgrade is supported.

During a rolling upgrade, members can temporarily run different binaries while the cluster's effective storage capabilities remain constrained. Consult the [versioning policy](https://etcd.io/docs/v3.7/op-guide/versioning/) and the relevant [upgrade guide](https://etcd.io/docs/v3.7/upgrades/upgrade_3_7/) for that combination.

## Rehearse a Restore into a New Directory

Run this on an isolated machine or test environment using a fresh directory. The loopback endpoints must be unused. Restore does not start a server:

```bash
etcdutl snapshot restore snapshot.db \
  --name restore-check \
  --data-dir restore-check.etcd \
  --initial-cluster restore-check=http://127.0.0.1:32380 \
  --initial-advertise-peer-urls http://127.0.0.1:32380 \
  --initial-cluster-token restore-check-only
```

For a normal client-created snapshot, keep the integrity check enabled. `--skip-hash-check` exists for captures without the appended hash, such as a known raw database copy. It is not a remedy for a failed checksum on a snapshot that should contain one.

Start the matching binary against the restored directory:

```bash
etcd --name restore-check \
  --data-dir restore-check.etcd \
  --listen-client-urls http://127.0.0.1:32379 \
  --advertise-client-urls http://127.0.0.1:32379 \
  --listen-peer-urls http://127.0.0.1:32380 \
  --initial-advertise-peer-urls http://127.0.0.1:32380
```

Keep it isolated from production clients and peers. Authentication state is part of the restored database, so use the appropriate restored credentials for test reads. For a snapshot whose restored users can authenticate with passwords, use a fresh terminal without the earlier production connection variables and inspect known application keys through `http://127.0.0.1:32379`. If access depends on certificate CN identities with `--no-password` users, instead configure the isolated test listener with TLS and the corresponding trusted client CA, then connect with the restored authorized certificate identity. The plaintext example cannot authenticate a certificate-only user. Stop the test process after verification.

## Validate What the Application Needs

Check expected namespaces, representative values, migration markers, and any externally recorded checkpoint. If the source is encrypted or the application depends on external credentials, verify those dependencies too. A healthy etcd process cannot establish that a Kubernetes API server can decrypt its stored objects.

Plan client behavior before a production restore. Restoring an older revision can confuse watch-based caches. For Kubernetes-style consumers, the official recovery procedure recommends an appropriate revision bump with `--mark-compacted`; use both options together with a bump derived from your revision history and outage assumptions. A successful isolated startup does not replace that client-recovery plan.

## Conclusion

Verify the file transfer, inspect the snapshot's structure and logical revision, and rehearse with a compatible binary. Keep application checks and watch recovery in the restore plan so that a technically readable backup becomes a usable recovery point.

## Official Documentation

- [etcd snapshot and disaster recovery](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [Snapshot status and restore implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdutl/snapshot/v3_snapshot.go)
- [etcd supported versions](https://etcd.io/docs/v3.7/op-guide/versioning/)
- [Upgrade from etcd 3.6 to 3.7](https://etcd.io/docs/v3.7/upgrades/upgrade_3_7/)
