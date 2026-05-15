# How to Configure and Analyze Core Dumps with coredumpctl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on configure and analyze core dumps with coredumpctl using Red Hat Enterprise Linux 9.

---

When a process crashes on RHEL 9 systems configured to use systemd-coredump, systemd-coredump captures the core dump automatically. The coredumpctl utility lets you list, inspect, and debug these core dumps without needing to configure traditional core dump file paths.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Verify that the kernel is configured to send core dumps to systemd-coredump:

```bash
sysctl kernel.core_pattern
```

The output should start with:

```text
kernel.core_pattern = |/usr/lib/systemd/systemd-coredump
```

Work with core dumps using coredumpctl:

```bash
# List all captured core dumps

coredumpctl list

# Show info about the latest crash
coredumpctl info

# Debug the latest crash with gdb
coredumpctl debug

# Export a core dump to a file
coredumpctl dump -o /tmp/core.dump

# Show crashes for a specific program
coredumpctl list /usr/bin/myapp
```

Configure core dump storage:

```bash
# Edit coredump configuration
sudo vi /etc/systemd/coredump.conf
```

```ini
[Coredump]
Storage=external
Compress=yes
MaxUse=2G
KeepFree=1G
```

## Step 3: Enable and Start the Service

```bash
# Check the socket that receives core dump data
sudo systemctl status systemd-coredump.socket

# Optional: start the socket if it is inactive
sudo systemctl start systemd-coredump.socket

# coredump.conf changes take effect the next time a core dump is received
coredumpctl list
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check that systemd-coredump is configured as the core dump handler
sysctl kernel.core_pattern

# Review recent core dump logs
journalctl MESSAGE_ID=fc2e22bc6ee647b6b90729ab34a250b1 --no-pager -n 20
```

## Troubleshooting

- If core dumps are not captured, verify that `sysctl kernel.core_pattern` starts with `|/usr/lib/systemd/systemd-coredump`.
- If `coredumpctl debug` cannot start a debugger, install GDB with `sudo dnf install gdb`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
