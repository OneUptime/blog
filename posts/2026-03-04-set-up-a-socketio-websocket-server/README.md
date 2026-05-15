# How to Set Up a Socket.IO WebSocket Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Socket.IO, WebSocket, JavaScript, Linux

Description: Learn how to set Up a Socket.IO WebSocket Server on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up a Socket.IO WebSocket Server on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Set Up a Socket.IO WebSocket Server requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf groupinstall -y "Development Tools"
```

## Step 2: Install Required Packages

```bash
sudo dnf module list nodejs
sudo dnf module install -y nodejs:22/common
node --version
npm --version
```

Verify the installation:

```bash
rpm -qi nodejs npm
```

## Step 3: Configure the Service

Create an application directory and install Socket.IO:

```bash
sudo mkdir -p /opt/socketio-server
sudo chown "$USER":"$USER" /opt/socketio-server
cd /opt/socketio-server
npm init -y
npm install socket.io
```

Create the server file:

```bash
vi /opt/socketio-server/server.js
```

Add a minimal Socket.IO server:

```javascript
const { createServer } = require("node:http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer);

io.on("connection", (socket) => {
  console.log(`client connected: ${socket.id}`);

  socket.on("chat message", (message) => {
    io.emit("chat message", message);
  });

  socket.on("disconnect", () => {
    console.log(`client disconnected: ${socket.id}`);
  });
});

httpServer.listen(3000, "0.0.0.0", () => {
  console.log("Socket.IO server listening on port 3000");
});
```

Create a dedicated service user and a systemd unit:

```bash
sudo useradd --system --home-dir /opt/socketio-server --shell /sbin/nologin socketio
sudo chown -R socketio:socketio /opt/socketio-server
sudo vi /etc/systemd/system/socketio-server.service
```

Add the service definition:

```ini
[Unit]
Description=Socket.IO WebSocket server
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/socketio-server
ExecStart=/usr/bin/node /opt/socketio-server/server.js
Restart=on-failure
User=socketio
Group=socketio
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now socketio-server
sudo systemctl status socketio-server
```

## Step 5: Verify the Configuration

Test the setup:

```bash
node --check /opt/socketio-server/server.js
curl -i "http://127.0.0.1:3000/socket.io/?EIO=4&transport=polling"
```

Check the logs for any errors:

```bash
journalctl -u socketio-server -f
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
systemctl show socketio-server --property=MemoryCurrent
top -p $(pidof node)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u socketio-server -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured set up a socket.io websocket server on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
