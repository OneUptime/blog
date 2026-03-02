# How to Set Up CPU Isolation for Real-Time Workloads on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Real-Time, CPU Isolation, Kernel, Performance

Description: Configure CPU isolation on Ubuntu using isolcpus and cpuset cgroups to dedicate processor cores to real-time and latency-sensitive workloads, eliminating scheduling jitter.

---

Real-time workloads - industrial control systems, high-frequency trading engines, audio processing, network packet capture - require predictable execution timing. The problem with running these on a standard Linux kernel is scheduler jitter: even if a process has the highest priority, the kernel occasionally preempts it for interrupt handling, RCU callbacks, timer ticks, and other system work. On dedicated cores, with proper isolation, this jitter can be reduced from milliseconds to microseconds.

CPU isolation removes specified cores from the kernel's scheduler, dedicating them entirely to the processes you pin there.

## Understanding the Isolation Techniques

**`isolcpus`** - Kernel boot parameter that removes CPUs from the general scheduler domain. Processes only run on isolated CPUs if explicitly pinned there.

**`cpuset` cgroups** - Linux control group feature that restricts which CPUs a group of processes can use.

**`nohz_full`** - Disables the periodic timer tick on specified CPUs, eliminating a major source of jitter.

**`rcu_nocbs`** - Moves RCU (Read-Copy-Update) callback processing off specified CPUs.

These techniques are complementary and are typically used together for maximum isolation.

## Checking Your CPU Topology

Before isolating CPUs, understand your system's topology:

```bash
# CPU count and topology
lscpu | grep -E "CPU\(s\)|Thread|Core|Socket|NUMA"

# Detailed CPU topology
cat /proc/cpuinfo | grep -E "processor|physical id|core id|cpu MHz" | head -40

# NUMA node assignments
numactl --hardware

# Hyperthreading pairs (important - isolate both threads of a physical core)
cat /sys/devices/system/cpu/cpu*/topology/thread_siblings_list | sort -u
```

For a server with 16 logical CPUs (8 physical cores with HT), you'd typically keep CPUs 0-1 for the OS and isolate CPUs 2-15 for real-time workloads.

## Step 1: Kernel Boot Parameters

Edit GRUB to add CPU isolation parameters:

```bash
sudo nano /etc/default/grub
```

```bash
# Isolate CPUs 2-15 for real-time workloads
# Keep CPUs 0-1 for OS, kernel threads, and interrupts
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash \
  isolcpus=2-15 \
  nohz_full=2-15 \
  rcu_nocbs=2-15 \
  rcu_nocb_poll \
  nosoftlockup \
  nohz=on"
```

For HT systems, isolate both sibling threads of each physical core. If cores 0 and 8 are siblings (two threads of core 0), you should either isolate both or neither:

```bash
# Find sibling pairs first
cat /sys/devices/system/cpu/cpu*/topology/thread_siblings_list | sort -u

# Example output for a 4-core/8-thread system:
# 0,4
# 1,5
# 2,6
# 3,7
# Isolate cores 2-3 and their siblings 6-7:
# isolcpus=2,3,6,7 nohz_full=2,3,6,7 rcu_nocbs=2,3,6,7
```

Apply the changes:

```bash
sudo update-grub
sudo reboot
```

After reboot, verify isolation:

```bash
# Check that isolated CPUs are no longer scheduled on
cat /sys/devices/system/cpu/isolated

# Verify nohz_full
cat /sys/devices/system/cpu/nohz_full

# Check that OS processes aren't running on isolated CPUs
ps -eo pid,psr,comm | awk '$2 > 1'  # Show processes on CPUs > 1
```

## Step 2: Move Kernel Threads Off Isolated CPUs

Even with `isolcpus`, some kernel threads may still run on isolated cores. Pin them explicitly to non-isolated CPUs:

```bash
# Move all kernel threads to CPU 0 (or 0-1 if you have 2 OS CPUs)
# This uses taskset with a CPU mask

# CPU mask for CPUs 0 and 1: 0x3 (binary: 11)
for pid in $(ps -eo pid,comm | awk '/kworker|ksoftirq|kthread|migration/ {print $1}'); do
    taskset -p 0x3 "$pid" 2>/dev/null
done

# Move all kernel threads (more comprehensive)
for pid in $(ls /proc | grep -E '^[0-9]+$'); do
    comm=$(cat /proc/$pid/comm 2>/dev/null)
    # Skip user processes - only touch kernel threads (no associated executable path)
    if [ -z "$(ls -la /proc/$pid/exe 2>/dev/null | grep -v 'kernel')" ]; then
        taskset -ap 0x3 "$pid" 2>/dev/null
    fi
done
```

## Step 3: Move Interrupts Off Isolated CPUs

Hardware interrupts should not fire on isolated CPUs:

```bash
# View current interrupt affinity
cat /proc/interrupts | head -20

# Move all IRQs to non-isolated CPUs (CPU 0 and 1)
# CPU mask 0x3 = CPUs 0 and 1
for irq in /proc/irq/*/smp_affinity; do
    echo 3 | sudo tee "$irq" > /dev/null 2>&1
done

# Verify
cat /proc/interrupts | awk 'NR>1 {sum=0; for(i=3;i<=NF-2;i++) sum+=$i; if($NF!="") print $1, sum, $NF}' | sort -k2 -rn | head -20
```

## Step 4: Pin Real-Time Processes to Isolated CPUs

Now pin your real-time application to the isolated CPUs:

```bash
# Pin a process to CPUs 2-15 using taskset
# CPU mask for CPUs 2-15: 0xFFFC
taskset -c 2-15 ./my-realtime-app

# Or for a running process (PID 12345)
taskset -cp 2-15 12345

# With higher real-time scheduling priority
sudo chrt -f 80 taskset -c 2-15 ./my-realtime-app
# -f = SCHED_FIFO, 80 = priority (1-99, higher = more priority)

# Check process CPU and priority
ps -eo pid,psr,rtprio,cls,comm | grep my-realtime-app
```

## Using cgroups for CPU Isolation

cgroups provide a more structured approach, especially for containerized workloads:

```bash
# Create a cpuset cgroup for real-time tasks
sudo mkdir -p /sys/fs/cgroup/cpuset/realtime

# Assign CPUs 2-15 to this cgroup
echo "2-15" | sudo tee /sys/fs/cgroup/cpuset/realtime/cpuset.cpus

# Assign NUMA memory nodes (use node 0 if single-socket)
echo "0" | sudo tee /sys/fs/cgroup/cpuset/realtime/cpuset.mems

# Move a process to the realtime cgroup
echo $PID | sudo tee /sys/fs/cgroup/cpuset/realtime/tasks

# Move all threads of a process
for tid in /proc/$PID/task/*/; do
    tid=$(basename $tid)
    echo $tid | sudo tee /sys/fs/cgroup/cpuset/realtime/tasks
done
```

Using systemd cgroup management (cgroups v2):

```bash
# Create a systemd slice for real-time services
cat << 'EOF' | sudo tee /etc/systemd/system/realtime.slice
[Unit]
Description=Real-Time Workloads Slice

[Slice]
AllowedCPUs=2-15
EOF

# Create a service that runs in the real-time slice
cat << 'EOF' | sudo tee /etc/systemd/system/my-rt-app.service
[Unit]
Description=My Real-Time Application
After=network.target

[Service]
Slice=realtime.slice
CPUAffinity=2-15
CPUSchedulingPolicy=fifo
CPUSchedulingPriority=80
ExecStart=/usr/local/bin/my-rt-app

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now my-rt-app.service
```

## Measuring Jitter Improvement

Measure scheduling latency before and after isolation:

```bash
# Install cyclictest (RT testing tool)
sudo apt install rt-tests -y

# Run cyclictest on a non-isolated CPU (baseline)
sudo cyclictest -p 80 -t 1 -n -i 1000 -l 100000 -q -c 0

# Run on an isolated CPU (should show much lower max latency)
sudo cyclictest -p 80 -t 1 -n -i 1000 -l 100000 -q -c 4

# The output shows:
# T: thread number
# P: priority
# I: interval (microseconds)
# C: cycle count
# Min: minimum latency (microseconds)
# Act: current latency
# Avg: average latency
# Max: maximum latency
```

Typical results on a properly isolated system:
- Non-isolated: max latency 200-2000 microseconds
- Isolated with nohz_full: max latency 5-50 microseconds

## Monitoring Isolated CPU Utilization

```bash
# Watch per-CPU utilization
mpstat -P ALL 1 | awk 'NR>2 && /^[0-9]/ {print $0}'

# Check that isolated CPUs are only running your processes
ps -eo pid,psr,comm | awk '$2 >= 2'  # Processes on CPUs 2+

# Watch with htop configured to show CPU affinity columns
# htop -d 5

# Verify no unexpected kernel threads on isolated CPUs
ps -eLo psr,tid,comm | awk '$1 >= 2' | grep -v "my-rt-app"
```

## Considerations and Trade-offs

Isolating CPUs removes them from the scheduler but doesn't completely prevent all jitter sources:
- SMIs (System Management Interrupts) - triggered by BIOS/firmware, can't be blocked
- Thermal throttling - CPU may lower frequency under thermal pressure
- Memory NUMA access latency - ensure your process's memory is allocated on the same NUMA node

For maximum isolation:
```bash
# Disable SMI watchdog if present (BIOS setting, or sometimes via msr)
# Use numactl to bind memory to the same NUMA node as the isolated CPUs
numactl --cpunodebind=0 --membind=0 ./my-rt-app

# Disable frequency scaling on isolated CPUs
for cpu in 2 3 4 5 6 7; do
    echo performance | sudo tee /sys/devices/system/cpu/cpu${cpu}/cpufreq/scaling_governor
done
```

CPU isolation is a substantial commitment - you're permanently removing compute resources from general use. Start with isolating just a few cores and measure the latency improvement with cyclictest before expanding the isolated set.
