# How to Configure IPv6 Privacy Extensions on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Privacy Extensions, Temporary Addresses, RFC 4941

Description: Learn how macOS implements IPv6 privacy extensions, how to view temporary addresses, and how to configure privacy settings for different use cases.

## IPv6 Privacy on macOS

macOS implements two IPv6 privacy features by default:
1. **Temporary addresses** (RFC 4941): Rotating random addresses for outgoing connections
2. **Stable privacy addresses** (RFC 7217): Random but stable address per network prefix (enabled by default since macOS Sierra)

```bash
# View current IPv6 addresses to see privacy addresses

ifconfig en0 | grep inet6

# Output typically shows:
# inet6 fe80::1234:5678:9abc:def0%en0 prefixlen 64 scopeid 0x4   (link-local)
# inet6 2001:db8::a1b2:c3d4:e5f6:7890 prefixlen 64 autoconf       (stable privacy)
# inet6 2001:db8::x1x2:x3x4:x5x6:x7x8 prefixlen 64 autoconf temporary  (temporary)
```

## View Temporary Addresses

```bash
# Show all addresses including temporary
ifconfig | grep inet6

# Filter for temporary addresses
ifconfig | grep 'inet6.*temporary'

# Check address lifetimes (macOS requires the -L flag)
ifconfig -L en0 inet6
# Look for 'pltime' (preferred lifetime) and 'vltime' (valid lifetime) in seconds
```

## macOS Default Privacy Behavior

macOS by default:
- Generates a stable random address for persistent identity (used for incoming connections)
- Generates temporary rotating addresses for outgoing connections
- Rotates temporary addresses periodically

This is controlled by the `ip6_prefer_tempaddr` sysctl:

```bash
# Check if temporary addresses are preferred for outgoing connections
sysctl net.inet6.ip6.prefer_tempaddr

# 0 = Don't prefer temporary (use stable address for outgoing)
# 1 = Prefer temporary addresses for outgoing (default on macOS)

# Change temporarily (not persistent)
sudo sysctl -w net.inet6.ip6.prefer_tempaddr=0
```

## Making Privacy Settings Persistent

Modern macOS (10.15+) does not load `/etc/sysctl.conf` at boot, so persistent
sysctl values must be applied via a LaunchDaemon that runs at startup:

```bash
# Create a LaunchDaemon that applies sysctl values at boot
sudo tee /Library/LaunchDaemons/com.local.ipv6-privacy.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.local.ipv6-privacy</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/sbin/sysctl</string>
    <string>net.inet6.ip6.prefer_tempaddr=1</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOF

# Load the daemon (also runs once now)
sudo launchctl load /Library/LaunchDaemons/com.local.ipv6-privacy.plist
```

## Disable Temporary Addresses (for servers)

```bash
# View current temporary address generation
sysctl net.inet6.ip6.use_tempaddr

# 0 = Don't generate temporary addresses
# 1 = Generate temporary addresses (default)

# Disable temporary address generation
sudo sysctl -w net.inet6.ip6.use_tempaddr=0

# Persistent disable: add both keys to a LaunchDaemon plist (see previous
# section), with one <string> entry per sysctl value:
#   net.inet6.ip6.use_tempaddr=0
#   net.inet6.ip6.prefer_tempaddr=0
```

## Checking Source Address Used for Outgoing Connections

```bash
# See which IPv6 address is used for a connection to Google DNS
# (requires a connection attempt)
nc -6 -v 2001:4860:4860::8888 443 2>&1 | head -3

# Or check via route
route -n get -inet6 2001:4860:4860::8888

# curl shows source address
curl -6 -v https://ipv6.google.com 2>&1 | grep "Connected\|IPv6"
```

## macOS vs Linux IPv6 Privacy Comparison

| Feature | macOS | Linux |
|---------|-------|-------|
| Temp addresses | Default: enabled | Configurable (use_tempaddr) |
| Stable privacy | Default: enabled (RFC 7217) | Configurable (addr_gen_mode=1) |
| Prefer temp | Default: yes | Configurable (use_tempaddr=2) |
| sysctl key | `net.inet6.ip6.use_tempaddr` | `net.ipv6.conf.all.use_tempaddr` |

## Summary

macOS enables IPv6 privacy extensions by default, generating both stable privacy addresses (for incoming) and temporary rotating addresses (for outgoing). View them with `ifconfig | grep inet6`. Control via `sysctl net.inet6.ip6.use_tempaddr` (generate) and `net.inet6.ip6.prefer_tempaddr` (prefer temporary for outgoing). Disable on servers with `sudo sysctl -w net.inet6.ip6.use_tempaddr=0`. Persist changes via a LaunchDaemon plist in `/Library/LaunchDaemons/`.
