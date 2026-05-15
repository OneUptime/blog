# How to Use tuna to Manage Thread Priorities and CPU Pinning on RHEL Real-Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, Tuna, CPU Pinning, Thread Priority, Performance, Linux

Description: Use the tuna utility on RHEL to manage thread scheduling priorities, pin processes to specific CPUs, and move IRQs away from real-time cores.

---

The `tuna` tool is a utility designed for real-time systems on RHEL. It provides both a command-line interface and a graphical UI for managing thread priorities, CPU affinity, and IRQ placement. It simplifies tasks that would otherwise require multiple low-level commands.

## Install tuna

```bash
# Install tuna from the RHEL repositories

sudo dnf install -y tuna
```

## View Current Thread and IRQ Layout

```bash
# Display all threads and their current CPU assignments
sudo tuna show_threads

# Display all IRQs and their CPU assignments
sudo tuna show_irqs

# Show both threads and IRQs
sudo tuna show_threads
sudo tuna show_irqs
```

## Isolate CPUs from General Workloads

```bash
# Isolate CPUs 2-7: move all threads and IRQs off these cores
sudo tuna isolate --cpus=2-7

# Verify that threads have been moved
sudo tuna show_threads | grep -E "^[[:space:]]*[0-9]"
```

## Pin a Specific Process to a CPU

```bash
# Pin process with PID 5678 to CPU 3
sudo tuna move --threads=5678 --cpus=3

# Pin a process by name to CPUs 4-5
sudo tuna move --threads=my_rt_app --cpus=4,5

# Verify the assignment
sudo tuna show_threads --threads=5678
```

## Set Thread Scheduling Priority

```bash
# Set PID 5678 to FIFO real-time scheduling with priority 90
sudo tuna priority FIFO:90 --threads=5678

# Set a thread to round-robin scheduling with priority 50
sudo tuna priority RR:50 --threads=5678

# Verify the priority change
sudo tuna show_threads --threads=5678
```

## Move IRQs to Housekeeping CPUs

```bash
# Move all IRQs to CPUs 0 and 1
sudo tuna move --irqs='*' --cpus=0,1

# Move IRQs matching a device name pattern (e.g., eth0*) to CPU 0
sudo tuna move --irqs='eth0*' --cpus=0

# Verify the IRQ assignments
sudo tuna show_irqs
```

## Use the Interactive GUI

```bash
# Launch the tuna interactive interface
sudo tuna gui
```

The GUI shows threads and IRQs in a table format. You can select items and change their CPU affinity and priority interactively.

## Save and Restore Configuration

```bash
# Save the current tuna configuration
sudo tuna save /etc/tuna/rt-config.conf

# Apply a saved configuration (useful at boot)
sudo tuna apply /etc/tuna/rt-config.conf
```

## Create a Systemd Service for Boot-Time Configuration

```bash
# Create a service that applies tuna settings at boot
sudo tee /etc/systemd/system/tuna-config.service > /dev/null << 'EOF'
[Unit]
Description=Apply tuna real-time configuration
Before=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/bin/tuna apply /etc/tuna/rt-config.conf

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tuna-config.service
```

The tuna utility makes real-time tuning more accessible by wrapping CPU affinity, scheduling priority, and IRQ management into a single cohesive tool.
