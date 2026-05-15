# How to Deploy Cockpit-389ds for Directory Server Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Linux

Description: Step-by-step guide on deploy cockpit-389ds for directory server management using Red Hat Enterprise Linux 9.

---

Deploying Cockpit-389ds for Directory Server Management on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL 9 with a valid subscription and Red Hat Directory Server repositories enabled
- Root or sudo access
- A terminal session

## Step 1: Install Directory Server and Cockpit

Enable the Red Hat Directory Server module and install the Directory Server and Cockpit packages:

```bash
# Enable the Red Hat Directory Server module
sudo dnf module enable redhat-ds:12

# Install Directory Server and the Cockpit add-on
sudo dnf install cockpit 389-ds-base cockpit-389-ds
```

Enable the Cockpit web console socket:

```bash
# Enable and start the web console
sudo systemctl enable --now cockpit.socket
```

## Step 2: Create a Directory Server Instance

Create a Directory Server instance using the interactive installer:

```bash
# Start the interactive installer
sudo dscreate interactive
```

Answer the prompts for your environment. Key parameters include the instance name, LDAP port, LDAPS port, Directory Manager DN, Directory Manager password, and database suffix.

## Step 3: Enable and Manage the Directory Server Instance

```bash
# Enable the instance to start on boot
sudo systemctl enable dirsrv@instance_name

# Start the instance
sudo dsctl instance_name start

# Check the status
sudo dsctl instance_name status
```

## Step 4: Configure the Firewall

```bash
# Open the Cockpit web console port
sudo firewall-cmd --permanent --add-service=cockpit

# Open the default LDAP and LDAPS ports
sudo firewall-cmd --permanent --add-port={389/tcp,636/tcp}
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the Directory Server instance status
sudo dsctl instance_name status

# Check the systemd unit status
sudo systemctl status dirsrv@instance_name

# Review recent logs
sudo journalctl -u dirsrv@instance_name --no-pager -n 20
```

## Troubleshooting

- If the instance fails to start, check the logs with `sudo journalctl -u dirsrv@instance_name -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports: `sudo firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep -E '^(cockpit|cockpit-389-ds|389-ds-base)'`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
