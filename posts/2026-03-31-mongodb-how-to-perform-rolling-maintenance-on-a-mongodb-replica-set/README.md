# How to Perform Rolling Maintenance on a MongoDB Replica Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Replica Set, Rolling Maintenance, Upgrade, High Availability

Description: Learn how to perform rolling maintenance on a MongoDB replica set without downtime using stepdown and sequential secondary restart procedures.

---

## Introduction

Rolling maintenance allows you to apply updates, configuration changes, or operating system patches to a MongoDB replica set one member at a time, maintaining availability throughout. The process involves updating secondaries first, then stepping down and updating the primary. This approach ensures zero downtime as long as a majority of members are always available.

## Rolling Maintenance Process Overview

```text
1. Update/restart secondary 1
2. Wait for secondary 1 to rejoin and sync
3. Update/restart secondary 2
4. Wait for secondary 2 to rejoin and sync
5. Step down the primary
6. A secondary becomes the new primary
7. Update the old primary (now secondary)
8. Verify replica set health
```

## Step 1 - Check Replica Set Health Before Starting

```javascript
rs.status();
// Ensure all members are in PRIMARY or SECONDARY state
// Check no member is in RECOVERING or OTHER state
```

```javascript
// Verify replication lag is minimal
rs.printSecondaryReplicationInfo();
```

## Step 2 - Restart a Secondary

Connect to the secondary and restart it:

```bash
# Connect to secondary
mongosh --host secondary1:27017

# Verify it is a secondary
db.hello().isWritablePrimary  // Should be false

# Disconnect and restart the service
exit
```

```bash
sudo systemctl stop mongod
# Apply your maintenance (update package, change config, etc.)
sudo systemctl start mongod
```

## Step 3 - Wait for Secondary to Rejoin

After restarting, monitor the member's state:

```javascript
// Connect to primary and watch status
while (true) {
  const status = rs.status();
  const member = status.members.find(m => m.name === "secondary1:27017");
  print(`State: ${member.stateStr}, Lag: ${member.optimeDate}`);
  if (member.stateStr === "SECONDARY") break;
  sleep(2000);
}
```

Or from the shell:

```bash
# Watch until secondary comes back
watch -n 2 "mongosh --quiet --host primary:27017 --eval 'rs.status().members.map(m => ({name: m.name, state: m.stateStr}))'"
```

## Step 4 - Repeat for Each Secondary

Repeat steps 2 and 3 for all secondary members. Only proceed to the next member after the current one reaches `SECONDARY` state.

## Step 5 - Step Down the Primary

After all secondaries are updated, step down the primary to trigger an election:

```javascript
// Connect to the primary
mongosh --host primary:27017

// Step down for 60 seconds
rs.stepDown(60);
// MongoDB will elect a new primary within ~10-30 seconds
```

The shell connection will drop when the primary steps down. Reconnect to the new primary.

## Step 6 - Update the Former Primary (Now Secondary)

The former primary is now a secondary. Apply maintenance to it:

```bash
sudo systemctl stop mongod
# Apply maintenance
sudo systemctl start mongod
```

Wait for it to rejoin as a secondary:

```javascript
rs.status();
// Former primary should now appear as SECONDARY
```

## Step 7 - Verify Replica Set Health

```javascript
rs.status();
// All members should be PRIMARY or SECONDARY

rs.printSecondaryReplicationInfo();
// Lag should be minimal (< 10 seconds)

rs.conf();
// Verify configuration is as expected
```

## Handling Index Builds During Rolling Maintenance

For rolling index builds, stop each secondary, restart it as a standalone instance (without `--replSet`), build the index, then restart it as a replica set member:

```bash
# On each secondary: stop mongod, restart as standalone on a different port
sudo systemctl stop mongod
mongod --port 27218 --dbpath /var/lib/mongo --bind_ip localhost
```

```javascript
// Connect to the standalone instance and build the index
mongosh --port 27218
db.orders.createIndex({ customerId: 1, status: 1 });
```

```bash
# Stop the standalone instance and restart as a replica set member
# (use your normal mongod.conf which includes the replSet option)
sudo systemctl start mongod
```

Repeat for each secondary, then step down the primary and repeat on the former primary.

Note: The `background` option for index builds was deprecated in MongoDB 4.2. Starting in 4.2, all index builds use an optimized process that only holds the exclusive lock at the beginning and end of the build.

## Rolling Configuration Change Example

Changing `mongod.conf` settings without downtime:

```bash
# On secondary1
sudo nano /etc/mongod.conf
# Change: net.compression.compressors: snappy,zstd
sudo systemctl restart mongod

# Wait for secondary1 to rejoin...

# On secondary2
sudo nano /etc/mongod.conf
# Same change
sudo systemctl restart mongod

# Wait for secondary2 to rejoin...

# Step down primary, apply to former primary
mongosh --host primary:27017 --eval "rs.stepDown(60)"
# Wait for election...
sudo nano /etc/mongod.conf
sudo systemctl restart mongod
```

## Automating with a Script

```bash
#!/bin/bash
MEMBERS=("secondary1:27017" "secondary2:27017")
PRIMARY="primary:27017"

for MEMBER in "${MEMBERS[@]}"; do
  HOST="${MEMBER%%:*}"
  echo "Maintaining $MEMBER..."
  ssh "$HOST" "sudo systemctl stop mongod && sudo apt-get upgrade -y mongodb-org && sudo systemctl start mongod"

  echo "Waiting for $MEMBER to rejoin..."
  until mongosh --quiet --host "$PRIMARY" --eval \
    "rs.status().members.find(m => m.name === '$MEMBER').stateStr" | grep -q "SECONDARY"; do
    sleep 5
  done
  echo "$MEMBER rejoined"
done

echo "Stepping down primary..."
mongosh --host "$PRIMARY" --eval "rs.stepDown(60)"
sleep 30

PRIMARY_HOST="${PRIMARY%%:*}"
echo "Applying maintenance to former primary..."
ssh "$PRIMARY_HOST" "sudo systemctl stop mongod && sudo apt-get upgrade -y mongodb-org && sudo systemctl start mongod"
```

## Summary

Rolling maintenance on a MongoDB replica set enables zero-downtime updates by processing secondaries first and using `rs.stepDown()` to gracefully transfer primary duties before updating the final member. Always verify each member returns to `SECONDARY` state with minimal lag before proceeding to the next, check replica set health at each step, and automate the process with scripts to reduce human error during repetitive maintenance windows.
