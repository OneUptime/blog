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

## Step 2: Configure the Service

Debug a segmentation fault:

```bash
# Install gdb and debug symbols
sudo dnf install -y gdb
sudo dnf debuginfo-install -y <package-name>

# Run the program under gdb
gdb ./my_program
(gdb) run
# After the crash:
(gdb) bt        # Print backtrace
(gdb) info registers  # Show register values
(gdb) list       # Show source around crash point

# Or analyze a core dump
coredumpctl debug <PID>
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
