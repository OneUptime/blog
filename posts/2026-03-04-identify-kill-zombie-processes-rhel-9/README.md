# How to Identify and Kill Zombie Processes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Processes, Zombie, Troubleshooting, Linux, System Administration

Description: Learn how to identify and eliminate zombie processes on RHEL to maintain system health.

---

Zombie processes are processes that have finished execution but still have an entry in the process table because their parent has not read their exit status. While zombie processes do not consume CPU or memory resources, they occupy process table slots and can indicate a bug in the parent application.

## Prerequisites

- A RHEL system
- Basic command line knowledge

## What is a Zombie Process?

When a process finishes, it sends a SIGCHLD signal to its parent. The parent is expected to call `wait()` to read the child's exit status. Until the parent does this, the child remains in the process table as a zombie (state Z).

Zombies:
- Do not consume CPU or significant memory
- Do occupy a process table entry (PID)
- Cannot be killed with SIGKILL (they are already dead)
- Are cleaned up when their parent reads their exit status or when the parent exits

## Identifying Zombie Processes

Check if any zombies exist:

```bash
top -bn1 | head -5
```

Look for the "zombie" count in the Tasks line.

Find zombie processes:

```bash
ps aux | awk '$8 == "Z"'
```

Or:

```bash
ps -eo pid,ppid,stat,comm | grep -w Z
```

More detailed view:

```bash
ps -eo pid,ppid,stat,uid,comm | awk '$3 ~ /Z/'
```

## Understanding Zombie Process Information

```bash
ps -eo pid,ppid,stat,time,comm | grep -w Z
```

Output example:

```
  PID  PPID STAT     TIME COMMAND
 1234  5678 Z    00:00:00 defunct
```

- **PID 1234** - The zombie process
- **PPID 5678** - The parent process that has not called wait()
- **Z** - Zombie state
- **defunct** - Standard label for zombie processes

## Eliminating Zombie Processes

### Method 1: Signal the Parent Process

Send SIGCHLD to the parent to prompt it to call wait():

```bash
kill -SIGCHLD 5678
```

Check if the zombie is gone:

```bash
ps -eo pid,ppid,stat,comm | grep -w Z
```

### Method 2: Kill the Parent Process

If the parent does not respond to SIGCHLD, killing the parent causes the zombie to be adopted by PID 1 (systemd), which will immediately clean it up:

```bash
kill 5678
```

If the parent does not exit gracefully:

```bash
kill -9 5678
```

After the parent dies, the zombies will be reaped by init/systemd.

### Method 3: Wait for Parent to Exit

If the parent is a critical service, restarting it will clean up its zombies:

```bash
sudo systemctl restart my-service
```

## Preventing Zombie Processes

### In Application Code

Properly handle SIGCHLD in parent processes. In C:

```c
#include <signal.h>
#include <sys/wait.h>

void sigchld_handler(int sig) {
    while (waitpid(-1, NULL, WNOHANG) > 0);
}

int main() {
    signal(SIGCHLD, sigchld_handler);
    // ... rest of program
}
```

In shell scripts:

```bash
wait $child_pid
```

### Using Double Fork

The double-fork technique prevents zombies by having the child fork again and exit immediately. The grandchild becomes an orphan adopted by init:

```bash
# Parent forks child
# Child forks grandchild
# Child exits immediately (parent waits for child)
# Grandchild runs independently, adopted by init
```

## Monitoring for Zombies

Set up a simple monitoring check:

```bash
zombie_count=$(ps aux | awk '$8 == "Z"' | wc -l)
if [ "$zombie_count" -gt 0 ]; then
    echo "WARNING: $zombie_count zombie processes found"
    ps aux | awk '$8 == "Z"'
fi
```

## Conclusion

Zombie processes on RHEL are usually harmless in small numbers but indicate improper process management by the parent. Signal the parent with SIGCHLD or restart the parent service to clean up zombies. For long-term fixes, ensure applications properly handle child process termination.
