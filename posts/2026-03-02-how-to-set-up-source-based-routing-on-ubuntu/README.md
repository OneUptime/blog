# How to Set Up Source-Based Routing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Routing, Policy Routing, iproute2

Description: Configure source-based (policy) routing on Ubuntu to route traffic through different gateways based on source IP address using ip rule and ip route.

---

Standard routing sends all traffic through a single default gateway regardless of where it comes from. Source-based routing (also called policy routing) makes routing decisions based on the source IP address, the source interface, or other packet attributes. This is essential for multi-homed servers with multiple ISPs, servers with multiple IP addresses that must respond through the correct interface, and VPN setups.

## Why Source-Based Routing

Consider a server with two network interfaces and two ISPs:
- `eth0` - IP 192.168.1.100, gateway 192.168.1.1 (ISP1)
- `eth1` - IP 10.0.0.100, gateway 10.0.0.1 (ISP2)

With a single default gateway via ISP1, traffic originating from `192.168.1.100` works fine, but return traffic to connections arriving on `eth1` (with source address 10.0.0.100) would go out through ISP1 - causing asymmetric routing and broken connections. Source-based routing fixes this.

## How Linux Policy Routing Works

Linux maintains multiple routing tables. The kernel uses routing rules (managed with `ip rule`) to decide which table to consult for each packet. Rules are evaluated in order by priority:

```bash
# View current routing rules
ip rule list
```

Default output:

```text
0:      from all lookup local
32766:  from all lookup main
32767:  from all lookup default
```

- Rule 0 (priority 0) - always check the `local` table first (for loopback and local addresses)
- Rule 32766 - check the `main` table (where your normal routes live)
- Rule 32767 - check the `default` table (usually empty)

You add rules with lower priority numbers to intercept traffic before it hits the main table.

## Setting Up Source-Based Routing

### Step 1: Create Custom Routing Tables

Routing table IDs 1-252 are available for custom use. Table names are mapped in `/etc/iproute2/rt_tables`:

```bash
# View current table name mappings
cat /etc/iproute2/rt_tables
```

Add entries for your custom tables:

```bash
# Add table names for ISP1 and ISP2
echo "100 isp1" | sudo tee -a /etc/iproute2/rt_tables
echo "200 isp2" | sudo tee -a /etc/iproute2/rt_tables
```

Using names instead of numbers makes the configuration more readable.

### Step 2: Add Routes to Each Table

Populate each routing table with the routes for that interface:

```bash
# Add default route for ISP1 table (traffic using eth0)
sudo ip route add default via 192.168.1.1 dev eth0 table isp1

# Add the local network route for eth0 in the isp1 table
sudo ip route add 192.168.1.0/24 dev eth0 scope link table isp1

# Add default route for ISP2 table (traffic using eth1)
sudo ip route add default via 10.0.0.1 dev eth1 table isp2

# Add the local network route for eth1 in the isp2 table
sudo ip route add 10.0.0.0/24 dev eth1 scope link table isp2
```

Verify the tables:

```bash
# View routes in each table
ip route show table isp1
ip route show table isp2
```

### Step 3: Add Routing Rules

Rules specify which packets use which routing table:

```bash
# Traffic from eth0's IP uses the isp1 routing table
sudo ip rule add from 192.168.1.100 table isp1 priority 100

# Traffic from eth1's IP uses the isp2 routing table
sudo ip rule add from 10.0.0.100 table isp2 priority 200
```

Verify the rules:

```bash
ip rule list
```

Output now shows your added rules:

```text
0:      from all lookup local
100:    from 192.168.1.100 lookup isp1
200:    from 10.0.0.100 lookup isp2
32766:  from all lookup main
32767:  from all lookup default
```

### Step 4: Test the Configuration

```bash
# Test that traffic from each IP goes through the correct gateway
# Ping Google using eth0's IP
ping -I 192.168.1.100 8.8.8.8

# Ping Google using eth1's IP - should go through ISP2
ping -I 10.0.0.100 8.8.8.8

# Verify routing decision
ip route get from 192.168.1.100 8.8.8.8
ip route get from 10.0.0.100 8.8.8.8
```

The `ip route get` command shows which gateway would be used for each source/destination combination.

## Making Configuration Persistent

The `ip rule` and `ip route` commands are not persistent across reboots. Make them permanent using Netplan or a startup script.

### Using Netplan (Recommended)

Netplan supports routing tables and policy routing:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.100/24]
      routes:
        # Default route for main table
        - to: default
          via: 192.168.1.1
          metric: 100
        # Routes for the isp1 routing table
        - to: default
          via: 192.168.1.1
          table: 100      # isp1 table ID
        - to: 192.168.1.0/24
          via: 0.0.0.0
          table: 100
      routing-policy:
        # Rule: traffic from this IP uses table 100 (isp1)
        - from: 192.168.1.100
          table: 100
          priority: 100

    eth1:
      dhcp4: false
      addresses: [10.0.0.100/24]
      routes:
        # Routes for the isp2 routing table
        - to: default
          via: 10.0.0.1
          table: 200      # isp2 table ID
        - to: 10.0.0.0/24
          via: 0.0.0.0
          table: 200
      routing-policy:
        # Rule: traffic from this IP uses table 200 (isp2)
        - from: 10.0.0.100
          table: 200
          priority: 200
```

Apply:

```bash
sudo netplan apply
```

### Using a Startup Script

If Netplan does not cover your case, create a startup script:

```bash
sudo tee /etc/network/if-up.d/policy-routing <<'EOF'
#!/bin/bash
# Policy routing setup - runs when any interface comes up

# Only run once (on eth0 coming up)
[ "$IFACE" = "eth0" ] || exit 0

# Wait for both interfaces to be up
sleep 2

# Flush existing rules and routes from custom tables
ip rule del table isp1 2>/dev/null
ip rule del table isp2 2>/dev/null
ip route flush table isp1 2>/dev/null
ip route flush table isp2 2>/dev/null

# Populate isp1 table
ip route add default via 192.168.1.1 dev eth0 table isp1
ip route add 192.168.1.0/24 dev eth0 scope link table isp1

# Populate isp2 table
ip route add default via 10.0.0.1 dev eth1 table isp2
ip route add 10.0.0.0/24 dev eth1 scope link table isp2

# Add routing rules
ip rule add from 192.168.1.100 table isp1 priority 100
ip rule add from 10.0.0.100 table isp2 priority 200

exit 0
EOF

sudo chmod +x /etc/network/if-up.d/policy-routing
```

Alternatively, use a systemd service:

```bash
sudo tee /etc/systemd/system/policy-routing.service <<'EOF'
[Unit]
Description=Policy routing rules
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/setup-policy-routing.sh

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable policy-routing
```

## Interface-Based Routing

In addition to source IP, you can route based on incoming interface:

```bash
# Mark packets arriving on eth1 with mark 2
# This uses iptables to mark packets, then route based on the mark
sudo iptables -t mangle -A PREROUTING -i eth1 -j MARK --set-mark 2

# Add a rule to use isp2 table for marked packets
sudo ip rule add fwmark 2 table isp2 priority 150
```

This is useful for routing incoming packets (to a NATted service, for example) back out through the same interface they arrived on.

## Debugging Policy Routing

```bash
# Show all routing rules
ip rule list

# Show routes in a specific table
ip route show table isp1
ip route show table isp2
ip route show table main
ip route show table local

# Check the routing decision for specific traffic
# format: ip route get [dest] from [source]
ip route get 8.8.8.8 from 192.168.1.100
ip route get 8.8.8.8 from 10.0.0.100

# Show all tables (warns if tables are inconsistent)
ip route show table all | head -50
```

## Removing Rules and Routes

```bash
# Remove a specific rule
sudo ip rule del from 10.0.0.100 table isp2

# Remove all routes from a table
sudo ip route flush table isp2

# Remove a specific route from a table
sudo ip route del default table isp1
```

Source-based routing requires a clear understanding of your network topology before you configure it, but once set up correctly, it handles multi-homed network scenarios cleanly and reliably. The combination of routing rules (`ip rule`) and separate routing tables (`ip route ... table`) is a powerful and flexible system.
