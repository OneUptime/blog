# How to Configure IPv6 Privacy Extensions on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy Extensions, Linux, SLAAC, Sysctl, NetworkManager

Description: A guide to enabling and configuring IPv6 privacy extensions (RFC 8981) on Linux to use temporary random interface IDs for outbound connections, protecting user privacy.

IPv6 privacy extensions (RFC 8981, formerly RFC 4941) generate temporary, randomly generated interface IDs that expire periodically. This makes it harder to track a device across networks or over time based solely on its IPv6 address. This guide covers enabling privacy extensions via sysctl, NetworkManager, and systemd-networkd.

## sysctl Configuration

```bash
# Check current privacy extension settings

sysctl net.ipv6.conf.all.use_tempaddr
sysctl net.ipv6.conf.eth0.use_tempaddr

# Enable privacy extensions globally
# Set to 2 to prefer temporary addresses for outbound connections
sysctl -w net.ipv6.conf.all.use_tempaddr=2
sysctl -w net.ipv6.conf.default.use_tempaddr=2

# Make permanent
cat > /etc/sysctl.d/99-ipv6-privacy.conf << 'EOF'
# Enable IPv6 privacy extensions
# 0 = disabled
# 1 = generate temporary, prefer permanent
# 2 = generate temporary, prefer temporary (recommended for clients)
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Temporary address lifetime settings
# How long temporary address is preferred (seconds)
net.ipv6.conf.all.temp_prefered_lft = 86400    # 24 hours
net.ipv6.conf.default.temp_prefered_lft = 86400

# How long temporary address remains valid
net.ipv6.conf.all.temp_valid_lft = 604800      # 7 days
net.ipv6.conf.default.temp_valid_lft = 604800
EOF

sysctl --system
```

## Verifying Privacy Extensions

```bash
# Check assigned addresses after enabling privacy extensions
ip -6 addr show eth0

# Expected output (two global addresses):
# inet6 2001:db8:x:x:a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic
#   valid_lft 604794sec preferred_lft 86394sec
# inet6 2001:db8:x:x:aabb:ccff:fedd:eeff/64 scope global dynamic mngtmpaddr
#   valid_lft 2591990sec preferred_lft 604790sec

# Confirm outbound connections use the temporary address
curl -6 https://ipv6.icanhazip.com
# Should return the temporary address (a1b2:c3d4:e5f6:7890 in this example)
```

## NetworkManager Configuration

```bash
# Check current NetworkManager IPv6 method
nmcli connection show "Wired connection 1" | grep ipv6

# Enable privacy extensions via nmcli
nmcli connection modify "Wired connection 1" \
  ipv6.ip6-privacy 2

# Or set globally in NetworkManager.conf
cat > /etc/NetworkManager/conf.d/ipv6-privacy.conf << 'EOF'
[connection]
# 0=disabled, 1=enabled (prefer permanent), 2=enabled (prefer temp)
ipv6.ip6-privacy=2
EOF

# Restart NetworkManager to apply
systemctl restart NetworkManager

# Verify
nmcli connection show "Wired connection 1" | grep ip6-privacy
```

## systemd-networkd Configuration

```ini
# /etc/systemd/network/20-wired.network

[Match]
Name=eth0

[Network]
DHCP=yes
IPv6AcceptRA=yes
IPv6PrivacyExtensions=yes

[IPv6AcceptRA]
UseAutonomousPrefix=yes

# Optional: use RFC 7217 for the stable SLAAC address instead of EUI-64
Token=prefixstable
```

```bash
# Apply networkd config
systemctl restart systemd-networkd

# Verify
ip -6 addr show dev eth0
```

## Address Lifetime Tuning

```bash
# View current temporary address lifetime parameters
sysctl -a | grep "temp.*lft\|use_tempaddr" | grep -v "lo\|veth\|docker"

# Shorten the preferred lifetime for more frequent rotation
# (rotate addresses every 6 hours instead of 24)
cat > /etc/sysctl.d/99-ipv6-privacy-tuned.conf << 'EOF'
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
net.ipv6.conf.all.temp_prefered_lft = 21600     # 6 hours preferred
net.ipv6.conf.default.temp_prefered_lft = 21600
net.ipv6.conf.all.temp_valid_lft = 86400        # 24 hours valid
net.ipv6.conf.default.temp_valid_lft = 86400
EOF

sysctl --system

# After applying, regenerate addresses
ip -6 addr flush dev eth0 dynamic
# The addresses are recreated after the next Router Advertisement
# or after reconnecting/reconfiguring the interface
```

## Checking Which Address Is Used

```bash
# Show the source address selection for a destination
ip -6 route get 2001:4860:4860::8888

# Output includes src field showing which address is used:
# 2001:4860:4860::8888 from :: via fe80::1 dev eth0 src 2001:db8::TEMP proto ra metric 100

# Verify in a real connection and print the local source address curl chose
curl -6 --write-out 'source=%{local_ip}\n' https://ipv6.icanhazip.com -o /dev/null -s
# The reported source address should match the temporary address

# Use ss to see connections and their source addresses
ss -6 -t | grep ESTAB
```

## Per-Interface Configuration

```bash
# Enable on all interfaces but disable for specific ones (e.g., server interfaces)
cat > /etc/sysctl.d/99-ipv6-privacy.conf << 'EOF'
# Global defaults
net.ipv6.conf.default.use_tempaddr = 2
net.ipv6.conf.all.use_tempaddr = 2

# Disable on server-facing interface (needs stable address for DNS/services)
net.ipv6.conf.eth1.use_tempaddr = 0
EOF

sysctl --system
```

IPv6 privacy extensions on Linux are straightforward to enable via sysctl. Set `use_tempaddr = 2` globally so temporary addresses are preferred for all outbound connections. For desktop and laptop systems, also configure NetworkManager or systemd-networkd to ensure the setting persists correctly through network reconnections and interface resets.
