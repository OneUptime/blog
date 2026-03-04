# How to Set Up User Namespaces for Container Isolation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Docker, Containers, Linux

Description: Learn how to configure Linux user namespaces to isolate container processes from the host, preventing privilege escalation and improving container security on Ubuntu.

---

One of the fundamental security challenges with containers is that, by default, the root user inside a container maps to root on the host. If a process breaks out of the container, it runs as root on the host - which is as bad as it sounds.

User namespaces solve this by remapping UIDs and GIDs inside the container to unprivileged IDs on the host. A process that appears to be root (UID 0) inside the container is actually an unprivileged user (like UID 100000) on the host system.

## How User Namespaces Work

Linux namespaces partition global resources so each namespace has its own isolated view. The user namespace specifically isolates the user and group ID number spaces.

When you create a user namespace with a UID mapping like `0:100000:65536`, it means:
- Container UID 0 (root) maps to host UID 100000
- Container UID 1 maps to host UID 100001
- ... and so on for 65536 UIDs

Any file or process owned by host UID 100000 appears to be owned by UID 0 inside the container, and vice versa.

## Checking Kernel Support

```bash
# Verify user namespace support in the running kernel
grep CONFIG_USER_NS /boot/config-$(uname -r)
# Should return: CONFIG_USER_NS=y

# Check how many user namespaces are allowed
cat /proc/sys/kernel/unprivileged_userns_clone
# 1 means enabled, 0 means disabled

# Enable if disabled
echo 1 | sudo tee /proc/sys/kernel/unprivileged_userns_clone
```

## Enabling User Namespace Remapping in Docker

Docker calls this feature "userns-remap." You can enable it globally for the Docker daemon.

### Option 1: Use the Default Remapping

Docker can create and manage its own subordinate UID/GID mappings automatically.

```bash
# Enable userns-remap with the 'default' setting
# This creates a 'dockremap' user automatically
sudo nano /etc/docker/daemon.json
```

Add or update the file:

```json
{
  "userns-remap": "default"
}
```

```bash
# Restart Docker to apply
sudo systemctl restart docker

# Verify the dockremap user was created
id dockremap

# Check the subordinate UID/GID mappings
grep dockremap /etc/subuid
grep dockremap /etc/subgid
# Should show something like: dockremap:100000:65536
```

### Option 2: Map to a Specific User

You can map containers to a specific existing user on the host.

```bash
# Create a dedicated user for container remapping
sudo useradd -r -s /bin/false container-user

# Assign subordinate UID/GID ranges
sudo usermod --add-subuids 200000-265535 container-user
sudo usermod --add-subgids 200000-265535 container-user

# Verify the mappings
grep container-user /etc/subuid
grep container-user /etc/subgid
```

Update `daemon.json`:

```json
{
  "userns-remap": "container-user"
}
```

```bash
sudo systemctl restart docker
```

## Verifying the Remapping Works

Once Docker restarts, the UID remapping is active for all new containers.

```bash
# Run a container and check what UID processes use on the host
docker run -d --name test-ns nginx:alpine

# Get the container's main process PID on the host
PID=$(docker inspect test-ns --format '{{.State.Pid}}')

# Check the UID on the host
ps -p $PID -o pid,uid,gid,comm
# The UID should be in the 100000+ range, not 0

# Inside the container, processes appear to run as root
docker exec test-ns id
# uid=0(root) gid=0(root)

# Clean up
docker rm -f test-ns
```

## Filesystem Considerations with userns-remap

Docker stores container data under `/var/lib/docker`. With userns-remap enabled, it creates a separate directory for each remap configuration.

```bash
# List the userns-remapped storage directory
sudo ls /var/lib/docker/100000.100000/

# You should see standard Docker directories: containers, image, volumes, etc.
```

Bind mounts from the host need careful attention. Files owned by root on the host will appear to be owned by nobody (65534) or another unmapped UID inside the container.

```bash
# Create a directory owned by the remapped UID on the host
sudo mkdir /data/myapp
sudo chown 100000:100000 /data/myapp

# Now mount it into a container - it will appear as root-owned inside
docker run -v /data/myapp:/app nginx:alpine ls -la /app
```

## Using User Namespaces Without Docker

You can also use user namespaces directly with standard Linux tools.

### With unshare

```bash
# Create a new user namespace as an unprivileged user
unshare --user --pid --mount --fork --map-root-user /bin/bash

# Inside the new namespace
id
# uid=0(root) gid=0(root) groups=0(root)
# But on the host, you are still your regular user

# Check the UID mapping
cat /proc/self/uid_map
# 0  1000  1   (maps namespace UID 0 to host UID 1000 for 1 ID)
```

### With lxc/lxd

LXD manages user namespace mappings automatically and is well-integrated with Ubuntu.

```bash
# Install LXD
sudo snap install lxd

# Initialize LXD
sudo lxd init --minimal

# Launch a container (uses user namespaces by default)
lxc launch ubuntu:22.04 mycontainer

# Verify UIDs from the host
lxc info mycontainer | grep Pid
PID=$(lxc info mycontainer | grep Pid | awk '{print $2}')
ps -p $PID -o pid,uid,gid
```

## Limitations and Trade-offs

User namespace remapping has a few notable limitations you should know before deploying it.

**Performance overhead** - UID/GID translation adds a small overhead to file system operations, particularly when listing large directories.

**Capability restrictions** - Some Docker features require elevated privileges that conflict with user namespaces. Notably, `--privileged` containers cannot use userns-remap.

```bash
# This will fail with userns-remap enabled
docker run --privileged myimage
# Use --userns=host to opt out for specific containers that need it
docker run --userns=host --privileged myimage
```

**Volume ownership** - When sharing volumes between userns-remapped containers and non-remapped processes, file ownership requires careful management.

**Network namespaces** - Some network configurations, particularly those requiring raw socket access, may need adjustment.

## Checking Effective Configuration

```bash
# Confirm current Docker userns-remap setting
docker info | grep -A2 "Security Options"

# Check active UID mapping for running containers
docker inspect <container_id> | grep -i user
```

## Integrating with AppArmor and Seccomp

User namespaces work best as part of a layered security approach alongside AppArmor profiles and seccomp filters. Each mechanism addresses a different attack vector:

- User namespaces: limit privilege if a container breaks out
- Seccomp: restrict kernel system calls
- AppArmor: limit file and capability access by path

Combining all three gives you defense in depth for container workloads. The extra operational overhead of managing UID remapping is worth the significant reduction in blast radius when a container is compromised.
