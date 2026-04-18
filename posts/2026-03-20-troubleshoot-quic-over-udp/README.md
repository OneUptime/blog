# How to Troubleshoot QUIC Protocol Issues Over UDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: QUIC, UDP, HTTP/3, Troubleshooting, Linux, Networking, Performance

Description: Diagnose QUIC/HTTP3 connectivity and performance issues caused by UDP firewall restrictions, middlebox interference, and 0-RTT connection problems.

## Introduction

QUIC is a transport protocol built on UDP, designed as the foundation for HTTP/3. Unlike TCP, QUIC handles connection management, reliability, and multiplexing in userspace. Because it runs over UDP, QUIC encounters all UDP-specific issues: firewall blocks, NAT traversal, and middlebox interference. QUIC also has its own failure modes: 0-RTT replay attacks, version negotiation, and connection migration issues.

## Check if QUIC is Being Used

```bash
# Test if a server supports HTTP/3 (QUIC):

curl -I --http3 https://cloudflare.com 2>/dev/null | head -5
# Look for: HTTP/3 in response line

# Check if curl was compiled with HTTP/3 support:
curl --version | grep -i http3
# Should show: Features: HTTP3 (if supported)

# Use quiche-client (Cloudflare's QUIC implementation):
# docker run --rm cloudflare/quiche-client https://cloudflare.com

# Browser check: in Chrome, go to chrome://net-internals/#quic
# Shows active QUIC sessions and their states
```

## Detect QUIC Fallback to TCP

```bash
# When QUIC fails, browsers fall back to HTTP/2 over TLS/TCP
# QUIC failure is often silent from user perspective

# Detect QUIC vs HTTP/2 with curl:
curl -v --http3 https://example.com 2>&1 | grep -E "HTTP/|QUIC|Alt-Svc"
# HTTP/3 = QUIC succeeded
# HTTP/2 = QUIC failed, fell back to TCP

# Monitor QUIC fallback on a server (nginx with HTTP/3):
tail -f /var/log/nginx/access.log | grep -E "HTTP/3|HTTP/2"

# Force QUIC attempt with quic-go client:
# go run example_client.go https://example.com
```

## Firewall and NAT Issues

```bash
# Most common QUIC issue: UDP blocked or rate-limited
# Check if UDP/443 is allowed outbound:
nc -zu 8.8.4.4 443
# "Connection to 8.8.4.4 port 443 [udp] succeeded" = UDP 443 is open

# Test with explicit firewall check:
iptables -L OUTPUT -n | grep -E "DROP|REJECT"
# Any rule matching UDP 443 outbound = QUIC will fail

# Allow UDP/443 (for QUIC outbound):
iptables -I OUTPUT -p udp --dport 443 -j ACCEPT

# For NAT environments: QUIC uses connection IDs, not 4-tuples
# Some NAT devices don't handle QUIC connection migration correctly
# Symptom: connection drops when IP changes (mobile handoff)

# Check conntrack for QUIC sessions:
conntrack -L -p udp --dport 443 2>/dev/null | head -10
```

## QUIC-Specific Issues

```bash
# Issue 1: Middlebox blocking QUIC header inspection
# Some devices block unknown UDP protocols
# Symptom: QUIC times out, no response from server

# Test: does the server respond to QUIC initial packet?
# Use ngtcp2 or quiche for low-level QUIC testing:
# quiche-client https://cloudflare.com --no-verify

# Issue 2: Version negotiation failure
# Client tries QUIC v1, server responds with supported versions
# Check for version mismatch in Wireshark:
# Filter: quic
# Look for: QUIC Version Negotiation packet type

# Issue 3: 0-RTT replay protection
# Server may reject 0-RTT data in some states
# Symptom: first request succeeds, second over new connection fails
# Fix: disable 0-RTT in client configuration (accepts higher latency)
```

## Capture QUIC Traffic

```bash
# Wireshark can dissect QUIC (IETF QUIC since 3.0; RFC 9000 / v1 since 3.5):
# Filter: quic
# Shows: initial packets, handshake, connection IDs

# tcpdump capture for QUIC (UDP/443):
tcpdump -i eth0 -n 'udp port 443' -w /tmp/quic.pcap

# QUIC is encrypted (TLS 1.3), so payload not visible without keys
# Chrome can export TLS keys for Wireshark:
# Set SSLKEYLOGFILE environment variable before starting Chrome:
export SSLKEYLOGFILE=/tmp/ssl_keylog.txt
chromium --enable-quic
# Then load Wireshark capture with the keylog file:
# Edit → Preferences → Protocols → TLS → (Pre)-Master-Secret log filename
```

## Enable QUIC on nginx

```nginx
# nginx.conf - Enable HTTP/3 (QUIC):
server {
    listen 443 ssl;         # HTTP/2 over TLS (TCP)
    listen 443 quic reuseport;  # HTTP/3 (QUIC over UDP)

    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    # Advertise HTTP/3 support:
    add_header Alt-Svc 'h3=":443"; ma=86400';
}
```

```bash
# Verify QUIC is advertised:
curl -I https://yourserver.com | grep Alt-Svc
# Should show: Alt-Svc: h3=":443"; ma=86400

# Test H3 connection:
curl --http3 https://yourserver.com
```

## Conclusion

QUIC troubleshooting starts with verifying UDP/443 is not blocked (most common cause of QUIC failure). Check firewalls on both client and server sides. Use `curl --http3` to test QUIC connectivity and watch for silent fallback to HTTP/2. For server-side issues, ensure nginx is configured with `listen 443 quic` and the `Alt-Svc` header is present. Capture with Wireshark and TLS keylog for deep analysis of connection handshake and version negotiation issues.
