# How to Configure IPv6 Router Advertisement over Wi-Fi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Router Advertisement, Wi-Fi, SLAAC, Radvd, NDP, Wireless

Description: Configure IPv6 Router Advertisement (RA) for wireless networks using radvd, including prefix announcement, RA flags for SLAAC vs DHCPv6, and securing RA to prevent rogue advertisements on Wi-Fi.

---

Router Advertisement (RA) is the mechanism by which IPv6 routers announce prefixes, gateway information, and configuration flags to clients. Over Wi-Fi, RA multicast packets reach all connected wireless clients, enabling SLAAC. Properly securing RA on wireless networks is critical to prevent rogue RA attacks.

## radvd Configuration for Wi-Fi Interface

```bash
# /etc/radvd.conf - Router Advertisement for Wi-Fi network

interface wlan0 {
    AdvSendAdvert on;
    MinRtrAdvInterval 10;
    MaxRtrAdvInterval 30;
    AdvDefaultLifetime 1800;
    AdvLinkMTU 1500;

    # DNS Recursive Name Servers (RDNSS - RFC 8106)
    RDNSS 2001:4860:4860::8888 2001:4860:4860::8844 {
        AdvRDNSSLifetime 3600;
    };

    # DNS Search List (DNSSL - RFC 8106)
    DNSSL example.com corp.example.com {
        AdvDNSSLLifetime 3600;
    };

    prefix 2001:db8:100::/64 {
        AdvOnLink on;
        AdvAutonomous on;         # Enable SLAAC
        AdvRouterAddr off;
        AdvValidLifetime 2592000;   # 30 days
        AdvPreferredLifetime 604800; # 7 days
    };
};
```

```bash
# Start radvd

sudo systemctl enable --now radvd

# Inspect received RA messages
sudo radvdump

# Check radvd status
sudo systemctl status radvd
sudo journalctl -u radvd -f
```

## RA and Prefix Flags Explained

```text
RA and Prefix Flag Reference:
┌─────┬───────────────────────────────────────────────────────────┐
│ M   │ Managed Address Configuration: Use DHCPv6 for addresses   │
│ O   │ Other Configuration: Use DHCPv6 for DNS/options only      │
│ A   │ Autonomous: Client can SLAAC from this prefix             │
│ L   │ On-Link: Prefix is reachable on this link                 │
└─────┴───────────────────────────────────────────────────────────┘

Mode Combinations:
- SLAAC only: M=0, O=0, A=1 (default radvd config)
- SLAAC + DNS via DHCPv6: M=0, O=1, A=1
- Full DHCPv6: M=1, O=1, A=0
- Both SLAAC and DHCPv6: M=1, O=1, A=1
```

```bash
# radvd.conf for SLAAC + DHCPv6 DNS (M=0, O=1)
interface wlan0 {
    AdvSendAdvert on;
    AdvOtherConfigFlag on;   # O flag: Use DHCPv6 for options
    # AdvManagedFlag off;    # M flag: Don't use DHCPv6 for addresses

    prefix 2001:db8:100::/64 {
        AdvOnLink on;
        AdvAutonomous on;    # SLAAC enabled
    };
};

# radvd.conf for full DHCPv6 (M=1, O=1)
interface wlan0 {
    AdvSendAdvert on;
    AdvManagedFlag on;    # M flag: Use DHCPv6 for addresses
    AdvOtherConfigFlag on; # O flag: Use DHCPv6 for options

    prefix 2001:db8:100::/64 {
        AdvOnLink on;
        AdvAutonomous off;   # Disable SLAAC
    };
};
```

## Securing RA on Wi-Fi (RA Guard)

```bash
# RA Guard prevents rogue RA from wireless clients

# Linux host: block received RA from unauthorized source MAC
sudo ip6tables -A INPUT -i wlan0 -p icmpv6 \
  --icmpv6-type router-advertisement \
  -m mac --mac-source ! 00:11:22:33:44:55 -j DROP

# On a Linux AP/bridge, drop RA arriving from the client-facing Wi-Fi interface
sudo ebtables -A FORWARD -i wlan0 -p IPv6 --ip6-protocol ipv6-icmp \
  --ip6-icmp-type 134 -j DROP

# On managed switches: Enable IPv6 RA Guard
# Cisco IOS:
# ipv6 nd raguard policy RA-GUARD
#   device-role host
# interface GigabitEthernet0/1
#   ipv6 nd raguard attach-policy RA-GUARD

# If bridge netfilter is enabled, log and drop forwarded RA
# arriving from the client-facing Wi-Fi interface
sudo ip6tables -I FORWARD 1 -i wlan0 -p icmpv6 \
  --icmpv6-type router-advertisement -j LOG --log-prefix "ROGUE-RA: "
sudo ip6tables -I FORWARD 2 -i wlan0 -p icmpv6 \
  --icmpv6-type router-advertisement -j DROP
```

## Monitor RA Messages

```bash
# Listen for RA messages on Wi-Fi interface
sudo tcpdump -i wlan0 -nn icmp6 and ip6[40]==134

# Parse RA with radvdump
sudo radvdump

# Show received RA details on a Linux client
ip -6 route show proto ra
ip -6 neigh show  # Check NDP/router entry

# Check RA received by wireless client
sysctl net.ipv6.conf.wlan0.accept_ra
# Should be 1 on a host, or 2 if forwarding is enabled and the client must still accept RA

# Force RS (Router Solicitation) to trigger RA response
rdisc6 wlan0

# View prefix information learned from RA
ip -6 addr show dev wlan0 | grep "scope global"
```

## Wireless RA Best Practices

```bash
# Periodic multicast RA tuning for Wi-Fi:
# Lower intervals propagate changes faster, but increase multicast traffic
# and battery impact on phones and other sleeping clients (RFC 7772).
# Keep Router Lifetime >= MaxRtrAdvInterval.

# Example: shorter intervals for faster propagation of configuration changes
interface wlan0 {
    AdvSendAdvert on;
    MinRtrAdvInterval 10;
    MaxRtrAdvInterval 30;
    AdvDefaultLifetime 1800;
    # ...
};

# Trigger immediate RA (after config change)
sudo kill -HUP $(pidof radvd)
```

Proper Router Advertisement configuration over Wi-Fi requires RA intervals chosen for the client and power profile, RDNSS options to deliver DNS resolver addresses via RA, and RA Guard policies on APs and switches to block rogue RA messages from potentially malicious wireless clients.
