# How to Install and Configure Focalboard on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Project Management, Linux

Description: Step-by-step guide on install and configure focalboard using Red Hat Enterprise Linux 9.

---

Focalboard can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the required packages
sudo dnf install -y wget tar gzip curl
```

Download and install the Focalboard Personal Server archive:

```bash
wget https://github.com/mattermost/focalboard/releases/download/v0.15.0/focalboard-server-linux-amd64.tar.gz
tar -xzf focalboard-server-linux-amd64.tar.gz
sudo mv focalboard /opt/focalboard
sudo useradd --system --home-dir /opt/focalboard --shell /sbin/nologin focalboard
sudo chown -R focalboard:focalboard /opt/focalboard
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /opt/focalboard/config.json
```

Adjust the settings according to your requirements. Key parameters to configure include `serverRoot`, `port`, `dbtype`, `dbconfig`, authentication settings, and logging options.

For a local SQLite-backed installation, the relevant values look like this:

```json
{
  "serverRoot": "http://localhost:8000",
  "port": 8000,
  "dbtype": "sqlite3",
  "dbconfig": "./focalboard.db"
}
```

Create a systemd service unit:

```bash
sudo vi /etc/systemd/system/focalboard.service
```

Add the following service definition:

```ini
[Unit]
Description=Focalboard server
After=network.target

[Service]
Type=simple
Restart=always
RestartSec=5s
ExecStart=/opt/focalboard/bin/focalboard-server
WorkingDirectory=/opt/focalboard
User=focalboard
Group=focalboard

[Install]
WantedBy=multi-user.target
```

```bash
# Restart the service to apply changes
sudo systemctl daemon-reload
sudo systemctl restart focalboard.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable focalboard.service

# Start the service
sudo systemctl start focalboard.service

# Check the status
sudo systemctl status focalboard.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status focalboard.service

# Confirm that Focalboard responds on the default port
curl http://localhost:8000

# Review recent logs
journalctl -u focalboard.service --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u focalboard.service -e --no-pager`.
- Ensure all required packages are installed: `rpm -q wget tar gzip curl`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
