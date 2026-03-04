# How to Understand and Tune the OOM Killer Behavior on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, OOM Killer, Linux

Description: Learn how to understand and Tune the OOM Killer Behavior on RHEL with step-by-step instructions, configuration examples, and best practices.

---

The OOM (Out of Memory) Killer is a kernel mechanism that terminates processes when the system runs critically low on memory. Understanding how it selects victims and how to tune its behavior is essential for keeping critical services running on RHEL.

## Prerequisites

- RHEL
- Root or sudo access

## How the OOM Killer Works

When the kernel cannot allocate memory and all reclaim attempts fail, it calculates an "OOM score" for each process. The process with the highest score gets killed first.

The score is based on:
- Memory usage (RSS)
- Process age
- CPU time consumed
- The `oom_score_adj` value set by the administrator

## Step 1: View OOM Scores

```bash
ps -eo pid,oom_score,oom_score_adj,comm --sort=-oom_score | head -20
```

## Step 2: Protect Critical Services

Lower the OOM score adjustment to make a process less likely to be killed:

```bash
echo -500 | sudo tee /proc/$(pidof sshd)/oom_score_adj
```

Range: -1000 (never kill) to 1000 (always kill first).

For systemd services:

```ini
[Service]
OOMScoreAdjust=-500
```

## Step 3: Make a Process Immune

```bash
echo -1000 | sudo tee /proc/$(pidof critical-app)/oom_score_adj
```

Or in the service unit:

```ini
[Service]
OOMScoreAdjust=-1000
```

Warning: if too many processes are immune, the OOM killer may not be able to free enough memory and the system could hang.

## Step 4: Configure Memory Overcommit

Check the current policy:

```bash
cat /proc/sys/vm/overcommit_memory
```

Values:
- `0` - Heuristic overcommit (default)
- `1` - Always overcommit (never deny malloc)
- `2` - Strict overcommit (deny if exceeding commit limit)

For stricter memory accounting:

```bash
sudo sysctl -w vm.overcommit_memory=2
sudo sysctl -w vm.overcommit_ratio=80
```

Make persistent:

```bash
echo "vm.overcommit_memory=2" | sudo tee -a /etc/sysctl.d/99-memory.conf
echo "vm.overcommit_ratio=80" | sudo tee -a /etc/sysctl.d/99-memory.conf
sudo sysctl --system
```

## Step 5: Check OOM Killer History

```bash
journalctl -k | grep -i "oom"
dmesg | grep -i "oom"
```

## Step 6: Use systemd Memory Limits Instead

Prevent OOM situations by setting per-service memory limits:

```ini
[Service]
MemoryMax=2G
MemoryHigh=1G
```

When a service hits `MemoryHigh`, systemd throttles it. When it hits `MemoryMax`, the process is killed by the cgroup OOM handler (more targeted than the system-wide OOM killer).

## Step 7: Test OOM Behavior

```bash
sudo stress-ng --vm 1 --vm-bytes 90% -t 60s
```

Watch the kernel logs:

```bash
journalctl -kf
```

## Conclusion

The OOM Killer on RHEL is your last line of defense against memory exhaustion. Protect critical services with negative OOM score adjustments, use systemd memory limits for containment, and consider strict overcommit settings for production servers where predictability matters more than flexibility.
