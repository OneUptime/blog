# How to Configure the IPv6 Policy Table on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Policy Table, RFC 6724, Linux, Gai.conf, Address Selection

Description: Configure the IPv6 address selection policy table on Linux using ip addrlabel and /etc/gai.conf to control source and destination address preferences.

## Two Policy Tables on Linux

Linux maintains two related but distinct policy tables:

| Table | Tool | Scope | Purpose |
|---|---|---|---|
| Kernel addrlabel | `ip addrlabel` | Kernel (all processes) | Label assignment for source selection |
| gai.conf | `/etc/gai.conf` | Userspace (getaddrinfo) | Precedence + label for destination sort |

Most applications use `getaddrinfo()`, so `/etc/gai.conf` controls what they see. The kernel addrlabel table affects kernel source selection when an application does not bind a source address explicitly.

## Viewing Current Policy State

```bash
# Kernel label table

ip addrlabel list

# gai.conf (userspace destination selection)
cat /etc/gai.conf

# Effective behavior - show getaddrinfo result order
python3 -c "
import socket
for r in socket.getaddrinfo('example.com', 80, type=socket.SOCK_STREAM):
    print(r[0].name, r[4][0])
"
```

## Configuring /etc/gai.conf

The `gai.conf` file directly controls `getaddrinfo()` output ordering. If you add any `label` or `precedence` line, glibc stops using the built-in table for that category, so duplicate every entry you want to keep:

```bash
# /etc/gai.conf - Explicit RFC 6724-style configuration
cat > /etc/gai.conf << 'EOF'
# label <prefix> <label>
# Addresses in the same label group prefer each other as source/destination
label ::1/128        0
label ::/0           1
label ::ffff:0:0/96  4
label 2002::/16      2
label 2001::/32      5
label fc00::/7       13
label ::/96          3
label fec0::/10      11
label 3ffe::/16      12

# precedence <prefix> <value>
# Higher precedence = destination is tried first
precedence ::1/128       50
precedence ::/0          40
precedence ::ffff:0:0/96 35
precedence 2002::/16     30
precedence 2001::/32      5
precedence fc00::/7       3
precedence ::/96          1
precedence fec0::/10      1
precedence 3ffe::/16      1
EOF
```

## Common Policy Customizations

### Prefer IPv4 Over IPv6

```bash
# Override default: make IPv4-mapped have higher precedence than IPv6
cat > /etc/gai.conf << 'EOF'
label ::1/128        0
label ::/0           1
label ::ffff:0:0/96  4
label 2002::/16      2
label 2001::/32      5
label fc00::/7       13
label ::/96          3
label fec0::/10      11
label 3ffe::/16      12

# Prefer IPv4: higher precedence for IPv4-mapped
precedence ::1/128        50
precedence ::ffff:0:0/96  100   # was 35, now highest
precedence ::/0            40
precedence 2002::/16       30
precedence 2001::/32        5
precedence fc00::/7         3
precedence ::/96            1
precedence fec0::/10        1
precedence 3ffe::/16        1
EOF

# Verify: getaddrinfo now returns IPv4 first
python3 -c "
import socket
for r in socket.getaddrinfo('example.com', 80, type=socket.SOCK_STREAM):
    print(r[0].name, r[4][0])
"
```

### Prefer ULA for Specific Destinations

```bash
# Make connections to locally assigned ULA destinations prefer ULA source
# by giving fd00::/8 a matching custom label

# Add custom label entry (kernel table)
ip addrlabel add prefix fd00::/8 label 99

# gai.conf: also give fd00::/8 label 99
cat >> /etc/gai.conf << 'EOF'
label fd00::/8 99
EOF

# Verify ULA traffic stays on ULA path
python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('fd00::1', 80))
print('Source:', s.getsockname()[0])
"
```

### Split Traffic: IPv6 for Some Domains, IPv4 for Others

```bash
# This requires DNS split-horizon + policy table
# But you can bias globally:

# Option 1: High IPv6 precedence (default behavior)
# Option 2: Add per-prefix high precedence entries

# Prefer specific IPv6 prefix (e.g., for CDN nodes)
cat >> /etc/gai.conf << 'EOF'
# Prefer our CDN IPv6 prefix over IPv4
precedence 2001:db8:100::/48  100
EOF
```

## Managing the Kernel addrlabel Table

```bash
# Add a label entry
ip addrlabel add prefix 2001:db8::/32 label 99

# Delete an entry
ip addrlabel del prefix 2001:db8::/32

# Flush all address-label entries
ip addrlabel flush

# Flush removes the current table; re-add any labels you still need
ip addrlabel list
```

## Persistent Configuration with systemd-networkd

```bash
# /etc/systemd/network/10-eth0.network
cat > /etc/systemd/network/10-eth0.network << 'EOF'
[Match]
Name=eth0

[Network]
Address=2001:db8:1::10/64
Gateway=2001:db8:1::1
IPv6AcceptRA=yes

# Persist a custom kernel addrlabel entry
[IPv6AddressLabel]
Prefix=2001:db8::/32
Label=99
EOF

systemctl restart systemd-networkd
```

## Testing Policy Changes

```bash
#!/bin/bash
# test-policy.sh - Validate address selection after policy change

DEST_IPV6="2001:db8::1"
DEST_ULA="fd00::1"
DEST_IPV4_MAPPED="::ffff:93.184.216.34"

echo "Testing address selection:"

for dest in "${DEST_IPV6}" "${DEST_ULA}"; do
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
    echo "  Dest: ${dest} → Source: ${src}"
done

echo ""
echo "getaddrinfo order for dual-stack host:"
python3 -c "
import socket
results = socket.getaddrinfo('example.com', 80, type=socket.SOCK_STREAM)
for r in results[:3]:
    af = 'IPv6' if r[0] == socket.AF_INET6 else 'IPv4'
    print(f'  [{af}] {r[4][0]}')
"
```

## Conclusion

Linux address selection is controlled by two tables: the kernel `ip addrlabel` table (used for source selection when the application leaves the source unspecified) and `/etc/gai.conf` (used by `getaddrinfo()` for destination sorting). To prefer IPv4, increase the precedence of `::ffff:0:0/96` above `::/0`. To keep locally assigned ULA addresses on a ULA path, give `fd00::/8` a matching custom label in both the kernel addrlabel table and `/etc/gai.conf`. New processes pick up `/etc/gai.conf` changes immediately, but long-running processes usually need a restart unless `reload yes` is enabled. Use the Python socket connect trick to verify which source address the kernel selects.
