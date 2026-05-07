# How to Profile Podman Container Resource Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Profiling, Container, Performance, CPU, Memory, DevOps, Linux, Cgroups

Description: Learn how to profile CPU, memory, network, and disk resource usage of Podman containers using cgroups, system tools, and container-native profiling techniques.

---

> Profiling tells you exactly where your container resources are going. Without profiling, performance tuning is guesswork. With it, you can pinpoint the exact process, syscall, or memory allocation causing your bottleneck.

Monitoring tells you that a container is using 80% CPU. Profiling tells you why. It reveals which processes inside the container are consuming resources, how the kernel is scheduling them, and where the I/O bottlenecks live. Podman containers run as standard Linux processes within cgroups, so you can use all the Linux profiling tools you already know. This guide shows you how to use these tools effectively with Podman containers.

---

## Profile CPU Usage

Start by identifying which containers are CPU-heavy, then drill into the specific processes:

```bash
# Get CPU usage per container

podman stats --no-stream --format \
  "table {{.Name}}\t{{.CPUPerc}}\t{{.CPU}}"

# Find the container's PID on the host
podman inspect --format '{{.State.Pid}}' my-container

# Profile the container processes with top
podman top my-container -eo pid,pcpu,pmem,comm,args

# Use ps to see all processes in the container
podman top my-container aux
```

For deeper CPU profiling, use `perf` on the container's cgroup:

```bash
# Get the container's cgroup path
CONTAINER_ID=$(podman inspect --format '{{.Id}}' my-container)
CGROUP_PATH=$(podman inspect --format '{{.State.CgroupPath}}' my-container)

# Profile CPU with perf (requires privileges)
sudo perf record -g -a --cgroup="$CGROUP_PATH" -- sleep 30

# Generate a report
sudo perf report --stdio

# For flame graphs, use perf script output
sudo perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg
```

Use `pidstat` to monitor per-process CPU usage over time:

```bash
# Get the container's main PID
CPID=$(podman inspect --format '{{.State.Pid}}' my-container)

# Monitor the container's main process and its threads
pidstat -t -p $CPID 1 60

# Monitor CPU, I/O, and memory together
pidstat -urdh -p $CPID 1
```

---

## Profile Memory Usage

Memory profiling reveals allocation patterns and potential leaks:

```bash
# Current memory usage with limit
podman stats --no-stream --format \
  "{{.Name}}: {{.MemUsage}} ({{.MemPerc}})"

# Detailed memory breakdown from cgroups
CGROUP_PATH=$(podman inspect --format '{{.State.CgroupPath}}' my-container)
CGROUP="/sys/fs/cgroup/${CGROUP_PATH#/}"

# For cgroups v2
cat "$CGROUP/memory.current"
cat "$CGROUP/memory.stat"
```

Read the memory stat file for a breakdown:

```bash
#!/bin/bash
# memory-profile.sh - Detailed memory profile of a container
CONTAINER=$1
CID=$(podman inspect --format '{{.Id}}' "$CONTAINER")

echo "=== Memory Profile for $CONTAINER ==="

# Get cgroup path
CGROUP=$(find /sys/fs/cgroup -name "libpod-${CID}*" -type d 2>/dev/null | head -1)

if [ -z "$CGROUP" ]; then
  echo "Could not find cgroup for container"
  exit 1
fi

echo ""
echo "Current usage: $(cat $CGROUP/memory.current 2>/dev/null | numfmt --to=iec)"
echo "Memory limit:  $(cat $CGROUP/memory.max 2>/dev/null)"
echo "Swap usage:    $(cat $CGROUP/memory.swap.current 2>/dev/null | numfmt --to=iec)"
echo ""
echo "--- Breakdown ---"
cat $CGROUP/memory.stat 2>/dev/null | while read key value; do
  case $key in
    anon|file|shmem|kernel_stack|slab|sock|percpu)
      echo "$key: $(echo $value | numfmt --to=iec)"
      ;;
  esac
done

echo ""
echo "--- OOM Events ---"
cat $CGROUP/memory.events 2>/dev/null
```

Profile memory usage over time to detect leaks:

```bash
#!/bin/bash
# memory-leak-check.sh - Track memory growth over time
CONTAINER=$1
DURATION=${2:-300}  # Default 5 minutes
INTERVAL=5

echo "Tracking memory for $CONTAINER over ${DURATION}s"
echo "timestamp,mem_usage"

END=$(($(date +%s) + DURATION))
while [ $(date +%s) -lt $END ]; do
  STATS=$(podman stats --no-stream --format json "$CONTAINER" 2>/dev/null)
  MEM=$(echo "$STATS" | jq -r '.[0].mem_usage' 2>/dev/null)
  echo "$(date +%s),$MEM"
  sleep $INTERVAL
done
```

---

## Profile I/O Usage

Disk I/O profiling identifies containers with heavy read/write patterns:

```bash
# Block I/O stats from podman
podman stats --no-stream --format \
  "{{.Name}}: BlockIO={{.BlockIO}}"

# Detailed I/O stats from cgroups
CID=$(podman inspect --format '{{.Id}}' my-container)
CGROUP=$(find /sys/fs/cgroup -name "libpod-${CID}*" -type d 2>/dev/null | head -1)

# Read I/O stats
cat $CGROUP/io.stat 2>/dev/null
```

Use `iotop` to see I/O per process:

```bash
# Get container PID
CPID=$(podman inspect --format '{{.State.Pid}}' my-container)

# Watch I/O for the container's main process
sudo iotop -p $CPID -b -d 2 -n 30

# Use strace to profile syscall-level I/O for the main process
sudo strace -f -p $CPID -e trace=read,write,open,openat,close -c
```

Profile filesystem operations inside the container:

```bash
# Run a container with I/O profiling
podman run --rm -it your-image sh -c '
  # Install and run fatrace-like tool
  dd if=/dev/zero of=/tmp/testfile bs=4k count=10000 2>&1
  echo "---"
  dd if=/tmp/testfile of=/dev/null bs=4k 2>&1
'
```

---

## Profile Network Usage

Network profiling shows bandwidth consumption and connection patterns:

Note: `podman stats` cannot report network usage in some rootless environments. Enter the container's network namespace when you need connection-level details.

```bash
# Network I/O from podman stats
podman stats --no-stream --format \
  "{{.Name}}: NetIO={{.NetIO}}"

# Inspect container network configuration
podman inspect --format '{{json .NetworkSettings}}' my-container | jq .

# Use nsenter to profile network inside the container namespace
CPID=$(podman inspect --format '{{.State.Pid}}' my-container)

# List connections inside the container
sudo nsenter -t $CPID -n ss -tuanp

# Monitor network traffic
sudo nsenter -t $CPID -n iftop -t -s 30

# Capture packets for analysis
sudo nsenter -t $CPID -n tcpdump -i any -c 1000 -w /tmp/capture.pcap
```

Create a network profiling script:

```bash
#!/bin/bash
# network-profile.sh - Profile container network usage
CONTAINER=$1
CPID=$(podman inspect --format '{{.State.Pid}}' "$CONTAINER")

echo "=== Network Profile for $CONTAINER ==="
echo ""

echo "--- Active Connections ---"
sudo nsenter -t $CPID -n ss -tuanp | head -20

echo ""
echo "--- Interface Statistics ---"
sudo nsenter -t $CPID -n ip -s link show

echo ""
echo "--- Connection Summary ---"
sudo nsenter -t $CPID -n ss -s
```

---

## Profile Using podman exec

Run profiling tools directly inside the container:

```bash
# CPU profile with top inside container
podman exec my-container top -b -n 1

# Memory map of the main process
podman exec my-container cat /proc/1/smaps_rollup

# File descriptors (detect leaks)
podman exec my-container ls -la /proc/1/fd | wc -l

# Check for zombie processes
podman exec my-container ps aux | grep -c defunct

# View process limits
podman exec my-container cat /proc/1/limits
```

---

## Continuous Profiling Script

Combine all profiling dimensions into a comprehensive script:

```bash
#!/bin/bash
# full-profile.sh - Complete resource profile of a Podman container
CONTAINER=$1

if [ -z "$CONTAINER" ]; then
  echo "Usage: $0 <container-name>"
  exit 1
fi

echo "========================================"
echo "Resource Profile: $CONTAINER"
echo "Time: $(date)"
echo "========================================"

# Basic info
echo ""
echo "--- Container Info ---"
podman inspect --format 'Image: {{.ImageName}}
State: {{.State.Status}}
PID: {{.State.Pid}}
Started: {{.State.StartedAt}}' "$CONTAINER"

# CPU and Memory
echo ""
echo "--- Resource Usage ---"
podman stats --no-stream --format \
  'CPU: {{.CPUPerc}}
Memory: {{.MemUsage}} ({{.MemPerc}})
Net I/O: {{.NetIO}}
Block I/O: {{.BlockIO}}
PIDs: {{.PIDs}}' "$CONTAINER"

# Process list
echo ""
echo "--- Top Processes ---"
podman top "$CONTAINER" -eo pid,pcpu,pmem,rss,vsz,comm | head -15

# File descriptors
echo ""
echo "--- Open File Descriptors ---"
FD_COUNT=$(podman exec "$CONTAINER" sh -c 'ls /proc/1/fd 2>/dev/null | wc -l' 2>/dev/null)
echo "Count: $FD_COUNT"

# Health check status
echo ""
echo "--- Health Status ---"
podman inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}No health check{{end}}' "$CONTAINER"

echo ""
echo "========================================"
```

---

## Export Profiling Data

Export profiling data for analysis in external tools:

```bash
# Export stats to CSV
podman stats --no-stream --format \
  '{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}' \
  >> /var/log/container-stats.csv

# Continuous export for time-series analysis
while true; do
  TIMESTAMP=$(date +%s)
  podman stats --no-stream --format json | \
    jq --arg ts "$TIMESTAMP" '.[] | {timestamp: $ts, name, cpu_percent, mem_usage, mem_percent, netio, blocki, pids}' \
    >> /var/log/container-metrics.jsonl
  sleep 10
done
```

---

## Conclusion

Profiling Podman containers leverages the same Linux tools you use for any process, with the addition of container-specific access through cgroups, namespaces, and the Podman API. Start with `podman stats` and `podman top` for quick assessments. Use cgroup files for detailed memory and I/O breakdowns. Employ `perf`, `pidstat`, and `strace` for deep CPU profiling. Enter the container's network namespace for connection analysis. Build continuous profiling into your workflow so you catch performance regressions early and size your containers accurately based on real usage data.
