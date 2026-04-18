# How to Configure VoIP QoS for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VoIP, QoS, IPv6, DSCP, SIP, RTP, Traffic Shaping, Quality of Service

Description: Configure Quality of Service for VoIP traffic over IPv6 networks, marking SIP signaling and RTP media with appropriate DSCP values to ensure low latency and jitter.

---

VoIP quality depends on low latency (under 150ms), low jitter (under 30ms), and minimal packet loss (under 1%). Over IPv6, QoS is implemented using the Traffic Class byte with DSCP markings: EF (Expedited Forwarding) for RTP media and CS3 or CS5 for SIP signaling.

## VoIP Traffic Classification

```text
VoIP Traffic Types and DSCP Values:
┌──────────────────┬────────────┬──────┬────────────────────────────┐
│ Traffic Type     │ DSCP Name  │ Hex  │ Purpose                    │
├──────────────────┼────────────┼──────┼────────────────────────────┤
│ RTP Audio        │ EF (46)    │ 0xB8 │ Real-time voice media      │
│ RTP Video        │ AF41 (34)  │ 0x88 │ Real-time video media      │
│ RTCP             │ AF41 (34)  │ 0x88 │ Media control              │
│ SIP Signaling    │ CS3 (24)   │ 0x60 │ Call setup/teardown        │
│ SIP TLS          │ CS3 (24)   │ 0x60 │ Secure signaling           │
└──────────────────┴────────────┴──────┴────────────────────────────┘
```

## Mark VoIP Traffic with nftables (IPv6)

```bash
# /etc/nftables.conf - VoIP QoS for IPv6

table ip6 voip_qos {
    chain mangle_output {
        type filter hook output priority mangle; policy accept;

        # Mark SIP signaling (ports 5060/5061)
        meta l4proto udp udp dport 5060 ip6 dscp set cs3 counter
        meta l4proto tcp tcp dport 5060 ip6 dscp set cs3 counter
        meta l4proto tcp tcp dport 5061 ip6 dscp set cs3 counter

        # Mark RTP media (dynamic ports 10000-20000)
        meta l4proto udp udp dport 10000-20000 ip6 dscp set ef counter

        # Mark RTCP (RTP port + 1, same range)
        meta l4proto udp udp sport 10000-20000 ip6 dscp set ef counter
    }

    chain mangle_forward {
        type filter hook forward priority mangle; policy accept;

        # Forward path marking
        meta l4proto udp udp dport 10000-20000 ip6 dscp set ef
        meta l4proto udp udp dport 5060 ip6 dscp set cs3
    }
}
```

```bash
sudo nft -f /etc/nftables.conf
sudo systemctl enable nftables
```

## Linux tc HTB for VoIP over IPv6

```bash
#!/bin/bash
# voip-qos-ipv6.sh - Traffic shaping for VoIP over IPv6

IFACE="eth0"
RATE="100mbit"   # Total interface bandwidth

# Clean existing rules

tc qdisc del dev $IFACE root 2>/dev/null

# HTB root qdisc
tc qdisc add dev $IFACE root handle 1: htb default 30

# Root class
tc class add dev $IFACE parent 1: classid 1:1 htb rate $RATE burst 15k

# Class 1:10 - VoIP RTP (EF) - highest priority, guaranteed bandwidth
tc class add dev $IFACE parent 1:1 classid 1:10 \
  htb rate 10mbit ceil 20mbit burst 4k prio 1

# Class 1:20 - SIP signaling (CS3)
tc class add dev $IFACE parent 1:1 classid 1:20 \
  htb rate 2mbit ceil 5mbit burst 4k prio 2

# Class 1:30 - Default traffic
tc class add dev $IFACE parent 1:1 classid 1:30 \
  htb rate 88mbit ceil 100mbit burst 15k prio 3

# PFIFO for VoIP (minimal buffering = minimal latency)
tc qdisc add dev $IFACE parent 1:10 handle 10: pfifo limit 10

# SFQ for SIP signaling
tc qdisc add dev $IFACE parent 1:20 handle 20: sfq perturb 10

# FQ-CoDel for default traffic
tc qdisc add dev $IFACE parent 1:30 handle 30: fq_codel

# Classify by IPv6 DSCP (Traffic Class field)
# The IPv6 Traffic Class is NOT byte-aligned: it spans the low nibble of
# byte 0 and the high nibble of byte 1, so use the `ip6 priority` selector
# (or an equivalent u16 match at offset 0) rather than a u8 match at 1.
# EF = DSCP 46 = TC byte 0xB8; mask 0xfc matches DSCP bits only.
tc filter add dev $IFACE parent 1: protocol ipv6 prio 1 \
  u32 match ip6 priority 0xb8 0xfc flowid 1:10

# CS3 = DSCP 24 = TC byte 0x60
tc filter add dev $IFACE parent 1: protocol ipv6 prio 2 \
  u32 match ip6 priority 0x60 0xfc flowid 1:20

echo "VoIP QoS configured on $IFACE"
tc -s class show dev $IFACE
```

## Asterisk QoS Configuration

```ini
# /etc/asterisk/rtp.conf
[general]
rtpstart=10000
rtpend=20000
# DSCP for RTP (EF = 46 = 0x2e)
tos=ef
cos=5

# /etc/asterisk/pjsip.conf
[transport-udp-ipv6]
type=transport
protocol=udp
bind=::
# DSCP for SIP signaling
tos=cs3
cos=3
```

## FreeSWITCH QoS for IPv6

FreeSWITCH's sofia SIP profiles do not expose native DSCP/ToS parameters — mod_sofia never calls `setsockopt(IP_TOS)` on its RTP or SIP sockets, and param names like `rtp-tos`/`sip-tos` are silently ignored. Bind sofia to IPv6 in the profile, then rely on OS-level marking via the nftables rules above (matching SIP ports 5060/5061 and the RTP port range) to set DSCP on FreeSWITCH traffic.

```xml
<!-- /etc/freeswitch/sip_profiles/internal.xml -->
<profile name="internal">
  <!-- ... -->
  <param name="rtp-ip" value="::"/>
  <param name="sip-ip" value="::"/>
</profile>
```

## Verify DSCP Markings

```bash
# Capture VoIP packets and check DSCP
sudo tcpdump -i eth0 -nn ip6 and \(port 5060 or portrange 10000-20000\) -v | \
  grep -E "class|tos"

# With tshark
tshark -i eth0 -f "ip6 and (port 5060 or portrange 10000-20000)" \
  -T fields -e ip6.tclass -e ip6.dsfield.dscp \
  -e udp.dstport

# Expected output:
# ip6.dsfield.dscp = 0x2e (46 = EF) for RTP ports
# ip6.dsfield.dscp = 0x18 (24 = CS3) for SIP port 5060

# Check tc statistics
tc -s class show dev eth0 | grep -A5 "1:10\|1:20"
```

## Cisco Router VoIP QoS for IPv6

```text
! Classify VoIP traffic
class-map match-any VOIP-RTP-IPV6
 match protocol rtp
 match dscp ef

class-map match-any SIP-SIGNALING-IPV6
 match protocol sip
 match dscp cs3

! Policy for VoIP
policy-map VOIP-QOS-IPV6
 class VOIP-RTP-IPV6
  priority percent 20
  set dscp ef
 class SIP-SIGNALING-IPV6
  bandwidth percent 5
  set dscp cs3
 class class-default
  fair-queue

! Apply to IPv6 interface
interface GigabitEthernet0/0
 ipv6 address 2001:db8::1/64
 service-policy output VOIP-QOS-IPV6
```

Proper VoIP QoS over IPv6 marks RTP packets with DSCP EF (46) for absolute priority queuing, SIP with CS3 (24) for signaling reliability, and uses PFIFO or priority queuing with minimal buffers to keep one-way latency under 150ms for toll-quality voice.
