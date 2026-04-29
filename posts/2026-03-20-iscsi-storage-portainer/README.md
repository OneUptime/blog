# How to Set Up iSCSI Storage with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, iSCSI, Storage, Docker, Block Storage, DevOps, Linux

Description: Learn how to configure iSCSI block storage and use it as persistent volume storage for containers managed by Portainer.

---

iSCSI (Internet Small Computer System Interface) lets you attach block storage devices over a TCP/IP network. For Portainer-managed containers, iSCSI provides high-performance block storage that appears as a local disk on the Docker host where you mount it - ideal for databases and workloads requiring fast I/O.

---

## iSCSI Concepts

- **Target**: The storage server (provides the LUN/disk)
- **Initiator**: The client (your Docker host that mounts the storage)
- **LUN**: Logical Unit Number - the virtual disk presented by the target
- **IQN**: iSCSI Qualified Name - unique identifier for targets and initiators

---

## Step 1: Set Up the iSCSI Target (Storage Server)

```bash
# Install targetcli on your storage server (Ubuntu/Debian)

sudo apt update && sudo apt install -y targetcli-fb

# Create the directory for the backing file
sudo mkdir -p /var/lib/iscsi-store

# Start targetcli interactive shell
sudo targetcli

# Inside targetcli:
# Create a backing storage file (or use a real disk block device)
/backstores/fileio create portainer-lun /var/lib/iscsi-store/portainer.img 50G

# Create an iSCSI target
/iscsi create iqn.2026-03.com.example:portainer-storage

# Create a LUN under the target
/iscsi/iqn.2026-03.com.example:portainer-storage/tpg1/luns create /backstores/fileio/portainer-lun

# Add an Access Control List (ACL) for your Docker host's IQN
/iscsi/iqn.2026-03.com.example:portainer-storage/tpg1/acls create iqn.2026-03.com.example:docker-host-01

# Save and exit
saveconfig
exit
```

---

## Step 2: Configure the iSCSI Initiator on the Docker Host

```bash
# Install open-iscsi on the Docker host
sudo apt update && sudo apt install -y open-iscsi

# Edit the initiator name to match the ACL you created
sudo bash -c 'echo "InitiatorName=iqn.2026-03.com.example:docker-host-01" > /etc/iscsi/initiatorname.iscsi'

# Restart iscsid so it picks up the new initiator IQN
sudo systemctl restart iscsid

# Discover targets on the storage server
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.50

# Login to the target
sudo iscsiadm -m node \
  --targetname iqn.2026-03.com.example:portainer-storage \
  --portal 192.168.1.50:3260 \
  --login

# Configure the node for automatic login on boot
sudo iscsiadm -m node \
  --targetname iqn.2026-03.com.example:portainer-storage \
  --portal 192.168.1.50:3260 \
  --op update -n node.startup -v automatic

# Verify the new block device appeared
lsblk | grep sd
# You should see a new device like /dev/sdb
```

---

## Step 3: Format and Mount the iSCSI Volume

```bash
# Format the iSCSI block device with ext4
sudo mkfs.ext4 /dev/sdb

# Create a mount point
sudo mkdir -p /mnt/iscsi-portainer

# Mount it
sudo mount /dev/sdb /mnt/iscsi-portainer

# Get the disk UUID for persistent mounting
sudo blkid /dev/sdb

# Add to /etc/fstab for automatic mount on boot
echo "UUID=<your-uuid> /mnt/iscsi-portainer ext4 _netdev 0 0" | sudo tee -a /etc/fstab
```

---

## Step 4: Use the iSCSI Mount in Portainer Stacks

With iSCSI mounted as `/mnt/iscsi-portainer`, use it as a bind mount in your Portainer stacks.

```yaml
# database-stack.yml - high-performance database using iSCSI storage
version: "3.8"

services:
  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      # Bind mount to iSCSI-backed storage for best I/O performance
      - /mnt/iscsi-portainer/postgres/data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

secrets:
  db_password:
    external: true
```

---

## Step 5: Create a Docker Volume Backed by iSCSI

For a cleaner stack definition:

```bash
# Create the source directory for the bind-backed volume
sudo mkdir -p /mnt/iscsi-portainer/myapp

# Create a Docker named volume pointing to the iSCSI mount
docker volume create \
  --driver local \
  --opt type=none \
  --opt o=bind \
  --opt device=/mnt/iscsi-portainer/myapp \
  iscsi-myapp-data

# Use in Portainer stacks with external: true
```

---

## Summary

iSCSI storage for Portainer requires configuring a target server, connecting the Docker host as an initiator, and mounting the resulting block device. Once mounted, the iSCSI volume appears as a local directory on that host and can be used as a bind mount in Portainer stacks scheduled there. For database workloads, iSCSI can provide strong block-storage performance over the network, depending on your network and storage backend.
