# How to View Podman System Information with podman info

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, System Administration, Monitoring

Description: Learn how to use the podman info command to display detailed system information about your Podman installation, including host details, storage configuration, and registry settings.

---

> Understanding your Podman environment starts with knowing how to inspect the system configuration that underpins every container you run.

When managing containers with Podman, having visibility into your system configuration is essential. The `podman info` command provides a comprehensive overview of your Podman installation, covering host details, storage drivers, registry configurations, and runtime settings. Whether you are debugging container issues or auditing your environment, this command is your starting point.

---

## Running podman info

The most straightforward way to view system information is to run the command without any flags.

```bash
# Display full Podman system information in YAML format (default)

podman info
```

This outputs a detailed YAML document with top-level sections such as host, plugins, registries, store, and version. The output can be extensive, so understanding each section is key.

## Understanding the Host Section

The host section provides details about the machine running Podman.

```bash
# View the start of the host section using grep to filter output
podman info | grep -A 50 "^host:"
```

Key fields in the host section include:

- **arch**: The CPU architecture (e.g., amd64, arm64)
- **buildahVersion**: The version of Buildah used internally
- **cgroupManager**: Whether cgroups are managed by systemd or cgroupfs
- **conmon**: The path and version of the container monitor
- **cpus**: Number of available CPU cores
- **kernel**: The Linux kernel version
- **memTotal**: Total system memory in bytes
- **os**: The operating system type
- **rootless**: Whether Podman is running in rootless mode

```bash
# Check if Podman is running in rootless mode
podman info --format '{{.Host.Security.Rootless}}'
```

## Inspecting Storage Configuration

The store section reveals how Podman manages container and image storage.

```bash
# Display storage driver information
podman info --format '{{.Store.GraphDriverName}}'

# Show the graph root directory where images and containers are stored
podman info --format '{{.Store.GraphRoot}}'

# Display the run root directory for runtime data
podman info --format '{{.Store.RunRoot}}'
```

Understanding your storage driver is important for performance tuning. Common drivers include `overlay`, `vfs`, and `btrfs`.

```bash
# Show the number of images currently stored
podman info --format '{{.Store.ImageStore.Number}}'

# Show the number of containers
podman info --format '{{.Store.ContainerStore.Number}}'
```

## Viewing Registry Configuration

The registries section shows which container registries Podman is configured to use.

```bash
# Display configured registries for searching images
podman info --format '{{index .Registries "search"}}'
```

This is useful for verifying that your organization's private registry is properly configured.

## Formatting Output as JSON

For scripting and automation, JSON output is often more convenient than YAML.

```bash
# Output system info as JSON
podman info --format json

# Pipe JSON output to jq for specific fields
podman info --format json | jq '.host.hostname'

# Extract multiple fields with jq
podman info --format json | jq '{
  hostname: .host.hostname,
  os: .host.os,
  arch: .host.arch,
  cpus: .host.cpus,
  memTotal: .host.memTotal,
  storageDriver: .store.graphDriverName
}'
```

## Using Go Template Formatting

Podman supports Go templates for precise output formatting.

```bash
# Display host OS and architecture on one line
podman info --format 'OS: {{.Host.OS}} | Arch: {{.Host.Arch}}'

# Show kernel version
podman info --format 'Kernel: {{.Host.Kernel}}'

# Display conmon version and path
podman info --format 'Conmon: {{.Host.Conmon.Path}} (v{{.Host.Conmon.Version}})'

# Show cgroup manager and version
podman info --format 'CGroup Manager: {{.Host.CgroupManager}} | CGroup Version: {{.Host.CgroupsVersion}}'
```

## Debugging with podman info

When troubleshooting container issues, the info command helps verify your environment.

```bash
# Check OCI runtime being used (crun or runc)
podman info --format '{{.Host.OCIRuntime.Name}} {{.Host.OCIRuntime.Version}}'

# Verify security options like SELinux, AppArmor, or seccomp
podman info --format '{{.Host.Security.SELinuxEnabled}}'

# Check available storage space for Podman
podman info --format 'Graph Root: {{.Store.GraphRoot}}'
df -h $(podman info --format '{{.Store.GraphRoot}}')
```

## Writing a System Health Check Script

Combine podman info with shell scripting for automated health checks.

```bash
#!/bin/bash
# podman-health-check.sh - Quick health check for Podman environment

echo "=== Podman System Health Check ==="

# Check Podman version
echo "Podman Version: $(podman info --format '{{.Version.Version}}')"

# Check rootless status
echo "Rootless Mode: $(podman info --format '{{.Host.Security.Rootless}}')"

# Check storage driver
echo "Storage Driver: $(podman info --format '{{.Store.GraphDriverName}}')"

# Check image and container counts
echo "Images Stored: $(podman info --format '{{.Store.ImageStore.Number}}')"
echo "Containers: $(podman info --format '{{.Store.ContainerStore.Number}}')"

# Check available disk space on graph root
GRAPH_ROOT=$(podman info --format '{{.Store.GraphRoot}}')
echo "Graph Root: ${GRAPH_ROOT}"
echo "Disk Usage:"
df -h "${GRAPH_ROOT}" | tail -1

echo "=== Health Check Complete ==="
```

## Summary

The `podman info` command is a powerful diagnostic tool that reveals everything about your Podman environment in a single invocation. By combining it with format flags, Go templates, and tools like jq, you can extract exactly the information you need for monitoring, debugging, and automation. Make it a habit to check `podman info` whenever you set up a new environment or encounter unexpected container behavior.
