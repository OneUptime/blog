# How to Run podman system service as a systemd Unit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Service Management, API

Description: Learn how to configure and run the Podman system service as a systemd unit for reliable, automatic API availability on boot.

---

> Running the Podman service as a systemd unit ensures your container API is always available, surviving reboots and recovering from failures automatically.

While Podman can run its system service manually, production environments need the reliability of systemd management. Systemd provides automatic startup, restart on failure, logging, and resource controls. This guide covers configuring the Podman system service as a systemd unit for both rootless and rootful operation.

---

## Understanding the Default Units

Podman ships with pre-configured systemd units for socket activation.

```bash
# View the default socket unit (rootless)

systemctl --user cat podman.socket

# View the default service unit (rootless)
systemctl --user cat podman.service

# View the rootful socket unit
sudo systemctl cat podman.socket

# View the rootful service unit
sudo systemctl cat podman.service
```

## Enabling the Socket-Activated Service

The recommended approach uses socket activation for on-demand startup.

```bash
# Enable and start the rootless socket
systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# The service starts automatically when a connection is made
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/_ping

# Check that the service was activated
systemctl --user status podman.service
```

## Creating a Custom Service Unit

Create a custom systemd unit for specific requirements.

```bash
# Create a custom service unit for rootless Podman
mkdir -p ~/.config/systemd/user

cat > ~/.config/systemd/user/podman-api.service << 'EOF'
[Unit]
Description=Podman API Service (Custom)
Wants=network-online.target
After=network-online.target
Documentation=man:podman-system-service(1)

[Service]
Type=exec
# Run indefinitely (timeout=0)
ExecStart=/usr/bin/podman system service --time 0
# Restart on failure
Restart=on-failure
RestartSec=5
# Increase file descriptor limit
LimitNOFILE=65536
# Set the stop timeout
TimeoutStopSec=30

[Install]
WantedBy=default.target
EOF

# Reload systemd and start the custom service
systemctl --user daemon-reload
systemctl --user enable podman-api.service
systemctl --user start podman-api.service

# Check the status
systemctl --user status podman-api.service
```

## Creating a Custom Socket Unit

Define a custom socket unit for a different Unix socket path.

```bash
# Create a custom socket unit
cat > ~/.config/systemd/user/podman-api.socket << 'EOF'
[Unit]
Description=Podman API Socket (Custom)
Documentation=man:podman-system-service(1)

[Socket]
ListenStream=%t/podman/podman-api.sock
SocketMode=0660

[Install]
WantedBy=sockets.target
EOF

# Create the matching service unit for socket activation
cat > ~/.config/systemd/user/podman-api.service << 'EOF'
[Unit]
Description=Podman API Service (Custom)
Requires=podman-api.socket
After=podman-api.socket
Documentation=man:podman-system-service(1)

[Service]
Type=exec
ExecStart=/usr/bin/podman system service --time 0
# Automatically stop after 5 minutes of inactivity
# ExecStart=/usr/bin/podman system service --time 300

[Install]
WantedBy=default.target
EOF

# Reload and start
systemctl --user daemon-reload
systemctl --user enable podman-api.socket
systemctl --user start podman-api.socket
```

## Configuring the Rootful Service

Set up the Podman service as a system-wide systemd unit.

```bash
# Enable and start the rootful socket
sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Verify the rootful socket
sudo systemctl status podman.socket

# Test the rootful API
sudo curl --unix-socket /run/podman/podman.sock \
    http://localhost/libpod/_ping
```

## Customizing with Drop-In Files

Override default service settings without editing the original unit file.

```bash
# Create a drop-in directory for the rootless service
mkdir -p ~/.config/systemd/user/podman.service.d

# Add custom settings
cat > ~/.config/systemd/user/podman.service.d/override.conf << 'EOF'
[Service]
# Override the ExecStart to run indefinitely
ExecStart=
ExecStart=/usr/bin/podman system service --time 0

# Add restart policy
Restart=on-failure
RestartSec=10

# Set resource limits
LimitNOFILE=65536
MemoryMax=2G
CPUQuota=200%

# Add environment variables
Environment="CONTAINERS_CONF=%h/.config/containers/containers.conf"
Environment="REGISTRY_AUTH_FILE=%h/.config/containers/auth.json"
EOF

# Reload and restart
systemctl --user daemon-reload
systemctl --user restart podman.service
```

## Enabling Lingering for Boot Persistence

Ensure the service starts at boot even without a user login session.

```bash
# Enable lingering for the current user
loginctl enable-linger $(whoami)

# Verify lingering is active
loginctl show-user $(whoami) --property=Linger

# Now the socket will start at boot and persist without a login
# Verify after a reboot
systemctl --user status podman.socket
```

## Monitoring the Service with journald

Use journald to monitor service activity and debug issues.

```bash
# View service logs
journalctl --user -u podman.service --no-pager -n 50

# View socket activation logs
journalctl --user -u podman.socket --no-pager -n 20

# Follow logs in real time
journalctl --user -u podman.service -f

# Show only errors
journalctl --user -u podman.service -p err --no-pager

# Show logs since last boot
journalctl --user -u podman.service -b --no-pager
```

## Health Check Integration

Add a health check timer that monitors the service.

```bash
# Create a health check script
mkdir -p ~/.local/bin
cat > ~/.local/bin/podman-health-check.sh << 'SCRIPT'
#!/bin/bash
SOCKET="/run/user/$(id -u)/podman/podman.sock"

if curl -sf --unix-socket "$SOCKET" http://localhost/libpod/_ping > /dev/null 2>&1; then
    exit 0
else
    echo "Podman API health check failed, restarting service"
    systemctl --user restart podman.socket
    exit 1
fi
SCRIPT
chmod +x ~/.local/bin/podman-health-check.sh

# Create a systemd timer for periodic health checks
cat > ~/.config/systemd/user/podman-health.timer << 'EOF'
[Unit]
Description=Podman Health Check Timer

[Timer]
OnBootSec=60
OnUnitActiveSec=300

[Install]
WantedBy=timers.target
EOF

cat > ~/.config/systemd/user/podman-health.service << 'EOF'
[Unit]
Description=Podman Health Check

[Service]
Type=oneshot
ExecStart=%h/.local/bin/podman-health-check.sh
EOF

systemctl --user daemon-reload
systemctl --user enable --now podman-health.timer
```

## Summary

Running the Podman system service as a systemd unit provides production-grade reliability for your container API. Use socket activation for efficient on-demand startup, drop-in files for customization without modifying default units, and lingering for boot persistence. Combined with journald logging and health check timers, you get a robust container API service that starts automatically, recovers from failures, and keeps detailed logs for troubleshooting.
