# How to Fix 'Cannot Allocate Memory' Fork Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Troubleshooting, Fork, Process Limits

Description: Diagnose and fix 'Cannot allocate memory' fork errors on RHEL caused by exhausted memory, process limits, or PID exhaustion.

---

The "Cannot allocate memory" error during fork() can be caused by insufficient memory, too many processes, or exhausted PID space. This guide helps you identify which cause applies and how to fix it.

## Diagnosing the Root Cause

```bash
# Check available memory
free -h

# Check process count against limits
ps aux | wc -l
cat /proc/sys/kernel/pid_max

# Check user-level process limits
ulimit -u

# Check system-wide process count
cat /proc/sys/kernel/threads-max
```

## Cause 1: Insufficient Memory

```bash
# If memory is nearly exhausted
free -h
# Look at the "available" column

# Find the top memory consumers
ps aux --sort=-%mem | head -10

# Add swap space if needed
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile none swap defaults 0 0" | sudo tee -a /etc/fstab
```

## Cause 2: Too Many Processes (nproc Limit)

```bash
# Check the user's process limit
ulimit -u

# Check how many processes the user is running
ps -u $(whoami) | wc -l

# Increase the nproc limit
sudo vi /etc/security/limits.d/99-nproc.conf
```

```bash
*    soft    nproc    65536
*    hard    nproc    65536
```

```bash
# For systemd services
sudo systemctl edit myservice.service
```

```ini
[Service]
LimitNPROC=65536
```

## Cause 3: PID Space Exhausted

```bash
# Check the maximum PID value
cat /proc/sys/kernel/pid_max

# If process count is near the PID max, increase it
sudo sysctl -w kernel.pid_max=4194304
echo "kernel.pid_max = 4194304" | sudo tee /etc/sysctl.d/99-pidmax.conf

# Also check threads-max
cat /proc/sys/kernel/threads-max
sudo sysctl -w kernel.threads-max=4194304
```

## Cause 4: Overcommit Rejection

```bash
# If overcommit is set to strict mode
cat /proc/sys/vm/overcommit_memory
# 2 = strict mode, rejects forks when commit limit is exceeded

# Check the commit limit vs current committed memory
grep -E "CommitLimit|Committed_AS" /proc/meminfo

# If Committed_AS exceeds CommitLimit, fork will fail
# Options:
# 1. Add more memory or swap
# 2. Increase overcommit_ratio
sudo sysctl -w vm.overcommit_ratio=90

# 3. Switch to heuristic mode (less safe but more permissive)
sudo sysctl -w vm.overcommit_memory=0
```

## Cause 5: cgroup Memory Limit

```bash
# Check if a cgroup is limiting the process
cat /sys/fs/cgroup/system.slice/myservice.service/memory.max

# If the service has a memory limit, increase it
sudo systemctl edit myservice.service
```

```ini
[Service]
MemoryMax=8G
```

## Preventing Future Issues

```bash
# Monitor memory and process count
# Add these to your monitoring system
cat /proc/meminfo | grep MemAvailable
ps aux | wc -l
cat /proc/sys/kernel/threads-max
```

Start by checking `free -h` to determine if memory is the issue, then check process limits with `ulimit -u`. The root cause determines the fix.
