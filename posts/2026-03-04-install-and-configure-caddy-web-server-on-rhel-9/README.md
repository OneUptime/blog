# How to Install and Configure Caddy Web Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Web Server, Linux

Description: Step-by-step guide on install and configure caddy web server using Red Hat Enterprise Linux 9.

---

Caddy is a web server that automatically provisions and renews TLS certificates from Let's Encrypt. Its simple configuration syntax and secure defaults make it an attractive alternative to Nginx and Apache.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Enable the Caddy COPR repository and install Caddy
sudo dnf install -y dnf-plugins-core
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy
```

This installs Caddy and its systemd service files.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/caddy/Caddyfile
```

Adjust the settings according to your requirements. Key parameters to configure include site addresses, reverse proxy targets, file server roots, and logging options.

```bash
# Reload Caddy to apply changes without downtime
sudo systemctl reload caddy
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable caddy

# Start the service
sudo systemctl start caddy

# Check the status
sudo systemctl status caddy
```

## Step 4: Configure the Firewall

```bash
# Open HTTP and HTTPS traffic
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status caddy

# Review recent logs
journalctl -u caddy --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u caddy -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure Caddy is installed: `rpm -q caddy`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
