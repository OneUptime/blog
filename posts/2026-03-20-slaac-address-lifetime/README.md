# How to Understand SLAAC Address Lifetimes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, Address Lifetime, IPv6, Valid Lifetime, Preferred Lifetime, RFC 4862

Description: Understand IPv6 SLAAC address lifetimes including Valid Lifetime, Preferred Lifetime, DEPRECATED state, and how lifetimes affect address selection and renumbering.

## Introduction

SLAAC addresses have two lifetimes controlled by the Prefix Information option in Router Advertisements: Valid Lifetime and Preferred Lifetime. The Preferred Lifetime determines when an address transitions from PREFERRED to DEPRECATED state. The Valid Lifetime determines when the address is removed entirely. Understanding these lifetimes is essential for IPv6 network renumbering, address stability planning, and troubleshooting connectivity issues.

## Two-Timer Model

```text
SLAAC Address Lifetime States:

Timeline:
  T=0       T=PreferredLifetime    T=ValidLifetime
  |_________________|_______________________|
  |    PREFERRED    |      DEPRECATED        |  (after valid: INVALID)

PREFERRED state (0 to PreferredLifetime):
  - Address is fully usable
  - Eligible and normally preferred as source address for new connections
  - Normal operation

DEPRECATED state (PreferredLifetime to ValidLifetime):
  - Address is still valid (can receive traffic)
  - Existing connections continue to work
  - Avoided as source for new connections when a suitable PREFERRED address exists
  - New connections prefer newer PREFERRED addresses

INVALID state (after ValidLifetime):
  - Address is removed from interface
  - No traffic can use this address
  - Existing connections using it fail or time out

Typical defaults from RFC 4861:
  PreferredLifetime: 604800 seconds (7 days)
  ValidLifetime:     2592000 seconds (30 days)
  Deprecated window: 30 days - 7 days = 23 days
```

## Viewing Address Lifetimes

```bash
# Linux: show IPv6 addresses with lifetimes

ip -6 addr show eth0

# Example output:
# inet6 2001:db8::211:22ff:fe33:4455/64 scope global dynamic
#    valid_lft 2591894sec preferred_lft 604694sec
#                         ^^^^^^^^^^^^^^^^^^^^^^^^
#                         preferred_lft = 604694 seconds ≈ 7 days remaining
# valid_lft = 2591894 seconds ≈ 30 days remaining

# Show deprecated addresses (preferred_lft = 0 but valid_lft > 0)
ip -6 addr show | grep "preferred_lft 0"
# inet6 2001:db8::old:addr/64 scope global dynamic
#    valid_lft 86400sec preferred_lft 0sec   ← DEPRECATED

# Show lifetime in hours/days format (custom)
ip -6 addr show eth0 | awk '
/valid_lft/ {
    split($2, v, "sec")
    split($4, p, "sec")
    printf "  Valid: %.1f days  Preferred: %.1f days\n",
           v[1]/86400, p[1]/86400
}'
```

## Lifetime Updates from RA

The host stack processes address lifetimes when an RA is received. The preferred lifetime is reset from a matching Prefix Information option; the valid lifetime follows RFC 4862's safeguards.

```text
RA Lifetime Update Rules for an existing SLAAC address
(RFC 4862 Section 5.5.3):

Before applying a Prefix Information option:
  - Ignore it if PreferredLifetime > ValidLifetime
  - Always reset Preferred lifetime to received PreferredLifetime

Case 1: Received ValidLifetime > 2 hours OR
        Received ValidLifetime > remaining ValidLifetime:
  → Set remaining ValidLifetime to received ValidLifetime

Case 2: Remaining ValidLifetime <= 2 hours:
  → Ignore received ValidLifetime for unauthenticated RA
  → If the RA is authenticated (for example with SEND),
    use received ValidLifetime

Case 3: Received ValidLifetime <= 2 hours AND
        Received ValidLifetime < remaining ValidLifetime AND
        remaining ValidLifetime > 2 hours:
  → Set remaining ValidLifetime to 2 hours (floor protection)
  → This prevents attack: sending RA with a very small ValidLifetime

ValidLifetime = 0:
  → Used to withdraw a prefix, but unauthenticated RAs cannot
    immediately reduce an existing address below the 2-hour floor
  → PreferredLifetime must also be 0, otherwise the PIO is ignored
  → Address is deprecated immediately because PreferredLifetime resets to 0
  → Address is removed when its remaining ValidLifetime expires

Why 2-hour floor?
  Prevents a rogue RA from setting lifetime to 0 and
  immediately invalidating existing addresses (DoS attack)
```

## Address Lifetime on Different Systems

```text
# Linux
ip -6 addr show eth0 | grep "valid_lft"

# macOS
ifconfig en0 inet6
# Shows IPv6 addresses and address state flags such as autoconf/deprecated.
# Prefix lifetime details are in the Neighbor Discovery prefix list:
ndp -p
# Look for vltime (valid lifetime), pltime (preferred lifetime), and expire.

# Windows
Get-NetIPAddress -AddressFamily IPv6 -PrefixOrigin RouterAdvertisement |
    Select-Object IPAddress, ValidLifetime, PreferredLifetime
# ValidLifetime and PreferredLifetime are TimeSpan values.
# Infinite is [TimeSpan]::MaxValue.
```

## Configuring Lifetimes on the Router (radvd)

```bash
# Set custom lifetimes in radvd
cat /etc/radvd.conf
# interface eth1 {
#     AdvSendAdvert on;
#
#     prefix 2001:db8::/64 {
#         AdvOnLink on;
#         AdvAutonomous on;
#
#         # Valid Lifetime: 30 days (2592000 seconds)
#         AdvValidLifetime 2592000;
#
#         # Preferred Lifetime: 7 days (604800 seconds)
#         # Must be <= AdvValidLifetime
#         AdvPreferredLifetime 604800;
#     };
# };

# For infinite lifetime:
# AdvValidLifetime infinity;
# AdvPreferredLifetime infinity;

# For short lifetime (easier renumbering):
# AdvValidLifetime 3600;      # 1 hour
# AdvPreferredLifetime 1800;  # 30 minutes
```

## Using Lifetimes for Network Renumbering

```text
Renumbering Procedure using SLAAC Lifetimes:

Phase 1: Prepare (announce new prefix)
  - Router begins advertising new prefix 2001:db8:new::/64
  - Keep advertising old prefix 2001:db8:old::/64
  - Hosts now have both addresses (old=PREFERRED, new=PREFERRED)
  - New connections may use either

Phase 2: Deprecate old prefix
  - Set old prefix PreferredLifetime = 0 in RA
  - Old address transitions to DEPRECATED
  - New connections prefer new address
  - Existing connections using old address still work

Phase 3: Withdraw old prefix
  - Advertise old prefix with PreferredLifetime = 0 and ValidLifetime = 0
  - Hosts that receive the withdrawal may keep old addresses valid for up to 2 hours because of RFC 4862 floor protection
  - Keep advertising the withdrawal until the latest possible remaining valid lifetime has passed
  - Old address becomes INVALID when each host's ValidLifetime expires
  - Router stops advertising old prefix after the withdrawal period

Phase 4: Complete
  - Only new prefix 2001:db8:new::/64 active
  - Renumbering complete with no connectivity loss

Note: This process can take days (default lifetimes)
For faster renumbering: use shorter ValidLifetime from start
```

## Conclusion

SLAAC address lifetimes control the transition from PREFERRED to DEPRECATED to INVALID states. The Preferred Lifetime determines when an address stops being preferred for new connections. The Valid Lifetime determines when the address is completely removed. The host stack's 2-hour floor protection prevents unauthenticated rogue RAs from immediately invalidating existing SLAAC addresses. Plan lifetimes according to your renumbering requirements: shorter lifetimes (hours, planned ahead and refreshed regularly) allow faster renumbering but require more frequent RA updates; longer lifetimes (days/weeks) provide stability but slower renumbering.
