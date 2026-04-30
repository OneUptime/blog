# How to Set Up a Guest WiFi Network with Isolated IPv4 Addressing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Guest WiFi, Network Isolation, IPv4, VLAN, Firewall

Description: Learn how to set up a guest WiFi network with a separate isolated IPv4 subnet, ensuring guests have internet access without being able to reach internal network resources.

## What Is a Guest WiFi Network?

A guest WiFi network provides internet access to visitors while preventing them from accessing internal network resources (printers, NAS, servers, other clients). It uses a separate IPv4 subnet and firewall rules to enforce isolation.

## Step 1: Design the Guest Network

```text
Internal Network: 192.168.1.0/24 (VLAN 1)
Guest Network:    192.168.100.0/24 (VLAN 100)

Rules:
✓ Guests can reach internet (via NAT)
✗ Guests cannot reach 192.168.1.0/24
✗ Internal clients cannot reach 192.168.100.0/24
✓ DNS: public resolver (8.8.8.8) or filtered DNS
```

## Step 2: Configure Guest VLAN and Interface

```bash
# On router/gateway (Linux)

# Create VLAN 100 for guest network
ip link add link eth0 name eth0.100 type vlan id 100
ip addr add 192.168.100.1/24 dev eth0.100
ip link set eth0.100 up

# Enable IP forwarding
sysctl -w net.ipv4.ip_forward=1
```

## Step 3: Set Up Guest DHCP Server

```bash
# /etc/dhcp/dhcpd.conf - add guest subnet

subnet 192.168.100.0 netmask 255.255.255.0 {
    range 192.168.100.100 192.168.100.200;
    option routers 192.168.100.1;
    # Use public DNS to avoid leaking internal DNS data
    option domain-name-servers 8.8.8.8, 1.1.1.1;
    # Short lease time (1 hour) for guest clients
    default-lease-time 3600;
    max-lease-time 7200;
}

# Restart DHCP
systemctl restart isc-dhcp-server
```

## Step 4: Configure Guest Firewall Isolation Rules

```bash
# Allow guest network to reach internet
iptables -A FORWARD -i eth0.100 -o eth1 -j ACCEPT

# Block guest network from reaching internal network
iptables -I FORWARD -i eth0.100 -d 192.168.1.0/24 -j DROP
iptables -I FORWARD -i eth0.100 -d 10.0.0.0/8 -j DROP
iptables -I FORWARD -i eth0.100 -d 172.16.0.0/12 -j DROP

# Block internal network from reaching guest
iptables -I FORWARD -o eth0.100 -s 192.168.1.0/24 -j DROP

# Allow established/related traffic
iptables -I FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# NAT guest traffic
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -o eth1 -j MASQUERADE

# Block guest-to-guest communication (client isolation)
ebtables -A FORWARD -i wlan0 -o wlan0 -j DROP
# Or use the access point's "client isolation" feature
```

## Step 5: Configure the Access Point (OpenWrt Example)

```bash
# /etc/config/wireless - add guest SSID

config wifi-iface 'guest_wifi'
    option device 'radio0'
    option mode 'ap'
    option ssid 'GuestNetwork'
    option key 'guestpassword'
    option encryption 'psk2'
    option network 'guest'
    option isolate '1'    # Enable client isolation

# /etc/config/network
config device 'guest_dev'
    option name 'br-guest'
    option type 'bridge'
    list ports 'eth0.100'

config interface 'guest'
    option device 'br-guest'
    option proto 'none'

# Reload
uci commit
/etc/init.d/network restart
/etc/init.d/wireless restart
```

## Step 6: Add Bandwidth Limiting for Guests

Prevent guests from consuming all bandwidth:

```bash
# Create a traffic shaping class for guest WiFi
# This example limits guest upload to 20 Mbps on the WAN interface

tc qdisc add dev eth1 root handle 1: htb default 10

# Parent class (example WAN speed: 100 Mbps)
tc class add dev eth1 parent 1: classid 1:1 htb rate 100mbit

# Default class for other traffic
tc class add dev eth1 parent 1:1 classid 1:10 htb rate 100mbit ceil 100mbit

# Guest limit (20 Mbps)
tc class add dev eth1 parent 1:1 classid 1:100 htb rate 20mbit ceil 20mbit

# Mark guest traffic with iptables
iptables -t mangle -A POSTROUTING -s 192.168.100.0/24 -o eth1 -j MARK --set-mark 100

# Apply shaping to marked packets
tc filter add dev eth1 parent 1: protocol ip handle 100 fw classid 1:100
```

## Conclusion

A properly isolated guest WiFi network uses a separate VLAN and IPv4 subnet (e.g., 192.168.100.0/24), firewall rules blocking access to the internal network, NAT for internet access, and ideally client isolation on the access point to prevent guest-to-guest communication. Use short DHCP lease times (1 hour) for guests and consider bandwidth limiting to prevent abuse. This setup provides internet access to visitors with strong isolation from your internal resources.
