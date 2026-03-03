# How to Configure SeaweedFS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SeaweedFS, Distributed Storage, Object Storage, File System

Description: A practical guide to deploying and configuring SeaweedFS on Ubuntu, covering the master server, volume servers, filer, S3 API, and replication configuration.

---

SeaweedFS is a distributed object store and file system written in Go. It handles billions of small files efficiently by separating file metadata storage (master server) from actual file data (volume servers). Unlike systems that store one file per inode, SeaweedFS stores multiple small files together in volumes, making it fast for both reads and writes of small objects.

It also offers an S3-compatible API, a POSIX FUSE mount via the filer, and built-in replication - making it useful as a self-hosted alternative to S3 for applications that need object storage without cloud costs.

## Architecture

```text
[Master Server(s)] - track volume locations, handle failover
        |
[Volume Server(s)] - store actual file data in volumes
        |
[Filer] - POSIX/NFS/WebDAV/S3 API access layer
```

Clients interact with the master to find where a file is stored, then fetch it directly from the volume server.

## Prerequisites

- Ubuntu 20.04 or 22.04
- At least 2 GB RAM per volume server
- Dedicated disk(s) for volume data

## Installing SeaweedFS

SeaweedFS ships as a single Go binary:

```bash
# Download the latest release
SEAWEED_VERSION=$(curl -s https://api.github.com/repos/seaweedfs/seaweedfs/releases/latest | grep tag_name | cut -d'"' -f4)
wget "https://github.com/seaweedfs/seaweedfs/releases/download/${SEAWEED_VERSION}/linux_amd64.tar.gz"

# Extract and install
tar xzf linux_amd64.tar.gz
sudo mv weed /usr/local/bin/
rm linux_amd64.tar.gz

# Verify
weed version
```

## Starting the Master Server

The master tracks volume locations and handles replication:

```bash
# Create data directory for master
sudo mkdir -p /data/seaweedfs/master

# Start the master server
weed master \
  -mdir=/data/seaweedfs/master \
  -port=9333 \
  -defaultReplication=001 \
  -volumeSizeLimitMB=512
```

Options:
- `-defaultReplication=001` - replicate to 1 additional volume (total 2 copies)
- `-volumeSizeLimitMB=512` - create a new volume when current reaches 512 MB

Replication codes: `XYZ` where X=number of replicas on same rack, Y=other racks, Z=other data centers. `001` means one additional copy in the same data center on a different machine.

## Starting Volume Servers

Volume servers store the actual file data. Run one per storage node:

```bash
# Create data directory
sudo mkdir -p /data/seaweedfs/volumes

# Start a volume server, pointing to the master
weed volume \
  -mserver=localhost:9333 \
  -port=8080 \
  -dir=/data/seaweedfs/volumes \
  -max=50  # maximum number of volumes to host
```

For multiple volume servers on different machines:

```bash
# On server 2 (replace master IP)
weed volume \
  -mserver=192.168.1.10:9333 \
  -port=8080 \
  -dir=/data/seaweedfs/volumes \
  -max=50 \
  -dataCenter=dc1 \
  -rack=rack1
```

The `dataCenter` and `rack` labels are used by the replication system to spread copies across failure domains.

## Starting the Filer

The filer provides a POSIX-like file system interface with directory support on top of the flat object store:

```bash
# Create filer config directory
sudo mkdir -p /data/seaweedfs/filer

# Start the filer
weed filer \
  -master=localhost:9333 \
  -port=8888 \
  -s3 \
  -s3.port=8333
```

The `-s3` flag enables the S3-compatible API on port 8333.

## Running as systemd Services

Create service files for each component:

```bash
sudo nano /etc/systemd/system/seaweedfs-master.service
```

```ini
[Unit]
Description=SeaweedFS Master Server
After=network.target

[Service]
Type=simple
User=seaweedfs
ExecStart=/usr/local/bin/weed master \
  -mdir=/data/seaweedfs/master \
  -port=9333 \
  -defaultReplication=001 \
  -volumeSizeLimitMB=512
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo nano /etc/systemd/system/seaweedfs-volume.service
```

```ini
[Unit]
Description=SeaweedFS Volume Server
After=seaweedfs-master.service

[Service]
Type=simple
User=seaweedfs
ExecStart=/usr/local/bin/weed volume \
  -mserver=localhost:9333 \
  -port=8080 \
  -dir=/data/seaweedfs/volumes \
  -max=50
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Create the seaweedfs user
sudo useradd -r -s /bin/false seaweedfs
sudo mkdir -p /data/seaweedfs/{master,volumes,filer}
sudo chown -R seaweedfs:seaweedfs /data/seaweedfs

sudo systemctl daemon-reload
sudo systemctl enable seaweedfs-master seaweedfs-volume
sudo systemctl start seaweedfs-master seaweedfs-volume
```

## Using the S3-Compatible API

Configure access keys for the S3 API. Create `/etc/seaweedfs/s3.json`:

```json
{
  "identities": [
    {
      "name": "admin",
      "credentials": [
        {
          "accessKey": "your-access-key",
          "secretKey": "your-secret-key"
        }
      ],
      "actions": ["Admin", "Read", "Write", "List", "Tagging"]
    }
  ]
}
```

Start filer with the config:

```bash
weed filer -master=localhost:9333 -s3 -s3.port=8333 -s3.config=/etc/seaweedfs/s3.json
```

Use with AWS CLI or any S3-compatible client:

```bash
# Configure AWS CLI to use SeaweedFS
aws configure set aws_access_key_id your-access-key
aws configure set aws_secret_access_key your-secret-key
aws configure set default.region us-east-1

# Create a bucket
aws --endpoint-url http://localhost:8333 s3 mb s3://my-bucket

# Upload a file
aws --endpoint-url http://localhost:8333 s3 cp myfile.txt s3://my-bucket/

# List bucket contents
aws --endpoint-url http://localhost:8333 s3 ls s3://my-bucket/
```

## FUSE Mount

Mount SeaweedFS as a local file system:

```bash
# Install FUSE
sudo apt install fuse -y

# Mount the filer
sudo weed mount \
  -filer=localhost:8888 \
  -filer.path=/ \
  -dir=/mnt/seaweedfs

# Test
echo "hello world" | sudo tee /mnt/seaweedfs/test.txt
cat /mnt/seaweedfs/test.txt
```

## Uploading Files via HTTP API

SeaweedFS also has a simple HTTP API that bypasses the S3 layer:

```bash
# Assign a file ID from the master
curl http://localhost:9333/dir/assign
# Response: {"count":1,"fid":"3,01637037d6","url":"127.0.0.1:8080","publicUrl":"localhost:8080"}

# Upload the file to the returned URL
curl -F file=@/path/to/myfile.jpg http://localhost:8080/3,01637037d6

# Retrieve the file
curl http://localhost:8080/3,01637037d6 -o downloaded.jpg
```

## Replication Setup

For two-server replication (`001` means same DC, different server):

```bash
# Start master with replication policy
weed master -defaultReplication=001

# Start two volume servers (on different machines)
# Server 1
weed volume -mserver=master:9333 -port=8080 -dir=/data/vol

# Server 2
weed volume -mserver=master:9333 -port=8081 -dir=/data/vol
```

Check replication status:

```bash
# Check volume status on master
curl http://localhost:9333/vol/status | python3 -m json.tool

# Should show each volume replicated across two servers
```

## Monitoring

Access the built-in dashboard:

```bash
# Master dashboard
curl http://localhost:9333/
# Shows cluster status, volume distribution

# Volume server status
curl http://localhost:8080/status
```

Use `weed shell` for administration:

```bash
weed shell -master=localhost:9333

# In the shell:
> fs.ls /
> volume.list
> cluster.check
```

## Backup

Back up filer metadata:

```bash
# Export filer metadata to a backup file
weed filer.backup -filer=localhost:8888 -dir=/backup/filer-$(date +%Y%m%d)
```

Volume data is binary and managed by the volume server. For full backup, either:
1. Back up the volume data directories directly when volume servers are not writing
2. Use replication across different physical locations as a live backup strategy

## Troubleshooting

**Volume server not registering with master:**
```bash
# Check master logs
sudo journalctl -u seaweedfs-master -n 50

# Test connectivity to master port
nc -zv localhost 9333
```

**S3 API returning 403 Forbidden:**
```bash
# Verify the s3.json config has correct access key
cat /etc/seaweedfs/s3.json

# Restart the filer after config changes
sudo systemctl restart seaweedfs-filer
```

**FUSE mount shows empty directory:**
```bash
# Check filer is running
curl http://localhost:8888/

# Unmount and remount
sudo umount /mnt/seaweedfs
sudo weed mount -filer=localhost:8888 -dir=/mnt/seaweedfs
```

SeaweedFS is particularly well-suited for storing large numbers of user-uploaded files, media assets, or any workload where you would otherwise use S3. The single binary deployment makes it operationally simpler than Ceph or GlusterFS, and the native S3 API means you can often switch to it with only configuration changes in your application.
