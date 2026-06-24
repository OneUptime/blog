# How to Prioritize VoIP IPv4 Traffic Using QoS Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VoIP, QoS, IPv4, Linux, tc, DSCP

Description: Configure Linux tc and iptables QoS rules to give VoIP IPv4 traffic strict priority queuing, ensuring low latency and jitter for voice calls.

VoIP requires low latency (< 150ms), low jitter (< 30ms), and minimal packet loss (< 1%). Without QoS, large file transfers or streaming can degrade call quality. This guide prioritizes locally generated outbound VoIP traffic at the Linux level.

## VoIP Traffic Identification

VoIP typically uses:
- SIP signaling: UDP/TCP port 5060
- SRTP/RTP media: UDP port ranges vary by application; 10000-20000 is a common RTP range
- Common VoIP platform examples: Zoom commonly uses UDP 3478-3479, 8801-8810, and 20000-64000; Microsoft Teams requires UDP 3478-3481, and its QoS guidance uses client source ports such as 50000-50019 for audio

## Step 1: Mark VoIP Egress Traffic with iptables

```bash
# Mark locally generated SIP signaling packets (port 5060)

sudo iptables -t mangle -A OUTPUT -p udp --dport 5060 -j MARK --set-mark 1
sudo iptables -t mangle -A OUTPUT -p tcp --dport 5060 -j MARK --set-mark 1

# Mark SIP signaling as DSCP CS5
sudo iptables -t mangle -A OUTPUT -p udp --dport 5060 -j DSCP --set-dscp-class CS5
sudo iptables -t mangle -A OUTPUT -p tcp --dport 5060 -j DSCP --set-dscp-class CS5

# Mark locally generated RTP/SRTP media packets (common range)
sudo iptables -t mangle -A OUTPUT -p udp --dport 10000:20000 -j MARK --set-mark 1

# Mark RTP/SRTP media as DSCP EF
sudo iptables -t mangle -A OUTPUT -p udp --dport 10000:20000 -j DSCP --set-dscp-class EF
```

## Step 2: Set Up HTB with Higher Priority for VoIP

```bash
# Create HTB root qdisc
sudo tc qdisc add dev eth0 root handle 1: htb default 30

# Total bandwidth: 100 Mbps
sudo tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit

# VoIP class: highest HTB priority, 10 Mbps guaranteed
sudo tc class add dev eth0 parent 1:1 classid 1:10 \
  htb rate 10mbit ceil 100mbit prio 0

# Standard class: 80 Mbps guaranteed
sudo tc class add dev eth0 parent 1:1 classid 1:20 \
  htb rate 80mbit ceil 100mbit prio 1

# Default class: 10 Mbps guaranteed
sudo tc class add dev eth0 parent 1:1 classid 1:30 \
  htb rate 10mbit ceil 100mbit prio 2
```

## Step 3: Add Leaf qdiscs

```bash
# Use pfifo for VoIP (minimal buffering = minimal latency)
sudo tc qdisc add dev eth0 parent 1:10 handle 10: pfifo limit 10

# Use fq_codel for other classes (good AQM)
sudo tc qdisc add dev eth0 parent 1:20 handle 20: fq_codel
sudo tc qdisc add dev eth0 parent 1:30 handle 30: fq_codel
```

## Step 4: Filter VoIP to Priority Class

```bash
# Route marked VoIP packets to the VoIP class
sudo tc filter add dev eth0 protocol ip parent 1:0 \
  handle 1 fw classid 1:10

# Also match DSCP EF (RTP/SRTP)
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 1 u32 \
  match ip tos 0xb8 0xfc classid 1:10

# Also match DSCP CS5 (SIP signaling)
sudo tc filter add dev eth0 protocol ip parent 1:0 prio 2 u32 \
  match ip tos 0xa0 0xfc classid 1:10
```

## Step 5: Verify VoIP Prioritization

```bash
# During an active call, check class statistics
sudo tc -s class show dev eth0

# The VoIP class (1:10) should show minimal drops
# Look for: rate x bps, dropped 0

# Measure latency to VoIP server during a bulk upload from the same host
iperf3 -c <BULK_TEST_SERVER> -t 30 &
ping -c 20 <VOIP_SERVER_IP>
# VoIP latency should remain low while the upload is saturated
```

## For Home Routers (OpenWrt)

```bash
# On OpenWrt, install and use SQM (Smart Queue Management)
opkg install luci-app-sqm sqm-scripts

# Configure in LuCI: Network → SQM QoS
# Set interface, download/upload speeds, and enable
```

Proper VoIP prioritization helps preserve call quality when the same Linux host is sending competing traffic, and SQM helps when an OpenWrt router's WAN link is congested.
