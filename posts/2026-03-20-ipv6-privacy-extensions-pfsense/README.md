# How to Configure IPv6 Privacy Extensions on pfSense

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, pfSense, Privacy, RFC4941, Firewall, Networking

Description: Configure IPv6 privacy extensions on pfSense to generate temporary addresses for WAN interfaces and prevent persistent device tracking through stable EUI-64 identifiers.

## Introduction

pfSense is a widely used open-source firewall and router platform based on FreeBSD. Enabling IPv6 privacy extensions on pfSense adds temporary IPv6 addresses for autoconfigured WAN interfaces so the firewall does not have to use the same long-lived SLAAC address for all outbound connections.

## Understanding FreeBSD IPv6 Privacy Extensions

pfSense is built on FreeBSD, which uses `net.inet6.ip6.use_tempaddr` and related sysctls to control IPv6 address generation. Unlike Linux, the settings differ slightly:

| FreeBSD sysctl | Purpose |
|---|---|
| `net.inet6.ip6.use_tempaddr` | Enable temporary address generation for autoconfigured addresses |
| `net.inet6.ip6.prefer_tempaddr` | Prefer temporary addresses for source address selection |
| `net.inet6.ip6.temppltime` | Preferred lifetime for temporary addresses |
| `net.inet6.ip6.tempvltime` | Maximum valid lifetime for temporary addresses |

## Enabling Privacy Extensions via pfSense GUI

Current pfSense documentation does not describe a dedicated per-interface **Use Temporary Addresses** or **Use Privacy Extensions** checkbox for WAN IPv6 settings. The documented GUI method is to add the relevant FreeBSD sysctls under **System > Advanced > System Tunables**, as shown below.

## Enabling via the Console or SSH

For more granular control, connect via SSH or the console:

```sh
# Check current temporary address setting

sysctl net.inet6.ip6.use_tempaddr
# 0 = disabled, 1 = enabled

# Enable temporary addresses
sysctl net.inet6.ip6.use_tempaddr=1

# Prefer temporary over permanent addresses
sysctl net.inet6.ip6.prefer_tempaddr=1

# Set preferred lifetime to 24 hours (86400 seconds)
sysctl net.inet6.ip6.temppltime=86400

# Set maximum lifetime to 7 days
sysctl net.inet6.ip6.tempvltime=604800
```

## Making Settings Persistent via System Tunables

To persist these settings across reboots in pfSense:

1. Navigate to **System > Advanced > System Tunables**
2. Click **+ New** and add each sysctl:

| Tunable | Value | Description |
|---|---|---|
| `net.inet6.ip6.use_tempaddr` | `1` | Enable privacy extensions |
| `net.inet6.ip6.prefer_tempaddr` | `1` | Prefer temporary addresses |
| `net.inet6.ip6.temppltime` | `86400` | Preferred lifetime (24h) |
| `net.inet6.ip6.tempvltime` | `604800` | Maximum valid lifetime (7d) |

3. Click **Save** after adding each entry

## Verifying via Console

After applying settings, check the WAN interface for a temporary address:

```sh
# Show IPv6 addresses on the WAN interface (typically em0 or igb0)
ifconfig em0 inet6

# Look for 'temporary' keyword in the output
# Example:
# inet6 2001:db8::a3b2:c4d5:e6f7:8901 prefixlen 64 autoconf temporary
```

## Checking the Preferred Outbound Address

On pfSense, verify which IPv6 address is used for outbound connections:

```sh
# Test which source address is selected for outbound traffic
curl -6 https://ifconfig.me

# Or use fetch (FreeBSD's built-in HTTP tool)
fetch -6 -qo - https://ifconfig.me
```

With `net.inet6.ip6.prefer_tempaddr=1`, the returned address should typically be the temporary address rather than the stable autoconfigured address.

## Important Notes for pfSense

- Privacy extensions on pfSense apply to the **firewall itself**, not to LAN clients (who manage their own privacy settings)
- If you are using **static IPv6 addressing** on WAN, privacy extensions do not apply - they affect SLAAC/autoconfigured addresses. On a DHCPv6 WAN, they only matter if the interface also forms a SLAAC address from router advertisements
- After enabling, existing SLAAC addresses may not immediately change; on DHCPv6 WANs, use **Status > Interfaces** to release/renew the lease, or otherwise reconfigure the interface so it can generate a fresh temporary address

## Conclusion

Enabling IPv6 privacy extensions on pfSense is straightforward through FreeBSD sysctl settings, typically persisted with the System Tunables panel. Once enabled, autoconfigured WAN interfaces can generate temporary, rotating IPv6 addresses and, with `net.inet6.ip6.prefer_tempaddr=1`, the firewall will prefer them for new outbound connections. This reduces long-term address-based correlation for traffic from the firewall itself, but it does not make the firewall untrackable.
