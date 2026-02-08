# How to Fix Docker Containers Losing Network After Host Reboot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, networking, reboot, iptables, bridge, troubleshooting, systemd, linux

Description: Fix Docker containers that lose network connectivity after a host reboot due to iptables rules, bridge recreation, and service ordering issues.

---

Everything works perfectly until you reboot the server. After the machine comes back up, Docker containers start but cannot reach the internet, cannot communicate with each other, or cannot be reached from outside. The containers are running, the ports are mapped, but network connectivity is gone. This happens because Docker's networking depends on several host-level components that may not reinitialize correctly after a reboot.

Here is how to diagnose the issue and make Docker networking survive reboots reliably.

## Why Docker Networking Breaks After Reboot

Docker networking depends on three things at the host level:

1. The docker0 bridge interface (or custom bridges)
2. iptables rules for NAT and forwarding
3. IP forwarding enabled in the kernel

After a reboot, any of these can fail to reinitialize properly. The Docker daemon should recreate them on startup, but service ordering, firewall managers, and network configuration tools can interfere.

Check the current state after a reboot:

```bash
# Verify the Docker bridge interface exists
ip link show docker0

# Check if iptables has Docker's NAT rules
sudo iptables -t nat -L -n | grep DOCKER

# Verify IP forwarding is enabled
cat /proc/sys/net/ipv4/ip_forward
```

If any of these checks fail, you have found the problem.

## Cause 1: iptables Rules Not Restored

Docker adds iptables rules for container networking during daemon startup. If another service (like firewalld, ufw, or a custom iptables script) runs after Docker and flushes the rules, Docker's networking breaks.

Check if Docker's iptables chains exist:

```bash
# Look for Docker-specific iptables chains
sudo iptables -L DOCKER -n 2>/dev/null || echo "DOCKER chain missing"
sudo iptables -L DOCKER-USER -n 2>/dev/null || echo "DOCKER-USER chain missing"
sudo iptables -t nat -L DOCKER -n 2>/dev/null || echo "DOCKER NAT chain missing"
```

If the chains are missing, restart Docker to recreate them:

```bash
# Restart Docker to restore iptables rules
sudo systemctl restart docker
```

If the rules keep disappearing after reboot, check for conflicting services:

```bash
# Check if firewalld is overwriting Docker's rules
sudo systemctl status firewalld

# Check if a custom iptables restore service runs after Docker
sudo systemctl list-unit-files | grep iptables
```

Fix the service ordering so Docker starts after the firewall:

```bash
# Create a systemd override for Docker to start after firewalld
sudo systemctl edit docker
```

Add the following override:

```ini
# /etc/systemd/system/docker.service.d/override.conf
[Unit]
After=firewalld.service iptables.service
Requires=docker.socket
```

```bash
# Reload systemd and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Cause 2: IP Forwarding Disabled After Reboot

Docker needs IP forwarding enabled to route traffic between containers and the outside world. Some system configurations disable it on boot.

Check and fix IP forwarding:

```bash
# Check current state
cat /proc/sys/net/ipv4/ip_forward

# Enable it immediately
sudo sysctl -w net.ipv4.ip_forward=1
```

Make it persistent across reboots:

```bash
# Create a sysctl configuration file for Docker
sudo tee /etc/sysctl.d/99-docker.conf << 'EOF'
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
EOF

# Apply immediately
sudo sysctl --system
```

Docker's daemon configuration can also manage this. Make sure `iptables` is not disabled:

```json
{
    "iptables": true,
    "ip-forward": true
}
```

Save this to `/etc/docker/daemon.json` and restart Docker.

## Cause 3: Docker Service Not Starting on Boot

The simplest cause: Docker itself is not enabled as a boot service.

```bash
# Check if Docker starts on boot
sudo systemctl is-enabled docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Also enable the Docker socket
sudo systemctl enable docker.socket
```

Verify the startup:

```bash
# Check Docker service status
sudo systemctl status docker

# Look for startup errors in the journal
sudo journalctl -u docker --since "boot" --no-pager | tail -30
```

## Cause 4: Containers Not Configured to Auto-Start

Even if Docker starts on boot, your containers need to be configured to restart automatically.

Check restart policies:

```bash
# Check restart policy for a specific container
docker inspect my-container --format '{{.HostConfig.RestartPolicy.Name}}'
```

Set the restart policy when running containers:

```bash
# Run with automatic restart
docker run -d --restart unless-stopped --name my-container myimage

# Update an existing container's restart policy
docker update --restart unless-stopped my-container
```

In Docker Compose:

```yaml
# docker-compose.yml with restart policies
services:
  webapp:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - "8080:80"

  api:
    image: myapi:latest
    restart: unless-stopped
    ports:
      - "3000:3000"

  db:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
```

The restart policy options are:
- `no` - Do not restart (default)
- `always` - Always restart, including on daemon startup
- `unless-stopped` - Restart unless manually stopped
- `on-failure` - Only restart on non-zero exit codes

## Cause 5: Network Interfaces Recreated with Different Names

After a reboot, custom Docker networks might be recreated with different interface names or subnet assignments, especially if the order of network creation changes.

```bash
# List Docker networks and their interfaces
docker network ls
docker network inspect bridge --format '{{.Options}}'

# Check which interface each network uses
ip link show type bridge
```

Pin your network configurations by specifying subnets and gateway addresses:

```yaml
# docker-compose.yml with fixed network configuration
services:
  app:
    image: myapp:latest
    networks:
      - appnet

networks:
  appnet:
    ipam:
      config:
        - subnet: 172.28.0.0/24
          gateway: 172.28.0.1
```

## Cause 6: UFW Blocking Docker Traffic After Reboot

On Ubuntu, ufw (Uncomplicated Firewall) can interfere with Docker's iptables rules after a reboot.

```bash
# Check if ufw is active
sudo ufw status

# Check if ufw is blocking Docker traffic
sudo ufw status verbose | grep -i docker
```

Configure ufw to work with Docker by editing the after.rules file:

```bash
# Edit ufw's after rules
sudo nano /etc/ufw/after.rules
```

Add these rules at the end of the file (before the COMMIT line):

```
# Allow Docker container traffic
*filter
:ufw-user-forward - [0:0]
:DOCKER-USER - [0:0]
-A DOCKER-USER -j RETURN
COMMIT
```

Then reload ufw:

```bash
# Reload ufw to apply the new rules
sudo ufw reload
```

## Creating a Post-Reboot Verification Script

Automate the verification of Docker networking after reboot:

```bash
#!/bin/bash
# verify-docker-network.sh - Run after reboot to verify Docker networking

echo "Checking Docker service..."
if ! systemctl is-active --quiet docker; then
    echo "FAIL: Docker is not running"
    sudo systemctl start docker
fi

echo "Checking IP forwarding..."
if [ "$(cat /proc/sys/net/ipv4/ip_forward)" != "1" ]; then
    echo "FAIL: IP forwarding is disabled"
    sudo sysctl -w net.ipv4.ip_forward=1
fi

echo "Checking iptables DOCKER chain..."
if ! sudo iptables -L DOCKER -n > /dev/null 2>&1; then
    echo "FAIL: Docker iptables rules missing, restarting Docker"
    sudo systemctl restart docker
fi

echo "Checking container connectivity..."
docker run --rm alpine ping -c 1 -W 5 8.8.8.8 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "OK: Container network connectivity verified"
else
    echo "FAIL: Containers cannot reach the internet"
    sudo systemctl restart docker
fi

echo "Checking container DNS..."
docker run --rm alpine nslookup google.com > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "OK: Container DNS resolution verified"
else
    echo "FAIL: Container DNS resolution broken"
fi
```

Install this as a systemd service that runs after Docker:

```ini
# /etc/systemd/system/docker-network-check.service
[Unit]
Description=Verify Docker networking after boot
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/verify-docker-network.sh

[Install]
WantedBy=multi-user.target
```

```bash
# Enable the verification service
sudo systemctl enable docker-network-check.service
```

## Summary

Docker containers losing network after a host reboot happens because Docker's networking depends on iptables rules, IP forwarding, and bridge interfaces that need to be properly restored on boot. The most common fix is ensuring Docker starts after any firewall services and that IP forwarding is permanently enabled via sysctl. Set restart policies on all your containers so they come back up automatically. For production systems, use the `unless-stopped` restart policy, pin your network subnets in Docker Compose, and run a post-boot verification script that checks everything came up correctly.
