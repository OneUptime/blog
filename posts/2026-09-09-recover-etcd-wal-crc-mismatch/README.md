# How to Recover etcd from a WAL CRC Mismatch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Data Integrity, Disaster Recovery, Troubleshooting, High Availability

Description: Preserve WAL corruption evidence, determine whether healthy quorum survives, and choose member replacement or verified snapshot recovery.

An etcd startup error containing `wal: crc mismatch` means the WAL decoder encountered data that failed its checksum expectation. It does not tell you which storage component caused the damage, and it does not automatically mean the whole cluster must be rebuilt.

The first decision is whether a trustworthy quorum remains. If it does, replace the affected member from healthy cluster state. If it does not, recover unavailable intact members or follow the verified snapshot recovery procedure. This guide uses the etcd 3.7 operational model and avoids treating log deletion as repair.

## Preserve the Failed Member Before Changing It

Stop the affected etcd process and keep its supervisor from repeatedly restarting it during investigation. In a systemd deployment, the first commands might be:

```bash
sudo systemctl stop etcd
sudo journalctl -u etcd --since '2 hours ago' --no-pager
sudo journalctl -k --since '2 hours ago' --no-pager
```

For a static pod or an operator-managed service, use the owning platform's maintenance procedure instead. A shell-level stop that the reconciler immediately reverses does not isolate the failed member.

Preserve the stopped member's complete data directory, configured separate WAL directory if present, service configuration, binary version, and relevant logs. Use a storage snapshot or an ownership-preserving copy to a separate location with sufficient space. Retain the original files until the recovery and investigation are complete.

Look for storage I/O errors, filesystem faults, an unexpected power loss, exhausted storage, and recent changes to mounts or virtual disks. A checksum failure is an observed symptom; assign a root cause only after collecting supporting evidence.

## Establish Which Cluster State Is Still Authoritative

Query the surviving client endpoints using the normal TLS and administrative credentials. Replace the example hosts:

```bash
SURVIVORS=https://etcd-2.example.net:2379,https://etcd-3.example.net:2379

etcdctl --endpoints="$SURVIVORS" endpoint status --write-out=table
etcdctl --endpoints="$SURVIVORS" endpoint health
etcdctl --endpoints="$SURVIVORS" member list --write-out=table
etcdctl --endpoints="$SURVIVORS" alarm list
```

A three-voter cluster with two healthy communicating voters can normally proceed. A five-voter cluster needs three. Learners do not count toward quorum. A reachable metrics endpoint or a successful serializable read alone does not demonstrate a functioning quorum.

If the healthy members have independent corruption indicators, do not assume their state is trustworthy merely because they elect a leader. Compare evidence at a common revision and involve the recovery owner before selecting a source. The [data corruption guide](https://etcd.io/docs/v3.7/op-guide/data_corruption/) distinguishes member repair from whole-cluster restore.

## Replace One Corrupt Member When Quorum Survives

Record the failed member's ID from the membership list. Membership IDs are hexadecimal identifiers, not hostnames or array indexes. After checking the ID and ensuring the old process remains stopped, remove only that member:

```bash
FAILED_MEMBER_ID=replace-with-verified-hex-member-id
etcdctl --endpoints="$SURVIVORS" member remove "$FAILED_MEMBER_ID"

etcdctl --endpoints="$SURVIVORS" member add etcd-1-replacement \
  --peer-urls=https://etcd-1.example.net:2380 \
  --learner
```

The placeholder must be replaced before execution. Retain the exact configuration printed by `member add`. Start the replacement on a new, empty data path, with its assigned name, the returned membership list, `initial-cluster-state=existing`, and valid peer/client TLS configuration. Do not start it against the preserved corrupt directory.

Adding as a learner avoids increasing voting requirements before the replacement catches up. Inspect its status and logs, then promote the verified new member ID once etcd accepts that it is synchronized:

```bash
NEW_MEMBER_ID=replace-with-new-hex-member-id
etcdctl --endpoints="$SURVIVORS" member promote "$NEW_MEMBER_ID"
```

Keep membership changes serial and confirm quorum after each one. A removed member's old data directory cannot simply resume membership. The [runtime reconfiguration guide](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/) explains replacement and learner promotion.

## Distinguish Backend Recovery from WAL Damage

The corruption guide also describes purging selected persistent state so a member downloads a fresh snapshot. That procedure is not a universal solution for a WAL that fails decoding during startup. Preserving a damaged WAL while moving only the snapshot directory can leave the startup failure unchanged.

Likewise, deleting the last WAL segment, suppressing checksum validation, or manually editing records can discard committed information or produce an unsupported state. A readable portion of a WAL is not proof that its remaining records form a valid recovery boundary. Prefer replacement from an intact quorum when that source exists.

## Use Disaster Recovery When Quorum Cannot Be Restored

Check whether intact but unavailable members can return through a network or storage repair. Membership removal itself requires quorum, so removing failed members is not a general way to manufacture consensus in a minority partition.

If the required voters are permanently lost, select a verified snapshot and restore a new logical cluster according to the [disaster recovery procedure](https://etcd.io/docs/v3.7/op-guide/recovery/). Fence old members and clients before exposing the recovered cluster. Record the snapshot's recovery point and any acknowledged writes that may be missing.

Do not use `--force-new-cluster` as a routine response to this error. It does not repair corrupted WAL bytes, and the recovery documentation strongly discourages it because surviving old members can make the operation unsafe. A controlled snapshot restore has explicit membership and a verifiable source.

## Verify Recovery Before Closing the Incident

Confirm the intended voters, a stable leader, healthy endpoints, and application reads and writes. Review storage behavior on the replacement host. Clear a corruption alarm only after the condition is resolved; clearing the alarm is not the repair itself.

Take a fresh snapshot and rehearse its restore. Preserve the incident evidence long enough to determine whether the original storage should be returned to service. Replacing a member on the same faulty device can recreate the failure.

## Conclusion

Treat a WAL checksum mismatch as a reason to preserve evidence and establish quorum health. Replace one member from trustworthy live state when possible, and use verified snapshot recovery when quorum is permanently lost. Keep manual WAL modification out of the normal recovery path.

## Official Documentation

- [etcd corruption detection and recovery](https://etcd.io/docs/v3.7/op-guide/data_corruption/)
- [Runtime membership changes](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [Disaster recovery and force-new-cluster caveats](https://etcd.io/docs/v3.7/op-guide/recovery/)
- [WAL decoder implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/storage/wal/decoder.go)
