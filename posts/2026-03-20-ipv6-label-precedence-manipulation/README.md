# How to Manipulate IPv6 Label and Precedence Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RFC 6724, Policy Table, LABEL, Precedence, Linux, Address Selection

Description: Manipulate IPv6 address selection label and precedence values on Linux to control source address selection and destination sorting for specific traffic patterns.

## Labels vs Precedence

RFC 6724 uses two distinct mechanisms:

| Mechanism | Controls | Tool |
|---|---|---|
| Label | Source/destination pairing (prefer same label) | `ip addrlabel` (kernel) + `gai.conf` |
| Precedence | Destination sort order (higher = sorted earlier) | `gai.conf` only |

Labels are used to pair source and destination addresses. Precedence ranks destination addresses regardless of source.

## Understanding Label Matching

RFC 6724 Rule 6: "Prefer matching label" - if the source address label matches the destination address label, that source-destination pair is preferred.

```bash
# Typical Linux kernel default label assignments (`ip addrlabel list`):

# ::1/128         label 0   (loopback)
# ::/96           label 3   (IPv4-compatible)
# ::ffff:0:0/96   label 4   (IPv4-mapped)
# 2001::/32       label 6   (Teredo)
# 2001:10::/28    label 7   (ORCHID)
# 2002::/16       label 2   (6to4)
# fec0::/10       label 11  (site-local, obsolete)
# fc00::/7        label 5   (ULA)
# ::/0            label 1   (other global IPv6)

# Result:
# Global IPv6 source (label 1) matches most global IPv6 dests (label 1) → preferred
# ULA source (label 5) matches ULA dest (label 5) → preferred
# IPv4-mapped source (label 4) matches IPv4 dest (label 4) → preferred
```

## Manipulating Labels with ip addrlabel

```bash
# View current kernel label table
ip addrlabel list

# Add a custom label for a specific prefix
# Use case: make connections to 2001:db8:cd0::/48 prefer ULA source
ip addrlabel add prefix 2001:db8:cd0::/48 label 5

# Now:
# Destination 2001:db8:cd0:: has label 5
# ULA source fd00:: has label 5 → MATCH (ULA source preferred for CDN)
# Global source 2001:db8:: has label 1 → NO MATCH

# Remove the custom label
ip addrlabel del prefix 2001:db8:cd0::/48

# Flush all labels (including defaults; this does not restore the kernel default table)
ip addrlabel flush
```

## Manipulating Precedence in gai.conf

```bash
# Higher precedence = destination is sorted earlier when higher-priority rules tie
# Useful for controlling IPv4 vs IPv6 and tunnel preference

# Use case 1: Prefer IPv6 for specific prefix, IPv4 for everything else
cat > /etc/gai.conf << 'EOF'
# Duplicate the full default label table because any label line disables the built-in defaults
label ::1/128        0
label ::/0           1
label 2002::/16      2
label ::/96          3
label ::ffff:0:0/96  4
label fec0::/10      5
label fc00::/7       6
label 2001:0::/32    7

# Duplicate the default precedence table because any precedence line disables the built-in defaults
precedence ::1/128       50
precedence ::/0          40   # global IPv6
precedence 2002::/16     30
precedence ::/96         20
precedence ::ffff:0:0/96 35   # IPv4 (still lower than global IPv6)

# Raise specific prefix even higher (sorted earlier than other usable destinations)
precedence 2001:db8:cd0::/48  100
EOF
```

## Advanced: Creating Traffic Policies with Labels

```bash
# Scenario: 3 subnets, traffic must stay within subnet
# Subnet A: 2001:db8:a::/48 - label 20
# Subnet B: 2001:db8:b::/48 - label 21
# Global:   ::/0            - label 1

# Add labels (kernel table - affects source selection)
ip addrlabel add prefix 2001:db8:a::/48 label 20
ip addrlabel add prefix 2001:db8:b::/48 label 21

# gai.conf - affects getaddrinfo destination sorting (append to the full table from above)
cat >> /etc/gai.conf << 'EOF'
label 2001:db8:a::/48 20
label 2001:db8:b::/48 21
EOF

# Result:
# Host in subnet A connecting to subnet A dest → source from 2001:db8:a:: (label 20 matches)
# Host in subnet A connecting to subnet B dest → if another usable label-1 source exists, it can be preferred
# Traffic policy is expressed as address selection preference, not hard enforcement
```

## Preventing ULA Leakage to Internet

```bash
# Verify ULA addresses are not preferred for global destinations when a global source is available

# ULA should have label 5 in the Linux kernel default table (not label 1)
ip addrlabel list | grep "fc00"
# prefix fc00::/7 label 5  ← typical Linux default

# Global destinations have label 1 - no match with ULA label 5
# So if a global source address is also available, it is preferred over a ULA source

# Test: if the host has both ULA and global source addresses, the chosen source should normally not be ULA
python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('2001:db8::1', 80))
src = s.getsockname()[0]
print(f'Source for global dest: {src}')
# If both ULA and global source addresses are configured, src should not be in fc00::/7
if src.startswith('fd') or src.startswith('fc'):
    print('WARNING: ULA source selected; verify whether a global source was available')
else:
    print('OK: Selected a non-ULA source')
"
```

## Persistent Configuration

```bash
# Save ip addrlabel rules across reboots using systemd
cat > /etc/systemd/system/ipv6-policy.service << 'EOF'
[Unit]
Description=IPv6 Address Selection Policy
After=network.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/bin/bash -c '\
    /usr/sbin/ip addrlabel add prefix 2001:db8:cd0::/48 label 5; \
    /usr/sbin/ip addrlabel add prefix 2001:db8:a::/48 label 20; \
    /usr/sbin/ip addrlabel add prefix 2001:db8:b::/48 label 21'
ExecStop=-/bin/bash -c '\
    /usr/sbin/ip addrlabel del prefix 2001:db8:cd0::/48; \
    /usr/sbin/ip addrlabel del prefix 2001:db8:a::/48; \
    /usr/sbin/ip addrlabel del prefix 2001:db8:b::/48'

[Install]
WantedBy=multi-user.target
EOF

systemctl enable --now ipv6-policy.service
```

## Testing Label Changes

```bash
#!/bin/bash
# test-labels.sh - Verify label assignments and source selection

echo "=== Kernel label table ==="
ip addrlabel list

echo ""
echo "=== Source selection for various destinations ==="

DESTS=(
    "2001:db8::1"      # global
    "fd00::1"          # ULA
    "2001:db8:cd0::1"  # custom prefix (if custom label added)
    "::1"              # loopback
)

for dest in "${DESTS[@]}"; do
    src=$(python3 -c "
import socket
try:
    s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    s.connect(('${dest}', 80))
    print(s.getsockname()[0])
    s.close()
except Exception as e:
    print(f'error: {e}')
")
    printf '  Dest: %-30s -> Source: %s\n' "$dest" "$src"
done

echo ""
echo "=== gai.conf active labels ==="
grep "^label" /etc/gai.conf 2>/dev/null || echo "(using built-in defaults)"
```

## Conclusion

Label manipulation is the most powerful aspect of RFC 6724 policy control. By assigning the same label to a source prefix and destination prefix, you make that source preferred for those destinations when earlier selection rules do not override it. Use `ip addrlabel add prefix <prefix> label <N>` for kernel-level source selection, and add matching `label` entries to `/etc/gai.conf` for userspace `getaddrinfo()` destination sorting. Precedence values in `gai.conf` influence destination ordering - raise a prefix's precedence to sort it earlier when higher-priority rules do not decide the result. Persist custom kernel label rules across reboots with a systemd oneshot service that adds the desired `ip addrlabel` entries at startup.
