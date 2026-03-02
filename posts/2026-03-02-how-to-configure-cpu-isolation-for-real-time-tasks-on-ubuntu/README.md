# How to Configure CPU Isolation for Real-Time Tasks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Real-Time, CPU Isolation, Performance, Kernel

Description: Configure CPU isolation on Ubuntu to dedicate specific CPU cores exclusively to real-time tasks, preventing OS scheduler interference and reducing latency.

---

When running real-time workloads, Linux kernel background tasks, interrupt handlers, and scheduler load balancing can all interfere with your application's timing by running on the same CPU cores. CPU isolation removes specific cores from the general scheduler pool, dedicating them exclusively to processes you assign. This significantly reduces jitter and worst-case latency for real-time applications.

## Prerequisites

- Ubuntu 22.04 with PREEMPT_RT or low-latency kernel
- A multi-core system (isolation only makes sense with 2+ cores)
- Root or sudo access
- Basic understanding of how Linux CPU affinity works

## Understanding CPU Isolation

When you isolate a CPU core, the Linux scheduler stops migrating tasks to it automatically. Only processes that are explicitly pinned to that core (using `taskset` or `cpuset`) will run there. The remaining cores handle all OS housekeeping tasks, keeping the isolated cores free for deterministic work.

There are two complementary mechanisms:

1. **isolcpus** kernel parameter - removes CPUs from the scheduler's domain
2. **cpuset cgroups** - divides CPUs between groups of processes

## Method 1: Kernel Boot Parameter (isolcpus)

The simplest approach is adding `isolcpus` to the kernel command line.

### Identify Your CPU Layout

```bash
# Check how many cores you have and their topology
nproc
lscpu | grep -E "CPU|Core|Socket|NUMA"

# See the CPU topology visually
lscpu --extended

# Check NUMA topology (important for multi-socket systems)
numactl --hardware
```

### Configure GRUB

For a 4-core system, isolating cores 2 and 3 while leaving 0 and 1 for the OS:

```bash
sudo nano /etc/default/grub
```

Find the `GRUB_CMDLINE_LINUX_DEFAULT` line and add CPU isolation parameters:

```bash
# Before:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"

# After (isolates CPUs 2 and 3):
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3"
```

Parameter explanation:
- `isolcpus=2,3` - removes CPUs from the scheduler domain
- `nohz_full=2,3` - disables periodic timer interrupts on isolated CPUs (reduces OS noise)
- `rcu_nocbs=2,3` - moves RCU callbacks off isolated CPUs

```bash
# Update GRUB and reboot
sudo update-grub
sudo reboot
```

### Verify Isolation After Reboot

```bash
# Check that CPUs were successfully isolated
cat /sys/devices/system/cpu/isolated
# Expected: 2-3

# Check that nohz_full is active
cat /sys/devices/system/cpu/nohz_full
# Expected: 2-3

# See what processes are running on isolated CPUs
ps -eo pid,psr,comm | awk '$2 >= 2'
# Should show mostly kthreads and your pinned processes
```

## Method 2: cpuset via cgroups

cgroups provide a more dynamic approach that can be reconfigured without rebooting.

```bash
# Install cgroup tools
sudo apt install -y cgroup-tools

# Create a cpuset for real-time tasks
sudo cgcreate -g cpuset:/realtime

# Assign CPUs 2 and 3 to the realtime group
echo "2-3" | sudo tee /sys/fs/cgroup/cpuset/realtime/cpuset.cpus

# Assign memory nodes (required for cpuset cgroups)
# Use node 0 unless you have NUMA and want to restrict memory
echo "0" | sudo tee /sys/fs/cgroup/cpuset/realtime/cpuset.mems

# Move a process to the realtime cgroup
sudo cgclassify -g cpuset:/realtime <PID>

# Verify the process is on the correct CPU
taskset -p <PID>
```

## Method 3: tuna for Dynamic Tuning

The `tuna` tool provides a convenient interface for CPU isolation and IRQ management:

```bash
# Install tuna
sudo apt install -y tuna

# Display current CPU and IRQ assignments
sudo tuna --show_threads

# Isolate CPUs 2 and 3 dynamically (runtime, no reboot needed)
sudo tuna --cpus=2,3 --isolate

# Move a thread to an isolated CPU
sudo tuna --threads=<THREAD_NAME> --move --cpus=2,3

# Show threads with CPU affinity
sudo tuna --show_threads --cpus=2,3
```

## Pinning a Process to an Isolated CPU

Once CPUs are isolated, pin your real-time process to them:

```bash
# Run a process on CPU 2 only
taskset -c 2 /usr/local/bin/my-rt-app

# Run with real-time priority AND CPU affinity
taskset -c 2 chrt -f 80 /usr/local/bin/my-rt-app

# Pin an already-running process to CPU 3
taskset -cp 3 <PID>

# Verify affinity was set
taskset -p <PID>
# Expected: pid <PID>'s current affinity mask: 8 (binary 1000 = CPU 3)
```

## Moving IRQs Off Isolated CPUs

Interrupts (IRQs) can still fire on isolated CPUs unless redirected:

```bash
# View current IRQ affinity
for irq in /proc/irq/*/smp_affinity_list; do
    echo "$irq: $(cat $irq)"
done

# Move all IRQs to CPUs 0 and 1 (away from isolated 2 and 3)
for irq_dir in /proc/irq/*/; do
    echo "0,1" > ${irq_dir}smp_affinity_list 2>/dev/null
done

# Automate this with irqbalance exclusions
sudo apt install -y irqbalance
sudo nano /etc/default/irqbalance

# Add to exclude your isolated CPUs from irqbalance management
IRQBALANCE_BANNED_CPULIST="2,3"

sudo systemctl restart irqbalance
```

## Verifying Isolation Effectiveness

Measure latency with `cyclictest` while running a background load:

```bash
# Install rt-tests
sudo apt install -y rt-tests stress-ng

# On a non-isolated CPU, run a stress load
taskset -c 0,1 stress-ng --cpu 2 --io 2 &

# On an isolated CPU, measure latency
sudo taskset -c 2 cyclictest \
  --mlockall \
  --priority=80 \
  --interval=1000 \
  --threads=1 \
  --loops=100000 \
  --histogram=200

# Compare maximum latency with and without isolation
# With proper isolation, max latency should be < 50 microseconds on RT kernel
```

## Creating a Startup Script

Automate isolation setup that survives reboots:

```bash
sudo tee /usr/local/bin/setup-rt-isolation.sh > /dev/null <<'SCRIPT'
#!/bin/bash
# Set up CPU isolation for real-time tasks
set -e

ISOLATED_CPUS="2,3"
OS_CPUS="0,1"

# Move IRQs off isolated CPUs
for irq_dir in /proc/irq/*/; do
    if [ -w "${irq_dir}smp_affinity_list" ]; then
        echo "$OS_CPUS" > "${irq_dir}smp_affinity_list" 2>/dev/null || true
    fi
done

# Set RCU kthread affinity
for rcu_thread in $(pgrep -f rcu); do
    taskset -cp "$OS_CPUS" "$rcu_thread" 2>/dev/null || true
done

# Move kworker threads off isolated CPUs
for kworker in $(pgrep kworker); do
    taskset -cp "$OS_CPUS" "$kworker" 2>/dev/null || true
done

echo "RT isolation setup complete. Isolated CPUs: $ISOLATED_CPUS"
SCRIPT

sudo chmod +x /usr/local/bin/setup-rt-isolation.sh

# Create a systemd service to run it at boot
sudo tee /etc/systemd/system/rt-isolation.service > /dev/null <<'EOF'
[Unit]
Description=Real-Time CPU Isolation Setup
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-rt-isolation.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable rt-isolation
```

## Troubleshooting

### Process Still Migrating Off Isolated CPU

```bash
# Check if something is overriding the affinity
ps -eo pid,psr,comm | grep <your_app_name>

# Ensure your application is setting its own affinity,
# or that you are launching it with taskset
which taskset
taskset -c 2 ./your-app
```

### High Latency Spikes Despite Isolation

```bash
# Check for SMIs (System Management Interrupts) - these bypass the OS completely
sudo apt install -y hwlatdetect
sudo hwlatdetect --duration=30

# Any output indicates SMI activity which cannot be eliminated by software
# Check BIOS settings to reduce SMI frequency
```

CPU isolation is one of the most impactful steps for real-time workloads. Combined with PREEMPT_RT, IRQ threading, and disabling power management features, it produces Linux systems with latency profiles suitable for demanding industrial and embedded applications.
