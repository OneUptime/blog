# How to Use the RADIUS Framed-IPv6-Prefix Attribute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RADIUS, Framed-IPv6-Prefix, IPv6, RFC 3162, Address Assignment, AAA

Description: Configure and use the RADIUS Framed-IPv6-Prefix attribute (RFC 3162, attribute 97) to assign IPv6 addresses and prefixes to authenticated users.

## Framed-IPv6-Prefix Overview

Framed-IPv6-Prefix (RADIUS attribute 97, RFC 3162) conveys an IPv6 prefix and corresponding route to be configured for an authenticated user. In PPP and NDRA deployments, it is commonly used with Framed-Interface-Id or router advertisements to derive the subscriber's IPv6 address and on-link prefix.

| Use Case | Prefix Length | Example |
|---|---|---|
| Single host address | /128 | 2001:db8:1::a/128 |
| Subscriber WAN prefix | /64 | 2001:db8:1:100::/64 |
| Larger routed prefix | /56 | 2001:db8:100::/56 |

Note: Delegated-IPv6-Prefix (attribute 123, RFC 4818) is the standard RADIUS attribute for DHCPv6-PD. For DHCPv6 IA_NA, RFC 6911 defines Framed-IPv6-Address (attribute 168).

## Attribute Wire Format

```text
Framed-IPv6-Prefix (Attribute 97):
  Type:    97
  Length:  Variable (4 + ceil(prefix-len / 8) bytes)
  Value:   reserved (1 byte) + prefix-len (1 byte) + prefix (N bytes)

Example: 2001:db8:1::10/128
  Type:    97
  Length:  20  (2-byte RADIUS header + 2 bytes reserved/prefix-len + 16 prefix bytes)
  Byte 3:  0x00 (reserved)
  Byte 4:  0x80 (128 = /128)
  Bytes 5-20: 20 01 0d b8 00 01 00 00 00 00 00 00 00 00 00 10

For non-octet-aligned prefixes, the unused bits in the final prefix octet MUST be zero.
```

## FreeRADIUS: Assigning Framed-IPv6-Prefix

```text
# /etc/freeradius/3.0/users

# Assign specific /128 to user

alice  Cleartext-Password := "secret"
       Framed-IPv6-Prefix = "2001:db8:1::a/128",
       Service-Type = Framed-User

# Assign /64 prefix
bob    Cleartext-Password := "secret"
       Framed-IPv6-Prefix = "2001:db8:2:100::/64",
       Service-Type = Framed-User

# Return a NAS-local IPv6 pool name
carol  Cleartext-Password := "secret"
       Framed-IPv6-Pool = "ipv6_users",
       Service-Type = Framed-User
```

## SQL-Based Prefix Assignment

```sql
-- radreply table: static per-user assignments
INSERT INTO radreply (username, attribute, op, value) VALUES
('alice', 'Framed-IPv6-Prefix', '=', '2001:db8:1::a/128'),
('bob',   'Framed-IPv6-Prefix', '=', '2001:db8:2:100::/64');

-- View all assigned prefixes
SELECT username, value AS ipv6_prefix
FROM radreply
WHERE attribute = 'Framed-IPv6-Prefix'
ORDER BY username;
```

## Cisco IOS BNG: Applying Framed-IPv6-Prefix

```text
! Cisco IOS / IOS XE virtual-access example
! Add the RADIUS Framed-IPv6-Prefix to the interface ND prefix queue

interface virtual-template 1
 ppp authentication chap
 ipv6 nd prefix framed-ipv6-prefix

! Verification
show interfaces virtual-access 1 configuration
show ipv6 interface virtual-access 1
```

## Juniper BNG: Applying Framed-IPv6-Prefix

```text
# Junos MX BNG: apply RADIUS-provided IPv6 address and NDRA prefix
# using predefined variables in the dynamic profile

set dynamic-profiles DS-dyn-ipv6 interfaces pp0 unit "$junos-interface-unit" family inet6 address $junos-ipv6-address
set dynamic-profiles DS-dyn-ipv6 protocols router-advertisement interface "$junos-interface-name" prefix $junos-ipv6-ndra-prefix

# Verify:
show subscribers detail
show network-access aaa radius-servers detail
```

## Linux PPPoE Server with Framed-IPv6-Prefix

```bash
# PPP/PPPoE uses IPv6CP to negotiate interface identifiers.
# Exact RADIUS integration is implementation-specific; verify the
# resulting IPv6 address on the PPP interface.

# Verify assigned prefix
ip -6 addr show dev ppp0
# inet6 2001:db8:1::a/128 scope global
```

## IPv6 Pool Configuration in FreeRADIUS

```bash
# /etc/freeradius/3.0/users
# Framed-IPv6-Pool returns the name of a pool that already exists on the NAS.
# It does not define the pool inside FreeRADIUS.

carol  Cleartext-Password := "secret"
       Framed-IPv6-Pool = "ipv6_users",
       Service-Type = Framed-User
```

## Testing Framed-IPv6-Prefix Assignment

```bash
# Test that RADIUS returns Framed-IPv6-Prefix
radclient -6 -x [2001:db8::10]:1812 auth testing123 << 'EOF'
User-Name = "alice"
User-Password = "secret"
NAS-IPv6-Address = "2001:db8:ffff::1"
NAS-Port = 1
EOF

# Expected response:
# Received Access-Accept Id 0 from ...
#   Framed-IPv6-Prefix = 2001:db8:1::a/128
#   Service-Type = Framed-User

# Parse the prefix from response
RESPONSE=$(radclient -6 -x [2001:db8::10]:1812 auth testing123 <<< "User-Name = \"alice\"
User-Password = \"secret\"")
PREFIX=$(printf '%s\n' "$RESPONSE" | awk '/Framed-IPv6-Prefix/ { print $3; exit }')
echo "Assigned prefix: ${PREFIX}"
```

## Conclusion

Framed-IPv6-Prefix (attribute 97) is the standard RADIUS attribute for authorizing an IPv6 prefix and corresponding route for an authenticated user. A /128 can be used as a host address on platforms that interpret it that way, while shorter prefixes are typically used with Framed-Interface-Id or router advertisements. Configure static assignments in the FreeRADIUS `users` file or SQL `radreply` table, or return Framed-IPv6-Pool when the NAS is configured with a local IPv6 pool. For DHCPv6 IA_NA use Framed-IPv6-Address (RFC 6911), and for DHCPv6-PD use Delegated-IPv6-Prefix (RFC 4818). Test with `radclient` and verify the attribute appears in the Access-Accept response.
