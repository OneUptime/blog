# How to Debug IPv6 Address Selection Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Debugging, Address Selection, RFC 6724, Linux, Troubleshooting

Description: Diagnose and fix IPv6 source and destination address selection problems using kernel tracing, getaddrinfo inspection, and policy table analysis.

## Common Address Selection Problems

| Symptom | Likely Cause |
|---|---|
| Wrong source address in connections | Rule 6/8 mismatch, policy table label issue |
| IPv4 used when IPv6 expected | gai.conf precedence, missing AAAA record |
| IPv6 used when IPv4 expected | Default RFC 6724 preference not overridden |
| ULA address used for global destination | Missing label 13 on fc00::/7 |
| Temporary address not used | use_tempaddr=0, or Rule 7 overridden |
| Connection fails with valid addresses | Deprecated address selected (Rule 3) |

## Diagnostic Flowchart

```mermaid
flowchart TD
    A[Wrong address selected] --> B{Source or Destination?}
    B --> C[Source address wrong]
    B --> D[Destination sorted wrong]
    C --> E[Check ip addr - deprecated/scope?]
    C --> F[Check ip addrlabel list]
    C --> G[Python socket connect test]
    D --> H[Check /etc/gai.conf precedence]
    D --> I[Check DNS AAAA vs A records]
    D --> J[getaddrinfo() result order]
    E --> K[Fix: ip addr change preferred_lft]
    F --> L[Fix: ip addrlabel add/del]
    H --> M[Fix: edit /etc/gai.conf]
```

## Step 1: Identify What getaddrinfo Returns

```bash
# Python one-liner: show getaddrinfo sort order

python3 -c "
import socket
import sys

host = sys.argv[1] if len(sys.argv) > 1 else 'example.com'
results = socket.getaddrinfo(host, 80, type=socket.SOCK_STREAM)
print(f'getaddrinfo results for {host}:')
for i, r in enumerate(results):
    af = 'IPv6' if r[0] == socket.AF_INET6 else 'IPv4'
    print(f'  {i+1}. [{af}] {r[4][0]}')
" example.com

# Also check raw DNS (before RFC 6724 sorting)
dig AAAA example.com +short
dig A example.com +short
```

## Step 2: Check Source Address Selection

```bash
# Determine which source the kernel would select for a destination
python3 << 'EOF'
import socket

destinations = [
    "2001:db8::1",       # global IPv6
    "fd00::1",           # ULA
    "192.168.1.1",       # IPv4
]

for dest in destinations:
    try:
        # Use AF_INET6 for IPv6, AF_INET for IPv4
        if ":" in dest:
            s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
        else:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect((dest, 80))
        src = s.getsockname()[0]
        print(f"Dest: {dest:<30} → Source: {src}")
        s.close()
    except Exception as e:
        print(f"Dest: {dest:<30} → Error: {e}")
EOF
```

## Step 3: Inspect All Addresses and Their State

```bash
#!/bin/bash
# Check address states that affect selection

echo "=== All IPv6 addresses ==="
ip -6 addr show | grep "inet6" | while read -r line; do
    addr=$(echo "$line" | awk '{print $2}')
    scope=$(echo "$line" | awk '{print $4}')
    flags=$(echo "$line" | awk '{print $5}')
    deprecated=""
    temp=""
    [ "$flags" = "deprecated" ] && deprecated="(DEPRECATED - Rule 3 avoids this)"
    [ "$flags" = "temporary" ] && temp="(temporary - Rule 7 prefers this)"
    echo "  ${addr} scope=${scope} ${deprecated}${temp}"
done

echo ""
echo "=== Kernel addrlabel table ==="
ip addrlabel list

echo ""
echo "=== gai.conf precedence ==="
grep "^precedence" /etc/gai.conf 2>/dev/null | sort -k3 -rn || echo "(using compiled-in defaults)"

echo ""
echo "=== privacy extensions ==="
for iface in $(ip link show | grep "^[0-9]" | awk '{print $2}' | tr -d ':'); do
    val=$(sysctl -n net.ipv6.conf.${iface}.use_tempaddr 2>/dev/null)
    echo "  ${iface}: use_tempaddr=${val} (0=off, 1=gen/no-prefer, 2=gen+prefer)"
done
```

## Step 4: Trace Actual Connections

```bash
# Watch which source address is used for outgoing connections
ss -6 -n state established

# While curl connects to a host:
# Terminal 1:
watch -n 0.5 "ss -6 -n state established | grep :80"
# Terminal 2:
curl -6 -v https://example.com 2>&1 | grep "Connected to"

# strace to see getaddrinfo behavior
strace -e trace=socket,connect,getsockname -f \
    curl -6 https://example.com 2>&1 | grep -E "AF_INET6|connect|getsock"
```

## Step 5: Verify Policy Table Labels

```bash
#!/bin/bash
# Check if a source/destination pair would match labels

check_label() {
    local prefix=$1
    ip addrlabel list | while read -r entry; do
        # Parse: prefix <pfx/len> label <N>
        pfx=$(echo "$entry" | awk '{print $2}')
        lbl=$(echo "$entry" | awk '{print $4}')
        echo "  ${pfx} → label ${lbl}"
    done
}

echo "Source labels:"
check_label $(ip -6 addr show scope global | awk '/inet6/{print $2}' | head -1)

echo ""
echo "Destination label lookup:"
python3 << 'PYEOF'
import ipaddress
import subprocess

def get_label(addr):
    # Parse ip addrlabel list output
    result = subprocess.run(['ip', 'addrlabel', 'list'], capture_output=True, text=True)
    best_len = -1
    best_label = 1  # default
    target = ipaddress.ip_address(addr)
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 4 and parts[0] == 'prefix':
            try:
                net = ipaddress.ip_network(parts[1], strict=False)
                if target in net and net.prefixlen > best_len:
                    best_len = net.prefixlen
                    best_label = int(parts[3])
            except Exception:
                pass
    return best_label

for addr in ['2001:db8::1', 'fd00::1', '::1']:
    print(f"  {addr}: label={get_label(addr)}")
PYEOF
```

## Fixing Common Issues

```bash
# Fix 1: Deprecated address being skipped - restore preferred lifetime
ip addr change 2001:db8:1::10/64 dev eth0 preferred_lft forever

# Fix 2: Wrong label causing incorrect source - override label
ip addrlabel add prefix 2001:db8::/32 label 99  # unique label
# Now connections to this destination won't match ULA source label 13

# Fix 3: Temporary addresses not used - enable privacy extensions
sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# Fix 4: IPv4 preferred when IPv6 expected - restore gai.conf defaults
rm -f /etc/gai.conf
# Or explicitly set IPv6 precedence higher than IPv4

# Fix 5: ULA used for global destination - check label 13 scope
# ULA fc00::/7 label 13 should NOT match global ::/0 label 1
# If it does, someone modified the policy table. Re-add the RFC 6724
# default entry rather than flushing (ip addrlabel flush empties the
# table entirely and does NOT restore kernel defaults).
ip addrlabel del prefix fc00::/7 2>/dev/null
ip addrlabel add prefix fc00::/7 label 13
```

## Conclusion

Debugging IPv6 address selection follows a clear path: first identify whether the problem is source selection or destination sorting, then check address state (deprecated?), the addrlabel table (correct labels?), and gai.conf (correct precedence?). The Python `socket.connect()` trick reveals kernel source selection without sending traffic. The `getaddrinfo()` call with printed results shows destination sort order. Most issues fall into three categories: deprecated addresses being skipped, wrong label assignments causing mismatches, or missing gai.conf configuration for IPv4/IPv6 preference.
