# How to Install and Configure Wazuh Security Platform on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Linux

Description: Step-by-step guide on install and configure wazuh security platform using Red Hat Enterprise Linux 9.

---

Wazuh Security Platform can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL 9 with a valid subscription on a 64-bit x86_64 or ARM64 host
- Root or sudo access
- A terminal session and internet access

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Download and run the Wazuh installation assistant
curl -sO https://packages.wazuh.com/4.14/wazuh-install.sh
sudo bash ./wazuh-install.sh -a
```

The installation assistant installs and configures the Wazuh server, Wazuh indexer, and Wazuh dashboard on the same host. When it finishes, it prints the dashboard URL and the generated `admin` password.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the Wazuh manager configuration file
sudo vi /var/ossec/etc/ossec.conf
```

Adjust the settings according to your requirements. For example, the Wazuh manager agent connection service is configured in the `<remote>` block, where you can review the connection type, port, protocol, and queue size.

```bash
# Restart the service to apply changes
sudo systemctl restart wazuh-manager
```

## Step 3: Enable and Start the Service

```bash
# Reload systemd units after installation
sudo systemctl daemon-reload

# Enable the Wazuh services to start on boot
sudo systemctl enable wazuh-manager wazuh-indexer wazuh-dashboard

# Start the Wazuh services
sudo systemctl start wazuh-manager wazuh-indexer wazuh-dashboard

# Check the status
sudo systemctl status wazuh-manager wazuh-indexer wazuh-dashboard
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the Wazuh service status
sudo systemctl status wazuh-manager wazuh-indexer wazuh-dashboard

# Review recent logs
journalctl -u wazuh-manager --no-pager -n 20
```

## Troubleshooting

- If the Wazuh manager fails to start, check the logs with `journalctl -u wazuh-manager -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required Wazuh packages are installed: `rpm -qa | grep wazuh`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
