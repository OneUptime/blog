# How to Understand the O Flag in Router Advertisements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Router Advertisement, O Flag, DHCPv6, Stateless DHCPv6

Description: Understand the O (Other Configuration) flag in ICMPv6 Router Advertisements, how it enables stateless DHCPv6 for DNS and NTP without full address management.

## Introduction

The O (Other Configuration) flag in Router Advertisements tells hosts to use DHCPv6 for "other" configuration - DNS servers, NTP servers, domain search lists - without using DHCPv6 for address assignment. When O=1 and M=0, hosts use SLAAC for addresses but contact a stateless DHCPv6 server for DNS and NTP. This mode combines the simplicity of SLAAC with the flexibility of DHCPv6 for configuration distribution.

## O Flag Semantics

```text
O Flag (Other Configuration):

O = 0 (default):
  No DHCPv6 for "other" configuration
  DNS must come from RA RDNSS option (RFC 8106) or static config
  NTP must come from static config

O = 1:
  Use stateless DHCPv6 for configuration (DNS, NTP, domain search)
  Address assignment still via SLAAC (if M=0) or stateful DHCPv6 (if M=1)
  DHCPv6 server provides Information-Request (Type 11) responses
  No address lease tracking by the DHCPv6 server

Stateless DHCPv6 (O=1, M=0):
  Hosts send DHCPv6 Information-Request (not Solicit)
  Server responds with DNS/NTP/other options
  Server does NOT assign or track IP addresses
  Simpler server configuration than full stateful DHCPv6
```

## Setting Up Stateless DHCPv6

```bash
# radvd configuration: SLAAC + Stateless DHCPv6 (M=0, O=1)

sudo tee /etc/radvd.conf << 'EOF'
interface eth0 {
    AdvSendAdvert on;
    AdvManagedFlag off;      # M = 0: SLAAC for addresses
    AdvOtherConfigFlag on;   # O = 1: DHCPv6 for DNS/NTP/other

    prefix 2001:db8::/64 {
        AdvOnLink on;
        AdvAutonomous on;    # A = 1: use SLAAC
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

# dnsmasq as stateless DHCPv6 server (no address pool)
sudo tee /etc/dnsmasq.d/ipv6-stateless.conf << 'EOF'
# Enable DHCPv6 on eth0 (stateless mode)
dhcp-range=::, static, 64, 1h

# Provide DNS server via DHCPv6 option
dhcp-option=option6:dns-server,[2001:db8::1],[2001:db8::2]

# Provide domain search list
dhcp-option=option6:domain-search,example.com,corp.example.com

# Provide NTP server
dhcp-option=option6:ntp-server,[2001:db8::123]
EOF

sudo systemctl restart dnsmasq
```

## Configuring ISC DHCP as Stateless DHCPv6

```bash
# /etc/dhcp/dhcpd6.conf for stateless DHCPv6
sudo tee /etc/dhcp/dhcpd6.conf << 'EOF'
# Stateless DHCPv6 configuration
# No address subnets needed - just option declarations

option dhcp6.name-servers 2001:db8::1, 2001:db8::2;
option dhcp6.domain-search "example.com", "corp.example.com";

# For stateless DHCPv6, use subnet6 with no address pool
subnet6 2001:db8::/64 {
    # No 'range6' directive = stateless only
}
EOF

# Start DHCP6 in stateless mode
sudo /usr/sbin/dhcpd -6 -cf /etc/dhcp/dhcpd6.conf eth0
```

## O Flag vs RA RDNSS Option

```text
Two ways to distribute DNS server addresses in IPv6:

Method 1: RA RDNSS option (RFC 8106)
  Advantages:
    - No DHCPv6 server needed
    - DNS delivered directly in RA
    - Works even without DHCPv6
  Disadvantages:
    - Limited to DNS and domain search
    - No NTP option in base RFC

Method 2: Stateless DHCPv6 (O=1)
  Advantages:
    - Can distribute DNS, NTP, SIP, and many other options
    - Familiar DHCPv6 infrastructure
    - More options available
  Disadvantages:
    - Requires a DHCPv6 server process
    - Hosts must support stateless DHCPv6

Recommendation: Use both!
  Set O=1 AND include RDNSS option in RA
  Hosts that support RDNSS get DNS from RA immediately
  Hosts using DHCPv6 get DNS from stateless DHCPv6
  Maximum compatibility
```

## Checking O Flag Behavior on Linux

```bash
# Verify RA being sent with O flag
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134" 2>&1 | \
    grep -E "other stateful|Flags"

# Check if the host started a DHCPv6 Information-Request
sudo tcpdump -i eth0 "udp and dst port 547" -v
# DHCPv6 uses UDP port 547 (server) and 546 (client)
# Information-Request = DHCPv6 type 11

# Check NetworkManager is using stateless DHCPv6
nmcli device show eth0 | grep -E "IP6.DNS|IP6.DOMAIN"
# If DNS appears from DHCPv6: O flag is working

# Check with systemd-resolved
resolvectl status eth0 | grep -E "DNS|Domain"
```

## Conclusion

The O flag enables stateless DHCPv6 - a DHCPv6 mode where addresses still come from SLAAC but DNS, NTP, and other configuration parameters come from a DHCPv6 server. The DHCPv6 server in this mode responds to Information-Request messages without maintaining address leases, making it simpler to operate than full stateful DHCPv6. For new IPv6 deployments, consider using both the RA RDNSS option and O=1 together for maximum client compatibility. Setting O=1 is especially important in enterprise environments where a central DNS server must be distributed to all hosts.
