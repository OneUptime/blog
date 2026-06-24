# How to Understand DHCPv6 Protocol Overview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Address Assignment, RFC 8415, DUID, IAID

Description: Understand the DHCPv6 protocol, its message types, how it differs from DHCPv4, and when to use DHCPv6 for IPv6 address assignment and configuration.

## Introduction

DHCPv6 (Dynamic Host Configuration Protocol for IPv6, RFC 9915) provides stateful IPv6 address assignment and configuration options to hosts. Unlike DHCPv4, DHCPv6 does not provide default gateway information (that comes from Router Advertisements). DHCPv6 uses UDP ports 546 (client) and 547 (server), multicast addresses for server discovery, and identifies clients by DUID rather than MAC address.

## DHCPv6 vs DHCPv4 Key Differences

```yaml
DHCPv4 vs DHCPv6 Comparison:

Feature             | DHCPv4              | DHCPv6
--------------------|---------------------|-------------------
Protocol            | UDP 67/68           | UDP 546/547
Server discovery    | 255.255.255.255     | ff02::1:2 (multicast)
Client ID           | chaddr / client ID  | DUID (client identifier)
Default gateway     | DHCP option 3       | NOT in DHCPv6 (from RA)
Address assignment  | Single address      | IA_NA (non-temporary)
                    |                     | IA_TA (temporary, obsolete)
Prefix delegation   | Not standard        | IA_PD (prefix delegation)
Lease identification| Client ID/chaddr + XID | DUID + IAID + XID
Broadcast           | Uses broadcast      | No broadcast; uses multicast
Relay               | giaddr field        | Relay-forward/reply msgs
Message types       | DISCOVER/OFFER/...  | SOLICIT/ADVERTISE/...
```

## DHCPv6 Message Types

```text
DHCPv6 Message Type Codes:

Client-to-Server Messages:
  1: SOLICIT       ← Client discovers servers
  3: REQUEST       ← Client requests address from chosen server
  4: CONFIRM       ← Client confirms address after network change
  5: RENEW         ← Client renews lease with the original server
  6: REBIND        ← Client rebinds (RENEW timed out, try all servers)
  8: RELEASE       ← Client releases address (done with it)
  9: DECLINE       ← Client declines address (DAD failed)
  11: INFORMATION-REQUEST ← Client requests options without address

Server-to-Client Messages:
  2: ADVERTISE     ← Server responds to SOLICIT
  7: REPLY         ← Server confirms REQUEST/RENEW/REBIND/RELEASE/INFORMATION-REQUEST
  10: RECONFIGURE  ← Server pushes new config to client

Relay Messages:
  12: RELAY-FORW   ← Relay forwards client message to server
  13: RELAY-REPL   ← Server replies to relay
```

## DHCPv6 Address Assignment Flow

```yaml
Stateful DHCPv6 Address Assignment (DORA equivalent):

Client                    Server
  |                         |
  |--SOLICIT---------------→|  "Looking for DHCPv6 servers"
  |  (src: link-local)      |  Destination: ff02::1:2
  |                         |
  |←-ADVERTISE-------------|  "I can give you an address"
  |  Contains IA_NA with    |  May include DNS, domain
  |  proposed address       |
  |                         |
  |--REQUEST---------------→|  "I want this address from this server"
  |  References server DUID |  Identifies selected server
  |                         |
  |←-REPLY-----------------|  "Here is your address, lease time, etc."
  |  Confirmed IA_NA        |
  |  Address in IA_NA       |
  |                         |
  [Client configures address]
  [Client performs DAD]
  [Client is ready]
```

## Rapid Commit (2-message Exchange)

```yaml
Rapid Commit DHCPv6 (with Rapid-Commit option):

Client                    Server
  |                         |
  |--SOLICIT (RC opt)------→|  Include Rapid-Commit option
  |                         |  Server with Rapid-Commit enabled:
  |←-REPLY (RC opt)--------|  Skip ADVERTISE, go straight to REPLY
  |  Contains addresses     |
  |  and options            |
  |                         |

Rapid Commit reduces exchange from 4 to 2 messages.
Server must also support Rapid-Commit for this to work.
If server does not support RC: normal 4-message exchange.

Enable Rapid Commit:
  Kea: "rapid-commit": true  (in subnet6 config)
  Syntax is implementation-specific on other servers.
```

## DHCPv6 Option Structure

```text
DHCPv6 Options Format:

 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Option Code          |           Option Length       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                          Option Data                          |
|                          (variable)                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

Common DHCPv6 Option Codes:
  1:  CLIENTID    - Client DUID
  2:  SERVERID    - Server DUID
  3:  IA_NA       - Identity Association for Non-temporary Addresses
  4:  IA_TA       - Identity Association for Temporary Addresses (obsolete)
  5:  IAADDR      - Individual address within IA
  6:  ORO         - Option Request Option (client requests options)
  23: DNS-SERVERS - List of DNS recursive name servers
  24: DOMAIN-LIST - DNS domain search list
  25: IA_PD       - Identity Association for Prefix Delegation
  26: IAPREFIX    - Individual prefix within IA_PD
  14: RAPID-COMMIT - Rapid-Commit option
```

## Renew and Rebind Process

```text
DHCPv6 Lease Renewal:

T1 timer (server-supplied; 50% of the shortest preferred lifetime is the RFC recommendation):
  Client sends RENEW to the server that last provided the lease
  If server responds with REPLY: lease renewed

T2 timer (server-supplied; 80% of the shortest preferred lifetime is the RFC recommendation):
  RENEW timed out (server unreachable)
  Client sends REBIND to all servers (ff02::1:2)
  Any server can respond with REPLY

If REBIND fails (lease expires):
  Client treats address as expired
  Sends SOLICIT to find new server
  Starts fresh assignment

Example if the shortest preferred lifetime is 24 hours:
  T1 = 12 hours (send RENEW)
  T2 = 19.2 hours (send REBIND if RENEW failed)
  Lease = 24 hours (address expires if REBIND fails)
```

## Verifying DHCPv6 on Linux

```bash
# Check if dhclient is running DHCPv6

ps aux | grep '[d]hclient'

# View DHCPv6 lease files (path varies by client and distro)
find /var/lib -maxdepth 2 -type f \( -name 'dhclient6*.leases' -o -name '*.lease6' \) 2>/dev/null

# Using dhcpcd:
dhcpcd -U eth0

# Capture DHCPv6 exchange
sudo tcpdump -i eth0 -vv "udp port 546 or udp port 547"
# Port 546: DHCPv6 client
# Port 547: DHCPv6 server

# Show dynamically configured IPv6 addresses
ip -6 addr show eth0 | grep "dynamic"
# This does not reliably distinguish SLAAC from DHCPv6 on every distro
# Confirm DHCPv6 with a packet capture or the client's lease data
```

## Conclusion

DHCPv6 provides centralized IPv6 address assignment with full tracking, similar to DHCPv4. Key differences from DHCPv4: no default gateway (from RA), client identified by DUID, uses multicast for discovery. The 4-message exchange (SOLICIT/ADVERTISE/REQUEST/REPLY) can be shortened to 2 messages with Rapid Commit. On IPv6 networks, Router Advertisements commonly signal DHCPv6 availability: M = 1 indicates managed address configuration, while O = 1 indicates other configuration information is available via DHCPv6. For DNS-only configuration without address assignment, stateless DHCPv6 typically uses only INFORMATION-REQUEST/REPLY. DHCPv6 is essential in enterprises requiring address tracking, reservations, and audit capability.
