# How to Use the RADIUS Delegated-IPv6-Prefix Attribute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RADIUS, Delegated-IPv6-Prefix, DHCPv6-PD, IPv6, RFC 4818, AAA

Description: Configure and use the RADIUS Delegated-IPv6-Prefix attribute (RFC 4818) to assign DHCPv6-PD prefixes to authenticated subscribers for home or enterprise routers.

## Delegated-IPv6-Prefix vs Framed-IPv6-Prefix

| Attribute | RFC | Use Case |
|---|---|---|
| Framed-IPv6-Prefix (attr 97) | RFC 3162 | Prefix/address on the subscriber-facing interface |
| Delegated-IPv6-Prefix (attr 123) | RFC 4818 | Prefix delegated to CPE router via DHCPv6-PD |

A home subscriber typically gets:
- Framed-IPv6-Prefix: often `/128` for the WAN interface
- Delegated-IPv6-Prefix: `/56` or `/48` for the subscriber LAN

## Attribute Wire Format (RFC 4818)

```text
Delegated-IPv6-Prefix (Attribute 123):
  Type:    123
  Length:  Variable
  Value:   reserved (1 byte) + prefix-len (1 byte) + prefix (variable)

Example: 2001:db8:100:ab00::/56
  Type:   123
  Length: 11 (Type/Length/Reserved/Prefix-Length plus 7 prefix bytes for /56)
  Byte 3: 0x00 (reserved)
  Byte 4: 0x38 (56 decimal = /56)
  Bytes 5+: 20 01 0d b8 01 00 ab (first 7 bytes, /56 = 7 bytes)
```

## FreeRADIUS Configuration

```text
# /etc/freeradius/3.0/mods-config/files/authorize

# Assign delegated prefix to subscriber (CPE router)

subscriber1  Cleartext-Password := "secret"
             Service-Type = Framed-User,
             Framed-IPv6-Prefix = "2001:db8:0:1::1/128",
             Delegated-IPv6-Prefix = "2001:db8:100:ab00::/56",
             Framed-IPv6-Route = "2001:db8:100:ab00::/56 :: 1"
```

```sql
-- SQL: store delegated prefix per subscriber
INSERT INTO radreply (username, attribute, op, value) VALUES
('subscriber1', 'Framed-IPv6-Prefix',    '=', '2001:db8:0:1::1/128'),
('subscriber1', 'Delegated-IPv6-Prefix', '=', '2001:db8:100:ab00::/56'),
('subscriber1', 'Framed-IPv6-Route',     '=', '2001:db8:100:ab00::/56 :: 1');
```

## Cisco BNG: DHCPv6-PD with RADIUS

```text
! Cisco IOS XE BNG - DHCPv6-PD from RADIUS
! RADIUS returns Delegated-IPv6-Prefix, BNG performs DHCPv6-PD toward CPE

ipv6 dhcp pool DELEGATED_POOL
 prefix-delegation aaa method-list default
 ! use AAA/RADIUS to obtain the delegated prefix

interface Virtual-Template1
 ipv6 enable
 ipv6 dhcp server DELEGATED_POOL rapid-commit

! Subscriber gets:
! WAN address from Framed-IPv6-Prefix
! Delegated /56 from Delegated-IPv6-Prefix (via DHCPv6-PD to CPE)

show ipv6 dhcp binding
! Client: FE80::1
!   IA PD: IA_ID 0x00000001
!     Prefix: 2001:db8:100:ab00::/56 valid 86400 preferred 43200
```

## Juniper MX BNG: Delegated Prefix

```text
# Juniper MX - DHCPv6-PD with RADIUS-assigned prefix

set access address-assignment pool DELEGATED_POOL family inet6 prefix 2001:db8:100::/40
set access address-assignment pool DELEGATED_POOL family inet6 range SUBSCRIBERS prefix-length 56

# RADIUS can return Delegated-IPv6-Prefix directly, or Jnpr-IPv6-Delegated-Pool-Name
# to select a local delegated pool.

# Verify DHCPv6-PD bindings
show dhcpv6 server binding detail
```

## Linux: ISC Kea + FreeRADIUS Integration

```json
// Kea DHCPv6 server uses RADIUS for prefix delegation
// /etc/kea/kea-dhcp6.conf (excerpt)

{
    "Dhcp6": {
        "hooks-libraries": [
            {
                "library": "/usr/lib/kea/hooks/libdhcp_host_cache.so"
            },
            {
                "library": "/usr/lib/kea/hooks/libdhcp_radius.so",
                "parameters": {
                    "dictionary": "/etc/kea/radius/dictionary",
                    "identifier-type6": "duid",
                    "access": {
                        "servers": [
                            {
                                "name": "2001:db8::10",
                                "port": 1812,
                                "secret": "radiussecret"
                            }
                        ]
                    }
                }
            }
        ],
        "subnet6": [
            {
                "subnet": "2001:db8::/32",
                "pd-pools": [
                    {
                        "prefix": "2001:db8:100::",
                        "prefix-len": 40,
                        "delegated-len": 56
                    }
                ]
            }
        ]
    }
}
```

## FreeRADIUS Dynamic Prefix Pool

```text
# /etc/freeradius/3.0/mods-available/sqlippool
# Use a separate sqlippool instance for delegated prefixes.
# This example uses PostgreSQL so the pool schema can store IPv6 prefixes.
# Prepopulate the pool table with the /56 prefixes from your /40 pool.

sqlippool delegated_ipv6 {
    sql_module_instance = "sql"
    dialect = "postgresql"
    pool_name = "Pool-Name"
    ippool_table = "radippool"
    lease_duration = 2592000
    attribute_name = Delegated-IPv6-Prefix
    req_attribute_name = Delegated-IPv6-Prefix
    pool_key = "%{User-Name}"
}
```

## Accounting: Tracking Delegated Prefixes

```bash
# FreeRADIUS logs Delegated-IPv6-Prefix in accounting
# /etc/freeradius/3.0/mods-config/sql/main/mysql/schema.sql

# The default FreeRADIUS SQL schema already includes delegatedipv6prefix.

# Query active delegations
mysql -u radius -p radius << 'EOF'
SELECT username, framedipv6prefix, delegatedipv6prefix, acctstarttime
FROM radacct
WHERE acctstoptime IS NULL
  AND delegatedipv6prefix <> ''
ORDER BY acctstarttime;
EOF
```

## Testing Delegated Prefix Assignment

```bash
# Test with radclient
radclient -x [2001:db8::10]:1812 auth testing123 << 'EOF'
User-Name = "subscriber1"
User-Password = "secret"
NAS-IPv6-Address = "2001:db8:ffff::1"
NAS-Port = 100
Service-Type = Framed-User
EOF

# Expected Access-Accept:
#   Framed-IPv6-Prefix = 2001:db8:0:1::1/128
#   Delegated-IPv6-Prefix = 2001:db8:100:ab00::/56
#   Framed-IPv6-Route = 2001:db8:100:ab00::/56 :: 1

# Simulate accounting start with delegated prefix
radclient -x [2001:db8::10]:1813 acct testing123 << 'EOF'
User-Name = "subscriber1"
Acct-Status-Type = Start
Acct-Session-Id = "session-001"
NAS-IPv6-Address = "2001:db8:ffff::1"
Framed-IPv6-Prefix = "2001:db8:0:1::1/128"
Delegated-IPv6-Prefix = "2001:db8:100:ab00::/56"
EOF
```

## Conclusion

Delegated-IPv6-Prefix (RADIUS attribute 123, RFC 4818) enables RADIUS-based control of DHCPv6-PD prefix delegation. Each subscriber receives a unique prefix (typically /56 for residential, /48 for enterprise) that the BNG delegates to the CPE router via DHCPv6-PD. Configure static assignments in the FreeRADIUS SQL `radreply` table or use a separate `sqlippool` instance with `attribute_name = Delegated-IPv6-Prefix` and a pool schema that can store IPv6 prefixes. Cisco BNG can obtain the delegated prefix from AAA with `prefix-delegation aaa`, while Juniper MX can use `Delegated-IPv6-Prefix` directly or `Jnpr-IPv6-Delegated-Pool-Name` to select a local delegated pool. Some NAS/BNG platforms also use `Framed-IPv6-Route` for the delegated block, but that is platform-specific rather than an RFC 4818 requirement.
