# How to Run MongoDB as a Systemd Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Systemd, Linux, DevOps

Description: Learn how to configure MongoDB to run as a systemd service on Linux, including service file setup, automatic startup, and managing the service with systemctl.

---

## Overview

Running MongoDB as a systemd service ensures it starts automatically on system boot, restarts automatically on failure, and integrates with standard Linux service management tools. When you install MongoDB from the official repositories on modern Linux distributions, a systemd unit file is included automatically.

## Checking if the Service File Exists

```bash
# Check if the mongod service file exists
cat /lib/systemd/system/mongod.service

# Or check in systemd directory
cat /etc/systemd/system/mongod.service
```

## The Default Service File

The MongoDB package installs a service file at `/lib/systemd/system/mongod.service`:

```text
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.org/manual
After=network-online.target
Wants=network-online.target

[Service]
User=mongodb
Group=mongodb
EnvironmentFile=-/etc/default/mongod
ExecStart=/usr/bin/mongod --config /etc/mongod.conf
RuntimeDirectory=mongodb
RuntimeDirectoryMode=0755
PIDFile=/var/run/mongodb/mongod.pid
# file size
LimitFSIZE=infinity
# cpu time
LimitCPU=infinity
# virtual memory size
LimitAS=infinity
# open files
LimitNOFILE=64000
# processes/threads
LimitNPROC=64000
# locked memory
LimitMEMLOCK=infinity
# total threads (user+kernel)
TasksMax=infinity
TasksAccounting=false
# Recommended limits for mongod as specified in
# https://docs.mongodb.com/manual/reference/ulimit/#recommended-ulimit-settings
[Install]
WantedBy=multi-user.target
```

## Common Service Management Commands

```bash
# Start MongoDB
sudo systemctl start mongod

# Stop MongoDB
sudo systemctl stop mongod

# Restart MongoDB
sudo systemctl restart mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Disable auto-start on boot
sudo systemctl disable mongod

# Check service status
sudo systemctl status mongod
```

## Checking Service Status

```bash
sudo systemctl status mongod
```

Example output when running:

```text
* mongod.service - MongoDB Database Server
     Loaded: loaded (/lib/systemd/system/mongod.service; enabled; vendor preset: enabled)
     Active: active (running) since Mon 2026-03-31 10:00:00 UTC; 2h ago
       Docs: https://docs.mongodb.org/manual
   Main PID: 12345 (mongod)
     Memory: 256.0M
        CPU: 1min 23.456s
     CGroup: /system.slice/mongod.service
             `-12345 /usr/bin/mongod --config /etc/mongod.conf
```

## Viewing Service Logs

```bash
# View recent logs
sudo journalctl -u mongod

# Follow logs in real time
sudo journalctl -u mongod -f

# View logs from current boot
sudo journalctl -u mongod -b

# View last 100 lines
sudo journalctl -u mongod -n 100
```

## Creating a Custom Service File

If you installed MongoDB manually (not from package manager), create your own service file:

```bash
sudo tee /etc/systemd/system/mongod.service << 'EOF'
[Unit]
Description=MongoDB Database Server
After=network.target

[Service]
User=mongodb
Group=mongodb
ExecStart=/usr/local/bin/mongod --config /etc/mongod.conf
ExecStop=/usr/local/bin/mongod --shutdown --dbpath /var/lib/mongodb
PIDFile=/var/run/mongodb/mongod.pid
Restart=on-failure
RestartSec=5s
LimitNOFILE=64000
LimitNPROC=64000
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to pick up new file
sudo systemctl daemon-reload

# Enable and start the service
sudo systemctl enable mongod
sudo systemctl start mongod
```

## Configuring Automatic Restart on Failure

Edit the service file to add restart behavior:

```bash
sudo systemctl edit mongod
```

Add these settings:

```text
[Service]
Restart=on-failure
RestartSec=10s

[Unit]
StartLimitBurst=5
StartLimitIntervalSec=60s
```

## Setting Resource Limits for the Service

```bash
sudo systemctl edit mongod
```

Add resource limits:

```text
[Service]
LimitNOFILE=200000
LimitNPROC=200000
LimitMEMLOCK=infinity
LimitAS=infinity
```

## Verifying the Configuration Loads

```bash
# After making changes, reload and restart
sudo systemctl daemon-reload
sudo systemctl restart mongod
sudo systemctl status mongod
```

## Summary

Running MongoDB as a systemd service provides automatic startup at boot, failure recovery, and centralized log management via journalctl. The official MongoDB packages include a pre-configured service file, but you can customize it by creating a systemd drop-in override. Use `systemctl enable` to ensure MongoDB restarts after reboots, and `systemctl edit mongod` to safely modify service settings without editing the base unit file directly.
