# How to Create VM Templates for Quick Provisioning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Virtualization, Templates

Description: Learn how to create reusable KVM virtual machine templates on Ubuntu using virt-sysprep and cloud-init for fast, consistent VM provisioning.

---

Creating VMs from scratch for every deployment wastes time and introduces inconsistency. VM templates let you provision new instances in minutes with a consistent baseline configuration. This guide covers two approaches: using `virt-sysprep` to create generalized templates from existing VMs, and using Ubuntu cloud images with cloud-init for the most flexible provisioning workflow.

## Approach 1: Creating Templates with virt-sysprep

`virt-sysprep` prepares a VM disk image to be used as a template by removing machine-specific data: SSH host keys, network MAC addresses, machine ID, logs, and user-specific content.

### Installing Required Tools

```bash
sudo apt update
sudo apt install libguestfs-tools virtinst
```

### Building Your Base VM

Start by creating a VM with your standard configuration:

```bash
# Create the base VM
sudo virt-install \
  --name ubuntu-base \
  --memory 2048 \
  --vcpus 2 \
  --disk size=20,format=qcow2,path=/var/lib/libvirt/images/ubuntu-base.qcow2 \
  --cdrom /path/to/ubuntu-22.04-server.iso \
  --os-variant ubuntu22.04 \
  --network network=default \
  --graphics none \
  --extra-args 'console=ttyS0'
```

After installation, connect and configure your standard packages and settings:

```bash
# Connect to the base VM console
virsh console ubuntu-base

# Inside the VM - install your standard software
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  curl \
  wget \
  git \
  htop \
  vim \
  fail2ban \
  unattended-upgrades

# Configure security baseline
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure SSH hardening
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config

# Clean up apt cache to reduce image size
sudo apt clean
sudo apt autoremove -y

# Exit the VM
exit
```

### Sysprep the Base VM

```bash
# Shut down the VM first
virsh shutdown ubuntu-base

# Wait for it to stop
virsh list --all | grep ubuntu-base

# Run virt-sysprep to generalize the image
sudo virt-sysprep \
  --domain ubuntu-base \
  --operations defaults,-ssh-userdir \
  --firstboot-command 'dpkg-reconfigure openssh-server'

# What virt-sysprep removes by default:
# - SSH host keys (regenerated on first boot)
# - Machine ID (/etc/machine-id)
# - Network MAC addresses from udev rules
# - Log files
# - Random seeds
# - User shell histories
```

### Creating the Template Disk Image

Convert the sysprep'd disk to a read-only template:

```bash
# Create a templates directory
sudo mkdir -p /var/lib/libvirt/images/templates

# Convert and compress the template
sudo qemu-img convert \
  -f qcow2 \
  -O qcow2 \
  -c \
  /var/lib/libvirt/images/ubuntu-base.qcow2 \
  /var/lib/libvirt/images/templates/ubuntu-22.04-base.qcow2

# Check the compressed size
ls -lh /var/lib/libvirt/images/templates/ubuntu-22.04-base.qcow2
```

### Provisioning New VMs from the Template

Use qcow2's overlay feature to create thin clones that share the base image:

```bash
# Create a new disk as an overlay of the template
sudo qemu-img create \
  -f qcow2 \
  -b /var/lib/libvirt/images/templates/ubuntu-22.04-base.qcow2 \
  -F qcow2 \
  /var/lib/libvirt/images/webserver-01.qcow2 \
  20G  # Can be larger than base

# Create the VM using this overlay disk
sudo virt-install \
  --name webserver-01 \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/webserver-01.qcow2,format=qcow2 \
  --os-variant ubuntu22.04 \
  --network network=default \
  --import \
  --noautoconsole
```

## Approach 2: Using Ubuntu Cloud Images with cloud-init

Cloud images are pre-built, minimal Ubuntu installations designed for fast provisioning. cloud-init handles initial configuration on first boot.

### Downloading Cloud Images

```bash
# Create a directory for base images
sudo mkdir -p /var/lib/libvirt/images/base

# Download Ubuntu 22.04 cloud image
sudo wget -O /var/lib/libvirt/images/base/ubuntu-22.04-cloud.qcow2 \
  https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Verify the download
sha256sum /var/lib/libvirt/images/base/ubuntu-22.04-cloud.qcow2
```

### Creating a cloud-init Configuration

cloud-init reads configuration from a ISO image attached to the VM:

```bash
# Create a working directory for the new VM
mkdir -p /tmp/vm-init/webserver-02
cd /tmp/vm-init/webserver-02
```

Create the user data file:

```bash
cat > user-data << 'EOF'
#cloud-config

# Set hostname
hostname: webserver-02
fqdn: webserver-02.example.com
manage_etc_hosts: true

# Create admin user
users:
  - name: ubuntu
    gecos: Ubuntu Admin
    groups: [sudo]
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... your-public-key-here

# Disable root login
disable_root: true

# Update packages and install software
package_update: true
package_upgrade: true
packages:
  - nginx
  - git
  - htop
  - curl

# Configure services
runcmd:
  - systemctl enable nginx
  - systemctl start nginx

# Final message
final_message: "VM initialization complete after $UPTIME seconds"
EOF
```

Create the network config file:

```bash
cat > network-config << 'EOF'
version: 2
ethernets:
  enp1s0:
    dhcp4: true
    dhcp6: false
EOF
```

Create the meta-data file:

```bash
cat > meta-data << 'EOF'
instance-id: webserver-02
local-hostname: webserver-02
EOF
```

Generate the cloud-init ISO:

```bash
# Install cloud-image-utils
sudo apt install cloud-image-utils

# Create the seed ISO
sudo cloud-localds \
  /var/lib/libvirt/images/webserver-02-cloud-init.iso \
  user-data \
  meta-data \
  --network-config network-config
```

### Provisioning the VM

```bash
# Create a new disk image from the base cloud image
sudo qemu-img create \
  -f qcow2 \
  -b /var/lib/libvirt/images/base/ubuntu-22.04-cloud.qcow2 \
  -F qcow2 \
  /var/lib/libvirt/images/webserver-02.qcow2 \
  20G

# Create the VM with both disks
sudo virt-install \
  --name webserver-02 \
  --memory 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/webserver-02.qcow2,format=qcow2,device=disk \
  --disk path=/var/lib/libvirt/images/webserver-02-cloud-init.iso,device=cdrom \
  --os-variant ubuntu22.04 \
  --network network=default \
  --import \
  --noautoconsole

# Get the VM's IP address after boot
virsh domifaddr webserver-02
```

### Creating a Provisioning Script

Automate the entire provisioning process:

```bash
sudo nano /usr/local/bin/provision-vm.sh
```

```bash
#!/bin/bash
# Quick VM provisioning script using cloud images
# Usage: provision-vm.sh <vm-name> <memory-mb> <vcpus> <disk-size-gb>

set -euo pipefail

VM_NAME="${1:?Usage: $0 <vm-name> <memory> <vcpus> <disk-size>}"
MEMORY="${2:-2048}"
VCPUS="${3:-2}"
DISK_SIZE="${4:-20}"

BASE_IMAGE="/var/lib/libvirt/images/base/ubuntu-22.04-cloud.qcow2"
VM_DIR="/var/lib/libvirt/images"
INIT_DIR="/tmp/cloud-init-${VM_NAME}"

echo "Provisioning VM: $VM_NAME"
echo "  Memory: ${MEMORY}MB, vCPUs: $VCPUS, Disk: ${DISK_SIZE}GB"

# Create cloud-init data
mkdir -p "$INIT_DIR"
cat > "$INIT_DIR/meta-data" << EOF
instance-id: $VM_NAME
local-hostname: $VM_NAME
EOF

cat > "$INIT_DIR/user-data" << 'EOF'
#cloud-config
users:
  - name: ubuntu
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - YOUR_SSH_PUBLIC_KEY_HERE
package_update: true
packages:
  - qemu-guest-agent
runcmd:
  - systemctl enable --now qemu-guest-agent
EOF

# Generate cloud-init ISO
cloud-localds \
  "$VM_DIR/${VM_NAME}-init.iso" \
  "$INIT_DIR/user-data" \
  "$INIT_DIR/meta-data"

# Create VM disk from base image
qemu-img create \
  -f qcow2 \
  -b "$BASE_IMAGE" \
  -F qcow2 \
  "$VM_DIR/${VM_NAME}.qcow2" \
  "${DISK_SIZE}G"

# Create the VM
virt-install \
  --name "$VM_NAME" \
  --memory "$MEMORY" \
  --vcpus "$VCPUS" \
  --disk "path=$VM_DIR/${VM_NAME}.qcow2,format=qcow2" \
  --disk "path=$VM_DIR/${VM_NAME}-init.iso,device=cdrom" \
  --os-variant ubuntu22.04 \
  --network network=default \
  --import \
  --noautoconsole

echo "VM $VM_NAME provisioned. Getting IP address..."
sleep 15  # Wait for boot
virsh domifaddr "$VM_NAME" || echo "VM still booting - check later with: virsh domifaddr $VM_NAME"

# Cleanup
rm -rf "$INIT_DIR"
```

```bash
sudo chmod +x /usr/local/bin/provision-vm.sh

# Provision a new VM in one command
sudo /usr/local/bin/provision-vm.sh webserver-03 2048 2 20
```

Using templates - whether sysprep'd custom images or cloud images with cloud-init - reduces provisioning time from 20-30 minutes of manual installation to under 2 minutes. This consistency also eliminates configuration drift between servers and makes rebuilding systems after failures fast and reliable.
