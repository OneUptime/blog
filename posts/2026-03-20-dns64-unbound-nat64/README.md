# How to Configure DNS64 with Unbound for NAT64

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS64, Unbound, NAT64, IPv6, Networking, DNS

Description: Configure Unbound DNS resolver as a DNS64 server to synthesize AAAA records for use with NAT64, enabling IPv6-only hosts to resolve and reach IPv4-only services.

## Introduction

Unbound supports DNS64 synthesis natively. It synthesizes AAAA records for domains that only have A records, embedding the IPv4 address in the NAT64 prefix. Unbound's DNS64 implementation is lightweight and suitable for small to medium deployments.

## Installation

```bash
# Debian/Ubuntu

sudo apt install unbound

# RHEL/CentOS
sudo dnf install unbound

# Verify version (DNS64 is available in Unbound 1.5.0+)
unbound --version
```

## Unbound DNS64 Configuration

```bash
# /etc/unbound/unbound.conf

server:
    # Listen on all interfaces (or specific IPv6 for internal networks)
    interface: 0.0.0.0
    interface: ::0

    port: 53

    # Allow queries from all clients (restrict in production)
    access-control: 0.0.0.0/0 allow
    access-control: ::/0 allow

    # DNS64 configuration
    dns64-prefix: 64:ff9b::/96

    # Modules including dns64
    module-config: "dns64 validator iterator"

    # DNSSEC validation stays enabled on the resolver; validating clients
    # should use a trusted path to the DNS64 resolver or perform DNS64 locally

    # Logging
    verbosity: 1
    logfile: "/var/log/unbound/unbound.log"
    log-queries: no    # Set to yes for debugging

    # Limit recursion to trusted clients in production
    # access-control: 2001:db8::/32 allow
    # access-control: 10.0.0.0/8 allow
    # access-control: 0.0.0.0/0 deny
```

## Applying Configuration

```bash
# Check configuration syntax
sudo unbound-checkconf /etc/unbound/unbound.conf

# Start/restart Unbound
sudo systemctl restart unbound
sudo systemctl enable unbound

# Verify DNS64 is listening
sudo ss -ulnp | grep :53
```

## Testing DNS64

```bash
# Test against the DNS64 server
dig @127.0.0.1 AAAA ipv4only.arpa.
# Expected synthesized answers include:
# 64:ff9b::c000:aa and 64:ff9b::c000:ab

# Compare the original A records with the synthesized AAAA records:
dig @127.0.0.1 A ipv4only.arpa.       # Returns 192.0.0.170 and 192.0.0.171
dig @127.0.0.1 AAAA ipv4only.arpa.    # Returns synthesized 64:ff9b::/96 answers

# Test a domain with real AAAA record (should NOT be synthesized):
dig @127.0.0.1 AAAA google.com
# Should return real IPv6 addresses, not synthesized 64:ff9b::

# Test from IPv6-only client
# Set nameserver to DNS64 server IPv6 address
host -t AAAA ipv4only.arpa. 2001:db8::5
```

## Integration with NAT64 (TAYGA)

```bash
# Complete IPv6-only network setup:
# 1. Configure TAYGA for NAT64 (see nat64-linux-tayga guide)
# 2. Configure Unbound as DNS64 (this guide)
# 3. Point IPv6-only clients to Unbound for DNS

# On router/gateway:
# Route 64:ff9b::/96 to the TAYGA interface
# Ensure IPv6 clients use the DNS64 server

# Test end-to-end from IPv6-only host:
# With DNS pointing to DNS64 server:
curl -6 http://<ipv4-only-hostname>/    # Replace with a real hostname that only has A records
```

## Conclusion

Unbound enables DNS64 with a single `dns64-prefix` directive and `module-config: "dns64 validator iterator"`. It automatically synthesizes AAAA records for domains with only A records, using the specified NAT64 prefix. Use `dig AAAA` against the server to verify synthesis is working. Combine with TAYGA for a complete IPv6-only network solution that transparently provides access to IPv4-only services.
