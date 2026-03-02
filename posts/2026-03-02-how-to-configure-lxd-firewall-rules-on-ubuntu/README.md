# How to Configure LXD Firewall Rules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Firewall, Networking, Security

Description: Configure firewall rules for LXD containers on Ubuntu, including managing LXD's built-in iptables rules, restricting container traffic, and integrating with UFW and nftables.

---

LXD manages its own set of iptables (or nftables) rules to provide network connectivity for containers. Understanding these rules and how to layer your own firewall configuration on top is essential for securing containerized environments. This guide covers LXD's firewall behavior, how to restrict container traffic, and how to work alongside UFW.

## How LXD Manages Firewall Rules

When LXD creates a bridge network (like `lxdbr0`), it automatically inserts iptables rules to:
- Enable NAT for outbound traffic from containers
- Allow DNS queries from containers to the host's dnsmasq
- Forward traffic between the bridge and the outside network

```bash
# View LXD's iptables rules
sudo iptables -L -n -v

# Look for rules referencing lxdbr0
sudo iptables -L -n -v | grep -E "lxdbr0|lxd"

# View LXD's NAT rules
sudo iptables -t nat -L -n -v | grep lxdbr0
```

## LXD's Built-in Firewall Control

LXD's managed firewall rules can be toggled per-network:

```bash
# View firewall settings for the default bridge
lxc network show lxdbr0 | grep firewall

# Disable LXD-managed iptables rules for lxdbr0
# (do this only if you manage iptables yourself)
lxc network set lxdbr0 ipv4.firewall false
lxc network set lxdbr0 ipv6.firewall false

# Re-enable
lxc network set lxdbr0 ipv4.firewall true
```

## Restricting Outbound Container Traffic

By default, containers on `lxdbr0` can reach anything on the internet. To restrict what containers can access:

```bash
# Block all outbound from containers except DNS and HTTP/HTTPS
# First, find the LXD bridge subnet
lxc network show lxdbr0 | grep ipv4.address
# ipv4.address: 10.200.0.1/24

# Allow DNS (port 53) to host
sudo iptables -I FORWARD -i lxdbr0 -o lxdbr0 -d 10.200.0.1 -p udp --dport 53 -j ACCEPT
sudo iptables -I FORWARD -i lxdbr0 -o lxdbr0 -d 10.200.0.1 -p tcp --dport 53 -j ACCEPT

# Allow HTTP and HTTPS outbound
sudo iptables -I FORWARD -i lxdbr0 -p tcp --dport 80 -j ACCEPT
sudo iptables -I FORWARD -i lxdbr0 -p tcp --dport 443 -j ACCEPT

# Allow established/related connections back
sudo iptables -I FORWARD -i lxdbr0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Drop everything else outbound from containers
sudo iptables -A FORWARD -i lxdbr0 -j DROP
```

## Restricting Inbound Traffic to Containers

Containers have private IPs (10.200.0.x) that are not directly reachable from outside. Traffic to containers typically comes through port forwarding. Restrict what can be forwarded:

### Setting Up Port Forwarding

```bash
# Forward host port 8080 to container port 80
# Get the container IP
lxc list  # note the IP of your container, e.g., 10.200.0.100

# Add port forward in iptables
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 8080 \
  -j DNAT --to-destination 10.200.0.100:80

# Allow the forwarded traffic
sudo iptables -A FORWARD -i eth0 -o lxdbr0 \
  -d 10.200.0.100 -p tcp --dport 80 -j ACCEPT
```

### Using LXD's Built-in Proxy Devices

LXD has a cleaner way to forward ports that doesn't require manual iptables:

```bash
# Forward host port 8080 to container port 80
lxc config device add mycontainer http-proxy proxy \
  listen=tcp:0.0.0.0:8080 \
  connect=tcp:127.0.0.1:80

# Forward host port 8443 to container port 443
lxc config device add mycontainer https-proxy proxy \
  listen=tcp:0.0.0.0:8443 \
  connect=tcp:127.0.0.1:443

# List proxy devices
lxc config device show mycontainer

# Remove a proxy device
lxc config device remove mycontainer http-proxy
```

LXD proxy devices are preferred over manual iptables because they are managed by LXD and persist across container restarts.

## Working Alongside UFW

UFW (Uncomplicated Firewall) and LXD can conflict because UFW's default `FORWARD DROP` policy blocks container traffic. This is a known issue with LXD on Ubuntu.

### The UFW + LXD Problem

```bash
# Enable UFW (default config)
sudo ufw enable

# This breaks container networking because UFW drops FORWARD by default
# Test by pinging from inside a container:
lxc exec mycontainer -- ping -c 3 8.8.8.8
# PING fails
```

### Fix Option 1: Configure UFW to Allow LXD Forwarding

```bash
# Edit UFW's before.rules to allow forwarding for the LXD subnet
sudo nano /etc/ufw/before.rules

# Add these lines before the "*filter" section:
*nat
:POSTROUTING ACCEPT [0:0]
-A POSTROUTING -s 10.200.0.0/24 ! -d 10.200.0.0/24 -j MASQUERADE
COMMIT

# After *filter, add:
-A ufw-before-forward -s 10.200.0.0/24 -j ACCEPT
-A ufw-before-forward -d 10.200.0.0/24 -j ACCEPT
```

Also allow IPv4 forwarding in UFW's sysctl settings:

```bash
# Edit /etc/ufw/sysctl.conf
sudo sed -i 's/#net.ipv4.ip_forward/net.ipv4.ip_forward/' /etc/ufw/sysctl.conf

# Reload UFW
sudo ufw reload
```

### Fix Option 2: Disable LXD-managed Firewall, Use UFW Exclusively

```bash
# Tell LXD not to manage iptables for its bridge
lxc network set lxdbr0 ipv4.firewall false

# Manually add UFW rules for LXD traffic
sudo ufw allow in on lxdbr0
sudo ufw allow out on lxdbr0
sudo ufw route allow in on lxdbr0
sudo ufw route allow out on lxdbr0

# Allow NAT for container internet access
# (still needs before.rules edit above)
```

### Fix Option 3: Use a Separate Network Namespace

Create a dedicated bridge that UFW ignores:

```bash
# Add an exception for the LXD bridge in UFW
echo "-A ufw-before-forward -i lxdbr0 -j ACCEPT
-A ufw-before-forward -o lxdbr0 -j ACCEPT" | \
  sudo tee -a /etc/ufw/before.rules

sudo ufw reload
```

## Isolating Containers from Each Other

By default, containers on the same LXD bridge can communicate directly. To isolate them:

```bash
# Disable inter-container communication on the bridge
lxc network set lxdbr0 bridge.driver=native
lxc network set lxdbr0 security.macfilter=true

# Block traffic between containers using iptables
sudo iptables -I FORWARD -i lxdbr0 -o lxdbr0 -j DROP

# Allow specific container-to-container communication
# (get IPs from lxc list)
sudo iptables -I FORWARD -i lxdbr0 -o lxdbr0 \
  -s 10.200.0.100 -d 10.200.0.101 -j ACCEPT
```

## Making Firewall Rules Persistent

iptables rules are lost on reboot. Use `iptables-persistent` to save them:

```bash
# Install iptables-persistent
sudo apt install -y iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Rules are saved to:
# /etc/iptables/rules.v4
# /etc/iptables/rules.v6

# Reload rules
sudo netfilter-persistent reload
```

Note: LXD re-adds its own rules at startup, so save rules after LXD starts. A systemd override can help sequence this correctly:

```bash
# Create a systemd service to re-apply your custom rules after LXD starts
sudo tee /etc/systemd/system/custom-iptables.service <<'EOF'
[Unit]
Description=Apply custom iptables rules after LXD
After=snap.lxd.daemon.service
Wants=snap.lxd.daemon.service

[Service]
Type=oneshot
ExecStart=/sbin/netfilter-persistent reload
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable custom-iptables.service
```

## Auditing Container Firewall Rules

```bash
# View all current firewall rules in a readable format
sudo iptables -L -n -v --line-numbers

# View NAT table (shows masquerade/port forwarding rules)
sudo iptables -t nat -L -n -v --line-numbers

# Check what LXD proxy devices are configured
for container in $(lxc list --format csv | awk -F',' '{print $1}'); do
  proxies=$(lxc config device show "$container" 2>/dev/null | grep -A3 "type: proxy" | head -20)
  if [ -n "$proxies" ]; then
    echo "=== $container proxies ==="
    echo "$proxies"
  fi
done
```

LXD's firewall integration works best when you either let LXD manage rules entirely (simplest) or disable LXD-managed rules and own the entire iptables configuration yourself. The hybrid approach - LXD managing bridge NAT while you layer restrictions on top - requires careful ordering of rules to avoid conflicts.
