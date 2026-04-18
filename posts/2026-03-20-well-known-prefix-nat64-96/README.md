# Understanding the Well-Known Prefix for NAT64 (64:ff9b::/96)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NAT64, Networking, 64:ff9b, Transition Mechanisms, RFC 6052

Description: Learn about the well-known prefix 64:ff9b::/96 used for NAT64, how it encodes IPv4 addresses in IPv6, and how it enables IPv6-only devices to reach IPv4 servers.

## Introduction

The well-known prefix `64:ff9b::/96` is defined in RFC 6052 for use with NAT64 translation mechanisms. It allows IPv6-only devices to communicate with IPv4 services by embedding the IPv4 address in the last 32 bits of the IPv6 address and using a NAT64 gateway to translate between the protocols.

## What is the Well-Known Prefix?

`64:ff9b::/96` is a reserved IPv6 prefix that signals to NAT64 devices that the address represents a translated IPv4 destination.

The format is:

```text
64:ff9b::[IPv4 address]
```

For example, to reach `8.8.8.8`:

```text
64:ff9b::8.8.8.8
# or in full hexadecimal:

64:ff9b::0808:0808
```

## How NAT64 Uses This Prefix

1. An IPv6-only client wants to reach an IPv4 server (e.g., `93.184.216.34`)
2. DNS64 returns a synthesized AAAA record: `64:ff9b::5db8:d822`
3. The client sends IPv6 packets to that address
4. The NAT64 gateway sees the `64:ff9b::/96` prefix, extracts the IPv4 address, and translates the packet

## Verifying NAT64 is Working

From an IPv6-only host:

```bash
# Ping an IPv4 address via NAT64
ping6 64:ff9b::8.8.8.8

# Or using DNS64 (returns synthesized AAAA)
dig AAAA ipv4only.arpa
# Should return 64:ff9b::c000:aa and 64:ff9b::c000:ab
# (192.0.0.170 and 192.0.0.171 encoded, per RFC 8880)
```

## Setting Up a NAT64 Test Environment

Configure a NAT64 route to a translator:

```bash
# Add route for the well-known prefix pointing to NAT64 gateway
# Replace 2001:db8::1 with your NAT64 translator's address
ip -6 route add 64:ff9b::/96 via 2001:db8::1
```

## DNS64 Configuration for BIND

```text
options {
    dns64 64:ff9b::/96 {
        clients { any; };
        mapped { !rfc1918; any; };
    };
};
```

## Limitations

- Traffic through NAT64 is subject to the same limitations as NAT
- Not suitable for services requiring end-to-end IP visibility
- Stateful NAT64 requires session tracking at the gateway

## The Other Prefix: 64:ff9b:1::/48

RFC 8215 defines `64:ff9b:1::/48` for local-use NAT64, providing more flexibility for organizations with multiple NAT64 deployments.

## Conclusion

The well-known prefix `64:ff9b::/96` is the cornerstone of NAT64 translation, enabling IPv6-only networks to reach IPv4 services. Understanding this prefix is essential for anyone deploying or troubleshooting IPv6-only networks with DNS64/NAT64 infrastructure.
