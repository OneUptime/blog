# How to Troubleshoot Checkpoint/Restore Failures in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, CRIU, Container, Troubleshooting, DevOps

Description: A comprehensive troubleshooting guide for diagnosing and fixing common checkpoint and restore failures in Podman, covering CRIU errors, kernel issues, permission problems, and network conflicts.

---

> When container checkpoint or restore operations fail, the error messages can be cryptic. This guide maps common failure modes to their root causes and provides step-by-step solutions for getting checkpoint/restore working reliably.

Podman checkpoint/restore involves multiple components: Podman itself, the container runtime (runc or crun), CRIU, and the Linux kernel. Failures can originate in any layer. Understanding where the error comes from is the first step to fixing it.

---

## Diagnostic Approach

When a checkpoint or restore fails, follow this diagnostic sequence:

1. Get the full error message with debug logging
2. Identify which component produced the error
3. Check prerequisites (CRIU version, kernel support, permissions)
4. Address the specific error

Always start by running the failed command with debug output:

```bash
sudo podman --log-level=debug container checkpoint my-container 2>&1 | tee /tmp/checkpoint-debug.log
```

Or for restore failures:

```bash
sudo podman --log-level=debug container restore my-container 2>&1 | tee /tmp/restore-debug.log
```

The debug output shows the exact CRIU command being executed and its output.

## CRIU Not Found

**Error message:**

```text
Error: checkpointing container: CRIU binary not found
```

**Cause**: CRIU is not installed or not in the PATH.

**Solution**:

```bash
# Check if CRIU is installed

which criu

# Install it
# Fedora/RHEL
sudo dnf install criu

# Ubuntu/Debian
sudo apt install criu

# Verify
criu --version
```

If CRIU is installed but in a non-standard location:

```bash
# Find it
sudo find / -name "criu" -type f 2>/dev/null

# Create a symlink or add to PATH
sudo ln -s /path/to/criu /usr/sbin/criu
```

## CRIU Version Too Old

**Error message:**

```text
Error: checkpointing container: CRIU too old: requires at least version 31100
```

**Cause**: Podman requires a minimum CRIU version. The version number is encoded as major * 10000 + minor * 100 + patch. Version 31100 means 3.11.0. Some features require newer CRIU versions; for example, restoring a container into a pod requires CRIU 3.16 or later.

**Solution**:

```bash
# Check current version
criu --version

# Upgrade on Fedora/RHEL
sudo dnf update criu

# On Ubuntu, you may need to build from source for a newer version
git clone https://github.com/checkpoint-restore/criu.git
cd criu
git checkout v4.2  # or another current stable release
make
sudo make install
```

## Kernel Feature Missing

**Error message:**

```text
Error (criu/cr-check.c:XXX): CONFIG_CHECKPOINT_RESTORE is not set
```

or

```text
Looks like the kernel does not support checkpoint/restore
```

**Cause**: Your kernel was not compiled with checkpoint/restore support.

**Solution**:

```bash
# Check kernel config
grep CONFIG_CHECKPOINT_RESTORE /boot/config-$(uname -r)
```

If it shows `CONFIG_CHECKPOINT_RESTORE is not set`, you need a different kernel:

```bash
# On Ubuntu, the generic kernel usually has it enabled
sudo apt install linux-image-generic

# On Fedora/RHEL, the default kernel includes it
sudo dnf install kernel
```

Run the full CRIU check to find all missing features:

```bash
sudo criu check --all 2>&1 | grep -i error
```

## Permission Denied

**Error message:**

```text
Error: checkpointing container: not supported for rootless containers
```

or

```text
Error: checkpointing container: permission denied
```

**Cause**: Podman checkpoint/restore currently works with root containers. CRIU needs to access `/proc` entries and manipulate kernel state that is restricted unless the process has the required capabilities.

**Solution**:

```bash
# Use sudo
sudo podman container checkpoint my-container

# Or switch to root
su -
podman container checkpoint my-container
```

Rootless Podman does not support checkpoint/restore in most configurations. CRIU has limited non-root support when granted capabilities such as `CAP_CHECKPOINT_RESTORE`, but Podman's documented checkpoint workflow is for root containers.

## SELinux Denials

**Error message:**

```text
Error: checkpointing container: CRIU: avc: denied { checkpoint_restore }
```

or the checkpoint fails silently but `ausearch` shows AVC denials.

**Cause**: SELinux is blocking CRIU operations.

**Solution**:

```bash
# Check for recent SELinux denials
sudo ausearch -m avc -ts recent | grep -E "criu|checkpoint"

# Generate and install a policy module
sudo ausearch -m avc -ts recent | audit2allow -M podman-criu
sudo semodule -i podman-criu.pp

# Verify the module is loaded
sudo semodule -l | grep podman-criu

# Alternatively, temporarily set permissive mode for testing
sudo setenforce 0
# After testing, set back to enforcing
sudo setenforce 1
```

## Container Not Running

**Error message:**

```text
Error: container is not running
```

**Cause**: You can only checkpoint a running container. The container may have crashed, exited, or been stopped.

**Solution**:

```bash
# Check container status
sudo podman ps -a --filter name=my-container

# If it exited, check why
sudo podman logs my-container

# Start it if needed
sudo podman start my-container

# Then checkpoint
sudo podman container checkpoint my-container
```

## Established TCP Connection Blocking Checkpoint

**Error message:**

```text
Error: checkpointing container: CRIU: TCP socket in established state found
```

**Cause**: The container has active TCP connections and you did not use the `--tcp-established` flag.

**Solution**:

```bash
# Option 1: Include TCP connections in the checkpoint
sudo podman container checkpoint my-container --tcp-established

# Option 2: Close TCP connections before checkpointing
# (application-specific - may require draining connections)
```

## Restore Fails with "Container Already Exists"

**Error message:**

```text
Error: container name already in use
```

**Cause**: A container with the same name already exists on this host.

**Solution**:

```bash
# Check existing containers
sudo podman ps -a --filter name=my-container

# Remove the old container
sudo podman rm my-container

# Or restore with a different name
sudo podman container restore --import=/tmp/checkpoint.tar.gz --name=my-container-restored
```

## Restore Fails with Missing Image

**Error message:**

```text
Error: container image not known
```

or

```text
Error: image not found
```

**Cause**: The container's base image is not available on the restore host.

**Solution**:

```bash
# Find which image is needed (examine the checkpoint archive)
tar xzf /tmp/checkpoint.tar.gz config.dump -O | python3 -m json.tool | grep -i image

# Pull the image
sudo podman pull docker.io/library/nginx:alpine

# Retry the restore
sudo podman container restore --import=/tmp/checkpoint.tar.gz
```

## Restore Fails with Port Conflict

**Error message:**

```text
Error: bind: address already in use
```

or

```text
Error: address already in use
```

**Cause**: The port the container was using is already occupied on the restore host.

**Solution**:

```bash
# Find what is using the port
sudo ss -tlnp | grep ":80"

# Stop the conflicting service
sudo systemctl stop nginx  # or whatever is using the port

# Or stop the conflicting container
sudo podman ps | grep "0.0.0.0:80"
sudo podman stop conflicting-container

# Retry the restore
sudo podman container restore --import=/tmp/checkpoint.tar.gz
```

## CRIU Memory Dump Fails

**Error message:**

```text
Error: checkpointing container: CRIU: dumping failed
```

with debug output showing:

```text
Error (criu/cr-dump.c:XXX): Can't dump pages
```

**Cause**: CRIU cannot read the container's memory pages. This can happen with certain memory-mapped files, huge pages, or when the container uses memory features that CRIU does not support.

**Solution**:

```bash
# Check if the container uses huge pages
sudo podman inspect my-container | grep -i huge

# Check memory usage
sudo podman stats --no-stream my-container

# Try checkpointing with verbose CRIU output
sudo podman --log-level=trace container checkpoint my-container 2>&1 | grep -i "page\|memory\|dump"
```

If the container uses huge pages, you may need to configure CRIU's huge page support or disable huge pages for the container.

## Cross-Architecture Restore Failure

**Error message:**

```text
Error: restoring container: CRIU: architecture mismatch
```

**Cause**: The checkpoint was created on a different CPU architecture than the restore host.

**Solution**: Checkpoint/restore only works between hosts with the same CPU architecture. An x86_64 checkpoint cannot be restored on aarch64 and vice versa.

```bash
# Check architecture on both hosts
uname -m

# Source and target must match
```

## File System Issues During Restore

**Error message:**

```text
Error: restoring container: mount point does not exist
```

or

```text
Error: restoring container: volume not found
```

**Cause**: The container had volumes or bind mounts that are not available on the restore host.

**Solution**:

```bash
# Check what mounts the container needs
sudo podman inspect my-container --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'

# For checkpoints from imports
tar xzf /tmp/checkpoint.tar.gz spec.dump -O | python3 -m json.tool | grep -A5 "mounts"

# Create the required directories
sudo mkdir -p /path/to/expected/volume

# Create the required Podman volumes
sudo podman volume create required-volume-name
```

## Collecting Diagnostic Information

When reporting a bug or asking for help, collect this diagnostic information:

```bash
#!/bin/bash
echo "=== System Info ==="
uname -a
cat /etc/os-release

echo "=== Podman Version ==="
podman --version
podman info | head -20

echo "=== CRIU Version ==="
criu --version

echo "=== CRIU Check ==="
sudo criu check --all 2>&1

echo "=== Container Runtime ==="
sudo podman info | grep -i runtime

echo "=== Kernel Config ==="
grep -E "CONFIG_CHECKPOINT_RESTORE|CONFIG_NAMESPACES" /boot/config-$(uname -r) 2>/dev/null

echo "=== SELinux Status ==="
getenforce 2>/dev/null || echo "SELinux not available"

echo "=== Container Info ==="
sudo podman inspect my-container 2>/dev/null | head -50
```

Save the output along with the debug log from the failed operation when seeking help.

## Quick Reference: Error to Solution Map

| Error | Likely Cause | Quick Fix |
|-------|-------------|-----------|
| CRIU binary not found | CRIU not installed | `dnf install criu` |
| CRIU too old | Version mismatch | Upgrade CRIU |
| Not supported for rootless | Missing root privileges | Use `sudo` |
| Container not running | Container stopped/exited | `podman start` first |
| TCP socket established | Active connections | Add `--tcp-established` |
| Container name in use | Name conflict | Use `--name=new-name` |
| Image not known | Missing base image | `podman pull image` |
| Address already in use | Port conflict | Stop conflicting service |
| Architecture mismatch | Cross-arch restore | Use matching architecture |
| Mount point missing | Volume not available | Create volume/directory |

## Conclusion

Troubleshooting checkpoint/restore failures in Podman starts with enabling debug logging to identify which component is failing. Most issues fall into a few categories: missing or outdated CRIU, insufficient permissions, kernel feature gaps, network conflicts, or missing resources on the restore host. The `sudo criu check --all` command validates the CRIU and kernel prerequisites. For SELinux systems, generating custom policy modules resolves permission denials. When in doubt, collect the full diagnostic information and compare the source and target host configurations to find the mismatch.
