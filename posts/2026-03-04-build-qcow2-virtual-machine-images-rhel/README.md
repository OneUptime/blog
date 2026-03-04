# How to Build QCOW2 Virtual Machine Images for RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, QCOW2, KVM, Image Builder, Virtualization, Linux

Description: Build QCOW2 images for RHEL virtual machines using Image Builder, ready for deployment on KVM, libvirt, and OpenStack environments.

---

QCOW2 (QEMU Copy-On-Write version 2) is the native disk format for KVM and libvirt. RHEL Image Builder can produce QCOW2 images that you can immediately deploy as virtual machines.

## Creating a Blueprint for KVM

```toml
# kvm-server.toml
name = "kvm-server"
description = "RHEL QCOW2 image for KVM deployment"
version = "1.0.0"

[[packages]]
name = "qemu-guest-agent"
version = "*"

[[packages]]
name = "cloud-init"
version = "*"

[[packages]]
name = "cloud-utils-growpart"
version = "*"

[[packages]]
name = "vim-enhanced"
version = "*"

[customizations.services]
enabled = ["qemu-guest-agent", "cloud-init", "sshd"]

[customizations]
hostname = ""
```

## Building the QCOW2 Image

```bash
# Push the blueprint
composer-cli blueprints push kvm-server.toml

# Start the QCOW2 build
composer-cli compose start kvm-server qcow2

# Monitor progress
composer-cli compose status

# Download the image
composer-cli compose image <compose-uuid>
```

## Deploying with virt-install

```bash
# Copy the image to the libvirt images directory
sudo cp <compose-uuid>-disk.qcow2 /var/lib/libvirt/images/rhel-server.qcow2

# Resize the disk if needed (default is usually small)
sudo qemu-img resize /var/lib/libvirt/images/rhel-server.qcow2 50G

# Create a VM using virt-install
sudo virt-install \
  --name rhel-server \
  --memory 4096 \
  --vcpus 2 \
  --disk /var/lib/libvirt/images/rhel-server.qcow2,format=qcow2 \
  --import \
  --os-variant rhel9.4 \
  --network bridge=virbr0 \
  --graphics none \
  --console pty,target_type=serial \
  --noautoconsole
```

## Using cloud-init with the QCOW2 Image

Create a cloud-init ISO to inject configuration:

```bash
# Create cloud-init configuration files
mkdir -p /tmp/cloud-init

cat > /tmp/cloud-init/user-data << 'USERDATA'
#cloud-config
users:
  - name: admin
    groups: wheel
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1... admin@workstation
USERDATA

cat > /tmp/cloud-init/meta-data << 'METADATA'
instance-id: rhel-server-01
local-hostname: rhel-server
METADATA

# Create the cloud-init ISO
genisoimage -output /var/lib/libvirt/images/cloud-init.iso \
  -volid cidata -joliet -rock \
  /tmp/cloud-init/user-data /tmp/cloud-init/meta-data

# Attach the cloud-init ISO to the VM
sudo virsh attach-disk rhel-server \
  /var/lib/libvirt/images/cloud-init.iso \
  sda --type cdrom --config
```

## Managing the VM

```bash
# Start the VM
sudo virsh start rhel-server

# Connect to the console
sudo virsh console rhel-server

# List running VMs
sudo virsh list

# Shut down the VM
sudo virsh shutdown rhel-server
```
