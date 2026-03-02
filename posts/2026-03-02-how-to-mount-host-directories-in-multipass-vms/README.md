# How to Mount Host Directories in Multipass VMs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Virtualization, File Sharing

Description: Step-by-step guide to mounting host machine directories inside Multipass VMs using both automatic mounts and manual mount commands for development workflows.

---

One of the most practical features of Multipass is the ability to mount directories from your host machine directly into a VM. This lets you edit code with your preferred host-side editor while running and testing it inside an isolated VM environment - no file copying required.

## How Multipass Mounts Work

Multipass uses a custom mount mechanism based on SSHFS (SSH Filesystem) to make host directories available inside VMs. The mount appears as a standard filesystem path inside the VM and supports:
- Real-time file synchronization (reads and writes go through immediately)
- Normal file permissions (mapped between host and VM users)
- Both read-write and read-only mounts

The tradeoff is performance - SSHFS introduces latency compared to native disk access, making it unsuitable for I/O-intensive workloads like database files or heavy compilation.

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

For data you want the VM to read but not modify:

```bash
# Mount read-only (prevents accidental writes)
multipass mount ~/shared-config myvm:/etc/app-config --readonly
```

Note: Read-only mount support depends on the Multipass version. Check with `multipass version`.

## Common Issues and Fixes

### Mount Fails: "sshfs not installed in guest"

Some minimal cloud images may lack sshfs:

```bash
# Install sshfs inside the VM
multipass exec myvm -- sudo apt install -y sshfs

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

### Mount Disappears After VM Restart

Standard `multipass mount` mounts do not persist across VM restarts by default unless you use the `--mount` flag at launch:

```bash
# Persistent approach: always use --mount at launch
multipass launch --name myvm --mount ~/projects:/home/ubuntu/projects

# Or re-mount after each start (script it):
cat > ~/start-dev.sh <<'EOF'
#!/bin/bash
multipass start myvm
multipass mount ~/projects myvm:/home/ubuntu/projects
multipass shell myvm
EOF
chmod +x ~/start-dev.sh
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
  "$HOME/.ssh:/home/ubuntu/.ssh:ro"
  "$HOME/.gitconfig:/home/ubuntu/.gitconfig:ro"
)

# Start if stopped
multipass start "$VM_NAME" 2>/dev/null

# Apply mounts
for mount in "${MOUNTS[@]}"; do
  IFS=: read -r src dst opts <<< "$mount"
  echo "Mounting $src -> $dst"
  if [ "$opts" = "ro" ]; then
    multipass mount "$src" "$VM_NAME:$dst" --readonly
  else
    multipass mount "$src" "$VM_NAME:$dst"
  fi
done

# Open shell
multipass shell "$VM_NAME"
```

Directory mounts in Multipass are one of its most useful features for day-to-day development. The ability to keep files on your host while using the VM for execution gives you the best of both worlds: familiar host tooling and isolated runtime environments.
