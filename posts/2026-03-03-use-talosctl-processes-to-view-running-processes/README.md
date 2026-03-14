# How to Use talosctl processes to View Running Processes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Process Management, Debugging, System Administration

Description: Learn how to use the talosctl processes command to view and analyze running processes on Talos Linux nodes for debugging

---

Being able to see what processes are running on a node is fundamental for troubleshooting and performance analysis. On traditional Linux servers, you would use `ps`, `top`, or `htop` over SSH. On Talos Linux, where there is no SSH access and no shell, the `talosctl processes` command provides this visibility through the Talos API.

## Basic Usage

To see all running processes on a node:

```bash
# List all processes on a node
talosctl processes --nodes 192.168.1.10
```

The output resembles a standard `ps` listing, showing process IDs, CPU usage, memory usage, command names, and other relevant information:

```text
PID     STATE    THREADS   CPU-TIME    VIRT-MEM    RES-MEM     COMMAND
1       S        1         0:05.23     4096        1024        /sbin/init
234     S        12        2:15.67     524288      65536       /usr/local/bin/machined
345     S        8         1:45.12     262144      32768       /usr/local/bin/containerd
```

## Understanding the Output

Each column in the process listing provides important information:

- **PID**: The process ID, a unique identifier for each running process.
- **STATE**: The process state (R for running, S for sleeping, D for disk wait, Z for zombie).
- **THREADS**: The number of threads the process is using.
- **CPU-TIME**: How much CPU time the process has consumed since it started.
- **VIRT-MEM**: Virtual memory allocated to the process (not all of it may be in physical RAM).
- **RES-MEM**: Resident memory, which is the actual physical RAM being used.
- **COMMAND**: The command or binary that started the process.

## Identifying Key Processes

On a Talos Linux node, you will see several important system processes:

```bash
# View all processes
talosctl processes --nodes 192.168.1.10
```

Key processes to look for include:

- **machined**: The main Talos daemon that manages the node
- **containerd**: The container runtime
- **kubelet**: The Kubernetes node agent
- **etcd**: The distributed key-value store (control plane nodes only)
- **apid**: The Talos API daemon
- **trustd**: The certificate trust daemon
- **kube-apiserver**: The Kubernetes API server (control plane only)
- **kube-controller-manager**: Manages Kubernetes controllers (control plane only)
- **kube-scheduler**: Schedules pods (control plane only)

## Finding Resource-Hungry Processes

When a node is slow or unresponsive, check for processes consuming excessive resources:

```bash
# List processes - look for high CPU-TIME or RES-MEM values
talosctl processes --nodes 192.168.1.20
```

To identify the top consumers, you can pipe the output through standard tools:

```bash
# Sort processes by resident memory (adjust column numbers based on output)
talosctl processes --nodes 192.168.1.20 | sort -k6 -rn | head -20

# Sort by CPU time
talosctl processes --nodes 192.168.1.20 | sort -k4 -rn | head -20
```

## Checking Processes Across Multiple Nodes

To compare process lists across nodes:

```bash
# Check processes on all control plane nodes
talosctl processes --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Check processes on all worker nodes
talosctl processes --nodes 192.168.1.20,192.168.1.21,192.168.1.22
```

When comparing, pay attention to any unexpected differences. All control plane nodes should have similar sets of processes. All worker nodes should also look alike.

## Debugging with Process Information

### Finding Zombie Processes

Zombie processes can indicate a problem with process management:

```bash
# Look for zombie processes (state Z)
talosctl processes --nodes 192.168.1.20 | grep " Z "
```

Zombie processes are child processes that have completed but whose parent has not yet read their exit status. A few zombies are normal, but many zombies suggest a parent process is not properly handling child process exits.

### Checking for Process Crashes

If a service keeps restarting, you might see a low PID uptime or recent start time:

```bash
# Check processes and correlate with service status
talosctl processes --nodes 192.168.1.20
talosctl services --nodes 192.168.1.20
```

If a process has a very low CPU-TIME compared to other similar processes, it might have recently restarted.

### Identifying Runaway Processes

A runaway process is one that consumes CPU or memory without stopping:

```bash
# Check processes twice with a gap to see which ones are growing
talosctl processes --nodes 192.168.1.20 > /tmp/procs1.txt
sleep 60
talosctl processes --nodes 192.168.1.20 > /tmp/procs2.txt

# Compare the two snapshots
diff /tmp/procs1.txt /tmp/procs2.txt
```

Processes with rapidly increasing CPU-TIME or RES-MEM are worth investigating.

## Building a Process Monitoring Script

Here is a script that regularly checks processes and alerts on anomalies:

```bash
#!/bin/bash
# process-monitor.sh - Monitor processes for anomalies

NODE=$1
MAX_PROCESS_MEM_MB=4096  # Alert if any process uses more than 4GB

if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-address>"
  exit 1
fi

echo "Process check for node $NODE at $(date)"
echo "==========================================="

# Get process listing
PROCESSES=$(talosctl processes --nodes "$NODE" 2>&1)

echo "$PROCESSES"
echo ""

# Count total processes
TOTAL=$(echo "$PROCESSES" | tail -n +2 | wc -l)
echo "Total processes: $TOTAL"

# Check for zombie processes
ZOMBIES=$(echo "$PROCESSES" | grep " Z " | wc -l)
if [ "$ZOMBIES" -gt 5 ]; then
  echo "WARNING: $ZOMBIES zombie processes detected"
fi

# Check for high-memory processes
echo ""
echo "Top 5 processes by memory:"
echo "$PROCESSES" | tail -n +2 | sort -k6 -rn | head -5
```

## Processes vs. Containers

It is important to understand the relationship between processes and containers on Talos Linux:

```bash
# Process-level view shows all processes, including containerd shims
talosctl processes --nodes 192.168.1.20

# Container-level view shows logical container groupings
talosctl containers --nodes 192.168.1.20 -k
```

Each Kubernetes container has at least one process (the main application process) and a containerd shim process that manages it. When you see many `containerd-shim-runc-v2` processes, each one corresponds to a running container.

## Analyzing Process Threads

Processes with many threads can be heavy consumers of system resources:

```bash
# Look for processes with high thread counts
talosctl processes --nodes 192.168.1.20 | sort -k3 -rn | head -10
```

The Kubernetes API server and etcd typically have high thread counts. If you see an application container with unexpectedly many threads, it might indicate a thread leak.

## Process Information During Upgrades

During node upgrades, watching processes can help you track the upgrade progress:

```bash
# Before upgrade - record baseline
talosctl processes --nodes 192.168.1.20 > /tmp/pre-upgrade-processes.txt

# After upgrade - compare
talosctl processes --nodes 192.168.1.20 > /tmp/post-upgrade-processes.txt

# Check that expected processes are running after upgrade
diff /tmp/pre-upgrade-processes.txt /tmp/post-upgrade-processes.txt
```

## Understanding System Process Overhead

Talos Linux is designed to be minimal, so the system process overhead is low. On a typical node, the system processes (excluding Kubernetes workloads) consume:

- **machined**: Around 50-100MB of RAM
- **containerd**: Around 50-100MB of RAM
- **kubelet**: Around 100-200MB of RAM, growing with the number of pods
- **etcd**: Around 200MB to several GB, depending on the cluster size
- **kube-apiserver**: Around 200-500MB, growing with API load

```bash
# Check system process overhead
talosctl processes --nodes 192.168.1.10 | grep -E "machined|containerd|kubelet|etcd|apiserver"
```

Understanding this baseline helps you accurately plan node sizing for your workloads.

## Using Process Data for Capacity Planning

Process data over time helps with capacity planning:

```bash
#!/bin/bash
# capacity-data.sh - Collect process data for capacity planning

NODES="192.168.1.10 192.168.1.20 192.168.1.21"
DATE=$(date +%Y%m%d-%H%M%S)

for node in $NODES; do
  OUTPUT_FILE="./capacity-data/${node}-${DATE}.txt"
  mkdir -p ./capacity-data

  echo "=== Node: $node ===" > "$OUTPUT_FILE"
  echo "=== Memory ===" >> "$OUTPUT_FILE"
  talosctl memory --nodes "$node" >> "$OUTPUT_FILE" 2>&1

  echo "=== Processes ===" >> "$OUTPUT_FILE"
  talosctl processes --nodes "$node" >> "$OUTPUT_FILE" 2>&1

  echo "=== Containers ===" >> "$OUTPUT_FILE"
  talosctl containers --nodes "$node" -k >> "$OUTPUT_FILE" 2>&1
done
```

## Best Practices

- Check processes regularly as part of your monitoring routine.
- Learn what a "normal" process list looks like for your nodes so you can quickly spot anomalies.
- Use process data in combination with memory, container, and service commands for comprehensive troubleshooting.
- Monitor for zombie processes and address them before they accumulate.
- Track process resource consumption over time to detect memory leaks and CPU-intensive loops.
- Compare process lists between similar nodes to identify inconsistencies.
- Document the expected system process overhead so you can accurately plan capacity for workloads.

The `talosctl processes` command gives you the low-level visibility you need to understand exactly what is happening on your Talos Linux nodes. It bridges the gap between the high-level Kubernetes view and the actual system-level reality.
