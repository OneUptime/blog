# How to Debug Shared Library Loading Issues with LD_DEBUG on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Debugging, Linux

Description: Step-by-step guide on debug shared library loading issues with ld_debug using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for completing this task on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Use LD_DEBUG to troubleshoot library loading:

```bash
# Show all library loading activity

LD_DEBUG=all ./my_program 2>&1 | head -100

# Show only library search paths
LD_DEBUG=libs ./my_program 2>&1

# Show symbol resolution
LD_DEBUG=symbols ./my_program 2>&1

# Show binding information
LD_DEBUG=bindings ./my_program 2>&1

# Write LD_DEBUG output to /tmp/debug.<pid>
LD_DEBUG=libs LD_DEBUG_OUTPUT=/tmp/debug ./my_program
```

Available LD_DEBUG categories: `libs`, `reloc`, `files`, `symbols`, `bindings`, `versions`, `scopes`, `statistics`, `unused`, `help`, `all`. The `all` category does not include `statistics` or `unused`.

## Step 3: Debug a systemd Service

To debug a service, pass the LD_DEBUG settings through a systemd drop-in:

```bash
# Create an override for the service
sudo systemctl edit <service-name>
```

Add the following lines:

```ini
[Service]
Environment=LD_DEBUG=libs
Environment=LD_DEBUG_OUTPUT=/tmp/ld-debug
```

Then restart the service:

```bash
# Restart the service with the debug environment
sudo systemctl restart <service-name>

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

# Review LD_DEBUG output written by the service
sudo ls -l /tmp/ld-debug.*
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
