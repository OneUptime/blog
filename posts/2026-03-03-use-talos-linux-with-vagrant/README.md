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

# Install a provider
# Download from https://www.virtualbox.org/wiki/Downloads

# Or use libvirt on Linux, which is the provider used in this guide
sudo apt install vagrant-libvirt
```

You also need `talosctl` and `kubectl` installed on your host.

## Preparing Talos Boot Media

Talos does not need a traditional SSH-enabled Vagrant base box. With the libvirt provider, you can boot the Talos ISO as a virtual CD-ROM and attach a disk that Talos will install to after you apply the machine configuration:

```bash
# Download the Talos ISO used by the Vagrantfile
curl -L https://github.com/siderolabs/talos/releases/download/v1.13.0/metal-amd64.iso \
  -o /tmp/metal-amd64.iso
```

If you prefer to build a reusable libvirt box from a disk image, vagrant-libvirt expects a qcow2 image named `box.img` in the box archive:

```bash
# For libvirt provider, create a box from a raw disk image
curl -L https://github.com/siderolabs/talos/releases/download/v1.13.0/metal-amd64.raw.xz \
  -o metal-amd64.raw.xz
xz -d metal-amd64.raw.xz
qemu-img convert -f raw -O qcow2 metal-amd64.raw box.img

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
tar czf talos-v1.13.0.box metadata.json Vagrantfile box.img
vagrant box add talos-linux talos-v1.13.0.box
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
TALOS_ISO = "/tmp/metal-amd64.iso"

Vagrant.configure("2") do |config|
  # Disable default shared folder (Talos does not support it)
  config.vm.synced_folder ".", "/vagrant", disabled: true

  # Disable SSH (Talos does not have SSH)
  config.ssh.enabled = false
  config.vm.boot_timeout = 120

  # Control plane nodes
  (1..NUM_CONTROL_PLANES).each do |i|
    config.vm.define "cp#{i}" do |cp|
      cp.vm.hostname = "talos-cp-#{i}"

      cp.vm.provider "libvirt" do |lv|
        lv.memory = CP_MEMORY
        lv.cpus = CP_CPUS
        lv.serial :type => "file", :source => { :path => File.join(Dir.pwd, "logs", "cp-#{i}-serial.log") }
        lv.storage :file, :device => :cdrom, :path => TALOS_ISO
        lv.storage :file, :size => "20G", :type => "raw"
        lv.boot "hd"
        lv.boot "cdrom"
      end
    end
  end

  # Worker nodes
  (1..NUM_WORKERS).each do |i|
    config.vm.define "worker#{i}" do |worker|
      worker.vm.hostname = "talos-worker-#{i}"

      worker.vm.provider "libvirt" do |lv|
        lv.memory = WORKER_MEMORY
        lv.cpus = WORKER_CPUS
        lv.serial :type => "file", :source => { :path => File.join(Dir.pwd, "logs", "worker-#{i}-serial.log") }
        lv.storage :file, :device => :cdrom, :path => TALOS_ISO
        lv.storage :file, :size => "20G", :type => "raw"
        lv.boot "hd"
        lv.boot "cdrom"
      end
    end
  end
end
```

Key things to notice:

- SSH is disabled because Talos does not have SSH
- Synced folders are disabled for the same reason
- Each node gets an IP address from the libvirt network DHCP server
- Each node boots from disk first and falls back to the Talos ISO
- Serial console logging captures Talos output for debugging

## Starting the Cluster

```bash
# Create the logs directory
mkdir -p logs

# Start all VMs
vagrant up --provider=libvirt

# Or start specific nodes
vagrant up cp1 cp2 cp3
vagrant up worker1 worker2 worker3
```

Find the IP addresses assigned by libvirt DHCP:

```bash
virsh list | grep vagrant | awk '{print $2}' | xargs -t -L1 virsh domifaddr
```

## Generating and Applying Talos Config

Once the VMs are running, configure the cluster:

```bash
# Generate Talos configuration
talosctl gen config vagrant-cluster https://192.168.121.100:6443 \
  --install-disk /dev/vda \
  --config-patch='[
    {"op": "add", "path": "/machine/network/interfaces", "value": [
      {
        "interface": "eth0",
        "dhcp": true,
        "vip": {
          "ip": "192.168.121.100"
        }
      }
    ]}
  ]'

# Apply configuration to the first control plane node
talosctl apply-config --insecure --nodes 192.168.121.203 --file controlplane.yaml

# Configure Talos endpoints and bootstrap the first control plane node
talosctl config endpoint 192.168.121.203 192.168.121.119 192.168.121.125
talosctl bootstrap --nodes 192.168.121.203

# Apply configuration to the remaining nodes
talosctl apply-config --insecure --nodes 192.168.121.119 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.121.125 --file controlplane.yaml
talosctl apply-config --insecure --nodes 192.168.121.69 --file worker.yaml

# Get kubeconfig
talosctl kubeconfig --nodes 192.168.121.203 ./kubeconfig
```

## Automating the Setup with a Provisioning Script

Create a script that handles the entire cluster setup after `vagrant up`:

```bash
#!/bin/bash
# setup-cluster.sh

set -e

CP_IPS=("192.168.121.203" "192.168.121.119" "192.168.121.125")
WORKER_IPS=("192.168.121.69")
VIP="192.168.121.100"

echo "Generating Talos configuration..."
talosctl gen config vagrant-cluster "https://${VIP}:6443" \
  --force \
  --install-disk /dev/vda \
  --config-patch='[
    {"op": "add", "path": "/machine/network/interfaces", "value": [
      {"interface": "eth0", "dhcp": true, "vip": {"ip": "'$VIP'"}}
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
talosctl apply-config --insecure --nodes "${CP_IPS[0]}" --file controlplane.yaml

echo "Bootstrapping the cluster..."
talosctl config endpoint "${CP_IPS[@]}"
sleep 30
talosctl bootstrap --nodes "${CP_IPS[0]}"

echo "Applying remaining node configurations..."
for ip in "${CP_IPS[@]:1}"; do
  talosctl apply-config --insecure --nodes "$ip" --file controlplane.yaml
done

for ip in "${WORKER_IPS[@]}"; do
  talosctl apply-config --insecure --nodes "$ip" --file worker.yaml
done

echo "Waiting for cluster to be ready..."
talosctl kubeconfig --nodes "${CP_IPS[0]}" --force ./kubeconfig
kubectl --kubeconfig ./kubeconfig wait --for=condition=Ready nodes --all --timeout=300s

echo "Cluster is ready!"
kubectl --kubeconfig ./kubeconfig get nodes
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
vagrant up --provider=libvirt && bash setup-cluster.sh
```

## Sharing Your Cluster Configuration

The beauty of Vagrant is portability. Check your Vagrantfile and setup script into version control:

```text
project/
  Vagrantfile
  setup-cluster.sh
  .gitignore
```

Add to `.gitignore`:

```text
# .gitignore
controlplane.yaml
worker.yaml
talosconfig
kubeconfig
logs/
.vagrant/
```

Any team member can clone the repository and run `vagrant up` followed by the setup script to get an identical cluster.

Resource Management

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
