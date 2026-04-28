# How to Understand NAT Traversal for VoIP and SIP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, VoIP, SIP, IPv4

Description: Learn why NAT breaks VoIP and SIP signaling, and how STUN, TURN, ICE, SIP ALG, and media anchoring solve NAT traversal problems.

## Why NAT Breaks VoIP

VoIP protocols like SIP carry IP addresses in their payload (not just headers). When NAT changes the IP address in packet headers, the application-layer SIP messages still contain the original private IP - causing problems.

**SIP INVITE example with private IP:**

```text
Via: SIP/2.0/UDP 192.168.1.10:5060    ← private IP in SIP payload
Contact: sip:user@192.168.1.10         ← private IP
...
m=audio 10000 RTP/AVP 0               ← private IP for media
c=IN IP4 192.168.1.10
```

The remote SIP server tries to send media back to 192.168.1.10 - a private IP it cannot reach.

## Solution 1: STUN (Session Traversal Utilities for NAT)

STUN lets a client discover its public IP and port as seen from outside:

```text
Client → STUN server: "What is my external IP:port?"
STUN → Client: "You appear as 203.0.113.1:56789"
Client uses 203.0.113.1:56789 in SIP headers
```

```bash
# Test STUN from command line (stuntman's stunclient: host port)

stunclient stun.l.google.com 19302

# Python STUN check
import pynat
nat_type, ext_ip, ext_port = pynat.get_ip_info()
print(f"External IP: {ext_ip}, Port: {ext_port}")
```

**Limitation**: STUN doesn't work with Symmetric NAT.

## Solution 2: TURN (Traversal Using Relays around NAT)

TURN relays media through a server when direct P2P fails (required for Symmetric NAT):

```text
Client A (Symmetric NAT) ← media → TURN Server ← media → Client B
```

TURN is always reliable but adds latency and bandwidth cost.

## Solution 3: ICE (Interactive Connectivity Establishment)

ICE combines STUN and TURN to find the best path:

1. Gather candidates (local, STUN-derived, TURN-derived)
2. Exchange candidates with peer
3. Test connectivity (ICE checks)
4. Use the best working path

ICE is used in WebRTC and modern SIP implementations.

## Solution 4: SIP ALG (Application Layer Gateway)

A NAT router with SIP ALG rewrites SIP messages to replace private IPs with public ones.

**Enable/disable SIP ALG on Linux:**

```bash
# Check if SIP ALG (nf_nat_sip) is loaded
lsmod | grep sip

# Disable SIP ALG (often causes more problems than it solves)
rmmod nf_nat_sip
rmmod nf_conntrack_sip

# Prevent loading at boot
echo "blacklist nf_nat_sip" >> /etc/modprobe.d/blacklist.conf
echo "blacklist nf_conntrack_sip" >> /etc/modprobe.d/blacklist.conf
```

**Note**: SIP ALG is often buggy. Most SIP providers recommend disabling it and using STUN/TURN instead.

## Solution 5: Media Anchoring (SBC / SIP Proxy)

A Session Border Controller (SBC) or SIP proxy with media anchoring:
- Re-originates both signaling and media
- Handles NAT on behalf of all endpoints
- Used by enterprise PBX systems (Asterisk, FreeSWITCH)

**Asterisk NAT configuration:**

```ini
; sip.conf
[general]
externip=203.0.113.1    ; Public IP
localnet=192.168.1.0/24 ; LAN subnet
nat=force_rport,comedia  ; Force NAT traversal
```

## Common NAT Issues with VoIP

| Symptom | Cause | Fix |
|---------|-------|-----|
| One-way audio | Media sent to private IP | Enable STUN or externip |
| No audio at all | Symmetric NAT + STUN | Use TURN relay |
| Call drops after 30s | Re-INVITE with private IP | Fix SIP ALG or use outbound proxy |
| SIP registration fails | SIP ALG mangling headers | Disable SIP ALG |

## Key Takeaways

- NAT breaks SIP/RTP because private IPs appear in application-layer payloads.
- STUN works for most NAT types; TURN is needed for Symmetric NAT.
- ICE automates the negotiation between STUN/TURN/direct connectivity.
- Disable SIP ALG on most routers; it causes more problems than it solves.

**Related Reading:**

- [How to Understand NAT Types (Full Cone, Restricted, Symmetric)](https://oneuptime.com/blog/post/2026-03-20-nat-types-full-cone/view)
- [How to Configure NAT for VPN Passthrough](https://oneuptime.com/blog/post/2026-03-20-nat-vpn-passthrough/view)
- [How to Troubleshoot NAT Translation Issues](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-nat-translation/view)
