# How to Set Up OpenResty (Nginx + Lua) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Web Server, Linux

Description: Step-by-step guide on set up openresty (nginx + lua) using Red Hat Enterprise Linux 9.

---

Setting up OpenResty (Nginx + Lua) on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install OpenResty

Add the official OpenResty repository for your platform, update the package metadata, and install the OpenResty package:

```bash
# Install wget if it is not already available
sudo dnf install -y wget

# Add the OpenResty repository for RHEL 9 or later
wget https://openresty.org/package/rhel/openresty2.repo
sudo mv openresty2.repo /etc/yum.repos.d/openresty.repo

# On CentOS Stream 9, use this repository instead:
# wget https://openresty.org/package/centos/openresty2.repo
# sudo mv openresty2.repo /etc/yum.repos.d/openresty.repo

# Refresh package metadata and install OpenResty
sudo dnf check-update
sudo dnf install -y openresty
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /usr/local/openresty/nginx/conf/nginx.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, server names, Lua handlers, and logging options. Test the configuration before restarting the service:

```bash
# Test the OpenResty configuration
sudo openresty -t

# Restart the service to apply changes
sudo systemctl restart openresty
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable openresty

# Start the service
sudo systemctl start openresty

# Check the status
sudo systemctl status openresty
```

## Step 4: Configure the Firewall

```bash
# Open HTTP traffic
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status openresty

# Review recent logs
journalctl -u openresty --no-pager -n 20

# Confirm OpenResty responds locally
curl http://localhost/
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u openresty -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure the OpenResty package is installed: `rpm -q openresty`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
