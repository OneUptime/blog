# How to Use cloud-localds for Local Cloud Image Testing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud Images, Cloud-init, QEMU, Testing

Description: Use cloud-localds on Ubuntu to create NoCloud seed ISOs for testing Ubuntu cloud images locally with QEMU, enabling offline cloud-init configuration testing before cloud deployment.

---

Testing cloud-init configurations before deploying them to a cloud provider saves time and avoids billing surprises from failed instances. `cloud-localds` is a utility that creates a small ISO file containing cloud-init configuration, which QEMU can present to a Ubuntu cloud image as if it were a cloud metadata service. This lets you test your user-data configurations entirely locally.

## How the NoCloud Datasource Works

Ubuntu cloud images ship with cloud-init that supports multiple data sources: AWS EC2 metadata, Azure IMDS, GCP metadata, and others. The **NoCloud** datasource reads configuration from a local ISO labeled `CIDATA` attached to the VM. It expects two files:

- `user-data` - Your cloud-init configuration (YAML starting with `#cloud-config`)
- `meta-data` - Instance metadata (hostname, instance ID)

`cloud-localds` creates this ISO from your configuration files.

## Installing Required Tools

```bash
# Install cloud-image-utils (provides cloud-localds)
sudo apt update
sudo apt install cloud-image-utils qemu-system-x86 qemu-utils -y

# For KVM acceleration (if your CPU supports virtualization)
sudo apt install qemu-kvm libvirt-daemon-system -y

# Verify installation
cloud-localds --version
qemu-img --version
```

## Downloading a Ubuntu Cloud Image

```bash
# Create a working directory
mkdir -p ~/cloud-test && cd ~/cloud-test

# Download Ubuntu 24.04 cloud image
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img

# Verify the download
wget https://cloud-images.ubuntu.com/noble/current/SHA256SUMS
sha256sum --check --ignore-missing SHA256SUMS

# Check image info
qemu-img info noble-server-cloudimg-amd64.img
```

## Creating a Basic cloud-init Configuration

```bash
# Create user-data file
cat > user-data.yaml << 'EOF'
#cloud-config

# Set hostname
hostname: test-instance
fqdn: test-instance.local

# Create a test user with SSH key
users:
  - name: testuser
    groups: sudo
    shell: /bin/bash
    sudo: 'ALL=(ALL) NOPASSWD:ALL'
    ssh_authorized_keys:
      - ssh-ed25519 AAAA... your_public_key_here

# Install packages
packages:
  - nginx
  - curl
  - jq

# Run commands at first boot
runcmd:
  - systemctl enable nginx
  - systemctl start nginx
  - echo "cloud-init test complete" > /tmp/cloud-init-done.txt

# Write a test file
write_files:
  - path: /etc/myapp.conf
    content: |
      [app]
      environment = test
      debug = true
    permissions: '0644'

# Final message for log verification
final_message: |
  Cloud-init complete. Uptime: $UPTIME
EOF

# Create a minimal meta-data file
cat > meta-data.yaml << 'EOF'
instance-id: test-local-001
local-hostname: test-instance
EOF
```

## Creating the Seed ISO

```bash
# Create the seed ISO using cloud-localds
cloud-localds seed.iso user-data.yaml meta-data.yaml

# Verify the ISO was created
ls -lh seed.iso
file seed.iso

# Inspect the ISO contents (optional)
isoinfo -l -i seed.iso
```

## Creating a Working Copy of the Image

Always work from a copy of the base image - cloud images can't be reused cleanly after booting:

```bash
# Make a working copy of the base image
cp noble-server-cloudimg-amd64.img test-vm.img

# Resize to give the VM more disk space (cloud images are typically 2-5GB)
qemu-img resize test-vm.img 20G

# Verify the resize
qemu-img info test-vm.img
```

## Booting the Instance with QEMU

```bash
# Boot the cloud image with the seed ISO attached
# -nographic runs in terminal mode (no GUI window)
# hostfwd maps local port 2222 to VM's port 22 for SSH access
qemu-system-x86_64 \
    -m 2048 \
    -smp 2 \
    -nographic \
    -drive file=test-vm.img,format=qcow2,if=virtio \
    -drive file=seed.iso,format=raw,if=virtio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -serial mon:stdio

# If you have KVM acceleration available (much faster):
qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -smp 2 \
    -nographic \
    -drive file=test-vm.img,format=qcow2,if=virtio \
    -drive file=seed.iso,format=raw,if=virtio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::2222-:22 \
    -serial mon:stdio
```

Cloud-init runs during the boot sequence. You'll see it working in the console output. Watch for the `final_message` you set to confirm it completed.

## Connecting to the Instance

```bash
# SSH into the running instance (from a separate terminal)
ssh -p 2222 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    testuser@localhost

# Check cloud-init status
sudo cloud-init status --long

# View cloud-init logs
sudo cat /var/log/cloud-init.log
sudo cat /var/log/cloud-init-output.log

# Verify your configurations were applied
cat /etc/myapp.conf
cat /tmp/cloud-init-done.txt
systemctl status nginx
```

## Testing Network Configuration

```bash
# Add network configuration to user-data for testing
cat > user-data-network.yaml << 'EOF'
#cloud-config
hostname: test-network

# Test Netplan configuration (applies on next reboot or network restart)
write_files:
  - path: /etc/netplan/99-test.yaml
    content: |
      network:
        version: 2
        ethernets:
          enp0s3:
            dhcp4: true
            nameservers:
              addresses: [8.8.8.8, 8.8.4.4]

runcmd:
  - netplan apply
  - ping -c 3 8.8.8.8 || echo "no external connectivity (expected in QEMU NAT)"
  - systemd-resolve --status

users:
  - name: testuser
    sudo: 'ALL=(ALL) NOPASSWD:ALL'
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAA... your_key_here
EOF

cloud-localds seed-network.iso user-data-network.yaml meta-data.yaml
```

## Testing Multipart user-data

cloud-init supports multipart MIME for mixed content types:

```bash
# Create a shell script to include alongside cloud-config
cat > setup-script.sh << 'EOF'
#!/bin/bash
# This runs as a shell script (not cloud-config YAML)
echo "Running setup script at $(date)"
mkdir -p /opt/myapp
useradd -r -s /bin/false myapp
EOF

# Create a cloud-config portion
cat > cloud-config-part.yaml << 'EOF'
#cloud-config
hostname: multipart-test
packages:
  - nginx
EOF

# Combine into multipart user-data
cloud-localds \
    --dsmode local \
    seed-multipart.iso \
    <(write-mime-multipart --output=- \
        cloud-config-part.yaml:text/cloud-config \
        setup-script.sh:text/x-shellscript) \
    meta-data.yaml
```

## Running Tests Without a Display

For automated testing in CI/CD:

```bash
#!/bin/bash
# /usr/local/bin/test-cloud-init.sh
# Automated cloud-init configuration test

set -euo pipefail

USERDATA="$1"
TEST_ID="test-$(date +%s)"
WORKDIR="/tmp/cloud-test-$TEST_ID"

mkdir -p "$WORKDIR"
cd "$WORKDIR"

# Copy base image
cp ~/cloud-test/noble-server-cloudimg-amd64.img test-vm.img
qemu-img resize test-vm.img 10G

# Create seed ISO
cp "$USERDATA" user-data.yaml
echo "instance-id: $TEST_ID" > meta-data.yaml
echo "local-hostname: test-instance" >> meta-data.yaml
cloud-localds seed.iso user-data.yaml meta-data.yaml

# Boot with a timeout
timeout 300 qemu-system-x86_64 \
    -m 1024 \
    -nographic \
    -drive file=test-vm.img,format=qcow2,if=virtio \
    -drive file=seed.iso,format=raw,if=virtio \
    -net nic,model=virtio \
    -net user,hostfwd=tcp::${TEST_PORT:-2223}-:22 \
    -serial file:console.log &

QEMU_PID=$!

# Wait for cloud-init to finish (max 120 seconds)
sleep 30
ssh -p ${TEST_PORT:-2223} \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=10 \
    testuser@localhost \
    "sudo cloud-init status --wait" && echo "TEST PASSED" || echo "TEST FAILED"

# Cleanup
kill $QEMU_PID 2>/dev/null || true
rm -rf "$WORKDIR"
```

## Useful cloud-localds Options

```bash
# Specify network config as a separate file (for v2 network config)
cloud-localds \
    --network-config=network-config.yaml \
    seed.iso \
    user-data.yaml \
    meta-data.yaml

# Use filesystem format instead of ISO
cloud-localds \
    --filesystem=vfat \
    seed.img \
    user-data.yaml

# Set the disk label (must be CIDATA for cloud-init to recognize it)
cloud-localds \
    --disk-format=raw \
    seed.iso \
    user-data.yaml
```

## Debugging cloud-init Issues

```bash
# Inside the test VM, check cloud-init status
sudo cloud-init status --long

# View detailed logs
sudo journalctl -u cloud-init -b

# Verify all modules ran
sudo cloud-init analyze show

# Re-run cloud-init (for testing changes)
sudo cloud-init clean
sudo cloud-init init
sudo cloud-init modules --mode=config
sudo cloud-init modules --mode=final

# Check which datasource was detected
sudo cloud-init query datasource
```

cloud-localds removes the cloud provider from the testing loop entirely. Changes to user-data files can be tested in minutes on local hardware before committing to cloud deployments, which saves both time and money.
