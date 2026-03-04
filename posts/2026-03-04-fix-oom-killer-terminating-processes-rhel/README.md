# How to Fix OOM Killer Terminating Processes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, OOM Killer, Memory, Troubleshooting, Performance

Description: Diagnose OOM (Out of Memory) killer events on RHEL, understand why processes are being terminated, and configure protections for critical services.

---

The Linux OOM killer terminates processes when the system runs out of memory. While it prevents a complete system crash, losing critical processes can be just as disruptive. This guide covers how to diagnose, prevent, and control OOM kills.

## Diagnosing OOM Kills

```bash
# Check for OOM killer events in the system log
sudo journalctl -k | grep -i "out of memory\|oom-kill\|killed process"

# Get detailed OOM information
sudo dmesg | grep -A 10 "Out of memory"

# The log shows which process was killed and why
# Example: Out of memory: Killed process 1234 (java) total-vm:4096000kB
```

## Understanding OOM Scores

```bash
# Each process has an OOM score; higher scores get killed first
# View a process's OOM score
cat /proc/$(pgrep -f httpd | head -1)/oom_score

# View the adjustable OOM score
cat /proc/$(pgrep -f httpd | head -1)/oom_score_adj
# Range: -1000 to 1000 (-1000 = never kill, 1000 = always kill first)
```

## Protecting Critical Services from OOM

```bash
# Protect a service by adjusting its OOM score via systemd
sudo systemctl edit httpd.service
```

```ini
[Service]
OOMScoreAdjust=-900
```

```bash
# Apply the change
sudo systemctl daemon-reload
sudo systemctl restart httpd

# For the most critical services (use sparingly)
# OOMScoreAdjust=-1000 disables OOM killing entirely
```

## Setting Memory Limits to Prevent OOM

```bash
# Set memory limits for a service to prevent it from consuming all memory
sudo systemctl edit mysql.service
```

```ini
[Service]
MemoryMax=4G
MemoryHigh=3G
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart mysql
```

## Adding Swap Space

```bash
# Check current swap
free -h

# If swap is insufficient, add a swap file
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make persistent
echo "/swapfile none swap defaults 0 0" | sudo tee -a /etc/fstab
```

## Tuning System-Wide Memory Settings

```bash
# Reduce swappiness to keep more data in RAM
# Lower values mean the kernel prefers to reclaim page cache
sudo sysctl -w vm.swappiness=10
echo "vm.swappiness = 10" | sudo tee /etc/sysctl.d/99-swappiness.conf

# Set minimum free memory before OOM is triggered
sudo sysctl -w vm.min_free_kbytes=131072
echo "vm.min_free_kbytes = 131072" | sudo tee /etc/sysctl.d/99-minfree.conf
```

## Monitoring for OOM Conditions

```bash
# Set up a simple memory monitor
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|SwapFree"

# Watch memory pressure in real time
watch -n 1 'free -h'
```

The best defense against OOM kills is proactive monitoring and setting memory limits on services. Use systemd's MemoryMax to cap individual services rather than relying on the OOM killer to make decisions.
