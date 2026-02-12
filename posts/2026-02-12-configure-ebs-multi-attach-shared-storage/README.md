# How to Configure EBS Multi-Attach for Shared Storage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EBS, EC2, Storage

Description: Step-by-step guide to configuring EBS Multi-Attach so multiple EC2 instances can simultaneously access the same block storage volume.

---

EBS Multi-Attach lets you attach a single io1 or io2 EBS volume to multiple EC2 instances in the same Availability Zone simultaneously. It's a handy feature when you need shared block-level storage between instances - think clustered databases, distributed filesystems, or applications that need concurrent access to the same data.

This isn't the same as a shared filesystem like EFS or FSx. Multi-Attach gives you raw block storage that multiple instances can read and write to at the same time. That's powerful, but it comes with some important caveats we'll cover.

## When to Use Multi-Attach

Multi-Attach makes sense in a few specific scenarios:

- **Clustered databases** like Oracle RAC that manage their own locking and data integrity
- **Cluster-aware filesystems** like GFS2 or OCFS2 where the filesystem handles concurrent access
- **Failover scenarios** where a standby instance needs immediate access to the primary's data volume

It does not make sense for general file sharing between instances. If you need that, use [EFS instead](https://oneuptime.com/blog/post/set-up-nfs-on-ec2-using-efs/view). Multi-Attach provides no built-in coordination - if two instances write to the same blocks without coordination, you'll corrupt your data.

## Prerequisites

Before setting up Multi-Attach, make sure you have:

1. **io1 or io2 volumes only** - gp2, gp3, st1, and sc1 don't support Multi-Attach
2. **Nitro-based instances** - Multi-Attach only works with Nitro system instances
3. **Same Availability Zone** - All instances and the volume must be in the same AZ
4. **A cluster-aware filesystem** or application-level locking mechanism

## Step 1: Create a Multi-Attach Enabled Volume

You must enable Multi-Attach at volume creation time. You can't enable it on an existing volume.

Create an io2 volume with Multi-Attach enabled:

```bash
# Create an io2 volume with Multi-Attach
aws ec2 create-volume \
    --volume-type io2 \
    --size 100 \
    --iops 10000 \
    --multi-attach-enabled \
    --availability-zone us-east-1a \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=shared-storage}]'
```

You can verify Multi-Attach is enabled:

```bash
# Check if Multi-Attach is enabled on the volume
aws ec2 describe-volumes \
    --volume-ids vol-0123456789abcdef0 \
    --query "Volumes[].MultiAttachEnabled"
```

## Step 2: Attach the Volume to Multiple Instances

Now attach the volume to each instance that needs access.

Attach the Multi-Attach volume to two EC2 instances:

```bash
# Attach to first instance
aws ec2 attach-volume \
    --volume-id vol-0123456789abcdef0 \
    --instance-id i-0abc123def456001 \
    --device /dev/sdf

# Attach to second instance
aws ec2 attach-volume \
    --volume-id vol-0123456789abcdef0 \
    --instance-id i-0abc123def456002 \
    --device /dev/sdf
```

You can attach to up to 16 instances simultaneously. Verify the attachments:

```bash
# List all attachments for the volume
aws ec2 describe-volumes \
    --volume-ids vol-0123456789abcdef0 \
    --query "Volumes[].Attachments[].[InstanceId,State,Device]" \
    --output table
```

## Step 3: Set Up a Cluster-Aware Filesystem

This is the critical part. You can't just slap ext4 or xfs on a Multi-Attach volume and call it a day. Those filesystems aren't designed for concurrent access from multiple hosts. You need a cluster-aware filesystem.

GFS2 (Global File System 2) is a solid choice that's well-supported on Linux. Here's how to set it up.

Install and configure GFS2 on all instances that share the volume:

```bash
# Install required packages on each instance (Amazon Linux 2 / RHEL)
sudo yum install -y gfs2-utils dlm pacemaker corosync pcs fence-agents

# Start the cluster services
sudo systemctl enable pcsd
sudo systemctl start pcsd

# Set the hacluster password (same on all nodes)
echo "StrongPassword123" | sudo passwd --stdin hacluster
```

Configure the cluster using pcs:

```bash
# Authenticate nodes (run on one node)
sudo pcs host auth node1 node2

# Create the cluster
sudo pcs cluster setup my-cluster node1 node2

# Start the cluster
sudo pcs cluster start --all
sudo pcs cluster enable --all

# Verify cluster status
sudo pcs status
```

Set up the DLM (Distributed Lock Manager) resource, which GFS2 depends on:

```bash
# Create the DLM resource
sudo pcs resource create dlm ocf:pacemaker:controld \
    op monitor interval=30s on-fail=fence \
    clone interleave=true ordered=true

# Verify DLM is running on all nodes
sudo pcs status
```

Now create and mount the GFS2 filesystem:

```bash
# Create the GFS2 filesystem (run on one node only)
# -t cluster_name:fs_name -j number_of_journals (one per node)
sudo mkfs.gfs2 -t my-cluster:shared-fs -j 2 -p lock_dlm /dev/nvme1n1

# Mount on all nodes
sudo mkdir -p /shared
sudo mount -t gfs2 /dev/nvme1n1 /shared

# Verify it's mounted
df -h /shared
```

## Alternative: Using Without a Cluster Filesystem

If you don't want the complexity of GFS2, there are simpler patterns that still work with Multi-Attach.

For a read-only shared volume pattern (one writer, many readers):

```bash
# On the writer instance - mount read-write
sudo mount -o rw /dev/nvme1n1 /data

# On reader instances - mount read-only
sudo mount -o ro /dev/nvme1n1 /data

# After the writer updates data, readers need to remount
sudo mount -o remount,ro /dev/nvme1n1 /data
```

This pattern works for scenarios like distributing large reference datasets or configuration files.

## Step 4: Make the Mount Persistent

Add the mount to fstab on each instance:

```bash
# For GFS2
echo "/dev/nvme1n1 /shared gfs2 defaults,noatime,_netdev 0 0" | sudo tee -a /etc/fstab

# The _netdev option ensures the mount waits for the network (and cluster) to be ready
```

## Monitoring Multi-Attach Volumes

Since multiple instances are hitting the same volume, monitoring becomes extra important. The IOPS budget is shared across all attached instances.

Set up a CloudWatch dashboard to track shared volume performance:

```bash
# Create CloudWatch alarms for the shared volume
aws cloudwatch put-metric-alarm \
    --alarm-name "shared-vol-high-queue-length" \
    --namespace AWS/EBS \
    --metric-name VolumeQueueLength \
    --dimensions Name=VolumeId,Value=vol-0123456789abcdef0 \
    --statistic Average \
    --period 300 \
    --threshold 10 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 3 \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts

# Monitor IOPS consumed
aws cloudwatch get-metric-statistics \
    --namespace AWS/EBS \
    --metric-name VolumeReadOps \
    --dimensions Name=VolumeId,Value=vol-0123456789abcdef0 \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum
```

A high queue length on a shared volume means you're hitting the IOPS ceiling. Either provision more IOPS or reduce the load from one of the attached instances.

## Limitations to Keep in Mind

Before you design your architecture around Multi-Attach, be aware of these constraints:

1. **io1/io2 only** - No support for gp3 or other volume types
2. **Same AZ only** - Can't span across Availability Zones
3. **16 instances max** - You can attach to up to 16 instances
4. **No boot volumes** - Multi-Attach volumes can't be used as root devices
5. **Nitro instances only** - Older instance generations don't support it
6. **No I/O fencing by default** - You need to handle data integrity yourself
7. **Shared IOPS budget** - All instances share the provisioned IOPS

## Alternatives to Consider

Multi-Attach is a niche feature. For most shared storage needs, there are simpler options:

- **Amazon EFS** - Fully managed NFS. Simple, scalable, multi-AZ. Best for general shared file access.
- **Amazon FSx for Lustre** - High-performance parallel filesystem. Great for HPC and ML workloads.
- **Amazon FSx for NetApp ONTAP** - Enterprise-grade shared storage with snapshots and clones.

Multi-Attach is really the right choice only when you need shared block-level access with cluster-aware applications. For anything else, the managed filesystem services are going to be easier to operate and more reliable in the long run.

If you need high-performance storage but only for a single instance, check out our guide on [io2 Block Express volumes](https://oneuptime.com/blog/post/io2-block-express-ebs-volumes-high-performance-storage/view) instead.
