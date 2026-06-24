# How to Debug Zombie Processes and Orphaned Children on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Process Management, Debugging, Linux

Description: Learn how to debug Zombie Processes and Orphaned Children on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Zombie processes and orphaned children are common issues that can accumulate and exhaust system resources if left unchecked. Understanding what causes them and how to clean them up is essential for RHEL system administration.

## Prerequisites

- RHEL
- Basic understanding of process lifecycle

## What Are Zombie Processes

A zombie (defunct) process has finished execution but its parent has not yet called `wait()` to read its exit status. The process entry remains in the process table, consuming a PID but no CPU or memory.

```text
Process exits -> Becomes zombie -> Parent calls wait() -> Entry removed
```

If the parent never calls `wait()`, the zombie persists.

## What Are Orphaned Processes

An orphan process is a child whose parent has exited. On RHEL, the init system (PID 1, systemd) normally adopts orphans, though Linux can also re-parent them to the nearest child subreaper. The adopting process reaps them when they terminate.

## Step 1: Find Zombie Processes

```bash
ps aux | awk '$8 ~ /^Z/ {print}'
```

Or:

```bash
ps -eo pid,ppid,stat,cmd | awk '$3 ~ /^Z/'
```

Count zombies:

```bash
ps -eo stat= | awk '$1 ~ /^Z/ {count++} END {print count+0}'
```

## Step 2: Identify the Parent Process

```bash
ps -eo pid,ppid,stat,cmd | awk '$3 ~ /^Z/'
```

The PPID column shows which process is not reaping its children. Fix or restart that process.

## Step 3: Remove Zombie Processes

You cannot kill a zombie directly (it is already dead). You have two options:

1. Signal the parent to reap its children:

```bash
kill -SIGCHLD <parent_pid>
```

2. Kill the parent process (zombies get re-parented to init or a child subreaper, which reaps them):

```bash
kill <parent_pid>
```

## Step 4: Find Orphaned Processes

Processes adopted by systemd have PPID 1:

```bash
ps -eo pid,ppid,cmd | awk '$2 == 1 && $1 != 1'
```

Note that many legitimate daemons also have PPID 1, so not all results are problematic.

## Step 5: Prevent Zombies in Your Code

### Bash

```bash
#!/bin/bash
# Use wait to reap children

child_process &
wait $!
```

### Python

```python
import signal

# Automatically reap children
signal.signal(signal.SIGCHLD, signal.SIG_IGN)
```

### C

```c
#include <sys/wait.h>
#include <signal.h>

void sigchld_handler(int sig) {
    while (waitpid(-1, NULL, WNOHANG) > 0);
}

int main() {
    signal(SIGCHLD, sigchld_handler);
    // ... fork children ...
}
```

## Step 6: Monitor for Zombie Accumulation

Add a check to your monitoring:

```bash
zombie_count=$(ps -eo stat= | awk '$1 ~ /^Z/ {count++} END {print count+0}')
if [ "$zombie_count" -gt 10 ]; then
    echo "WARNING: $zombie_count zombie processes detected"
fi
```

## Conclusion

Zombie and orphan processes on RHEL are typically symptoms of buggy parent processes that do not properly reap their children. The fix is to correct the parent's signal handling or restart it. systemd as PID 1, or a configured child subreaper, handles orphan reaping automatically, but zombies require their current parent to call `wait()`.
