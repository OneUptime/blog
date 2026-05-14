# How to Tune IRQ Affinity for Deterministic Latency on RHEL Real-Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, IRQ Affinity, Latency Tuning, Performance, Linux

Description: Configure IRQ affinity on RHEL real-time systems to steer hardware interrupts away from isolated CPUs, reducing latency jitter for time-critical applications.

---

Hardware interrupts (IRQs) can introduce unpredictable latency spikes on CPUs running real-time tasks. By setting IRQ affinity, you can direct interrupts to specific housekeeping CPUs, keeping your isolated real-time cores free from interruption.

## View Current IRQ Assignments

```bash
# List all IRQs and their current CPU affinity

cat /proc/interrupts

# View the affinity mask for a specific IRQ (e.g., IRQ 42)
cat /proc/irq/42/smp_affinity

# View the CPU list for a specific IRQ
cat /proc/irq/42/smp_affinity_list
```

## Move All IRQs to Housekeeping CPUs

If CPUs 0-1 are your housekeeping cores and CPUs 2-7 are isolated for real-time:

```bash
# Set all IRQs to run on CPUs 0-1 only
# The affinity mask for CPUs 0-1 is 0x03 (binary: 00000011)
for irq_dir in /proc/irq/[0-9]*; do
    irq=$(basename "$irq_dir")
    # Skip IRQs that cannot be moved (e.g., IRQ 0, 2)
    echo 03 | sudo tee "/proc/irq/$irq/smp_affinity" > /dev/null 2>&1
done
```

## Use irqbalance with Banned CPUs

The `irqbalance` daemon distributes IRQs across CPUs by default. On real-time systems, configure it to avoid isolated cores.

```bash
# Edit the irqbalance configuration
sudo tee /etc/sysconfig/irqbalance > /dev/null << 'EOF'
# Ban CPUs 2-7 from receiving IRQs
IRQBALANCE_BANNED_CPUS=000000fc
EOF

# Restart irqbalance to apply
sudo systemctl restart irqbalance

# Verify irqbalance is respecting the ban list
sudo systemctl status irqbalance
```

## Alternatively, Disable irqbalance and Set Static Affinity

For maximum control in real-time environments, you may prefer to disable irqbalance entirely and set affinity manually.

```bash
# Stop and disable irqbalance
sudo systemctl stop irqbalance
sudo systemctl disable irqbalance

# Create a script to set static IRQ affinity at boot
sudo tee /usr/local/bin/set-irq-affinity.sh > /dev/null << 'SCRIPT'
#!/bin/bash
# Move all movable IRQs to housekeeping CPUs 0-1
for irq_dir in /proc/irq/[0-9]*; do
    irq=$(basename "$irq_dir")
    echo 03 > "/proc/irq/$irq/smp_affinity" 2>/dev/null
done
SCRIPT

sudo chmod +x /usr/local/bin/set-irq-affinity.sh

# Create a systemd service to run at boot
sudo tee /etc/systemd/system/set-irq-affinity.service > /dev/null << 'EOF'
[Unit]
Description=Set IRQ affinity for real-time CPUs
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/set-irq-affinity.sh

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable set-irq-affinity.service
```

## Use tuna for IRQ Management

```bash
# Install tuna
sudo dnf install -y tuna

# Move all IRQs away from CPUs 2-7
sudo tuna move --irqs='*' --cpus=0,1

# Verify the new IRQ distribution
sudo tuna show_irqs --irqs='*'
```

## Verify IRQs Are Off Isolated CPUs

```bash
# Check that no IRQs are currently effective on CPUs 2-7
for affinity_file in /proc/irq/[0-9]*/effective_affinity_list; do
    irq=${affinity_file%/*}
    irq=${irq##*/}
    cpu_list=$(cat "$affinity_file")
    awk -v cpu_list="$cpu_list" '
        BEGIN {
            split(cpu_list, ranges, ",")
            for (i in ranges) {
                split(ranges[i], bounds, "-")
                start = bounds[1]
                end = bounds[2] == "" ? bounds[1] : bounds[2]
                for (cpu = start; cpu <= end; cpu++) {
                    if (cpu >= 2 && cpu <= 7) found = 1
                }
            }
            exit found ? 0 : 1
        }
    ' && echo "IRQ $irq still effective on CPU(s): $cpu_list"
done
```

Properly steering IRQs away from real-time cores is one of the most effective ways to reduce worst-case latency on RHEL real-time systems.
