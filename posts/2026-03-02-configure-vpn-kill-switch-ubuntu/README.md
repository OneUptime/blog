# How to Configure VPN Kill Switch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, VPN, Security, Networking, Privacy

Description: Set up a VPN kill switch on Ubuntu using iptables or UFW to block all internet traffic if the VPN connection drops, preventing traffic leaks.

---

A VPN kill switch is a safety mechanism that cuts off internet access if the VPN connection drops unexpectedly. Without it, your traffic might briefly (or permanently) route through your regular internet connection, exposing your real IP address and unencrypted traffic.

This is particularly important for privacy-sensitive applications, servers running automated tasks over VPN, or any situation where accidental exposure is unacceptable.

## How a Kill Switch Works

The basic idea is to configure firewall rules that:

1. Allow traffic to the VPN server's IP on the VPN port (so the VPN can connect)
2. Allow all traffic through the VPN interface (`tun0` or `wg0`)
3. Block all other internet traffic

If the VPN goes down, the VPN interface disappears, and rules 1 and 2 stop matching. Rule 3 kicks in and drops all traffic. Your real IP is never exposed.

## Kill Switch with iptables (Works with Any VPN)

This approach creates firewall rules that block all traffic except through the VPN interface:

```bash
# Store these in a script for easy management
sudo nano /usr/local/bin/vpn-kill-switch.sh
```

```bash
#!/bin/bash

# VPN configuration
VPN_SERVER_IP="203.0.113.1"    # Your VPN server's IP
VPN_PORT="1194"                  # VPN port (1194 for OpenVPN, 51820 for WireGuard)
VPN_PROTOCOL="udp"               # Protocol (udp or tcp)
VPN_INTERFACE="tun0"             # VPN interface name (tun0 for OpenVPN, wg0 for WireGuard)
LOCAL_SUBNET="192.168.1.0/24"   # Your local network subnet

# Clear existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X

# Set default policies - block everything by default
iptables -P INPUT DROP
iptables -P OUTPUT DROP
iptables -P FORWARD DROP

# Allow loopback traffic (required for local processes)
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established/related connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS on the VPN interface only
iptables -A OUTPUT -o ${VPN_INTERFACE} -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -o ${VPN_INTERFACE} -p tcp --dport 53 -j ACCEPT

# Allow all traffic through VPN interface
iptables -A INPUT -i ${VPN_INTERFACE} -j ACCEPT
iptables -A OUTPUT -o ${VPN_INTERFACE} -j ACCEPT

# Allow connections to the VPN server (to establish the VPN connection)
iptables -A OUTPUT -d ${VPN_SERVER_IP} -p ${VPN_PROTOCOL} --dport ${VPN_PORT} -j ACCEPT

# Allow local network traffic (optional - remove if you want to block LAN too)
iptables -A INPUT -s ${LOCAL_SUBNET} -j ACCEPT
iptables -A OUTPUT -d ${LOCAL_SUBNET} -j ACCEPT

echo "Kill switch enabled. All traffic blocked except VPN."
```

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/vpn-kill-switch.sh

# Run the kill switch
sudo /usr/local/bin/vpn-kill-switch.sh

# Verify the rules
sudo iptables -L -n -v
```

## Disabling the Kill Switch

When you want to restore normal internet access without the VPN:

```bash
# Create a disable script
sudo nano /usr/local/bin/disable-kill-switch.sh
```

```bash
#!/bin/bash

# Clear all rules
iptables -F
iptables -X

# Reset to permissive defaults
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT

echo "Kill switch disabled. Normal traffic restored."
```

```bash
sudo chmod +x /usr/local/bin/disable-kill-switch.sh
sudo /usr/local/bin/disable-kill-switch.sh
```

## Kill Switch Using UFW

If you prefer UFW (Uncomplicated Firewall):

```bash
# Reset UFW rules first
sudo ufw --force reset

# Set default policies - block everything
sudo ufw default deny incoming
sudo ufw default deny outgoing

# Allow loopback
sudo ufw allow in on lo
sudo ufw allow out on lo

# Allow VPN connection establishment
# For OpenVPN (UDP)
sudo ufw allow out to 203.0.113.1 port 1194 proto udp

# For WireGuard (UDP)
# sudo ufw allow out to 203.0.113.1 port 51820 proto udp

# Allow all traffic through VPN interface
sudo ufw allow in on tun0
sudo ufw allow out on tun0

# Allow local network (optional)
sudo ufw allow in on eth0 from 192.168.1.0/24
sudo ufw allow out on eth0 to 192.168.1.0/24

# Enable UFW
sudo ufw enable

# Verify
sudo ufw status verbose
```

## WireGuard Built-in Kill Switch

WireGuard's `wg-quick` has a built-in mechanism for implementing a kill switch. Add this to your WireGuard configuration:

```bash
sudo nano /etc/wireguard/wg0.conf
```

```ini
[Interface]
PrivateKey = YOUR_PRIVATE_KEY
Address = 10.0.0.2/32
DNS = 1.1.1.1

# Kill switch: block all traffic not through WireGuard
# PostUp adds the rules when WireGuard starts
PostUp = iptables -I OUTPUT ! -o %i -m mark ! --mark $(wg show %i fwmark) -m addrtype ! --dst-type LOCAL -j REJECT && ip6tables -I OUTPUT ! -o %i -m mark ! --mark $(wg show %i fwmark) -m addrtype ! --dst-type LOCAL -j REJECT

# PreDown removes the rules when WireGuard stops
PreDown = iptables -D OUTPUT ! -o %i -m mark ! --mark $(wg show %i fwmark) -m addrtype ! --dst-type LOCAL -j REJECT && ip6tables -D OUTPUT ! -o %i -m mark ! --mark $(wg show %i fwmark) -m addrtype ! --dst-type LOCAL -j REJECT

[Peer]
PublicKey = SERVER_PUBLIC_KEY
Endpoint = 203.0.113.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
```

This is the cleanest approach for WireGuard because the kill switch is tied to the WireGuard interface lifecycle.

## OpenVPN Kill Switch via Config

You can configure OpenVPN to enforce routing through the VPN and prevent leaks:

```conf
# Add to your OpenVPN client config
# Prevent DNS leaks
block-outside-dns

# Use only VPN DNS servers pushed by server
dhcp-option DNS 10.8.0.1

# Pull routes from server
pull

# Script-based kill switch approach
script-security 2
up /etc/openvpn/client/kill-switch-up.sh
down /etc/openvpn/client/kill-switch-down.sh
```

Create the scripts:

```bash
# /etc/openvpn/client/kill-switch-up.sh
#!/bin/bash
iptables -I OUTPUT ! -o tun0 -m mark ! --mark $(cat /proc/sys/net/ipv4/conf/tun0/rp_filter) -m addrtype ! --dst-type LOCAL -j REJECT

# /etc/openvpn/client/kill-switch-down.sh
#!/bin/bash
iptables -D OUTPUT ! -o tun0 -m mark ! --mark $(cat /proc/sys/net/ipv4/conf/tun0/rp_filter) -m addrtype ! --dst-type LOCAL -j REJECT

sudo chmod +x /etc/openvpn/client/kill-switch-*.sh
```

## Making the Kill Switch Persistent Across Reboots

iptables rules are lost on reboot unless saved:

```bash
# Save current iptables rules
sudo apt install iptables-persistent
sudo netfilter-persistent save

# Reload on demand
sudo netfilter-persistent reload

# Verify rules will be applied at boot
cat /etc/iptables/rules.v4
```

Alternatively, create a systemd service that applies the kill switch before the network comes up:

```bash
sudo nano /etc/systemd/system/vpn-kill-switch.service
```

```ini
[Unit]
Description=VPN Kill Switch
Before=network.target
DefaultDependencies=no

[Service]
Type=oneshot
ExecStart=/usr/local/bin/vpn-kill-switch.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable vpn-kill-switch.service
```

This ensures the kill switch is active before any network traffic can flow, even at boot before the VPN connects.

## Testing the Kill Switch

Before relying on the kill switch, test that it actually works:

```bash
# Connect to the VPN first
sudo wg-quick up wg0   # or sudo systemctl start openvpn-client@client1

# Verify internet works through VPN
curl ifconfig.me   # Should show VPN server's IP

# Now simulate a VPN drop by bringing down the interface
sudo ip link set wg0 down   # or sudo systemctl stop openvpn-client@client1

# Try to access the internet - this should fail
curl --connect-timeout 5 ifconfig.me
# Should timeout or be refused

# Bring the VPN back up
sudo ip link set wg0 up

# Confirm internet works again
curl ifconfig.me
```

## DNS Leak Prevention

Even with a VPN, DNS queries can still leak through your ISP's DNS servers. Prevent this:

```bash
# Block all DNS traffic except through VPN interface
iptables -A OUTPUT -p udp --dport 53 ! -o tun0 -j DROP
iptables -A OUTPUT -p tcp --dport 53 ! -o tun0 -j DROP

# Or specify VPN DNS only
# Configure /etc/resolv.conf or use systemd-resolved
echo "nameserver 10.8.0.1" | sudo tee /etc/resolv.conf
sudo chattr +i /etc/resolv.conf   # Prevent other processes from changing it

# Test for DNS leaks
dig +short myip.opendns.com @resolver1.opendns.com
# Should return VPN server's IP, not your real IP
```

## Multiple VPN Servers

If you use multiple VPN servers and want the kill switch to allow connections to any of them:

```bash
# Allow connections to multiple VPN servers
iptables -A OUTPUT -d 203.0.113.1 -p udp --dport 51820 -j ACCEPT   # Server 1
iptables -A OUTPUT -d 198.51.100.5 -p udp --dport 51820 -j ACCEPT  # Server 2

# Or allow by port regardless of destination (less strict)
iptables -A OUTPUT -p udp --dport 51820 -j ACCEPT
```

A kill switch is a critical component for privacy-focused VPN deployments. The WireGuard built-in approach is the cleanest for WireGuard users, while the iptables script approach gives you fine-grained control for any VPN type. Whatever method you choose, always test the kill switch by simulating a VPN disconnect before deploying it in production.
