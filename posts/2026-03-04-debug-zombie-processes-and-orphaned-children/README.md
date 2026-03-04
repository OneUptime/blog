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

```bash
Process exits -> Becomes zombie -> Parent calls wait() -> Entry removed
```

If the parent never calls wait(), the zombie persists.

## What Are Orphaned Processes

An orphan process is a child whose parent has exited. The init system (PID 1, systemd on RHEL) adopts orphans and eventually reaps them.

## Step 1: Find Zombie Processes

```bash
ps aux | awk '$8 == "Z" {print}'
```

Or:

```bash
ps -eo pid,ppid,stat,cmd | grep -w Z
```

Count zombies:

```bash
ps -eo stat | grep -c Z
```

## Step 2: Identify the Parent Process

```bash
ps -eo pid,ppid,stat,cmd | grep -w Z
```

The PPID column shows which process is not reaping its children. Fix or restart that process.

## Step 3: Remove Zombie Processes

You cannot kill a zombie directly (it is already dead). You have two options:

1. Signal the parent to reap its children:

```bash
kill -SIGCHLD <parent_pid>
```

2. Kill the parent process (zombies get re-parented to init, which reaps them):

```bash
kill <parent_pid>
```

## Step 4: Find Orphaned Processes

Orphans have PPID 1 (adopted by systemd):

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
import os
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
zombie_count=$(ps -eo stat | grep -c Z)
if [ "$zombie_count" -gt 10 ]; then
    echo "WARNING: $zombie_count zombie processes detected"
fi
```

## Conclusion

Zombie and orphan processes on RHEL are typically symptoms of buggy parent processes that do not properly reap their children. The fix is to correct the parent's signal handling or restart it. systemd as PID 1 handles orphan reaping automatically, but zombies require the original parent to call wait().
