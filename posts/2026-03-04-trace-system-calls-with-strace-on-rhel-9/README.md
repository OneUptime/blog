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

## Step 2: Configure the Service

Trace a running process or command:

```bash
# Trace a command
strace -o /tmp/trace.log ls -la /etc

# Trace a running process by PID
strace -p $(pidof nginx) -o /tmp/nginx-trace.log

# Show only file-related syscalls
strace -e trace=file -p <PID>

# Show only network-related syscalls
strace -e trace=network -p <PID>

# Count syscalls and show summary
strace -c ls -la /etc
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Review the generated output or log file
# Look for error patterns, failed calls, or resource issues

# Check that debug tools are installed
rpm -q gdb strace ltrace valgrind
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
