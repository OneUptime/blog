# How to Create Ubuntu VMs Quickly with Multipass

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Virtualization, DevOps

Description: Learn how to spin up Ubuntu virtual machines in under a minute using Multipass, with tips for fast iteration and managing multiple instances efficiently.

---

One of the biggest pain points with traditional virtualization is setup time. Configuring libvirt, creating disk images, setting up networks, running through an installer - it can easily consume an hour before you even start the actual work. Multipass cuts this down to under a minute by using pre-built Ubuntu cloud images and handling all the plumbing automatically.

## How Multipass Achieves Speed

Multipass works by:
1. Downloading official Ubuntu cloud images (compressed qcow2 or img files)
2. Caching those images locally after the first download
3. Launching each new VM from the cached image using copy-on-write so disk allocation is near-instant
4. Injecting cloud-init user data for first-boot configuration
5. Wrapping the KVM hypervisor (on Linux) so you don't need to manage it directly

The first launch of a particular Ubuntu version takes 30-90 seconds (plus download time). Subsequent launches of the same version typically complete in 15-30 seconds.

## First Launch

```bash
# Install Multipass if not already done
sudo snap install multipass

# Launch the default (latest LTS) Ubuntu VM
multipass launch

# This creates an instance with a generated name like "blessed-grouper"
# Output: Launched: blessed-grouper
```

To name it yourself:

```bash
multipass launch --name quickdev
# Launched: quickdev
```

## Specifying Ubuntu Versions

```bash
# Latest LTS (recommended for stability)
multipass launch lts --name stable-env

# Ubuntu 24.04 (Noble Numbat)
multipass launch 24.04 --name noble

# Ubuntu 22.04 (Jammy Jellyfish)
multipass launch 22.04 --name jammy

# Ubuntu 20.04 (Focal Fossa)
multipass launch 20.04 --name focal

# Daily build (for testing upcoming releases)
multipass launch daily:24.10 --name daily-test
```

Check what's available:

```bash
multipass find
```

## Sizing the VM at Launch

By default, Multipass creates a VM with 1 CPU, 1GB RAM, and 5GB disk. For most development work you want more:

```bash
# Launch with 4 CPUs, 8GB RAM, 50GB disk
multipass launch 24.04 \
  --name dev-machine \
  --cpus 4 \
  --memory 8G \
  --disk 50G
```

Resources can be specified with suffixes: `K`, `M`, `G` for memory; `G` for disk.

## Getting Into the VM Fast

```bash
# Shell access - drops you directly into the VM
multipass shell quickdev

# You're now inside:
# ubuntu@quickdev:~$

# Run a command and return to host immediately
multipass exec quickdev -- uname -r
```

## Setting Defaults to Avoid Repeating Yourself

If you always want 2 CPUs and 4G RAM without specifying flags every time:

```bash
# Set defaults for new instances
sudo multipass set local.cpus=2
sudo multipass set local.memory=4G
sudo multipass set local.disk=20G

# Now a simple launch uses these defaults
multipass launch --name myvm
```

## Pre-installing Software with cloud-init

Rather than SSHing in and running apt after launch, embed setup commands in cloud-init:

```bash
# Create a cloud-init config
cat > ~/vm-init.yaml <<'EOF'
#cloud-config
package_update: true
package_upgrade: true
packages:
  - git
  - curl
  - vim
  - htop
  - build-essential
  - python3-pip
runcmd:
  - pip3 install virtualenv
  - echo "alias ll='ls -lah'" >> /home/ubuntu/.bashrc
EOF

# Launch with cloud-init
multipass launch 24.04 \
  --name ready-to-go \
  --cpus 2 \
  --memory 4G \
  --cloud-init ~/vm-init.yaml
```

The VM comes up with everything already installed. This is the fastest workflow when you repeatedly create environments with the same tooling.

## Checking Image Cache

After the first download, Multipass caches images locally:

```bash
# See where images are cached
sudo ls /var/snap/multipass/common/cache/multipassd/

# Or check via the CLI (indirect)
multipass find
```

To force a refresh of cached images:

```bash
# Delete the instance using the old image
multipass delete --purge old-instance

# The next launch of the same version will check for updates
multipass launch 24.04 --name fresh
```

## Bulk VM Creation

Need several identical VMs at once? Use a shell loop:

```bash
# Create 5 identical test VMs
for i in {1..5}; do
  multipass launch 24.04 \
    --name testnode-$i \
    --cpus 1 \
    --memory 1G \
    --disk 10G &
done

# Wait for all background jobs to complete
wait

# Verify all are running
multipass list
```

The `&` runs each launch in the background so they start simultaneously rather than sequentially.

## Creating VMs from a Script

For repeatable environments, wrap the launch in a script:

```bash
#!/bin/bash
# vm-create.sh - create a standard dev VM

VM_NAME="${1:-devvm}"
UBUNTU_RELEASE="${2:-24.04}"

echo "Creating VM: $VM_NAME with Ubuntu $UBUNTU_RELEASE"

multipass launch "$UBUNTU_RELEASE" \
  --name "$VM_NAME" \
  --cpus 2 \
  --memory 4G \
  --disk 20G \
  --cloud-init ~/vm-init.yaml

echo "VM ready. Connecting..."
multipass shell "$VM_NAME"
```

```bash
chmod +x vm-create.sh

# Create a VM named "api-test"
./vm-create.sh api-test 24.04
```

## Listing and Monitoring VMs

```bash
# List all VMs with status and IP
multipass list

# Detailed info for a single VM
multipass info devvm

# Abbreviated output:
# Name:           devvm
# State:          Running
# IPv4:           10.77.100.7
# Release:        Ubuntu 24.04.1 LTS
# CPU(s):         2
# Memory usage:   312.0M out of 3.8G
# Disk usage:     2.1G out of 19.2G
```

## Cleaning Up

VMs accumulate quickly. Clean up regularly:

```bash
# Stop and delete a specific VM
multipass delete devvm
multipass purge  # permanently removes deleted VMs

# Delete multiple at once
multipass delete testnode-1 testnode-2 testnode-3
multipass purge

# Nuclear option: delete everything
multipass list --format csv | tail -n +2 | cut -d',' -f1 | xargs multipass delete
multipass purge
```

## Transferring Results Back to Host

After running tests or builds inside the VM, retrieve the output:

```bash
# Copy a test result file back to your host
multipass transfer devvm:/home/ubuntu/test-results.xml ./

# Copy an entire directory
multipass transfer --recursive devvm:/home/ubuntu/build-output/ ./output/
```

## VM Speed Comparison

To give a sense of timing on typical hardware:

- First launch (24.04, no cached image): ~2-3 minutes (includes ~300MB download)
- Subsequent launch (cached image): ~20-40 seconds
- With cloud-init package installs: add 1-5 minutes depending on package count
- Shell access after launch: instant

These times make Multipass practical for CI-style local testing where you spin up, run tests, and tear down for each test run.

The combination of cached cloud images, copy-on-write disk provisioning, and automated cloud-init execution makes Multipass the fastest option for Ubuntu VM creation available on the platform.
