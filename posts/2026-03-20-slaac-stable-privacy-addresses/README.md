# How to Understand Stable Privacy Addresses (RFC 7217)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Stable Privacy, SLAAC, IPv6, RFC 7217, Interface Identifier, Privacy

Description: Understand how RFC 7217 stable privacy addresses generate a unique but stable interface identifier per network, providing privacy without the address instability of random temporary addresses.

## Introduction

RFC 7217 "Stable and Opaque IIDs with IPv6 SLAAC" defines an algorithm for generating interface identifiers that are stable for the same interface and SLAAC prefix within a subnet (the same address is used when those inputs stay the same) but different when the prefix changes, and also across networks when the optional Network_ID differs (for example, different SSIDs). Unlike EUI-64 (stable but trackable across networks) and temporary privacy extensions (rotating over time), RFC 7217 addresses are pseudo-random but deterministic for the same inputs, combining the benefits of both approaches.

## Comparison of Interface Identifier Methods

```text
Interface Identifier Method Comparison:

Method              | Stable per prefix/network | Privacy (no MAC) | Changes over time
EUI-64 (MAC-based)  | Yes (global IID)   | No               | No, while MAC unchanged
Privacy Ext (RFC 8981)| No (rotates over time)| Yes        | Yes (about daily by default)
Stable Privacy (RFC 7217)| Yes (per-prefix/network inputs) | Yes | When prefix/network inputs or secret change

EUI-64:
  Same IID on all networks: 0211:22ff:fe33:4455
  MAC is visible in address: traceable across networks
  IID persists while hardware/config stays the same: persistent identity

Privacy Extensions:
  Temporary IID changes over time: hard to track over time
  Deprecated addresses can continue existing connections, but are not used for new connections
  Not suitable as the sole address for servers or stable applications

RFC 7217 Stable Privacy:
  IID = hash(prefix + network_id + interface + secret_key + DAD_counter)
  Same prefix/network inputs: same address (stable addressing)
  Different prefix or Network_ID: different address (privacy)
  Never reveals MAC address
  Does not change unless prefix/network inputs, secret, or DAD counter change
```

## RFC 7217 Algorithm

```text
Stable Privacy IID Generation:

IID = F(Prefix, Net_Iface, Network_ID, DAD_Counter, secret_key)

Where F is a pseudorandom function, often implemented with a cryptographic hash (e.g., SHA-256)

Parameters:
  Prefix:       SLAAC prefix from RA (e.g., 2001:db8::/64), or the link-local IPv6 unicast prefix
  Net_Iface:    Stable interface identifier (e.g., interface name, stable interface index, or UUID)
  Network_ID:   Optional network identifier (e.g., SSID for Wi-Fi, or empty)
  DAD_Counter:  Starts at 0, incremented if DAD detects collision
  secret_key:   Host-specific random key (generated once, stored)

Properties:
  1. Deterministic: same inputs → same IID
  2. Stable: same prefix/subnet inputs → same IID across reboots
  3. Private: different prefixes or Network_ID values → different IIDs
  4. No MAC: IID does not reveal MAC address
  5. Collision-resistant: DAD_Counter handles collisions

Example outputs (same host/interface, different prefixes):
  Home network (2001:db8:a::/64):   2001:db8:a::9c23:5f1a:b2e4:7d30
  Work network (2001:db8:b::/64):   2001:db8:b::3f91:28ac:e654:102b
  Coffee shop (2001:db8:c::/64):    2001:db8:c::7b4e:91f2:3a58:cd67

Addresses look random but:
  Next reboot at home:  2001:db8:a::9c23:5f1a:b2e4:7d30 (same!)
  Next reboot at work:  2001:db8:b::3f91:28ac:e654:102b (same!)
```

## RFC 7217 on Linux (systemd-networkd)

Linux supports RFC 7217 stable privacy addresses through the kernel `stable_secret` and `addr_gen_mode` settings; systemd-networkd supports them with `Token=prefixstable`.

```bash
# Check kernel version if you need to confirm support on an older system
uname -r

# With systemd-networkd: configure in .network file
# /etc/systemd/network/10-eth0.network
cat /etc/systemd/network/10-eth0.network
# [Match]
# Name=eth0
#
# [Network]
# DHCP=no
# IPv6AcceptRA=yes
# IPv6PrivacyExtensions=kernel   # temporary-address policy only
#
# [IPv6AcceptRA]
# Token=prefixstable             # RFC 7217 stable IID for SLAAC prefixes

# For kernel-managed SLAAC or link-local address generation:
# sysctl: net.ipv6.conf.eth0.addr_gen_mode

# Check current addr_gen_mode
cat /proc/sys/net/ipv6/conf/eth0/addr_gen_mode
# 0 = EUI-64
# 1 = no link-local address; EUI-64 for autoconf addresses
# 2 = stable privacy using stable_secret (RFC 7217)
# 3 = stable privacy using a random secret if stable_secret is unset

# Configure the stable secret (random key)
# This key is used in the hash function
sudo sysctl -w net.ipv6.conf.eth0.stable_secret=fd00::e3a7:b234:9f12:8c56
# The secret should be a random IPv6 address (used as key material)

# Set to stable-secret mode (RFC 7217)
sudo sysctl -w net.ipv6.conf.eth0.addr_gen_mode=2
# Or use addr_gen_mode=3 to let the kernel create a random secret if unset

# Generate a random secret
python3 -c "import secrets; print('fd00::' + ':'.join(
    f'{secrets.randbelow(65536):04x}' for _ in range(4)))"
```

## RFC 7217 on Linux with iproute2

```bash
# View current stable secret
cat /proc/sys/net/ipv6/conf/eth0/stable_secret
# fd00::e3a7:b234:9f12:8c56  (if configured)
# cat: can't open: Permission denied  (if not set)

# Set stable secret via sysctl
sudo sysctl -w net.ipv6.conf.eth0.stable_secret=fd12:3456:789a:bcde:f012:3456:789a:bcde

# Set addr generation mode to stable_secret
sudo ip link set dev eth0 addrgenmode stable_secret
# Equivalent sysctl value: net.ipv6.conf.eth0.addr_gen_mode=2

# Persist configuration
sudo tee /etc/sysctl.d/60-ipv6-stable-privacy.conf >/dev/null << 'EOF'
net.ipv6.conf.eth0.addr_gen_mode = 2
net.ipv6.conf.eth0.stable_secret = fd00::e3a7:b234:9f12:8c56
EOF

# Verify new stable privacy address was generated
# (bring interface down and up to regenerate)
sudo ip link set eth0 down
sudo ip link set eth0 up
ip -6 addr show eth0 | grep "scope global"
# inet6 2001:db8::9c23:5f1a:b2e4:7d30/64 scope global dynamic
#    valid_lft ...
# Note: no "ff:fe" in the address = not EUI-64
# Note: stable across reboots for the same prefix/network inputs
```

## RFC 7217 vs Privacy Extensions

```text
Choosing Between RFC 7217 and RFC 8981:

RFC 7217 Stable Privacy:
  Use when:
  - Stability matters (DNS records, firewall rules with host addresses)
  - Rebooting should give the same address
  - Privacy from cross-network tracking is required
  - Applications benefit from a stable source address across reboots or reconnects

  Best for: Laptops, workstations, servers that roam between networks

RFC 8981 Privacy Extensions:
  Use when:
  - Maximum privacy is required
  - Address stability is not important
  - Short-lived connections only
  - Preventing address reuse over time is critical

  Best for: Mobile devices, anonymous browsing, temporary connections

Combined deployment (some systems use both):
  - RFC 7217 as the "public" stable address
  - RFC 8981 temporary addresses for outbound connections
  - Incoming connections (servers) use stable address
  - Outbound connections (browsing) use temporary address
```

## Conclusion

RFC 7217 stable privacy addresses provide a middle ground between EUI-64 (stable but trackable) and privacy extensions (private but rotating). The interface identifier is generated from the network prefix, interface identifier, optional Network_ID, DAD counter, and a per-host secret key, producing a stable pseudo-random address that is the same when the same prefix/subnet inputs are used but different when the prefix or Network_ID changes. This provides both stable addressing and privacy across networks. On Linux, configure with `addr_gen_mode=2` and a `stable_secret`, or use `addr_gen_mode=3` to let the kernel generate a random secret if one is unset. RFC 8064 recommends RFC 7217 as the default scheme for stable SLAAC addresses, and many modern operating systems or network managers use RFC 7217 or similar algorithms by default.
