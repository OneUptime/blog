# How to Repair a MongoDB Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Recovery, Administration

Description: Learn how to repair a MongoDB database after an unclean shutdown or data corruption using mongod --repair and WiredTiger recovery options.

---

MongoDB is designed to recover automatically from unclean shutdowns using its journal. However, in cases of disk corruption or severe failure, you may need to run a manual repair. This guide walks through the repair process and its implications.

## When to Repair

You should consider repairing MongoDB if:

- The server fails to start after an unclean shutdown and journal recovery does not help.
- Disk corruption is suspected.
- You see errors like `Unclean shutdown detected` in the logs.

Check logs first:

```bash
sudo tail -n 100 /var/log/mongodb/mongod.log
```

## Running mongod --repair

The `--repair` flag rebuilds MongoDB's data files and indexes. It modifies data in place.

**Always take a backup before repairing:**

```bash
sudo cp -r /var/lib/mongodb /var/lib/mongodb.bak
```

Stop the MongoDB service:

```bash
sudo systemctl stop mongod
```

Run the repair:

```bash
sudo -u mongodb mongod --repair --dbpath /var/lib/mongodb
```

Wait for the process to complete - it may take several minutes for large databases. On success you will see:

```text
[main] repair complete
```

## Repair When Disk Space Is Limited

The repair process requires free disk space on the same volume as the data files. If disk space is limited, copy the data directory to a volume with sufficient space and repair there:

```bash
sudo cp -r /var/lib/mongodb /mnt/larger-volume/mongodb
sudo -u mongodb mongod --repair --dbpath /mnt/larger-volume/mongodb
```

After the repair completes, copy the repaired files back to the original location.

## WiredTiger Recovery Options

MongoDB's `--repair` flag internally uses WiredTiger's salvage functionality to recover corrupt data files. For advanced recovery scenarios where `--repair` alone does not resolve the issue, you can pass the `salvage=true` option directly to the WiredTiger engine:

```bash
sudo -u mongodb mongod --dbpath /var/lib/mongodb --wiredTigerEngineConfigString "salvage=true"
```

Note that this is an advanced, undocumented technique that bypasses MongoDB's controlled repair workflow. In most cases, `mongod --repair` is the recommended approach.

## After Repair: Validate Collections

Once MongoDB starts after a repair, validate key collections:

```javascript
use mydb
db.runCommand({ validate: "orders", full: true })
```

Look for `valid: true` in the output. If validation fails, restore from your backup instead.

## Indexes After Repair

The `mongod --repair` command automatically rebuilds all indexes as part of the repair process (since MongoDB 4.0.3). In most cases, no separate index rebuild is needed.

If you suspect an index is still corrupt after repair, drop and recreate it:

```javascript
use mydb
db.orders.dropIndex("index_name")
db.orders.createIndex({ fieldName: 1 })
```

## Replica Set Considerations

On a replica set, do not repair the primary. Instead:
1. Remove the member from the replica set.
2. Repair the standalone instance.
3. Resync by performing an initial sync, or add back to the replica set and let it sync automatically.

```javascript
// On the primary - remove the member
rs.remove("repaired-host:27017")
```

After repair, re-add it:

```javascript
rs.add("repaired-host:27017")
```

## Summary

MongoDB repair (`mongod --repair`) reconstructs data files and rebuilds all indexes after corruption or an unclean shutdown. Always back up data before running repair. On replica sets, prefer resyncing over repairing to minimize downtime.
