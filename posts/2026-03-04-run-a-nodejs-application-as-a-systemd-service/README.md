# How to Run a Node.js Application as a systemd Service on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, Node.js, JavaScript, Linux

Description: Learn how to run a Node.js Application as a systemd Service on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Run a Node.js Application as a systemd Service on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL 8 or 9 with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A Node.js application with a known entry point, such as `server.js`

## Overview

Running a Node.js Application as a systemd Service requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y git
```

## Step 2: Install Required Packages

```bash
sudo dnf module list nodejs
sudo dnf module install -y nodejs:20/common
```

Verify the installation:

```bash
node --version
npm --version
```

## Step 3: Configure the Service

Create a dedicated service user and place the application under `/opt`:

```bash
sudo useradd --system --home /opt/my-node-app --shell /sbin/nologin nodeapp
sudo install -d -o nodeapp -g nodeapp /opt/my-node-app
sudo cp -r /path/to/your/app/. /opt/my-node-app/
sudo chown -R nodeapp:nodeapp /opt/my-node-app
```

Install production dependencies:

```bash
cd /opt/my-node-app
sudo -u nodeapp npm install --omit=dev
```

Create the systemd unit file:

```bash
sudo vi /etc/systemd/system/my-node-app.service
```

Add the service configuration:

```ini
[Unit]
Description=My Node.js Application
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=nodeapp
Group=nodeapp
WorkingDirectory=/opt/my-node-app
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/my-node-app/server.js
Restart=on-failure
RestartSec=5
SyslogIdentifier=my-node-app

[Install]
WantedBy=multi-user.target
```

Adjust `/opt/my-node-app/server.js` if your application uses a different entry point.

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now my-node-app.service
sudo systemctl status my-node-app.service
```

## Step 5: Verify the Configuration

Test the setup:

```bash
node --check /opt/my-node-app/server.js
curl http://localhost:3000/
```

Check the logs for any errors:

```bash
journalctl -u my-node-app.service -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show my-node-app.service --property=MemoryCurrent,MainPID
top -p "$(systemctl show my-node-app.service --property=MainPID --value)"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u my-node-app.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured a Node.js application as a systemd service on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
