# How to Configure Node.js Cluster Mode for Multi-Core Servers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Node.js, JavaScript, Performance, Linux

Description: Learn how to configure Node.js Cluster Mode for Multi-Core Servers on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to configure Node.js Cluster Mode for multi-core servers on RHEL. Following these steps will help you set up a reliable clustered Node.js service on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Configuring Node.js Cluster Mode for multi-core servers requires careful planning and execution. This guide walks through the complete process from installation to verification. The Node.js `cluster` module starts worker processes that can share the same server port, which lets one application use multiple CPU cores.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl firewalld
```

## Step 2: Install Required Packages

On RHEL 9, Node.js is available from the AppStream module repositories. List the available streams and install a supported Node.js stream:

```bash
sudo dnf module list nodejs
sudo dnf module install -y nodejs:18
```

Verify the installation:

```bash
node --version
npm --version
rpm -qi nodejs
```

## Step 3: Configure the Service

Create a dedicated service user and application directory:

```bash
id -u nodeapp >/dev/null 2>&1 || sudo useradd --system --home /opt/cluster-demo --shell /sbin/nologin nodeapp
sudo install -d -o nodeapp -g nodeapp /opt/cluster-demo
```

Create the clustered Node.js application:

```bash
sudo tee /opt/cluster-demo/server.js >/dev/null <<'EOF'
const cluster = require('node:cluster');
const http = require('node:http');
const { availableParallelism } = require('node:os');
const process = require('node:process');

const port = Number(process.env.PORT || 3000);
const workers = availableParallelism();

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  for (let i = 0; i < workers; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
    cluster.fork();
  });
} else {
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Handled by worker ${process.pid}\n`);
  }).listen(port, '0.0.0.0', () => {
    console.log(`Worker ${process.pid} listening on port ${port}`);
  });
}
EOF
sudo chown nodeapp:nodeapp /opt/cluster-demo/server.js
```

Create the systemd unit:

```bash
sudo tee /etc/systemd/system/node-cluster-demo.service >/dev/null <<'EOF'
[Unit]
Description=Node.js cluster demo service
After=network.target

[Service]
Type=simple
User=nodeapp
Group=nodeapp
WorkingDirectory=/opt/cluster-demo
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node /opt/cluster-demo/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Apply the recommended settings for your environment. Start with the defaults and adjust the `PORT` value and worker logic based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now node-cluster-demo.service
sudo systemctl status node-cluster-demo.service
```

## Step 5: Verify the Configuration

Test the setup:

```bash
curl http://127.0.0.1:3000/
pgrep -af "node /opt/cluster-demo/server.js"
```

Check the logs for any errors:

```bash
journalctl -u node-cluster-demo.service -f
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
systemctl show node-cluster-demo.service --property=MemoryCurrent
top -p "$(pgrep -d, -f 'node /opt/cluster-demo/server.js')"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u node-cluster-demo.service -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured Node.js cluster mode for multi-core servers on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
