# How to Configure DHCPv6 Prefix Delegation (IA_PD)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, Prefix Delegation, IA_PD, IPv6, ISP, CPE Router

Description: Configure DHCPv6 Prefix Delegation (IA_PD) on both server and client sides to automatically delegate IPv6 prefixes to routers for downstream SLAAC distribution.

## Introduction

DHCPv6 Prefix Delegation (DHCPv6-PD, introduced in RFC 3633 and incorporated into RFC 8415) allows an upstream DHCPv6 server (typically at an ISP or central router) to delegate an IPv6 prefix to a requesting router (CPE, edge router, or downstream router). The delegated prefix is then used to create sub-prefixes for downstream networks, which are advertised via SLAAC. DHCPv6-PD is the standard mechanism for automatic prefix provisioning in home broadband and enterprise networks.

## IA_PD Message Flow

```yaml
Prefix Delegation Exchange:

CPE Router (client)         ISP DHCPv6 Server (delegating router)
     |                              |
     |--SOLICIT (IA_PD hint::/56)-->|  "Give me a /56 for delegation"
     |                              |
     |<-ADVERTISE (IA_PD:prefix)----|  "I can give you 2001:db8:1234::/56"
     |                              |
     |--REQUEST (IA_PD:selected)--->|  "I want 2001:db8:1234::/56"
     |                              |
     |<-REPLY (confirmed IA_PD)-----|  "2001:db8:1234::/56 is yours for T1/T2"
     |                              |
     CPE sub-divides 2001:db8:1234::/56 into /64 subnets:
     LAN1: 2001:db8:1234:01::/64
     LAN2: 2001:db8:1234:02::/64
     Guest: 2001:db8:1234:10::/64
     CPE sends SLAAC RA on each LAN with the /64 sub-prefix
```

## Server-Side: Kea DHCPv6-PD Configuration

```json
// /etc/kea/kea-dhcp6.conf - Server with prefix delegation
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth0"]
    },
    "lease-database": {
      "type": "memfile",
      "name": "/var/lib/kea/dhcp6.leases"
    },
    "preferred-lifetime": 3600,
    "valid-lifetime": 7200,
    "renew-timer": 1800,
    "rebind-timer": 2700,
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8::/32",
        "interface": "eth0",
        "pd-pools": [
          {
            "prefix": "2001:db8:1234::",
            "prefix-len": 48,
            "delegated-len": 56,
            "excluded-prefix": "2001:db8:1234:ff::",
            "excluded-prefix-len": 64
          }
        ],
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:4860:4860::8888"
          }
        ]
      }
    ]
  }
}
```

## Server-Side: ISC dhcpd Prefix Delegation

```bash
cat >> /etc/dhcp/dhcpd.conf << 'EOF'
# dhcpd needs a subnet6 declaration that matches the
# server's address on the client-facing link
subnet6 2001:db8:0:1::/64 {
}

# Prefix delegation pool

# Delegates /56 prefixes from the range 2001:db8:1234::/48
prefix6 2001:db8:1234:: 2001:db8:1234:ff:: /56;

# Specific prefix for a known CPE
host cpe-router1 {
    host-identifier option dhcp6.client-id
        00:01:00:01:ab:cd:ef:01:aa:bb:cc:dd:ee:ff;
    fixed-prefix6 2001:db8:1234:10::/56;
}
EOF
```

## Client-Side: dhcpcd Prefix Delegation

```bash
# Configure dhcpcd to request prefix delegation on WAN interface
cat > /etc/dhcpcd.conf << 'EOF'
# Disable Router Advertisement handling globally; enable it only on the WAN
noipv6rs

# WAN interface (towards ISP/uplink)
interface eth0
    ipv6rs          # Solicit and accept Router Advertisements on the WAN
    ia_na           # Request WAN IPv6 address
    ia_pd 1/::/56 eth1/1 eth2/2 eth3/3
    # ^^  ^  ^^^   ^^^    ^^^    ^^^
    # |   |   |    |      |      +-- Use prefix+3 for eth3 (VLAN 3)
    # |   |   |    |      +--------- Use prefix+2 for eth2 (VLAN 2)
    # |   |   |    +---------------- Use prefix+1 for eth1 (LAN 1)
    # |   |   +------ Hint: request /56 (256 /64s available)
    # |   +---------- PD identifier 1
    # +-------------- ia_pd keyword
EOF

sudo systemctl restart dhcpcd

# Verify prefix was received
ip -6 addr show
# eth0: should show WAN address (IA_NA)
# eth1: should show LAN address from delegated prefix
#   inet6 2001:db8:1234:1::1/64 scope global
```

## Client-Side: wide-dhcpv6-client

```bash
# Configure wide-dhcpv6-client for prefix delegation
cat > /etc/wide-dhcpv6/dhcp6c.conf << 'EOF'
interface eth0 {
    send ia-pd 1;
    send ia-na 1;
    request domain-name-servers;
    request domain-name;
    script "/etc/wide-dhcpv6/dhcp6c-script";
};

id-assoc pd 1 {
    # Request /56, use /64 sub-prefixes for each interface
    prefix ::/56 infinity;

    prefix-interface eth1 {
        sla-id 1;    # Subprefix: delegated_prefix + 01 = ..:1::/64
        sla-len 8;   # Length to add: /56 + 8 = /64
    };
    prefix-interface eth2 {
        sla-id 2;    # Subprefix: delegated_prefix + 02 = ..:2::/64
        sla-len 8;
    };
};

id-assoc na 1 {};
EOF

sudo dhcp6c -c /etc/wide-dhcpv6/dhcp6c.conf eth0
```

## Sub-Delegating the Prefix

Once the CPE receives the prefix, it needs to assign sub-prefixes to each LAN interface and configure radvd.

```bash
# Script to configure radvd with delegated prefix
# This runs when dhcpcd gets a prefix (dhcpcd-run-hooks or similar)

# After dhcpcd assigns 2001:db8:1234:1::/64 to eth1:
# Configure radvd to advertise this prefix on eth1

cat > /etc/radvd.conf << 'EOF'
interface eth1 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 600;
    prefix ::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvPreferredLifetime 3600;
        AdvValidLifetime 7200;
        DecrementLifetimes on;
        Base6Interface eth1;  # Advertise the /64 already assigned to eth1
    };
};
EOF

# radvd "Base6Interface" uses the prefix assigned to eth1.
# The advertised lifetimes should match the delegated prefix lifetimes.

sudo systemctl restart radvd
```

## Verifying Prefix Delegation

```bash
# On the CPE router: check the delegated prefix from dhcpcd
dhcpcd -U eth0
# Should show the DHCPv6 lease contents, including the IA_PD delegation

# Verify a delegated /64 was assigned to the LAN interface
ip -6 addr show dev eth1
#   inet6 2001:db8:1234:1::1/64 scope global

# On a host connected to the LAN:
ip -6 addr show
# Should show SLAAC address from delegated prefix:
# inet6 2001:db8:1234:1::211:22ff:fe33:4455/64 scope global dynamic

# On the server: view delegation leases
cat /var/lib/kea/dhcp6.leases | grep "prefix"
# Or: cat /var/lib/dhcp/dhcpd6.leases | grep "iaprefix"
```

## Conclusion

DHCPv6 Prefix Delegation (IA_PD) enables automatic prefix provisioning for routers. The upstream server delegates a prefix block (e.g., /56) to a CPE router, which then sub-divides it into /64 prefixes for downstream networks. On the server side, configure `pd-pools` in Kea or `prefix6` in dhcpd. On the client side, `dhcpcd` uses `ia_pd` configuration and automatically assigns sub-prefixes to LAN interfaces. The delegated /64 prefixes are then advertised via SLAAC RA on each LAN, enabling hosts to autoconfigure addresses.
