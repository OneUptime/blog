# How to Use Podman in a Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Virtual Machine, Container, Linux, DevOps, QEMU, VirtualBox, VMware

Description: Install and run Podman inside virtual machines using QEMU/KVM, VirtualBox, and VMware, covering VM setup, networking, shared folders, and performance tuning.

---

> Running Podman inside a virtual machine gives you an isolated container environment that you can snapshot, clone, and destroy without affecting your host system. Whether you use QEMU/KVM, VirtualBox, or VMware, Podman's daemonless architecture makes it lightweight and efficient inside VMs.

Virtual machines remain one of the most common ways to create isolated development and testing environments. Running Podman inside a VM lets you experiment with containers without installing anything on your host operating system. This approach is popular for CI/CD pipelines, security testing, and multi-platform development.

---

## Choosing a Hypervisor

Each hypervisor has trade-offs for running Podman:

| Hypervisor | Performance | Ease of Use | Nested Virtualization |
|------------|-------------|-------------|----------------------|
| QEMU/KVM | Excellent | Moderate | Supported |
| VirtualBox | Good | Easy | Supported (experimental) |
| VMware Workstation | Excellent | Easy | Supported |
| Hyper-V | Good | Moderate | Supported |

For Linux hosts, QEMU/KVM provides the best performance. For cross-platform needs, VirtualBox is the simplest option.

---

## Setting Up a VM with QEMU/KVM

### Installing QEMU/KVM on the Host

On Ubuntu or Debian:

```bash
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients \
  bridge-utils virt-manager cloud-image-utils
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER
```

On Fedora:

```bash
sudo dnf install -y @virtualization cloud-utils-cloud-localds
sudo systemctl enable --now libvirtd
```

### Creating a VM

Download a cloud image and create a VM:

```bash
# Download Fedora cloud image

wget https://dl.fedoraproject.org/pub/fedora/linux/releases/42/Cloud/x86_64/images/Fedora-Cloud-Base-Generic-42-1.1.x86_64.qcow2

# Create a larger disk from the cloud image
qemu-img create -f qcow2 -F qcow2 \
  -b Fedora-Cloud-Base-Generic-42-1.1.x86_64.qcow2 \
  podman-vm.qcow2 20G
```

Create a cloud-init configuration for automatic setup:

```bash
cat > cloud-init.yaml <<EOF
#cloud-config
users:
  - name: developer
    sudo: ALL=(ALL) NOPASSWD:ALL
    groups: users
    shell: /bin/bash
    ssh_authorized_keys:
      - $(cat ~/.ssh/*.pub | head -n 1)
packages:
  - podman
  - podman-compose
  - slirp4netns
  - passt
  - fuse-overlayfs
EOF

cloud-localds cloud-init.iso cloud-init.yaml
```

Launch the VM:

```bash
qemu-system-x86_64 \
  -m 4096 \
  -smp 2 \
  -enable-kvm \
  -drive file=podman-vm.qcow2,format=qcow2,if=virtio \
  -cdrom cloud-init.iso \
  -nic user,model=virtio,hostfwd=tcp::2222-:22,hostfwd=tcp::8080-:8080 \
  -nographic
```

SSH into the VM:

```bash
ssh -p 2222 developer@localhost
```

---

## Setting Up a VM with VirtualBox

### Creating the VM

1. Download an ISO for your preferred Linux distribution (Ubuntu Server 24.04 or Fedora Server 42 recommended).
2. Create a new VM in VirtualBox with at least 2 CPUs, 4GB RAM, and 20GB disk.
3. Nested virtualization is not required for Podman. Only enable it if you plan to run another hypervisor inside the guest:

```bash
VBoxManage modifyvm "PodmanVM" --nested-hw-virt on
```

### Installing Podman in the VirtualBox VM

After installing the Linux distribution, SSH into the VM and install Podman:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y podman passt

# Fedora
sudo dnf install -y podman passt
```

### Port Forwarding

Set up port forwarding so you can access container services from the host:

```bash
VBoxManage modifyvm "PodmanVM" --natpf1 "http,tcp,,8080,,8080"
VBoxManage modifyvm "PodmanVM" --natpf1 "ssh,tcp,,2222,,22"
```

### Shared Folders

Mount a host directory inside the VM for sharing code:

```bash
VBoxManage sharedfolder add "PodmanVM" \
  --name "projects" \
  --hostpath "/home/user/projects"
```

Inside the VM, after installing VirtualBox Guest Additions, mount the shared folder:

```bash
sudo mkdir -p /mnt/projects
sudo mount -t vboxsf projects /mnt/projects
```

---

## Installing and Configuring Podman Inside the VM

Regardless of the hypervisor, once you are inside the VM, the Podman setup is the same.

### Basic Configuration

Set up rootless Podman:

```bash
# Verify subuid/subgid mappings exist
grep $USER /etc/subuid
grep $USER /etc/subgid

# If not present, add them
sudo usermod --add-subuids 100000-165535 $USER
sudo usermod --add-subgids 100000-165535 $USER
```

Configure registries:

```bash
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf <<EOF
unqualified-search-registries = ['docker.io', 'quay.io', 'ghcr.io']
EOF
```

### Testing the Installation

```bash
podman info
podman run --rm docker.io/library/hello-world
```

---

## Networking Between Host and VM Containers

### Accessing Container Ports from the Host

When running a container inside the VM with port mapping, the traffic flows through two layers: VM port forwarding and container port mapping.

```bash
# Inside the VM, run a container
podman run -d --name web -p 8080:80 docker.io/library/nginx:alpine
```

If you configured host-to-VM port forwarding for port 8080, you can access the Nginx server from the host browser at `http://localhost:8080`.

### Creating a Bridge Network

For containers that need to communicate with each other inside the VM:

```bash
podman network create devnet

podman run -d --name api --network devnet \
  docker.io/library/node:20-alpine tail -f /dev/null

podman run -d --name db --network devnet \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16-alpine
```

Containers on the same Podman network can reach each other by name:

```bash
podman exec api ping -c 1 db
```

---

## Snapshotting and Cloning VM Environments

One of the biggest advantages of running Podman in a VM is the ability to snapshot and restore entire environments.

### With QEMU/KVM

```bash
# With the VM powered off, create a snapshot
qemu-img snapshot -c clean-state podman-vm.qcow2

# List snapshots
qemu-img snapshot -l podman-vm.qcow2

# Restore a snapshot
qemu-img snapshot -a clean-state podman-vm.qcow2
```

### With VirtualBox

```bash
VBoxManage snapshot "PodmanVM" take "clean-state" \
  --description "Fresh Podman setup"

VBoxManage snapshot "PodmanVM" restore "clean-state"
```

---

## Performance Optimization

### Allocating Resources

Give your VM enough resources for container workloads:

```bash
# QEMU - allocate 4GB RAM and 4 CPUs
qemu-system-x86_64 -m 4096 -smp 4 -enable-kvm ...

# VirtualBox
VBoxManage modifyvm "PodmanVM" --memory 4096 --cpus 4
```

### Using Virtio Drivers

For QEMU/KVM, use virtio drivers for better disk and network performance:

```bash
qemu-system-x86_64 \
  -drive file=podman-vm.qcow2,format=qcow2,if=virtio \
  -nic user,model=virtio,hostfwd=tcp::2222-:22 \
  ...
```

### Storage Driver Selection

Inside the VM, use the overlay storage driver for best performance:

```bash
podman info --format '{{.Store.GraphDriverName}}'
```

If it shows `vfs` instead of `overlay`, reset rootless storage before changing drivers:

```bash
podman system reset
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"
EOF
```

---

## Automating VM Setup with Vagrant

For reproducible VM environments, use Vagrant:

```ruby
# Vagrantfile
Vagrant.configure("2") do |config|
  config.vm.box = "fedora/42-cloud-base"
  config.vm.hostname = "podman-dev"

  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 5432, host: 5432

  config.vm.provider "virtualbox" do |vb|
    vb.memory = "4096"
    vb.cpus = 2
  end

  config.vm.provision "shell", inline: <<-SHELL
    dnf install -y podman podman-compose passt
    loginctl enable-linger vagrant
  SHELL
end
```

Start the VM:

```bash
vagrant up
vagrant ssh
```

---

## Conclusion

Running Podman inside a virtual machine provides a clean, isolated environment for container development and testing. You get the benefits of VM snapshots and cloning combined with Podman's rootless, daemonless container management. QEMU/KVM delivers the best performance on Linux hosts, while VirtualBox and VMware provide cross-platform compatibility. Use Vagrant to automate VM provisioning so your entire team can spin up identical Podman environments in minutes. The key is to allocate sufficient resources to the VM and use virtio drivers and the overlay storage driver for optimal performance.
