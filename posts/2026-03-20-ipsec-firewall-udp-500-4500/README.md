# How to Configure IPsec Firewall Rules for UDP 500 and 4500

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, iptables, Firewall, UDP 500, NAT-T, Linux

Description: Configure iptables and firewalld rules to allow IPsec IKE traffic on UDP 500 and NAT-T traffic on UDP 4500 for VPN tunnel establishment.

IPsec requires specific UDP ports to be open through the firewall. If NAT-T is not used, ESP must also be allowed. Without correct firewall rules, IKE negotiation or encrypted traffic can fail.

## Ports Required by IPsec

| Protocol/Port | Purpose |
|---|---|
| UDP 500 | IKE (Internet Key Exchange) |
| UDP 4500 | IKE NAT Traversal (NAT-T) and UDP-encapsulated ESP |
| IP Protocol 50 (ESP) | Encrypted payload packets when native ESP is used |
| IP Protocol 51 (AH) | Authentication Header (rarely used now; not NAT-friendly) |

## iptables Rules for IPsec

```bash
# Allow IKE traffic (UDP 500) - required for all IPsec

sudo iptables -A INPUT -p udp --dport 500 -j ACCEPT

# Allow NAT-T traffic (UDP 4500) - required when behind NAT
sudo iptables -A INPUT -p udp --dport 4500 -j ACCEPT

# Allow ESP (protocol 50) when native ESP is used - the actual encrypted data
sudo iptables -A INPUT -p esp -j ACCEPT

# Allow AH (protocol 51) - authentication without encryption
sudo iptables -A INPUT -p ah -j ACCEPT

# Allow outbound IKE, ESP, and optional AH
sudo iptables -A OUTPUT -p udp --sport 500 -j ACCEPT
sudo iptables -A OUTPUT -p udp --sport 4500 -j ACCEPT
sudo iptables -A OUTPUT -p esp -j ACCEPT
sudo iptables -A OUTPUT -p ah -j ACCEPT
```

## Allow Forwarding for IPsec Traffic

```bash
# Allow traffic to pass through when protected by IPsec
sudo iptables -A FORWARD -m policy --dir in --pol ipsec -j ACCEPT
sudo iptables -A FORWARD -m policy --dir out --pol ipsec -j ACCEPT

# Or with specific subnet restrictions:
sudo iptables -A FORWARD -s 192.168.1.0/24 -m policy --dir in --pol ipsec -j ACCEPT
sudo iptables -A FORWARD -d 192.168.1.0/24 -m policy --dir out --pol ipsec -j ACCEPT
```

## Restricting to Specific Peer IPs

```bash
# Use these instead of the broader INPUT rules above when the peer IP is fixed
PEER_IP="5.6.7.8"

sudo iptables -A INPUT -s $PEER_IP -p udp --dport 500 -j ACCEPT
sudo iptables -A INPUT -s $PEER_IP -p udp --dport 4500 -j ACCEPT
sudo iptables -A INPUT -s $PEER_IP -p esp -j ACCEPT
sudo iptables -A INPUT -s $PEER_IP -p ah -j ACCEPT

# Drop everything else for IPsec
sudo iptables -A INPUT -p udp --dport 500 -j DROP
sudo iptables -A INPUT -p udp --dport 4500 -j DROP
sudo iptables -A INPUT -p esp -j DROP
sudo iptables -A INPUT -p ah -j DROP
```

## firewalld Rules (RHEL/CentOS)

```bash
# Using firewalld services
sudo firewall-cmd --permanent --add-service=ipsec
sudo firewall-cmd --reload

# Verify the service was added
sudo firewall-cmd --list-services

# What the ipsec service includes:
# UDP 500, UDP 4500, protocol: esp, protocol: ah
sudo firewall-cmd --info-service=ipsec
```

## UFW Rules (Ubuntu)

```bash
# UFW can allow ESP and AH directly
# Allow IKE
sudo ufw allow 500/udp
sudo ufw allow 4500/udp

# Allow native ESP and optional AH
sudo ufw allow proto esp from any to any
sudo ufw allow proto ah from any to any
```

## Verifying Rules are Active

```bash
# Check UDP 500 rule
sudo iptables -L INPUT -n | grep "500\|dpt:500"

# Check ESP rule
sudo iptables -L INPUT -n | grep "esp\|proto 50"

# Test from the remote peer side
nc -zuv <GATEWAY_IP> 500
nc -zuv <GATEWAY_IP> 4500
```

## NAT Considerations

If the IPsec gateway is behind NAT, the NAT device must:
1. Allow UDP 500 and 4500 inbound
2. Forward those ports to the internal gateway
3. Allow native ESP only if NAT-T is not being used; with NAT-T, ESP is encapsulated in UDP 4500

```bash
# If you need to force UDP encapsulation in strongSwan, set this in swanctl.conf:
# encap = yes
# This encapsulates ESP in UDP 4500 even when no NAT is detected
```

Correct firewall rules for IPsec ports are a prerequisite for any successful tunnel establishment.
