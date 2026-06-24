# How to Configure IPv6 Privacy Extensions (RFC 8981)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Privacy Extensions, SLAAC, IPv6, Temporary Addresses, RFC 8981

Description: Configure IPv6 Privacy Extensions to generate random temporary addresses for SLAAC, preventing device tracking by hiding the MAC address from the IPv6 address.

## Introduction

IPv6 Privacy Extensions (RFC 8981, formerly RFC 4941) generate randomized, temporary interface identifiers for SLAAC addresses instead of relying only on a long-lived stable address, which might be MAC-based EUI-64 or a stable privacy address. Temporary addresses change periodically, making it harder to track a device across time or correlate its activity. Modern operating systems including Windows, macOS, iOS, and Android usually enable privacy extensions by default. Linux kernel and distribution defaults vary, so check and configure explicitly when needed.

## How Privacy Extensions Work

```text
Privacy Extensions Address Generation:

MAC-derived SLAAC (EUI-64):
  MAC:     00:11:22:33:44:55
  IID:     0211:22ff:fe33:4455 (stable, linked to hardware)
  Address: 2001:db8::211:22ff:fe33:4455 (permanent, trackable)

Privacy Extensions:
  IID:     [random 64-bit value] (e.g., a3f2:1b8c:9d4e:7f05)
  Address: 2001:db8::a3f2:1b8c:9d4e:7f05 (temporary)

Temporary address lifecycle:
  Generated when: prefix received from RA
  Preferred for: TEMP_PREFERRED_LIFETIME (default: 86400 sec = 1 day)
  Valid for:     TEMP_VALID_LIFETIME (default: 172800 sec = 2 days)
  New address generated: before preferred lifetime expires
  Old address becomes deprecated after preferred expires and remains valid until VALID expires

Both addresses exist simultaneously:
  Public (EUI-64 or stable):  2001:db8::211:22ff:fe33:4455 (permanent)
  Temporary (privacy):         2001:db8::a3f2:1b8c:9d4e:7f05 (1 day preferred)
  New connections use temporary address by default when temporary addresses are preferred
```

## Enabling Privacy Extensions on Linux

```bash
# Check current status

cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
# 0 = disabled (use stable/public SLAAC address only)
# 1 = generate temporary, but prefer permanent
# 2 = generate temporary, prefer temporary (recommended)

# Enable privacy extensions (prefer temporary addresses)
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# Enable for all interfaces
sudo sysctl -w net.ipv6.conf.all.use_tempaddr=2
sudo sysctl -w net.ipv6.conf.default.use_tempaddr=2

# Persist across reboots
echo "net.ipv6.conf.all.use_tempaddr = 2" | \
    sudo tee /etc/sysctl.d/60-ipv6-privacy.conf
echo "net.ipv6.conf.default.use_tempaddr = 2" | \
    sudo tee -a /etc/sysctl.d/60-ipv6-privacy.conf
sudo sysctl -p /etc/sysctl.d/60-ipv6-privacy.conf

# Verify addresses after enabling
ip -6 addr show eth0
# Should show:
# inet6 2001:db8::a3f2:1b8c:9d4e:7f05/64 scope global temporary dynamic
#    valid_lft 172700sec preferred_lft 86300sec   ← temporary
# inet6 2001:db8::211:22ff:fe33:4455/64 scope global dynamic
#    valid_lft 2591900sec preferred_lft 604800sec  ← stable/public
# inet6 fe80::211:22ff:fe33:4455/64 scope link
```

## Configuring Temporary Address Lifetimes

```bash
# Set preferred lifetime for temporary addresses
# Default: 86400 seconds (1 day)
sudo sysctl -w net.ipv6.conf.eth0.temp_prefered_lft=43200  # 12 hours

# Set valid lifetime for temporary addresses
# Default: 172800 seconds (2 days)
sudo sysctl -w net.ipv6.conf.eth0.temp_valid_lft=86400  # 1 day

# Maximum number of autoconfigured addresses per interface
# Default: 16
sudo sysctl -w net.ipv6.conf.eth0.max_addresses=8

# Force generation of new temporary address immediately
# (Remove all dynamic addresses and let SLAAC regenerate)
sudo ip -6 addr flush dev eth0 dynamic
# Or: sudo ip -6 addr flush dev eth0 temporary

# Re-trigger SLAAC (send RS to get new RA)
sudo rdisc6 eth0  # requires ndisc6 package
# Alternatively: bring interface down and back up
# sudo ip link set eth0 down && sudo ip link set eth0 up
```

## NetworkManager Configuration

On systems using NetworkManager, privacy extensions are configured per-connection.

```bash
# Show current IPv6 privacy setting for a connection
nmcli connection show "Wired connection 1" | grep ipv6.ip6-privacy
# ipv6.ip6-privacy:                       -1 (kernel default)

# Set privacy extensions for a connection
nmcli connection modify "Wired connection 1" ipv6.ip6-privacy 2
nmcli connection up "Wired connection 1"

# Privacy values:
# -1 = use kernel default (sysctl)
#  0 = disabled
#  1 = enabled but prefer public (permanent)
#  2 = enabled and prefer temporary (privacy mode)

# For systemd-networkd: configure in the [Network] section of a .network file
# /etc/systemd/network/eth0.network
# [Match]
# Name=eth0
# [Network]
# IPv6PrivacyExtensions=yes
```

## Privacy Extensions on Other Systems

```bash
Windows:
  Default: Enabled (use_tempaddr=2 equivalent)
  Check: netsh interface ipv6 show privacy
  Enable: netsh interface ipv6 set privacy state=enabled

macOS:
  Default: Enabled
  Check: sysctl net.inet6.ip6.use_tempaddr net.inet6.ip6.prefer_tempaddr
  Enable: sudo sysctl -w net.inet6.ip6.use_tempaddr=1
          sudo sysctl -w net.inet6.ip6.prefer_tempaddr=1

Android/iOS:
  Privacy extensions enabled by default
  Cannot easily disable without root/jailbreak

Routers (Cisco/Juniper):
  Privacy extensions NOT recommended for router interfaces
  Router interfaces should use stable, predictable addresses
  Configure stable/static addresses instead of temporary autoconfig addresses
```

## Verifying Source Address Selection

With privacy extensions enabled, new connections should use the temporary address.

```bash
# Check which address is used for outbound connections
curl -v https://ipv6.google.com 2>&1 | grep "Connected to"
# Connected to ipv6.google.com (2607:f8b0:4004::...) port 443

# Check source address used
ss -6 -n | grep ":443"
# tcp  ESTAB  0   0   [2001:db8::a3f2:1b8c:9d4e:7f05]:54321  [2607:f8b0:...]

# The temporary address (a3f2:...) should be the source,
# not the stable/public address (211:22ff:fe33:4455)

# Test source address selection for a destination
ip -6 route get 2607:f8b0:4004::200e
# 2607:f8b0:4004::200e from :: dev eth0 src 2001:db8::a3f2:1b8c:9d4e:7f05

# Inspect the address label policy used by RFC 6724 source address selection
ip addrlabel list
# Rule 7: prefer temporary addresses over public addresses when configured to do so
```

## Conclusion

IPv6 Privacy Extensions generate randomized temporary interface identifiers for SLAAC addresses, avoiding long-lived identifiers such as EUI-64 MAC-derived IIDs for outbound client traffic. Temporary addresses change periodically, preventing long-term tracking. On Linux, enable with `net.ipv6.conf.all.use_tempaddr=2`. The system can maintain both a stable/public address and temporary address; new outbound connections use the temporary address by default when temporary addresses are preferred. For servers and router interfaces, keep stable permanent addresses; for client devices, enable privacy extensions to protect user privacy.
