# Recover JuiceFS After Redis Loss Using a Retained Metadata Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: JuiceFS, Redis, Disaster Recovery

Description: Recover JuiceFS metadata into an empty replacement database, preserve the original objects, and validate the recovery point before allowing writers back.

Losing Redis does not necessarily erase JuiceFS file contents, but surviving objects are not enough to reconstruct a usable filesystem. Metadata connects filenames and inodes to the stored data blocks. Recovery must preserve that relationship.

This procedure targets **JuiceFS Community Edition 1.4.2** and an existing volume with a retained automatic metadata backup. It assumes you have access to its object storage, encryption keys where applicable, and a separately provisioned empty replacement metadata database. It is not a procedure for resetting a Redis instance in place.

## Preserve the original state first

Stop application writers and fence every old JuiceFS client, including gateways, scheduled jobs, and hosts that might reconnect after Redis returns. Fencing means preventing those clients from resuming access, not merely asking applications to pause briefly. Keep a record of the old metadata endpoint and its users.

Do not run the recovered metadata engine and the old one against the same object namespace concurrently. They can disagree about block ownership and deletion. The pinned `load` command explicitly warns against simultaneous use of old and new engines. [JuiceFS load implementation](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/load.go).

Preserve any Redis persistence files or provider snapshots before choosing a recovery source. A valid Redis-native recovery may have a better recovery point than an older JuiceFS export. Redis RDB snapshots and append-only files have different durability properties; inspect them using your database recovery procedure rather than replacing files on the failed host experimentally. [Redis persistence documentation](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/).

Suspend destructive storage lifecycle actions and scheduled garbage collection while the incident is being assessed. Retain client staging directories if writeback was enabled. Do not clear them to reclaim space during recovery.

## Find the actual completed backup

JuiceFS normally makes periodic metadata exports into object storage. In 1.4.2, the automatic backup implementation writes gzip-compressed JSON named `dump-<UTC timestamp>.json.gz` under the volume's `meta/` prefix. Use the storage provider's inventory or browser to identify the exact volume prefix; this directory is not a normal directory visible through a JuiceFS mount.

The configured interval is not proof of a recent successful backup. The implementation can skip backups when an interval of at most one hour meets a filesystem with more than one million inodes. Failed uploads also leave you without the expected recovery point. Check the actual retained object and successful-backup logs. [Pinned automatic backup implementation](https://github.com/juicedata/juicefs/blob/v1.4.2/pkg/vfs/backup.go).

Copy the selected object into a protected recovery workspace, retaining its original object key, version identifier if supported, timestamp, size, and transfer checksum. Keep an untouched copy. The checksum detects an altered transfer; it does not establish application consistency.

```mermaid
flowchart LR
  A[Fence old clients] --> B[Preserve objects and backup]
  B --> C[Load empty replacement database]
  C --> D[Check metadata and object references]
  D --> E[Read-only application review]
  E --> F[Controlled write test]
  F --> G[Resume approved writers]
```

## Understand what the recovery point can contain

A metadata dump is not a coordinated application snapshot. An automatic export taken while writes were active may describe operations from different moments. A database stored inside JuiceFS may need its own recovery logs or an application-specific backup even when files can be opened.

Objects written after the selected metadata backup may survive in the bucket without any filename pointing to them. Conversely, an older backup may reference blocks that were subsequently deleted. Retaining the newest bucket contents does not guarantee that an old metadata export is usable. [JuiceFS backup consistency guidance](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/administration/metadata_dump_load.md#backup).

Document the last known good application checkpoint and compare it with the export time. Do not promise an hourly recovery-point objective solely because hourly backups were configured. The acceptable recovery point is a business and application decision supported by the available evidence.

## Load into a dedicated empty destination

Have the database owner provision an isolated replacement Redis database with suitable persistence, authentication, TLS, and capacity. Confirm it contains no unrelated keys. Do not format a new JuiceFS volume before loading: the backup already carries the volume identity and storage configuration.

For an unencrypted automatic JSON backup, use this pattern after replacing every example path and endpoint:

```bash
export META_PASSWORD_FILE=/etc/juicefs/recovery-meta-password
replacement='rediss://juicefs@redis-recovery.example.internal:6379/1'
backup='/srv/recovery/SELECTED-dump.json.gz'
juicefs load "$replacement" "$backup"
```

The password file must be provisioned securely, and the recovery host must trust the Redis server's certificate. The command writes metadata to the replacement database. It does not restore object-storage data or validate application files. Stop on any error; do not clear a nonempty database just to make the command proceed. [Metadata connection configuration](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/reference/how_to_set_up_metadata_engine.md).

A manually produced binary backup requires `--binary`; its filename alone does not select the format. Automatic JSON backups in this release should not be passed that flag.

For an encrypted volume, automatic backups are encrypted too. Recovery requires the retained original RSA private key and the matching algorithm, plus `JFS_RSA_PASSPHRASE` when the key is passphrase-protected. Provision the passphrase through your secret-management process. Use the documented `--encrypt-rsa-key` and `--encrypt-algo` load options. Generating a replacement key will not decrypt the existing backup. [JuiceFS encryption design](https://github.com/juicedata/juicefs/blob/v1.4.2/docs/en/security/encryption.md).

## Restore access without changing volume identity

Inspect the restored configuration with `juicefs config "$replacement"` and compare the volume UUID, name, storage type, bucket, and encryption settings with your recovery record. Treat configuration output as sensitive operational information.

Exports can omit object-storage secrets. Restore credentials through the supported configuration mechanism and your secret-management process; do not change the bucket or format a new volume to bypass an authentication failure. Check whether credentials use a renewable identity or an expired session token. [Pinned configuration implementation](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/config.go).

With old clients fenced and object access verified, run the consistency checker without repair options:

```bash
juicefs fsck "$replacement"
```

This checks metadata references against stored objects and can be expensive for a large volume. Reserve time and capacity for it. A successful result does not validate application transactions or recover files absent from the backup. Do not add `--repair` or launch garbage collection as an automatic follow-up. [Pinned fsck implementation](https://github.com/juicedata/juicefs/blob/v1.4.2/cmd/fsck.go).

Mount the recovered volume read-only on an isolated validation host. Compare important paths, ownership, file sizes, and known checksums with independent records. Have application owners assess recoverability before introducing writes. Keep the original endpoint fenced throughout.

## Reopen access in a controlled order

After the recovery point is accepted, enable a limited test writer against the replacement. Verify create, flush, read from another approved client, and deletion of that test file. Then resume normal writers gradually and watch metadata errors, object failures, and backup completion.

Keep pre-recovery artifacts and object versions through the agreed retention window. Unreferenced objects may be the remaining evidence of newer lost files; reclamation is a later, separately reviewed decision.

Local validation exercised gzip JSON dump/load with the official 1.4.2 binary and temporary empty SQLite metadata, confirming preserved volume identity and rejection of an already-used destination. It also checked binary-backup inspection. It did not simulate Redis loss, restore real file blocks, decrypt an automatic backup, or run a FUSE mount. Those remain necessary recovery-rehearsal steps for your environment.
