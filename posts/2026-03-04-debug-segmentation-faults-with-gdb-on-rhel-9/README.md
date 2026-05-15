# How to Debug Segmentation Faults with gdb on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on debug segmentation faults with gdb using Red Hat Enterprise Linux 9.

---

A segmentation fault occurs when a program tries to access memory it should not. gdb (GNU Debugger) lets you examine the exact point where the crash happens, inspect variable values, and walk through the call stack to find the root cause.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Debugging Tools

Debug a segmentation fault:

```bash
# Install gdb and debug symbols

sudo dnf install -y gdb dnf-utils
sudo dnf debuginfo-install -y <package-name>

# Run the program under gdb
gdb ./my_program
(gdb) run
# After the crash:
(gdb) bt        # Print backtrace
(gdb) info registers  # Show register values
(gdb) list       # Show source around crash point

# Or analyze a core dump
coredumpctl debug <PID|COMM|EXE>
```

## Step 2: Enable Core Dumps

```bash
# Enable core dumps for systemd-managed processes
sudo sed -i 's/^#\?DumpCore=.*/DumpCore=yes/' /etc/systemd/system.conf
sudo sed -i 's/^#\?DefaultLimitCORE=.*/DefaultLimitCORE=infinity/' /etc/systemd/system.conf

# Reload the systemd manager configuration
sudo systemctl daemon-reexec

# Allow core dumps in the current shell session
ulimit -c unlimited
```


## Verification

Confirm everything is working by checking the tools and available core dumps:

```bash
# Review the generated output or log file
# Look for error patterns, failed calls, or resource issues

# Check that debug tools are installed
rpm -q gdb dnf-utils

# List captured core dumps
coredumpctl list
```

## Troubleshooting

- If the application fails under a systemd service, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor application logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
