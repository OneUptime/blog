# How to Secure Your DHCP Server Against Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Security, Networking, Sysadmin, Network Security

Description: DHCP servers are vulnerable to starvation attacks, rogue server impersonation, and unauthorized access, and can be hardened through DHCP snooping, rate limiting, MAC filtering, and firewall rules.

Note: The examples below target existing ISC DHCP deployments on Debian/Ubuntu-style systems. ISC DHCP is end-of-life; use a maintained DHCP server such as Kea for new deployments.

## Common DHCP Attack Vectors

| Attack | Description | Impact |
|--------|-------------|--------|
| DHCP Starvation | Exhaust the pool with fake MACs | Legitimate clients can't get IPs |
| Rogue DHCP Server | Attacker serves malicious gateway/DNS | MitM traffic redirect |
| DHCP Spoofing | Fake DHCP replies | Incorrect configuration |
| Unauthorized Access | Direct access to DHCP admin | Config tampering |

## Defense 1: Restrict DHCP Server to Specific Interfaces

```bash
# Only listen on internal interface - never on WAN

sudo tee /etc/default/isc-dhcp-server << 'EOF'
INTERFACESv4="eth1"   # LAN only, NOT eth0 (WAN)
EOF
```

## Defense 2: Firewall the DHCP Server

```bash
# Allow direct DHCP client requests only on the LAN interface.
# New clients may use source IP 0.0.0.0, so filter by interface instead of source subnet.
sudo iptables -A INPUT -i eth1 -p udp --sport 68 --dport 67 -j ACCEPT

# If you use DHCP relays, allow only trusted relay agent IPs.
# sudo iptables -A INPUT -p udp --dport 67 -s 10.0.10.5 -j ACCEPT

# Block DHCP server traffic on WAN and any unexpected interface
sudo iptables -A INPUT -i eth0 -p udp --dport 67 -j DROP    # Drop on WAN
sudo iptables -A INPUT -p udp --dport 67 -j DROP            # Deny all other DHCP server requests
```

## Defense 3: MAC Address Filtering

```bash
# Allow only known MACs in dhcpd.conf
# For dynamic pools, place deny unknown-clients inside the pool

# dhcpd.conf: deny clients without a host declaration in the address pool
subnet 10.0.10.0 netmask 255.255.255.0 {
    option routers 10.0.10.1;

    pool {
        range 10.0.10.100 10.0.10.200;
        deny unknown-clients;
    }
}

host known-workstation-1 {
    hardware ethernet aa:bb:cc:dd:ee:01;
    fixed-address 10.0.10.10;
}
```

## Defense 4: Rate Limiting DHCP Requests

```bash
# iptables: limit DHCP discover rate per source MAC (not directly possible)
# Use switch-level rate limiting (see DHCP snooping post)

# Or limit aggregate DHCP rate by packet source IP (for example, per relay agent).
# Place these before your final DHCP ACCEPT/DROP rules.
sudo iptables -A INPUT -p udp --dport 67 -m recent --name DHCP --update --seconds 10 --hitcount 20 -j DROP
sudo iptables -A INPUT -p udp --dport 67 -m recent --name DHCP --set
```

## Defense 5: Secure the Admin Interface

```bash
# Leave OMAPI disabled unless you need remote DHCP management.
# If OMAPI is required, require a key and restrict TCP/7911 to trusted admins.
sudo iptables -A INPUT -p tcp --dport 7911 -s 10.0.10.5 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 7911 -j DROP

# In dhcpd.conf:
omapi-port 7911;
omapi-key dhcpKey;

# Key generation
tsig-keygen -a HMAC-SHA256 dhcpKey | sudo tee -a /etc/dhcp/dhcpd.conf > /dev/null
```

## Defense 6: Enable Conflict Detection

```text
# /etc/dhcp/dhcpd.conf
# Ping before offering dynamic leases to prevent duplicate assignments
ping-check true;
ping-timeout 1;
```

## Defense 7: Monitor for Rogue DHCP Servers

```bash
# Scan for DHCP servers on the network
sudo nmap --script broadcast-dhcp-discover -e eth0

# Or use dhcp-probe (detects multiple DHCP servers)
sudo apt install dhcp-probe
sudo dhcp_probe eth0
```

## Key Takeaways

- Bind the DHCP server only to internal interfaces.
- Use pool-level `deny unknown-clients` and MAC reservations to reduce starvation risk.
- Enable DHCP snooping on switches to block rogue DHCP servers.
- Monitor for unauthorized DHCP servers with `nmap --script broadcast-dhcp-discover`.
