# How to Understand the NAT64 Well-Known Prefix (64:ff9b::/96) - 64ff9b

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAT64, IPv6, IPv4, Transition, RFC 6052, Networking

Description: Understand the NAT64 well-known prefix 64:ff9b::/96 used to represent IPv4 addresses in IPv6 packets for seamless IPv6-only client access to IPv4 servers.

## Introduction

The NAT64 well-known prefix `64:ff9b::/96` (RFC 6052) is used by NAT64 translators to synthesize IPv6 addresses that represent IPv4 destinations. An IPv6-only client can reach IPv4 servers by connecting to a synthesized IPv6 address formed from this prefix plus the IPv4 address.

## How NAT64 Uses 64:ff9b::/96

```text
IPv4 server: 93.184.216.34 (example.com)
Synthesized IPv6: 64:ff9b::93.184.216.34
              or: 64:ff9b::5db8:d822

IPv6-only client connects to: 64:ff9b::5db8:d822
NAT64 translator converts to: TCP to 93.184.216.34
Response flows back reversed.
```

## Address Synthesis

```python
import ipaddress

def synthesize_nat64_address(ipv4: str,
                              prefix: str = "64:ff9b::/96") -> str:
    """
    Synthesize a NAT64 IPv6 address for an IPv4 destination.
    RFC 6052 §2.2
    """
    net = ipaddress.IPv6Network(prefix)
    v4 = ipaddress.IPv4Address(ipv4)
    v4_int = int(v4)

    # Prefix is the first 96 bits; last 32 bits = IPv4 address
    prefix_int = int(net.network_address)
    synthesized = prefix_int | v4_int
    return str(ipaddress.IPv6Address(synthesized))

# Examples

print(synthesize_nat64_address("93.184.216.34"))
# 64:ff9b::5db8:d822

print(synthesize_nat64_address("8.8.8.8"))
# 64:ff9b::808:808
```

## DNS64 Integration

DNS64 synthesizes AAAA records for IPv4-only domains using the NAT64 prefix.

```bash
# /etc/bind/named.conf.options - DNS64 configuration

# Define an ACL for RFC1918 IPv4 space; rfc1918 is NOT a BIND built-in.
acl rfc1918 { 10/8; 172.16/12; 192.168/16; };

options {
    # DNS64 prefix
    dns64 64:ff9b::/96 {
        # Only synthesize AAAA for these client source addresses
        clients { any; };
        # Filter which IPv4 A-record addresses are eligible for synthesis;
        # exclude RFC1918 private addresses, allow everything else.
        mapped { !rfc1918; any; };
    };
};
```

```bash
# Test DNS64: query for IPv4-only domain from IPv6-only host
dig AAAA ipv4only.example.com @::1
# Should return: 64:ff9b::93.184.216.34

# Verify NAT64 translation is working
curl -6 http://[64:ff9b::5db8:d822]/
```

## Linux NAT64 with Jool

```bash
# Install Jool NAT64 kernel module
sudo apt-get install jool-dkms jool-tools

# Load the stateful NAT64 module
sudo modprobe jool

# Create a NAT64 instance with the well-known prefix.
# In Jool 4.x, pool6 is set at instance creation, not via `global update`.
sudo jool instance add "default" --netfilter --pool6 64:ff9b::/96

# Add IPv4 pool (public IPs for translation)
sudo jool -i "default" pool4 add --tcp 203.0.113.1 1-65535
sudo jool -i "default" pool4 add --udp 203.0.113.1 1-65535
sudo jool -i "default" pool4 add --icmp 203.0.113.1 1-65535

# Verify configuration
sudo jool -i "default" global display
```

## Filtering Considerations

The `64:ff9b::/96` prefix should NOT appear on the public internet.

```bash
# Block 64:ff9b::/96 at internet boundaries (eth0 is the external interface)
ip6tables -A FORWARD \
  -s 64:ff9b::/96 \
  -i eth0 \
  -j DROP

ip6tables -A FORWARD \
  -d 64:ff9b::/96 \
  -o eth0 \
  -j DROP
```

## Conclusion

The `64:ff9b::/96` NAT64 well-known prefix enables IPv6-only networks to access IPv4 services transparently. It works in conjunction with DNS64 to synthesize AAAA records. Filter this prefix at network edges to prevent prefix hijacking. Monitor NAT64 translation success rates with OneUptime by probing IPv4 services from IPv6-only test clients.
