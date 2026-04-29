# How to Configure K3s Data Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Storage, Configuration, Data Directory

Description: Learn how to configure a custom K3s data directory to separate cluster data from the OS partition, improving performance and manageability.

## Introduction

By default, K3s stores its state, container images, certificates, snapshots, and local volumes in `/var/lib/rancher/k3s/`. This location can fill up the root partition on disk-constrained systems. Configuring a custom data directory allows you to mount a dedicated disk for K3s data, improving both performance (SSD vs. HDD) and system stability (preventing root partition exhaustion).

## What's Stored in the K3s Data Directory

```text
/var/lib/rancher/k3s/
├── agent/
│   ├── containerd/    # Containerd state and image layers
│   ├── images/        # Pre-loaded air-gap image archives
│   ├── etc/           # containerd and CNI configuration
│   └── pods/          # Pod volume data
├── data/              # Extracted K3s runtime binaries
├── server/
│   ├── db/            # SQLite or embedded etcd datastore
│   ├── tls/           # TLS certificates
│   ├── manifests/     # Auto-deployed manifests
│   └── static/        # Static files served by the Kubernetes API server
└── storage/           # Local path provisioner volumes (PVs)
```

## Method 1: Configure Before Installation

Setting the data directory before the first installation is the cleanest approach:

```bash
# Prepare the destination directory on a mounted disk

# Example: /dev/sdb1 mounted at /opt/k3s-data
sudo mkfs.ext4 /dev/sdb1
sudo mkdir -p /opt/k3s-data

# Add to fstab for persistence
echo "/dev/sdb1  /opt/k3s-data  ext4  defaults,noatime  0  2" | sudo tee -a /etc/fstab
sudo mount -a

# Verify the mount
df -h /opt/k3s-data
```

```bash
# Configure K3s to use the custom data directory
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"
# Use a dedicated disk for K3s data
data-dir: "/opt/k3s-data"
EOF

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -

# Verify K3s is using the new data directory
ls /opt/k3s-data/
```

## Method 2: Migrate an Existing Installation

If K3s is already running and you want to move the data directory:

### Step 1: Stop K3s

```bash
# Stop the K3s service
sudo systemctl stop k3s

# If agent nodes also need migration, stop them too
sudo systemctl stop k3s-agent
```

### Step 2: Mount the New Disk

```bash
# Format and mount the new disk
sudo mkfs.ext4 /dev/sdb1
sudo mkdir -p /opt/k3s-data

echo "/dev/sdb1  /opt/k3s-data  ext4  defaults,noatime  0  2" | sudo tee -a /etc/fstab
sudo mount /opt/k3s-data
```

### Step 3: Copy Existing Data

```bash
# Copy all existing K3s data to the new location
# Use rsync to preserve permissions and ownership
sudo rsync -avP /var/lib/rancher/k3s/ /opt/k3s-data/

# Verify the copy
du -sh /var/lib/rancher/k3s/
du -sh /opt/k3s-data/
```

### Step 4: Update the Configuration

```bash
# Add a config drop-in to use the new data directory
sudo mkdir -p /etc/rancher/k3s/config.yaml.d
sudo tee /etc/rancher/k3s/config.yaml.d/data-dir.yaml > /dev/null <<EOF
data-dir: "/opt/k3s-data"
EOF
```

### Step 5: Start K3s and Verify

```bash
# Start K3s with the new data directory
sudo systemctl start k3s

# Monitor startup
sudo journalctl -u k3s -f

# Verify the cluster is healthy
sudo k3s kubectl get nodes
sudo k3s kubectl get pods --all-namespaces

# Once verified, optionally remove the old data directory
# sudo rm -rf /var/lib/rancher/k3s/
```

## Using NVMe for Maximum Performance

For performance-critical deployments (e.g., etcd):

```bash
# Format the NVMe drive
sudo mkfs.ext4 -E lazy_itable_init=0,lazy_journal_init=0 /dev/nvme0n1

# Mount with performance-optimized options
sudo mkdir -p /nvme/k3s
echo "/dev/nvme0n1  /nvme/k3s  ext4  defaults,noatime,discard  0  2" | sudo tee -a /etc/fstab
sudo mount /nvme/k3s

# Configure K3s to use NVMe
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"
data-dir: "/nvme/k3s"
EOF
```

## Separating etcd and Image Storage

For maximum control, you can separate different types of data across multiple disks. While K3s doesn't directly support separate paths for etcd vs. images, you can use symlinks:

```bash
# After setting data-dir, create symlinks for specific subdirectories
# Example: Put etcd on a fast NVMe, images on a larger HDD

sudo systemctl stop k3s

# Move etcd to NVMe
sudo mv /opt/k3s-data/server/db /nvme/etcd-db
sudo ln -s /nvme/etcd-db /opt/k3s-data/server/db

# Move container images to HDD
sudo mv /opt/k3s-data/agent/containerd /hdd/container-storage
sudo ln -s /hdd/container-storage /opt/k3s-data/agent/containerd

sudo systemctl start k3s
```

## Monitoring Data Directory Usage

```bash
# Check total K3s data directory size
sudo du -sh /opt/k3s-data/

# Break down by component
sudo du -sh /opt/k3s-data/agent/containerd/    # Container images
sudo du -sh /opt/k3s-data/server/db/           # SQLite or etcd datastore
sudo du -sh /opt/k3s-data/storage/             # PersistentVolumes

# Monitor disk usage
df -h /opt/k3s-data

# Check whether disk usage exceeds 80%
df -P /opt/k3s-data | awk 'NR==2 {gsub(/%/, "", $5); if ($5 > 80) print "ALERT: disk usage above 80%"; else print "OK: disk usage is " $5 "%"}'
```

## Configuring the Local Path Provisioner Data Directory

The local path provisioner also has its own storage path, configurable via the K3s server setting `default-local-storage-path`:

```yaml
# Override the local-path-provisioner storage location
default-local-storage-path: "/opt/k3s-data/local-storage"
```

## Conclusion

Configuring a custom data directory in K3s is straightforward via the `data-dir` option in `/etc/rancher/k3s/config.yaml`. This is especially important for production deployments where you want to:
- Prevent the root partition from filling up
- Use a dedicated, high-performance SSD for etcd
- Separate container image storage onto a larger, cheaper disk
- Simplify backup procedures by having K3s data on a dedicated volume

Setting this up before installation is the cleanest approach, but migration of an existing cluster is also well-supported using rsync.
