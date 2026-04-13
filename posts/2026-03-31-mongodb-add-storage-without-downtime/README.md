# How to Add Storage to a MongoDB Cluster Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Storage, Cluster, Scaling, Operation

Description: Learn how to expand storage capacity in a MongoDB cluster without service interruption by adding volumes or migrating data while keeping the cluster online.

---

Running out of disk space on a MongoDB cluster is a serious operational risk. Fortunately, you can expand storage without downtime by working node by node in a rolling fashion, taking advantage of replica set redundancy.

## Assess Current Storage Usage

Before making changes, measure disk usage on each node:

```bash
df -h /var/lib/mongodb
du -sh /var/lib/mongodb/*
```

Also check MongoDB's own storage stats:

```javascript
db.runCommand({ dbStats: 1, scale: 1024 * 1024 })
```

This reports `dataSize`, `storageSize`, and `fsUsedSize` in MB.

## Option 1 - Extend an Existing Volume (Cloud)

On AWS, Azure, or GCP, you can resize an EBS or managed disk volume live without stopping MongoDB:

```bash
# AWS example - resize EBS volume
aws ec2 modify-volume --volume-id vol-0abc1234 --size 500

# After resize, extend the filesystem (no downtime required)
sudo growpart /dev/xvda 1
sudo resize2fs /dev/xvda1
```

Verify the new size is available:

```bash
df -h /var/lib/mongodb
```

## Option 2 - Add a New Disk and Migrate Data

If you cannot resize in place, add a new disk, mount it, and move MongoDB's data directory on one secondary at a time:

```bash
# Format and mount new disk
sudo mkfs.ext4 /dev/sdb
sudo mkdir /mnt/mongodb-new
sudo mount /dev/sdb /mnt/mongodb-new

# Stop mongod, copy data, update config, restart
sudo systemctl stop mongod
sudo rsync -av /var/lib/mongodb/ /mnt/mongodb-new/
sudo chown -R mongodb:mongodb /mnt/mongodb-new
```

Update `/etc/mongod.conf` to point to the new path:

```yaml
storage:
  dbPath: /mnt/mongodb-new
```

Restart and verify the secondary rejoins the replica set:

```bash
sudo systemctl start mongod
```

```javascript
rs.status()
```

## Option 3 - Add a New Shard (Sharded Cluster)

For sharded clusters at capacity, add a new shard to distribute data:

```javascript
sh.addShard("newReplicaSet/host1:27017,host2:27017,host3:27017")
```

MongoDB's balancer automatically migrates chunks to the new shard. Monitor balancing progress:

```javascript
sh.status()
db.getSiblingDB("config").changelog.find({ what: "moveChunk.commit" }).sort({ time: -1 }).limit(10)
```

## Monitoring Storage Alerts

Set up storage usage alerts so you act before reaching capacity. Using a tool like OneUptime, you can create monitors that alert your team when disk utilization exceeds 75% or 85%.

```bash
# Simple disk usage check for a cron-based alert
used=$(df /var/lib/mongodb | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$used" -gt 80 ]; then echo "ALERT: MongoDB disk at ${used}%"; fi
```

## Summary

Adding storage to a MongoDB cluster without downtime involves rolling operations - resize or migrate volumes one node at a time, wait for the secondary to rejoin, then proceed. For cloud environments, live volume resize is the simplest path. For sharded clusters, adding a new shard distributes both storage and load automatically.
