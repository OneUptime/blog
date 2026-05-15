# How to Install Netdata for Real-Time Performance Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Performance, Linux

Description: Step-by-step guide on install netdata for real-time performance monitoring using Red Hat Enterprise Linux 9.

---

Monitoring is essential for maintaining healthy systems. This guide shows you how to set up effective monitoring on RHEL.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Internet access to download Netdata's installer

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install a downloader for the Netdata installer
sudo dnf install -y curl

# Download and run the Netdata kickstart installer
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh
sh /tmp/netdata-kickstart.sh --release-channel stable
```

The kickstart installer detects your system and installs Netdata using the best supported method for your RHEL version.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the Netdata configuration file
cd /etc/netdata 2>/dev/null || cd /opt/netdata/etc/netdata
sudo ./edit-config netdata.conf
```

Adjust the settings according to your requirements. Key parameters to configure include the `[web]` listening address, dashboard access controls, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart netdata
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable netdata

# Start the service
sudo systemctl start netdata

# Check the status
sudo systemctl status netdata
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status netdata

# Review recent logs
journalctl -u netdata --no-pager -n 20

# Check the local dashboard
curl -I http://localhost:19999
```

You can also open `http://localhost:19999` in a browser on the server, or replace `localhost` with the server's hostname or IP address if remote dashboard access is allowed.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u netdata -e --no-pager`.
- Ensure Netdata is installed: `command -v netdata`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
