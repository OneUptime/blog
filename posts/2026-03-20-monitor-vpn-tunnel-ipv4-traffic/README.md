# How to Monitor VPN Tunnel IPv4 Traffic and Bandwidth Usage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VPN, Monitoring, IPv4, WireGuard, OpenVPN, Bandwidth

Description: Monitor IPv4 traffic, bandwidth usage, and connection health for WireGuard and OpenVPN tunnels using built-in tools and open-source monitoring solutions.

Visibility into VPN tunnel traffic helps with capacity planning, troubleshooting, and security auditing. Here are practical methods for both WireGuard and OpenVPN.

## WireGuard: Built-in Status

```bash
# Show all peers, handshake times, and transfer bytes

sudo wg show

# Output includes:
# interface: wg0
#   public key: ...
#   listening port: 51820
#
# peer: <CLIENT_PUBLIC_KEY>
#   endpoint: 1.2.3.4:12345
#   allowed ips: 10.0.0.2/32
#   latest handshake: 42 seconds ago
#   transfer: 1.23 MiB received, 5.67 MiB sent

# Get JSON-compatible output for scripting
sudo wg show wg0 dump
```

## Scripting WireGuard Metrics

```bash
#!/bin/bash
# monitor-wg.sh - Log WireGuard peer stats every 30 seconds

while true; do
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    sudo wg show all dump | while IFS=$'\t' read -r iface pubkey psk endpoint ips handshake rx tx keepalive; do
        # Skip the interface line (it has different field count)
        if [ "$endpoint" != "(none)" ]; then
            echo "$TIMESTAMP peer=$pubkey endpoint=$endpoint rx_bytes=$rx tx_bytes=$tx"
        fi
    done
    sleep 30
done
```

## OpenVPN: Status File Monitoring

```bash
# OpenVPN writes connected client info to a status file
cat /var/log/openvpn/openvpn-status.log

# Example output:
# CLIENT_LIST,client1,1.2.3.4:12345,10.8.0.6,,15234567,8901234,Mon Mar 20 10:00:00 2026
```

Parse it with a script:

```bash
# Extract bytes in/out per client
awk -F',' '/CLIENT_LIST/ && !/HEADER/ {
    print "Client:", $2, "Bytes Received:", $6, "Bytes Sent:", $7
}' /var/log/openvpn/openvpn-status.log
```

## Using vnstat for Interface Traffic Accounting

```bash
# Install vnstat
sudo apt install vnstat -y

# Initialize monitoring on the WireGuard interface
sudo vnstat -i wg0

# View hourly, daily, monthly traffic stats
vnstat -i wg0 -h   # hourly
vnstat -i wg0 -d   # daily
vnstat -i wg0 -m   # monthly
```

## Using iftop for Real-Time Bandwidth Monitoring

```bash
# Monitor real-time bandwidth on the VPN interface
sudo iftop -i wg0 -n

# Filter by IPv4 only
sudo iftop -i wg0 -n -f "ip"
```

## Prometheus + WireGuard Exporter

```bash
# Run the wireguard-exporter for Prometheus metrics
docker run -d \
  --name wg-exporter \
  --net=host \
  --cap-add=NET_ADMIN \
  mindflavor/prometheus-wireguard-exporter

# Scrape configuration for Prometheus
# In prometheus.yml:
# - job_name: 'wireguard'
#   static_configs:
#     - targets: ['localhost:9586']
```

## Alerting on Stale Handshakes

```bash
#!/bin/bash
# Alert if any peer hasn't had a handshake in over 3 minutes

THRESHOLD=180  # seconds

sudo wg show all latest-handshakes | while read iface pubkey timestamp; do
    NOW=$(date +%s)
    AGE=$((NOW - timestamp))
    if [ $AGE -gt $THRESHOLD ]; then
        echo "ALERT: Peer $pubkey on $iface last handshake ${AGE}s ago"
    fi
done
```

Combining WireGuard's built-in stats with tools like vnstat and Prometheus provides comprehensive visibility into VPN tunnel health and usage.
