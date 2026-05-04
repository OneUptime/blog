# How to Configure MTU for Cloud VPN Connections (AWS, GCP, Azure)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, VPN, AWS, GCP, Azure, Cloud, Networking, IPsec

Description: Configure correct MTU values for cloud VPN connections on AWS, GCP, and Azure to prevent fragmentation and ensure reliable encrypted tunnel performance.

## Introduction

Cloud VPN connections use IPsec tunnels that add overhead to every packet, reducing the effective MTU available for payload. AWS Site-to-Site VPN, GCP Cloud VPN, and Azure VPN Gateway all use IPsec with different encapsulation overhead. Misconfigured MTU leads to fragmentation, packet loss, and poor performance - particularly for TCP connections that don't receive correct MSS values.

## IPsec VPN Overhead Calculation

```text
IPsec tunnel overhead (tunnel mode ESP with AES-GCM-128):
  New outer IP header:  20 bytes
  ESP header:            8 bytes
  IV (nonce):           8 bytes
  ICV (auth tag):       16 bytes
  Padding (variable):   0-15 bytes average ~8 bytes
  ESP trailer:           2 bytes
  Total overhead:       ~58-70 bytes

For a 1500-byte physical MTU:
  Available payload MTU = 1500 - 70 = 1430 bytes
  With GRE over IPsec: 1500 - 70 - 24 = 1406 bytes

AWS recommends: MTU 1399 for VPN connections
GCP recommends: MTU 1460 (UDP encap) or 1380 (TCP)
Azure recommends: MTU 1350 for P2S VPN
```

## AWS Site-to-Site VPN MTU

```bash
# AWS VPN uses 1500-byte physical MTU with IPsec overhead

# Recommended customer gateway MTU settings:

# On customer gateway (your on-prem router or EC2 instance):
ip link set eth0 mtu 1500  # Physical interface stays 1500

# VPN tunnel interface:
# AWS advises setting tunnel interface MTU to 1399
ip link set vti1 mtu 1399

# For AWS EC2 acting as VPN endpoint:
# Check instance type MTU (some support jumbo frames):
ip link show eth0 | grep mtu
# c5n instances: 9001 MTU on ENA
# t3/m5 instances: 9001 MTU on ENA

# Set MSS clamping on tunnel interface (critical for TCP):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -o vti1 -j TCPMSS --set-mss 1359

# Verify with ping through tunnel:
ping -M do -s 1371 -c 3 <far-end-IP>
# 1371 + 28 (ICMP+IP headers) = 1399 total
```

## GCP Cloud VPN MTU

```bash
# GCP Cloud VPN Classic: 1460 MTU (uses UDP encapsulation)
# GCP HA VPN: 1460 MTU

# Configure on your on-premises gateway:
ip link set <tunnel-interface> mtu 1460

# If using GCP VPN with BGP over the tunnel:
# BGP packets must fit within tunnel MTU
# Configure router MTU for BGP sessions:
# (On Cisco IOS):
# interface Tunnel0
#   ip mtu 1460
#   ip tcp adjust-mss 1420

# Verify GCP VPN MTU from GCP side:
# In GCP Console: VPN > Tunnels > <tunnel> > Details
# Status shows MTU negotiated

# Test path MTU through GCP VPN:
tracepath -n <destination-in-GCP>
# Look for pmtu values along the path

# GCP to on-prem over VPN with MSS clamping:
iptables -t mangle -A POSTROUTING -p tcp --tcp-flags SYN,RST SYN \
  -o <vpn-interface> -j TCPMSS --clamp-mss-to-pmtu
```

## Azure VPN Gateway MTU

```bash
# Azure Point-to-Site VPN:
# IKEv2: MTU 1350
# SSTP:  MTU 1350
# OpenVPN: MTU 1300

# Azure Site-to-Site VPN:
# Recommended MTU: 1350

# Configure Azure VPN client MTU:
# On Linux with Azure VPN:
ip link set <azure-vpn-interface> mtu 1350

# For Azure Virtual Network Gateway:
# Set MSS on your on-prem gateway:
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1310  # 1350 - 40 bytes TCP/IP headers

# Verify Azure VPN MTU:
ping -M do -s 1322 -c 3 <azure-vm-ip>
# 1322 + 28 = 1350 bytes total
```

## Verify and Test Cloud VPN MTU

```bash
#!/bin/bash
# Test effective MTU through cloud VPN

DEST=$1  # IP address on far side of VPN
echo "Testing MTU to $DEST"
echo "========================"

for SIZE in 1500 1460 1400 1399 1380 1350 1300; do
    PAYLOAD=$((SIZE - 28))  # Subtract IP + ICMP headers
    RESULT=$(ping -M do -s $PAYLOAD -c 1 -W 2 $DEST 2>&1)
    if echo "$RESULT" | grep -q "bytes from"; then
        echo "MTU $SIZE: PASS"
    elif echo "$RESULT" | grep -q "Frag needed\|Message too long"; then
        echo "MTU $SIZE: FRAG NEEDED (PMTUD working)"
    else
        echo "MTU $SIZE: FAIL (timeout or dropped)"
    fi
done
```

## Persistent MTU Configuration for Cloud VPN

```bash
# systemd-networkd for persistent VPN tunnel MTU:
cat > /etc/systemd/network/20-vpn-tunnel.network << 'EOF'
[Match]
Name=vti0

[Link]
MTUBytes=1399

[Network]
Address=169.254.0.2/30
EOF

networkctl reload

# Or for NetworkManager-managed VPN:
nmcli connection modify "AWS VPN" ip-tunnel.mtu 1399
nmcli connection up "AWS VPN"

# Persistent iptables MSS clamping:
# Add to /etc/iptables/rules.v4 or equivalent:
# -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu
```

## Conclusion

Cloud VPN MTU depends on the encapsulation: AWS recommends 1399, GCP 1460, and Azure 1350 for their respective VPN products. The key is to set the tunnel interface MTU correctly and apply TCP MSS clamping to prevent large TCP segments. Test with `ping -M do` using payload sizes that correspond to your expected tunnel MTU minus 28 bytes. For UDP applications crossing cloud VPNs, limit payload to the tunnel MTU minus 28 bytes to avoid fragmentation at the tunnel endpoints.
