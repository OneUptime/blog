# How to Install and Configure Webmin on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on install and configure webmin using Red Hat Enterprise Linux 9.

---

Webmin can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Add the official Webmin repository
curl -o webmin-setup-repo.sh https://raw.githubusercontent.com/webmin/webmin/master/webmin-setup-repo.sh
sudo sh webmin-setup-repo.sh

# Install Webmin
sudo dnf install -y webmin
```

The setup script configures the Webmin repository and installs the required GPG keys so that Webmin can be installed and updated with `dnf`.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/webmin/miniserv.conf
```

Adjust the settings according to your requirements. Key parameters to configure include allowed addresses, denied addresses, SSL settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart webmin
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable webmin

# Start the service
sudo systemctl start webmin

# Check the status
sudo systemctl status webmin

# Allow access to the default Webmin port if firewalld is running
sudo firewall-cmd --permanent --add-port=10000/tcp
sudo firewall-cmd --reload
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status webmin

# Review recent logs
journalctl -u webmin --no-pager -n 20
```

After successful installation, open `https://<Your-Server-IP>:10000` in your browser.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u webmin -e --no-pager`.
- Ensure Webmin is installed: `rpm -qa | grep webmin`.
- If the browser cannot connect, confirm that the firewall allows TCP port `10000`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
