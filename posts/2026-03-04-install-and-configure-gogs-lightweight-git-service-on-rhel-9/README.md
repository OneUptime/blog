# How to Install and Configure Gogs Lightweight Git Service on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Git, Linux

Description: Step-by-step guide on install and configure gogs lightweight git service using Red Hat Enterprise Linux 9.

---

Gogs Lightweight Git Service can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A database backend supported by Gogs. This guide uses SQLite 3 for a small installation.

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y git wget tar openssh-server

# Create a dedicated user for Gogs
sudo useradd --system --create-home --shell /bin/bash git

# Download and install the Gogs binary
wget https://github.com/gogs/gogs/releases/download/v0.14.2/gogs_v0.14.2_linux_amd64.tar.gz -O /tmp/gogs.tar.gz
sudo tar -xzf /tmp/gogs.tar.gz -C /home/git
sudo chown -R git:git /home/git/gogs
```

Replace the release URL with the correct archive for your CPU architecture if you are not using x86_64.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo -u git mkdir -p /home/git/gogs/custom/conf
sudo -u git vi /home/git/gogs/custom/conf/app.ini
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

```ini
RUN_USER = git
RUN_MODE = prod

[server]
DOMAIN = git.example.com
HTTP_ADDR = 0.0.0.0
HTTP_PORT = 3000
EXTERNAL_URL = http://git.example.com:3000/

[database]
TYPE = sqlite3
PATH = /home/git/gogs/data/gogs.db
```

Replace `git.example.com` with the hostname users will use to reach your Gogs instance.

After Gogs is running, use `sudo systemctl restart gogs` to apply future configuration changes.

## Step 3: Enable and Start the Service

```bash
# Install the systemd unit shipped with Gogs
sudo cp /home/git/gogs/scripts/systemd/gogs.service /etc/systemd/system/gogs.service
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable gogs

# Start the service
sudo systemctl start gogs

# Check the status
sudo systemctl status gogs
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status gogs

# Review recent logs
sudo journalctl -u gogs --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `sudo journalctl -u gogs -e --no-pager`.
- Ensure all required packages are installed: `rpm -q git wget tar openssh-server`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
