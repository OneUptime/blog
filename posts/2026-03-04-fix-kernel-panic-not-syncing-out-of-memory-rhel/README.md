# How to Fix 'Kernel Panic - Not Syncing: Out of Memory' on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel Panic, OOM, Memory, Troubleshooting

Description: Diagnose and fix kernel panics caused by out-of-memory conditions on RHEL, including configuring the OOM killer and adding swap space.

---

A kernel panic with "Out of memory" means the system exhausted all available memory and swap, and the OOM (Out-of-Memory) killer could not free enough memory to continue. By default, the kernel panics when the OOM killer fails.

## Understanding the Panic

```bash
# After rebooting, check the previous boot's kernel log
sudo journalctl -k -b -1 | grep -i "out of memory\|oom\|panic"

# Check if the OOM killer was invoked before the panic
sudo journalctl -b -1 | grep "Out of memory"
```

## Preventing the Panic: Configure OOM Behavior

```bash
# Check current OOM panic setting
cat /proc/sys/vm/panic_on_oom
# 0 = OOM killer runs (default), 1 = always panic

# Ensure panic_on_oom is 0 so the OOM killer can recover
sudo sysctl -w vm.panic_on_oom=0

# Make it persistent
echo "vm.panic_on_oom = 0" | sudo tee /etc/sysctl.d/99-oom.conf
sudo sysctl -p /etc/sysctl.d/99-oom.conf
```

## Adding Swap Space

If the system has insufficient swap, add more.

```bash
# Check current swap
free -h
swapon --show

# Create a swap file (4GB example)
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it persistent
echo "/swapfile none swap defaults 0 0" | sudo tee -a /etc/fstab
```

## Identifying Memory-Hungry Processes

```bash
# Find the top memory consumers
ps aux --sort=-%mem | head -10

# Check memory usage by cgroup
systemd-cgtop -m

# Monitor memory usage in real time
top -o %MEM
```

## Setting Memory Limits with systemd

Prevent a single service from consuming all memory.

```bash
# Set a memory limit for a service
sudo systemctl edit httpd.service
```

```ini
[Service]
MemoryMax=2G
MemoryHigh=1.5G
```

```bash
# Apply the change
sudo systemctl daemon-reload
sudo systemctl restart httpd
```

## Tuning Overcommit Settings

```bash
# Check current overcommit mode
cat /proc/sys/vm/overcommit_memory
# 0 = heuristic (default), 1 = always overcommit, 2 = strict

# For servers, strict mode prevents overcommit
sudo sysctl -w vm.overcommit_memory=2
sudo sysctl -w vm.overcommit_ratio=80

# Make persistent
echo "vm.overcommit_memory = 2" | sudo tee -a /etc/sysctl.d/99-memory.conf
echo "vm.overcommit_ratio = 80" | sudo tee -a /etc/sysctl.d/99-memory.conf
```

The combination of sufficient swap, systemd memory limits, and proper overcommit settings prevents OOM kernel panics in most production environments.
