# How to Configure net.ipv4.ip_unprivileged_port_start for Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Kernel, Sysctl, Networking

Description: A focused guide on configuring the Linux kernel parameter net.ipv4.ip_unprivileged_port_start to allow rootless Podman containers to bind low-numbered ports.

---

> "One sysctl setting is all that stands between rootless Podman and port 80."

The `net.ipv4.ip_unprivileged_port_start` kernel parameter controls the lowest port number that unprivileged processes can bind to. By default it is set to 1024, blocking rootless containers from using standard HTTP (80) and HTTPS (443) ports. This guide covers how to configure this parameter correctly, safely, and permanently.

---

## Checking the Current Value

Before making changes, verify the current setting on your system:

```bash
# Read the current value

cat /proc/sys/net/ipv4/ip_unprivileged_port_start
# Default output: 1024

# Alternatively, use sysctl to query it
sysctl net.ipv4.ip_unprivileged_port_start
# Output: net.ipv4.ip_unprivileged_port_start = 1024
```

This means any port from 0 to 1023 requires root or a specific capability to bind.

## Setting the Value Temporarily

A temporary change is useful for testing. It takes effect immediately but reverts on reboot.

```bash
# Lower the threshold to port 80
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Verify the change
sysctl net.ipv4.ip_unprivileged_port_start
# Output: net.ipv4.ip_unprivileged_port_start = 80

# Test rootless Podman on port 80
podman run -d -p 80:80 --name test-nginx nginx

# Confirm it is listening
curl -s -o /dev/null -w "%{http_code}" http://localhost:80
# Output: 200

# Clean up the test container
podman rm -f test-nginx
```

## Making the Change Permanent

To persist across reboots, write the setting to a sysctl configuration file:

```bash
# Create a dedicated config file for Podman
sudo tee /etc/sysctl.d/99-podman-privileged-ports.conf << 'EOF'
# Allow rootless Podman to bind ports starting from 80
# This enables rootless containers to serve HTTP and HTTPS traffic
net.ipv4.ip_unprivileged_port_start=80
EOF

# Apply all sysctl configuration files
sudo sysctl --system

# Verify it was applied
sysctl net.ipv4.ip_unprivileged_port_start
```

The file under `/etc/sysctl.d/` is read at boot by systemd-sysctl. The `99-` prefix makes it load late in lexicographic order, so it can override earlier configuration files.

## Choosing the Right Port Value

The value you choose has security implications. Common choices include:

```bash
# Allow only HTTP and above (port 80+)
# Good for web servers that need ports 80 and 443
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Allow HTTPS and above (port 443+)
# Minimal exposure if you only need HTTPS
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=443

# Allow all ports (port 0+)
# Maximum flexibility but least restrictive -- use with caution
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0

# Verify which well-known ports your containers need
podman ps --format "{{.Ports}}"
```

Setting the value to 0 allows any unprivileged user on the system to bind any port. Only do this on single-user systems or when you have other access controls in place.

## Verifying the Configuration Works

Run a complete test to confirm everything is functioning:

```bash
# Step 1: Check the sysctl value is correct
sysctl net.ipv4.ip_unprivileged_port_start

# Step 2: Run a rootless container on port 80
podman run -d -p 80:80 --name web-test nginx

# Step 3: Run a rootless container bound to host port 443
podman run -d -p 443:80 --name ssl-test nginx

# Step 4: Verify both containers are running
podman ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Step 5: Test connectivity
curl -s http://localhost:80 | head -5
curl -s http://localhost:443 | head -5

# Step 6: Clean up test containers
podman rm -f web-test ssl-test
```

## Applying the Setting on Cloud VMs

On cloud instances and virtual machines, the setting procedure is the same but you may want to include it in your provisioning scripts:

```bash
# In a cloud-init or provisioning script
cat << 'SCRIPT'
#!/bin/bash
# Configure the system for rootless Podman on privileged ports

# Set the sysctl value
echo "net.ipv4.ip_unprivileged_port_start=80" > /etc/sysctl.d/99-podman-privileged-ports.conf
sysctl --system

# Verify
VALUE=$(cat /proc/sys/net/ipv4/ip_unprivileged_port_start)
if [ "$VALUE" -le 80 ]; then
    echo "Configuration successful: unprivileged port start = $VALUE"
else
    echo "Configuration failed: unprivileged port start = $VALUE"
    exit 1
fi
SCRIPT
```

## Troubleshooting

If the setting does not take effect, check these common issues:

```bash
# Check if another sysctl file is overriding your setting
grep -r "ip_unprivileged_port_start" /etc/sysctl.d/ /etc/sysctl.conf

# Check if the kernel supports the parameter
ls -la /proc/sys/net/ipv4/ip_unprivileged_port_start

# Ensure no container runtime config is interfering
podman info | grep -i port

# On systems with SELinux, check for AVC denials
sudo ausearch -m avc -ts recent | grep bind
```

## Summary

Configuring `net.ipv4.ip_unprivileged_port_start` is the most straightforward way to enable rootless Podman containers to bind privileged ports. Set it temporarily with `sysctl -w` for testing, then persist it in `/etc/sysctl.d/99-podman-privileged-ports.conf` for production. Choose the lowest port value that meets your needs -- 80 for HTTP servers, 443 for HTTPS-only, or 0 for full flexibility. Always verify the change with a test container before deploying your workloads.
