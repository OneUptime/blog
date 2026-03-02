# How to Use Cloud Images with KVM on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Cloud Images, cloud-init

Description: Learn how to deploy Ubuntu cloud images with KVM on Ubuntu, including cloud-init configuration, custom metadata, and automated VM provisioning.

---

Cloud images are pre-built Ubuntu installations designed for rapid VM deployment. They are significantly smaller than full ISO images, boot faster, and are ready for cloud-init configuration. Using cloud images with KVM gives you the same quick provisioning you would get from a cloud provider, but on your own hardware.

## What Are Cloud Images

Ubuntu cloud images are minimal OS installations with:
- cloud-init installed and enabled
- No swap partition (configurable via cloud-init)
- Kernel optimized for virtual machine use
- Size typically between 500 MB and 2 GB (compressed)
- Available for multiple architectures (amd64, arm64)

Download locations:
- Ubuntu Cloud Images: `https://cloud-images.ubuntu.com/`
- Each release has a directory with daily and release builds

## Downloading Cloud Images

```bash
# Create directory for base images
sudo mkdir -p /var/lib/libvirt/images/base
cd /var/lib/libvirt/images/base

# Download Ubuntu 22.04 LTS (Jammy)
sudo wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Download Ubuntu 24.04 LTS (Noble)
sudo wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

# Verify integrity
sha256sum jammy-server-cloudimg-amd64.img
# Compare with SHA256SUMS file from the same directory
wget https://cloud-images.ubuntu.com/jammy/current/SHA256SUMS
sha256sum -c SHA256SUMS 2>/dev/null | grep jammy-server-cloudimg-amd64

# Check image info
qemu-img info jammy-server-cloudimg-amd64.img
```

## Understanding the cloud-init Data Sources

cloud-init reads configuration from multiple sources. For local KVM deployments, we use the NoCloud data source, which reads from a local ISO image attached as a CD-ROM:

The ISO contains:
- `meta-data` - instance ID and hostname
- `user-data` - user, packages, commands configuration
- `network-config` - network interface configuration

## Creating a cloud-init Configuration

### Basic user-data

```bash
# Create working directory for a new VM
mkdir -p /tmp/vm-provision/webserver-01
cd /tmp/vm-provision/webserver-01

# Create user-data
cat > user-data << 'EOF'
#cloud-config

# Hostname configuration
hostname: webserver-01
manage_etc_hosts: true

# User configuration
users:
  - name: ubuntu
    gecos: Ubuntu User
    groups: [sudo, adm]
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    lock_passwd: true
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your-public-key-here

# Disable root SSH login
disable_root: true

# Set timezone
timezone: America/New_York

# NTP configuration
ntp:
  enabled: true
  servers:
    - 0.pool.ntp.org
    - 1.pool.ntp.org

# Package management
package_update: true
package_upgrade: true
package_reboot_if_required: true
packages:
  - qemu-guest-agent
  - nginx
  - curl
  - git
  - htop
  - fail2ban

# Write files
write_files:
  - path: /etc/nginx/sites-available/default
    content: |
      server {
          listen 80;
          server_name _;
          root /var/www/html;
          index index.html;
      }
    owner: root:root
    permissions: '0644'

# Run commands after packages are installed
runcmd:
  - systemctl enable --now qemu-guest-agent
  - systemctl enable --now nginx
  - systemctl enable --now fail2ban
  - echo "Cloud-init setup complete" > /var/log/cloud-init-complete.log

# Final message logged to the console
final_message: |
  Cloud-init finished after $UPTIME seconds.
  Hostname: $HOSTNAME
EOF
```

### Network Configuration

```bash
# Static IP network config
cat > network-config << 'EOF'
version: 2
ethernets:
  enp1s0:
    addresses:
      - 192.168.1.50/24
    routes:
      - to: default
        via: 192.168.1.1
    nameservers:
      addresses:
        - 8.8.8.8
        - 8.8.4.4
EOF

# OR DHCP network config
cat > network-config << 'EOF'
version: 2
ethernets:
  enp1s0:
    dhcp4: true
    dhcp6: false
EOF
```

### Metadata File

```bash
cat > meta-data << 'EOF'
instance-id: webserver-01-$(date +%s)
local-hostname: webserver-01
EOF
```

## Generating the cloud-init ISO

```bash
# Install cloud-image-utils
sudo apt install cloud-image-utils

# Generate seed ISO
sudo cloud-localds \
  /var/lib/libvirt/images/webserver-01-seed.iso \
  user-data \
  meta-data \
  --network-config network-config

# Verify ISO contents
sudo mount -o loop /var/lib/libvirt/images/webserver-01-seed.iso /mnt
ls /mnt
sudo umount /mnt
```

## Creating and Launching the VM

```bash
# Create a new disk as an overlay of the base image
sudo qemu-img create \
  -f qcow2 \
  -b /var/lib/libvirt/images/base/jammy-server-cloudimg-amd64.img \
  -F qcow2 \
  /var/lib/libvirt/images/webserver-01.qcow2 \
  20G

# Check overlay was created correctly
qemu-img info /var/lib/libvirt/images/webserver-01.qcow2
# Should show backing file reference

# Create the VM
sudo virt-install \
  --name webserver-01 \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/webserver-01.qcow2,format=qcow2,bus=virtio \
  --disk path=/var/lib/libvirt/images/webserver-01-seed.iso,device=cdrom \
  --os-variant ubuntu22.04 \
  --network network=default,model=virtio \
  --import \
  --graphics none \
  --noautoconsole

# Watch the boot process
virsh console webserver-01
# Press Ctrl+] to exit
```

## Monitoring cloud-init Progress

```bash
# Get the VM's IP address
virsh domifaddr webserver-01

# SSH into the VM
ssh ubuntu@<vm-ip>

# Check cloud-init status inside VM
cloud-init status
cloud-init status --wait   # Wait for completion

# View cloud-init log
sudo cat /var/log/cloud-init.log | tail -50
sudo cat /var/log/cloud-init-output.log

# Verify all modules ran
cloud-init analyze show
```

## Detaching the Seed ISO After First Boot

Once cloud-init has completed its initial configuration, remove the seed ISO:

```bash
# Find the CD-ROM device name
virsh domblklist webserver-01

# Eject and detach the seed disk (assuming it's hda or sda)
virsh change-media webserver-01 sda --eject --force
virsh detach-disk webserver-01 sda --persistent

# Delete the seed ISO file
sudo rm /var/lib/libvirt/images/webserver-01-seed.iso
```

## Creating a Reusable Provisioning Script

```bash
sudo nano /usr/local/bin/create-vm.sh
```

```bash
#!/bin/bash
# Create a new VM from Ubuntu cloud image
# Usage: create-vm.sh <name> <memory> <vcpus> <disk-size> <ip-or-dhcp> [ssh-key]

set -euo pipefail

VM_NAME="${1:?Provide VM name}"
MEMORY="${2:-2048}"
VCPUS="${3:-2}"
DISK_GB="${4:-20}"
IP_CONFIG="${5:-dhcp}"   # "dhcp" or "192.168.1.x/24"
SSH_KEY="${6:-$(cat ~/.ssh/id_ed25519.pub 2>/dev/null || echo "")}"

BASE_IMAGE="/var/lib/libvirt/images/base/jammy-server-cloudimg-amd64.img"
IMG_DIR="/var/lib/libvirt/images"
WORK_DIR="/tmp/cloud-init-${VM_NAME}-$$"

mkdir -p "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

# Create meta-data
cat > "$WORK_DIR/meta-data" << EOF
instance-id: ${VM_NAME}-$(date +%s)
local-hostname: ${VM_NAME}
EOF

# Create user-data
cat > "$WORK_DIR/user-data" << EOF
#cloud-config
hostname: ${VM_NAME}
manage_etc_hosts: true
users:
  - name: ubuntu
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ${SSH_KEY}
packages:
  - qemu-guest-agent
runcmd:
  - systemctl enable --now qemu-guest-agent
EOF

# Create network-config
if [ "$IP_CONFIG" = "dhcp" ]; then
    cat > "$WORK_DIR/network-config" << 'EOF'
version: 2
ethernets:
  enp1s0:
    dhcp4: true
EOF
else
    GATEWAY=$(echo "$IP_CONFIG" | cut -d. -f1-3).1
    cat > "$WORK_DIR/network-config" << EOF
version: 2
ethernets:
  enp1s0:
    addresses:
      - ${IP_CONFIG}
    routes:
      - to: default
        via: ${GATEWAY}
    nameservers:
      addresses: [8.8.8.8]
EOF
fi

# Generate seed ISO
cloud-localds \
    "${IMG_DIR}/${VM_NAME}-seed.iso" \
    "$WORK_DIR/user-data" \
    "$WORK_DIR/meta-data" \
    --network-config "$WORK_DIR/network-config"

# Create VM disk overlay
qemu-img create \
    -f qcow2 \
    -b "$BASE_IMAGE" \
    -F qcow2 \
    "${IMG_DIR}/${VM_NAME}.qcow2" \
    "${DISK_GB}G"

# Create VM
virt-install \
    --name "$VM_NAME" \
    --memory "$MEMORY" \
    --vcpus "$VCPUS" \
    --disk "path=${IMG_DIR}/${VM_NAME}.qcow2,format=qcow2,bus=virtio" \
    --disk "path=${IMG_DIR}/${VM_NAME}-seed.iso,device=cdrom" \
    --os-variant ubuntu22.04 \
    --network "network=default,model=virtio" \
    --import \
    --noautoconsole

echo "VM $VM_NAME created. Waiting for IP..."
sleep 15
virsh domifaddr "$VM_NAME" 2>/dev/null || echo "Check with: virsh domifaddr $VM_NAME"
```

```bash
sudo chmod +x /usr/local/bin/create-vm.sh

# Deploy VMs in seconds
sudo create-vm.sh webserver-01 2048 2 20 dhcp
sudo create-vm.sh db-server-01 4096 4 50 "192.168.122.50/24"
```

Cloud images combined with cloud-init provide a flexible, repeatable way to provision VMs. The same user-data can configure anything from a basic server to a fully configured application instance, making it practical to maintain consistent environments across development, staging, and production.
