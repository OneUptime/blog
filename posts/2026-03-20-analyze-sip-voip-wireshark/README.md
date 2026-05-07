# How to Analyze SIP and VoIP Traffic with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, SIP, VoIP, Networking, Packet Analysis, Troubleshooting

Description: Learn how to capture, filter, and analyze SIP signaling and RTP media streams in Wireshark to diagnose VoIP call quality and setup issues.

---

SIP (Session Initiation Protocol) handles call setup and teardown, while RTP carries the actual voice/video media. Wireshark has built-in VoIP analysis tools that let you follow SIP dialogs, analyze RTP streams, and even play back captured audio for supported codecs.

---

## Capture SIP/RTP Traffic

```bash
# Capture on the default SIP port (5060 UDP/TCP) and a common RTP UDP range

sudo tcpdump -i eth0 -w voip-capture.pcap \
  'port 5060 or (udp portrange 10000-20000)'

wireshark voip-capture.pcap
```

---

## Display Filters for SIP Traffic

```text
# Show all SIP traffic
sip

# Show only INVITE messages (call setup)
sip.Method == "INVITE"

# Show only BYE messages (call teardown)
sip.Method == "BYE"

# Show SIP responses (status codes)
sip.Status-Code

# Show 4xx client errors
sip.Status-Code >= 400 and sip.Status-Code < 500

# Show a specific call by Call-ID
sip.Call-ID == "abc123@192.168.1.5"
```

---

## Follow a SIP Dialog

1. Apply the `sip` filter.
2. Right-click on a SIP INVITE packet.
3. Select **Follow** → **SIP Call** to see the full SIP dialog.

Or use **Telephony** → **SIP Flows**, select the call, and click **Flow Sequence** to get a visual ladder diagram.

---

## Display Filters for RTP

```text
# Show decoded RTP traffic
rtp

# Filter by SSRC (synchronization source)
rtp.ssrc == 0xDEADBEEF

# Show RTP packets with specific payload type (0 = PCMU, G.711 mu-law)
rtp.p_type == 0
```

---

## Analyze VoIP Calls with Wireshark Telephony Menu

1. Open **Telephony** → **VoIP Calls**.
2. Select a call and click **Flow Sequence** to see SIP/RTP ladder diagram.
3. Click **Play Streams** to open RTP Player and replay supported RTP audio.

---

## Check for Common VoIP Issues

```text
# 403 Forbidden - request understood but refused
sip.Status-Code == 403

# 408 Request Timeout - no timely response
sip.Status-Code == 408

# 486 Busy Here - called party busy
sip.Status-Code == 486

# Jitter/packet loss - check RTP statistics
# Telephony → RTP → RTP Streams → Analyze
```

---

## Summary

Use the `sip` display filter and the `rtp` filter for decoded RTP streams to isolate VoIP traffic in Wireshark. The **Telephony** menu provides specialized tools including SIP flow diagrams, RTP stream analysis, and audio playback for supported codecs. Match SIP dialogs by `Call-ID` to trace individual calls from INVITE through BYE, and inspect RTP sequence numbers and timestamps to diagnose jitter and packet loss.
