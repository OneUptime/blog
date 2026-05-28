# How to Create a Nested Virtualization-Enabled VM on Compute Engine for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Nested Virtualization, KVM, Testing

Description: A complete guide to enabling nested virtualization on Google Compute Engine VMs, allowing you to run VMs inside VMs for testing hypervisors, Kubernetes clusters, and other virtualization workloads.

---

Sometimes you need to run a virtual machine inside a virtual machine. Maybe you are testing a hypervisor, building a CI/CD pipeline that needs to spin up VMs, or running a local Kubernetes cluster with tools like Minikube that can use KVM. Compute Engine supports nested virtualization, but it requires a specific setup. Here is how to get it working.

## What Nested Virtualization Means on GCE

Nested virtualization allows a Compute Engine VM to act as a hypervisor and run its own guest VMs using KVM. Without it, the KVM kernel module will not load because the CPU virtualization extensions are not exposed to the guest OS.

There are a few requirements to keep in mind:
- The VM needs an Intel Haswell or later CPU platform. E2 VMs, memory-optimized VMs, AMD or Arm based VMs, and H4D VMs are not supported.
- The L1 hypervisor must be Linux KVM
- You can enable nested virtualization directly on the VM, or create a custom image with the special nested virtualization license

## Step 1: Create the VM with Nested Virtualization Enabled

The recommended setup is to enable nested virtualization directly when you create the VM. This tells Compute Engine to expose the VMX CPU flag to the guest OS.

```bash
# Create a Debian 12 VM with nested virtualization enabled
gcloud compute instances create nested-vm \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --enable-nested-virtualization \
  --min-cpu-platform="Intel Haswell"
```

The key part here is the `--enable-nested-virtualization` flag. This tells GCE to enable the VMX flag, which is what KVM needs to function.

## Step 2: Confirm the Machine Type and CPU Platform

Remember, you need to use a machine type that supports nested virtualization. If you use the legacy custom-image method, the instance creation command still needs a supported CPU platform:

```bash
# Create a VM from a custom nested-virtualization image
gcloud compute instances create nested-vm \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --image=nested-vm-image \
  --min-cpu-platform="Intel Haswell"
```

The `--min-cpu-platform` flag ensures you get a processor that supports the VMX instructions. Without it, you might land on hardware that does not support nested virtualization.

## Alternative: Create a Custom Image First

If you plan to create multiple nested virtualization VMs, you can also create a reusable custom image with the special nested virtualization license:

```bash
# Create a custom image with nested virtualization support
gcloud compute images create nested-vm-image \
  --source-image-family=debian-12 \
  --source-image-project=debian-cloud \
  --licenses="https://www.googleapis.com/compute/v1/projects/vm-options/global/licenses/enable-vmx"
```

Then use this image for all your VMs:

```bash
# Create a VM from the custom nested-virtualization image
gcloud compute instances create nested-vm \
  --zone=us-central1-a \
  --machine-type=n1-standard-4 \
  --image=nested-vm-image \
  --min-cpu-platform="Intel Haswell"
```

## Step 3: Verify Nested Virtualization Is Working

SSH into the VM and verify that the VMX flag is present:

```bash
# SSH into the nested virtualization VM
gcloud compute ssh nested-vm --zone=us-central1-a
```

Once connected, check for the VMX flag:

```bash
# Check if VMX (Virtual Machine Extensions) is available
grep -cw vmx /proc/cpuinfo
```

If this returns a number greater than 0, VMX is enabled. If it returns 0, something went wrong with the nested virtualization setting, license, or machine type.

You can also verify that KVM is available:

```bash
# Check if the KVM kernel module is loaded
lsmod | grep kvm
```

You should see `kvm_intel` and `kvm` in the output.

## Step 4: Install KVM and Supporting Tools

With VMX confirmed, install the KVM stack:

```bash
# Install KVM and QEMU on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virtinst
```

Start and enable the libvirt service, then make sure the default libvirt network is active:

```bash
# Enable and start the libvirt daemon and default NAT network
sudo systemctl enable libvirtd
sudo systemctl start libvirtd
sudo virsh net-start default || true
sudo virsh net-autostart default
```

Add your user to the necessary groups:

```bash
# Add current user to libvirt and kvm groups
sudo usermod -aG libvirt $(whoami)
sudo usermod -aG kvm $(whoami)
```

Log out and back in, or start a new shell with `newgrp libvirt`, so the new group membership applies.

## Step 5: Create a Nested VM

Now you can create a VM inside your VM. Here is an example using virt-install to create a lightweight Alpine Linux guest:

```bash
# Download a lightweight Alpine Linux ISO for testing
wget https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-virt-3.19.0-x86_64.iso \
  -O /tmp/alpine.iso
```

Create a disk for the nested VM:

```bash
# Create a 5GB disk image for the nested VM
qemu-img create -f qcow2 /var/lib/libvirt/images/nested-guest.qcow2 5G
```

Launch the nested VM:

```bash
# Create and start a nested VM using virt-install
sudo virt-install \
  --name=nested-guest \
  --vcpus=2 \
  --memory=2048 \
  --disk=/var/lib/libvirt/images/nested-guest.qcow2,format=qcow2 \
  --cdrom=/tmp/alpine.iso \
  --os-variant=alpinelinux3.19 \
  --network=default \
  --graphics=none \
  --console=pty,target_type=serial \
  --noautoconsole
```

Check the status of your nested VM:

```bash
# List all running nested VMs
sudo virsh list --all
```

## Use Case: Running Minikube with KVM

One of the most practical uses for nested virtualization is running Minikube with the KVM driver for Kubernetes testing:

```bash
# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/kubectl

# Validate that libvirt is ready for the KVM2 driver
virt-host-validate

# Start Minikube with the KVM2 driver
minikube start --driver=kvm2 --cpus=2 --memory=4096
```

This gives you a real Kubernetes cluster running on KVM inside your Compute Engine VM. It is much closer to a production setup than using Docker-based clusters.

## Performance Considerations

Nested virtualization has a performance overhead. The nested VMs share CPU, memory, and I/O with the host VM, and the additional virtualization layer adds latency. Here are some guidelines:

- Use at least an n1-standard-4 or larger for the host VM. Nested VMs need room to breathe.
- Allocate generous memory. The host OS, KVM, and all nested guests share the same memory pool.
- SSD persistent disks perform much better than standard disks for nested workloads because the I/O goes through two layers of virtualization.
- Network performance is reduced. The nested VMs go through a virtual network bridge inside an already-virtualized network.

## Automating the Setup

For repeated use, put the entire setup in a startup script:

```bash
#!/bin/bash
# Startup script for a nested virtualization host VM

# Install KVM and dependencies
apt-get update
apt-get install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virtinst

# Enable and start libvirt
systemctl enable libvirtd
systemctl start libvirtd

# Start the default NAT network
virsh net-start default || true
virsh net-autostart default

# Create a default storage pool if it does not exist
virsh pool-info default >/dev/null 2>&1 || virsh pool-define-as default dir --target /var/lib/libvirt/images
virsh pool-autostart default
virsh pool-start default || true

echo "Nested virtualization host ready"
```

Then combine it with the instance creation:

```bash
# Create a nested virtualization VM with automatic setup
gcloud compute instances create nested-host \
  --zone=us-central1-a \
  --machine-type=n1-standard-8 \
  --image=nested-vm-image \
  --enable-nested-virtualization \
  --min-cpu-platform="Intel Haswell" \
  --boot-disk-size=100GB \
  --boot-disk-type=pd-ssd \
  --metadata-from-file=startup-script=nested-setup.sh
```

## When to Use Nested Virtualization

Nested virtualization is perfect for testing and development scenarios where you need real VM behavior. CI/CD pipelines that test VM provisioning tools, hypervisor development, and running full Kubernetes clusters with KVM are all good use cases.

For production workloads, you are generally better off using Compute Engine VMs directly rather than nesting. The performance overhead is not worth it when you can use managed instance groups, GKE, or other GCP services that handle orchestration natively. But for testing, it is an incredibly useful capability.
