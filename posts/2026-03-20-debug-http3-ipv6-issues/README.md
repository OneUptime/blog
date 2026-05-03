# How to Debug HTTP/3 Issues over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP/3, QUIC, IPv6, Debugging, Troubleshooting

Description: Debug common HTTP/3 and QUIC issues over IPv6, including handshake failures, packet loss, and protocol negotiation problems.

## Common HTTP/3 IPv6 Issues

| Issue | Likely Cause |
|-------|-------------|
| HTTP/3 not negotiated | No Alt-Svc header or UDP 443 blocked |
| QUIC handshake timeout | Firewall blocking UDP 443 |
| Connection keeps falling back | TLS 1.3 not configured |
| Poor performance | MTU issues or ECN not working |
| IPv6 not used | Missing AAAA record or IPv6 disabled |

## Step 1: Check Alt-Svc Header

```bash
# Check if server advertises HTTP/3

curl -6 -I https://example.com | grep -i alt-svc

# If missing, server doesn't advertise HTTP/3 support
# Check Nginx config: add_header Alt-Svc 'h3=":443"; ma=86400';
```

## Step 2: Verify UDP 443 is Open

```bash
# Test UDP connectivity to IPv6 server
nc -6 -u -zv 2001:db8::1 443

# If that fails, check firewall
sudo ip6tables -L INPUT -v -n | grep 443

# Test from the server side - capture UDP on 443
sudo tcpdump -i eth0 "ip6 and udp port 443" -c 20

# If no packets arrive, the firewall is blocking UDP
```

## Step 3: Debug with curl Verbose Mode

```bash
# Full verbose QUIC debug
curl -6 --http3 https://example.com \
  --verbose \
  --trace-ascii /tmp/quic-trace.txt 2>&1 | head -50

# Parse the trace for QUIC frames
grep -E "QUIC|quic|h3|Initial|Handshake" /tmp/quic-trace.txt

# Specifically check for TLS version used
curl -6 --http3 https://example.com -v 2>&1 | grep -E "TLS|SSL|ALPN"
```

## Step 4: Verify TLS 1.3

QUIC requires TLS 1.3. Check server support:

```bash
# Test TLS 1.3 support on IPv6
openssl s_client -connect [2001:db8::1]:443 -tls1_3 2>&1 | grep "Protocol\|ALPN"

# Expected: Protocol : TLSv1.3
# If TLS 1.3 not supported, QUIC cannot work

# Note: ALPN h3 is only negotiated over QUIC (UDP), not TCP.
# openssl s_client uses TCP, so use curl --http3 to verify h3 ALPN.
# Over TCP, you can confirm h2/http1.1 ALPN as a baseline:
openssl s_client -connect [2001:db8::1]:443 -alpn h2,http/1.1 2>&1 | grep -E "ALPN|Protocol"
```

## Step 5: Packet Capture for QUIC Analysis

```bash
# Capture QUIC UDP traffic over IPv6
sudo tcpdump -i eth0 -w /tmp/quic-capture.pcap "ip6 and udp port 443"

# Open in Wireshark for QUIC frame analysis
# Wireshark 3.6+ supports QUIC dissection

# Provide TLS key log for decryption (testing only)
# Set SSLKEYLOGFILE and capture
SSLKEYLOGFILE=/tmp/tls-keys.log curl -6 --http3 https://example.com
sudo tcpdump -i eth0 -w /tmp/quic-encrypted.pcap "ip6 and udp port 443"
# In Wireshark: Edit → Preferences → Protocols → TLS → Master-Secret log file
```

## Step 6: MTU Debugging

QUIC sends larger UDP packets that can be dropped by incorrect MTU settings:

```bash
# Check IPv6 MTU on interface
ip -6 route show | grep "mtu"
ip link show eth0 | grep mtu

# IPv6 minimum MTU is 1280 bytes
# QUIC needs approximately 1200 bytes for initial packets
# Test with specific packet sizes
ping6 -M do -s 1200 2001:db8::1

# If packets are dropped at size 1200, MTU is the issue
# Fix: set interface MTU to 1500 (or match your network)
sudo ip link set eth0 mtu 1500
```

## Step 7: Nginx QUIC Debug Logging

```nginx
# Enable QUIC debug logging in Nginx
error_log /var/log/nginx/error.log debug;

# Filter QUIC-specific errors
tail -f /var/log/nginx/error.log | grep -i quic
```

## Step 8: Check for IPv6 Connectivity Issues

```bash
# Verify IPv6 is working at all
ping6 -c 4 2001:db8::1

# Check if IPv6 is preferred over IPv4
curl -6 https://ifconfig.co  # Should return IPv6 address

# Force IPv6 DNS resolution
dig AAAA example.com @2001:4860:4860::8888

# Check IPv6 routing table
ip -6 route show
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to create separate monitors for HTTP/3 and HTTP/2 over IPv6. When HTTP/3 breaks but HTTP/2 works, it typically indicates a UDP firewall issue. These dual monitors help quickly identify the protocol layer of the problem.

## Conclusion

Debugging HTTP/3 over IPv6 requires checking Alt-Svc headers, UDP port 443 accessibility, TLS 1.3 configuration, and MTU settings. Wireshark with QUIC decryption is the most powerful tool for deep analysis. Always rule out IPv6 connectivity issues before focusing on QUIC-specific problems.
