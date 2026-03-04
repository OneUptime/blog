# How to Send and Handle Unix Signals for Process Control on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Signals, Process Management, Linux

Description: Learn how to send and Handle Unix Signals for Process Control on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Unix signals are software interrupts used to communicate with processes. Understanding how to send and handle signals is essential for process control, graceful shutdowns, and debugging on RHEL.

## Prerequisites

- RHEL
- Basic understanding of process management

## Common Signals

| Signal | Number | Default Action | Common Use |
|--------|--------|---------------|------------|
| SIGHUP | 1 | Terminate | Reload configuration |
| SIGINT | 2 | Terminate | Ctrl+C interrupt |
| SIGQUIT | 3 | Core dump | Ctrl+\ quit |
| SIGKILL | 9 | Terminate | Force kill (cannot be caught) |
| SIGTERM | 15 | Terminate | Graceful shutdown |
| SIGUSR1 | 10 | Terminate | User-defined |
| SIGUSR2 | 12 | Terminate | User-defined |
| SIGSTOP | 19 | Stop | Pause process (cannot be caught) |
| SIGCONT | 18 | Continue | Resume stopped process |
| SIGCHLD | 17 | Ignore | Child process status changed |

## Step 1: Send Signals with kill

```bash
kill -SIGTERM 12345
kill -15 12345
kill 12345          # SIGTERM is the default
```

Force kill (use as a last resort):

```bash
kill -9 12345
```

## Step 2: Send Signals by Process Name

```bash
killall -SIGHUP nginx
pkill -USR1 myapp
```

## Step 3: Signal All Processes in a Group

```bash
kill -TERM -$(ps -o pgid= -p 12345 | tr -d ' ')
```

The negative PID sends the signal to the entire process group.

## Step 4: Use Signals for Configuration Reload

Many daemons reload their configuration on SIGHUP:

```bash
sudo kill -HUP $(pidof nginx)
sudo systemctl reload nginx    # Does the same thing
```

## Step 5: Handle Signals in a Bash Script

```bash
#!/bin/bash

cleanup() {
    echo "Caught signal, cleaning up..."
    rm -f /tmp/myapp.lock
    exit 0
}

trap cleanup SIGTERM SIGINT SIGHUP
trap "" SIGPIPE   # Ignore SIGPIPE

echo "Running... PID: $$"
while true; do
    sleep 1
done
```

## Step 6: Handle Signals in Python

```python
import signal
import sys

def handler(signum, frame):
    print(f"Received signal {signum}")
    sys.exit(0)

signal.signal(signal.SIGTERM, handler)
signal.signal(signal.SIGHUP, handler)
```

## Step 7: Monitor Signal Delivery

Use strace to watch signals:

```bash
strace -e trace=signal -p $(pidof myapp)
```

## Step 8: Pause and Resume Processes

```bash
kill -STOP $(pidof myapp)    # Pause
kill -CONT $(pidof myapp)    # Resume
```

## Conclusion

Signals are the primary mechanism for inter-process communication and process control on RHEL. Understanding how to send, catch, and handle signals correctly is fundamental to managing services and building robust applications.
