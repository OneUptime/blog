# How to Configure IPv6 for Wi-Fi Guest Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Wi-Fi, Guest Network, SSID, VLAN, Isolation, Firewall

Description: Configure IPv6 for Wi-Fi guest networks with proper VLAN isolation, separate prefix delegation, guest-specific firewall policies, and DHCPv6 to prevent access to internal IPv6 resources.

---

Guest Wi-Fi networks need IPv6 internet access while being isolated from the corporate network. Each guest SSID should use a separate IPv6 prefix on a dedicated VLAN, with IPv6 firewall rules preventing access to internal IPv6 ranges.

## Guest Network Architecture

```text
IPv6 Guest Network Architecture:
Internet (example prefix: 2001:db8::/32)
         |
    [Router/Firewall]
    /               \
[Corp VLAN 10]    [Guest VLAN 20]
2001:db8:10::/64    2001:db8:20::/64
Corp Wi-Fi SSID     Guest Wi-Fi SSID
    |                    |
[Corp clients]       [Guest clients]
   Firewall: full     Firewall: internet only,
   internal access    block internal
```

## radvd Configuration - Guest SSID

```bash
# /etc/radvd.conf - Separate RA per SSID/VLAN

# Corporate network (VLAN 10)

interface vlan10 {
    AdvSendAdvert on;
    MinRtrAdvInterval 10;
    MaxRtrAdvInterval 30;
    AdvManagedFlag on;
    AdvOtherConfigFlag on;

    RDNSS 2001:db8:10::53 {
        AdvRDNSSLifetime 3600;
    };

    prefix 2001:db8:10::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};

# Guest network (VLAN 20)
interface vlan20 {
    AdvSendAdvert on;
    MinRtrAdvInterval 10;
    MaxRtrAdvInterval 30;
    AdvManagedFlag on;
    AdvOtherConfigFlag on;

    # Use public DNS for guests
    RDNSS 2606:4700:4700::1111 2001:4860:4860::8888 {
        AdvRDNSSLifetime 3600;
    };

    prefix 2001:db8:20::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 7200;
        AdvPreferredLifetime 3600;  # Shorter preferred lifetime for guests
    };
};
```

## ip6tables Guest Isolation Rules

```bash
#!/bin/bash
# ipv6-guest-isolation.sh

CORP_VLAN="vlan10"
GUEST_VLAN="vlan20"
WAN_IFACE="eth0"

CORP_PREFIX="2001:db8:10::/64"
ULA_PREFIX="fc00::/7"

# Allow established connections
ip6tables -A FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Guest -> Corp / ULA: DENY
ip6tables -A FORWARD -i $GUEST_VLAN -d $CORP_PREFIX -j DROP
ip6tables -A FORWARD -i $GUEST_VLAN -d $ULA_PREFIX -j DROP

# Guest -> Internet: ALLOW
ip6tables -A FORWARD -i $GUEST_VLAN -o $WAN_IFACE -j ACCEPT

# Same-SSID client isolation must be enforced on the AP or with bridge filtering;
# traffic between clients on the same VLAN does not traverse the router's FORWARD chain.

# Corp -> anywhere: ALLOW (with specific rules as needed)
ip6tables -A FORWARD -i $CORP_VLAN -j ACCEPT

# Save rules (example path for iptables-persistent/netfilter-persistent)
ip6tables-save > /etc/ip6tables/rules.v6
echo "Guest IPv6 isolation rules applied"
```

## DHCPv6 for Guest Network (Kea DHCP)

```json
# /etc/kea/kea-dhcp6.conf

{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": [ "vlan10", "vlan20" ]
    },
    "lease-database": {
      "type": "memfile",
      "name": "/var/lib/kea/dhcp6.leases",
      "persist": true
    },
    "subnet6": [
      {
        "id": 10,
        "subnet": "2001:db8:10::/64",
        "pools": [
          { "pool": "2001:db8:10::100-2001:db8:10::500" }
        ],
        "valid-lifetime": 86400,
        "preferred-lifetime": 43200,
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:db8:10::53",
            "always-send": true
          },
          {
            "name": "domain-search",
            "data": "corp.example.com",
            "always-send": true
          }
        ]
      },
      {
        "id": 20,
        "subnet": "2001:db8:20::/64",
        "pools": [
          { "pool": "2001:db8:20::100-2001:db8:20::500" }
        ],
        "valid-lifetime": 7200,
        "preferred-lifetime": 3600,
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2606:4700:4700::1111, 2001:4860:4860::8888",
            "always-send": true
          },
          {
            "name": "domain-search",
            "data": "guest.example.com",
            "always-send": true
          }
        ]
      }
    ]
  }
}
```

## nftables Guest Isolation (Modern Approach)

```bash
# /etc/nftables-guest.conf

table ip6 guest_isolation {

    chain forward {
        type filter hook forward priority filter; policy accept;

        # Allow established/related
        ct state established,related accept

        # Guest -> Internal corporate and ULA: DROP
        iifname "vlan20" ip6 daddr { 2001:db8:10::/64, fc00::/7 } \
            log prefix "GUEST-BLOCK: " drop

        # Guest -> Internet: ALLOW
        iifname "vlan20" oifname "eth0" accept

        # Same-SSID client isolation must be enforced on the AP or with a
        # bridge-family ruleset; same-link traffic does not traverse this chain.

        # Log and drop unmatched guest traffic
        iifname "vlan20" log prefix "GUEST-DROP: " drop
    }
}
```

## Verify Guest IPv6 Isolation

```bash
# From a guest wireless client, verify:
# 1. Gets global IPv6 address in guest prefix
ip -6 addr show dev wlan0 | grep "2001:db8:20:"

# 2. Can reach internet
ping -6 2606:4700:4700::1111

# 3. Cannot reach corporate resources
ping -6 2001:db8:10::10  # Should be unreachable

# 4. If AP client isolation is enabled, cannot reach other guest clients
ping -6 2001:db8:20::101  # Should be blocked by AP/bridge isolation

# From the router/firewall, monitor guest traffic
sudo ip6tables -L FORWARD -n -v | grep -E "DROP|vlan20"

# Check guest DHCPv6 leases (Kea memfile backend)
grep "2001:db8:20:" /var/lib/kea/dhcp6.leases
```

Guest IPv6 networks require a dedicated prefix separate from corporate ranges, with nftables or ip6tables rules blocking forwarding from the guest VLAN to internal IPv6 prefixes while permitting outbound internet traffic, and RDNSS in RA pointing guests to public resolvers rather than internal DNS servers.
