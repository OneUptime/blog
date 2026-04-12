# How to Plan MongoDB Maintenance Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Maintenance, Operation

Description: Plan and execute MongoDB maintenance windows safely using rolling restarts, pre-checks, communication templates, and rollback procedures.

---

## Why Maintenance Planning Matters

Unplanned MongoDB changes cause outages. Proper maintenance windows minimize risk by combining preparation, stakeholder communication, step-by-step procedures, and rollback plans. Whether you are upgrading MongoDB, applying OS patches, or resizing storage, the process is the same.

## Pre-Maintenance Checklist

Run these checks 24 hours before the window:

```bash
# Verify replica set is healthy
mongosh --eval "rs.status().members.forEach(m => print(m.name, m.stateStr, m.health))"

# Check oplog window (should be >48 hours for safety)
mongosh --eval "rs.printReplicationInfo()"

# Verify disk space on all nodes
df -h /var/lib/mongodb

# Check for any long-running operations
mongosh --eval "db.currentOp({ secs_running: { \$gt: 10 } })"

# Take a pre-maintenance snapshot
aws ec2 create-snapshot --volume-id vol-xxxxxxxx --description "pre-maintenance-$(date +%Y%m%d)"
```

## Communication Template

```text
Subject: MongoDB Maintenance Window - [Date] [Time] UTC

What: MongoDB version upgrade / OS patching / storage resize
When: [Date] from [Start Time] to [End Time] UTC
Impact: Up to 30 seconds of write unavailability during primary election
Risk: Low - rolling restart across replica set members

Pre-window checks: [Date] 09:00 UTC
Rollback trigger: Any member fails to rejoin within 10 minutes

Contact: [On-call engineer] via [Slack channel]
```

## Rolling Restart Procedure

For a three-node replica set, always restart secondaries first:

```bash
# Step 1: Restart secondary 1
ssh mongo2 "sudo systemctl restart mongod"
# Wait for it to rejoin as SECONDARY
mongosh --host mongo1 --eval "rs.status()" | grep -A3 "mongo2"

# Step 2: Restart secondary 2
ssh mongo3 "sudo systemctl restart mongod"
# Wait for SECONDARY state
mongosh --host mongo1 --eval "rs.status()" | grep -A3 "mongo3"

# Step 3: Step down the primary (triggers election, 10-30 sec window)
mongosh --host mongo1 --eval "rs.stepDown(60)"
# mongo1 will become a secondary; mongo2 or mongo3 will be elected primary

# Step 4: Restart the former primary
ssh mongo1 "sudo systemctl restart mongod"
```

## Version Upgrade Procedure

For a MongoDB major version upgrade:

```bash
# On each secondary in turn:
sudo apt-get install -y mongodb-org=7.0.x

# After all secondaries are on new version, step down primary
mongosh --eval "rs.stepDown()"

# Upgrade the former primary last
sudo apt-get install -y mongodb-org=7.0.x

# Set the FCV after all nodes are on new version
mongosh --eval "db.adminCommand({ setFeatureCompatibilityVersion: '7.0', confirm: true })"
```

## Rollback Procedure

```bash
# If a node fails to rejoin within 10 minutes, restore from snapshot
aws ec2 create-volume \
  --snapshot-id snap-xxxxxxxx \
  --availability-zone us-east-1a \
  --volume-type gp3

# Detach failed volume and attach restored one
aws ec2 detach-volume --volume-id vol-bad
aws ec2 attach-volume --volume-id vol-restored --instance-id i-xxxxxxxx --device /dev/sdf
```

## Post-Maintenance Verification

```bash
mongosh --eval "rs.status()"
mongosh --eval "db.serverStatus().version"
mongosh --eval "db.adminCommand({ ping: 1 })"
```

## Summary

Successful MongoDB maintenance windows require four phases: preparation (health checks, snapshots, communication), execution (rolling restart with secondary-first ordering), monitoring (replica set state at each step), and rollback readiness (snapshot IDs ready before you start). Keep your maintenance procedure in a shared runbook so any engineer can execute it confidently.
