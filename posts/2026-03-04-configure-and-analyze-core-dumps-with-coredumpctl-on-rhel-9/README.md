# How to Configure and Analyze Core Dumps with coredumpctl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on configure and analyze core dumps with coredumpctl using Red Hat Enterprise Linux 9.

---

When a process crashes on modern RHEL systems, systemd-coredump captures the core dump automatically. The coredumpctl utility lets you list, inspect, and debug these core dumps without needing to configure traditional core dump file paths.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

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
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
