# How to Set Up a Next.js Production Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Next.js, JavaScript, Linux

Description: Learn how to set Up a Next.js Production Server on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up a Next.js Production Server on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL 9.5 or later with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Set Up a Next.js Production Server requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf module install -y nodejs:22
sudo dnf install -y firewalld
```

## Step 2: Install Required Packages

```bash
sudo mkdir -p /opt/nextjs-app
sudo chown "$USER": /opt/nextjs-app
# Copy your Next.js application files into /opt/nextjs-app before continuing.
cd /opt/nextjs-app
npm ci
npm run build
```

Verify the installation:

```bash
node --version
npm --version
npm run start -- --help
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo useradd --system --home-dir /opt/nextjs-app --shell /sbin/nologin nextjs
sudo chown -R nextjs:nextjs /opt/nextjs-app
sudo vi /etc/systemd/system/nextjs.service
```

Add a systemd unit for the Next.js production server:

```ini
[Unit]
Description=Next.js production server
After=network-online.target
Wants=network-online.target

[Service]
Type=exec
User=nextjs
Group=nextjs
WorkingDirectory=/opt/nextjs-app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm run start -- --hostname 0.0.0.0 --port 3000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Apply the recommended settings for your environment. Start with the default port and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nextjs
sudo systemctl status nextjs
```

## Step 5: Verify the Configuration

Test the setup:

```bash
curl -I http://127.0.0.1:3000
```

Check the logs for any errors:

```bash
sudo journalctl -u nextjs -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show nextjs --property=MemoryCurrent
top -p "$(systemctl show -p MainPID --value nextjs)"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `sudo journalctl -u nextjs -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured set up a next.js production server on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
