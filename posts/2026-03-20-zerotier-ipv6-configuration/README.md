# How to Configure ZeroTier with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ZeroTier, IPv6, VPN, Mesh Network, Network Configuration, SDN

Description: A guide to configuring ZeroTier networks with IPv6 addressing, including RFC 4193 private addresses and global unicast delegation for ZeroTier members.

ZeroTier is a software-defined networking platform that creates virtual Layer 2 networks. It supports IPv6 natively, allowing you to assign either private IPv6 addresses (RFC 4193) or delegate public IPv6 prefixes to ZeroTier network members.

## Installing ZeroTier

```bash
# Linux (official script)

curl -s https://install.zerotier.com | sudo bash

# Debian/Ubuntu (manual repo setup)
curl -s https://raw.githubusercontent.com/zerotier/ZeroTierOne/master/doc/contact%40zerotier.com.gpg \
  | gpg --dearmor | sudo tee /usr/share/keyrings/zerotierone-archive-keyring.gpg >/dev/null
RELEASE=$(lsb_release -cs)
echo "deb [signed-by=/usr/share/keyrings/zerotierone-archive-keyring.gpg] http://download.zerotier.com/debian/${RELEASE} ${RELEASE} main" \
  | sudo tee /etc/apt/sources.list.d/zerotier.list
sudo apt-get update
sudo apt-get install zerotier-one

# Join a network
sudo zerotier-cli join <network-id>

# Check status
sudo zerotier-cli status
sudo zerotier-cli listnetworks
```

## Configuring IPv6 in ZeroTier Central (Web UI)

Navigate to https://my.zerotier.com, select your network, and configure IPv6 under "IPv6 Auto-Assign":

### Option 1: RFC 4193 (Private IPv6)

ZeroTier can auto-assign a unique-local (`fd00::/8`) address based on the network ID:

1. In the network settings, enable "Auto-Assign from Range"
2. ZeroTier generates a network-specific `fd` prefix: `fd<network-id-hash>::/88`
3. Each member gets an address from this range

### Option 2: 6PLANE (Full Mesh Addressing)

ZeroTier's 6PLANE mode assigns each node an IPv6 address that encodes routing information:

1. Enable "6PLANE" in network settings
2. Each node gets a `/80` prefix - allowing that node to further subdivide
3. This enables VM-to-VM connectivity without additional routing configuration

### Option 3: Public IPv6 Delegation

If you own a public IPv6 prefix, ZeroTier can assign addresses from it:

1. Add your owned IPv6 prefix in "Managed Routes"
2. ZeroTier routes the prefix to specific members

## Managing IPv6 via ZeroTier CLI

```bash
# List networks with IPv6 addresses
sudo zerotier-cli listnetworks

# Example output:
# <nwid> <name> <mac> OK PRIVATE ztXXXX
#   type: PRIVATE
#   assignedAddresses: 192.168.100.10/24 fd56:3434:5555::1/88

# Get peer details
sudo zerotier-cli peers

# Check routes (routes are included in listnetworks output;
# use system routing tools for the active kernel routes)
ip -6 route show
```

## Verifying IPv6 on ZeroTier Interface

```bash
# Check IPv6 address on ZeroTier interface
ip -6 addr show ztXXXXXXXX

# Test connectivity to another ZeroTier member via IPv6
ping6 fd56:3434:5555::peer-address

# Check routing table
ip -6 route show
```

## Configuring IPv6 Routes in ZeroTier Central

Via the web UI or API, add managed routes to direct IPv6 traffic:

```bash
# Via ZeroTier Central API
curl -X POST https://api.zerotier.com/api/v1/network/<nwid> \
  -H "Authorization: token <your-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "routes": [
        {"target": "fd56:3434:5555::/48", "via": null}
      ],
      "v6AssignMode": {
        "rfc4193": true,
        "6plane": false
      }
    }
  }'
```

## IPv6 Default Route Through ZeroTier

Route all IPv6 traffic through a specific ZeroTier member (exit node):

```bash
# In ZeroTier Central, add managed route:
# Target: ::/0
# Via: <exit-node-zt-address>

# On the exit node, enable forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Configure NAT for IPv6 (if exit node has IPv6 Internet)
sudo ip6tables -t nat -A POSTROUTING -s fd56:3434:5555::/48 -o eth0 -j MASQUERADE
```

## ZeroTier IPv6 vs Tailscale IPv6

| Feature | ZeroTier | Tailscale |
|---|---|---|
| IPv6 addressing | RFC 4193 or public | fd7a:115c:a1e0::/48 |
| 6PLANE mode | Yes | No |
| Central management | my.zerotier.com | login.tailscale.com |
| Self-hosted controller | Yes (ZeroTierOne) | Yes (headscale) |
| IPv6 transport | Yes | Yes |

ZeroTier's 6PLANE mode is particularly useful for container and VM environments where each ZeroTier node needs to route IPv6 for multiple virtual machines without additional routing configuration.
