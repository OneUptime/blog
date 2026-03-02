# How to Set Up Vagrant with KVM Provider on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Vagrant, KVM, Virtualization, Development Environment

Description: Configure Vagrant to use KVM as the virtualization provider on Ubuntu instead of VirtualBox, offering better performance and native Linux hypervisor integration.

---

The default Vagrant provider on Linux is VirtualBox, but KVM (Kernel-based Virtual Machine) is the native Linux hypervisor and generally offers better performance, particularly for disk I/O and network throughput. If you're running Ubuntu as your workstation or CI system, using KVM with Vagrant through the `vagrant-libvirt` plugin gives you more control and performance at the cost of slightly more setup.

## Prerequisites

Your CPU must support hardware virtualization. Check this first:

```bash
# Check for hardware virtualization support
egrep -c '(vmx|svm)' /proc/cpuinfo
# Any number > 0 means you have it

# More detailed check
sudo kvm-ok
# Should output: INFO: /dev/kvm exists
# KVM acceleration can be used
```

If `kvm-ok` is not installed:

```bash
sudo apt-get install -y cpu-checker
```

## Installing KVM and libvirt

```bash
# Install KVM and related tools
sudo apt-get install -y \
    qemu-kvm \
    libvirt-daemon-system \
    libvirt-clients \
    bridge-utils \
    virt-manager \
    virtinst \
    libguestfs-tools

# Add your user to the libvirt and kvm groups
# This allows managing VMs without sudo
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# Apply group membership changes (or log out and back in)
newgrp libvirt

# Verify libvirt is running
sudo systemctl enable --now libvirtd
sudo systemctl status libvirtd

# Test that you can connect to libvirt as a regular user
virsh list --all
```

## Installing Vagrant

If Vagrant is not already installed:

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | \
    sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

sudo apt-get update && sudo apt-get install -y vagrant
```

## Installing the vagrant-libvirt Plugin

The `vagrant-libvirt` plugin connects Vagrant to libvirt (the KVM management layer):

```bash
# Install dependencies needed for the plugin to compile
sudo apt-get install -y \
    libvirt-dev \
    ruby-libvirt \
    libxml2-dev \
    libxslt-dev \
    zlib1g-dev

# Install the plugin
vagrant plugin install vagrant-libvirt

# Verify the plugin is installed
vagrant plugin list
# Should show: vagrant-libvirt (X.X.X)
```

If the plugin installation fails with compilation errors, ensure the dev packages are installed:

```bash
# Additional dependencies that may be needed
sudo apt-get install -y \
    pkg-config \
    libssl-dev \
    gcc \
    make

vagrant plugin install vagrant-libvirt
```

## Finding Compatible Vagrant Boxes

Not all Vagrant boxes support libvirt. Look for boxes specifically built for it on the Vagrant Cloud:

```bash
# Commonly available Ubuntu boxes with libvirt support:
# generic/ubuntu2204
# generic/ubuntu2004
# almalinux/8

# Add a libvirt-compatible box
vagrant box add generic/ubuntu2204

# Check what providers are available for a box
vagrant box list
```

The `generic/*` boxes from Roboxes are good choices because they explicitly support multiple providers including libvirt.

## Creating a Vagrantfile for KVM

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  # Use a box that supports libvirt
  config.vm.box = "generic/ubuntu2204"

  config.vm.hostname = "kvm-dev"

  # Network configuration
  config.vm.network "private_network", ip: "192.168.121.10"

  # Forward ports
  config.vm.network "forwarded_port", guest: 80, host: 8080

  # libvirt provider configuration
  config.vm.provider :libvirt do |libvirt|
    # Connection URI - use qemu:///session for non-root, qemu:///system for root
    libvirt.uri = "qemu:///system"

    # VM name in libvirt
    libvirt.default_prefix = "vagrant"

    # CPU and memory
    libvirt.cpus = 2
    libvirt.memory = 2048

    # CPU mode - 'host-passthrough' gives best performance
    # but reduces live migration compatibility
    libvirt.cpu_mode = "host-passthrough"

    # Disk settings
    libvirt.storage_pool_name = "default"

    # Enable nested virtualization (if you need to run VMs inside this VM)
    # libvirt.nested = true

    # Graphics - disable for headless servers
    libvirt.graphics_type = "none"

    # Use virtio for better disk performance
    libvirt.disk_bus = "virtio"
    libvirt.disk_driver :cache => "writeback"

    # Networking
    libvirt.driver = "kvm"

    # Storage volume type
    libvirt.volume_cache = "writeback"
  end

  # Synced folders with libvirt require virtiofs or NFS
  # VirtualBox shared folders don't work with libvirt
  config.vm.synced_folder ".", "/vagrant", type: "nfs",
    nfs_udp: false,
    nfs_version: 4,
    mount_options: ["rw", "vers=4", "tcp", "nolock"]

  config.vm.provision "shell", inline: <<-SHELL
    apt-get update
    apt-get install -y curl git vim
    echo "KVM-backed VM provisioned successfully"
  SHELL
end
```

## Configuring NFS for Synced Folders

The default VirtualBox synced folder protocol doesn't work with KVM. NFS is the most reliable alternative:

```bash
# Install NFS server on the host
sudo apt-get install -y nfs-kernel-server

# Vagrant will automatically add NFS export entries when you run 'vagrant up'
# It requires sudo access for /etc/exports management
# To allow passwordless sudo for this specific command, add to sudoers:
echo "$USER ALL=(root) NOPASSWD: /usr/sbin/exportfs" | sudo tee /etc/sudoers.d/vagrant-nfs
echo "$USER ALL=(root) NOPASSWD: /usr/sbin/rpcbind" | sudo tee -a /etc/sudoers.d/vagrant-nfs
```

Alternatively, use `rsync` for one-way sync which requires no NFS setup:

```ruby
config.vm.synced_folder ".", "/vagrant", type: "rsync",
  rsync__exclude: [".git/", "node_modules/", ".vagrant/"]
```

## Starting the VM

```bash
# Start with libvirt provider explicitly
vagrant up --provider=libvirt

# Or set the default provider environment variable
export VAGRANT_DEFAULT_PROVIDER=libvirt
vagrant up

# SSH in normally
vagrant ssh

# Check VM status via virsh
virsh list --all
# Your vagrant VM will appear here
```

## Managing Storage Pools

By default, libvirt stores VM disks in `/var/lib/libvirt/images`. Configure a different location if needed:

```bash
# Create a new storage pool
virsh pool-define-as local-storage dir --target /mnt/vm-storage
virsh pool-autostart local-storage
virsh pool-start local-storage

# In Vagrantfile, use this pool
config.vm.provider :libvirt do |libvirt|
  libvirt.storage_pool_name = "local-storage"
end
```

## Networking with libvirt

libvirt creates a NAT network by default (`virbr0`). For more control, create a bridge network:

```bash
# Create a bridge connected to your physical NIC
sudo nmcli connection add type bridge ifname br0 con-name bridge-br0
sudo nmcli connection add type ethernet ifname enp3s0 master br0

# In Vagrantfile, use the bridge
config.vm.provider :libvirt do |libvirt|
  libvirt.management_network_name = "br0"
  libvirt.management_network_address = "192.168.1.0/24"
end
```

Or define a dedicated libvirt network:

```bash
# Create a libvirt network definition
cat > /tmp/vagrant-net.xml << 'EOF'
<network>
  <name>vagrant-net</name>
  <forward mode='nat'/>
  <bridge name='virbr1' stp='on' delay='0'/>
  <ip address='192.168.122.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.122.100' end='192.168.122.200'/>
    </dhcp>
  </ip>
</network>
EOF

virsh net-define /tmp/vagrant-net.xml
virsh net-autostart vagrant-net
virsh net-start vagrant-net
```

## Performance Comparison

KVM with `host-passthrough` CPU mode and `virtio` drivers typically outperforms VirtualBox for:

- **Disk I/O**: 20-40% faster sequential reads/writes
- **Network throughput**: Comparable, but lower latency with virtio
- **CPU performance**: Near-native for CPU-intensive workloads

Benchmark your VM disk with:

```bash
# Inside the VM
sudo apt-get install -y fio

# Test disk write speed
fio --name=write-test --ioengine=libaio --iodepth=1 --rw=write \
    --bs=4k --direct=1 --size=1G --numjobs=1 --runtime=60 \
    --group_reporting --filename=/tmp/fio-test
```

## Common Issues

### VM Fails to Start with Permission Error

```bash
# Check that your user is in the libvirt group
groups $USER

# If not, add and re-login
sudo usermod -aG libvirt $USER
# Log out and back in
```

### NFS Mount Fails

```bash
# Check NFS server is running on host
sudo systemctl status nfs-kernel-server

# Check firewall allows NFS
sudo ufw allow from 192.168.121.0/24 to any port nfs
sudo ufw allow from 192.168.121.0/24 to any port 111
```

## Summary

Using KVM with Vagrant through `vagrant-libvirt` gives you a more performant virtualization stack on Ubuntu hosts. The setup is more involved than VirtualBox, but the performance benefits are real, especially for disk-intensive workloads. Once configured, the day-to-day Vagrant workflow (`vagrant up`, `vagrant ssh`, `vagrant halt`) works identically to the VirtualBox provider.
