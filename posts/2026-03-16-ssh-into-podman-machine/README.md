# How to SSH into a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps

Description: Learn how to SSH into a Podman machine for debugging, inspecting container storage, modifying VM settings, and troubleshooting runtime issues.

---

> SSH access to your Podman machine gives you direct control over the Linux VM, enabling deep debugging and system-level configuration.

The Podman machine is a Linux virtual machine running behind the scenes on macOS and Windows. While most operations are handled through the `podman` CLI, sometimes you need direct access to the VM for debugging, inspecting storage, or modifying system settings. This guide covers how to SSH into Podman machines and what you can do once inside.

---

## Prerequisites

- Podman installed on macOS or Windows
- A running Podman machine

## Basic SSH Access

### SSH into the Default Machine

```bash
# Ensure the machine is running

podman machine start

# SSH into the default machine
podman machine ssh
```

This drops you into a shell inside the Linux VM. You will be logged in as the `core` user (on Fedora CoreOS-based machines) or `user` depending on your configuration.

### SSH into a Named Machine

```bash
# SSH into a specific named machine
podman machine ssh dev-heavy
```

### Run a Single Command via SSH

```bash
# Execute a command without entering an interactive shell
podman machine ssh -- uname -a

# Check disk space
podman machine ssh -- df -h

# Check memory
podman machine ssh -- free -h

# Check running processes
podman machine ssh -- ps aux
```

## Debugging Inside the Machine

### Check System Information

```bash
# View the Linux distribution running inside the machine
podman machine ssh -- cat /etc/os-release

# Check the kernel version
podman machine ssh -- uname -r

# View system uptime
podman machine ssh -- uptime

# Check CPU information
podman machine ssh -- nproc
podman machine ssh -- lscpu
```

### Inspect Container Storage

```bash
# SSH into the machine
podman machine ssh

# View container storage location
podman info --format '{{.Store.GraphRoot}}'
STORAGE_ROOT=$(podman info --format '{{.Store.GraphRoot}}')
ls -la "$STORAGE_ROOT"

# Check overlay filesystem usage
du -sh "$STORAGE_ROOT/overlay/"

# List stored images
ls "$STORAGE_ROOT/overlay-images/"

# Check container data
ls "$STORAGE_ROOT/overlay-containers/"

# Check volume data
ls "$STORAGE_ROOT/volumes/"

# Exit SSH session
exit
```

### Check Container Runtime Logs

```bash
# View logs for a specific container by its name or ID
podman machine ssh -- podman logs --tail 30 <container>

# Check for errors in the journal
podman machine ssh -- journalctl -p err --no-pager | tail -20

# If the container uses the journald log driver, view its journal entries
podman machine ssh -- journalctl CONTAINER_ID=<id> --no-pager
```

### Inspect Networking

```bash
# Check network interfaces inside the machine
podman machine ssh -- ip addr show

# Check routing table
podman machine ssh -- ip route

# Check DNS configuration
podman machine ssh -- cat /etc/resolv.conf

# Test outbound connectivity
podman machine ssh -- curl -s https://httpbin.org/ip

# Check iptables/nftables rules
podman machine ssh -- sudo nft list ruleset 2>/dev/null || podman machine ssh -- sudo iptables -L
```

## Modifying Machine Configuration

### Edit System Files

```bash
# SSH into the machine
podman machine ssh

# Edit the containers configuration
sudo vi /etc/containers/containers.conf

# Edit the storage configuration
sudo vi /etc/containers/storage.conf

# Edit the registries configuration
sudo vi /etc/containers/registries.conf

# Exit
exit
```

### Install Additional Tools

```bash
# SSH into the machine
podman machine ssh

# On Fedora CoreOS-based machines, use rpm-ostree
sudo rpm-ostree install htop strace tcpdump

# You may need to restart for changes to take effect
sudo systemctl reboot

# On other VM types, use the standard package manager
sudo dnf install -y htop strace tcpdump

# Exit
exit
```

### Modify Kernel Parameters

```bash
# SSH into the machine
podman machine ssh

# View current kernel parameters
sysctl -a | grep net.ipv4

# Set a kernel parameter temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Set it permanently
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.d/99-custom.conf
sudo sysctl -p /etc/sysctl.d/99-custom.conf

# Exit
exit
```

## Troubleshooting with SSH

### Debug Container Failures

```bash
# SSH into the machine to investigate
podman machine ssh

# Check dmesg for kernel-level errors
sudo dmesg | tail -30

# Check if the container runtime (crun) is working
crun --version

# Check if conmon is healthy
conmon --version

# Look for out-of-memory kills
sudo dmesg | grep -i "oom\|killed"

# Check cgroup resource limits
cat /sys/fs/cgroup/memory.max 2>/dev/null
cat /sys/fs/cgroup/cpu.max 2>/dev/null

# Exit
exit
```

### Debug Networking Issues

```bash
# Check if DNS is working inside the machine
podman machine ssh -- nslookup docker.io

# Check if container networking is functional
podman machine ssh -- ping -c 3 8.8.8.8

# Inspect the podman network bridge
podman machine ssh -- ip link show

# Check for firewall blocking
podman machine ssh -- sudo iptables -L -n
```

### Debug Storage Issues

```bash
# Check filesystem type and mount options
podman machine ssh -- mount | grep containers

# Check for inode exhaustion
podman machine ssh -- df -i

# Check for filesystem errors
podman machine ssh -- sudo dmesg | grep -i "ext4\|xfs\|error"

# Check storage driver status
podman machine ssh -- podman info --format '{{.Store.GraphDriverName}}'
```

## Advanced SSH Usage

### Copy Files To and From the Machine

```bash
# Use podman machine ssh with stdin/stdout redirection
# Copy a file into the machine
cat local-file.txt | podman machine ssh -- "cat > /tmp/remote-file.txt"

# Copy a file from the machine
podman machine ssh -- "cat /tmp/remote-file.txt" > local-copy.txt

# Verify the transfer
podman machine ssh -- "cat /tmp/remote-file.txt"
```

### Port Forward Through SSH

```bash
# If a service inside the machine is not accessible via port mapping,
# use SSH tunneling
# This forwards local port 9090 to port 9090 inside the machine

# First, find the SSH connection details
podman system connection list

# Use the SSH key and port from the connection info
# ssh -i <key> -p <port> -L 9090:localhost:9090 core@localhost
```

### Run Scripts Inside the Machine

```bash
# Create a diagnostic script and run it inside the machine
cat <<'SCRIPT' | podman machine ssh -- bash
echo "=== System Info ==="
uname -a
echo ""
echo "=== Memory ==="
free -h
echo ""
echo "=== Disk ==="
df -h /
echo ""
echo "=== Containers ==="
podman ps -a
echo ""
echo "=== Images ==="
podman images
SCRIPT
```

## Running a Comprehensive Diagnostic

```bash
# Run a full diagnostic session
podman machine ssh << 'EOF'
echo "==============================="
echo "  Podman Machine Diagnostic"
echo "==============================="
echo ""
echo "--- OS Info ---"
cat /etc/os-release | head -3
echo ""
echo "--- Kernel ---"
uname -r
echo ""
echo "--- Resources ---"
echo "CPUs: $(nproc)"
echo "Memory: $(free -h | grep Mem | awk '{print $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $2 " total, " $4 " free"}')"
echo ""
echo "--- Container Runtime ---"
crun --version 2>/dev/null | head -1 || runc --version 2>/dev/null | head -1
echo ""
echo "--- Podman ---"
podman --version
echo ""
echo "--- Running Containers ---"
podman ps --format "{{.Names}}: {{.Status}}"
echo ""
echo "--- Storage Usage ---"
podman system df
echo ""
echo "==============================="
echo "  Diagnostic Complete"
echo "==============================="
EOF
```

## Troubleshooting SSH Access

If SSH fails to connect:

```bash
# Check if the machine is running
podman machine list

# Start it if stopped
podman machine start

# If SSH still fails, try resetting the connection
podman system connection list
podman system connection default podman-machine-default
```

If you get permission denied errors:

```bash
# The SSH key may need to be regenerated
# Stop the machine and recreate it
podman machine stop
podman machine rm
podman machine init
podman machine start
podman machine ssh
```

## Summary

SSH access to a Podman machine is essential for debugging, inspecting storage, modifying system configuration, and diagnosing networking issues. Use `podman machine ssh` for interactive sessions and `podman machine ssh -- <command>` for one-off commands. For comprehensive diagnostics, pipe scripts through SSH to run inside the VM. This access bridges the gap between high-level Podman commands and low-level system troubleshooting.
