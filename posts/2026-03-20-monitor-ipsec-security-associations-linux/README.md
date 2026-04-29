# How to Monitor IPsec Security Associations (SA) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPsec, Security Associations, Linux, strongSwan, XFRM, Monitoring

Description: Monitor IPsec Security Associations using strongSwan status commands and Linux ip xfrm tools to verify tunnel health and traffic statistics.

IPsec Security Associations (SAs) are the negotiated parameters that govern how traffic is encrypted. Monitoring SAs confirms tunnels are active, shows traffic statistics, and reveals when rekeying occurs.

## strongSwan Status Commands

```bash
# Quick status overview

sudo ipsec status
# Expected output:
# site-to-site{1}: INSTALLED, TUNNEL mode, reqid 1, ESP in UDP SPIs: ...
# site-to-site{1}: 192.168.1.0/24 === 192.168.2.0/24

# Detailed status including SA lifetimes and counters
sudo ipsec statusall
# Shows:
# - IKE SA state (ESTABLISHED)
# - IKE SA lifetime remaining
# - Child SA (ESP) SPIs
# - Bytes in/out per SA
# - Local and remote traffic selectors
```

## Reading ipsec statusall Output

```text
site-to-site[1]: ESTABLISHED 2 hours ago, 1.2.3.4[gateway-a]...5.6.7.8[gateway-b]
  site-to-site[1]: IKEv2 SPIs: abc12345_i def67890_r*, ...
  site-to-site[1]: IKE proposal: AES_CBC_256/HMAC_SHA2_256_128/PRF_HMAC_SHA2_256/MODP_2048
  site-to-site{1}: INSTALLED, TUNNEL, reqid 1, ESP in UDP SPIs: c1234567_i c7654321_o
  site-to-site{1}: AES_CBC_256/HMAC_SHA2_256_128, 1234 bytes_i, 5678 bytes_o
  site-to-site{1}: 192.168.1.0/24 === 192.168.2.0/24
```

Key fields:
- `bytes_i/bytes_o`: Traffic volume through the tunnel
- `ESTABLISHED X ago`: How long the IKE SA has been up
- `SPIs`: Security Parameter Index identifiers for each direction

## Kernel-Level XFRM State Monitoring

```bash
# List all XFRM states (active SAs in kernel)
sudo ip xfrm state list

# Example output:
# src 1.2.3.4 dst 5.6.7.8
#     proto esp spi 0xc1234567 reqid 1 mode tunnel
#     replay-window 32 flag af-unspec
#     auth-trunc hmac(sha256) ... 128
#     enc cbc(aes) ...
#     anti-replay context: seq 0x0, oseq 0x64, bitmap 0x00000000

# Check statistics for a specific SA (by SPI)
sudo ip xfrm state get src 1.2.3.4 dst 5.6.7.8 proto esp spi 0xc1234567
```

## Monitoring Traffic Through XFRM

```bash
# Show XFRM statistics (byte/packet counters)
sudo ip xfrm state list | grep -A5 "lifetime"

# Show kernel XFRM error/drop counters
cat /proc/net/xfrm_stat

# Count ESP packets with tcpdump (IP protocol 50)
sudo tcpdump -i eth0 -c 100 -n ip proto 50 | wc -l
```

## Monitoring Script

```bash
#!/bin/bash
# monitor-ipsec.sh - Print SA status and alert on stale tunnels

MAX_AGE_SECONDS=300  # Alert if no traffic for 5 minutes

echo "=== IPsec SA Status at $(date) ==="
sudo ipsec statusall | grep -E "ESTABLISHED|INSTALLED|bytes"

# Check for zero bytes (stale tunnel)
echo ""
echo "=== Traffic Check ==="
sudo ipsec statusall | grep "bytes" | while read line; do
    bytes_in=$(echo $line | grep -oP '\d+ bytes_i' | grep -oP '\d+')
    if [ "$bytes_in" = "0" ]; then
        echo "WARNING: SA with 0 bytes received: $line"
    fi
done
```

## Automated Tunnel Health Check

```bash
#!/bin/bash
# Ping the remote LAN through the tunnel and restart if down
REMOTE_HOST="192.168.2.1"

if ! ping -c 3 -W 5 $REMOTE_HOST > /dev/null 2>&1; then
    echo "Tunnel appears down, restarting..."
    sudo ipsec restart
else
    echo "Tunnel healthy"
fi
```

## Monitoring with Prometheus

```bash
# strongSwan does not ship a built-in Prometheus plugin.
# Use a third-party exporter that connects to the vici socket, e.g.:
#   - github.com/torilabs/ipsec-prometheus-exporter (default port 8079)
#   - github.com/sergeymakinen/ipsec_exporter (supports strongSwan and libreswan)
#
# Ensure the vici plugin is loaded in strongswan.conf:
# charon {
#   plugins {
#     vici {
#       load = yes
#     }
#   }
# }
# Then run the exporter and scrape, e.g.: http://localhost:8079/metrics
```

Regular SA monitoring ensures you detect tunnel failures proactively rather than waiting for user complaints about connectivity issues.
