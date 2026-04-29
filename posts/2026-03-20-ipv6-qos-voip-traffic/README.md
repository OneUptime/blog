# How to Configure IPv6 QoS for VoIP Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, QoS, VoIP, SIP, RTP, DSCP, Low-Latency, Linux

Description: Configure QoS policies for VoIP (SIP/RTP) traffic over IPv6 networks, ensuring low latency, minimal jitter, and high packet delivery for voice quality.

---

VoIP over IPv6 requires strict QoS policies to maintain call quality. The key metrics are latency (<150ms one-way), jitter (<30ms), and packet loss (<1%). Proper DSCP marking and queue prioritization ensure VoIP traffic receives preferential treatment.

## VoIP QoS Requirements

```text
VoIP QoS Requirements:
- One-way delay: < 150ms (ITU-T G.114; 150-400ms acceptable)
- Jitter: < 30ms (affects audio playout buffer)
- Packet loss: < 1% (with FEC, up to 5% tolerable)
- Bandwidth: G.711 = 64 kbps + overhead ~80 kbps per call
             G.729 = 8 kbps + overhead ~24 kbps per call

DSCP Recommendations for VoIP:
- RTP Media: EF (DSCP 46) - Expedited Forwarding
- SIP Signaling: CS5 (DSCP 40)
- RTCP: Same as RTP media
```

## Marking VoIP IPv6 Traffic

```bash
# /etc/nftables.conf - VoIP over IPv6 marking

table ip6 mangle {
    chain prerouting {
        type filter hook prerouting priority mangle; policy accept;

        # SIP Signaling over IPv6 (5060 UDP/TCP, 5061 TCP/TLS)
        meta l4proto { tcp, udp } th dport 5060 ip6 dscp set cs5
        tcp dport 5061 ip6 dscp set cs5  # TLS SIP

        # SRTP/RTP Media - Expedited Forwarding
        # Example media port ranges; align them with your PBX/phone configuration
        meta l4proto udp udp dport 10000-20000 ip6 dscp set ef

        # WebRTC media (if using fixed ports)
        meta l4proto udp udp dport 50000-60000 ip6 dscp set ef

        # Mark VoIP from specific IP phone subnets
        ip6 saddr 2001:db8:100:10::/64 ip6 dscp set ef
    }
}
```

```bash
sudo nft -f /etc/nftables.conf
```

## Asterisk PBX QoS Configuration

```text
# /etc/asterisk/rtp.conf - RTP port range

[general]
rtpstart=10000
rtpend=20000

# /etc/asterisk/pjsip.conf
[transport-udp6]
type=transport
protocol=udp
bind=::
tos=cs5          ; DSCP CS5 for SIP signaling
cos=3

[voip-endpoint]
type=endpoint
transport=transport-udp6
tos_audio=ef     ; DSCP EF for audio RTP
tos_video=af41   ; DSCP AF41 for video
cos_audio=5
```

## Linux Traffic Shaping for VoIP over IPv6

```bash
#!/bin/bash
# voip_ipv6_qos.sh - Configure QoS for VoIP over IPv6

IFACE="eth0"
WAN_BW="100mbit"
VOIP_BW="20mbit"

# Clear existing
sudo tc qdisc del dev $IFACE root 2>/dev/null || true

# Root HTB qdisc
sudo tc qdisc add dev $IFACE root handle 1: htb default 30

# Root class
sudo tc class add dev $IFACE parent 1: classid 1:1 htb rate $WAN_BW

# VoIP class - guaranteed bandwidth, high priority
sudo tc class add dev $IFACE parent 1:1 classid 1:10 \
  htb rate $VOIP_BW ceil $VOIP_BW burst 10k prio 1

# Add PFIFO to VoIP class (keep the queue small to minimize latency)
sudo tc qdisc add dev $IFACE parent 1:10 pfifo limit 50

# Default class with FQ-CoDel
sudo tc class add dev $IFACE parent 1:1 classid 1:30 \
  htb rate 80mbit prio 4
sudo tc qdisc add dev $IFACE parent 1:30 fq_codel

# Classify IPv6 EF -> VoIP class
# Match the IPv6 Traffic Class field; mask off ECN bits
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 1 \
  u32 match ip6 priority 0xb8 0xfc \
  flowid 1:10

# Classify IPv6 CS5 -> VoIP class
# CS5 = 40 = 0x28, in Traffic Class: 40 << 2 = 0xa0
sudo tc filter add dev $IFACE protocol ipv6 parent 1:0 prio 2 \
  u32 match ip6 priority 0xa0 0xfc \
  flowid 1:10

echo "VoIP IPv6 QoS configured on $IFACE"
```

## Testing VoIP Quality over IPv6

```bash
# Test 1: Measure latency to IPv6 VoIP destination
ping -6 -c 100 -i 0.02 2001:db8::10 | tail -1
# Goal: avg < 5ms, max < 20ms for LAN

# Test 2: Check jitter using iperf3 UDP
iperf3 -6 -c 2001:db8::20 -u -b 100k -t 30 --get-server-output

# Test 3: Verify DSCP marking is applied
sudo tcpdump -i eth0 -nn -v 'ip6 and udp portrange 10000-20000' | grep 'class 0xb8'

# Test 4: Simulate VoIP stream and measure quality
# Install voip test tools
sudo apt install iperf3 -y

# G.711 payload simulation: 160-byte payload packets, 50 pps (20 ms frames)
iperf3 -6 -c 2001:db8::20 -u -b 64k -l 160 -t 60
```

## Cisco Router VoIP over IPv6

```text
! Cisco QoS for VoIP over IPv6

class-map match-any IPV6-VOIP-EF
 match dscp ef

class-map match-any IPV6-VOIP-CS5
 match dscp cs5

policy-map IPV6-VOIP-POLICY
 class IPV6-VOIP-EF
  priority percent 30     ! LLQ - strict priority
 class IPV6-VOIP-CS5
  bandwidth percent 5
 class class-default
  fair-queue

interface GigabitEthernet0/1
 ipv6 address 2001:db8::1/64
 service-policy output IPV6-VOIP-POLICY
```

Proper VoIP QoS over IPv6 requires EF DSCP marking for RTP media and strict priority queuing at network devices, with the IPv6 Traffic Class field carrying the same EF codepoint as IPv4 DSCP, ensuring voice traffic receives preferential treatment identical to IPv4 deployments.
