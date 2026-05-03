# How to Debug IPsec IPv6 Issues with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Wireshark, Debugging, Troubleshooting

Description: Learn how to use Wireshark to capture and analyze IPv6 IPsec traffic, decrypt ESP packets for analysis, and diagnose IKEv2 negotiation failures.

## Overview

Wireshark is invaluable for debugging IPv6 IPsec issues. It can capture and decode IKEv2 negotiation messages, display ESP packet headers, and (if you provide the session keys) decrypt ESP payloads. This guide covers capturing IPsec traffic, interpreting IKEv2 exchanges, and using Wireshark's IPsec decryption feature.

## Capturing IPsec Traffic

### Using tshark (CLI)

```bash
# Capture IKEv2 negotiation (UDP port 500 and 4500)

tshark -i eth0 -f 'udp port 500 or udp port 4500' -w /tmp/ike-capture.pcap

# Capture ESP traffic (protocol 50)
tshark -i eth0 -f 'ip6 proto 50' -w /tmp/esp-capture.pcap

# Capture all IPsec traffic
tshark -i eth0 -f 'ip6 proto 50 or udp port 500 or udp port 4500' -w /tmp/ipsec.pcap

# Initiate tunnel (in another terminal)
swanctl --initiate --child my-vpn

# Then stop capture
# Ctrl+C
```

### Using tcpdump

```bash
# Capture and display IKE traffic
tcpdump -i eth0 'udp port 500 or udp port 4500' -n -v

# Capture ESP
tcpdump -i eth0 'ip6[6] == 50' -n -v
# Output example:
# 2001:db8:gw1::1 > 2001:db8:gw2::1: ESP(spi=0x01234567,seq=0x1), length 104
```

## Analyzing IKEv2 in Wireshark

Open the capture file in Wireshark and apply the filter:

```text
isakmp
```

### IKEv2 Exchange Sequence

In a successful initial negotiation (per RFC 7296) you should see two exchanges - the first Child SA is established inside IKE_AUTH:

```text
No.  Source          Dest            Protocol    Info
1    gw1             gw2             ISAKMP      IKE_SA_INIT Request
2    gw2             gw1             ISAKMP      IKE_SA_INIT Response
3    gw1             gw2             ISAKMP      IKE_AUTH Request
4    gw2             gw1             ISAKMP      IKE_AUTH Response
```

CREATE_CHILD_SA exchanges appear later, only when rekeying the IKE SA, rekeying a Child SA, or creating an additional Child SA:

```text
5    gw1             gw2             ISAKMP      CREATE_CHILD_SA Request
6    gw2             gw1             ISAKMP      CREATE_CHILD_SA Response
```

### Common IKEv2 Failure Points

**Failure at IKE_SA_INIT:**
```text
No response to IKE_SA_INIT → Firewall blocking UDP 500/4500
Multiple IKE_SA_INIT retransmits → No response from remote

Check: Is UDP 500 reaching the remote?
tshark -i eth0 -Y 'udp.dstport == 500 and ipv6.dst == 2001:db8:gw2::1'
```

**NO_PROPOSAL_CHOSEN notification:**
```text
Wireshark shows:
  IKE_SA_INIT Response with Notify: NO_PROPOSAL_CHOSEN
→ Cipher suites don't match between initiator and responder

Fix: Ensure both sides have matching 'proposals' in swanctl.conf
```

**AUTHENTICATION_FAILED:**
```text
IKE_AUTH Response with Notify: AUTHENTICATION_FAILED
→ PSK mismatch or certificate validation failure

Check: Same PSK on both sides?
       CA cert trusted on both sides?
```

## Decrypting ESP Packets in Wireshark

If you have the ESP keys (e.g., from strongSwan log or XFRM state), Wireshark can decrypt:

### Get Keys from strongSwan

```bash
# Enable verbose IKE logging in strongSwan (named-section format, 5.7+)
# /etc/strongswan.d/charon-logging.conf
charon {
    filelog {
        charon {
            path = /var/log/charon.log
            default = 1
            ike = 4   # level 4 ("private") logs sensitive material such as DH/keys
            knl = 2
        }
    }
}

# Or extract the installed SA keys from the kernel directly (most reliable)
ip xfrm state list
# Shows: enc aes key=0x...   auth sha256 key=0x...
```

### Configure Decryption in Wireshark

1. Go to **Edit → Preferences → Protocols → ESP**
2. Enable "Attempt to detect/decode encrypted ESP payloads"
3. Click "Edit" next to ESP SAs
4. Add entry:
   - Protocol: IPv6
   - Src IP: 2001:db8:gw1::1
   - Dst IP: 2001:db8:gw2::1
   - SPI (hex): 0x01234567
   - Encryption Algorithm: AES-GCM-128
   - Encryption Key (hex): 0102030405...
   - Authentication: None (GCM handles this)

After configuration, ESP packets will show decrypted content.

## tshark: Extract ESP Fields

```bash
# Show SPI and sequence numbers of ESP packets
tshark -r /tmp/esp-capture.pcap -Y 'esp' \
  -T fields -e ipv6.src -e ipv6.dst -e esp.spi -e esp.sequence

# Count ESP packets by SPI
tshark -r /tmp/esp-capture.pcap -Y 'esp' \
  -T fields -e esp.spi | sort | uniq -c | sort -rn

# Check for retransmits (repeated sequence numbers = replay attack or software bug)
tshark -r /tmp/esp-capture.pcap -Y 'esp' \
  -T fields -e esp.spi -e esp.sequence | sort | uniq -d
```

## Diagnosing MTU Issues

A common issue with IPsec is fragmentation due to ESP overhead:

```bash
# ESP overhead: ~50-80 bytes depending on cipher and mode
# IPv6 MTU: usually 1500 bytes
# Maximum payload: ~1420-1450 bytes

# Check Path MTU with IPsec active
ping6 -c 3 -M do -s 1400 2001:db8:site2::10
# -M do: don't fragment
# -s 1400: payload size

# If this fails with "message too long" - MTU issue
# Fix: Set lower MTU on the tunnel or adjust TCP MSS
ip -6 link set eth0 mtu 1400   # Reduce MTU to account for ESP overhead
```

```bash
# Capture Packet Too Big messages
tcpdump -i eth0 'icmp6 and ip6[40] == 2' -n -v
# Type 2 = Packet Too Big - tells you the path MTU
```

## Summary

Wireshark and tshark are essential for debugging IPv6 IPsec. Capture IKEv2 with `udp port 500 or udp port 4500` and ESP with `ip6 proto 50`. Analyze IKEv2 failure messages - NO_PROPOSAL_CHOSEN means mismatched cipher suites, AUTHENTICATION_FAILED means wrong PSK or certificate. Configure Wireshark's ESP decryption with SPI and keys to see plaintext payload. Watch for MTU issues by capturing ICMPv6 Packet Too Big messages (type 2) - these indicate ESP overhead is causing fragmentation problems.
