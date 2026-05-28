# Configure SAP HANA on Bare Metal Solution with High-Memory Server Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, Bare Metal Solution, SAP HANA, High Memory, Enterprise, SAP

Description: Learn how to configure SAP HANA on Google Cloud Bare Metal Solution using high-memory server profiles for enterprise SAP workloads with optimal performance.

---

SAP HANA is one of those workloads that pushes hardware to its limits. It is an in-memory database, which means your entire working dataset needs to fit in RAM, and it needs fast storage for persistence and logging. Google Cloud Bare Metal Solution provides the high-memory server profiles that SAP HANA demands, with configurations going up to 24 TB of RAM on a single server. These are SAP-certified servers, which matters when you need SAP support.

This guide covers configuring SAP HANA on BMS from server provisioning through HANA installation and performance optimization.

## Understanding BMS Server Profiles for SAP HANA

Google Cloud offers extra-large BMS server profiles specifically certified for SAP HANA:

| Profile | CPU Cores | vCPU | RAM | Use Case |
|---------|-----------|------|-----|----------|
| o2-ultramem-672-metal | 336 | 672 | 18 TB | Large scale-up OLTP deployments |
| o2-ultramem-896-metal | 448 | 896 | 24 TB | Largest scale-up OLTP deployments |

These are the same server families used by the largest SAP customers globally. They come with SAP-certified block storage mappings for HANA data, log, and shared volumes, plus backup options that include Cloud Storage through Backint.

## Prerequisites

- A Google Cloud project with Bare Metal Solution provisioned
- SAP HANA installation media from SAP Software Download Center
- A valid SAP HANA license
- Network connectivity between BMS and your GCP VPC
- A SAP-certified operating system image for the BMS server profile you ordered

## Step 1: Provision the BMS Server

Work with Google Cloud sales or use the BMS provisioning API to get your server:

```bash
# List available BMS instances

gcloud bms instances list \
    --project=my-project \
    --region=us-central1

# Describe your provisioned server
gcloud bms instances describe sap-hana-prod \
    --project=my-project \
    --region=us-central1
```

Once provisioned, SSH into the server to begin configuration:

```bash
# SSH into the BMS server
ssh customeradmin@10.200.0.20
```

## Step 2: Configure the Operating System

SAP HANA requires specific OS configurations. Use the SAP-certified OS image from your BMS order and verify the tuning. On SLES for SAP, use `saptune`:

```bash
# Verify the OS version and confirm it matches your BMS order
cat /etc/os-release

# Apply the SAP tuning profile
# This sets kernel parameters optimized for SAP HANA
sudo saptune solution apply HANA
sudo saptune solution verify HANA

# Check that all SAP HANA prerequisites pass
sudo saptune status
```

The saptune tool configures SAP-recommended kernel and OS parameters. On SLES for SAP, use it rather than setting those parameters manually.

## Step 3: Configure Storage Layout

SAP HANA has specific requirements for data, log, and shared volumes. On BMS high-memory servers, Google Cloud maps the SAP HANA logical volumes to the certified storage layout before handoff. Validate the mapping before installing HANA:

```bash
# List available block devices
lsblk

# Check the logical volumes that Google Cloud provisioned for SAP HANA
sudo lvs
sudo vgs
sudo multipath -ll

# Validate the expected HANA mounts
findmnt /hana/data /hana/log /hana/shared /usr/sap

# Verify the mounts
df -h /hana/data /hana/log /hana/shared /usr/sap
```

## Step 4: Configure Memory for SAP HANA

With high-memory servers, verify the OS tuning and configure HANA's memory allocation limit. Avoid hand-editing kernel memory parameters that are already managed by the SAP-certified OS tuning profile:

```bash
# Verify OS memory-related tuning from the SAP profile
sudo saptune solution verify HANA

# Confirm NUMA and huge page settings
cat /proc/sys/kernel/numa_balancing
cat /sys/kernel/mm/transparent_hugepage/enabled
grep -i huge /proc/meminfo
```

## Step 5: Install SAP HANA

Upload the SAP HANA installation media to the server and run the installer:

```bash
# Extract the SAP HANA installation media
cd /tmp
SAPCAR -manifest SIGNATURE.SMF -xvf IMDB_SERVER20_*.SAR

# Run the HANA installer
cd /tmp/DATA_UNITS/HDB_SERVER_LINUX_X86_64
sudo ./hdblcm \
    --action=install \
    --components=server,client \
    --sid=HDB \
    --number=00 \
    --sapadm_password=YourSecurePassword \
    --system_user_password=YourSecurePassword \
    --datapath=/hana/data/HDB \
    --logpath=/hana/log/HDB \
    --hostname=$(hostname) \
    --workergroup=default \
    --system_usage=production
```

The installer takes 20-40 minutes depending on the server size. It creates the HANA instance, sets up the administration users, and configures the initial database.

## Step 6: Post-Installation Configuration

After installation, configure HANA for production use:

```bash
# Switch to the HANA admin user
sudo su - hdbadm

# Check the HANA instance status
HDB info

# Connect to the HANA system database
hdbsql -i 00 -d SYSTEMDB -u SYSTEM -p YourSecurePassword

-- Set the global memory allocation limit
-- For a 6 TB server, set to about 5.5 TiB to leave room for the OS
ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('memorymanager', 'global_allocation_limit') = '5767168'
  WITH RECONFIGURE;

-- Enable auditing for security compliance
ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('auditing configuration', 'global_auditing_state') = 'true'
  WITH RECONFIGURE;

-- Keep log mode enabled and enable automatic log backup to prevent the log volume from filling up
ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('persistence', 'log_mode') = 'normal'
  WITH RECONFIGURE;

ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('persistence', 'enable_auto_log_backup') = 'yes'
  WITH RECONFIGURE;
```

## Step 7: Configure HANA System Replication for HA

For production deployments, set up HANA System Replication (HSR) between two BMS servers:

```bash
# On the primary server - create an initial data backup first
hdbsql -i 00 -d SYSTEMDB -u SYSTEM -p YourSecurePassword \
    "BACKUP DATA USING FILE ('/hana/backup/data/HDB')"

# On the primary server - enable system replication
hdbnsutil -sr_enable --name=primary

# On the secondary server - register as a replica
hdbnsutil -sr_register \
    --remoteHost=sap-hana-prod-1 \
    --remoteInstance=00 \
    --replicationMode=syncmem \
    --operationMode=logreplay \
    --name=secondary

# Start the secondary HANA instance
sapcontrol -nr 00 -function StartSystem HDB

# On the primary - verify replication status
hdbnsutil -sr_state

# Check replication through SQL
hdbsql -i 00 -d SYSTEMDB -u SYSTEM -p YourSecurePassword \
    "SELECT * FROM SYS.M_SERVICE_REPLICATION"
```

The replication modes to choose from:

- **sync**: Synchronous replication that waits until the secondary has received and persisted the log, with some latency impact
- **syncmem**: Synchronous in-memory replication that waits until the secondary has received the log in memory, with less latency than `sync`
- **async**: Asynchronous replication, possible data loss but no commit latency impact

For BMS servers in the same region, `syncmem` is a common balance of data protection and performance, but validate the mode against your RPO and latency requirements.

## Step 8: Configure Backup to Cloud Storage

Set up HANA backups that store data in Google Cloud Storage for durability:

```bash
# Enable the Backint feature of Google Cloud's Agent for SAP
# This allows HANA to back up directly to Cloud Storage
sudo /usr/bin/google_cloud_sap_agent installbackint

# Configure Backint parameters for a BMS host
sudo /usr/bin/google_cloud_sap_agent configurebackint \
    -f="/usr/sap/HDB/SYS/global/hdb/opt/backint/backint-gcs/parameters.json" \
    -bucket="my-hana-backups"

# Test the backup connection
hdbsql -i 00 -d SYSTEMDB -u SYSTEM -p YourSecurePassword \
    "BACKUP DATA USING BACKINT ('HDB_BACKUP')"
```

## Performance Validation

After installation, run the HANA hardware check tool to validate performance:

```bash
# Run the SAP HANA hardware and cloud measurement tools from the SAP download package
./hcmt

# Run the HANA mini checks
hdbsql -i 00 -d SYSTEMDB -u SYSTEM -p YourSecurePassword -A -C -j \
    -I /usr/sap/HDB/SYS/global/hdb/custom/config/minicheck.sql
```

Key metrics to validate:

- Data and log volume throughput that meets the SAP HANA KPIs for your certified BMS profile
- Network latency to application servers that meets your SAP workload and architecture requirements

## Summary

Configuring SAP HANA on Google Cloud Bare Metal Solution with high-memory server profiles gives you SAP-certified hardware with the performance characteristics that HANA demands. The setup involves validating the pre-mapped SAP HANA storage layout, configuring HANA memory limits, and verifying HANA-specific OS tuning. For production use, add System Replication for high availability and configure backups to Cloud Storage through the Backint feature of Google Cloud's Agent for SAP. The result is a production-ready SAP HANA deployment that runs on Google Cloud infrastructure while meeting SAP's strict hardware and performance requirements.
