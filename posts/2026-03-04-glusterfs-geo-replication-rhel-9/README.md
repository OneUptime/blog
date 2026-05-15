# How to Configure GlusterFS Geo-Replication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Geo-Replication, Disaster Recovery, Storage, Linux

Description: Set up GlusterFS geo-replication on RHEL to asynchronously replicate data between geographically separated clusters for disaster recovery.

---

> **Support note:** Red Hat Gluster Storage reached end of life on December 31, 2024, and Red Hat Gluster Storage 3.5 was the final supported series. These commands are accurate for legacy Red Hat Gluster Storage deployments and upstream/community GlusterFS, but they are not a supported new Red Hat Gluster Storage deployment on RHEL 9.

Geo-replication in GlusterFS provides asynchronous replication between two GlusterFS volumes that can be in different geographic locations. Unlike the synchronous replication in replicated volumes (which requires low-latency links), geo-replication works over WAN connections and is designed for disaster recovery scenarios.

## How Geo-Replication Works

The master volume detects changes using a changelog mechanism. A geo-replication daemon reads these changelogs and replicates the changes to the slave volume over SSH. This is asynchronous, so there is always some lag between the master and slave.

```bash
Master Cluster (Site A)         Slave Cluster (Site B)
+------------------+            +------------------+
| Master Volume    |  -- SSH -> | Slave Volume     |
| (active writes)  |            | (passive copy)   |
+------------------+            +------------------+
```

## Prerequisites

- Two separate GlusterFS clusters on RHEL
- Master volume created and running
- Slave volume created and running (same or larger capacity)
- SSH connectivity from master nodes to slave nodes
- Passwordless SSH from the geo-replication user

## Step 1: Set Up SSH Keys

Create a common geo-replication user or use root. From the master node:

```bash
# Generate SSH key on the master primary node

sudo ssh-keygen -t rsa -b 4096 -f /root/.ssh/id_rsa -N ""

# Create the geo-rep session which will push keys
sudo gluster system:: execute gsec_create
```

## Step 2: Create the Geo-Replication Session

Push the SSH keys to the slave cluster:

```bash
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol create push-pem
```

This command:
- Creates the geo-replication session configuration
- Pushes SSH public keys to all slave nodes
- Sets up the necessary configuration files

## Step 3: Configure Session Options

Before starting, review and set options:

```bash
# View all configured options
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol config

# Set the file synchronization method (default is rsync; alternative: tarssh)
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol config sync_method tarssh

# Set log level
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol config log_level INFO
```

## Step 4: Start Geo-Replication

```bash
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol start
```

## Step 5: Monitor the Session

```bash
# Check status
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol status

# Detailed status
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol status detail
```

Status output columns:

- **Master Brick**: Which brick on the master
- **Slave**: The slave connection
- **Status**: Active, Passive, Faulty, Stopped
- **Crawl Status**: Changelog Crawl, Hybrid Crawl, History Crawl
- **Entry**: Count of pending entry operations
- **Data**: Count of pending data operations
- **Meta**: Count of pending metadata operations
- **Failures**: Count of synchronization failures

## Checkpoint Verification

Set a checkpoint to verify all data up to a point has been replicated:

```bash
# Set a checkpoint
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol config checkpoint now

# Check if checkpoint is reached
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol status detail
```

Look for the "Checkpoint Completed" field. "Yes" means all data up to the checkpoint timestamp has been replicated.

## Managing Geo-Replication

```bash
# Pause the session
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol pause

# Resume the session
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol resume

# Stop the session
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol stop

# Delete the session
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol delete
```

## Failover to the Slave

If the master site fails:

```bash
# On the slave cluster, allow writes and enable change tracking for failback
sudo gluster volume set slavevol features.read-only off
sudo gluster volume set slavevol geo-replication.indexing on
sudo gluster volume set slavevol changelog on

# Mount the slave volume on clients
sudo mount -t glusterfs slavenode:/slavevol /mnt/data
```

## Failback to the Master

After the master site is restored:

```bash
# Stop the original session, even if some master nodes are unavailable
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol stop force

# Reverse geo-replication: sync changes from slave back to master
sudo gluster volume geo-replication slavevol \
    masternode::mastervol create push-pem force
sudo gluster volume geo-replication slavevol \
    masternode::mastervol config special-sync-mode recover
sudo gluster volume geo-replication slavevol \
    masternode::mastervol config gfid-conflict-resolution false
sudo gluster volume geo-replication slavevol \
    masternode::mastervol start

# Stop application I/O on the slave, set a checkpoint, and wait for it to complete
sudo gluster volume geo-replication slavevol \
    masternode::mastervol config checkpoint now
sudo touch /mnt/data
sudo gluster volume geo-replication slavevol \
    masternode::mastervol status detail

# After the checkpoint completes, reverse back
sudo gluster volume geo-replication slavevol \
    masternode::mastervol stop
sudo gluster volume geo-replication slavevol \
    masternode::mastervol delete

# Reset the failover options on the slave
sudo gluster volume reset slavevol geo-replication.indexing force
sudo gluster volume reset slavevol changelog

# Restart original geo-replication
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol start
```

## Troubleshooting

Check geo-replication logs:

```bash
# Log location
ls /var/log/glusterfs/geo-replication/

# Check for faulty sessions
sudo gluster volume geo-replication mastervol \
    slavenode::slavevol status
```

Common issues:

- **Faulty status**: Usually SSH connectivity problems. Check `/var/log/glusterfs/geo-replication/` logs
- **Entry/Data/Meta pending grows**: The slave may be slower or network bandwidth is limited
- **Changelogs not processing**: Restart the session

## Conclusion

GlusterFS geo-replication provides an effective disaster recovery mechanism for geographically distributed environments. It works asynchronously over SSH, making it suitable for WAN connections. Remember that there is always some replication lag, so the slave may not have the very latest data if the master fails unexpectedly. Set checkpoints to verify replication progress for critical data.
