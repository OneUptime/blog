# How to Install Talos Linux on QEMU/KVM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, QEMU, KVM, Virtualization, Kubernetes

Description: A hands-on guide to deploying Talos Linux on QEMU/KVM for local development, testing, and learning Kubernetes.

---

QEMU/KVM is the standard open-source virtualization stack on Linux. It provides near-native performance and is available on virtually every Linux distribution. Running Talos Linux on QEMU/KVM is ideal for local development, testing, and learning the Talos workflow before deploying to production infrastructure. This guide covers both the quick-start approach using talosctl and the manual approach using QEMU directly.

## Prerequisites

Install the necessary packages:

```bash
# Install QEMU/KVM on Ubuntu/Debian
sudo apt update
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients \
  bridge-utils virt-manager

# Install QEMU/KVM on Fedora/RHEL
sudo dnf install -y qemu-kvm libvirt virt-install virt-manager

# Verify KVM is available
kvm-ok
# Or check directly
ls -la /dev/kvm

# Add your user to the libvirt group
sudo usermod -aG libvirt $(whoami)
sudo usermod -aG kvm $(whoami)

# Install talosctl
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Quick Start with talosctl cluster create

The fastest way to get a Talos cluster running on QEMU/KVM is using the built-in cluster management feature of talosctl:

```bash
# Create a local Talos cluster with 3 control plane and 3 worker nodes
talosctl cluster create \
  --controlplanes 3 \
  --workers 3 \
  --cpus 2 \
  --memory 4096 \
  --disk 10240

# This command:
# 1. Downloads the Talos QEMU image
# 2. Creates QEMU VMs for each node
# 3. Generates and applies machine configurations
# 4. Bootstraps the Kubernetes cluster
# 5. Configures talosctl and kubectl

# Check the cluster status
talosctl health

# Get the kubeconfig
talosctl kubeconfig
kubectl get nodes
```

That is it for the quick path. The rest of this guide covers the manual approach, which gives you more control over the VM configuration.

## Downloading the Talos Image

For manual QEMU/KVM deployments, download the appropriate disk image:

```bash
# Download the Talos nocloud image (qcow2 format for QEMU)
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/nocloud-amd64.raw.xz
xz -d nocloud-amd64.raw.xz

# Convert to qcow2 format for better performance and snapshots
qemu-img convert -f raw -O qcow2 nocloud-amd64.raw talos-base.qcow2

# Create a backing image for each VM (copy-on-write saves disk space)
for node in cp-1 cp-2 cp-3 worker-1 worker-2 worker-3; do
  qemu-img create -f qcow2 -b talos-base.qcow2 -F qcow2 talos-${node}.qcow2 50G
done
```

## Setting Up the Network

Create a bridge network for the Talos VMs:

```bash
# Create a bridge network using virsh
cat > talos-network.xml <<'EOF'
<network>
  <name>talos</name>
  <forward mode='nat'/>
  <bridge name='virbr-talos' stp='on' delay='0'/>
  <ip address='192.168.50.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.50.10' end='192.168.50.254'/>
      <host mac='52:54:00:00:01:01' name='talos-cp-1' ip='192.168.50.11'/>
      <host mac='52:54:00:00:01:02' name='talos-cp-2' ip='192.168.50.12'/>
      <host mac='52:54:00:00:01:03' name='talos-cp-3' ip='192.168.50.13'/>
      <host mac='52:54:00:00:02:01' name='talos-worker-1' ip='192.168.50.21'/>
      <host mac='52:54:00:00:02:02' name='talos-worker-2' ip='192.168.50.22'/>
      <host mac='52:54:00:00:02:03' name='talos-worker-3' ip='192.168.50.23'/>
    </dhcp>
  </ip>
</network>
EOF

# Define and start the network
virsh net-define talos-network.xml
virsh net-start talos
virsh net-autostart talos
```

## Generating Talos Configuration

```bash
# Generate Talos configuration
talosctl gen config talos-qemu-cluster "https://192.168.50.11:6443" \
  --output-dir _out

# For a multi-node control plane, use a VIP
talosctl gen config talos-qemu-cluster "https://192.168.50.100:6443" \
  --output-dir _out

# Patch for QEMU-specific settings
cat > qemu-cp-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/vda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.50.100
EOF

cat > qemu-worker-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/vda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
EOF

talosctl machineconfig patch _out/controlplane.yaml \
  --patch @qemu-cp-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @qemu-worker-patch.yaml \
  --output _out/worker-patched.yaml
```

## Creating VMs with virt-install

Use virt-install to create the virtual machines:

```bash
# Create control plane VMs
for i in 1 2 3; do
  virt-install \
    --name talos-cp-${i} \
    --ram 8192 \
    --vcpus 4 \
    --cpu host \
    --disk path=talos-cp-${i}.qcow2,format=qcow2,bus=virtio \
    --network network=talos,model=virtio,mac=52:54:00:00:01:0${i} \
    --os-variant generic \
    --boot hd \
    --noautoconsole \
    --import

  echo "Created talos-cp-${i}"
done

# Create worker VMs
for i in 1 2 3; do
  virt-install \
    --name talos-worker-${i} \
    --ram 16384 \
    --vcpus 4 \
    --cpu host \
    --disk path=talos-worker-${i}.qcow2,format=qcow2,bus=virtio \
    --network network=talos,model=virtio,mac=52:54:00:00:02:0${i} \
    --os-variant generic \
    --boot hd \
    --noautoconsole \
    --import

  echo "Created talos-worker-${i}"
done
```

## Alternative: Using QEMU Directly

If you prefer using QEMU directly without libvirt:

```bash
# Start a control plane node with QEMU directly
qemu-system-x86_64 \
  -m 8192 \
  -smp 4 \
  -cpu host \
  -enable-kvm \
  -drive file=talos-cp-1.qcow2,format=qcow2,if=virtio \
  -netdev bridge,id=net0,br=virbr-talos \
  -device virtio-net-pci,netdev=net0,mac=52:54:00:00:01:01 \
  -nographic \
  -serial mon:stdio &
```

## Applying Configuration

Once the VMs are booted and in maintenance mode:

```bash
# Apply configuration to control plane nodes
for i in 1 2 3; do
  talosctl apply-config --insecure --nodes 192.168.50.1${i} \
    --file _out/controlplane-patched.yaml
  echo "Configured cp-${i}"
done

# Apply configuration to worker nodes
for i in 1 2 3; do
  talosctl apply-config --insecure --nodes 192.168.50.2${i} \
    --file _out/worker-patched.yaml
  echo "Configured worker-${i}"
done
```

## Bootstrapping the Cluster

```bash
# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint 192.168.50.100
talosctl config node 192.168.50.11

# Wait for installation to complete
sleep 120

# Bootstrap
talosctl bootstrap --nodes 192.168.50.11

# Wait for health
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
kubectl get pods -A
```

## Managing VM Lifecycle

Common management tasks for your QEMU/KVM Talos cluster:

```bash
# List all VMs
virsh list --all

# Stop a VM gracefully
virsh shutdown talos-cp-1

# Start a VM
virsh start talos-cp-1

# Create a snapshot (useful before upgrades)
virsh snapshot-create-as talos-cp-1 --name "pre-upgrade"

# Restore from snapshot
virsh snapshot-revert talos-cp-1 --snapshotname "pre-upgrade"

# View VM console
virsh console talos-cp-1
```

## Performance Tuning

For better performance in your QEMU/KVM Talos cluster:

```bash
# Enable huge pages for better memory performance
echo 'vm.nr_hugepages = 4096' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Use virtio drivers (already specified in the virt-install commands)
# Use host CPU mode for best CPU performance
# Use qcow2 with preallocation for better disk performance
qemu-img create -f qcow2 -o preallocation=metadata talos-perf.qcow2 50G
```

## Cleaning Up

```bash
# Destroy and undefine all VMs
for node in cp-1 cp-2 cp-3 worker-1 worker-2 worker-3; do
  virsh destroy talos-${node} 2>/dev/null
  virsh undefine talos-${node}
  rm -f talos-${node}.qcow2
done

# Remove the network
virsh net-destroy talos
virsh net-undefine talos

# Or if using talosctl cluster create
talosctl cluster destroy
```

## Conclusion

QEMU/KVM is the most accessible platform for running Talos Linux locally. The `talosctl cluster create` command gets you up and running in minutes, while the manual approach gives you full control over the VM configuration. This makes QEMU/KVM ideal for development, testing Talos upgrades before applying them to production, and learning the Talos workflow. The skills transfer directly to production deployments on any platform.
