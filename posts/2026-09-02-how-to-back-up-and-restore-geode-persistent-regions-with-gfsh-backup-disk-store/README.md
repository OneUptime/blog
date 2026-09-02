# Back Up and Restore Geode Persistent Regions with `gfsh`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Backup, Disaster Recovery, Data Persistence, Storage

Description: Create, validate, retain, and restore full or incremental Geode disk-store backups across every persistent member without copying live oplogs.

---

Apache Geode's `backup disk-store` command backs up persistent disk stores while the cluster remains online. It coordinates with the running members so concurrent cache operations do not corrupt the backup, creates a timestamped backup tree, and writes a restore script for each backed-up member.

The command does not make separate application writes atomic. In particular, a persistent region update and the corresponding write to a persistent asynchronous event queue or gateway-sender queue are separate disk operations. Apache recommends taking the backup while region operations are quiescent so the backup cannot fall between those writes and capture inconsistent region and queue state.

The command is cluster-wide despite its singular name. A usable recovery requires the output from **every** member holding persistent data, including PDX metadata and persistent gateway sender queues. A successful command on one member or a copied subset of oplogs is not a cluster backup.

## Know What the Online Backup Includes

A full online backup includes, for each participating member:

- disk-store files containing persistent region and queue data;
- PDX metadata when it is persisted in a disk store;
- deployed JARs;
- the member's startup `gemfire.properties` and `cache.xml` when used;
- files and directories declared with `<backup>` in `cache.xml`; and
- `restore.sh` on Unix-like systems or `restore.bat` on Windows.

The saved configuration files are reference material and are not automatically restored. That protects newer configuration from being silently overwritten, but it also means the operator must restore or recreate compatible cluster configuration deliberately.

Indexes are not persisted in disk stores. Restore their definitions through cluster configuration or deployment automation and allow Geode to rebuild them.

## Prepare the Destination on Every Member

`backup disk-store` is an online command and requires `gfsh` to be connected to a JMX manager. The directory passed to `--dir` must already exist and be writable from every member process that will back up a disk store.

There are two valid layouts:

- a shared filesystem mounted at the same path on all members; or
- a host-local directory that happens to have the same path on each host.

With host-local paths, the outputs live on different machines even though `gfsh` shows one directory string. Your backup system must collect every host's timestamped tree before calling the run complete.

Keep the backup destination off the disk-store data volume. A backup that fills the production volume can trigger Geode's disk critical threshold and close the cache. Ensure the destination has capacity for the full backup or the new incremental files, plus filesystem overhead and retention.

Example preparation outside Geode:

```text
/mnt/geode-backups/
  owner: geode
  mode: 0700
  free space: sized for policy and growth
```

Restrict access because disk-store backups contain application data and configuration material. Use storage encryption and protected transport appropriate to the environment.

## Verify Every Persistent Member Is Online

The command asks running members to back up their stores. An offline member cannot participate. Before the run:

```text
gfsh> list members
gfsh> list disk-stores
gfsh> show missing-disk-stores
```

Compare these results with an inventory of expected members and disk stores. The backup output does not identify every offline member that might host a persistent replicated region, so “all returned rows succeeded” is not enough if the expected inventory is incomplete.

Also check that PDX persistence is enabled when persistent regions contain PDX values and that its store is included. Restoring PDX bytes without their registry metadata can make the data unusable.

## Run a Full Online Backup

Connect to the cluster and run:

```text
gfsh> backup disk-store --dir=/mnt/geode-backups
```

Geode creates a new timestamp-named subdirectory under the supplied path. The command can reuse the parent directory on later runs; do not point retention cleanup at the parent without resolving individual backup sets first.

Capture the command output. For each member it reports the member name, disk-store UUID, directory, and host. Reconcile that table with the pre-run inventory.

Afterward, search the new tree for `INCOMPLETE_BACKUP`. A member that fails to finish leaves this marker in its highest-level backup directory. Any backup set containing it is partial and must not be used for restore.

An operational success gate should require all of the following:

```text
expected members == reported successful members
expected stores are represented
no INCOMPLETE_BACKUP exists
backup files reached protected storage
offline validation completed
restore drill is within its freshness target
```

## Create Incremental Backups Without Breaking the Chain

An incremental backup uses a previous backup directory as a baseline:

```text
gfsh> backup disk-store \
  --dir=/mnt/geode-backups \
  --baseline-dir=/mnt/geode-backups/2026-09-01-02-00-00
```

The incremental set copies oplogs not already present in the baseline. Its generated restore scripts refer explicitly to files in earlier backups in the chain. Therefore:

- keep every referenced baseline and intermediate incremental set;
- move a chain only if script paths and storage layout remain valid;
- never compact a baseline backup directory;
- validate retention changes against the latest restore script; and
- periodically take a new full backup to bound chain length and restore complexity.

If a member was absent from the baseline or did not exist then, that member writes a full backup into the incremental set. If an incomplete set is supplied as the next `--baseline-dir`, that member writes a full backup rather than trusting the broken chain; unaffected members can still use their valid baselines. Do not assume that missing or corrupted files inside an otherwise selected baseline chain will be repaired automatically; validate the retained chain and periodically start a new full baseline.

Do not infer recoverability from a small incremental directory. Its restore depends on the retained chain.

## Validate the Backed-Up Disk Stores Offline

Validation is an offline disk-store operation. Run it against the backup copies, not a disk store owned by a running member. An incremental directory is not a complete disk store because unchanged oplogs remain in earlier sets. Materialize the chain in a disposable recovery environment by running its generated restore script against empty target paths, then validate the restored copies. For a full set, resolve the directory or directories containing each store's backup files and run:

```text
gfsh> validate offline-disk-store \
  --name=OrdersStore \
  --disk-dirs=/mnt/geode-backups/2026-09-02-02-00-00/server-1/diskstores/OrdersStore/dir0
```

The generated path contains a member directory based on member identity and, beneath `diskstores`, a disk-store directory named from the store name and disk-store ID; do not assume the simplified example path. If a disk store uses multiple directories, provide all corresponding directories from the same full or materialized store as a comma-separated list.

Validation reports region entry and bucket counts plus compactable records. Save those results with the backup manifest and compare them with expected region and bucket inventories. Validation finds structural problems; it does not replace an application-level restore test.

Avoid modifying a retained backup. Run compaction experiments, exports, or startup tests on a disposable copy so the source set and its checksums remain immutable.

## Inspect the Generated Restore Scripts Before an Incident

Each member directory contains `restore.sh` or `restore.bat`. The script copies disk-store files back to their original locations and also restores declared custom backup items. Inspect it during backup validation:

```text
less /mnt/geode-backups/<timestamp>/<member-directory>/restore.sh
```

Confirm:

- which original host and directories it targets;
- whether all mounted paths exist in the recovery environment;
- which baseline and incremental directories it references;
- which user must run it; and
- how much free space each destination needs.

The script refuses to overwrite files with the same names. That is a safety feature. Do not weaken it during an incident by deleting unknown live files; preserve the failed or current disk-store directories separately, then restore into verified empty target paths according to the recovery plan.

## Restore with Every Cache Member Offline

A standard same-topology restore is an offline procedure:

1. Stop clients and all cache members that can access the target disk stores.
2. Preserve logs and the current disk directories for forensic or rollback use.
3. Confirm that restore target paths are empty and have correct ownership and capacity.
4. Run each member's restore script on the host where that backup originated.
5. Validate every restored offline disk store.
6. Restore or recreate compatible properties, cluster configuration, deployed application code, certificates, and secrets as applicable.
7. Start all members with persistent data at roughly the same time, then start non-persistent members and clients.
8. Verify missing-disk-store state, region sizes, bucket redundancy, PDX reads, gateway queues, and application invariants.

Example:

```text
$ cd /mnt/geode-backups/<timestamp>/<server-1-directory>
$ ./restore.sh
```

Repeat with the generated script for every backed-up member. A partitioned region is distributed across member stores; restoring only one server is not equivalent to restoring the region.

If a startup waits for a disk store, inspect:

```text
gfsh> show missing-disk-stores
```

Do not reflexively run `revoke missing-disk-store`. Revocation is irreversible for that disk-store identity and can discard the newest known copy. First confirm whether the expected member or restored path simply has not started.

## Keep Topology Changes Separate from Disaster Restore

File-level backup and restore is simplest when the number and type of members and their disk-store layout remain the same. If the recovery target intentionally changes the number or kind of members, Geode's region snapshot export/import workflow is usually the more appropriate migration mechanism.

Do not combine “restore production” with an untested repartition, disk-store rename, region rename, PDX schema migration, or major application change. Recover the known topology first, verify it, then perform a separately tested migration.

## Test Recovery, Not Only Backup Creation

A restore drill should start an isolated cluster from disposable copies and prove:

- every expected region exists and has plausible entry and bucket counts;
- sample values deserialize, including old PDX versions;
- indexes can be recreated and queries return expected results;
- partition redundancy recovers;
- persistent gateway sender queues and PDX metadata behave correctly;
- application checksums or business invariants pass; and
- recovery time and recovery point objectives are met.

Record the Geode and JDK versions used to make and restore the backup. Rehearse version changes separately and follow the official upgrade path rather than treating a disk restore as an upgrade mechanism.

## Avoid Unsupported Shortcuts

Do not:

- use `cp`, `rsync`, or a storage snapshot against individual oplog files while the member is online;
- assume redundancy or another WAN site is a backup;
- accept a set containing `INCOMPLETE_BACKUP`;
- delete a baseline still referenced by incremental restore scripts;
- restore region data without PDX metadata;
- overwrite current store files in place; or
- validate only one member of a partitioned region.

When an offline cluster is intentionally backed up using filesystem tools, stop every owning process and copy every file from every directory of each disk store as one unit. For a running cluster, use `backup disk-store`.

## Conclusion

Treat `backup disk-store` as a cluster-wide recovery workflow: inventory every persistent member, write to a safe destination, reject incomplete sets, retain complete incremental chains, validate each store, and rehearse the generated restore scripts in isolation. The backup command creates the artifacts; inventory reconciliation and restore testing establish that they can recover the system.

## Official References

- [Creating backups for system recovery and operational management](https://geode.apache.org/docs/guide/latest/managing/disk_storage/backup_restore_disk_store.html)
- [`backup disk-store` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/backup.html)
- [Disk-store management commands and online/offline rules](https://geode.apache.org/docs/guide/latest/managing/disk_storage/managing_disk_stores_cmds.html)
- [Validating a disk store](https://geode.apache.org/docs/guide/latest/managing/disk_storage/validating_disk_store.html)
- [Starting and shutting down with disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/starting_system_with_disk_stores.html)
- [Handling missing disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/handling_missing_disk_stores.html)
- [Building a new region with existing content](https://geode.apache.org/docs/guide/latest/basic_config/data_regions/new_region_existing_data.html)
