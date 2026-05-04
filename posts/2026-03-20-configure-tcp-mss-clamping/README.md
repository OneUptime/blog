# How to Configure TCP MSS Clamping to Avoid Fragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, MSS, MTU, Clamping, iptables, Linux, Fragmentation

Description: Configure TCP MSS clamping with iptables to prevent fragmentation by limiting the maximum TCP segment size to fit within the path MTU, especially important for VPN and tunnel environments.

## Introduction

TCP Maximum Segment Size (MSS) is negotiated during the handshake and controls the maximum TCP payload per segment. When the path MTU is smaller than what the MSS implies, packets get fragmented or dropped. MSS clamping via iptables forces TCP to use a smaller MSS that fits within the actual path MTU, preventing fragmentation without requiring PMTUD to work correctly.

## How MSS Clamping Works

```text
Without clamping:
  Host A negotiates MSS = 1460 (standard Ethernet: 1500 - 40 headers)
  Traffic goes through VPN tunnel with MTU 1420
  TCP sends 1460 byte segments → exceeds tunnel MTU
  → Fragmentation or PMTUD black hole → connection hangs

With MSS clamping:
  iptables intercepts SYN packets
  Reduces MSS in SYN from 1460 to 1380 (1420 - 40 headers)
  Both sides negotiate lower MSS from the start
  TCP sends 1380 byte segments → fits in tunnel MTU
  → No fragmentation, no black holes, connection works
```

## Basic MSS Clamping

```bash
# Clamp MSS to path MTU (dynamic, recommended):

iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# This reads the output interface's MTU and clamps accordingly
# Works automatically for all TCP connections passing through this router/gateway

# Apply to both directions:
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Apply to locally-generated traffic (this host as client and server SYN-ACKs):
iptables -t mangle -A OUTPUT -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Note: --clamp-mss-to-pmtu is only valid in FORWARD, OUTPUT and POSTROUTING
# chains. Use --set-mss <value> if you need to mangle MSS in PREROUTING/INPUT.
```

## Set Specific MSS Value

```bash
# When you know the exact path MTU:
# MSS = MTU - IP header (20) - TCP header (20) = MTU - 40

# For a path MTU of 1420 (WireGuard VPN):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380
# 1420 - 40 = 1380

# For a path MTU of 1450 (VXLAN):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1410
# 1450 - 40 = 1410

# For a path MTU of 1476 (GRE):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1436
# 1476 - 40 = 1436
```

## VPN-Specific Clamping

```bash
# Clamp only traffic going through the VPN interface:

# For WireGuard (wg0):
iptables -t mangle -A POSTROUTING -o wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380

# For OpenVPN (tun0):
iptables -t mangle -A POSTROUTING -o tun0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# For GRE tunnel (gre1):
iptables -t mangle -A POSTROUTING -o gre1 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1436

# For IPsec (using xfrm interface):
iptables -t mangle -A POSTROUTING -o xfrm0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1350

# Verify with iptables list:
iptables -t mangle -L FORWARD -n -v
```

## nftables MSS Clamping

```bash
# Modern alternative to iptables:
cat > /etc/nftables.d/mss_clamp.nft << 'EOF'
table inet mangle {
    chain FORWARD {
        type filter hook forward priority mangle;

        # Clamp MSS for all forwarded TCP SYN packets:
        tcp flags syn tcp option maxseg size set rt mtu
    }

    chain OUTPUT {
        type filter hook output priority mangle;

        # Clamp for locally generated traffic:
        tcp flags syn tcp option maxseg size set rt mtu
    }
}
EOF
nft -f /etc/nftables.d/mss_clamp.nft
```

## Verify MSS Clamping Works

```bash
# Capture TCP handshakes and check MSS value:
tcpdump -i eth0 -n -v 'tcp[tcpflags] & tcp-syn != 0' 2>/dev/null | \
  grep -E "mss|MSS|options"
# Look for: options [mss 1380,...] or similar
# MSS should match your clamping value

# Compare before and after clamping:
# Before: options [mss 1460,...]  ← standard Ethernet MSS
# After:  options [mss 1380,...]  ← clamped to your value

# Test a large download through the VPN/tunnel:
wget -O /dev/null http://speedtest.example.com/largefile
# Should complete without hanging
```

## Make Clamping Persistent

```bash
# Save iptables rules:
iptables-save > /etc/iptables/rules.v4

# For iptables-persistent package:
apt-get install iptables-persistent -y
iptables-save > /etc/iptables/rules.v4

# For systemd-based systems without iptables-persistent:
cat > /etc/systemd/system/iptables-restore.service << 'EOF'
[Unit]
Description=Restore iptables rules
Before=network-pre.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables-restore /etc/iptables/rules.v4

[Install]
WantedBy=multi-user.target
EOF
systemctl enable iptables-restore
```

## Conclusion

TCP MSS clamping is the most reliable solution for MTU-related TCP issues in tunnel environments. Use `--clamp-mss-to-pmtu` for dynamic clamping based on output interface MTU, or `--set-mss VALUE` when you know the exact path MTU. Apply to the `FORWARD` chain for routing between interfaces, `OUTPUT` for locally-generated traffic, and on the specific tunnel interface (`-o wg0` etc.) for targeted clamping. Verify the clamping is active by capturing SYN packets and checking the MSS value in TCP options.
