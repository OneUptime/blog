# How to Configure IPv4 or IPv6 Preference on Dual-Stack Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPv4, Dual-Stack, Address Selection, Linux, Window, Configuration

Description: Configure whether a dual-stack system prefers IPv6 or IPv4 for outgoing connections on Linux, Windows, and macOS, with per-application and per-interface controls.

## Default Behavior: IPv6 Preferred

On stacks using the RFC 6724 default policy table, IPv6 is preferred by default. The policy table assigns:
- Global IPv6 (`::/0`): precedence 40
- IPv4-mapped (`::ffff:0:0/96`): precedence 35

Since 40 > 35, `getaddrinfo()` sorts IPv6 destinations ahead of IPv4-mapped ones when both AAAA and A records exist.

## Prefer IPv4: Linux Methods

### Method 1: Modify /etc/gai.conf on glibc-based systems (Recommended)

```bash
# /etc/gai.conf - raise IPv4 precedence above IPv6

cat > /etc/gai.conf << 'EOF'
# Labels (unchanged)
label ::1/128        0
label ::/0           1
label 2002::/16      2
label ::/96          3
label ::ffff:0:0/96  4
label 2001::/32      5
label fec0::/10      11
label 3ffe::/16      12
label fc00::/7       13

# Precedence - IPv4-mapped higher than IPv6 global
precedence ::1/128       50
precedence ::/0           40   # IPv6 global
precedence ::ffff:0:0/96 100   # IPv4: was 35, now highest
precedence 2002::/16      30
precedence 2001::/32       5
precedence fc00::/7        3
precedence ::/96           1
precedence fec0::/10       1
precedence 3ffe::/16       1
EOF

# New processes pick this up automatically.
# Long-running processes may need a restart because gai.conf reload is off by default.
```

### Method 2: Disable IPv6 per Interface

```bash
# Disable IPv6 on a specific interface
sysctl -w net.ipv6.conf.eth0.disable_ipv6=1

# Disable IPv6 globally (all interfaces)
sysctl -w net.ipv6.conf.all.disable_ipv6=1
sysctl -w net.ipv6.conf.default.disable_ipv6=1

# Persist in /etc/sysctl.d/
cat > /etc/sysctl.d/40-ipv6-disable.conf << 'EOF'
net.ipv6.conf.all.disable_ipv6 = 1
net.ipv6.conf.default.disable_ipv6 = 1
EOF
sysctl --system
```

### Method 3: Kernel addrlabel Table (Source Selection Only)

```bash
# Inspect the kernel label table
ip addrlabel list

# addrlabel affects source-address label matching only.
# It does not change destination precedence; use /etc/gai.conf for that.
```

## Prefer IPv4: Windows Methods

```powershell
# Method 1: netsh (immediate, no reboot)
netsh interface ipv6 add prefixpolicy ::ffff:0:0/96 precedence=100 label=4

# Method 2: Registry key (requires reboot)
New-ItemProperty `
    -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name DisabledComponents `
    -PropertyType DWord `
    -Value 0x20 `
    -Force
# 0x20 = prefer IPv4 in prefix policies

# Method 3: Disable IPv6 on specific NIC
Disable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6
```

## Prefer IPv4: macOS Methods

Apple does not document a Linux-style `/etc/gai.conf` mechanism for macOS. On macOS, use per-application controls such as `curl -4` / `curl -6`, or change IPv6 availability for a network service in **System Settings > Network > [service] > Details > TCP/IP**, where Apple documents `Automatically`, `Manually`, and `Link-local only` modes.

## Restore IPv6 Preference

```bash
# Linux: restore gai.conf to defaults (delete custom file)
rm /etc/gai.conf
# System uses compiled-in defaults (IPv6 preferred)

# Or restore explicitly:
cat > /etc/gai.conf << 'EOF'
label ::1/128        0
label ::/0           1
label 2002::/16      2
label ::/96          3
label ::ffff:0:0/96  4
label 2001::/32      5
label fec0::/10      11
label 3ffe::/16      12
label fc00::/7       13
precedence ::1/128        50
precedence ::/0           40
precedence ::ffff:0:0/96  35
precedence 2002::/16      30
precedence 2001::/32       5
precedence fc00::/7        3
precedence ::/96          1
precedence fec0::/10      1
precedence 3ffe::/16      1
EOF

# Windows: remove custom entry
netsh interface ipv6 delete prefixpolicy ::ffff:0:0/96

# Windows: restore DisabledComponents default (requires reboot)
reg add "HKLM\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" /v DisabledComponents /t REG_DWORD /d 0 /f
```

## Per-Application Configuration

```bash
# Applications can explicitly request IPv4 or IPv6

# Python: force IPv4
python3 -c "import socket; print(socket.getaddrinfo('example.com', 80, family=socket.AF_INET))"

# Python: force IPv6
python3 -c "import socket; print(socket.getaddrinfo('example.com', 80, family=socket.AF_INET6))"

# curl: force IPv4
curl -4 https://example.com

# curl: force IPv6
curl -6 https://example.com

# wget: force IPv4
wget --inet4-only https://example.com

# wget: force IPv6
wget --inet6-only https://example.com

# ssh: force IPv4
ssh -4 user@example.com

# ssh: force IPv6
ssh -6 user@example.com
```

## Java: java.net.preferIPv4Stack

```bash
# Force Java applications to use IPv4
java -Djava.net.preferIPv4Stack=true -jar app.jar

# Force Java to prefer IPv6 addresses
java -Djava.net.preferIPv6Addresses=true -jar app.jar
```

## Testing the Configuration

```bash
#!/bin/bash
# test-preference.sh - Verify current IP version preference

echo "Current gai.conf state:"
grep "^precedence" /etc/gai.conf 2>/dev/null | sort -k3 -rn | head -5

echo ""
echo "getaddrinfo order for example.com:"
python3 -c "
import socket
for r in socket.getaddrinfo('example.com', 80, type=socket.SOCK_STREAM)[:3]:
    af = 'IPv6' if r[0] == socket.AF_INET6 else 'IPv4'
    print(f'  [{af}] {r[4][0]}')
"

echo ""
echo "Actual outgoing connection source:"
python3 -c "
import socket
for family in [socket.AF_INET6, socket.AF_INET]:
    try:
        s = socket.socket(family, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8' if family == socket.AF_INET else '2001:4860:4860::8888', 53))
        print(f'  {\"IPv6\" if family == socket.AF_INET6 else \"IPv4\"}: {s.getsockname()[0]}')
        s.close()
    except Exception as e:
        print(f'  Error: {e}')
"
```

## Conclusion

IPv4/IPv6 preference on dual-stack systems is controlled by the address selection policy table. On glibc-based Linux systems, edit `/etc/gai.conf` to change precedence values - raise `::ffff:0:0/96` precedence above 40 to prefer IPv4, or keep it at 35 (default) to prefer IPv6. On Windows, use `netsh interface ipv6 add prefixpolicy` or `DisabledComponents=0x20` for the same effect. On macOS, Apple documents per-service IPv6 settings in Network settings rather than a Linux-style `/etc/gai.conf`. Individual applications can override with address family hints in `getaddrinfo()` calls, or command-line flags like `curl -4` / `curl -6`. Never disable IPv6 at the kernel level unless absolutely necessary - prefer policy table adjustments that keep IPv6 functional where the platform supports them.
