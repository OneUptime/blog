# How to Use tuna to Manage Thread Priorities and CPU Pinning on RHEL Real-Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, tuna, CPU Pinning, Thread Priority, Performance, Linux

Description: Use the tuna utility on RHEL to manage thread scheduling priorities, pin processes to specific CPUs, and move IRQs away from real-time cores.

---

The `tuna` tool is a utility designed for real-time systems on RHEL. It provides both a command-line interface and a text-based UI for managing thread priorities, CPU affinity, and IRQ placement. It simplifies tasks that would otherwise require multiple low-level commands.

## Install tuna

```bash
# Install tuna from the RHEL repositories
sudo dnf install -y tuna
```

## View Current Thread and IRQ Layout

```bash
# Display all threads and their current CPU assignments
sudo tuna --threads --show

# Display all IRQs and their CPU assignments
sudo tuna --irqs --show

# Show both threads and IRQs together
sudo tuna --show_threads --show_irqs
```

## Isolate CPUs from General Workloads

```bash
# Isolate CPUs 2-7: move all threads and IRQs off these cores
sudo tuna --cpus=2-7 --isolate

# Verify that threads have been moved
sudo tuna --threads --show | grep -E "^\s+[0-9]"
```

## Pin a Specific Process to a CPU

```bash
# Pin process with PID 5678 to CPU 3
sudo tuna --threads=5678 --cpus=3 --move

# Pin a process by name to CPUs 4-5
sudo tuna --threads=my_rt_app --cpus=4,5 --move

# Verify the assignment
sudo tuna --threads=5678 --show
```

## Set Thread Scheduling Priority

```bash
# Set PID 5678 to FIFO real-time scheduling with priority 90
sudo tuna --threads=5678 --priority=FIFO:90

# Set a thread to round-robin scheduling with priority 50
sudo tuna --threads=5678 --priority=RR:50

# Verify the priority change
sudo tuna --threads=5678 --show
```

## Move IRQs to Housekeeping CPUs

```bash
# Move all IRQs to CPUs 0 and 1
sudo tuna --irqs=\* --cpus=0,1 --move

# Move a specific IRQ (e.g., eth0) to CPU 0
sudo tuna --irqs=eth0 --cpus=0 --move

# Verify the IRQ assignments
sudo tuna --irqs --show
```

## Use the Interactive Text UI

```bash
# Launch the tuna interactive interface
sudo tuna --gui
```

The text UI shows threads and IRQs in a table format. You can select items and change their CPU affinity and priority interactively.

## Save and Restore Configuration

```bash
# Save the current tuna configuration
sudo tuna --save=/etc/tuna/rt-config.conf

# Restore a saved configuration (useful at boot)
sudo tuna --load=/etc/tuna/rt-config.conf
```

## Create a Systemd Service for Boot-Time Configuration

```bash
# Create a service that applies tuna settings at boot
sudo tee /etc/systemd/system/tuna-config.service > /dev/null << 'EOF'
[Unit]
Description=Apply tuna real-time configuration
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/bin/tuna --load=/etc/tuna/rt-config.conf

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tuna-config.service
```

The tuna utility makes real-time tuning more accessible by wrapping CPU affinity, scheduling priority, and IRQ management into a single cohesive tool.
