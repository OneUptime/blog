# How to Set Up SAP HANA System Replication for Disaster Recovery on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, System Replication, Disaster Recovery, High Availability, Linux

Description: Configure SAP HANA System Replication on RHEL for disaster recovery, including synchronous and asynchronous modes for different RPO requirements.

---

SAP HANA System Replication (HSR) continuously replicates data from a primary HANA instance to one or more secondary instances. This provides both high availability and disaster recovery depending on the replication mode chosen.

## Replication Modes

- **SYNC:** Zero data loss. The primary waits for the secondary to acknowledge. Best for local HA.
- **SYNCMEM:** Near-zero data loss. The primary waits for the secondary to receive data in memory. Good balance.
- **ASYNC:** Minimal performance impact. Some data loss possible. Best for cross-region DR.

## Enabling Replication on the Primary

```bash
# Switch to the HANA admin user
su - hdbadm

# Check current replication status
hdbnsutil -sr_state

# Enable system replication on the primary
hdbnsutil -sr_enable --name=dc1_primary

# Verify replication is enabled
hdbnsutil -sr_state
```

## Backing Up the Primary

A full backup is required before registering a secondary:

```bash
# Create a full backup using hdbsql
hdbsql -u SYSTEM -p <password> -i 00 \
  "BACKUP DATA USING FILE ('initial_backup')"

# Or use HANA Studio / HANA Cockpit to create the backup
```

## Registering the Secondary (Same Region - SYNC)

On the secondary server for local HA:

```bash
su - hdbadm

# Stop HANA on the secondary
HDB stop

# Register as a synchronous secondary
hdbnsutil -sr_register \
  --name=dc1_secondary \
  --remoteHost=hana-primary \
  --remoteInstance=00 \
  --replicationMode=sync \
  --operationMode=logreplay

# Start HANA
HDB start
```

## Registering a DR Secondary (Cross-Region - ASYNC)

On a server in a remote datacenter for disaster recovery:

```bash
su - hdbadm

HDB stop

# Register as an asynchronous DR secondary
hdbnsutil -sr_register \
  --name=dc2_dr \
  --remoteHost=hana-primary \
  --remoteInstance=00 \
  --replicationMode=async \
  --operationMode=logreplay

HDB start
```

## Monitoring Replication

```bash
# Check replication status from the primary
su - hdbadm
python /usr/sap/HDB/HDB00/exe/python_support/systemReplicationStatus.py

# Quick status check
hdbnsutil -sr_state

# Check replication lag via SQL
hdbsql -u SYSTEM -p <password> -i 00 \
  "SELECT * FROM SYS.M_SERVICE_REPLICATION"
```

## Manual Takeover (DR Scenario)

If the primary fails and you need to promote the DR secondary:

```bash
# On the DR secondary
su - hdbadm

# Perform a takeover
hdbnsutil -sr_takeover

# Verify this node is now primary
hdbnsutil -sr_state
```

## Re-Registering the Former Primary

After the original primary is repaired:

```bash
# On the former primary (now becomes secondary)
su - hdbadm
HDB stop

hdbnsutil -sr_register \
  --name=dc1_primary \
  --remoteHost=hana-dr \
  --remoteInstance=00 \
  --replicationMode=async \
  --operationMode=logreplay

HDB start
```
