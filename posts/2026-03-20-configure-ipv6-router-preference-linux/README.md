# How to Configure IPv6 Router Preference on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Router Preference, Routing, Sysctl

Description: Learn how IPv6 router preference works on Linux, how it is advertised in Router Advertisements, how the kernel uses it for route selection, and how to configure it via sysctl and static routes.

## What is IPv6 Router Preference?

IPv6 Router Advertisements (RAs) include a Default Router Preference field (RFC 4191) with values: High, Medium (default), or Low. Linux stores this on each RA-installed default route as a `pref` attribute and uses it when selecting among multiple default routers.

```text
RA from Router A: preference=high   → pref high
RA from Router B: preference=medium → pref medium (default)
RA from Router C: preference=low    → pref low
```

All RA-installed default routes share the same metric (`IP6_RT_PRIO_USER` = 1024 by default). The kernel selects the lowest-metric default route, and uses `pref` as a tiebreaker (high beats medium beats low) when metrics are equal.

## Viewing Router Preference in Routes

```bash
# Show default routes with their metrics and pref values

ip -6 route show default

# Example output:
# default via fe80::1 dev eth0 proto ra metric 1024 expires 1799sec hoplimit 64 pref high
# default via fe80::2 dev eth1 proto ra metric 1024 expires 1799sec hoplimit 64 pref medium
# default via fe80::3 dev eth2 proto ra metric 1024 expires 1799sec hoplimit 64 pref low

# Show route preference field
ip -6 route show | grep pref
```

## Router Preference and Metrics

```bash
# RA-installed default routes share the same metric (1024 by default).
# The pref field (high/medium/low) is a tiebreaker among equal-metric routes.
# To override the metric used for RA-installed routes, set the per-interface sysctl:
sysctl -w net.ipv6.conf.eth0.ra_defrtr_metric=512

# When manually adding routes, you control the metric directly.
# Higher preference (lower metric number):
ip -6 route add default via 2001:db8::1 dev eth0 metric 100

# Lower preference (higher metric number):
ip -6 route add default via 2001:db8::2 dev eth1 metric 200

# Show all default routes sorted by metric
ip -6 route show default
```

## Configuring Multiple Default Routes

```bash
# Primary and backup default routes with different preferences
ip -6 route add default via 2001:db8::gw1 dev eth0 metric 100
ip -6 route add default via 2001:db8::gw2 dev eth1 metric 200

# The kernel uses the lowest-metric route by default
# Higher-metric routes act as backup when the primary fails

# Verify
ip -6 route show default
# default via 2001:db8::gw1 dev eth0 metric 100
# default via 2001:db8::gw2 dev eth1 metric 200
```

## accept_ra_rtr_pref - Honoring RA Router Preference

```bash
# This parameter controls whether the kernel uses the preference field from RAs
cat /proc/sys/net/ipv6/conf/eth0/accept_ra_rtr_pref

# 0 = Ignore RA router preference field (treat all as medium)
# 1 = Use RA router preference field (default)

# Disable RA preference processing
sysctl -w net.ipv6.conf.eth0.accept_ra_rtr_pref=0
```

## Policy Routing with IPv6 Router Preference

```bash
# For advanced routing: use policy routing rules to select different gateways
# based on source address or other criteria

# Add a routing table for eth1 traffic
ip -6 rule add from 2001:db8:eth1::/64 table 100
ip -6 route add default via 2001:db8::gw2 dev eth1 table 100

# View rules
ip -6 rule show
```

## Persistent Route Configuration

```bash
# Ubuntu Netplan: multiple gateways with metrics
cat > /etc/netplan/00-config.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      routes:
        - to: ::/0
          via: 2001:db8::1
          metric: 100
    eth1:
      routes:
        - to: ::/0
          via: 2001:db8::2
          metric: 200
EOF
netplan apply
```

## Summary

IPv6 router preference is signaled in Router Advertisements as high/medium/low. Linux stores it as a separate `pref` attribute on each RA-installed default route (which all share the same metric, 1024 by default), and uses it as a tiebreaker when metrics are equal. Linux always picks the lowest-metric default route for outgoing packets. Control which routers are preferred by setting different metrics on static routes, by tuning `ra_defrtr_metric`, or by toggling `accept_ra_rtr_pref` to honor or ignore RA preference fields. Use multiple default routes with different metrics for primary/backup gateway configurations.
