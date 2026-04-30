# How to Configure FreeRADIUS with IPv6 Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RADIUS, FreeRADIUS, IPv6, AAA, Networking, Authentication

Description: Configure FreeRADIUS to support IPv6 attributes including NAS-IPv6-Address, Framed-IPv6-Prefix, and Delegated-IPv6-Prefix for IPv6 user address assignment and accounting.

## IPv6 RADIUS Attributes Overview

RADIUS extended its attribute set to support IPv6 through several RFCs:

| Attribute | RFC | Type | Purpose |
|---|---|---|---|
| NAS-IPv6-Address | RFC 3162 | ipv6addr | NAS's own IPv6 address |
| Framed-IPv6-Prefix | RFC 3162 | ipv6prefix | Assigned IPv6 prefix to user |
| Framed-IPv6-Route | RFC 3162 | string | Static route for user |
| Delegated-IPv6-Prefix | RFC 4818 | ipv6prefix | DHCPv6-PD prefix delegation |
| Framed-Interface-Id | RFC 3162 | ifid | 64-bit interface identifier |

## FreeRADIUS Dictionary Verification

```bash
# Verify IPv6 attribute definitions are present in the shipped dictionaries

grep -i "ipv6\|IPv6" /usr/share/freeradius/dictionary.rfc3162
grep -i "delegated" /usr/share/freeradius/dictionary.rfc4818

# Should show:
# ATTRIBUTE  NAS-IPv6-Address          95  ipv6addr
# ATTRIBUTE  Framed-Interface-Id       96  ifid
# ATTRIBUTE  Framed-IPv6-Prefix        97  ipv6prefix
# ATTRIBUTE  Login-IPv6-Host           98  ipv6addr
# ATTRIBUTE  Framed-IPv6-Route         99  string
# ATTRIBUTE  Framed-IPv6-Pool         100  string
# ATTRIBUTE  Delegated-IPv6-Prefix     123  ipv6prefix (RFC 4818)

# Load custom dictionaries if missing
echo '$INCLUDE /usr/share/freeradius/dictionary.rfc3162' >> /etc/freeradius/3.0/dictionary
echo '$INCLUDE /usr/share/freeradius/dictionary.rfc4818' >> /etc/freeradius/3.0/dictionary
```

## FreeRADIUS: Listen on IPv6

```bash
# /etc/freeradius/3.0/sites-enabled/default-ipv6
# Configure FreeRADIUS to listen on IPv6

# Edit listen section
cat > /etc/freeradius/3.0/sites-enabled/default-ipv6 << 'EOF'
listen {
    type = auth
    ipv6addr = ::        # Listen on all IPv6 addresses
    port = 1812
    # For specific address:
    # ipv6addr = 2001:db8:ffff::10
}

listen {
    type = acct
    ipv6addr = ::
    port = 1813
}
EOF

# Restart and verify
systemctl restart freeradius
ss -6 -u -l -n | grep 1812  # UDP listening on IPv6
```

## Users File with IPv6 Attributes

```text
# /etc/freeradius/3.0/users
# Assign IPv6 prefix to user

alice   Cleartext-Password := "secret"
        Service-Type = Framed-User,
        Framed-Protocol = PPP,
        Framed-IPv6-Prefix = "2001:db8:100::1/128",
        Framed-IPv6-Route = "2001:db8:100::/64 :: 1",
        Delegated-IPv6-Prefix = "2001:db8:200::/56"

# Assign from pool
bob     Cleartext-Password := "secret"
        Service-Type = Framed-User,
        Framed-IPv6-Pool = "ipv6_users"
```

## SQL Module with IPv6 Attributes

```sql
-- MySQL/PostgreSQL example entries for RADIUS with IPv6
-- /etc/freeradius/3.0/mods-enabled/sql

-- radreply table entries for IPv6
INSERT INTO radreply (username, attribute, op, value)
VALUES
('alice', 'Framed-IPv6-Prefix', '=', '2001:db8:100::1/128'),
('alice', 'Delegated-IPv6-Prefix', '=', '2001:db8:200::/56'),
('alice', 'Framed-IPv6-Route', '=', '2001:db8:100::/64 :: 1');

-- Query to list all IPv6 assignments
SELECT username, attribute, value
FROM radreply
WHERE attribute IN ('Framed-IPv6-Prefix', 'Delegated-IPv6-Prefix')
ORDER BY username;
```

```bash
# /etc/freeradius/3.0/mods-enabled/sql
# Configure SQL module
sql {
    driver = "rlm_sql_mysql"
    server = "::1"          # IPv6 database server
    port = 3306
    login = "radius"
    password = "radpass"
    radius_db = "radius"
    readclients = yes
}
```

## NAS Clients with IPv6 Addresses

```text
# /etc/freeradius/3.0/clients.conf
# Define NAS clients using IPv6 addresses

client ipv6_nas {
    ipv6addr    = 2001:db8:10::1
    secret      = naspassword
    shortname   = core-router
    nas_type    = cisco
}

# Accept from entire IPv6 subnet
client ipv6_subnet {
    ipv6addr    = 2001:db8::/32
    secret      = subnetpassword
    shortname   = dc-subnet
}

# Dual-stack NAS (define one client block per source address)
client dual_nas_ipv4 {
    ipaddr      = 192.168.1.1
    secret      = dualpassword
    shortname   = dual-nas-ipv4
    nas_type    = cisco
}

client dual_nas_ipv6 {
    ipv6addr    = 2001:db8:1::1
    secret      = dualpassword
    shortname   = dual-nas-ipv6
    nas_type    = cisco
}
```

## Testing IPv6 Attributes with radclient

```bash
# radclient is more flexible when sending IPv6-specific RADIUS attributes

# Create test request
cat > /tmp/test-ipv6.txt << 'EOF'
User-Name = "alice"
User-Password = "secret"
NAS-IPv6-Address = "2001:db8:10::1"
NAS-Port = 0
EOF

# Send to IPv6 RADIUS server
radclient -x [2001:db8:ffff::10]:1812 auth naspassword < /tmp/test-ipv6.txt

# Expected response includes:
# Framed-IPv6-Prefix = 2001:db8:100::1/128
# Delegated-IPv6-Prefix = 2001:db8:200::/56

# Test accounting
cat > /tmp/test-acct.txt << 'EOF'
User-Name = "alice"
NAS-IPv6-Address = "2001:db8:10::1"
Acct-Status-Type = Start
Acct-Session-Id = "test-001"
Framed-IPv6-Prefix = "2001:db8:100::1/128"
EOF

radclient -x [2001:db8:ffff::10]:1813 acct naspassword < /tmp/test-acct.txt
```

## Logging IPv6 Attributes

```text
# /etc/freeradius/3.0/mods-enabled/detail
# Log IPv6 attributes in accounting detail files

detail {
    filename = ${radacctdir}/%{%{Packet-Src-IP-Address}:-%{Packet-Src-IPv6-Address}}/detail-%Y%m%d
    permissions = 0600
    header = "%t"
    # Log all IPv6-related attributes
}
```

## Conclusion

FreeRADIUS supports IPv6 through dictionary attributes defined in RFC 3162 and RFC 4818. Configure FreeRADIUS to listen on IPv6 by setting `ipv6addr = ::` in the listen section. Assign IPv6 addresses to users via `Framed-IPv6-Prefix` (assigned IPv6 prefix), `Framed-IPv6-Route` (static routing), and `Delegated-IPv6-Prefix` (DHCPv6-PD). Define IPv6 NAS clients in `clients.conf` using `ipv6addr`. Test with `radclient` pointing to the bracketed IPv6 address `[2001:db8:ffff::10]:1812`. The SQL module works with IPv6 database servers - use `::1` for localhost connections.
