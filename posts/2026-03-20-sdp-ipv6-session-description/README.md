# How to Handle IPv6 in SDP (Session Description Protocol)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SDP, IPv6, VoIP, SIP, WebRTC, Media, Session Description Protocol

Description: Understand and configure SDP (Session Description Protocol) for IPv6 media sessions, covering connection line syntax, address handling, and IPv4/IPv6 interworking.

---

SDP (RFC 8866, which obsoletes RFC 4566) describes multimedia sessions. For IPv6, the connection line (`c=`) and origin line (`o=`) use "IN IP6" instead of "IN IP4". IPv6 addresses appear WITHOUT brackets in SDP (unlike IPv6 literal host portions in SIP URIs).

## SDP IPv6 Connection Line Syntax

```text
SDP Field Reference:
v=0                      (version)
o=<user> <sess-id> <sess-version> IN IP6 <address>
s=<session name>
c=IN IP6 <IPv6-address>  (connection - note: no brackets)
t=<start> <stop>
m=<media> <port> <protocol> <fmt list>
a=<attribute>

Example IPv6 SDP:
v=0
o=alice 2890844526 2890844526 IN IP6 2001:db8::1
s=Alice's IPv6 Session
c=IN IP6 2001:db8::1
t=0 0
m=audio 49170 RTP/AVP 0 8 97
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:97 iLBC/8000
m=video 51372 RTP/AVP 31 32
a=rtpmap:31 H261/90000
a=rtpmap:32 MPV/90000
```

## IPv4-IPv6 Interworking in SDP

```text
When bridging IPv4 and IPv6 calls, the media server generates
separate SDP offers for each side:

IPv4 client SDP:
c=IN IP4 192.0.2.1
m=audio 49170 RTP/AVP 0

IPv6 client SDP:
c=IN IP6 2001:db8::10
m=audio 49180 RTP/AVP 0

The media server translates between IPv4 and IPv6 RTP streams.
```

## Asterisk SDP Generation for IPv6

```ini
# /etc/asterisk/pjsip.conf

# Configure SDP to include IPv6 address

[transport-udp-ipv6]
type=transport
protocol=udp
bind=::
local_net=2001:db8::/32

[endpoint-ipv6]
type=endpoint
transport=transport-udp-ipv6
...

# Asterisk generates:
# c=IN IP6 2001:db8::20
# based on the selected IPv6 transport and media address
```

## Python SDP Parser for IPv6

```python
#!/usr/bin/env python3
# parse_sdp_ipv6.py - Parse and validate IPv6 SDP

import re
import ipaddress

def parse_sdp(sdp_text):
    """Parse SDP and extract IPv6 addresses."""
    result = {
        'connection_addresses': [],
        'origin_address': None,
        'media_sections': []
    }

    lines = sdp_text.strip().split('\n')
    current_media = None

    for line in lines:
        line = line.strip()

        # Parse origin line: o=user sess-id sess-ver IN IP6 addr
        if line.startswith('o='):
            parts = line[2:].split()
            if 'IP6' in parts:
                idx = parts.index('IP6')
                if idx + 1 < len(parts):
                    addr = parts[idx + 1]
                    try:
                        ip = ipaddress.IPv6Address(addr)
                        result['origin_address'] = str(ip)
                    except ValueError:
                        pass

        # Parse connection line: c=IN IP6 addr
        elif line.startswith('c='):
            match = re.match(r'c=IN (IP[46]) (\S+)', line)
            if match:
                ip_version = match.group(1)
                addr = match.group(2)
                if ip_version == 'IP6':
                    # IPv6 in SDP has NO brackets
                    try:
                        ip = ipaddress.IPv6Address(addr)
                        result['connection_addresses'].append(str(ip))
                    except ValueError:
                        print(f"Warning: Invalid IPv6 in SDP: {addr}")

        # Parse media section: m=audio port ...
        elif line.startswith('m='):
            parts = line[2:].split()
            current_media = {'type': parts[0], 'port': int(parts[1])}
            result['media_sections'].append(current_media)

    return result

# Test SDP parsing
test_sdp = """v=0
o=alice 2890844526 2890844526 IN IP6 2001:db8::1
s=Test
c=IN IP6 2001:db8::1
t=0 0
m=audio 49170 RTP/AVP 0
a=rtpmap:0 PCMU/8000
"""

parsed = parse_sdp(test_sdp)
print("Origin address:", parsed['origin_address'])
print("Connection addresses:", parsed['connection_addresses'])
print("Media sections:", parsed['media_sections'])
```

## Generating IPv6 SDP Offer

```python
def generate_ipv6_sdp_offer(local_ipv6, rtp_port):
    """Generate SDP offer with IPv6 connection."""
    # IPv6 address in SDP: no brackets, just raw address
    sdp = f"""v=0
o=- 123456789 1 IN IP6 {local_ipv6}
s=IPv6 Call
c=IN IP6 {local_ipv6}
t=0 0
m=audio {rtp_port} RTP/AVP 0 8 101
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:101 telephone-event/8000
a=fmtp:101 0-15
a=sendrecv
"""
    return sdp

# Example
sdp = generate_ipv6_sdp_offer("2001:db8::30", 10000)
print(sdp)
```

## WebRTC SDP with IPv6 Candidates

```text
WebRTC SDP includes ICE candidates which DO show IPv6 addresses:

a=candidate:1 1 udp 2113937151 2001:db8::100 50000 typ host
a=candidate:2 1 udp 1845501695 2001:db8::200 50001 typ srflx raddr 2001:db8::100 rport 50000
a=rtcp-mux

Note: IPv6 ICE candidates in SDP use raw IPv6 notation (no brackets)
```

The key rule for IPv6 in SDP is that addresses appear WITHOUT brackets in the `c=` and `o=` lines (unlike IPv6 literal host portions in SIP URIs where brackets are required), making proper SDP generation and parsing critical for correct media path establishment in IPv6 VoIP deployments.
