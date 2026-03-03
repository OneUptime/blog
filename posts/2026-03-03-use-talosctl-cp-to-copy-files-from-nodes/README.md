# How to Use talosctl cp to Copy Files from Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, File Management, Debugging, Node Administration

Description: Learn how to use the talosctl cp command to copy files and directories from Talos Linux nodes for debugging and analysis

---

Talos Linux is an immutable operating system with no SSH access, which means you cannot simply SCP files off a node like you would with a traditional Linux server. The `talosctl cp` command fills this gap by letting you copy files from nodes through the Talos API. This is especially useful for debugging, collecting logs, and extracting diagnostic information.

## Understanding File Access in Talos Linux

Since Talos Linux is designed to be minimal and secure, the filesystem is quite different from what you might expect on Ubuntu or CentOS. Most of the operating system is read-only, and there is no package manager to install additional tools. The files you can access through `talosctl cp` include system logs, configuration files, kernel data from /proc and /sys, and any files created by Talos services.

The `talosctl cp` command connects to the Talos API, reads the specified file from the node's filesystem, and transfers it to your local machine. It works for both individual files and directories.

## Basic Usage

To copy a file from a node to your local machine:

```bash
# Copy a file from a node
talosctl cp --nodes 192.168.1.10 /var/log/audit/audit.log ./audit.log
```

The general syntax is:

```bash
talosctl cp --nodes <node-address> <remote-path> <local-path>
```

## Copying Common System Files

Here are some files you might frequently want to copy from Talos Linux nodes:

### Machine Configuration

```bash
# Copy the current machine configuration
talosctl cp --nodes 192.168.1.10 /system/state/config.yaml ./node-config.yaml
```

Note that you can also retrieve the machine configuration using `talosctl get machineconfig`, which is often more convenient. But `talosctl cp` gives you the raw file.

### Kernel Messages

```bash
# Copy kernel log messages
talosctl cp --nodes 192.168.1.10 /proc/kmsg ./kmsg.log
```

### System Information

```bash
# Copy CPU information
talosctl cp --nodes 192.168.1.10 /proc/cpuinfo ./cpuinfo.txt

# Copy memory information
talosctl cp --nodes 192.168.1.10 /proc/meminfo ./meminfo.txt

# Copy disk partition table
talosctl cp --nodes 192.168.1.10 /proc/partitions ./partitions.txt
```

### Network Configuration

```bash
# Copy network interface information
talosctl cp --nodes 192.168.1.10 /proc/net/dev ./netdev.txt

# Copy routing table
talosctl cp --nodes 192.168.1.10 /proc/net/route ./routes.txt

# Copy the resolv.conf
talosctl cp --nodes 192.168.1.10 /etc/resolv.conf ./resolv.conf
```

## Copying Directories

You can copy entire directories from a node. The content is transferred as a tar archive:

```bash
# Copy a directory from the node
talosctl cp --nodes 192.168.1.10 /var/log/ ./node-logs/
```

When copying directories, `talosctl cp` creates a tar archive of the directory contents. You may need to extract it depending on how the copy behaves:

```bash
# Copy the log directory and extract it
talosctl cp --nodes 192.168.1.10 /var/log/ - | tar xf - -C ./node-logs/
```

## Debugging Use Cases

### Collecting Diagnostic Data

When troubleshooting a node issue, you often need to collect multiple pieces of information:

```bash
#!/bin/bash
# collect-diagnostics.sh - Gather diagnostic data from a Talos node

NODE="192.168.1.10"
OUTPUT_DIR="./diagnostics-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "Collecting diagnostics from $NODE..."

# System information
talosctl cp --nodes "$NODE" /proc/cpuinfo "$OUTPUT_DIR/cpuinfo.txt"
talosctl cp --nodes "$NODE" /proc/meminfo "$OUTPUT_DIR/meminfo.txt"
talosctl cp --nodes "$NODE" /proc/loadavg "$OUTPUT_DIR/loadavg.txt"
talosctl cp --nodes "$NODE" /proc/uptime "$OUTPUT_DIR/uptime.txt"

# Network state
talosctl cp --nodes "$NODE" /proc/net/dev "$OUTPUT_DIR/netdev.txt"
talosctl cp --nodes "$NODE" /proc/net/tcp "$OUTPUT_DIR/tcp-connections.txt"
talosctl cp --nodes "$NODE" /proc/net/udp "$OUTPUT_DIR/udp-connections.txt"

# Disk and filesystem info
talosctl cp --nodes "$NODE" /proc/mounts "$OUTPUT_DIR/mounts.txt"
talosctl cp --nodes "$NODE" /proc/diskstats "$OUTPUT_DIR/diskstats.txt"

# Process info
talosctl cp --nodes "$NODE" /proc/stat "$OUTPUT_DIR/stat.txt"

# Also collect service logs
talosctl logs machined --nodes "$NODE" > "$OUTPUT_DIR/machined.log" 2>&1
talosctl logs kubelet --nodes "$NODE" > "$OUTPUT_DIR/kubelet.log" 2>&1
talosctl logs etcd --nodes "$NODE" > "$OUTPUT_DIR/etcd.log" 2>&1

echo "Diagnostics collected in $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
```

### Extracting Kubelet Configuration

```bash
# Copy kubelet configuration files
talosctl cp --nodes 192.168.1.10 /etc/kubernetes/kubelet.conf ./kubelet.conf

# Copy kubelet bootstrap config
talosctl cp --nodes 192.168.1.10 /etc/kubernetes/bootstrap-kubelet.conf ./bootstrap-kubelet.conf
```

### Checking Certificate Files

```bash
# Copy Kubernetes PKI certificates for inspection
talosctl cp --nodes 192.168.1.10 /etc/kubernetes/pki/ ./pki/

# Check certificate expiration dates
for cert in ./pki/*.crt; do
  echo "=== $cert ==="
  openssl x509 -in "$cert" -noout -dates 2>/dev/null
done
```

## Copying Files from Multiple Nodes

When you need the same file from several nodes for comparison:

```bash
#!/bin/bash
# compare-configs.sh - Collect the same file from multiple nodes

NODES="192.168.1.10 192.168.1.11 192.168.1.12"
FILE="/proc/meminfo"

for node in $NODES; do
  echo "Copying from $node..."
  talosctl cp --nodes "$node" "$FILE" "./meminfo-${node}.txt"
done

# Compare the files
echo "=== Memory comparison ==="
for node in $NODES; do
  total=$(grep MemTotal "./meminfo-${node}.txt" | awk '{print $2}')
  free=$(grep MemFree "./meminfo-${node}.txt" | awk '{print $2}')
  echo "$node - Total: ${total}kB, Free: ${free}kB"
done
```

## Working with Piped Output

You can pipe the output of `talosctl cp` to other commands for on-the-fly processing:

```bash
# Copy and immediately search through a file
talosctl cp --nodes 192.168.1.10 /proc/mounts - | grep ext4

# Copy and count lines
talosctl cp --nodes 192.168.1.10 /proc/net/tcp - | wc -l

# Copy and analyze network connections
talosctl cp --nodes 192.168.1.10 /proc/net/tcp - | awk '{print $4}' | sort | uniq -c | sort -rn
```

Using `-` as the local path sends the file content to stdout, which you can then pipe into any tool.

## Limitations

There are some important limitations to keep in mind:

- You cannot copy files to a node using `talosctl cp`. It only works in one direction, from node to local machine.
- Some files in /proc and /sys are virtual files that may not copy the same way as regular files.
- Large files will take time to transfer, depending on your network bandwidth.
- Some system directories may not be accessible due to Talos Linux's security model.

If you need to transfer data to a node, you generally do that through the machine configuration or through Kubernetes volumes.

## Alternatives to talosctl cp

For some use cases, other talosctl commands might be more appropriate:

```bash
# For reading log files, use talosctl logs
talosctl logs kubelet --nodes 192.168.1.10

# For reading machine config, use talosctl get
talosctl get machineconfig --nodes 192.168.1.10 -o yaml

# For system resources, use dedicated commands
talosctl memory --nodes 192.168.1.10
talosctl mounts --nodes 192.168.1.10
talosctl disks --nodes 192.168.1.10
```

Use `talosctl cp` when you need the raw file content or when no dedicated command exists for the information you need.

## Best Practices

- Use `talosctl cp` for debugging and diagnostics, not for routine operations.
- Prefer dedicated talosctl commands (like `talosctl logs`, `talosctl memory`) when they exist for your use case.
- Create reusable diagnostic collection scripts to speed up troubleshooting.
- When collecting diagnostics, timestamp your output directories for easy reference.
- Be cautious about copying large files over slow networks.
- Use piped output with `-` for quick one-off inspections.
- Remember that `talosctl cp` is read-only - you cannot push files to nodes with this command.

The `talosctl cp` command bridges the gap between Talos Linux's secure, SSH-free design and the practical need to inspect files on your nodes. It is an essential tool in your debugging toolkit.
