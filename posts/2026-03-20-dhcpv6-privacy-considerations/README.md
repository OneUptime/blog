# How to Understand DHCPv6 Privacy Considerations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Privacy, DUID, RFC 7844

Description: Understand the privacy implications of DHCPv6, including DUID tracking, address stability issues, and how RFC 7844 anonymous stateless profiles help protect user identity.

## Overview

DHCPv6 has privacy considerations that differ from DHCPv4 and SLAAC. Clients often expose persistent identifiers (DUIDs) in most DHCPv6 messages, enabling cross-network tracking. RFC 7844 defines anonymity profiles to mitigate this.

## Why DHCPv6 Has Privacy Issues

When a DHCPv6 client sends a Solicit or Request, it includes a **DUID** (DHCP Unique Identifier) in the Client Identifier option. DUIDs are often based on the MAC address or a UUID associated with the system.

```text
# Typical DUID-LL (type 3) based on MAC address

Client Identifier: 00:03:00:01:aa:bb:cc:dd:ee:ff
                   ^^^^^ ^^^^^ ^^^^^^^^^^^^^^^^
                   type  hw   MAC address
```

A stable DUID is typically reused on every network the client visits, allowing any network operator to:
- Track a device across different locations
- Correlate visits to the same hotspot over time
- Link DHCPv6 requests to a specific device or user

## RFC 7844: Anonymity Profiles for DHCP

RFC 7844 defines "anonymity profiles" that minimize the information revealed in DHCP messages.

Key recommendations for DHCPv6:
1. With MAC randomization, use a DUID-LL derived from the current link-layer address; without MAC randomization, generate a new randomized DUID-LLT when attaching to a new link
2. Omit the Client Identifier in stateless Information-request messages when possible
3. Do not include the Client FQDN (hostname) option
4. Do not include the User Class or Vendor Class options
5. Request only necessary options, avoid sending previous option values as hints, and minimize fingerprinting in the ORO

## Configuring an Anonymous DUID on Linux

By default, ISC `dhclient` stores a persistent DUID in its lease database. Its documented options let you choose DUID-LL or DUID-LLT, but it does not provide a one-line RFC 7844 anonymity mode by itself:

```bash
# Stateless DHCPv6 (-S) uses Information-request; dhclient uses DUID-LL by default here
dhclient -6 -S -D LL eth0

# Stateful DHCPv6 uses DUID-LLT by default; -D can force the choice explicitly
dhclient -6 -D LLT eth0
```

## NetworkManager and Privacy

NetworkManager can reduce DHCPv6 tracking exposure by combining MAC randomization with DHCP settings:

```bash
# Use a per-network Wi-Fi MAC address
nmcli connection modify "MyWifi" 802-11-wireless.cloned-mac-address "stable-ssid"

# Use a DHCPv6 DUID derived from the current link-layer address
nmcli connection modify "MyWifi" ipv6.dhcp-duid "ll"

# Suppress sending the hostname in DHCPv6
nmcli connection modify "MyWifi" ipv6.dhcp-send-hostname "no"

# Alternatively, edit the connection file
# /etc/NetworkManager/system-connections/MyWifi.nmconnection
[ipv6]
dhcp-duid=ll
dhcp-send-hostname=false
```

## IPv6 Address Stability vs. Privacy

Even with DHCPv6, the assigned address may be stable and trackable. RFC 8064 and RFC 7217 address this for SLAAC, but for DHCPv6:

- A persistent lease means the same address is renewed each time
- This enables long-term tracking even without the DUID

To mitigate: use temporary privacy addresses when the network also offers SLAAC, and remember that shorter DHCPv6 lease times do not remove DUID-based tracking.

## Information Exposed in DHCPv6 Messages

| DHCPv6 Option | Privacy Risk | Recommendation |
|---------------|-------------|----------------|
| Client Identifier (DUID) | Persistent device fingerprint | Use DUID-LL with randomized MACs, or fresh randomized DUID-LLT on link changes |
| Client FQDN (option 39) | Reveals hostname | Suppress in privacy mode |
| User Class (option 15) | Reveals client or application class | Suppress in privacy mode |
| Vendor Class (option 16) | Reveals device type | Suppress in privacy mode |
| Requested Options | Fingerprints implementation | Minimize to essential options |

## ISP Logging Considerations

Access providers often log DHCPv6 assignments including DUIDs. This can create a long-lived record linking a device identifier to an IPv6 prefix or address over time.

## Summary

DHCPv6 privacy risks stem primarily from the stable DUID used in most messages. RFC 7844 defines anonymity profiles that synchronize DHCP identifiers with link-layer changes and minimize option exposure. Users and administrators should reduce persistent identifiers and suppress hostname options in environments where tracking is a concern.
