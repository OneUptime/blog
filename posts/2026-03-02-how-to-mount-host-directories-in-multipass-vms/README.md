# How to Mount Host Directories in Multipass VMs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Virtualization, File Sharing

Description: Step-by-step guide to mounting host machine directories inside Multipass VMs using both automatic mounts and manual mount commands for development workflows.

---

One of the most practical features of Multipass is the ability to mount directories from your host machine directly into a VM. This lets you edit code with your preferred host-side editor while running and testing it inside an isolated VM environment - no file copying required.

## How Multipass Mounts Work

Multipass supports two mount types. The default, called "classic", is based on SSHFS (SSH Filesystem). The alternative, "native", uses the underlying hypervisor's file sharing - 9P on QEMU and SMB/CIFS on Hyper-V. You can pick the type with the `--type` flag on `multipass mount` (`classic` or `native`). In either case, the mount appears as a standard filesystem path inside the VM and supports:
- Real-time file synchronization (reads and writes go through immediately)
- Normal file permissions (mapped between host and VM users)

The tradeoff is performance - SSHFS introduces latency compared to native disk access, making it unsuitable for I/O-intensive workloads like database files or heavy compilation. Native mounts are typically faster but availability depends on your platform's hypervisor.

## Basic Mount Syntax

```bash
# Mount a host directory into a running VM

multipass mount <host-path> <instance-name>:<vm-path>

# Example: mount your projects folder
multipass mount ~/projects myvm:/home/ubuntu/projects
```

The `<vm-path>` is created automatically if it doesn't exist.

## Mounting at Launch Time

The most convenient approach is mounting during `multipass launch`:

```bash
# Mount during launch using --mount flag
multipass launch 24.04 \
  --name dev \
  --cpus 2 \
  --memory 4G \
  --mount ~/code:/home/ubuntu/code \
  --mount ~/data:/home/ubuntu/data
```

Multiple `--mount` flags mount multiple directories simultaneously.

## Mounting After Launch

For an already-running VM:

```bash
# Mount a specific project directory
multipass mount ~/projects/webapp myvm:/home/ubuntu/webapp

# Verify the mount
multipass exec myvm -- ls /home/ubuntu/webapp

# Or shell in and check
multipass shell myvm
ls ~/webapp
```

## Listing Active Mounts

```bash
# See what's mounted on a VM
multipass info myvm

# Look for the "Mounts" section in the output:
# Mounts:    /home/user/projects => /home/ubuntu/projects
#                UID map: 1000:default
#                GID map: 1000:default
```

## Unmounting

```bash
# Unmount a specific path
multipass umount myvm:/home/ubuntu/projects

# Unmount all mounts from a VM
multipass umount myvm
```

## Understanding UID/GID Mapping

By default, Multipass maps your host user's UID to the `ubuntu` user inside the VM. This means files created inside the VM appear owned by your host user:

```bash
# Check the mapping
multipass info myvm | grep -A2 "UID map"
# UID map: 1000:default
# GID map: 1000:default
```

The value `1000:default` means host UID 1000 maps to the VM's default user (also UID 1000 for `ubuntu`).

### Custom UID/GID Mapping

If your host user has a different UID or you need specific permissions:

```bash
# Mount with explicit UID/GID mapping
multipass mount ~/projects myvm:/home/ubuntu/projects \
  --uid-map 501:1000 \
  --gid-map 20:1000
```

Here, host UID 501 (common on macOS) maps to VM UID 1000 (`ubuntu` user).

## Practical Development Workflow

The most common use case is editing code on the host and running it in the VM:

```bash
# 1. Create a dev VM with your project mounted
multipass launch 24.04 \
  --name webdev \
  --cpus 2 \
  --memory 4G \
  --disk 20G \
  --mount ~/projects/myapp:/home/ubuntu/myapp

# 2. Install dependencies inside the VM
multipass exec webdev -- bash -c "
  cd /home/ubuntu/myapp
  sudo apt update
  sudo apt install -y nodejs npm
  npm install
"

# 3. Edit files on host with your favorite editor
# (VS Code, vim, etc. - edits appear instantly in the VM)
code ~/projects/myapp

# 4. Run and test in the VM
multipass exec webdev -- bash -c "cd /home/ubuntu/myapp && npm start"

# 5. Access the running app via the VM's IP
multipass info webdev | grep IPv4
# Connect to http://<vm-ip>:3000
```

## Read-Only Mounts

`multipass mount` itself does not have a `--readonly` flag. If you want the VM to read but not modify a directory, the usual approaches are:

```bash
# Option 1: make the host directory read-only for the mapped UID
chmod -R a-w ~/shared-config
multipass mount ~/shared-config myvm:/etc/app-config

# Option 2: remount as read-only inside the VM after mounting
multipass exec myvm -- sudo mount -o remount,ro /etc/app-config
```

Check `multipass mount --help` on your version for the exact set of supported flags.

## Common Issues and Fixes

### Mount Fails: "sshfs not installed in guest"

Multipass auto-installs the `multipass-sshfs` snap inside the guest for classic mounts, but this can fail on minimal images or when the VM has no network access during launch. If you see this error, install the snap manually:

```bash
# Install the multipass-sshfs snap inside the VM
multipass exec myvm -- sudo snap install multipass-sshfs

# Retry the mount
multipass mount ~/projects myvm:/home/ubuntu/projects
```

### Permission Denied on Mounted Files

If files inside the VM show permission errors:

```bash
# Check UID of your host user
id -u  # e.g., 1001

# Check UID of ubuntu user in VM
multipass exec myvm -- id -u ubuntu  # usually 1000

# If they differ, use explicit UID mapping
multipass umount myvm:/home/ubuntu/projects
multipass mount ~/projects myvm:/home/ubuntu/projects --uid-map $(id -u):1000
```

### Mount Doesn't Re-attach After VM Restart

Mounts added with either `multipass mount` or `multipass launch --mount` are stored in Multipass's instance configuration and re-applied automatically when the VM starts. If a mount fails to re-attach after a restart - usually because the host directory was moved or renamed, or the SSHFS connection couldn't be re-established - check that the host path still exists and re-run `multipass mount` to re-apply it:

```bash
# Verify which mounts are configured
multipass info myvm

# Re-apply if a mount is missing or stale
multipass umount myvm:/home/ubuntu/projects
multipass mount ~/projects myvm:/home/ubuntu/projects
```

### Slow File I/O on Mounted Directories

SSHFS is not suited for high I/O workloads. For anything that reads/writes many small files rapidly (like Node.js `node_modules`, Python virtualenvs, or database files), keep those directories inside the VM rather than mounting them from the host:

```bash
# Good: mount source code (few writes)
multipass mount ~/projects/myapp myvm:/home/ubuntu/myapp

# Bad: mounting node_modules from host (thousands of small files)
# Keep node_modules inside the VM:
multipass exec myvm -- bash -c "cd /home/ubuntu/myapp && npm install"
```

A common pattern is mounting source code but running `npm install` inside the VM so `node_modules` lives on the VM's native disk.

## Automating Mounts with a Helper Script

For consistent development environments:

```bash
#!/bin/bash
# dev-start.sh

VM_NAME="devbox"
MOUNTS=(
  "$HOME/projects:/home/ubuntu/projects"
  "$HOME/.gitconfig:/home/ubuntu/.gitconfig"
)

# Start if stopped
multipass start "$VM_NAME" 2>/dev/null

# Apply mounts (idempotent: ignore errors if already mounted)
for mount in "${MOUNTS[@]}"; do
  IFS=: read -r src dst <<< "$mount"
  echo "Mounting $src -> $dst"
  multipass mount "$src" "$VM_NAME:$dst" 2>/dev/null || true
done

# Open shell
multipass shell "$VM_NAME"
```

Directory mounts in Multipass are one of its most useful features for day-to-day development. The ability to keep files on your host while using the VM for execution gives you the best of both worlds: familiar host tooling and isolated runtime environments.
