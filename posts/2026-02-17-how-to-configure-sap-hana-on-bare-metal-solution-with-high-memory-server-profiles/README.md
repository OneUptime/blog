# How to Configure SAP HANA on Bare Metal Solution with High-Memory Server Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, Bare Metal Solution, SAP HANA, High Memory, Enterprise, SAP

Description: Learn how to configure SAP HANA on Google Cloud Bare Metal Solution using high-memory server profiles for enterprise SAP workloads with optimal performance.

---

SAP HANA is one of those workloads that pushes hardware to its limits. It is an in-memory database, which means your entire working dataset needs to fit in RAM, and it needs fast storage for persistence and logging. Google Cloud Bare Metal Solution provides the high-memory server profiles that SAP HANA demands, with configurations going up to 12 TB of RAM on a single server. These are SAP-certified servers, which matters when you need SAP support.

This guide covers configuring SAP HANA on BMS from server provisioning through HANA installation and performance optimization.

## Understanding BMS Server Profiles for SAP HANA

Google Cloud offers several BMS server profiles specifically certified for SAP HANA:

| Profile | Cores | RAM | Use Case |
|---------|-------|-----|----------|
| uts2-1 | 32 | 1.5 TB | Small HANA deployments |
| uts2-2 | 56 | 3 TB | Medium S/4HANA |
| uts2-3 | 112 | 6 TB | Large OLAP/BW |
| uts2-4 | 224 | 12 TB | Enterprise BW/4HANA |

These are the same server families used by the largest SAP customers globally. They come with NVMe local storage for HANA data and log volumes, plus shared storage options for backups.

## Prerequisites

- A Google Cloud project with Bare Metal Solution provisioned
- SAP HANA installation media from SAP Software Download Center
- A valid SAP HANA license
- Network connectivity between BMS and your GCP VPC
- SUSE Linux Enterprise Server (SLES) for SAP or Red Hat Enterprise Linux (RHEL) for SAP

## Step 1: Provision the BMS Server

Work with Google Cloud sales or use the BMS provisioning API to get your server:

```bash
# List available BMS instances
gcloud bms instances list \
    --project=my-project \
    --location=us-central1

# Describe your provisioned server
gcloud bms instances describe sap-hana-prod \
    --project=my-project \
    --location=us-central1
```

Once provisioned, SSH into the server to begin configuration:

```bash
# SSH into the BMS server
ssh customeradmin@10.200.0.20
```

## Step 2: Configure the Operating System

SAP HANA requires specific OS configurations. SLES for SAP includes most of these out of the box, but verify everything:

```bash
# Verify the OS version - SLES 15 SP4 for SAP is recommended
cat /etc/os-release

# Apply the SAP tuning profile
# This sets kernel parameters optimized for SAP HANA
sudo saptune solution apply HANA
sudo saptune solution verify HANA

# Check that all SAP HANA prerequisites pass
sudo saptune status
```

The saptune tool configures dozens of kernel parameters including huge pages, swap behavior, network settings, and I/O scheduler settings. Always use it rather than setting parameters manually.

## Step 3: Configure Storage Layout

SAP HANA has specific requirements for data, log, and shared volumes. On BMS high-memory servers, you typically get NVMe drives for performance-critical volumes:

```bash
# List available block devices
lsblk

# Create volume groups for HANA data and log volumes
# Use the NVMe drives for maximum performance
sudo pvcreate /dev/nvme0n1 /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1
sudo vgcreate vg_hana_data /dev/nvme0n1 /dev/nvme1n1
sudo vgcreate vg_hana_log /dev/nvme2n1 /dev/nvme3n1

# Create logical volumes
# Data volume: stripe across NVMe drives for maximum throughput
sudo lvcreate -i 2 -I 256K -l 100%FREE -n lv_data vg_hana_data

# Log volume: stripe across NVMe drives with smaller stripe size for write performance
sudo lvcreate -i 2 -I 64K -l 100%FREE -n lv_log vg_hana_log

# Create XFS file systems (recommended by SAP for HANA)
sudo mkfs.xfs /dev/vg_hana_data/lv_data
sudo mkfs.xfs /dev/vg_hana_log/lv_log

# Create mount points following SAP conventions
sudo mkdir -p /hana/data
sudo mkdir -p /hana/log
sudo mkdir -p /hana/shared
sudo mkdir -p /hana/backup

# Add to fstab with recommended mount options
sudo bash -c 'cat >> /etc/fstab << EOF
/dev/vg_hana_data/lv_data /hana/data xfs noatime,nodiratime,logbsize=256k 0 0
/dev/vg_hana_log/lv_log /hana/log xfs noatime,nodiratime,logbsize=64k 0 0
EOF'

# Mount all volumes
sudo mount -a

# Verify the mounts
df -h /hana/data /hana/log /hana/shared /hana/backup
```

## Step 4: Configure Memory for SAP HANA

With high-memory servers, you need to configure huge pages and memory allocation properly:

```bash
# Calculate huge pages for SAP HANA
# For a 6 TB server, allocate about 90% of RAM as huge pages
# 6 TB = 6,291,456 MB; 90% = 5,662,310 MB; 2 MB huge pages = 2,831,155 pages
echo "vm.nr_hugepages = 2831155" | sudo tee -a /etc/sysctl.d/sap_hana.conf

# Disable transparent huge pages (THP) as SAP recommends
echo "never" | sudo tee /sys/kernel/mm/transparent_hugepage/enabled

# Set NUMA balancing off (SAP recommendation for HANA)
echo "kernel.numa_balancing = 0" | sudo tee -a /etc/sysctl.d/sap_hana.conf

# Apply the settings
sudo sysctl --system

# Verify huge pages are allocated
grep -i huge /proc/meminfo
```

## Step 5: Install SAP HANA

Upload the SAP HANA installation media to the server and run the installer:

```bash
# Extract the SAP HANA installation media
cd /tmp
tar -xzf 51055299_part1.exe  # SAP HANA server component

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
hdbsql -i 00 -u SYSTEM -p YourSecurePassword

-- Set the global memory allocation limit
-- For a 6 TB server, set to about 5.5 TB to leave room for the OS
ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('memorymanager', 'global_allocation_limit') = '5767168'
  WITH RECONFIGURE;

-- Enable auditing for security compliance
ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('auditing configuration', 'global_auditing_state') = 'true'
  WITH RECONFIGURE;

-- Configure automatic log backup to prevent log volume from filling up
ALTER SYSTEM ALTER CONFIGURATION ('global.ini', 'SYSTEM')
  SET ('persistence', 'log_mode') = 'normal'
  WITH RECONFIGURE;
```

## Step 7: Configure HANA System Replication for HA

For production deployments, set up HANA System Replication (HSR) between two BMS servers:

```bash
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
HDB start

# On the primary - verify replication status
hdbnsutil -sr_state

# Check replication through SQL
hdbsql -i 00 -u SYSTEM -p YourSecurePassword \
    "SELECT * FROM SYS.M_SERVICE_REPLICATION"
```

The replication modes to choose from:

- **sync**: Synchronous replication, zero data loss, some latency impact
- **syncmem**: Synchronous in-memory, near-zero data loss, less latency
- **async**: Asynchronous, possible data loss but no latency impact

For BMS servers in the same region, `syncmem` provides the best balance of data protection and performance.

## Step 8: Configure Backup to Cloud Storage

Set up HANA backups that store data in Google Cloud Storage for durability:

```bash
# Install the GCS backint agent for SAP HANA
# This allows HANA to back up directly to Cloud Storage
sudo /usr/sap/HDB/SYS/global/hdb/opt/hdbbackint/install.sh

# Configure the backint parameters
cat > /usr/sap/HDB/SYS/global/hdb/opt/hdbbackint/backint.cfg << 'EOF'
# GCS Backint configuration for SAP HANA
bucket = my-hana-backups
parallel_streams = 16
rate_limit_mb = 0
service_account = /usr/sap/HDB/SYS/global/hdb/opt/hdbbackint/sa-key.json
encryption = default
compress = true
EOF

# Test the backup connection
hdbsql -i 00 -u SYSTEM -p YourSecurePassword \
    "BACKUP DATA USING BACKINT ('/hana/backup/data/HDB')"
```

## Performance Validation

After installation, run the HANA hardware check tool to validate performance:

```bash
# Run the SAP HANA hardware configuration check tool
/usr/sap/HDB/HDB00/exe/hdbhwcheck

# Run the HANA mini checks
hdbsql -i 00 -u SYSTEM -p YourSecurePassword -A -C -j \
    -I /usr/sap/HDB/SYS/global/hdb/custom/config/minicheck.sql
```

Key metrics to validate:

- Data volume read throughput: at least 3 GB/s per node
- Log volume write throughput: at least 500 MB/s
- Network latency to application servers: under 1 ms within the same region

## Summary

Configuring SAP HANA on Google Cloud Bare Metal Solution with high-memory server profiles gives you SAP-certified hardware with the performance characteristics that HANA demands. The setup involves careful storage configuration with NVMe striping, proper memory allocation with huge pages, and HANA-specific OS tuning. For production use, add System Replication for high availability and configure backups to Cloud Storage through the backint agent. The result is a production-ready SAP HANA deployment that runs on Google Cloud infrastructure while meeting SAP's strict hardware and performance requirements.
