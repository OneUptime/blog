# How to Fix Wrong Source IPv6 Address in Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Source Address, Troubleshooting, RFC 6724, Linux, Routing

Description: Diagnose and fix scenarios where IPv6 connections use the wrong source address, causing asymmetric routing, firewall drops, or connection failures.

## Why Wrong Source Address Causes Problems

When an IPv6 connection uses an unexpected source address:
- Reply packets route to a different interface
- Firewall rules on the remote side reject the source
- Reverse path filtering (RPF) drops the response
- Stateful firewall loses session tracking
- Application-layer logs show unexpected client IPs

## Common Causes

| Cause | Description |
|---|---|
| Multiple addresses on interface | RFC 6724 Rule 8 picks longest match |
| Temporary address enabled | Rule 7 prefers temporary over permanent |
| Deprecated address not removed | Still in table but Rule 3 skips it - confusing |
| Wrong policy table labels | Label mismatch causes unexpected source |
| Route via unexpected interface | Rule 5 picks address from outgoing interface |
| Missing prefix in routing table | Kernel uses default route interface |

## Step 1: Confirm Which Source Is Being Used

```bash
# Method 1: Python socket trick (no traffic sent)

python3 << 'EOF'
import socket

destination = "2001:db8::1"  # Replace with actual destination
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect((destination, 80))
source = s.getsockname()[0]
s.close()
print(f"Source address for {destination}: {source}")
EOF

# Method 2: tcpdump - capture actual outgoing packet
tcpdump -i eth0 -n -c 5 'ip6' &
curl -6 --silent https://example.com > /dev/null
# Look for src address in tcpdump output

# Method 3: ss - show established connections
ss -6 -n state established
# Shows local (source) and remote (destination) addresses
```

## Step 2: Check Why That Address Was Selected

```bash
#!/bin/bash
# diagnose-source.sh - Full RFC 6724 source selection analysis

DESTINATION=${1:-"2001:db8::1"}

echo "=== Diagnosing source selection for destination: ${DESTINATION} ==="
echo ""

echo "1. All IPv6 addresses on this host:"
ip -6 addr show | grep "inet6" | while read line; do
    addr=$(echo "$line" | awk '{print $2}')
    scope=$(echo "$line" | awk '{print $4}')
    rest=$(echo "$line" | awk '{$1=$2=$3=$4=""; print $0}')
    echo "   ${addr} (scope: ${scope}) ${rest}"
done

echo ""
echo "2. Route to destination:"
ip -6 route get ${DESTINATION}
# This shows which interface and gateway would be used

echo ""
echo "3. Kernel label for destination:"
ip addrlabel list | head -20

echo ""
echo "4. Selected source (kernel decision):"
python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('${DESTINATION}', 80))
print(f'   {s.getsockname()[0]}')
s.close()
"
```

## Fix 1: Disable Temporary Addresses (If Unwanted)

```bash
# Temporary addresses (privacy extensions) are preferred by Rule 7
# If you want consistent source addresses, disable them

# Disable for specific interface
sysctl -w net.ipv6.conf.eth0.use_tempaddr=0

# Disable globally
cat > /etc/sysctl.d/40-no-tempaddr.conf << 'EOF'
net.ipv6.conf.all.use_tempaddr = 0
net.ipv6.conf.default.use_tempaddr = 0
EOF
sysctl --system

# Remove existing temporary addresses
ip -6 addr flush dev eth0 dynamic scope global
# Re-acquire via SLAAC (without temporary)
ip link set eth0 down && ip link set eth0 up
```

## Fix 2: Force Specific Source with ip rule

```bash
# Use policy routing to force specific source for outgoing traffic

# Add routing rule: traffic from wrong-source goes via specific table
ip -6 rule add from 2001:db8:1::10 table 100

# Add route in that table
ip -6 route add default via 2001:db8:1::1 dev eth0 table 100

# All traffic using 2001:db8:1::10 as source routes via eth0

# Alternatively: source routing via iptables
# Mark packets, route marked traffic via specific table
ip6tables -t mangle -A OUTPUT -s 2001:db8:1::10 -j MARK --set-mark 1
ip -6 rule add fwmark 1 table 200
ip -6 route add default via 2001:db8:1::1 table 200
```

## Fix 3: Remove Unwanted Source Addresses

```bash
# If a secondary address is causing confusion, remove it
ip -6 addr del 2001:db8:1::20/64 dev eth0

# Verify it's gone
ip -6 addr show dev eth0

# If it came from SLAAC and keeps coming back:
# 1. Check if another process (NetworkManager, systemd-networkd) readds it
# 2. Or block it at the RA level (privacy extensions / address suppression)

# Prevent SLAAC from assigning certain addresses
sysctl -w net.ipv6.conf.eth0.autoconf=0
```

## Fix 4: Policy Table Label Override

```bash
# If wrong label causes wrong source selection:
# Destination label should match desired source label

# Current problem: destination 2001:db8:peer::/48 has label 1 (global)
# But we want ULA source for this destination
# Note: Linux defaults fc00::/7 to label 5 (RFC 6724 specifies 13, but
# Linux's in-kernel policy table uses 5 - verify with `ip addrlabel list`)

# Fix: change destination label to match the ULA source label (5 on Linux)
ip addrlabel add prefix 2001:db8:peer::/48 label 5

# Now ULA source (label 5) matches destination label (5) → preferred
python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('2001:db8:peer::1', 80))
print('Source:', s.getsockname()[0])
# Should now show ULA source (fd00:: or fc00::)
"
```

## Fix 5: Application-Level Source Binding

```bash
# If system-level fixes don't work, bind explicitly in the application

# Python: force specific source
python3 << 'EOF'
import socket

DESIRED_SOURCE = "2001:db8:1::10"
DESTINATION = "2001:db8::1"
PORT = 80

sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.bind((DESIRED_SOURCE, 0, 0, 0))  # Bind source
sock.connect((DESTINATION, PORT))

print(f"Connected: {sock.getsockname()[0]} → {sock.getpeername()[0]}")
sock.close()
EOF

# curl: specify interface (forces that interface's primary address as source)
curl -6 --interface eth0 https://example.com

# curl: specify source address directly
curl -6 --interface 2001:db8:1::10 https://example.com
```

## Verification Checklist

```bash
#!/bin/bash
# verify-source.sh - Post-fix verification

DESTINATION="2001:db8::1"
EXPECTED_SOURCE="2001:db8:1::10"

ACTUAL_SOURCE=$(python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('${DESTINATION}', 80))
print(s.getsockname()[0])
s.close()
")

if [ "${ACTUAL_SOURCE}" = "${EXPECTED_SOURCE}" ]; then
    echo "PASS: Source address is ${ACTUAL_SOURCE}"
else
    echo "FAIL: Expected ${EXPECTED_SOURCE}, got ${ACTUAL_SOURCE}"
    echo "  Run: ip -6 route get ${DESTINATION}"
    echo "  Check: ip addrlabel list"
    echo "  Check: ip -6 addr show"
fi
```

## Conclusion

Wrong source IPv6 address selection usually stems from one of five causes: temporary addresses (Rule 7) being preferred, multiple addresses with ambiguous prefix length (Rule 8), incorrect policy table labels (Rule 6), the route using an unexpected interface (Rule 5), or deprecated addresses in the table. Fix order: first check with `ip -6 route get <destination>` to confirm the outgoing interface, then check `ip -6 addr show` for deprecated/temporary addresses, then verify `ip addrlabel list` for label assignments. For immediate relief, bind the application explicitly to the desired source address. For permanent fixes, adjust policy table labels or disable temporary addresses via `use_tempaddr=0`.
