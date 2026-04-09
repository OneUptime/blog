# How to Manually Install Ceph from Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Installation, Package, Storage, Linux

Description: Learn how to manually install Ceph from distribution packages on RHEL, Ubuntu, and Debian without orchestration tools for fine-grained control over deployment.

---

## When to Install Ceph Manually

Manual package installation is appropriate when:
- Using airgapped or custom package repositories
- Testing specific Ceph versions or patches
- Building automation tooling from scratch
- Learning Ceph internals without orchestration abstraction

For production use, cephadm or ceph-ansible are recommended. Manual installation requires you to configure each daemon individually.

## Installing on Ubuntu/Debian

Add the Ceph repository:

```bash
# Add Ceph signing key
sudo apt-get install -y curl gnupg
curl -fsSL https://download.ceph.com/keys/release.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/ceph.gpg

# Add Ceph Quincy repository
echo "deb [signed-by=/usr/share/keyrings/ceph.gpg] \
  https://download.ceph.com/debian-quincy/ \
  $(lsb_release -sc) main" | \
  sudo tee /etc/apt/sources.list.d/ceph.list

sudo apt-get update
```

Install packages:

```bash
# On monitor nodes
sudo apt-get install -y ceph-mon

# On OSD nodes
sudo apt-get install -y ceph-osd ceph-volume

# On manager nodes
sudo apt-get install -y ceph-mgr ceph-mgr-dashboard

# On all nodes (CLI tools)
sudo apt-get install -y ceph-common
```

## Installing on RHEL/CentOS Stream

```bash
# Enable Ceph repository
sudo dnf install -y centos-release-ceph-quincy

# Or configure a custom repo
cat > /etc/yum.repos.d/ceph.repo << 'EOF'
[ceph]
name=Ceph Quincy
baseurl=https://download.ceph.com/rpm-quincy/el9/$basearch/
enabled=1
gpgcheck=1
gpgkey=https://download.ceph.com/keys/release.asc
EOF

# Install packages
sudo dnf install -y ceph-mon ceph-osd ceph-mgr ceph-volume ceph-common
```

## Creating the Initial Configuration

Generate the cluster configuration manually:

```bash
# Generate a cluster FSID
sudo uuidgen
# Example: a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Create /etc/ceph/ceph.conf
cat > /etc/ceph/ceph.conf << 'EOF'
[global]
fsid = a1b2c3d4-e5f6-7890-abcd-ef1234567890
mon_initial_members = mon1
mon_host = 192.168.1.10
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
public_network = 192.168.1.0/24
cluster_network = 192.168.2.0/24
EOF
```

## Bootstrapping the Monitor

```bash
# Create monitor keyring
sudo ceph-authtool --create-keyring /tmp/ceph.mon.keyring \
  --gen-key -n mon. --cap mon 'allow *'

# Create admin keyring
sudo ceph-authtool --create-keyring /etc/ceph/ceph.client.admin.keyring \
  --gen-key -n client.admin \
  --cap mon 'allow *' \
  --cap osd 'allow *' \
  --cap mds 'allow *' \
  --cap mgr 'allow *'

# Merge admin key into monitor keyring
sudo ceph-authtool /tmp/ceph.mon.keyring \
  --import-keyring /etc/ceph/ceph.client.admin.keyring

# Create monitor map
sudo monmaptool --create --add mon1 192.168.1.10 \
  --fsid a1b2c3d4-e5f6-7890-abcd-ef1234567890 /tmp/monmap

# Populate monitor data directory
sudo ceph-mon --cluster ceph --mkfs -i mon1 \
  --monmap /tmp/monmap \
  --keyring /tmp/ceph.mon.keyring

# Start monitor
sudo systemctl start ceph-mon@mon1
sudo systemctl enable ceph-mon@mon1
```

## Adding an OSD

```bash
# Prepare the disk (automatically allocates OSD ID)
sudo ceph-volume lvm prepare --bluestore --data /dev/sdb

# Activate all prepared OSDs
sudo ceph-volume lvm activate --all

# Verify OSD is up
sudo ceph osd stat
```

## Summary

Manual Ceph installation from packages gives you precise control over each daemon and its configuration. The process involves adding the Ceph package repository, installing role-specific packages, creating `ceph.conf`, bootstrapping the monitor with a generated FSID and keyrings, and activating OSDs with `ceph-volume`. While orchestration tools like cephadm automate these steps for production deployments, understanding the manual process is invaluable for troubleshooting, custom automation, and deep learning of Ceph's architecture.
