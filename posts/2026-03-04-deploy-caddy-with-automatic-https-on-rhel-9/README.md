# How to Deploy Caddy with Automatic HTTPS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Web Server, Linux

Description: Step-by-step guide on deploy caddy with automatic https using Red Hat Enterprise Linux 9.

---

Deploying Caddy with Automatic HTTPS on RHEL provides a stable and secure foundation for your workload. This guide covers the installation, configuration, and operational considerations.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A DNS A or AAAA record for your domain pointing to this server

## Step 1: Install Caddy

Enable the official Caddy COPR repository and install the package:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf copr enable @caddy/caddy
sudo dnf install -y caddy
```

## Step 2: Configure Caddy

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/caddy/Caddyfile
```

Adjust the site address and upstream according to your requirements. Caddy enables automatic HTTPS when a public domain name appears in the Caddyfile and ports 80 and 443 are reachable from the internet.

```caddyfile
example.com {
    reverse_proxy localhost:8080
}
```

```bash
# Reload Caddy to apply changes without stopping the service
sudo systemctl reload caddy
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot and start it now
sudo systemctl enable --now caddy

# Check the status
sudo systemctl status caddy
```

## Step 4: Configure the Firewall

```bash
# Open HTTP and HTTPS
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

# Test HTTPS
curl -I https://example.com
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u caddy -e --no-pager`.
- Ensure Caddy is installed: `rpm -q caddy`.
- For public certificates, confirm the domain's A or AAAA record points to this server and that ports 80 and 443 are externally reachable.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
