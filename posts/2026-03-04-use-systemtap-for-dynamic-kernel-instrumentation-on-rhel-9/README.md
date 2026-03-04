# How to Use SystemTap for Dynamic Kernel Instrumentation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kernel, Linux

Description: Step-by-step guide on use systemtap for dynamic kernel instrumentation using Red Hat Enterprise Linux 9.

---

SystemTap lets you write scripts that instrument a running kernel without recompiling or rebooting. You can trace function calls, monitor variables, aggregate statistics, and produce reports, all while the system continues to run.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Install and use SystemTap:

```bash
# Install SystemTap and kernel debug info
sudo dnf install -y systemtap systemtap-runtime
sudo stap-prep

# Run a simple probe
sudo stap -e 'probe syscall.open { printf("%s opened %s\n", execname(), argstr) }'

# Trace disk I/O per process
sudo stap -e '
probe ioblock.request {
    printf("%s(%d) %s %d bytes\n", execname(), pid(), bio_rw_str(rw), size)
}
'
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
