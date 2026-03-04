# How to Install and Configure GlusterFS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Storage, Distributed File Systems, Linux

Description: Step-by-step guide to installing and configuring GlusterFS on RHEL, including server setup, volume creation, and client mounting.

---

GlusterFS is an open-source, scalable network file system suitable for data-intensive workloads such as cloud storage, media streaming, and content delivery. It aggregates disk storage from multiple servers into a single global namespace, making it straightforward to scale storage by adding new nodes rather than replacing hardware.

## Why GlusterFS

Traditional NFS shares are limited to a single server. When that server runs out of space or bandwidth, you hit a wall. GlusterFS distributes data across multiple servers, giving you:

- Horizontal scalability by adding more nodes
- No single point of failure (with replicated or dispersed volumes)
- POSIX-compatible file system access
- No separate metadata server (unlike some other distributed file systems)

## Prerequisites

You need at least two RHEL servers. For this guide:

- **Node 1**: gluster1.example.com (192.168.1.10)
- **Node 2**: gluster2.example.com (192.168.1.11)
- **Client**: client.example.com (192.168.1.20)

Each node should have a dedicated partition or disk for GlusterFS storage (for example, `/dev/sdb`).

## Step 1: Configure Hostnames and DNS

On all nodes and the client, make sure they can resolve each other:

```bash
sudo tee -a /etc/hosts << 'HOSTS'
192.168.1.10 gluster1.example.com gluster1
192.168.1.11 gluster2.example.com gluster2
192.168.1.20 client.example.com client
HOSTS
```

## Step 2: Install GlusterFS Server

Enable the GlusterFS repository and install the server package on both nodes:

```bash
# On both gluster1 and gluster2
sudo dnf install -y centos-release-gluster
sudo dnf install -y glusterfs-server
```

Start and enable the service:

```bash
sudo systemctl enable --now glusterd
sudo systemctl status glusterd
```

## Step 3: Configure the Firewall

GlusterFS uses several ports. Open them on both nodes:

```bash
sudo firewall-cmd --permanent --add-service=glusterfs
sudo firewall-cmd --reload
```

If you need to be more specific:

```bash
# Management port
sudo firewall-cmd --permanent --add-port=24007/tcp
# Brick ports (one per brick, starting at 49152)
sudo firewall-cmd --permanent --add-port=49152-49251/tcp
sudo firewall-cmd --reload
```

## Step 4: Prepare the Storage Brick

On both nodes, format the dedicated disk and mount it:

```bash
sudo mkfs.xfs -i size=512 /dev/sdb
sudo mkdir -p /data/glusterfs/vol1/brick1
sudo mount /dev/sdb /data/glusterfs/vol1/brick1
```

Add it to `/etc/fstab` for persistence:

```bash
echo '/dev/sdb /data/glusterfs/vol1/brick1 xfs defaults 0 0' | sudo tee -a /etc/fstab
```

## Step 5: Set Up the Trusted Storage Pool

From gluster1, probe gluster2:

```bash
sudo gluster peer probe gluster2
```

Verify the pool status:

```bash
sudo gluster peer status
```

You should see gluster2 listed as connected.

## Step 6: Create a Volume

Create a replicated volume (2 replicas for redundancy):

```bash
sudo gluster volume create vol1 replica 2 \
    gluster1:/data/glusterfs/vol1/brick1/data \
    gluster2:/data/glusterfs/vol1/brick1/data
```

Start the volume:

```bash
sudo gluster volume start vol1
```

Check the volume status:

```bash
sudo gluster volume info vol1
sudo gluster volume status vol1
```

## Step 7: Mount on the Client

Install the GlusterFS client on the client machine:

```bash
sudo dnf install -y glusterfs-fuse
```

Create a mount point and mount the volume:

```bash
sudo mkdir -p /mnt/glusterfs
sudo mount -t glusterfs gluster1:/vol1 /mnt/glusterfs
```

For persistent mounting, add to `/etc/fstab`:

```bash
echo 'gluster1:/vol1 /mnt/glusterfs glusterfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

## Step 8: Verify the Setup

Write a file on the client and check that it appears on both nodes:

```bash
# On the client
echo "Hello GlusterFS" | sudo tee /mnt/glusterfs/test.txt

# On gluster1
cat /data/glusterfs/vol1/brick1/data/test.txt

# On gluster2
cat /data/glusterfs/vol1/brick1/data/test.txt
```

Both nodes should show the same content because of replication.

## Basic Volume Management

```bash
# Stop a volume
sudo gluster volume stop vol1

# Delete a volume (must be stopped first)
sudo gluster volume delete vol1

# Set volume options
sudo gluster volume set vol1 performance.cache-size 256MB

# List all volumes
sudo gluster volume list

# Get detailed info
sudo gluster volume info all
```

## Troubleshooting

Check the GlusterFS logs if anything goes wrong:

```bash
# Server logs
sudo tail -f /var/log/glusterfs/glusterd.log

# Volume-specific logs
sudo tail -f /var/log/glusterfs/bricks/data-glusterfs-vol1-brick1-data.log

# Client mount logs
sudo tail -f /var/log/glusterfs/mnt-glusterfs.log
```

Common issues:

- **Peer probe fails**: Check firewall rules and DNS resolution
- **Volume create fails**: Make sure the brick directories exist and are on dedicated partitions
- **Mount fails**: Verify the volume is started and the client can reach the GlusterFS nodes

## Conclusion

You now have a working GlusterFS cluster on RHEL with two nodes and a replicated volume. From here, you can expand the cluster with additional nodes, explore different volume types (distributed, dispersed), and tune performance settings for your workload.
