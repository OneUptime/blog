# How to Perform Rolling Upgrades on a MongoDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Upgrade, Cluster, Replica Set, Availability

Description: Learn how to perform rolling upgrades on a MongoDB cluster to minimize downtime by upgrading one node at a time while keeping the cluster operational.

---

Rolling upgrades allow you to update your MongoDB cluster to a new version without taking the entire deployment offline. The process upgrades secondary members first, then steps down and upgrades the primary last.

## Prerequisites

Before starting, verify the current version across all nodes and review the MongoDB upgrade path documentation. MongoDB only supports upgrading one major version at a time (e.g., 6.0 to 7.0).

```bash
mongosh --eval "db.version()"
```

Check the replica set status to confirm all members are healthy:

```javascript
rs.status()
```

You should see all members in `PRIMARY` or `SECONDARY` state with no lag before proceeding.

## Step 1 - Upgrade Secondary Members

Stop the `mongod` process on the first secondary, install the new version, and restart:

```bash
# On each secondary node
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=7.0.0
sudo systemctl start mongod
```

Monitor the secondary as it rejoins the replica set and catches up on the oplog:

```javascript
rs.printSecondaryReplicationInfo()
```

Wait until `syncedTo` is within a few seconds of the primary before moving to the next secondary. Repeat for all secondaries.

## Step 2 - Step Down the Primary

Once all secondaries are upgraded, step down the current primary to trigger an election:

```javascript
rs.stepDown(60)
```

This makes the primary become a secondary and allows one of the upgraded nodes to be elected as the new primary.

## Step 3 - Upgrade the Former Primary

After the election completes, upgrade the node that was previously primary:

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=7.0.0
sudo systemctl start mongod
```

Verify the cluster is healthy after it rejoins:

```javascript
rs.status()
```

## Step 4 - Set the Feature Compatibility Version

After all nodes are upgraded, update the feature compatibility version (FCV) to unlock new features:

```javascript
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

Verify the change took effect:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

## Monitoring During the Upgrade

Use OneUptime or another monitoring tool to track replica set health, replication lag, and application error rates during the upgrade window. Set up alerts for any node entering an unhealthy state.

```bash
# Check oplog window on each node
mongosh --eval "rs.printReplicationInfo()"
```

If replication lag spikes, pause the rolling process and allow the secondary to catch up before continuing.

## Rollback Considerations

If you encounter issues, you can downgrade before updating the FCV. Once the FCV is changed, rolling back becomes significantly more complex and may require a full restore.

## Summary

Rolling upgrades on MongoDB minimize downtime by upgrading secondaries first and then stepping down the primary. Always check replica set health between each step, wait for replication to catch up, and only update the feature compatibility version once all nodes are running the new version.
