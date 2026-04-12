# How to Upgrade MongoDB Version Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Upgrade, Operation, Administration, Maintenance

Description: A step-by-step guide to safely upgrading MongoDB version on standalone instances and replica sets, covering pre-upgrade checks, the rolling upgrade process, and feature compatibility verification.

---

## Upgrade Strategy Overview

MongoDB upgrades should always be done one major version at a time (e.g., 6.0 to 7.0, not 5.0 to 7.0). For patch versions (e.g., 6.0.5 to 6.0.8), upgrade directly. For replica sets, use a rolling upgrade to maintain availability.

```mermaid
flowchart TD
    V1[Current Version: 6.0] --> Check[Pre-upgrade Checks]
    Check --> Backup[Take Full Backup]
    Backup --> RS[Replica Set Rolling Upgrade]
    RS --> S1[Upgrade Secondary 1]
    S1 --> S2[Upgrade Secondary 2]
    S2 --> PD[Step Down Primary]
    PD --> PP[Upgrade Old Primary]
    PP --> FCV[Set Feature Compatibility Version]
    FCV --> Done[Upgrade Complete]
```

## Step 1: Pre-Upgrade Checks

**Check current version and FCV:**

```javascript
db.version()                                          // MongoDB server version
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

**Review the MongoDB upgrade guide:**

Check the official MongoDB upgrade documentation for your specific version pair at `docs.mongodb.com`. Look for deprecated features, removed commands, and behavioral changes.

**Check driver compatibility:**

Ensure your application drivers support the target MongoDB version. The MongoDB driver compatibility matrix is at `www.mongodb.com/docs/drivers/`.

**Check for deprecated operations:**

In MongoDB 6.0+, check for usage of deprecated APIs:

```javascript
db.adminCommand({ setParameter: 1, logLevel: 1 })
// Then check logs for deprecation warnings
```

**Validate data integrity:**

```javascript
// Validate a sample of critical collections
db.orders.validate({ full: false })
db.users.validate({ full: false })
```

Expected: `valid: true` in the output.

## Step 2: Back Up Before Upgrading

Never upgrade without a verified backup.

Using `mongodump`:

```bash
mongodump \
  --uri "mongodb://admin:password@127.0.0.1:27017/?authSource=admin" \
  --out /backup/pre-upgrade-$(date +%Y%m%d) \
  --gzip
```

Or create a filesystem snapshot if using LVM or a cloud block volume:

```bash
sudo lvcreate -L 20G -s -n mongodb-backup /dev/vg0/mongodb-data
```

Verify the backup is readable before proceeding.

## Step 3: Upgrade a Standalone Instance

Stop MongoDB:

```bash
sudo systemctl stop mongod
```

Install the new version (Ubuntu/Debian example from 6.0 to 7.0):

```bash
# Import GPG key for new version
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Add new repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install new version
sudo apt-get update
sudo apt-get install -y mongodb-org
```

Start MongoDB:

```bash
sudo systemctl start mongod
```

Verify the version:

```bash
mongosh --eval "db.version()"
```

## Step 4: Rolling Upgrade for a Replica Set

A rolling upgrade upgrades one member at a time, maintaining availability throughout.

**Check replica set status before starting:**

```javascript
rs.status()
```

All members should be healthy (state PRIMARY or SECONDARY).

**Upgrade Secondary 1:**

Connect to the first secondary and stop it:

```bash
# SSH to secondary-1
sudo systemctl stop mongod
```

Install the new version on secondary-1:

```bash
# Install new MongoDB packages (same as standalone procedure)
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

Wait for it to rejoin the replica set:

```javascript
// On the primary
rs.status()
// Wait until secondary-1 shows state: SECONDARY
```

**Upgrade Secondary 2:**

Repeat the same process for secondary-2.

**Step down and upgrade the Primary:**

```javascript
// On the current primary - step it down to secondary
rs.stepDown(120)   // step down for 120 seconds
```

Wait for a new primary to be elected:

```javascript
rs.status()  // confirm a new member is now PRIMARY
```

Upgrade the old primary (now a secondary):

```bash
sudo systemctl stop mongod
# Install new version
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

Verify all three members are healthy with the new version:

```javascript
rs.status()
```

## Step 5: Update Feature Compatibility Version

After all replica set members are on the new version, update the Feature Compatibility Version (FCV). This enables new features and is a one-way operation for many versions.

```javascript
// Run on the primary
db.adminCommand({ setFeatureCompatibilityVersion: "7.0", confirm: true })
```

Confirm the FCV was updated:

```javascript
db.adminCommand({ getParameter: 1, featureCompatibilityVersion: 1 })
```

Expected output:

```text
{ featureCompatibilityVersion: { version: "7.0" }, ok: 1 }
```

**Important**: Do not update the FCV until all replica set members have been upgraded. Updating FCV before all members are on the new version can cause issues.

## Step 6: Verify Application Compatibility

After upgrading:

1. Run your integration test suite against the upgraded MongoDB.
2. Watch application logs for MongoDB driver errors or deprecation warnings.
3. Monitor `db.serverStatus()` for error spikes.

```javascript
db.serverStatus().asserts
db.serverStatus().opcounters
db.serverStatus().connections
```

## Upgrading from 5.0 to 7.0 (Multi-Step)

MongoDB only supports single major version upgrades. From 5.0 to 7.0, you must go through 6.0:

```text
5.0 -> 6.0 (upgrade, update FCV to 6.0)
6.0 -> 7.0 (upgrade, update FCV to 7.0)
```

After upgrading to 6.0, update FCV to 6.0, run your tests, then proceed to upgrade to 7.0.

## Downgrade Procedure

If issues arise after upgrading, downgrade before updating the FCV. Downgrading after FCV has been set to the new version requires restoring from backup.

While FCV is still at the old version:

```bash
sudo systemctl stop mongod
sudo apt-get install -y mongodb-org=6.0.x  # specify exact old version
sudo systemctl start mongod
```

If FCV was already updated to the new version, restore from your pre-upgrade backup.

## Common Issues

**mongod fails to start after upgrade:**
- Check the journal for errors: `sudo journalctl -u mongod --no-pager | tail -50`
- Verify `mongod.conf` has no deprecated options removed in the new version.

**Replica set member stuck in STARTUP2:**
- Initial sync may be restarting. Wait for it to complete or check for disk space issues.

**Application errors after upgrade:**
- Check driver compatibility.
- Look for deprecated query operators or options.

**FCV update fails:**
- All members must be running the same new version before updating FCV.

## Best Practices

- Read the full release notes and upgrade notes for every version in the upgrade path.
- Test the upgrade on a staging environment with a restored copy of production data before touching production.
- Always back up before upgrading; verify the backup is restorable.
- Do rolling upgrades on replica sets to maintain availability.
- Do not update FCV until all members are running the new version.
- Keep the old version packages available locally in case a quick downgrade is needed.

## Summary

Safely upgrading MongoDB requires pre-upgrade checks (version, FCV, driver compatibility), a verified backup, and a rolling upgrade on replica sets. Upgrade secondaries first, then step down the primary and upgrade it last. After all members are on the new version, update the Feature Compatibility Version to unlock new features. Test application compatibility after the upgrade and monitor for errors before considering the upgrade complete.
