# How to Understand Linux Namespaces on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Containers, Kernel, Security

Description: A thorough guide to Linux namespaces on Ubuntu, explaining how each namespace type works and how they isolate system resources for containers and processes.

---

Linux namespaces are the kernel feature that makes containers possible. A namespace wraps a particular global system resource and makes it appear to processes within the namespace that they have their own isolated instance of that resource. Processes in different namespaces see different views of the same underlying system.

Docker, LXC, and systemd-nspawn all use namespaces to create isolated environments. Understanding namespaces helps you reason about container security, debug container networking issues, and use isolation features without containers.

## Types of Namespaces

Linux currently has eight namespace types:

| Namespace | Flag | Isolates |
|-----------|------|----------|
| Mount | CLONE_NEWNS | Mount points and filesystem hierarchy |
| UTS | CLONE_NEWUTS | Hostname and NIS domain name |
| IPC | CLONE_NEWIPC | System V IPC, POSIX message queues |
| PID | CLONE_NEWPID | Process ID numbers |
| Network | CLONE_NEWNET | Network devices, stacks, ports |
| User | CLONE_NEWUSER | User and group IDs |
| Cgroup | CLONE_NEWCGROUP | cgroup root directory |
| Time | CLONE_NEWTIME | Boot and monotonic clocks |

## Viewing Current Namespaces

Every process belongs to exactly one of each namespace type. You can see a process's namespaces via `/proc`:

```bash
# View namespaces of the current shell
ls -la /proc/$$/ns/

# Each file is a symlink pointing to the namespace identifier
# e.g., lrwxrwxrwx ... mnt -> mnt:[4026531840]

# Compare with a container process
docker run -d nginx
NGINX_PID=$(docker inspect -f '{{.State.Pid}}' $(docker ps -q))
ls -la /proc/$NGINX_PID/ns/

# The namespace IDs will differ from your shell's namespaces
```

### lsns - List Namespaces

```bash
# Install util-linux (usually already present)
# List all namespaces
sudo lsns

# Filter by type
sudo lsns -t net
sudo lsns -t pid

# Show namespaces for a specific process
sudo lsns -p 1234
```

## Working with Namespaces using unshare

`unshare` creates new namespaces and runs a command inside them.

### UTS Namespace - Hostname Isolation

```bash
# Create a new UTS namespace with a different hostname
sudo unshare --uts bash

# Inside the new namespace, change the hostname
hostname container-1

# Verify
hostname    # shows "container-1"
exit        # back to host

# Host hostname is unchanged
hostname    # shows original hostname
```

### PID Namespace - Process ID Isolation

```bash
# Create a new PID namespace
sudo unshare --pid --fork --mount-proc bash

# Inside: process tree starts from 1
ps aux
# Only shows processes in this namespace

# PID 1 inside the namespace is your shell
echo $$   # shows 1

exit
```

### Network Namespace - Network Isolation

```bash
# Create a network namespace named "isolated"
sudo ip netns add isolated

# List network namespaces
sudo ip netns list

# Run a command inside the namespace
sudo ip netns exec isolated bash

# Inside: only loopback interface exists
ip addr   # shows only lo

exit

# Connect two namespaces with a virtual ethernet pair
sudo ip link add veth0 type veth peer name veth1

# Move veth1 into the isolated namespace
sudo ip link set veth1 netns isolated

# Configure the host side
sudo ip addr add 192.168.100.1/24 dev veth0
sudo ip link set veth0 up

# Configure the namespace side
sudo ip netns exec isolated ip addr add 192.168.100.2/24 dev veth1
sudo ip netns exec isolated ip link set veth1 up
sudo ip netns exec isolated ip link set lo up

# Test connectivity
ping 192.168.100.2   # from host
sudo ip netns exec isolated ping 192.168.100.1  # from namespace

# Delete the namespace
sudo ip netns delete isolated
```

### Mount Namespace - Filesystem Isolation

```bash
# Create a new mount namespace
sudo unshare --mount bash

# Inside: mount a tmpfs that won't appear on the host
mount -t tmpfs tmpfs /mnt

# Verify it's mounted inside
mount | grep /mnt

# Open another terminal and check
mount | grep /mnt  # nothing visible on the host

exit
```

### User Namespace - Privilege Isolation

User namespaces are powerful because they allow an unprivileged user to be "root" inside the namespace without having real root privileges on the host.

```bash
# Create a user namespace as a regular user (no sudo needed)
unshare --user bash

# Inside: you appear to be nobody/65534
id

# Map the current user to UID 0 inside the namespace
# This requires writing to /proc/PID/uid_map

# A simpler approach using newuidmap/newgidmap
unshare --user --map-root-user bash
# Now you appear as root inside
id   # uid=0(root) gid=0(root)

# But on the host, your real UID is unchanged
```

### IPC Namespace

```bash
# Create separate IPC namespace
sudo unshare --ipc bash

# Inside: fresh IPC objects
ipcs   # empty

# Create an IPC semaphore
ipcmk -S 5

ipcs   # shows the new semaphore

exit

# Host IPC namespace is unaffected
ipcs
```

## Entering Existing Namespaces with nsenter

`nsenter` lets you join the namespaces of an existing process - this is what `docker exec` does under the hood.

```bash
# Start a container
docker run -d --name mycontainer nginx

# Get its PID
CONTAINER_PID=$(docker inspect -f '{{.State.Pid}}' mycontainer)
echo $CONTAINER_PID

# Enter all of the container's namespaces
sudo nsenter -t $CONTAINER_PID --mount --uts --ipc --net --pid bash

# You're now inside the container's namespace view
hostname
ip addr
ps aux
ls /

exit

# Enter only the network namespace (useful for debugging)
sudo nsenter -t $CONTAINER_PID --net bash
ip addr    # sees the container's network
ip route   # container routing table
ss -tlnp   # container listening ports

exit

# Enter only the PID namespace
sudo nsenter -t $CONTAINER_PID --pid ps aux
```

## How Docker Uses Namespaces

When Docker starts a container, it creates (or reuses) these namespaces:

```bash
# Inspect what namespaces a Docker container uses
CONTAINER_PID=$(docker inspect -f '{{.State.Pid}}' mycontainer)

echo "Container namespaces:"
for ns in /proc/$CONTAINER_PID/ns/*; do
    ns_name=$(basename $ns)
    ns_inode=$(readlink $ns)
    host_ns=$(readlink /proc/1/ns/$ns_name 2>/dev/null)
    if [ "$ns_inode" = "$host_ns" ]; then
        echo "  $ns_name: SHARED WITH HOST"
    else
        echo "  $ns_name: ISOLATED ($ns_inode)"
    fi
done
```

With `--network=host`, the container shares the host's network namespace. With `--pid=host`, it shares the PID namespace. Understanding this helps you reason about what a container can and cannot see.

## Creating a Simple Container with Namespaces

Here's a minimal container created purely with namespace tools:

```bash
# Create a root filesystem for our mini container
mkdir -p /tmp/mycontainer
# (In practice you'd populate this with a base OS)

# Unshare multiple namespaces at once
sudo unshare \
  --pid \
  --fork \
  --mount-proc=/tmp/mycontainer/proc \
  --uts \
  --ipc \
  --net \
  --mount \
  bash -c "
    # Set hostname
    hostname mycontainer

    # Mount the new root
    mount --bind /tmp/mycontainer /tmp/mycontainer

    # Start a shell
    bash
  "
```

## Namespace Security Considerations

**User namespaces** - Mapping UID 0 inside a user namespace to an unprivileged UID on the host is the mechanism for rootless containers. Exploit chains that escape user namespaces have been found historically, so some organizations disable unprivileged user namespaces:

```bash
# Check if unprivileged user namespaces are allowed
cat /proc/sys/kernel/unprivileged_userns_clone

# Disable (may break rootless Docker/Podman)
echo 0 | sudo tee /proc/sys/kernel/unprivileged_userns_clone
```

**PID namespace escape** - If a process inside a PID namespace can access `/proc` of the host, it can see and signal host processes. Always mount a fresh `/proc` inside new PID namespaces.

**Mount namespace and /proc** - The `hidepid` mount option can hide other users' processes even without namespaces:

```bash
# Remount /proc with hidepid
sudo mount -o remount,hidepid=2 /proc
```

Linux namespaces are the building block for all modern Linux container technologies. Knowing how they work at the system call level helps you understand container security boundaries, debug container networking, and use isolation features directly when containers would be overkill.
