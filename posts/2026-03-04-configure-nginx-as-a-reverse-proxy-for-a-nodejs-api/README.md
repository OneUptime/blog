# How to Configure Nginx as a Reverse Proxy for a Node.js API on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Reverse Proxy, Node.js, JavaScript, Nginx, Linux

Description: Learn how to configure Nginx as a Reverse Proxy for a Node.js API on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure Nginx as a Reverse Proxy for a Node.js API on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Configure Nginx as a Reverse Proxy for a Node.js API requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install the required packages:

```bash
sudo dnf install -y nginx nodejs npm firewalld policycoreutils
```

## Step 2: Verify Required Packages

```bash
node --version
npm --version
nginx -v
```

Verify the installation:

```bash
rpm -qi nginx nodejs npm
```

## Step 3: Configure the Service

Create a dedicated user for the Node.js API:

```bash
sudo useradd --system --home /opt/node-api --shell /sbin/nologin nodeapi
sudo mkdir -p /opt/node-api
sudo chown -R nodeapi:nodeapi /opt/node-api
```

Create a systemd unit for the API. This example assumes your API entry point is `/opt/node-api/server.js` and it listens on `127.0.0.1:3000`:

```bash
sudo vi /etc/systemd/system/node-api.service
```

```ini
[Unit]
Description=Node.js API
After=network.target

[Service]
Type=simple
User=nodeapi
WorkingDirectory=/opt/node-api
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/node-api/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Create or edit the Nginx configuration file:

```bash
sudo vi /etc/nginx/conf.d/node-api.conf
```

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Set the SELinux boolean that allows Nginx to connect to the local Node.js upstream:

```bash
sudo setsebool -P httpd_can_network_connect 1
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node-api
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl --no-pager status node-api nginx
```

## Step 5: Verify the Configuration

Test the setup:

```bash
curl -I http://127.0.0.1:3000
curl -I http://localhost
```

Check the logs for any errors:

```bash
journalctl -u node-api -f
journalctl -u nginx -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show node-api nginx --property=MemoryCurrent
top -p "$(pgrep -d, '^(node|nginx)$')"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u node-api -xe` or `journalctl -u nginx -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured configure nginx as a reverse proxy for a node.js api on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
