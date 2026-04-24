# How to Deploy Portainer on a Proxmox Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Proxmox, Virtual Machine, Docker, Self-Hosted, Home Lab

Description: Create a dedicated Ubuntu VM in Proxmox and deploy Portainer with proper resource allocation and ZFS or LVM storage for reliable container management.

## Introduction

Proxmox VE is a popular open-source virtualization platform for home labs and small data centers. Deploying Portainer in a dedicated Proxmox VM gives you clean separation from the host OS, easy snapshot and backup capabilities, and the full Docker experience. This guide covers creating the VM and deploying Portainer.

## Prerequisites

- Proxmox VE 8.x installed
- Ubuntu 24.04 LTS ISO uploaded to Proxmox
- At least 4GB RAM and 2 vCPUs available to allocate
- Network bridge configured in Proxmox

## Step 1: Upload Ubuntu ISO

1. In Proxmox WebUI, navigate to your node > **local (storage)**
2. Click **ISO Images > Upload**
3. Upload Ubuntu 24.04 LTS server ISO
4. Or download directly:

```bash
# On Proxmox host via SSH

wget -P /var/lib/vz/template/iso/ \
  https://releases.ubuntu.com/24.04/ubuntu-24.04.4-live-server-amd64.iso
```

## Step 2: Create the VM

### Via Proxmox WebUI

1. Click **Create VM**
2. **General**: Node: your node, VM ID: 200, Name: `portainer-vm`
3. **OS**: Select uploaded Ubuntu ISO, Type: Linux, Version: 6.x
4. **System**: Leave defaults (SeaBIOS works fine) and enable **QEMU Guest Agent**
5. **Disks**: Add disk, Storage: local-lvm (or your preferred storage), Size: 32GB
6. **CPU**: Sockets: 1, Cores: 2
7. **Memory**: 4096 MB (4GB)
8. **Network**: Bridge: vmbr0, Model: VirtIO
9. Click **Finish**

### Via Proxmox CLI (qm)

```bash
# SSH into Proxmox host
ssh root@<proxmox-ip>

# Create VM
qm create 200 \
  --name portainer-vm \
  --memory 4096 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0 \
  --ide2 local:iso/ubuntu-24.04.4-live-server-amd64.iso,media=cdrom \
  --scsi0 local-lvm:32 \
  --scsihw virtio-scsi-pci \
  --boot 'order=ide2;scsi0' \
  --agent enabled=1 \
  --ostype l26

# Start the VM
qm start 200
```

## Step 3: Install Ubuntu in the VM

Connect via Proxmox console (VNC) or:

```bash
# Open console via Proxmox WebUI
# Navigate to VM > Console
```

Install Ubuntu with:
- Default Ubuntu Server install
- OpenSSH server: Yes
- A standard partition layout is fine unless you specifically want LVM/RAID inside the guest

After installation:

```bash
# SSH to VM
ssh ubuntu@<vm-ip>

# Update
sudo apt update && sudo apt upgrade -y

# Install QEMU guest agent for better Proxmox integration
sudo apt install -y qemu-guest-agent
sudo systemctl enable --now qemu-guest-agent
```

## Step 4: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
newgrp docker
```

## Step 5: Deploy Portainer

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Configure Proxmox Snapshots

Take a VM snapshot with Proxmox's built-in snapshot feature:

```bash
# Take a snapshot via Proxmox CLI
qm snapshot 200 pre-portainer-install --description "Before Portainer installation"

# List snapshots
qm listsnapshot 200
```

Or configure automated backups:

1. In Proxmox, navigate to **Datacenter > Backup**
2. Click **Add**
3. Select your VM (ID 200)
4. Schedule: Daily at 2:00 AM
5. Storage: select your backup storage
6. Mode: Snapshot

## Step 7: Add Proxmox Disk for Docker Data

```bash
# On Proxmox host, add a disk to the VM
qm set 200 --scsi1 local-lvm:50

# In the VM, format and mount
sudo fdisk -l  # Find the new disk, for example /dev/sdb
sudo mkfs.ext4 /dev/<new-disk>
sudo mkdir -p /data

# Get UUID for fstab
sudo blkid /dev/<new-disk>

echo 'UUID=<your-uuid> /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
sudo mount -a

# Reconfigure Docker
sudo apt install -y rsync
sudo systemctl stop docker
sudo systemctl stop containerd
sudo mkdir -p /etc/docker /etc/containerd /data/docker /data/containerd

sudo rsync -aP /var/lib/docker/ /data/docker/
sudo rsync -aP /var/lib/containerd/ /data/containerd/

sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/data/docker"
}
EOF

sudo tee /etc/containerd/config.toml > /dev/null << 'EOF'
version = 2
root = "/data/containerd"
EOF

sudo systemctl start containerd
sudo systemctl start docker
```

## Conclusion

Running Portainer in a Proxmox VM combines the best of both worlds: Proxmox's enterprise-grade snapshot, backup, and migration capabilities with Docker's container flexibility. The VM approach provides clean isolation from the Proxmox host OS and makes it easy to clone the environment or migrate it to another Proxmox node. QEMU Guest Agent integration ensures Proxmox has accurate VM state information.
