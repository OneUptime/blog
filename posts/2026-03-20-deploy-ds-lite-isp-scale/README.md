# How to Deploy DS-Lite at ISP Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DS-Lite, ISP, IPv4 Transition, AFTR, B4, Tunneling

Description: Deploy Dual-Stack Lite (DS-Lite) at ISP scale to provide IPv4 connectivity to customers over an IPv6-only access network.

## What is DS-Lite?

DS-Lite (RFC 6333) is a transition mechanism where the ISP access network is IPv6-only. Customer IPv4 traffic is encapsulated in IPv4-in-IPv6 tunnels (softwires) to an AFTR (Address Family Transition Router) at the ISP, which then performs NAPT on the shared IPv4 pool.

```mermaid
flowchart LR
    CPE[B4 Element\nCustomer CPE] --IPv4 in IPv6 Tunnel--> AFTR[AFTR\nISP Side]
    AFTR --> Internet[IPv4 Internet]
    CPE --> IPv6Net[IPv6 Internet\n(native)]
```

## Components

- **B4 (Basic Bridging BroadBand)**: The CPE function that encapsulates IPv4 in IPv6
- **AFTR (Address Family Transition Router)**: ISP-side tunnel termination and NAT44

## Deploying the AFTR

Use `aftr` software (from the ISC) or a hardware implementation. Here's a Linux AFTR using the ISC AFTR daemon:

```bash
# Install ISC AFTR (build from source: https://www.isc.org/aftr/)
# Note: ISC AFTR is reference software; for production-scale traffic,
# use a carrier-grade implementation (Cisco, Juniper, A10, VPP, etc.).

# AFTR daemon configuration (/etc/aftr.conf)
cat > /etc/aftr.conf <<'EOF'
address endpoint 2001:db8:aftr::1
pool 203.0.113.0/24
acl6 2001:db8::/32
EOF

# Start the AFTR daemon
aftr -c /etc/aftr.conf

# NAPT for the shared IPv4 pool on egress
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# (For production, use a dedicated public IPv4 pool)
```

## AFTR with Cisco IOS (Hardware)

```text
! Cisco IOS DS-Lite AFTR configuration
ipv6 unicast-routing

! DS-Lite virtual interface (IPv4-in-IPv6 softwire)
interface Virtual-Template1 type tunnel
 tunnel mode ipv6
 tunnel source 2001:db8:aftr::1

! NAT pool for customer IPv4 traffic
ip nat pool AFTR-POOL 203.0.113.0 203.0.113.255 prefix-length 24

! NAT translation for DS-Lite subscribers
ip nat inside source list 1 pool AFTR-POOL overload

! Advertise AFTR address via DHCPv6 option
ipv6 dhcp pool DS-LITE
 dns-server 2001:db8:dns::1
 domain-name isp.example.com
 aftr-name aftr.isp.example.com
```

## B4 Configuration on CPE (OpenWRT)

```text
# /etc/config/network on customer OpenWRT router

config interface 'wan6'
    option proto    'dhcpv6'
    option reqprefix 'no'

config interface 'dslite'
    option proto    'dslite'
    option peeraddr '2001:db8:aftr::1'   # AFTR IPv6 address
```

## DHCPv6 Option for AFTR Discovery

Configure the DHCPv6 server to advertise the AFTR address to B4 elements:

```json
{
  "Dhcp6": {
    "option-def": [
      {
        "name": "aftr-name",
        "code": 64,
        "type": "fqdn"
      }
    ],
    "option-data": [
      {
        "name": "aftr-name",
        "data": "aftr.isp.example.com"
      }
    ]
  }
}
```

## Scaling AFTR

For ISP-scale deployment:
- Deploy multiple AFTR nodes in anycast configuration
- Each AFTR handles a subset of the shared IPv4 pool
- Use ECMP to distribute B4 tunnels across AFTR nodes
- Size AFTR nodes for NAT state: plan for ~1,000-2,000 sessions per subscriber (RFC 6888 baseline)

## Monitoring AFTR

```bash
# Monitor NAPT translation table size
conntrack -L | wc -l

# Check DS-Lite tunnel statistics
ip -6 tunnel show | grep ds-lite

# Monitor per-subscriber session counts via RADIUS accounting
grep "DS-Lite-Traffic" /var/log/radius/radacct/*/detail
```

## Conclusion

DS-Lite enables ISPs to deploy IPv6-only access networks while still providing IPv4 connectivity using shared address pools. The B4/AFTR architecture separates customer IPv4 tunneling from the IPv6 access network, making it a practical transition strategy for ISPs managing IPv4 exhaustion.
