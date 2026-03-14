# How to Set Up NAT (Network Address Translation) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NAT, Networking, Iptables, Nftables

Description: Configure Network Address Translation (NAT) on Ubuntu using iptables and nftables to share a single public IP, set up port forwarding, and build a gateway for private networks.

---

NAT (Network Address Translation) allows multiple devices on a private network to share a single public IP address. It is also used for port forwarding - mapping external ports to internal hosts. Ubuntu systems frequently serve as NAT gateways for home labs, private cloud networks, and containerized environments.

This guide covers both iptables (the traditional tool) and nftables (the modern replacement) approaches.

## Prerequisites

NAT requires IP forwarding to be enabled:

```bash
# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# Make persistent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-forwarding.conf
sudo sysctl --system
```

Also identify your interfaces:

```bash
ip addr show
# Identify:
# - Your external/public interface (e.g., eth0 with public IP or DHCP from ISP)
# - Your internal/private interface (e.g., eth1 with 192.168.1.0/24)
```

For this guide: `eth0` = external (internet-facing), `eth1` = internal (192.168.1.0/24).

## NAT with iptables

### Masquerade NAT (Dynamic Source NAT)

Masquerade NAT is used when your external IP changes (DHCP). It automatically uses the current IP of the outgoing interface:

```bash
# Allow forwarding between interfaces
sudo iptables -A FORWARD -i eth1 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o eth1 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Add masquerade NAT rule
# All traffic leaving eth0 has its source IP replaced with eth0's IP
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

### Static Source NAT (SNAT)

If your external IP is static, SNAT is slightly more efficient than MASQUERADE:

```bash
# Replace source IP of all packets leaving eth0 with 203.0.113.10
sudo iptables -t nat -A POSTROUTING -o eth0 -j SNAT --to-source 203.0.113.10
```

### Verify NAT Rules

```bash
# Show NAT table rules
sudo iptables -t nat -L -n -v

# Show FORWARD rules
sudo iptables -L FORWARD -n -v
```

### Port Forwarding (DNAT)

Destination NAT forwards incoming connections on external ports to internal hosts.

Forward external TCP port 80 to an internal web server at 192.168.1.10:

```bash
# DNAT: redirect incoming port 80 to internal host
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 80 \
  -j DNAT --to-destination 192.168.1.10:80

# Allow the forwarded traffic through
sudo iptables -A FORWARD -i eth0 -o eth1 -p tcp --dport 80 \
  -d 192.168.1.10 -j ACCEPT
```

Forward external port 2222 to SSH on internal host 192.168.1.20:

```bash
sudo iptables -t nat -A PREROUTING -i eth0 -p tcp --dport 2222 \
  -j DNAT --to-destination 192.168.1.20:22

sudo iptables -A FORWARD -i eth0 -o eth1 -p tcp --dport 22 \
  -d 192.168.1.20 -j ACCEPT
```

### Hairpin NAT (Loopback NAT)

Without hairpin NAT, internal hosts cannot reach internal services via the external IP. Add this rule to handle traffic from the internal network destined for the external IP:

```bash
# Masquerade traffic from internal network going to internal servers via external IP
sudo iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -d 192.168.1.10 \
  -p tcp --dport 80 -j MASQUERADE
```

### Making iptables Rules Persistent

Install `iptables-persistent`:

```bash
sudo apt install iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Rules are automatically loaded at boot
# To manually save again after changes:
sudo iptables-save | sudo tee /etc/iptables/rules.v4
sudo ip6tables-save | sudo tee /etc/iptables/rules.v6
```

## NAT with nftables

nftables is the modern replacement for iptables. Ubuntu 20.04+ includes nftables, and it is the preferred tool going forward.

### Check nftables Status

```bash
systemctl status nftables

# View current ruleset
sudo nft list ruleset
```

### Basic NAT Configuration with nftables

Create a configuration file:

```bash
sudo tee /etc/nftables.conf <<'EOF'
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain forward {
        type filter hook forward priority 0;
        # Allow established/related connections
        ct state established,related accept
        # Allow forwarding from internal to external
        iifname "eth1" oifname "eth0" accept
        # Drop everything else
        drop
    }
}

table ip nat {
    chain prerouting {
        type nat hook prerouting priority -100;
        # Port forwarding: external port 80 -> internal 192.168.1.10:80
        iifname "eth0" tcp dport 80 dnat to 192.168.1.10:80
        # Port forwarding: external port 2222 -> internal 192.168.1.20:22
        iifname "eth0" tcp dport 2222 dnat to 192.168.1.20:22
    }

    chain postrouting {
        type nat hook postrouting priority 100;
        # Masquerade NAT for traffic leaving eth0
        oifname "eth0" masquerade
    }
}
EOF
```

Apply the configuration:

```bash
# Test the configuration first
sudo nft -c -f /etc/nftables.conf

# Apply it
sudo nft -f /etc/nftables.conf

# Enable nftables service for persistence
sudo systemctl enable nftables
```

### Viewing nftables NAT State

```bash
# List all rules
sudo nft list ruleset

# Show NAT table specifically
sudo nft list table ip nat

# Show connection tracking (active NAT sessions)
sudo conntrack -L | head -20
```

## Building a Complete Gateway

Here is a complete gateway setup for a private network:

### Network Topology

```text
Internet
    |
  eth0 (public IP, e.g., from ISP via DHCP)
  [Ubuntu Gateway]
  eth1 (192.168.10.1/24)
    |
  Internal Network (192.168.10.0/24)
  Hosts: 192.168.10.10 - 192.168.10.100
```

### Complete Configuration

```bash
# 1. Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1

# 2. Configure interfaces (via Netplan)
sudo tee /etc/netplan/01-gateway.yaml <<'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true    # External interface - gets IP from ISP
    eth1:
      dhcp4: false
      addresses:
        - 192.168.10.1/24    # Internal interface - static IP
EOF

sudo netplan apply

# 3. Set up NAT with nftables
sudo tee /etc/nftables.conf <<'EOF'
#!/usr/sbin/nft -f
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy accept;
        # Accept established connections
        ct state established,related accept
        # Accept loopback
        iifname lo accept
        # Accept SSH from anywhere (adjust as needed)
        tcp dport 22 accept
        # Drop invalid packets
        ct state invalid drop
    }
    chain forward {
        type filter hook forward priority 0; policy drop;
        ct state established,related accept
        iifname "eth1" oifname "eth0" accept
    }
    chain output {
        type filter hook output priority 0; policy accept;
    }
}

table ip nat {
    chain prerouting {
        type nat hook prerouting priority -100;
    }
    chain postrouting {
        type nat hook postrouting priority 100;
        oifname "eth0" masquerade
    }
}
EOF

sudo nft -f /etc/nftables.conf
sudo systemctl enable nftables

# 4. Make sysctl persistent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/99-gateway.conf
sudo sysctl --system
```

### Configure Internal Hosts

Internal hosts need to use the gateway as their default route:

```bash
# On internal hosts - set default gateway
sudo ip route add default via 192.168.10.1

# Or via Netplan on internal hosts:
# routes:
#   - to: default
#     via: 192.168.10.1
```

## Verifying NAT

```bash
# Check active NAT sessions
sudo conntrack -L

# Count connections by protocol
sudo conntrack -L | awk '{print $1}' | sort | uniq -c

# Monitor new connections in real time
sudo conntrack -E

# Test from internal host (should show the gateway's external IP)
curl ifconfig.me
```

## Common Issues

**Internal hosts cannot reach the internet:**
- Check IP forwarding: `sysctl net.ipv4.ip_forward`
- Check iptables FORWARD policy: `sudo iptables -L FORWARD -n`
- Verify the POSTROUTING masquerade rule exists

**Port forwarding not working:**
- Verify the DNAT rule is in PREROUTING: `sudo iptables -t nat -L PREROUTING -n`
- Confirm the FORWARD chain allows the traffic through
- Check that the internal host is accepting connections on the target port

**NAT sessions stuck:**
```bash
# Flush all connection tracking entries (disrupts existing connections)
sudo conntrack -F
```

NAT is straightforward once you understand the packet flow: PREROUTING happens before routing decisions (for DNAT), POSTROUTING happens after routing decisions (for SNAT/MASQUERADE). Getting those two chains right covers most NAT scenarios.
