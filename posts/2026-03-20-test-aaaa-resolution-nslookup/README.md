# How to Test AAAA Record Resolution with nslookup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, nslookup, AAAA Records, DNS Testing

Description: Learn how to use nslookup to query and verify IPv6 AAAA records from both interactive and non-interactive modes on Linux and Windows.

## nslookup for AAAA Records

`nslookup` is available on Linux, macOS, and Windows. While `dig` is more powerful on Linux, `nslookup` works everywhere and is particularly common in Windows environments.

## Non-Interactive Mode (Single Query)

```bash
# Query AAAA record for a domain

nslookup -type=AAAA example.com

# Short form (some versions accept -query= as well)
nslookup -query=AAAA example.com

# Query against a specific DNS server
nslookup -type=AAAA example.com 8.8.8.8

# Query using IPv6 DNS server address
nslookup -type=AAAA example.com 2001:4860:4860::8888
```

## Understanding nslookup Output

```bash
$ nslookup -type=AAAA google.com 8.8.8.8

Server:     8.8.8.8           ← DNS server used for query
Address:    8.8.8.8#53        ← DNS server IP and port

Non-authoritative answer:     ← Returned by a recursive resolver, not an authoritative server
Name:   google.com
Address: 2607:f8b0:4004:c08::65  ← IPv6 AAAA record
Name:   google.com
Address: 2607:f8b0:4004:c08::66  ← Multiple AAAA records
```

## Interactive Mode

Interactive mode is useful for multiple queries against the same server:

```bash
# Start nslookup in interactive mode
nslookup

# Inside interactive mode:
> set type=AAAA
> example.com
# Shows AAAA records for example.com

> server 2001:4860:4860::8888
# Switch to IPv6 DNS server

> www.google.com
# Query using IPv6 server

> set type=ANY
> example.com
# Requests ANY; many servers return only a subset of records

> exit
```

## Testing AAAA on Windows

On Windows Command Prompt or PowerShell, nslookup syntax is the same:

```cmd
REM Command Prompt - query AAAA record
nslookup -type=AAAA example.com

REM Query against specific server
nslookup -type=AAAA example.com 8.8.8.8

REM Interactive mode
nslookup
> set type=AAAA
> example.com
> exit
```

## Checking for NODATA vs NXDOMAIN

```bash
# When a domain has an A record but no AAAA (NODATA response):
nslookup -type=AAAA ipv4only.arpa 8.8.8.8

# Output for NODATA:
# Server: 8.8.8.8
# Address: 8.8.8.8#53
# Non-authoritative answer:
# *** Can't find ipv4only.arpa: No answer

# NXDOMAIN means the domain name itself does not exist:
nslookup -type=AAAA no-such-host.example 8.8.8.8
# ** server can't find no-such-host.example: NXDOMAIN
```

## Testing Reverse DNS (PTR) for IPv6

```bash
# Test PTR for an IPv6 address (nslookup handles the reversal automatically)
nslookup 2001:4860:4860::8888

# Or explicitly:
nslookup -type=PTR 8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa

# Expected: PTR record → hostname (for example, dns.google)
```

## Comparing Responses from Multiple DNS Servers

```bash
#!/bin/bash
# Compare AAAA responses from multiple DNS servers
DOMAIN=${1:-"example.com"}
echo "AAAA records for $DOMAIN:"
for SERVER in 8.8.8.8 1.1.1.1 9.9.9.9; do
    RESULT=$(nslookup -type=AAAA "$DOMAIN" "$SERVER" 2>/dev/null | awk '/^Name:/ {found=1; next} found && /^Address:/ {print $2}' | paste -sd, -)
    echo "  $SERVER: ${RESULT:-No AAAA answer}"
done
```

## nslookup vs dig

| Feature | nslookup | dig |
|---|---|---|
| Available on Windows | Yes | Needs installation |
| Available on Linux | Yes | Yes (usually pre-installed) |
| Output detail | Moderate | Full/configurable |
| DNSSEC info | Limited | Full |
| Batch mode | No | Yes (-f) |
| Scripting | Harder | Easier |

## Summary

Use `nslookup -type=AAAA <domain>` for quick AAAA record checks, specify a DNS server with `nslookup -type=AAAA <domain> <server>`, and use interactive mode for multiple queries. On Windows, nslookup is often preferred over dig. For reverse DNS, nslookup automatically formats the ip6.arpa query from the IPv6 address.
