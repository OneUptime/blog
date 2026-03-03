# How to Set Up ZeroTier Virtual Network on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, VPN, ZeroTier, Linux

Description: Learn how to install and configure ZeroTier on Ubuntu to create a flat, encrypted virtual network connecting devices across different physical locations and networks.

---

ZeroTier creates a software-defined network that behaves like a local LAN, regardless of where your machines are physically located. You get a flat, routable network where every node gets a stable virtual IP address, and nodes can reach each other directly using peer-to-peer paths when possible - falling back through ZeroTier's relay infrastructure when direct paths are blocked by NAT or firewalls.

This is useful for connecting servers in different data centers, remote development machines, home lab equipment behind carrier-grade NAT, or any situation where you want devices to communicate as if they're on the same network without managing your own VPN infrastructure.

## How ZeroTier Works

ZeroTier combines two layers:

- **VL1 (Virtual Layer 1)** - the peer-to-peer transport layer that handles encrypted communication between nodes. Each node has a globally unique 10-digit node ID derived from its public key.
- **VL2 (Virtual Layer 2)** - the virtual ethernet layer that emulates a real LAN. Networks have 16-digit network IDs and can be configured to control which nodes can join.

Nodes communicate directly when possible using UDP hole-punching. When direct connections fail (both peers are behind symmetric NAT, for example), ZeroTier routes traffic through its planet/moon relay infrastructure, though with higher latency.

## Installing ZeroTier on Ubuntu

ZeroTier provides a one-line install script, or you can add their repository manually:

```bash
# Option 1: Using the install script (downloads and runs automatically)
curl -s https://install.zerotier.com | sudo bash

# Option 2: Manual repository setup
curl -fsSL https://raw.githubusercontent.com/zerotier/ZeroTierOne/main/doc/contact%40zerotier.com.gpg | \
    gpg --dearmor | sudo tee /usr/share/keyrings/zerotier.gpg > /dev/null

echo "deb [signed-by=/usr/share/keyrings/zerotier.gpg] https://download.zerotier.com/debian/focal focal main" | \
    sudo tee /etc/apt/sources.list.d/zerotier.list

sudo apt update
sudo apt install zerotier-one
```

After installation, enable and start the service:

```bash
# Start ZeroTier and enable on boot
sudo systemctl enable --now zerotier-one

# Verify it's running
systemctl status zerotier-one

# Get your node's address (the 10-digit node ID)
sudo zerotier-cli info
```

The output of `zerotier-cli info` looks like:
```text
200 info a1b2c3d4e5 1.12.2 ONLINE
```

That `a1b2c3d4e5` is your node ID. You'll need this to authorize the node on a network.

## Creating a Network

You have two options: use ZeroTier Central (ZeroTier's hosted controller) for free with up to 25 devices, or run your own controller. The hosted option is the easiest starting point.

### Using ZeroTier Central

1. Create an account at my.zerotier.com
2. Click "Create A Network" - you'll get a 16-character network ID like `a09acf0233b5e9fe`
3. The network is set to private by default, meaning nodes must be manually authorized

### Joining a Network

```bash
# Join a network using its 16-digit network ID
sudo zerotier-cli join a09acf0233b5e9fe

# Check your current network memberships
sudo zerotier-cli listnetworks

# The status will show as REQUESTING_CONFIGURATION until authorized
```

After joining, go to the ZeroTier Central dashboard, find the network, scroll to the Members section, and check the Auth checkbox next to your node's ID. Within seconds:

```bash
# Check the network status again - should now show OK
sudo zerotier-cli listnetworks

# You should have a zerotier network interface
ip addr show | grep zt
```

The ZeroTier interface name starts with `zt` followed by characters derived from the network ID.

## Configuring Network Settings

In ZeroTier Central, you can configure:

- **IP Assignment**: ZeroTier can auto-assign IPs from a pool you define. Add a range like `10.147.20.0/24` and enable "Auto-Assign from Range"
- **Access Control**: Private networks require manual authorization per node. Public networks let anyone join (not recommended for sensitive environments)
- **Routes**: Push routes to members so traffic for specific subnets is routed through the ZeroTier network

```bash
# After authorization and IP assignment, verify connectivity
# Get the assigned ZeroTier IP
sudo zerotier-cli listnetworks | grep -i "a09acf0233b5e9fe"

# Ping another node on the same network
ping 10.147.20.2

# Check peer connection status
sudo zerotier-cli peers
```

The peers output shows each connected node, its latency, and whether you have a direct or relayed connection.

## Setting Up Managed Routes

One powerful use case is routing traffic for an entire subnet through a ZeroTier node. For example, if you have servers on a private `192.168.100.0/24` subnet and one node with access to that subnet, you can push that route to all ZeroTier members.

On the gateway node (the one that has access to the target subnet):

```bash
# Enable IP forwarding
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Add NAT rules so packets from ZeroTier clients can reach the local subnet
# Replace zt7nnno with your actual ZeroTier interface name
sudo iptables -t nat -A POSTROUTING -o eth0 -s 10.147.20.0/24 -j MASQUERADE
sudo iptables -A FORWARD -i zt7nnno -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o zt7nnno -m state --state RELATED,ESTABLISHED -j ACCEPT

# Make iptables rules persistent
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

In ZeroTier Central, add a managed route pointing `192.168.100.0/24` via the gateway node's ZeroTier IP (for example `10.147.20.1`). All members will then have `192.168.100.0/24` reachable through the ZeroTier network.

## Self-Hosted Controller with ZeroTier-Controller

For environments where you don't want to rely on ZeroTier Central:

```bash
# ZeroTier One includes the controller functionality
# It's activated when you create networks through the local API

# Create a network via the local API
sudo zerotier-cli api /controller/network/$(sudo zerotier-cli info | cut -d' ' -f3)______ -X POST \
    -H "Content-Type: application/json" \
    -d '{"name": "mynetwork", "private": true}'

# List networks managed by this controller
sudo zerotier-cli listnetworks
```

Alternatively, `ztncui` is a web UI for self-hosted ZeroTier controllers:

```bash
# Install Node.js first
sudo apt install nodejs npm

# Install ztncui globally
sudo npm install -g ztncui

# Configure and start the web UI
export ZT_TOKEN=$(sudo cat /var/lib/zerotier-one/authtoken.secret)
export ZT_ADDR=http://localhost:9993
sudo -E ztncui
```

## Moons: Self-Hosted Infrastructure Nodes

By default, all traffic that can't go peer-to-peer routes through ZeroTier's planet nodes. You can add your own "moon" nodes to reduce reliance on ZeroTier's infrastructure - useful for air-gapped environments or when you want predictable relay paths.

```bash
# On the machine you want to make a moon
sudo zerotier-cli orbit <moon-node-id> <moon-node-id>

# Generate a moon definition file on the moon server
cd /var/lib/zerotier-one
sudo zerotier-idtool initmoon identity.public > moon.json

# Edit moon.json to add your server's public IP
sudo nano moon.json
# Set the "stableEndpoints" array to include your server's IP and port 9993
# e.g., "stableEndpoints": ["203.0.113.5/9993"]

# Generate the final moon file
sudo zerotier-idtool genmoon moon.json

# Move the resulting moon file to the moons.d directory
sudo mkdir -p /var/lib/zerotier-one/moons.d
sudo cp *.moon /var/lib/zerotier-one/moons.d/
sudo systemctl restart zerotier-one
```

On other nodes that should use this moon:

```bash
# Orbit the moon using its node ID
sudo zerotier-cli orbit <moon-node-id> <moon-node-id>

# Verify the moon is in use
sudo zerotier-cli listpeers | grep MOON
```

## Firewall Considerations

ZeroTier uses UDP port 9993 by default. If you have a firewall, allow this port:

```bash
# Allow ZeroTier's UDP port
sudo ufw allow 9993/udp

# If you want to allow traffic between ZeroTier nodes
sudo ufw allow in on zt+ from any to any
```

## Checking Connection Quality

```bash
# Detailed peer status with latency
sudo zerotier-cli peers

# Network information
sudo zerotier-cli listnetworks

# Full node info
sudo zerotier-cli info -j

# Leave a network
sudo zerotier-cli leave a09acf0233b5e9fe
```

ZeroTier is straightforward to get running but has considerable depth when you need managed routes, moons, or flow rules for network policy. For most use cases - connecting a handful of servers across different locations - the basic setup covered here is sufficient.
