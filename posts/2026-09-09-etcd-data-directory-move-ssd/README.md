# How to Move an etcd Data Directory to SSD Without Rebuilding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Storage, Linux, Performance, High Availability

Description: Move an existing etcd member to SSD with a stopped-process copy, preserved identity, mount dependencies, and a rollback that avoids stale data.

---

An etcd member can keep its identity while its data directory moves to a new disk. The critical requirements are that the copy is consistent, only one process uses that identity, and the member rejoins the same cluster afterward.

This procedure targets a healthy three-voter etcd 3.6 or 3.7 cluster on Linux with systemd. It moves one member at a time from `/var/lib/etcd` to an already provisioned SSD filesystem at `/mnt/etcd-ssd`. It assumes the original member data is readable and healthy. Disk corruption or permanent member loss calls for a different recovery procedure.

## Confirm the bottleneck and the storage layout

Establish that the old storage is responsible for the latency problem. Compare WAL fsync and backend commit durations with device-level latency during the same workload. Provision the SSD for low durable-write latency and sufficient capacity; a device's marketing throughput is not the relevant guarantee.

Identify the effective `data-dir` and any separate `wal-dir`. The backend and Raft snapshot data live under the data directory, while an explicit WAL directory may be elsewhere. Moving only the backend will not move WAL writes off a slow dedicated WAL disk. The official [storage files guide](https://etcd.io/docs/v3.6/learning/persistent-storage-files/) describes the layout.

Inspect the source and destination mounts:

```bash
findmnt --target /var/lib/etcd
findmnt --target /mnt/etcd-ssd
lsblk -f
df -h /var/lib/etcd /mnt/etcd-ssd
```

Confirm that `/mnt/etcd-ssd` is actually the intended mounted filesystem. Otherwise a missing mount could send the copy back onto the host's root disk. Configure persistent mounting through the host's established storage management, using a stable device identifier.

## Prepare a recoverable maintenance window

Record current member IDs, cluster ID, URLs, and versions. Verify every voting endpoint is healthy and take a snapshot through the established backup workflow before changing storage:

```bash
export ETCDCTL_ENDPOINTS=https://etcd1.example.com:2379,https://etcd2.example.com:2379,https://etcd3.example.com:2379
etcdctl endpoint health
etcdctl endpoint status --write-out=table
etcdctl endpoint status --write-out=json
etcdctl member list --write-out=table
etcdctl --endpoints=https://etcd1.example.com:2379 \
  snapshot save /secure-backups/before-ssd-move.db
```

Replace the example endpoints with all three voting endpoints and use existing TLS and administrative credentials for every command. Save the JSON status output to record the cluster ID and member IDs; the table does not show the cluster ID. Choose a real secure backup directory on independent storage. A snapshot is a disaster-recovery artifact; it is not what this procedure uses to move the member. Restoring a snapshot creates a new logical identity, whereas copying this stopped member's complete data preserves its identity.

Choose a follower first. Confirm that the other two voters will remain available and avoid overlapping upgrades, defragmentation, backups that saturate disks, or additional restarts. If the selected member is leader, transfer leadership to an eligible healthy voter as part of the maintenance plan.

## Stop the member before the authoritative copy

Stop etcd through its normal service manager and confirm that the process has exited:

```bash
sudo systemctl stop etcd
sudo systemctl is-active etcd
```

The expected service state is inactive. Check for a separate supervisor or container restart policy if the process unexpectedly reappears. Do not copy a changing live directory and assume the backend, WAL, and snapshots will form a consistent member state.

Create a new destination with the actual service account, then copy the entire directory. This example assumes the account and group are both named `etcd` and uses rsync with ACL and extended-attribute support:

```bash
sudo install -d -o etcd -g etcd -m 0700 /mnt/etcd-ssd/member-data
sudo rsync -aHAX --numeric-ids \
  /var/lib/etcd/ /mnt/etcd-ssd/member-data/
sudo rsync -aHAX --numeric-ids --checksum --dry-run --itemize-changes \
  /var/lib/etcd/ /mnt/etcd-ssd/member-data/
```

The second pass should report no unexpected differences. Preserve ownership, permissions, extended attributes, and applicable security labels. Check filesystem support for those attributes and follow the host's SELinux policy where enabled. Keep etcd stopped throughout both passes.

If `wal-dir` is explicitly configured and should also move, copy that complete directory to its own new destination during the same stopped interval, verify it, and update that path as well. If it remains unchanged intentionally, document that the WAL still uses its original device.

## Update the real configuration source

Change the existing service configuration to point at the new directory:

```yaml
data-dir: /mnt/etcd-ssd/member-data
```

This is a fragment to edit in the existing YAML file, not a full replacement configuration. If the service uses flags instead, change its actual `--data-dir` argument. Preserve the member name, peer URLs, TLS configuration, and cluster identity. Do not issue `member remove`, `member add`, or `snapshot restore` for this same-identity disk move.

For a systemd-managed filesystem dependency, add the following to the appropriate service drop-in:

```ini
[Unit]
RequiresMountsFor=/mnt/etcd-ssd/member-data
```

Reload unit definitions after changing them, then start only this member:

```bash
sudo systemctl daemon-reload
sudo systemctl start etcd
sudo journalctl -u etcd --since '5 minutes ago' --no-pager
```

A mount dependency helps keep the service from starting before its data filesystem is available. Validate the actual mount configuration and failure behavior as part of host provisioning.

## Verify identity and catch-up before proceeding

Query the moved member directly. Its member ID and cluster ID should match the recorded values, and its Raft progress should catch up with the leader. Run endpoint health and authenticated application reads, then compare WAL/backend latency under representative load.

Check open file paths or service logs to establish that the process actually uses the new directory. A configuration edit that was ignored because another source took precedence can produce a healthy service still running from the old disk.

Do not move the next member until the current one is healthy and participating. Repeat the same process sequentially for the remaining members.

## Avoid a stale-copy rollback

Before the new copy has ever started, reverting the configured path to the untouched original directory is straightforward. After the new copy has run, it may contain newer state and the original directory is stale. Do not treat the old copy as an interchangeable hot spare.

For rollback after the move has served traffic, stop the member again and use an up-to-date, verified stopped copy from the currently active directory onto suitable storage, or follow the supported member-replacement procedure if that copy cannot be trusted. Never run both copies of one member identity. Retain the old files until the migration and backup are verified, then retire them through the normal data-handling process.

## Conclusion

Move etcd storage with a complete copy taken while that member is stopped, preserving its configuration and identity. Verify mount dependencies, catch-up, and latency before continuing, and remember that the old directory becomes stale as soon as the new copy advances.

## Official Documentation

- [etcd persistent storage files](https://etcd.io/docs/v3.6/learning/persistent-storage-files/)
- [etcd hardware recommendations](https://etcd.io/docs/v3.7/op-guide/hardware/)
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)
- [systemd mount requirements in the official manual source](https://github.com/systemd/systemd/blob/main/man/systemd.unit.xml)
