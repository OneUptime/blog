# How to Use systemd-nspawn for Lightweight Container Testing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, systemd, System Administration, Containers, Linux

Description: Learn how to use systemd-nspawn for Lightweight Container Testing on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd-nspawn is a lightweight container tool built into systemd. It runs a full operating system tree in an isolated namespace, similar to chroot but with proper process, network, and file system isolation. It is ideal for testing, building packages, and running lightweight services.

## Prerequisites

- RHEL with systemd
- Root or sudo access
- `systemd-container` package

## Step 1: Install Required Packages

```bash
sudo dnf install -y systemd-container
```

## Step 2: Create a Container Root Filesystem

Use `dnf` to install a minimal RHEL system into a directory:

```bash
sudo mkdir -p /var/lib/machines/testcontainer
sudo dnf --releasever=9 --installroot=/var/lib/machines/testcontainer   --setopt=install_weak_deps=False install -y   basesystem systemd dnf
```

## Step 3: Boot the Container

```bash
sudo systemd-nspawn -D /var/lib/machines/testcontainer -b
```

The `-b` flag boots the container's init system. You will see a login prompt. The `-D` flag specifies the directory.

To exit, press `Ctrl+]` three times quickly.

## Step 4: Run a Single Command

Instead of booting the full init:

```bash
sudo systemd-nspawn -D /var/lib/machines/testcontainer /bin/bash
```

## Step 5: Network Configuration

By default, nspawn creates a private network namespace. For host networking:

```bash
sudo systemd-nspawn -D /var/lib/machines/testcontainer --network-veth -b
```

The `--network-veth` option creates a virtual Ethernet pair between host and container.

## Step 6: Use machinectl

Register and manage containers with machinectl:

```bash
sudo machinectl list
sudo machinectl start testcontainer
sudo machinectl login testcontainer
sudo machinectl poweroff testcontainer
```

## Step 7: Resource Limits

Apply resource limits via a nspawn configuration file:

```bash
sudo vi /etc/systemd/nspawn/testcontainer.nspawn
```

```ini
[Exec]
Boot=yes

[Files]
Bind=/shared:/mnt/shared

[Network]
VirtualEthernet=yes
```

## Step 8: Bind Mount Host Directories

```bash
sudo systemd-nspawn -D /var/lib/machines/testcontainer   --bind=/host/data:/container/data   -b
```

## Common Options

| Option | Description |
|--------|-------------|
| `-D` | Container root directory |
| `-b` | Boot the container init |
| `--network-veth` | Create virtual network interface |
| `--bind=SRC:DEST` | Bind mount a host directory |
| `--private-users=pick` | Enable user namespacing |
| `-M NAME` | Set machine name |
| `--read-only` | Mount root filesystem read-only |

## Conclusion

systemd-nspawn provides lightweight container functionality on RHEL without requiring Docker or Podman. It is tightly integrated with systemd and machinectl, making it an excellent choice for testing environments, package building, and running isolated services.
