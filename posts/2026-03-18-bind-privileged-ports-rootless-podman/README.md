# How to Bind Privileged Ports with Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Networking, Port, Security

Description: A step-by-step guide to binding ports below 1024 in rootless Podman containers, covering kernel tunables, socket activation, and reverse proxy approaches.

---

> "You do not need root to serve on port 80 -- you just need the right kernel configuration."

By default, Linux reserves ports 1 through 1023 for privileged processes. Rootless Podman containers run as your regular user, so binding to port 80 or 443 fails with a "permission denied" error. This guide covers several common methods to solve this problem without running containers as root.

---

## Understanding the Problem

When you try to bind a privileged port in rootless mode, Podman reports an error because the kernel blocks unprivileged users from using low ports.

```bash
# This will fail in rootless mode with a permission error

podman run -d -p 80:80 --name webserver nginx

# You will see an error like:
# Error: rootlessport cannot expose privileged port 80,
# you can add 'net.ipv4.ip_unprivileged_port_start=80'
# to /etc/sysctl.conf (or choose a larger port number)

# Verify the current minimum unprivileged port
cat /proc/sys/net/ipv4/ip_unprivileged_port_start
# Default output: 1024
```

## Method 1: Lower the Unprivileged Port Start

The simplest and most common fix is to lower the kernel parameter that defines where unprivileged ports begin.

```bash
# Temporarily lower the limit (resets on reboot)
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Verify the change took effect
cat /proc/sys/net/ipv4/ip_unprivileged_port_start
# Output: 80

# Now rootless Podman can bind port 80
podman run -d -p 80:80 --name webserver nginx

# Test it
curl http://localhost:80
```

To make the change permanent across reboots:

```bash
# Create a sysctl configuration file
echo "net.ipv4.ip_unprivileged_port_start=80" | \
  sudo tee /etc/sysctl.d/99-podman-privileged-ports.conf

# Apply the configuration immediately
sudo sysctl --system

# Verify persistence
cat /proc/sys/net/ipv4/ip_unprivileged_port_start
```

## Method 2: Use a Reverse Proxy on High Ports

Instead of changing kernel settings, run your container on a high port and use a host-level reverse proxy to forward traffic from port 80.

```bash
# Run the container on port 8080
podman run -d -p 8080:80 --name webapp nginx

# Install and configure nginx on the host as a reverse proxy
sudo apt-get install nginx  # or: sudo dnf install nginx

# Create a reverse proxy configuration
sudo tee /etc/nginx/sites-available/podman-proxy << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        # Forward traffic to the rootless Podman container
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site and restart nginx
sudo ln -s /etc/nginx/sites-available/podman-proxy /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

## Method 3: Use Port Forwarding with iptables

If you have root access but want to keep containers rootless, use iptables to forward from a privileged port to a high port.

```bash
# Run the container on a high port
podman run -d -p 8080:80 --name webapp nginx

# Forward port 80 to port 8080 using iptables
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080
sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080

# Test the forwarding
curl http://localhost:80

# Make the iptables rules persistent
sudo apt-get install iptables-persistent  # Debian/Ubuntu
sudo netfilter-persistent save
```

## Method 4: Set File Capabilities

You can grant the specific capability to bind low ports to the rootless port helper on systems where Podman uses it for port forwarding:

```bash
# Grant CAP_NET_BIND_SERVICE to the rootlessport helper
sudo setcap cap_net_bind_service=ep /usr/libexec/podman/rootlessport

# If your Podman setup uses this helper, rootless Podman can now bind privileged ports
podman run -d -p 80:80 --name webserver nginx

# Verify it is running
podman ps
curl http://localhost:80
```

Note that this approach is distribution- and network-backend-dependent, and the helper path can vary. Podman 5 defaults to `pasta` for rootless networking, so prefer the sysctl, reverse proxy, or firewall forwarding approach unless you have verified that your installation uses `rootlessport`. This approach also requires the `setcap` change to persist across package updates.

## Summary

Binding privileged ports in rootless Podman is a solved problem with multiple approaches. The most common solution is lowering `net.ipv4.ip_unprivileged_port_start` via sysctl, which takes one command and persists across reboots. For production deployments, a reverse proxy like nginx adds SSL termination and load balancing benefits. Choose the method that fits your security policy and operational requirements.
