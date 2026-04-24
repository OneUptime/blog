# How to Set Up iSCSI Storage with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, iSCSI, Storage, Docker, Block Storage

Description: Configure iSCSI block storage for Docker containers managed by Portainer to provide high-performance persistent storage from a SAN or NAS target.

## Introduction

iSCSI presents block storage devices over a network, allowing containers on a Docker host to access dedicated storage volumes as if they were local disks. This can be a better fit than NFS for some I/O-intensive workloads like databases, depending on the storage and network. Portainer manages the containers while iSCSI handles the underlying block storage.

## Prerequisites

- iSCSI target (TrueNAS, Synology NAS, or software target like targetcli)
- Docker host with open-iscsi installed (use a separate LUN per host if multiple Docker hosts need storage)
- Network connectivity on dedicated storage VLAN (recommended)

## Step 1: Set Up iSCSI Target

### Using TrueNAS (GUI)

1. Storage > Pools > Create a pool or zvol for iSCSI
2. Shares > Block (iSCSI) Shares > use the Wizard or manual tabs
3. Create Portals, Initiators, Extents, Targets, and associate the target with the extent

### Using targetcli (Software Target)

```bash
# Install targetcli on the storage server

sudo apt-get install -y targetcli-fb

# Create a block device-backed target
sudo targetcli

# In targetcli shell:
/> backstores/block create name=disk0 dev=/dev/sdb
/> iscsi/ create iqn.2024-01.com.example:storage
/> iscsi/iqn.2024-01.com.example:storage/tpg1/luns create /backstores/block/disk0

# Allow the initiator IQN from the Docker host
/> iscsi/iqn.2024-01.com.example:storage/tpg1/acls create iqn.2024-01.com.example:docker-host1
/> iscsi/iqn.2024-01.com.example:storage/tpg1/acls/iqn.2024-01.com.example:docker-host1 create 0 0

# Disable CHAP authentication for this example
/> iscsi/iqn.2024-01.com.example:storage/tpg1 set attribute authentication=0

/> saveconfig
/> exit

# Enable and start target service
sudo systemctl enable --now rtslib-fb-targetctl
```

## Step 2: Configure iSCSI Initiator on the Docker Host

```bash
# Install open-iscsi on the Docker host
sudo apt-get install -y open-iscsi

# Configure initiator name (replace docker-host1 with a unique value for this host)
printf 'InitiatorName=iqn.2024-01.com.example:%s\n' "docker-host1" \
  | sudo tee /etc/iscsi/initiatorname.iscsi

# Update iSCSI timeouts
sudo sed -i \
  -e 's/^node.startup = .*/node.startup = automatic/' \
  -e 's/^node.session.timeo.replacement_timeout = .*/node.session.timeo.replacement_timeout = 120/' \
  -e 's/^node.conn\[0\].timeo.login_timeout = .*/node.conn[0].timeo.login_timeout = 30/' \
  -e 's/^node.conn\[0\].timeo.logout_timeout = .*/node.conn[0].timeo.logout_timeout = 15/' \
  -e 's/^node.conn\[0\].timeo.noop_out_interval = .*/node.conn[0].timeo.noop_out_interval = 5/' \
  -e 's/^node.conn\[0\].timeo.noop_out_timeout = .*/node.conn[0].timeo.noop_out_timeout = 5/' \
  /etc/iscsi/iscsid.conf

sudo systemctl restart iscsid
```

## Step 3: Discover and Connect to iSCSI Target

```bash
# Discover iSCSI targets
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.100:3260

# Login to target
sudo iscsiadm -m node \
  --targetname iqn.2024-01.com.example:storage \
  --portal 192.168.1.100:3260 \
  --login

# Verify connection
sudo iscsiadm -m session
lsblk  # The iSCSI disk should appear as /dev/sdb or similar

# Make login persistent
sudo iscsiadm -m node \
  --targetname iqn.2024-01.com.example:storage \
  --portal 192.168.1.100:3260 \
  --op update -n node.startup -v automatic
```

## Step 4: Prepare the iSCSI Disk

```bash
# Format the iSCSI disk (assuming it appeared as /dev/sdb)
sudo parted -s /dev/sdb mklabel gpt
sudo parted -s -a optimal /dev/sdb mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdb1

# Get the UUID for stable identification
sudo blkid /dev/sdb1

# Mount it
sudo mkdir -p /mnt/iscsi-storage
echo "UUID=<your-uuid> /mnt/iscsi-storage ext4 _netdev,defaults 0 0" \
  | sudo tee -a /etc/fstab
sudo mount -a

# Verify
df -h /mnt/iscsi-storage
```

## Step 5: Create Docker Volume on iSCSI Storage

```bash
# Create the directory on the iSCSI mount on the Docker host that will run PostgreSQL
sudo mkdir -p /mnt/iscsi-storage/db-data
sudo chown 999:999 /mnt/iscsi-storage/db-data  # postgres user

# Create a Docker volume backed by iSCSI storage
docker volume create \
  --driver local \
  --opt type=none \
  --opt device=/mnt/iscsi-storage/db-data \
  --opt o=bind \
  iscsi-db-data
```

## Step 6: Deploy Database via Portainer Using iSCSI Volume

```yaml
# postgres-iscsi-stack.yml
services:
  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: "${DB_PASSWORD}"
      POSTGRES_DB: myapp
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - iscsi-db-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  iscsi-db-data:
    external: true  # Already created via CLI
```

## Performance Testing

```bash
# Test read/write performance on iSCSI volume
docker run --rm \
  -v iscsi-db-data:/test \
  ubuntu:latest \
  bash -c "dd if=/dev/zero of=/test/testfile bs=1M count=1000 conv=fdatasync"

# Compare with a known local-disk path on the host
dd if=/dev/zero of=/var/tmp/testfile bs=1M count=1000 conv=fdatasync

# Use fio for more detailed testing
docker run --rm \
  -v iscsi-db-data:/test \
  nixery.dev/fio \
  fio --name=test --rw=randread --bs=4k --size=1G --directory=/test
```

## Conclusion

iSCSI storage with Portainer provides network-attached block storage for I/O-intensive container workloads like databases. Compared with NFS, the Docker host gets a block device that it formats and mounts locally, which can be a better fit for some transactional workloads. Configure multipath iSCSI for redundancy in production environments, and avoid mounting the same ext4-formatted LUN read/write on multiple hosts unless you are using a cluster-aware filesystem.
