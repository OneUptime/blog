# How to Analyze SIP and VoIP Traffic Over IPv4 in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, SIP, VoIP, RTP, Network Analysis

Description: Learn how to use Wireshark to capture and analyze SIP signaling and RTP media streams in VoIP deployments, diagnose call failures, measure call quality, and troubleshoot audio problems.

## VoIP Protocol Overview

VoIP uses two main protocol layers:
- **SIP (Session Initiation Protocol)**: Signaling - sets up, modifies, and tears down calls (UDP/TCP port 5060, TLS port 5061)
- **RTP (Real-time Transport Protocol)**: Media - carries the actual voice/video data (dynamic UDP ports, typically 10000-20000)

## Step 1: Capture VoIP Traffic

```bash
# Capture SIP signaling (port 5060) and RTP media

sudo tcpdump -i eth0 -n -w /tmp/voip-capture.pcap 'port 5060 or udp portrange 10000-20000'

# Or capture all UDP (VoIP uses UDP heavily)
sudo tcpdump -i eth0 -n -w /tmp/voip-udp.pcap 'udp'

# Make a test call while capturing, then stop
# Ctrl+C to stop tcpdump
```

## Step 2: Apply SIP Display Filter

```text
In Wireshark display filter bar:

sip                     → All SIP messages
sip.Method == "INVITE"  → SIP INVITE (call setup)
sip.Method == "BYE"     → SIP BYE (call teardown)
sip.Method == "REGISTER"→ SIP REGISTER
sip.Status-Code == 200  → SIP 200 OK responses
sip.Status-Code >= 400  → SIP errors (4xx, 5xx)

Combined:
sip or rtp or rtcp      → All VoIP traffic
```

## Step 3: Analyze SIP Call Flow

```sql
Wireshark has a built-in VoIP call analyzer:
Telephony → VoIP Calls

This shows:
- Start time, stop time
- Caller, callee
- Duration
- State (CALL SETUP, RINGING, IN CALL, COMPLETED, CANCELLED, REJECTED)
- Comments

Click a call → Flow Sequence (shows ladder diagram)
Or:
Telephony → SIP Statistics (shows SIP method/response counts)
```

```text
SIP call flow (Wireshark Flow Sequence view):

Client A (192.168.1.10)          Server (192.168.1.1)         Client B (192.168.1.20)
    |                                   |                              |
    |─── INVITE ─────────────────────>  |                              |
    |                                   |─── INVITE ──────────────>    |
    |  <──── 100 Trying ─────────────── |                              |
    |                                   |  <──── 180 Ringing ───────── |
    |  <──── 180 Ringing ──────────────  |                              |
    |                                   |  <──── 200 OK ────────────── |
    |  <──── 200 OK ────────────────── |                              |
    |─── ACK ────────────────────────> |                              |
    |                                   |─── ACK ─────────────────>    |
    |<══════════ RTP Audio Stream ═════════════════════════════════>   |
    |─── BYE ────────────────────────> |                              |
    |  <──── 200 OK ────────────────── |                              |
```

## Step 4: Diagnose SIP Call Failures

```text
Common SIP error responses in Wireshark:

404 Not Found:
  sip.Status-Code == 404
  Cause: Phone number/user doesn't exist

403 Forbidden:
  sip.Status-Code == 403
  Cause: Authentication failed

408 Request Timeout:
  sip.Status-Code == 408
  Cause: Called party didn't respond in time

486 Busy Here:
  sip.Status-Code == 486
  Cause: Callee is on another call

503 Service Unavailable:
  sip.Status-Code == 503
  Cause: SIP proxy overloaded

Filter to show only failures:
sip.Status-Code >= 400 and sip.Status-Code < 600
```

## Step 5: Analyze RTP Stream Quality

```text
Wireshark RTP analysis:
Telephony → RTP → RTP Streams

Shows for each RTP stream:
- Source/destination IP:port
- SSRC (stream identifier)
- Packets, lost, max delta
- Mean jitter, max jitter
- Status (OK, Problems)

Quality thresholds:
Good:     Jitter < 20ms, Loss < 1%
Marginal: Jitter 20-50ms, Loss 1-5%
Bad:      Jitter > 50ms, Loss > 5%
```

```bash
# Analyze RTP quality with tshark
tshark -r /tmp/voip-capture.pcap \
    -Y 'rtp' \
    -T fields \
    -e rtp.ssrc \
    -e rtp.seq \
    -e rtp.timestamp \
    -e frame.time_delta
```

## Step 6: Play Back RTP Audio

```sql
In Wireshark:
Telephony → RTP → RTP Streams
Select a stream → Analyze...

This shows:
- Delta time between packets (jitter visualization)
- Jitter graph
- Packet loss graph
- Play button → plays the audio stream

Listening to the audio helps diagnose:
- Choppy audio = packet loss or high jitter
- One-way audio = RTP returning on wrong IP/port (NAT issue)
- Echo = RTP packets arriving twice
- Silence = DTMF not passing, codec mismatch
```

## Step 7: Diagnose One-Way Audio (NAT Issues)

```bash
# One-way audio is the most common VoIP NAT problem
# SIP sends IP:port in the SDP body - behind NAT, this is the private IP

# Filter SDP to see media negotiation
sdp

# In SDP, look for c= and m= lines:
# c=IN IP4 192.168.1.10      <- private IP in SDP
# m=audio 16384 RTP/AVP 0   <- port for RTP

# If behind NAT, server needs the PUBLIC IP:
# Fix: SIP proxy must rewrite SDP with public IP (STUN/ICE/SIP proxy NAT)

# Wireshark filter for SDP content:
sdp.connection_info.address_type == "IP4"
```

```bash
# Check if RTP is reaching destination
sudo tcpdump -i eth0 -n 'udp portrange 10000-20000'
# If RTP packets arrive but no audio: codec mismatch or buffer issue
# If no RTP packets: firewall blocking UDP or NAT not traversed
```

## Conclusion

Wireshark's VoIP analysis tools are under the `Telephony` menu. Use `Telephony → VoIP Calls` for the call summary, then click `Flow Sequence` for the signaling ladder diagram. Analyze RTP quality with `Telephony → RTP → RTP Streams` - look for jitter >50ms or packet loss >5% as quality thresholds. For SIP failures, filter `sip.Status-Code >= 400` to find error responses. One-way audio is almost always a NAT issue where private IPs appear in SDP - configure your SIP proxy to rewrite SDP with the public IP using STUN or ALG.
