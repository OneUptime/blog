# How to Understand DHCPv6 Status Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Troubleshooting, Status Code, RFC 8415

Description: A reference guide to DHCPv6 status codes, what they mean, and how to identify and resolve them during address assignment failures.

## Overview

DHCPv6 status codes can appear in DHCPv6 messages and options to inform the client of the outcome of its request. During address assignment failures, you will most commonly see them in Advertise and Reply messages. Understanding these codes is essential for diagnosing why a client failed to receive an address or prefix.

## DHCPv6 Status Code Table

| Code | Name | Description |
|------|------|-------------|
| 0 | Success | The request was processed successfully |
| 1 | UnspecFail | An unspecified failure occurred on the server |
| 2 | NoAddrsAvail | No addresses are available in the requested pool |
| 3 | NoBinding | The requested binding (lease) does not exist on the server |
| 4 | NotOnLink | The address or prefix is not appropriate for the client's link |
| 5 | UseMulticast | Obsolete in RFC 9915; legacy servers used it to tell clients to retry via multicast |
| 6 | NoPrefixAvail | No prefixes are available for prefix delegation |
| 7–23 | Additional IANA-assigned codes | See the IANA DHCPv6 Status Codes registry for current assignments |
| 24–65535 | Unassigned | Available for future standards action |

## Status Code Location in Messages

Status codes can appear at the top level of a DHCPv6 message and can also be nested inside IA options such as **IA_NA** or **IA_PD** and their child address/prefix options. This means you should inspect both the message-level options and the IA-specific options when troubleshooting.

## Diagnosing Status Codes with tcpdump

```bash
# Capture DHCPv6 traffic and show full option decode

sudo tcpdump -i eth0 -n -vvv "udp port 546 or udp port 547"

# DHCPv6 uses UDP ports 546 and 547
# Look in Advertise or Reply packets for "status-code" options
```

## Diagnosing with tshark

```bash
# Extract status codes from DHCPv6 Advertise and Reply messages
tshark -r /tmp/dhcpv6.pcap -Y "dhcpv6.msgtype == 2 or dhcpv6.msgtype == 7" \
  -T fields \
  -e dhcpv6.msgtype \
  -e dhcpv6.status_code \
  -e dhcpv6.status_msg
```

## Common Status Codes and Resolutions

### NoAddrsAvail (Code 2)

The server has no available addresses in the pool.

```bash
# Inspect the configured subnet and pool range in Kea
curl -s -X POST -H "Content-Type: application/json" http://localhost:8000/ \
  -d '{"command": "subnet6-get",
       "arguments": {"id": 1}}' | jq .

# Expand the pool range in kea-dhcp6.conf
# "pools": [{ "pool": "2001:db8::100 - 2001:db8::fff" }]
```

### NoBinding (Code 3)

The client sent a Renew or Rebind for a lease the server doesn't know about.

```bash
# This often happens after a server wipe or migration
# Resolution: the client should discard the stale lease and start a fresh Solicit
# Exact client commands vary by OS and DHCPv6 client implementation
```

### NotOnLink (Code 4)

The server is telling the client that the address or prefix in the Confirm message is not valid for this link.

```bash
# This typically means the client moved to a new network
# Resolution: the client must start fresh with server discovery
```

### UseMulticast (Code 5)

This status code is obsolete in RFC 9915, but you may still see it in legacy implementations based on RFC 8415.

```bash
# Legacy servers used this to tell clients to retry via ff02::1:2
# Modern DHCPv6 obsoletes server unicast and the UseMulticast status code
# If you see it, check for an older client/server implementation mismatch
```

### NoPrefixAvail (Code 6)

No prefixes are available for delegation.

```bash
# Check PD-related statistics in Kea
curl -s -X POST -H "Content-Type: application/json" http://localhost:8000/ \
  -d '{"command": "statistic-get-all"}' | \
  jq '.[0].arguments | to_entries[] | select(.key | contains("pd"))'
```

## Forcing a Status Code in Testing

In a test lab using Kea, you can simulate pool exhaustion by setting a small pool and verifying the client receives NoAddrsAvail:

```jsonc
// Tiny pool for testing exhaustion
"pools": [{ "pool": "2001:db8::1 - 2001:db8::1" }]
```

Once the single address is leased, the next client can receive NoAddrsAvail (status code 2) in an Advertise or Reply, depending on the exchange.

## Summary

DHCPv6 status codes at the message level or within IA-related options clearly indicate why address assignment succeeded or failed. The most common issues are exhausted pools (NoAddrsAvail), stale leases (NoBinding), and network changes (NotOnLink). Always inspect status codes when clients fail to get IPv6 addresses.
