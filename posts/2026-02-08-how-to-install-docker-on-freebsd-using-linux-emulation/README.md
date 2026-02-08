# How to Install Docker on FreeBSD Using Linux Emulation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, FreeBSD, Linux Emulation, Installation, Containers, DevOps, Unix, Virtualization

Description: How to run Docker on FreeBSD using Linux compatibility layer and virtual machine approaches, with practical alternatives and trade-offs explained.

---

FreeBSD is a respected operating system known for its stability, security features, and the ZFS filesystem. However, Docker does not run natively on FreeBSD. Docker depends heavily on Linux kernel features like cgroups, namespaces, and OverlayFS, none of which exist in the FreeBSD kernel. This does not mean you cannot use Docker on a FreeBSD machine, though. You have several approaches, each with different trade-offs. This guide covers the most practical methods.

## Why Docker Does Not Run Natively on FreeBSD

Docker's container isolation relies on Linux-specific kernel features:

- **Namespaces**: PID, network, mount, user, and IPC namespaces for process isolation
- **Cgroups**: Resource limits for CPU, memory, and I/O
- **OverlayFS / overlay2**: Union filesystem for layered images
- **seccomp**: System call filtering for security

FreeBSD has its own container technology called **Jails**, which predates Docker by over a decade. Jails provide process isolation similar to containers but use a completely different API. Docker cannot use Jails as a backend.

## Approach 1: Linux Virtual Machine on FreeBSD

The most reliable way to run Docker on FreeBSD is to run a Linux VM using `bhyve`, FreeBSD's native hypervisor.

### Step 1: Install bhyve and Required Tools

```bash
# Install the vm-bhyve management tool and required firmware
pkg install vm-bhyve grub2-bhyve
```

### Step 2: Initialize the VM Environment

```bash
# Create a ZFS dataset for VM storage
zfs create zpool/vm

# Initialize vm-bhyve
sysrc vm_enable="YES"
sysrc vm_dir="zfs:zpool/vm"

# Initialize the template directory
vm init
```

### Step 3: Configure Networking

```bash
# Create a virtual switch for VM networking
vm switch create public
vm switch add public em0  # Replace em0 with your network interface
```

### Step 4: Download and Install a Linux Image

```bash
# Fetch an Alpine Linux ISO (lightweight, ideal for Docker)
vm iso https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-virt-3.19.0-x86_64.iso

# Create a VM with 2 CPUs, 2GB RAM, and 20GB disk
vm create -t alpine -c 2 -m 2G -s 20G docker-host

# Install Alpine Linux
vm install docker-host alpine-virt-3.19.0-x86_64.iso
```

### Step 5: Install Docker Inside the Alpine VM

Once Alpine is installed and running, SSH into it and install Docker.

```bash
# Inside the Alpine VM: install Docker
apk update
apk add docker docker-compose

# Start Docker
rc-update add docker boot
service docker start

# Verify
docker run hello-world
```

### Step 6: Access Docker from FreeBSD Host

You can expose Docker's TCP socket to access it from the FreeBSD host.

Inside the Alpine VM, edit the Docker daemon configuration.

```bash
# Inside the VM: Configure Docker to listen on TCP
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
EOF

# Restart Docker
service docker restart
```

On the FreeBSD host, set the `DOCKER_HOST` environment variable.

```bash
# On the FreeBSD host: point Docker CLI to the VM
export DOCKER_HOST=tcp://192.168.1.100:2375  # Replace with your VM's IP
```

Install the Docker CLI on FreeBSD (it does not need the daemon).

```bash
# Install Docker client on FreeBSD
pkg install docker
```

Now Docker commands on FreeBSD will be forwarded to the Linux VM.

```bash
# Run Docker commands from FreeBSD, executed in the VM
docker ps
docker run hello-world
```

**Security warning**: The unauthenticated TCP socket exposes full Docker control. Only use this on trusted networks or add TLS authentication.

## Approach 2: Using the Linux Compatibility Layer

FreeBSD includes a Linux compatibility layer (Linuxulator) that can run Linux binaries. However, it emulates system calls at the userspace level and does not provide the kernel features Docker needs (cgroups, namespaces).

You can run the Docker CLI through the Linuxulator, but the Docker daemon itself will not work.

### Enable the Linux Compatibility Layer

```bash
# Load the Linux kernel module
kldload linux64

# Make it persistent
sysrc linux_enable="YES"

# Install the Linux base system
pkg install linux_base-c7
```

### Install Docker CLI via Linuxulator

```bash
# Create a directory for Linux binaries
mkdir -p /compat/linux/usr/local/bin

# Download the Docker CLI (static binary)
fetch -o /compat/linux/usr/local/bin/docker \
  https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz

# Extract just the docker binary
cd /tmp
fetch https://download.docker.com/linux/static/stable/x86_64/docker-24.0.7.tgz
tar xzf docker-24.0.7.tgz
cp docker/docker /compat/linux/usr/local/bin/docker
chmod +x /compat/linux/usr/local/bin/docker
```

Point this CLI at a remote Docker daemon (running on a Linux VM or another machine).

```bash
# Use the Linux Docker CLI with a remote daemon
export DOCKER_HOST=tcp://linux-vm-ip:2375
/compat/linux/usr/local/bin/docker ps
```

This is more of a workaround than a real solution. The VM approach from Approach 1 is far more practical.

## Approach 3: Podman on FreeBSD (Native Alternative)

While not Docker, Podman is worth mentioning. FreeBSD has experimental Podman support through OCI-compatible container runtimes like `runj` that use FreeBSD Jails.

```bash
# Install Podman on FreeBSD (experimental)
pkg install podman
```

Podman on FreeBSD runs OCI containers inside Jails. It supports a subset of Docker-compatible features, and many Docker images work if they do not depend on Linux-specific kernel features.

```bash
# Pull and run a container with Podman
podman pull docker.io/library/nginx
podman run -d -p 8080:80 nginx
```

The compatibility is limited. Containers that need Linux-specific syscalls will fail. But for simple web servers, databases, and stateless services, it can work.

## Approach 4: Docker Machine (Legacy)

Docker Machine was a tool for provisioning Docker hosts in VMs. While officially deprecated, it can still create a VirtualBox or bhyve-based Docker host.

```bash
# Install Docker Machine (if still available)
pkg install docker-machine

# Create a Docker host using VirtualBox
docker-machine create --driver virtualbox docker-freebsd

# Set environment variables to point at the machine
eval $(docker-machine env docker-freebsd)

# Use Docker as normal
docker run hello-world
```

This approach is outdated and not recommended for new setups. Use the bhyve approach instead.

## Performance Considerations

Running Docker through a VM adds overhead. Here are some ways to minimize the impact.

### Use VirtIO Drivers

When creating the bhyve VM, use VirtIO for disk and network I/O. This provides near-native performance.

### Allocate Adequate Resources

Give the VM enough CPU and memory for your container workloads. A Docker host VM should have at least 2 CPU cores and 2 GB of RAM.

### Use ZFS for VM Storage

FreeBSD's ZFS provides excellent performance for VM disk images. The copy-on-write semantics and built-in compression reduce I/O overhead.

```bash
# Enable compression on the VM dataset
zfs set compression=lz4 zpool/vm
```

### Shared Directories

To share files between FreeBSD and the Docker VM, use NFS or 9P.

```bash
# On FreeBSD: export a directory via NFS
echo "/shared -mapall=root 192.168.1.100" >> /etc/exports
service nfsd restart

# In the Linux VM: mount the NFS share
mount -t nfs freebsd-host:/shared /mnt/shared
```

## FreeBSD Jails as a Docker Alternative

If your primary need is process isolation (not Docker-specific images), FreeBSD Jails are a native, zero-overhead alternative.

```bash
# Create a simple Jail
mkdir -p /jails/webserver
bsdinstall jail /jails/webserver

# Start the Jail
jail -c name=webserver path=/jails/webserver host.hostname=webserver ip4.addr=192.168.1.50
```

Jails provide filesystem isolation, network isolation, and resource limits without any virtualization overhead. They just do not run Docker images.

## Summary

Docker does not run natively on FreeBSD due to its dependency on Linux kernel features. The most practical solution is running a lightweight Linux VM (Alpine Linux on bhyve) and accessing Docker from the FreeBSD host via TCP. For simpler container needs, experimental Podman support with FreeBSD Jails offers a native path. And if you do not specifically need Docker-format images, FreeBSD Jails remain an excellent, battle-tested container technology. Choose the approach that best fits your workflow and performance requirements.
