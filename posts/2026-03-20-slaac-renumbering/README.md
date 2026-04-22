# How to Renumber an IPv6 Network Using SLAAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6 Renumbering, SLAAC, IPv6, Network Management, RFC 7084

Description: Perform IPv6 network renumbering using SLAAC mechanisms - advertising new prefix, deprecating old prefix, and completing the transition without service disruption.

## Introduction

One of SLAAC's design goals is enabling network renumbering with minimal disruption. When an ISP changes your IPv6 prefix or you restructure your addressing plan, SLAAC allows you to smoothly transition all hosts from the old prefix to the new prefix by leveraging the deprecation mechanism. Hosts automatically generate addresses for new prefixes and gradually stop using deprecated old addresses.

## Renumbering Overview

```text
SLAAC Renumbering Phases:

Phase 1: Both prefixes active (parallel operation)
  Old prefix: 2001:db8:a::/64  PREFERRED (full lifetime)
  New prefix: 2001:db8:b::/64  PREFERRED (full lifetime)
  Hosts: Have both old and new addresses (both PREFERRED)
  Duration: Typically hours to days

Phase 2: Old prefix deprecated
  Old prefix: 2001:db8:a::/64  DEPRECATED (valid=remaining, preferred=0)
  New prefix: 2001:db8:b::/64  PREFERRED
  Hosts: Old address DEPRECATED, new address PREFERRED
  New connections: Use new address
  Existing connections: Continue on old address
  Duration: Until ValidLifetime from the last old-prefix RA expires

Phase 3: Old prefix withdrawn
  Old prefix: 2001:db8:a::/64  INVALID (valid lifetime expired or zero-lifetime RAs processed)
  New prefix: 2001:db8:b::/64  PREFERRED
  Hosts: Only new address
  Duration: Permanent

Total time: Depends on lifetime settings in RA
```

## Step-by-Step Renumbering Procedure

### Phase 1: Introduce New Prefix

```bash
# radvd: Add new prefix alongside existing prefix

# Edit /etc/radvd.conf to advertise BOTH prefixes:

sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 600;
    AdvDefaultLifetime 1800;

    # OLD prefix: keep full lifetime for now
    prefix 2001:db8:a::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;    # 30 days
        AdvPreferredLifetime 604800; # 7 days
    };

    # NEW prefix: full lifetime
    prefix 2001:db8:b::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;    # 30 days
        AdvPreferredLifetime 604800; # 7 days
    };
};
EOF

sudo systemctl reload radvd

# Verify hosts receive both prefixes
# On a SLAAC host:
# ip -6 addr show
# Should show addresses from both prefixes
```

### Phase 2: Deprecate Old Prefix

```bash
# After sufficient parallel operation (e.g., 24 hours),
# deprecate the old prefix by setting preferred=0

sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 60;    # Send more frequently during transition
    AdvDefaultLifetime 1800;

    # OLD prefix: DEPRECATED
    prefix 2001:db8:a::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;  # Valid for 1 day from the last old-prefix RA
        AdvPreferredLifetime 0;  # DEPRECATED immediately
    };

    # NEW prefix: full lifetime
    prefix 2001:db8:b::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

sudo systemctl reload radvd

# Verify hosts deprecated old prefix
# On a SLAAC host:
# ip -6 addr show | grep deprecated
# inet6 2001:db8:a::*/64 scope global dynamic deprecated
```

### Phase 3: Withdraw Old Prefix

```bash
# Advertise the old prefix with zero lifetimes before removing it.
# Keep this for at least the previous ValidLifetime if hosts may miss RAs.

sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1 {
    AdvSendAdvert on;
    MaxRtrAdvInterval 60;
    AdvDefaultLifetime 1800;

    # OLD prefix: WITHDRAWN
    prefix 2001:db8:a::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 0;
        AdvPreferredLifetime 0;
    };

    # NEW prefix
    prefix 2001:db8:b::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 2592000;
        AdvPreferredLifetime 604800;
    };
};
EOF

sudo systemctl reload radvd

# After the zero-lifetime RA window, remove old prefix
# from radvd.conf entirely and reload radvd again.

# Verify hosts eventually removed old prefix
# ip -6 addr show | grep "2001:db8:a"
# (Should be empty after the remaining valid lifetime reaches 0)
```

## Cisco IOS Renumbering

```text
! Phase 1: Add new prefix to RA
interface GigabitEthernet0/1
 ipv6 nd prefix 2001:db8:a::/64 2592000 604800
 ipv6 nd prefix 2001:db8:b::/64 2592000 604800

! Phase 2: Deprecate old prefix
interface GigabitEthernet0/1
 no ipv6 nd prefix 2001:db8:a::/64
 ! valid=1 day, preferred=0
 ipv6 nd prefix 2001:db8:a::/64 86400 0

! Phase 3: Withdraw old prefix
interface GigabitEthernet0/1
 no ipv6 nd prefix 2001:db8:a::/64
 ! advertise zero lifetimes for at least the previous valid lifetime if hosts may miss RAs
 ipv6 nd prefix 2001:db8:a::/64 0 0

! Verify what's being advertised
show ipv6 interface GigabitEthernet0/1 prefix
```

## Monitoring During Renumbering

```bash
# Watch address states on a host during renumbering
watch -n 30 'ip -6 addr show | grep -E "inet6|deprecated"'

# Check connection usage
ss -6 -n | head -20
# Verify existing connections are using old address
# Monitor until old-address connections close

# Check DNS records if hosts have registered addresses
# (SLAAC itself does not auto-register DNS - plan manual or dynamic updates)

# Log transitions
while true; do
    echo "$(date): $(ip -6 addr show eth0 | grep 'inet6.*global')"
    sleep 300
done > /tmp/addr_transitions.log
```

## Handling DNS During Renumbering

```text
SLAAC Renumbering Limitation: DNS is not automatic

Challenge:
  - SLAAC automatically updates addresses on hosts
  - DNS records for hosts are NOT automatically updated
  - If hosts registered their old address in DNS:
    → DNS must be manually updated or use dynamic DNS

Solutions:
  1. Use dynamic DNS (RFC 2136; DHCPv6 FQDN option in RFC 4704):
     Hosts or a DHCPv6 server update addresses in DNS
     When address changes: DNS update follows configured policy
     Requires: DDNS-capable hosts, DHCPv6 DDNS, or similar mechanism

  2. Short TTL in DNS:
     Before renumbering: set DNS TTL to 300 seconds
     After renumbering: update DNS records
     After transition: increase TTL back

  3. CNAME/service-based discovery:
     Point service names to stable canonical host names
     Update the canonical AAAA records during renumbering

  4. Accept brief DNS inconsistency:
     For internal hosts: most queries cache short TTL
     For external services: plan DNS updates carefully
```

## Conclusion

SLAAC renumbering follows a three-phase process: introduce the new prefix, deprecate the old prefix (set preferred lifetime to 0), and finally withdraw the old prefix. Hosts automatically generate addresses for new prefixes and gracefully stop using deprecated ones. The main challenge is DNS - SLAAC does not automatically update DNS records. Plan DNS updates as part of renumbering. Use short RA intervals during the transition to propagate changes quickly. The deprecation window (time from the last deprecated-prefix RA until the valid lifetime reaches 0) determines how long existing connections have before the old address is invalidated.
