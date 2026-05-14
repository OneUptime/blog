# How to Trace System Calls with strace on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on trace system calls with strace using Red Hat Enterprise Linux 9.

---

strace intercepts and records system calls made by a process. When a program behaves unexpectedly, strace shows you exactly what it is asking the kernel to do, which files it opens, which network connections it makes, and where it fails.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install strace

```bash
sudo dnf install -y strace
rpm -q strace
```

## Step 2: Trace System Calls

Trace a running process or command:

```bash
# Trace a command

strace -o /tmp/trace.log ls -la /etc

# Trace a running process by PID
strace -p $(pidof nginx) -o /tmp/nginx-trace.log

# Show only file-related syscalls
strace -e trace=%file -p <PID>

# Show only network-related syscalls
strace -e trace=%network -p <PID>

# Count syscalls and show summary
strace -c ls -la /etc
```

## Step 3: Refine the Trace Output

```bash
# Follow child processes and threads
strace -f -o /tmp/trace.log <command>

# Add timestamps and syscall duration
strace -tt -T -o /tmp/trace.log <command>

# Save output while also viewing it in the terminal
strace <command> 2>&1 | tee /tmp/trace.log
```


## Verification

Confirm everything is working by reviewing the generated output or log file:

```bash
# Review the generated output or log file
# Look for error patterns, failed calls, or resource issues

# Check that strace is installed
rpm -q strace
```

## Troubleshooting

- If attaching to a process fails, verify that the PID exists and run `strace` with sufficient privileges, such as `sudo strace -p <PID>`.
- Ensure `strace` is installed: `sudo dnf install -y strace`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the affected process and review trace logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
