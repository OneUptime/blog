# How to Set Up IRQ Threading on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Real-Time, IRQ, Kernel, Performance

Description: Configure IRQ threading on Ubuntu to make hardware interrupts preemptible by running interrupt handlers as schedulable kernel threads, reducing latency for real-time workloads.

---

In a standard Linux kernel, hardware interrupt handlers (IRQs) run outside of the scheduler's control. They preempt any running task without notice and cannot themselves be preempted. For real-time workloads, this creates unpredictable latency spikes whenever hardware interrupts fire. PREEMPT_RT solves this by converting interrupt handlers into regular kernel threads that can be scheduled, prioritized, and preempted like any other thread. This is called threaded IRQs.

## Prerequisites

- Ubuntu 22.04 or newer
- PREEMPT_RT kernel recommended (though some configuration applies to standard kernels)
- Root or sudo access
- Basic understanding of interrupt handling

## Understanding IRQ Threading

When PREEMPT_RT is active, interrupt handlers are split into two parts:

1. **Hard IRQ**: A minimal handler that acknowledges the interrupt and wakes up the threaded handler
2. **Threaded IRQ**: The actual interrupt processing runs in a kernel thread (`irq/<NUM>-<name>`)

Because threaded IRQ handlers are regular kernel threads, you can:
- Set their scheduling policy (SCHED_FIFO, SCHED_RR)
- Set their CPU affinity
- Give them explicit priorities
- Have them preempted by higher-priority threads

## Checking Current IRQ Configuration

```bash
# List all IRQs with their current thread and CPU affinity
cat /proc/interrupts

# Check if IRQ threads exist (they appear as irq/<NUM> processes)
ps aux | grep "irq/"

# Check IRQ thread details
ps -eo pid,class,rtprio,ni,pri,psr,comm | grep "^irq"

# View the affinity of a specific IRQ (e.g., IRQ 18)
cat /proc/irq/18/smp_affinity_list
cat /proc/irq/18/affinity_hint

# List IRQ threads with their current priority
for pid in $(ps -eo pid,comm | grep "irq/" | awk '{print $1}'); do
    comm=$(ps -p $pid -o comm=)
    policy=$(chrt -p $pid 2>/dev/null | grep "scheduling policy" | awk '{print $NF}')
    prio=$(chrt -p $pid 2>/dev/null | grep "scheduling priority" | awk '{print $NF}')
    cpu=$(ps -p $pid -o psr=)
    echo "PID: $pid  CPU: $cpu  Policy: $policy  Priority: $prio  Comm: $comm"
done
```

## Setting IRQ Thread Priorities

With PREEMPT_RT, IRQ threads default to `SCHED_FIFO` priority 50. You can adjust this:

```bash
# Find the IRQ thread for network interface (typically eth0 or ens*)
IRQ_THREAD=$(ps -eo pid,comm | grep "irq/.*eth\|irq/.*ens" | head -1 | awk '{print $1}')

# Raise the priority of the network IRQ thread
sudo chrt -f -p 75 $IRQ_THREAD

# Verify the change
chrt -p $IRQ_THREAD

# Set priority for all IRQ threads
for pid in $(ps -eo pid,comm | grep "irq/" | awk '{print $1}'); do
    sudo chrt -f -p 50 $pid 2>/dev/null
done
```

## Setting CPU Affinity for IRQ Threads

Moving IRQ threads to specific cores reduces interference with isolated RT cores:

```bash
# Move a specific IRQ to CPU 0 only
# Replace 18 with your actual IRQ number
IRQ_NUMBER=18
echo "1" | sudo tee /proc/irq/${IRQ_NUMBER}/smp_affinity
# The value is a bitmask: CPU0=1, CPU1=2, CPU2=4, CPU3=8

# Using smp_affinity_list (more readable)
echo "0" | sudo tee /proc/irq/${IRQ_NUMBER}/smp_affinity_list

# Move all IRQs to CPUs 0 and 1 (keep them off isolated RT cores 2 and 3)
for irq_dir in /proc/irq/*/; do
    irq_num=$(basename $irq_dir)
    # Skip the fake IRQ 0 and directory traversal issues
    [[ "$irq_num" == "0" ]] && continue
    echo "0,1" > ${irq_dir}smp_affinity_list 2>/dev/null
done
```

## Using tuna to Manage IRQs

The `tuna` tool provides a convenient interface:

```bash
# Install tuna
sudo apt install -y tuna

# Show all IRQ threads with CPU and priority
sudo tuna --show_irqs

# Move specific IRQs to CPU 0
sudo tuna --irqs=<IRQ_NUMBERS> --cpu=0 --move

# Set priority of an IRQ thread
sudo tuna --irqs=18 --priority=f:75

# Interactive mode (ncurses UI)
sudo tuna --gui
```

## Controlling IRQ Balancing with irqbalance

`irqbalance` is a daemon that automatically distributes IRQs across CPUs for throughput. For RT workloads, you want predictability over automatic balancing:

```bash
# Stop irqbalance for manual control
sudo systemctl stop irqbalance
sudo systemctl disable irqbalance

# Or configure irqbalance to avoid RT cores
sudo nano /etc/default/irqbalance
```

```bash
# Add to /etc/default/irqbalance:
# Exclude CPUs 2 and 3 from irqbalance (your RT cores)
IRQBALANCE_BANNED_CPULIST="2,3"
# Optional: Only balance IRQs from specific network interfaces
# IRQBALANCE_ARGS="--banirq=12 --banirq=13"
```

```bash
sudo systemctl restart irqbalance
```

## Configuring IRQ Affinity at Boot

Set IRQ affinities persistently using a startup script:

```bash
sudo tee /usr/local/bin/configure-irqs.sh > /dev/null <<'SCRIPT'
#!/bin/bash
# Configure IRQ affinity for RT system
# CPUs 0,1 handle all interrupts; CPUs 2,3 are reserved for RT tasks

OS_CPU_MASK="3"        # Binary 011 = CPUs 0 and 1
OS_CPU_LIST="0,1"

# Move all IRQs to OS CPUs
for irq_dir in /proc/irq/*/; do
    irq_num=$(basename "$irq_dir")
    # Skip special entries
    [[ "$irq_num" == "0" ]] && continue

    if [ -w "${irq_dir}smp_affinity_list" ]; then
        echo "$OS_CPU_LIST" > "${irq_dir}smp_affinity_list" 2>/dev/null
    fi
done

# Set priorities for specific IRQ types
# Network interfaces should have high priority for low latency
for thread in $(ps -eo pid,comm | grep "irq/.*eth\|irq/.*ens\|irq/.*bond" | awk '{print $1}'); do
    chrt -f -p 75 "$thread" 2>/dev/null
done

# Storage IRQs at medium priority
for thread in $(ps -eo pid,comm | grep "irq/.*nvme\|irq/.*sata\|irq/.*ahci" | awk '{print $1}'); do
    chrt -f -p 60 "$thread" 2>/dev/null
done

echo "IRQ configuration complete"
SCRIPT

sudo chmod +x /usr/local/bin/configure-irqs.sh

# Create a systemd service
sudo tee /etc/systemd/system/configure-irqs.service > /dev/null <<'EOF'
[Unit]
Description=Configure IRQ Threading and Affinity
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/configure-irqs.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now configure-irqs
```

## Measuring the Impact

Compare latency before and after IRQ configuration:

```bash
# Install rt-tests
sudo apt install -y rt-tests

# Measure baseline latency on an RT core (CPU 2)
sudo taskset -c 2 cyclictest \
  --mlockall \
  --priority=80 \
  --interval=200 \
  --threads=1 \
  --loops=50000 \
  --histogram=200 \
  -q

# Run the same test after configuring IRQ affinity and compare Max values
# A well-configured system should show Max < 50 microseconds
```

## Troubleshooting IRQ Thread Issues

### IRQ Threads Not Showing Up

```bash
# Check if threaded IRQs are enabled
# With PREEMPT_RT, this should be 1 by default
cat /sys/bus/workqueue/devices/default/max_active

# Force threaded IRQs (may not work for all drivers)
echo 1 | sudo tee /proc/sys/kernel/threaded_irqs 2>/dev/null || \
  sudo modprobe genirq_thread_all 2>/dev/null || \
  echo "Threaded IRQs require PREEMPT_RT kernel"
```

### High Latency Despite IRQ Affinity

```bash
# Check for SMI activity (these bypass the kernel entirely)
sudo apt install -y hwlatdetect
sudo hwlatdetect --duration=10 --threshold=20

# Check for CPU frequency scaling interference
grep -r "" /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Disable C-states which cause wakeup latency
sudo cpupower idle-set -d 2  # Disable C2
sudo cpupower idle-set -d 3  # Disable C3
```

### Cannot Change IRQ Affinity

Some IRQs are marked as non-balanceable and will not accept affinity changes:

```bash
# Check if the IRQ is balanceable
cat /proc/irq/<IRQ_NUMBER>/affinity_hint

# IRQs with affinity_hint != 0 may be pinned by the driver
# You may need to use the driver's module parameters to change this
# For example, for Intel NICs with multiple queues:
ethtool -L eth0 combined 4  # Set number of queues
```

IRQ threading is a key component of a complete real-time Linux setup. Combined with CPU isolation and a PREEMPT_RT kernel, proper IRQ management ensures that hardware interrupts do not unpredictably delay your real-time application. For the best results, use all three techniques together.
