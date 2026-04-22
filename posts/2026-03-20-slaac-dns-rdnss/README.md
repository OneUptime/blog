# How to Configure DNS via RDNSS in SLAAC Router Advertisements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDNSS, SLAAC, DNS, IPv6, RFC 8106, Radvd

Description: Configure DNS server distribution via the RDNSS option in IPv6 Router Advertisements, allowing hosts to obtain DNS configuration without DHCPv6.

## Introduction

The RDNSS (Recursive DNS Server) option (RFC 8106) allows IPv6 routers to include DNS server addresses directly in Router Advertisements. Hosts that support RDNSS can configure DNS entirely from SLAAC, without needing a DHCPv6 server. The DNSSL (DNS Search List) option provides domain search suffixes. RDNSS is supported by modern Linux network managers such as systemd-networkd, NetworkManager, or rdnssd, as well as macOS, Windows 10 Creators Update and later, iOS, and Android, making it a practical alternative to DHCPv6 for DNS distribution in SLAAC-only deployments.

## RDNSS Option Format

```text
RDNSS Option (Type 25) Wire Format:

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Type=25   |     Length    |           Reserved            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           Lifetime                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
.            Addresses of IPv6 Recursive DNS Servers           .
.                    (one or more, 16 bytes each)               .
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Fields:
  Type:     25 (RDNSS)
  Length:   in units of 8 bytes = (1 + 2*n) where n = number of DNS servers
  Reserved: 0
  Lifetime: How long DNS servers are valid (seconds)
            Should by default be at least 3*MaxRtrAdvInterval
            0xFFFFFFFF = infinite
  Addresses: One or more 16-byte IPv6 DNS server addresses

DNSSL Option (Type 31):
  Same Type/Length/Reserved/Lifetime structure, but contains DNS search domain names
  Instead of addresses: RFC 1035 domain-name encodings ending in a zero octet
  Domain-name data is padded to an 8-byte boundary and is not compressed
```

## Configuring RDNSS in radvd

```bash
# Add RDNSS and DNSSL to radvd configuration

sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 600;
    AdvDefaultLifetime 1800;

    prefix 2001:db8::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };

    # RDNSS: Provide DNS server addresses in RA
    # List one or more IPv6 DNS server addresses
    RDNSS 2001:4860:4860::8888 2001:4860:4860::8844 {
        # Lifetime: how long DNS servers are valid
        # Should be >= MaxRtrAdvInterval (600s)
        # Recommendation: at least 3 * MaxRtrAdvInterval
        AdvRDNSSLifetime 1800;   # 30 minutes
    };

    # DNSSL: Provide DNS search domain list
    DNSSL corp.example.com example.com {
        AdvDNSSLLifetime 1800;
    };
};
EOF

sudo systemctl restart radvd

# Verify RDNSS is included in RA
sudo radvdump
# Should show:
#  Recursive DNS server: 2001:4860:4860::8888
#  Recursive DNS server: 2001:4860:4860::8844
#   DNS server lifetime: 1800 seconds
```

## Configuring RDNSS on Cisco IOS XE Devices

```text
! Configure RDNSS on Cisco IOS XE interface
interface GigabitEthernet0/1
 ! Add DNS servers to RA
 ipv6 nd ra dns server 2001:4860:4860::8888 1200 sequence 0
 ipv6 nd ra dns server 2001:4860:4860::8844 1200 sequence 1

 ! Add DNS search domain
 ipv6 nd ra dns search-list corp.example.com 1200 sequence 1

! Verify RDNSS configuration
show ipv6 nd ra dns server
show ipv6 nd ra dns search-list

! Note: Cisco support and syntax vary by platform and software release
```

## Verifying RDNSS on Linux Hosts

```bash
# Check if RDNSS DNS was applied
# With systemd-resolved:
resolvectl status eth0
# Expected output:
# Link 2 (eth0)
#     Current Scopes: DNS
#          Protocols: +DefaultRoute -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported
# Current DNS Server: 2001:4860:4860::8888
#        DNS Servers: 2001:4860:4860::8888 2001:4860:4860::8844
#         DNS Domain: corp.example.com example.com

# With NetworkManager:
nmcli device show eth0 | grep DNS

# If your resolver writes DNS directly to /etc/resolv.conf:
cat /etc/resolv.conf
# nameserver 2001:4860:4860::8888
# nameserver 2001:4860:4860::8844
# search corp.example.com example.com

# Capture RA to verify RDNSS option
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134" | grep -A 5 "rdnss\|dns"
```

## RDNSS Lifetime Considerations

```text
RDNSS Lifetime Best Practices:

Problem: Host must not use expired DNS server
  If RDNSS Lifetime < MaxRtrAdvInterval:
  - Host may receive only one RA every MaxRtrAdvInterval seconds
  - DNS lifetime could expire between RA messages
  - Host loses DNS configuration intermittently

Recommendation:
  AdvRDNSSLifetime ≥ 3 * MaxRtrAdvInterval
  Example: MaxRtrAdvInterval=600s → AdvRDNSSLifetime ≥ 1800s

  Or: Set AdvRDNSSLifetime infinity; in radvd (wire value 0xFFFFFFFF)
  Use for stable DNS servers that rarely change

When DNS server changes:
  1. Add new DNS server to RDNSS with full lifetime
  2. Keep old DNS server with short (or 0) lifetime
  3. Let old DNS lifetime expire
  4. Remove old DNS server from RDNSS config

Setting lifetime=0:
  Immediately removes DNS server from client configuration
  Use for emergency DNS server removal
```

## RDNSS vs DHCPv6 for DNS

```text
DNS Distribution: RDNSS vs DHCPv6

RDNSS (RA Option):
  Pros:
    - No DHCPv6 server required
    - DNS configured immediately with SLAAC address
    - Works in pure SLAAC deployments
    - Simpler infrastructure
  Cons:
    - Less granular control (same DNS for all hosts)
    - No per-host DNS configuration possible
    - Requires OS support (most current OSes do support it)

DHCPv6 for DNS (O flag):
  Pros:
    - Per-host DNS possible (via different DHCP classes)
    - Familiar management via DHCP server GUI
    - Additional options (NTP, custom options)
  Cons:
    - Requires DHCPv6 server infrastructure
    - Slightly more complex deployment
    - DNS available only after DHCPv6 exchange completes

Recommendation:
  Home/small office: RDNSS (simpler)
  Enterprise: DHCPv6 (more control, existing DHCP infrastructure)
  Pure SLAAC networks: RDNSS (no choice, no DHCPv6)
```

## Conclusion

RDNSS eliminates the need for DHCPv6 in pure SLAAC environments by embedding DNS server addresses directly in Router Advertisements. Configure RDNSS in radvd with `RDNSS <addr1> <addr2> { AdvRDNSSLifetime 1800; }` and add search domains with `DNSSL`. Set the lifetime to at least 3x the MaxRtrAdvInterval to prevent DNS configuration from expiring between RA messages. Most current operating systems support RDNSS. Verify DNS was applied with `resolvectl status` on Linux or equivalent commands on other platforms.
