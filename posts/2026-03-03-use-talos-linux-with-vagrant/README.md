# How to Use Talos Linux with Vagrant

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Vagrant, Development, Kubernetes, Automation, VirtualBox

Description: Learn how to use Vagrant to quickly spin up Talos Linux Kubernetes clusters for local development and automated testing.

---

Vagrant is a tool for building and managing virtual machine environments. It wraps around hypervisors like VirtualBox, libvirt, and VMware to provide a consistent, reproducible workflow for creating VMs. If your development team uses Vagrant, you can integrate Talos Linux into that workflow for local Kubernetes clusters that are easy to create, destroy, and share. This guide shows you how.

## Why Vagrant for Talos

Vagrant solves the "works on my machine" problem for infrastructure. A Vagrantfile describes your entire cluster setup in code. Any developer can run `vagrant up` and get an identical Talos Linux cluster, regardless of their host OS. When they are done, `vagrant destroy` cleans everything up. No leftover VMs, no orphaned disks, no manual cleanup.

For teams that already use Vagrant for other development environments, adding Talos support means Kubernetes development fits into the existing workflow.

## Prerequisites

Install the following:

```bash
# Install Vagrant
# On macOS
brew install vagrant

# On Ubuntu/Debian
wget https://releases.hashicorp.com/vagrant/2.4.1/vagrant_2.4.1-1_amd64.deb
sudo dpkg -i vagrant_2.4.1-1_amd64.deb

# Install a provider (VirtualBox is the most common)
# Download from https://www.virtualbox.org/wiki/Downloads

# Or use libvirt on Linux
sudo apt install vagrant-libvirt
```

You also need `talosctl` and `kubectl` installed on your host.

## Creating a Talos Vagrant Box

Talos does not have an official Vagrant box, so you need to create one from the Talos image. This is a one-time process:

```bash
# Download the Talos image for your provider
# For VirtualBox, use the metal ISO or create a VDI
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-amd64.iso

# Create a VirtualBox VM manually and install Talos
# Then package it as a Vagrant box
VBoxManage createvm --name talos-base --ostype Linux_64 --register
VBoxManage modifyvm talos-base --memory 2048 --cpus 2 --firmware efi
VBoxManage createmedium disk --filename talos-base.vdi --size 20480 --format VDI
VBoxManage storagectl talos-base --name "SATA" --add sata
VBoxManage storageattach talos-base --storagectl "SATA" --port 0 --type hdd --medium talos-base.vdi
VBoxManage storagectl talos-base --name "IDE" --add ide
VBoxManage storageattach talos-base --storagectl "IDE" --port 0 --type dvddrive --medium metal-amd64.iso

# Boot and let Talos install to disk, then shut down and remove the ISO
# Then package the box
vagrant package --base talos-base --output talos-v1.7.0.box

# Add the box to Vagrant
vagrant box add talos-linux talos-v1.7.0.box
```

Alternatively, if using libvirt, convert the raw metal image:

```bash
# For libvirt provider, create a box from the raw image
qemu-img convert -f raw -O qcow2 metal-amd64.raw talos-v1.7.0.qcow2

# Create the box metadata
cat > metadata.json <<'META'
{
  "provider": "libvirt",
  "format": "qcow2",
  "virtual_size": 20
}
META

cat > Vagrantfile <<'VF'
Vagrant.configure("2") do |config|
  config.vm.provider :libvirt do |libvirt|
    libvirt.driver = "kvm"
  end
end
VF

# Package the box
tar czf talos-v1.7.0.box metadata.json Vagrantfile talos-v1.7.0.qcow2
vagrant box add talos-linux talos-v1.7.0.box
```

## Writing the Vagrantfile

Create a Vagrantfile that defines your Talos cluster:

```ruby
# Vagrantfile
# Talos Linux Kubernetes cluster

# Cluster configuration
NUM_CONTROL_PLANES = 3
NUM_WORKERS = 3
CP_MEMORY = 4096
CP_CPUS = 2
WORKER_MEMORY = 8192
WORKER_CPUS = 4
NETWORK_PREFIX = "10.10.10"

Vagrant.configure("2") do |config|
  config.vm.box = "talos-linux"

  # Disable default shared folder (Talos does not support it)
  config.vm.synced_folder ".", "/vagrant", disabled: true

  # Disable SSH (Talos does not have SSH)
  config.ssh.enabled = false
  config.vm.boot_timeout = 120

  # Control plane nodes
  (1..NUM_CONTROL_PLANES).each do |i|
    config.vm.define "cp#{i}" do |cp|
      cp.vm.hostname = "talos-cp-#{i}"
      cp.vm.network "private_network", ip: "#{NETWORK_PREFIX}.#{10 + i}"

      cp.vm.provider "virtualbox" do |vb|
        vb.name = "talos-cp-#{i}"
        vb.memory = CP_MEMORY
        vb.cpus = CP_CPUS
        vb.customize ["modifyvm", :id, "--firmware", "efi"]
        vb.customize ["modifyvm", :id, "--uart1", "0x3F8", "4"]
        vb.customize ["modifyvm", :id, "--uartmode1", "file",
          File.join(Dir.pwd, "logs", "cp-#{i}-serial.log")]
      end

      cp.vm.provider "libvirt" do |lv|
        lv.memory = CP_MEMORY
        lv.cpus = CP_CPUS
        lv.loader = "/usr/share/OVMF/OVMF_CODE.fd"
      end
    end
  end

  # Worker nodes
  (1..NUM_WORKERS).each do |i|
    config.vm.define "worker#{i}" do |worker|
      worker.vm.hostname = "talos-worker-#{i}"
      worker.vm.network "private_network", ip: "#{NETWORK_PREFIX}.#{20 + i}"

      worker.vm.provider "virtualbox" do |vb|
        vb.name = "talos-worker-#{i}"
        vb.memory = WORKER_MEMORY
        vb.cpus = WORKER_CPUS
        vb.customize ["modifyvm", :id, "--firmware", "efi"]
      end

      worker.vm.provider "libvirt" do |lv|
        lv.memory = WORKER_MEMORY
        lv.cpus = WORKER_CPUS
        lv.loader = "/usr/share/OVMF/OVMF_CODE.fd"
      end
    end
  end
end
```

Key things to notice:

- SSH is disabled because Talos does not have SSH
- Synced folders are disabled for the same reason
- Each node gets a static private network IP
- EFI firmware is configured for UEFI boot
- Serial console logging captures Talos output for debugging

## Starting the Cluster

```bash
# Create the logs directory
mkdir -p logs

# Start all VMs
vagrant up

# Or start specific nodes
vagrant up cp1 cp2 cp3
vagrant up worker1 worker2 worker3
```

## Generating and Applying Talos Config

Once the VMs are running, configure the cluster:

```bash
# Generate Talos configuration
talosctl gen config vagrant-cluster https://10.10.10.100:6443 \
  --config-patch='[
    {"op": "add", "path": "/machine/network/interfaces", "value": [
      {
        "interface": "eth1",
        "dhcp": false,
        "vip": {
          "ip": "10.10.10.100"
        }
      }
    ]}
  ]'

# Apply configuration to control plane nodes
talosctl apply-config --insecure --nodes 10.10.10.11 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.10.10.12 --file controlplane.yaml
talosctl apply-config --insecure --nodes 10.10.10.13 --file controlplane.yaml

# Apply configuration to worker nodes
talosctl apply-config --insecure --nodes 10.10.10.21 --file worker.yaml
talosctl apply-config --insecure --nodes 10.10.10.22 --file worker.yaml
talosctl apply-config --insecure --nodes 10.10.10.23 --file worker.yaml

# Bootstrap the first control plane node
talosctl config endpoint 10.10.10.100
talosctl config node 10.10.10.11
talosctl bootstrap

# Get kubeconfig
talosctl kubeconfig
```

## Automating the Setup with a Provisioning Script

Create a script that handles the entire cluster setup after `vagrant up`:

```bash
#!/bin/bash
# setup-cluster.sh

set -e

NETWORK_PREFIX="10.10.10"
CP_IPS=("${NETWORK_PREFIX}.11" "${NETWORK_PREFIX}.12" "${NETWORK_PREFIX}.13")
WORKER_IPS=("${NETWORK_PREFIX}.21" "${NETWORK_PREFIX}.22" "${NETWORK_PREFIX}.23")
VIP="${NETWORK_PREFIX}.100"

echo "Generating Talos configuration..."
talosctl gen config vagrant-cluster "https://${VIP}:6443" \
  --force \
  --config-patch='[
    {"op": "add", "path": "/machine/network/interfaces", "value": [
      {"interface": "eth1", "dhcp": false, "vip": {"ip": "'$VIP'"}}
    ]}
  ]'

echo "Waiting for nodes to be reachable..."
for ip in "${CP_IPS[@]}" "${WORKER_IPS[@]}"; do
  until talosctl --nodes "$ip" disks --insecure > /dev/null 2>&1; do
    sleep 5
  done
  echo "  $ip is reachable"
done

echo "Applying control plane configuration..."
for ip in "${CP_IPS[@]}"; do
  talosctl apply-config --insecure --nodes "$ip" --file controlplane.yaml
done

echo "Applying worker configuration..."
for ip in "${WORKER_IPS[@]}"; do
  talosctl apply-config --insecure --nodes "$ip" --file worker.yaml
done

echo "Bootstrapping the cluster..."
talosctl config endpoint "$VIP"
talosctl config node "${CP_IPS[0]}"
sleep 30
talosctl bootstrap

echo "Waiting for cluster to be ready..."
talosctl kubeconfig --force
kubectl wait --for=condition=Ready nodes --all --timeout=300s

echo "Cluster is ready!"
kubectl get nodes
```

## Day-to-Day Workflow

Common Vagrant commands for managing your cluster:

```bash
# Check status of all VMs
vagrant status

# Pause the cluster (saves state to disk)
vagrant suspend

# Resume a paused cluster
vagrant resume

# Restart a specific node (simulates a reboot)
vagrant reload cp1

# Destroy everything and start fresh
vagrant destroy -f

# Recreate from scratch
vagrant up && bash setup-cluster.sh
```

## Sharing Your Cluster Configuration

The beauty of Vagrant is portability. Check your Vagrantfile and setup script into version control:

```
project/
  Vagrantfile
  setup-cluster.sh
  .gitignore
```

Add to `.gitignore`:

```
# .gitignore
controlplane.yaml
worker.yaml
talosconfig
kubeconfig
logs/
.vagrant/
```

Any team member can clone the repository and run `vagrant up` followed by the setup script to get an identical cluster.

## Resource Management

If your host machine is constrained, reduce the cluster size:

```ruby
# Minimal cluster for development
NUM_CONTROL_PLANES = 1
NUM_WORKERS = 1
CP_MEMORY = 2048
CP_CPUS = 2
WORKER_MEMORY = 4096
WORKER_CPUS = 2
```

A single control plane node with one worker requires about 6 GB of RAM total, which is manageable on most development laptops.

## Conclusion

Vagrant brings reproducibility and convenience to Talos Linux development environments. The Vagrantfile captures your entire cluster topology in a single file, and the `vagrant up` / `vagrant destroy` workflow makes iterating on configurations painless. For teams that already use Vagrant, adding Talos Linux support is straightforward. For new users, it is one of the easiest ways to get started with Talos locally.
