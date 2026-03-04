# How to Deploy Vagrant with Libvirt Provider on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Vagrant, libvirt, KVM, Virtualization, Linux

Description: Learn how to install and configure Vagrant with the Libvirt provider on RHEL, including KVM setup, box management, networking, shared folders, and multi-machine environments.

---

Vagrant automates the creation and management of development virtual machines. On RHEL, the Libvirt provider lets Vagrant create KVM virtual machines natively, giving you near-bare-metal performance without needing VirtualBox. This guide covers setting up Vagrant with Libvirt on RHEL.

## Prerequisites

- RHEL with hardware virtualization support (Intel VT-x or AMD-V)
- Root or sudo access
- At least 4 GB of RAM and 20 GB of free disk space

Check virtualization support:

```bash
# Verify hardware virtualization is available
grep -E '(vmx|svm)' /proc/cpuinfo | head -1
```

## Installing KVM and Libvirt

```bash
# Install virtualization packages
sudo dnf install -y @virtualization
```

```bash
# Start and enable libvirtd
sudo systemctl enable --now libvirtd
```

```bash
# Add your user to the libvirt group
sudo usermod -aG libvirt $USER
newgrp libvirt
```

Verify the setup:

```bash
# Check that KVM is working
virsh list --all
```

## Installing Vagrant

```bash
# Add the HashiCorp repository
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
```

```bash
# Install Vagrant
sudo dnf install -y vagrant
```

## Installing the Vagrant Libvirt Plugin

The Libvirt plugin requires some development libraries:

```bash
# Install build dependencies
sudo dnf install -y gcc libvirt-devel libxml2-devel make ruby-devel
```

```bash
# Install the vagrant-libvirt plugin
vagrant plugin install vagrant-libvirt
```

Verify the plugin is installed:

```bash
# List installed plugins
vagrant plugin list
```

## Creating Your First Vagrant VM

```bash
# Create a project directory
mkdir -p /opt/vagrant-project
cd /opt/vagrant-project
```

```bash
# Initialize with a CentOS Stream 9 box
vagrant init generic/centos9s --box-version ">0"
```

Edit the Vagrantfile:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.box = "generic/centos9s"
  config.vm.provider :libvirt do |libvirt|
    libvirt.cpus = 2
    libvirt.memory = 2048
    libvirt.driver = "kvm"
  end
end
```

Start the VM:

```bash
# Start the VM
vagrant up --provider=libvirt
```

```bash
# SSH into the VM
vagrant ssh
```

## Setting Libvirt as the Default Provider

Avoid typing `--provider=libvirt` every time:

```bash
# Set the default provider
export VAGRANT_DEFAULT_PROVIDER=libvirt
echo 'export VAGRANT_DEFAULT_PROVIDER=libvirt' >> ~/.bashrc
```

## Configuring Networking

### Private Network

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/centos9s"
  config.vm.network "private_network", ip: "192.168.121.10"
end
```

### Port Forwarding

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/centos9s"
  config.vm.network "forwarded_port", guest: 80, host: 8080
  config.vm.network "forwarded_port", guest: 443, host: 8443
end
```

### Public Network (Bridged)

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/centos9s"
  config.vm.network "public_network", bridge: "eth0"
end
```

## Shared Folders

The Libvirt provider supports several synced folder methods:

### NFS Synced Folders

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "generic/centos9s"
  config.vm.synced_folder "./app", "/opt/app", type: "nfs",
    nfs_version: 4,
    nfs_udp: false
end
```

Install NFS on the host:

```bash
# Install NFS utilities
sudo dnf install -y nfs-utils
sudo systemctl enable --now nfs-server
```

### Rsync Synced Folders

```ruby
config.vm.synced_folder "./app", "/opt/app", type: "rsync",
  rsync__exclude: [".git/", "node_modules/"]
```

## Multi-Machine Environments

Define multiple VMs in a single Vagrantfile:

```ruby
Vagrant.configure("2") do |config|
  config.vm.define "web" do |web|
    web.vm.box = "generic/centos9s"
    web.vm.hostname = "web-server"
    web.vm.network "private_network", ip: "192.168.121.10"
    web.vm.provider :libvirt do |v|
      v.cpus = 2
      v.memory = 1024
    end
  end

  config.vm.define "db" do |db|
    db.vm.box = "generic/centos9s"
    db.vm.hostname = "db-server"
    db.vm.network "private_network", ip: "192.168.121.11"
    db.vm.provider :libvirt do |v|
      v.cpus = 2
      v.memory = 2048
    end
  end

  config.vm.define "cache" do |cache|
    cache.vm.box = "generic/centos9s"
    cache.vm.hostname = "cache-server"
    cache.vm.network "private_network", ip: "192.168.121.12"
    cache.vm.provider :libvirt do |v|
      v.cpus = 1
      v.memory = 512
    end
  end
end
```

```bash
# Start all VMs
vagrant up

# Start a specific VM
vagrant up web

# SSH into a specific VM
vagrant ssh db
```

## Provisioning

### Shell Provisioner

```ruby
config.vm.provision "shell", inline: <<-SHELL
  dnf install -y httpd
  systemctl enable --now httpd
  echo "Hello from Vagrant" > /var/www/html/index.html
SHELL
```

### Ansible Provisioner

```ruby
config.vm.provision "ansible" do |ansible|
  ansible.playbook = "playbook.yml"
  ansible.inventory_path = "inventory"
end
```

## Libvirt-Specific Options

```ruby
config.vm.provider :libvirt do |libvirt|
  libvirt.cpus = 4
  libvirt.memory = 4096
  libvirt.driver = "kvm"
  libvirt.storage_pool_name = "default"
  libvirt.machine_virtual_size = 40
  libvirt.nested = true
  libvirt.cpu_mode = "host-passthrough"
  libvirt.graphics_type = "vnc"
  libvirt.video_type = "virtio"
end
```

## Managing VMs

```bash
# Check VM status
vagrant status

# Stop a VM
vagrant halt

# Destroy a VM
vagrant destroy -f

# Take a snapshot
vagrant snapshot save my-snapshot

# Restore a snapshot
vagrant snapshot restore my-snapshot
```

## Conclusion

Vagrant with the Libvirt provider on RHEL gives you a fast, native KVM-based development environment. With support for multi-machine setups, various networking configurations, shared folders, and provisioning tools, you can replicate complex infrastructure locally for development and testing without the overhead of VirtualBox.
