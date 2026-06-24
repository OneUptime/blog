# How to Install and Configure LiteSpeed Web Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Web Server, Linux

Description: Step-by-step guide on install and configure litespeed web server using Red Hat Enterprise Linux 9.

---

OpenLiteSpeed, the open source edition of LiteSpeed Web Server, can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install wget, add the LiteSpeed repository, and install OpenLiteSpeed
sudo dnf install -y wget
sudo wget -O - https://repo.litespeed.sh | sudo bash
sudo dnf install -y openlitespeed
```

The LiteSpeed repository also provides optional LSPHP packages if you need PHP support.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /usr/local/lsws/conf/httpd_config.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listeners, virtual hosts, authentication settings, and logging options. You can also reset the WebAdmin password from the command line:

```bash
sudo /usr/local/lsws/admin/misc/admpass.sh
```

```bash
# Restart the service to apply changes
sudo systemctl restart lsws
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable lsws

# Start the service
sudo systemctl start lsws

# Check the status
sudo systemctl status lsws
```

## Step 4: Configure the Firewall

```bash
# Open the default OpenLiteSpeed web and WebAdmin ports
sudo firewall-cmd --permanent --add-port=8088/tcp
sudo firewall-cmd --permanent --add-port=7080/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status lsws

# Review recent logs
journalctl -u lsws --no-pager -n 20
```

You can also access the WebAdmin console at `https://<server-ip>:7080/`.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u lsws -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure OpenLiteSpeed is installed: `rpm -qa | grep openlitespeed`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
