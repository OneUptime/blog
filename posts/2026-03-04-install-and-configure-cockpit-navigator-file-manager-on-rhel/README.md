# How to Install and Configure Cockpit-Navigator File Manager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Linux

Description: Step-by-step guide on install and configure cockpit-navigator file manager using Red Hat Enterprise Linux 9.

---

The Cockpit file manager can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y cockpit cockpit-files
```

The `cockpit` package provides the RHEL web console, and `cockpit-files` provides the file manager add-on.

## Step 2: Configure the Service

Enable and start the Cockpit socket, which runs the web console on port 9090:

```bash
# Enable and start the Cockpit web console
sudo systemctl enable --now cockpit.socket
```

If you use `firewalld`, allow Cockpit through the firewall:

```bash
# Open the Cockpit service in the firewall
sudo firewall-cmd --add-service=cockpit --permanent
sudo firewall-cmd --reload
```

## Step 3: Enable and Start the Service

```bash
# Check the status
sudo systemctl status cockpit.socket
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status cockpit.socket

# Review recent logs
journalctl -u cockpit.socket --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u cockpit.socket -e --no-pager`.
- Ensure all required packages are installed: `rpm -q cockpit cockpit-files`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
