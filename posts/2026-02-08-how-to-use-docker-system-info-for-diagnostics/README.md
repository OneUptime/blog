# How to Use docker system info for Diagnostics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Diagnostics, System Information, Troubleshooting, Docker Engine, DevOps

Description: Use docker system info to inspect your Docker installation and diagnose configuration, driver, and resource issues quickly.

---

When something goes wrong with Docker, the first question is always "what environment is this running on?" The `docker system info` command (also available as `docker info`) dumps every detail about your Docker installation in one shot. It covers the server version, storage driver, runtime configuration, available resources, and much more. Knowing how to read and use this output makes troubleshooting faster.

## Running docker system info

The command is straightforward.

```bash
# Full system information
docker system info

# Shorter alias (same output)
docker info
```

The output is long. On a typical installation, expect 60-80 lines of information. Let's break down each section.

## Understanding the Output

### Server Version and Runtime

The top of the output shows the Docker server details.

```bash
# Extract just the version information
docker info --format '{{.ServerVersion}}'
```

```
Server Version: 24.0.7
Storage Driver: overlay2
Logging Driver: json-file
Cgroup Driver: systemd
Cgroup Version: 2
```

Key things to check:
- **Server Version** tells you exactly which Docker release is running. Bug fixes and features vary between versions.
- **Storage Driver** should be `overlay2` on modern systems. If you see `devicemapper` or `aufs`, your system is using an older, less efficient driver.
- **Cgroup Driver** should match your container runtime. Kubernetes environments typically require `systemd`.
- **Cgroup Version** indicates whether you are using v1 or v2 cgroups. Cgroup v2 is the modern standard with better resource isolation.

### Storage Information

```bash
# Check storage driver and details
docker info --format '{{.Driver}}'
docker info --format '{{json .DriverStatus}}' | jq .
```

The storage section reveals how Docker manages image layers and container filesystems.

```
Storage Driver: overlay2
 Backing Filesystem: extfs
 Supports d_type: true
 Using metacopy: false
 Native Overlay Diff: true
 userxattr: false
```

**Backing Filesystem** should be `extfs` (ext4) or `xfs`. These are the supported filesystems for overlay2.

**Supports d_type** must be `true`. Without d_type support, overlay2 can silently corrupt data.

### Resource Availability

```bash
# Check available CPUs and memory
docker info --format 'CPUs: {{.NCPU}}, Memory: {{.MemTotal}}'
```

```
CPUs: 8
Total Memory: 15.63GiB
```

These numbers reflect what Docker can see, which might be less than your total system resources. On Docker Desktop, these are limited by the virtual machine settings. On Linux, they reflect the actual host resources.

### Docker Root Directory

```bash
# Find where Docker stores data
docker info --format '{{.DockerRootDir}}'
```

```
Docker Root Dir: /var/lib/docker
```

This is where all images, containers, volumes, and other Docker data lives. If this partition fills up, Docker stops working. Check its disk usage regularly.

```bash
# Check disk space for the Docker root directory
df -h $(docker info --format '{{.DockerRootDir}}')
```

### Registry Configuration

```bash
# Check configured registries
docker info --format '{{json .RegistryConfig}}' | jq .
```

This shows your configured registries, mirrors, and insecure registries. Useful when debugging image pull failures.

```
Registry: https://index.docker.io/v1/
Insecure Registries:
 127.0.0.0/8
Registry Mirrors:
```

If your organization uses a private registry or a pull-through cache, it will appear here.

### Security Features

```bash
# Check security configuration
docker info --format '{{json .SecurityOptions}}' | jq .
```

```
Security Options:
 apparmor
 seccomp
  Profile: builtin
 cgroupns
```

This tells you which security modules are active. On production systems, you should see `apparmor` or `selinux` plus `seccomp`. Missing security modules might indicate a misconfigured system.

## Formatted Output for Scripting

The `--format` flag accepts Go templates, which makes it easy to extract specific values for scripts and monitoring.

```bash
# Extract individual fields
docker info --format '{{.ServerVersion}}'
docker info --format '{{.NCPU}}'
docker info --format '{{.MemTotal}}'
docker info --format '{{.OperatingSystem}}'
docker info --format '{{.OSType}}'
docker info --format '{{.Architecture}}'
docker info --format '{{.KernelVersion}}'

# Multiple fields in a custom format
docker info --format 'Docker {{.ServerVersion}} on {{.OperatingSystem}} ({{.Architecture}})'
```

For JSON output that you can pipe to other tools:

```bash
# Full output as JSON
docker info --format '{{json .}}' | jq .

# Specific sections as JSON
docker info --format '{{json .Plugins}}' | jq .
docker info --format '{{json .Runtimes}}' | jq .
```

## Diagnostic Checks You Should Run

### Check 1: Storage Driver Health

```bash
# Verify the storage driver is optimal
DRIVER=$(docker info --format '{{.Driver}}')
if [ "$DRIVER" != "overlay2" ]; then
  echo "WARNING: Using $DRIVER instead of overlay2"
fi
```

### Check 2: Disk Space

```bash
# Check available disk space for Docker
ROOT_DIR=$(docker info --format '{{.DockerRootDir}}')
USAGE=$(df "$ROOT_DIR" --output=pcent | tail -1 | tr -d ' %')
echo "Docker storage usage: ${USAGE}%"
if [ "$USAGE" -gt 80 ]; then
  echo "WARNING: Docker storage is above 80% - consider pruning"
fi
```

### Check 3: Container and Image Counts

```bash
# Quick health check
docker info --format 'Containers: {{.Containers}} (Running: {{.ContainersRunning}}, Stopped: {{.ContainersStopped}}, Paused: {{.ContainersPaused}})'
docker info --format 'Images: {{.Images}}'
```

A high number of stopped containers suggests cleanup is needed. Many images might indicate build cache accumulation.

### Check 4: Runtime Warnings

```bash
# Check for warnings in docker info output
docker info 2>&1 | grep -i warning
```

Docker reports warnings at the bottom of `docker info` output for issues like:
- Kernel support for certain features missing
- Swap limit disabled (important for memory limits)
- Bridge networking issues
- Storage driver problems

### Check 5: Live Restore

```bash
# Check if live restore is enabled
docker info --format '{{.LiveRestoreEnabled}}'
```

Live restore allows containers to keep running when the Docker daemon restarts. This is critical for production systems.

## Comparing Environments

When debugging an issue that occurs on one machine but not another, capture `docker info` from both systems and compare.

```bash
# Save docker info to a file for comparison
docker info > docker-info-$(hostname).txt

# Compare two environments
diff docker-info-server1.txt docker-info-server2.txt
```

Key fields to compare:
- Server Version
- Storage Driver and Backing Filesystem
- Kernel Version
- OS Version
- Security Options
- Cgroup Driver and Version
- Available CPUs and Memory

## Docker Desktop vs Docker Engine

The output differs between Docker Desktop (Mac/Windows) and Docker Engine (Linux).

Docker Desktop shows:

```bash
# Docker Desktop specific info
docker info --format '{{.OperatingSystem}}'
# Output: Docker Desktop

docker info --format '{{.OSType}}'
# Output: linux (even on Mac/Windows, because containers run in a Linux VM)
```

Docker Engine on Linux shows:

```bash
docker info --format '{{.OperatingSystem}}'
# Output: Ubuntu 22.04.3 LTS (or your actual Linux distro)
```

On Docker Desktop, resource limits (CPU, memory) are constrained by the VM settings, not the host system. If you see fewer resources than expected, check Docker Desktop preferences.

## Swarm Mode Information

If Docker Swarm is active, `docker info` includes swarm-specific details.

```bash
# Check Swarm status
docker info --format '{{.Swarm.LocalNodeState}}'
# Output: active (if Swarm mode is enabled) or inactive

# Get Swarm details
docker info --format '{{json .Swarm}}' | jq .
```

This shows the node state, manager status, number of nodes, and Raft configuration.

## Building a Diagnostic Script

Combine these checks into a comprehensive diagnostic script.

```bash
#!/bin/bash
# docker-diagnostics.sh - Quick Docker health check

echo "=== Docker Diagnostics ==="
echo ""

# Version
echo "Docker Version: $(docker info --format '{{.ServerVersion}}')"
echo "OS: $(docker info --format '{{.OperatingSystem}}')"
echo "Kernel: $(docker info --format '{{.KernelVersion}}')"
echo "Architecture: $(docker info --format '{{.Architecture}}')"
echo ""

# Resources
echo "CPUs: $(docker info --format '{{.NCPU}}')"
echo "Memory: $(docker info --format '{{.MemTotal}}')"
echo ""

# Storage
echo "Storage Driver: $(docker info --format '{{.Driver}}')"
ROOT=$(docker info --format '{{.DockerRootDir}}')
echo "Root Dir: $ROOT"
echo "Disk Usage: $(df -h "$ROOT" --output=used,avail,pcent | tail -1)"
echo ""

# Containers and Images
docker info --format 'Containers: {{.Containers}} (Running: {{.ContainersRunning}}, Stopped: {{.ContainersStopped}})'
docker info --format 'Images: {{.Images}}'
echo ""

# Warnings
WARNINGS=$(docker info 2>&1 | grep -i warning)
if [ -n "$WARNINGS" ]; then
  echo "WARNINGS:"
  echo "$WARNINGS"
else
  echo "No warnings detected"
fi
```

```bash
# Run the diagnostic script
chmod +x docker-diagnostics.sh
./docker-diagnostics.sh
```

The `docker system info` command is the starting point for any Docker troubleshooting session. It tells you exactly what you are working with, what might be misconfigured, and where to look for problems. Run it first, read it carefully, and let the data guide your debugging.
