# How to Perform a Rolling Restart of a MongoDB Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Administration, High Availability, Database

Description: Learn how to perform a zero-downtime rolling restart of a MongoDB replica set, applying config changes or upgrades to each member one at a time.

---

A rolling restart restarts each replica set member sequentially, ensuring the set remains available throughout the process. This technique is used when applying configuration changes, OS patches, or MongoDB version upgrades without downtime.

## Prerequisites

- A replica set with at least 3 members
- Majority of members must remain healthy throughout
- Current user must have `clusterAdmin` or equivalent role

## High-Level Order

1. Restart secondary members one at a time
2. Step down the primary
3. Restart the former primary (now a secondary)

This order maintains write availability - the primary stays online until a new one is elected.

## Step 1 - Identify Members

```javascript
rs.status().members.map(m => ({ host: m.name, state: m.stateStr }))
```

Output:

```text
[
  { host: 'mongo1:27017', state: 'PRIMARY' },
  { host: 'mongo2:27017', state: 'SECONDARY' },
  { host: 'mongo3:27017', state: 'SECONDARY' }
]
```

## Step 2 - Restart Each Secondary

SSH to the secondary and restart the `mongod` process. If using systemd:

```bash
sudo systemctl restart mongod
```

Wait for the member to rejoin before moving to the next:

```javascript
// Run on primary until mongo2 shows SECONDARY
rs.status().members.find(m => m.name === "mongo2:27017").stateStr
```

Repeat for all secondaries.

## Step 3 - Step Down the Primary

Connect to the current primary and initiate a stepdown:

```javascript
rs.stepDown(60)  // step down and remain ineligible for re-election for 60 seconds
```

MongoDB will elect a new primary. Confirm the new primary:

```javascript
db.hello().primary
```

## Step 4 - Restart the Former Primary

Now that it is a secondary, restart it safely:

```bash
sudo systemctl restart mongod
```

Wait for it to show `SECONDARY` in `rs.status()`.

## Verify Replication is Healthy

```javascript
rs.printSecondaryReplicationInfo()
```

Check that replication lag is near zero for all members.

## Automating with a Script

```bash
#!/bin/bash
MEMBERS=("mongo2:27017" "mongo3:27017")

for host in "${MEMBERS[@]}"; do
  echo "Restarting secondary $host..."
  ssh "${host%%:*}" "sudo systemctl restart mongod"

  echo "Waiting for $host to become SECONDARY..."
  until mongosh --host "$host" --quiet --eval \
    'rs.status().myState === 2' 2>/dev/null | grep -q true; do
    sleep 5
  done
  echo "$host is SECONDARY again."
done

echo "Stepping down primary..."
mongosh --host "mongo1:27017" --eval 'rs.stepDown()'
sleep 10

echo "Restarting former primary mongo1..."
sudo systemctl restart mongod
```

## Rolling Restart for Config Changes

If you change `mongod.conf` (e.g., update WiredTiger cache size), edit the file on each member before restarting it. The config takes effect on restart.

```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4
```

## Summary

A rolling restart restarts secondaries first, steps down the primary, then restarts the former primary last. This keeps the replica set writable throughout. Always wait for each member to fully rejoin before proceeding to the next, and verify replication lag after completing all restarts. Automate the process with a script that polls `rs.status()` rather than using fixed sleep intervals.

