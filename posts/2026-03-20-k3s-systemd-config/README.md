# How to Configure K3s with Systemd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Systemd, Linux, Configuration, Service Management, Kubernetes, SUSE Rancher

Description: Learn how to configure K3s as a systemd service including startup options, environment variables, resource limits, and managing K3s server and agent service units.

---

On systemd-based Linux distributions, K3s installs as a systemd service by default when you use the K3s install script. Understanding how to manage and customize the systemd unit files gives you full control over K3s startup, resource usage, and service dependencies.

---

## K3s Systemd Service Files

```bash
# Default K3s server service

/etc/systemd/system/k3s.service

# Default K3s agent service (on worker nodes)
/etc/systemd/system/k3s-agent.service

# Default environment files created by the install script
/etc/systemd/system/k3s.service.env
/etc/systemd/system/k3s-agent.service.env
```

---

## Step 1: View the Default Service Configuration

```bash
cat /etc/systemd/system/k3s.service
```

The default unit file looks like:

```ini
[Unit]
Description=Lightweight Kubernetes
Documentation=https://k3s.io
Wants=network-online.target
After=network-online.target

[Install]
WantedBy=multi-user.target

[Service]
Type=notify
EnvironmentFile=-/etc/default/%N
EnvironmentFile=-/etc/sysconfig/%N
EnvironmentFile=-/etc/systemd/system/k3s.service.env
KillMode=process
Delegate=yes
User=root
# Having non-zero Limit*s causes performance problems due to accounting overhead
# in the kernel. We recommend using cgroups to do container-local accounting.
LimitNOFILE=1048576
LimitNPROC=infinity
LimitCORE=infinity
TasksMax=infinity
TimeoutStartSec=0
Restart=always
RestartSec=5s
ExecStartPre=-/sbin/modprobe br_netfilter
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/k3s \
    server
```

---

## Step 2: Customize K3s Using a Drop-In Override

Never edit the base service file directly - use systemd drop-ins:

```bash
# Create a drop-in directory
mkdir -p /etc/systemd/system/k3s.service.d/

# Create the override file
cat > /etc/systemd/system/k3s.service.d/override.conf << 'EOF'
[Service]
# Set environment variables
Environment="K3S_KUBECONFIG_MODE=644"

# Override the ExecStart to add flags
ExecStart=
ExecStart=/usr/local/bin/k3s server \
  --disable traefik \
  --disable servicelb \
  --write-kubeconfig-mode 644

# Set memory limit for K3s service
MemoryMax=2G

# Configure restart behavior
RestartSec=10s
EOF

# Reload and restart
systemctl daemon-reload
systemctl restart k3s
```

---

## Step 3: Configure the Agent Service

```bash
# Agent environment file
cat > /etc/systemd/system/k3s-agent.service.env << 'EOF'
K3S_URL=https://server-ip:6443
K3S_TOKEN=your-server-token
EOF

# Agent drop-in for custom flags
mkdir -p /etc/systemd/system/k3s-agent.service.d/
cat > /etc/systemd/system/k3s-agent.service.d/override.conf << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/local/bin/k3s agent \
  --node-label "role=worker" \
  --node-label "zone=us-west"
EOF

systemctl daemon-reload
systemctl restart k3s-agent
```

Note: `--node-label` is only applied when the node first registers with the cluster. To change labels on an existing node, use `kubectl label node`.

---

## Step 4: Manage the K3s Service

```bash
# Start K3s
systemctl start k3s

# Stop K3s
systemctl stop k3s

# Restart K3s
systemctl restart k3s

# Enable K3s to start on boot
systemctl enable k3s

# Disable autostart
systemctl disable k3s

# Check service status
systemctl status k3s

# Follow K3s logs
journalctl -u k3s -f

# View logs from the last hour
journalctl -u k3s --since "1 hour ago"
```

---

## Step 5: Set Startup Dependencies

If K3s needs to wait for a specific service (like a network mount or VPN):

```ini
# /etc/systemd/system/k3s.service.d/wait-for-vpn.conf
[Unit]
After=network-online.target vpn.service
Requires=vpn.service
```

---

## Step 6: Configure K3s to Start After a Network Interface

K3s already starts after `network-online.target` by default. If you need that target to wait for a specific interface or connection manager, enable the matching wait-online service for your host:

```bash
# systemd-networkd
systemctl enable systemd-networkd-wait-online.service

# Wait for a specific interface managed by systemd-networkd
systemctl enable systemd-networkd-wait-online@eth0.service

# NetworkManager
systemctl enable NetworkManager-wait-online.service
```

---

## Step 7: Limit K3s Resource Usage via Systemd

```ini
# /etc/systemd/system/k3s.service.d/resources.conf
[Service]
# Limit memory available to the k3s.service cgroup
MemoryMax=4G

# Set CPU quota (200% = 2 full cores)
CPUQuota=200%

# Lower IO priority relative to the default weight of 100
IOWeight=50
```

After creating or changing a drop-in under `/etc/systemd/system/k3s.service.d/`, run `systemctl daemon-reload` and restart K3s.

---

## Best Practices

- Always use systemd drop-in files (`/etc/systemd/system/k3s.service.d/`) for customizations rather than editing the base unit file directly - the install script may recreate the base file during reinstall or upgrade workflows.
- Use `journalctl -u k3s -f` for real-time log monitoring during startup and troubleshooting.
- Set `Restart=always` and a reasonable `RestartSec` (5-10 seconds) to ensure K3s recovers automatically from transient failures, especially important on edge nodes with less stable hardware.
