# How to Monitor VPN IPv6 Tunnel Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VPN, Monitoring, WireGuard, OpenVPN, Network Operations

Description: A guide to monitoring IPv6 VPN tunnel health and status using command-line tools, scripts, and monitoring systems for WireGuard, OpenVPN, and IPsec.

Monitoring VPN IPv6 tunnel status involves checking tunnel connectivity, IPv6 address assignment, traffic flow, and peer handshake health. This guide covers monitoring approaches for the most common IPv6 VPN solutions.

## WireGuard IPv6 Tunnel Monitoring

```bash
# Real-time WireGuard status

sudo wg show

# Example output showing IPv6 peer:
# interface: wg0
#   public key: ...
#   listening port: 51820
#
# peer: <peer-public-key>
#   endpoint: [2001:db8::client]:51820   ← IPv6 endpoint
#   allowed ips: fd00:wg::2/128, 10.0.0.2/32
#   latest handshake: 2 minutes, 30 seconds ago
#   transfer: 15.44 MiB received, 8.76 MiB sent

# Watch for handshake timeouts (> 3 minutes = disconnected)
watch -n 5 'sudo wg show | grep -A3 "peer\|handshake\|transfer"'

# Check IPv6 address on tunnel interface
ip -6 addr show wg0

# Check default IPv6 route through VPN
ip -6 route show default
```

## OpenVPN IPv6 Status

```bash
# View status file
sudo cat /var/log/openvpn-status.log

# Monitor logs for IPv6-related events
sudo journalctl -u openvpn@server -f | grep -i "ipv6\|::\|2001\|fd00"

# Check IPv6 routes pushed to clients
sudo cat /var/log/openvpn-status.log | grep -E "::/[0-9]+"

# Verify tunnel interface has IPv6
ip -6 addr show tun0
```

## IPsec (strongSwan) IPv6 Status

```bash
# List active IKE SAs
sudo swanctl --list-sas

# Check for IPv6 SAs specifically
sudo ip -6 xfrm state show

# Monitor IPsec security policies
sudo ip -6 xfrm policy show

# Watch for SA expiration
sudo journalctl -u strongswan -f | grep -i "established\|deleted\|expired"
```

## IPv6 Connectivity Tests

```bash
# Test IPv6 ping through VPN to known endpoint
ping6 -c 5 -i 1 fd00:vpn-internal::gateway

# Measure latency
ping6 -c 20 fd00:vpn-internal::gateway | tail -1

# Test IPv6 TCP connectivity
nc -6 -w 5 fd00:vpn-internal::server 443 && echo "TCP OK" || echo "TCP FAILED"
```

## Prometheus Metrics for VPN IPv6

```yaml
# prometheus-wireguard-exporter config
# wireguard-exporter.yml

- job_name: 'wireguard'
  static_configs:
    - targets: ['localhost:9586']
  metrics_path: /metrics
```

```bash
# Install wireguard-exporter (Rust toolchain required)
cargo install --git https://github.com/MindFlavor/prometheus_wireguard_exporter

# Run exporter
sudo prometheus_wireguard_exporter -n /etc/wireguard/wg0.conf

# Key metrics:
# wireguard_latest_handshake_seconds - Unix timestamp of last handshake
# wireguard_received_bytes_total
# wireguard_sent_bytes_total
```

## Grafana Alert Rules for VPN IPv6

```yaml
# Alert when WireGuard peer hasn't had a handshake in 5 minutes
- alert: WireGuardPeerDown
  expr: (time() - wireguard_latest_handshake_seconds) > 300
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "WireGuard peer {{ $labels.public_key }} not seen for 5 minutes"

# Alert when no IPv6 traffic on tunnel
- alert: VPNNoIPv6Traffic
  expr: rate(wireguard_received_bytes_total[5m]) == 0
  for: 10m
  labels:
    severity: info
```

## Shell Script: VPN IPv6 Health Check

```bash
#!/bin/bash
# vpn-ipv6-health.sh

TUNNEL_IF="wg0"
VPN_IPV6_GATEWAY="fd00:vpn::1"
EXPECTED_EXIT_IPV6="2001:db8::vpn-server"

echo "=== VPN IPv6 Health Check ==="

# Check 1: Tunnel interface exists and has IPv6
if ip -6 addr show $TUNNEL_IF | grep -q "inet6"; then
    echo "PASS: $TUNNEL_IF has IPv6 address"
else
    echo "FAIL: $TUNNEL_IF has no IPv6 address"
fi

# Check 2: IPv6 default route through VPN
if ip -6 route show default | grep -q $TUNNEL_IF; then
    echo "PASS: IPv6 default route through $TUNNEL_IF"
else
    echo "FAIL: IPv6 default route not through $TUNNEL_IF"
fi

# Check 3: Ping IPv6 gateway
if ping6 -c 2 -W 3 $VPN_IPV6_GATEWAY &>/dev/null; then
    echo "PASS: IPv6 gateway $VPN_IPV6_GATEWAY reachable"
else
    echo "FAIL: IPv6 gateway unreachable"
fi

# Check 4: WireGuard handshake freshness
LAST_HANDSHAKE=$(sudo wg show $TUNNEL_IF latest-handshakes | awk '{print $2}')
NOW=$(date +%s)
AGE=$((NOW - LAST_HANDSHAKE))
if [ $AGE -lt 180 ]; then
    echo "PASS: Last handshake ${AGE}s ago"
else
    echo "FAIL: Last handshake ${AGE}s ago (>3 min)"
fi
```

Regular VPN IPv6 monitoring ensures that the tunnel remains healthy, IPv6 traffic continues flowing through the protected path, and any connectivity issues are detected before they impact users.
