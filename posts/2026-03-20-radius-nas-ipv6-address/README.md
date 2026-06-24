# How to Use the NAS-IPv6-Address RADIUS Attribute

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RADIUS, NAS-IPv6-Address, IPv6, RFC 3162, AAA, Networking

Description: Configure and use the NAS-IPv6-Address RADIUS attribute (RFC 3162, attribute 95) for identifying network access servers by IPv6 address in authentication and accounting.

## What Is NAS-IPv6-Address?

NAS-IPv6-Address (RADIUS attribute 95, RFC 3162) identifies the IPv6 address of the Network Access Server (NAS) in Access-Request packets. It is the IPv6 counterpart to NAS-IP-Address (attribute 4), and both attributes can appear in the same Access-Request.

The NAS includes this attribute when:
- The NAS uses an IPv6 address to connect to the RADIUS server
- The NAS wants to identify itself with an IPv6 address
- The RADIUS server applies policy based on the NAS IPv6 address

## NAS-IPv6-Address in Access-Request

```text
RADIUS Access-Request packet (from IPv6 NAS):

Attribute 4  (NAS-IP-Address):      Optional / omitted in this example
Attribute 95 (NAS-IPv6-Address):    2001:db8:0:100::1
Attribute 5  (NAS-Port):            1
Attribute 1  (User-Name):           alice
Attribute 2  (User-Password):       ****
Attribute 61 (NAS-Port-Type):       Ethernet
```

## Cisco IOS/IOS-XE: Configuring NAS-IPv6-Address

```text
! Cisco IOS XE - RADIUS NAS IPv6 identification
interface Loopback0
 ipv6 address 2001:db8:0:100::1/128

! Configure RADIUS server (IPv6)
radius server RADIUS_SRV
 address ipv6 2001:db8::10 auth-port 1812 acct-port 1813
 key mysecret

! Use the IPv6 loopback as the RADIUS source address
ip radius source-interface Loopback0

! Enable IPv6 AAA
aaa new-model
aaa authentication login default group radius local
aaa authorization network default group radius
```

## Juniper Junos: NAS-IPv6-Address

```text
# Junos configuration for IPv6 RADIUS NAS

set access radius-server 2001:db8::10 secret mysecret
set access radius-server 2001:db8::10 port 1812
set access radius-server 2001:db8::10 source-address 2001:db8:0:100::1

# The source-address controls the IPv6 source address used for RADIUS packets
# Verify:
show network-access aaa radius-servers
show network-access aaa statistics radius
```

## Linux/FreeRADIUS: Simulating NAS-IPv6-Address

```bash
# radclient: include NAS-IPv6-Address in test request
cat > /tmp/access-request.txt << 'EOF'
User-Name = "testuser"
User-Password = "testpass"
NAS-IPv6-Address = "2001:db8:0:100::1"
NAS-Port = 0
NAS-Port-Type = Ethernet
Calling-Station-Id = "00:11:22:33:44:55"
EOF

# Send to RADIUS server
radclient -6 -x [2001:db8::10]:1812 auth testing123 < /tmp/access-request.txt
```

## FreeRADIUS: Using NAS-IPv6-Address in Policy

```text
# /etc/freeradius/3.0/policy.d/nas-ipv6
# Apply different policies based on NAS IPv6 address

policy nas_ipv6_policy {
    if (&NAS-IPv6-Address =~ /^2001:db8:100:/) {
        # NAS is in Site A
        update reply {
            &Framed-IPv6-Prefix := 2001:db8:100:100::/64
        }
    }
    elsif (&NAS-IPv6-Address =~ /^2001:db8:200:/) {
        # NAS is in Site B
        update reply {
            &Framed-IPv6-Prefix := 2001:db8:200:100::/64
        }
    }
    else {
        reject
    }
}
```

## FreeRADIUS: Client Verification Against NAS-IPv6-Address

```text
# /etc/freeradius/3.0/clients.conf
# RADIUS client (NAS) defined by IPv6 address

client core_router {
    ipv6addr = 2001:db8:0:100::1
    secret   = naspassword
    shortname = core-router
    nastype  = cisco

    # FreeRADIUS verifies packet source IP matches this entry
    # NAS-IPv6-Address, if present, is a separate request attribute
}

# Virtual server: capture which NAS is authenticating
# /etc/freeradius/3.0/sites-enabled/default
server default {
    authorize {
        if (&NAS-IPv6-Address) {
            update request {
                &Tmp-String-0 := "%{NAS-IPv6-Address}"
            }
        }
    }
}
```

## SQL Logging of NAS-IPv6-Address

```sql
-- Custom post-auth logging example for NAS-IPv6-Address
-- After adding a nasipv6address column and updating the post-auth query

SELECT nasipv6address, username, authdate
FROM radpostauth
WHERE nasipv6address IS NOT NULL
ORDER BY authdate DESC
LIMIT 10;

-- Count recent authentications per IPv6 NAS
SELECT nasipv6address, COUNT(*) as auths
FROM radpostauth
WHERE authdate >= NOW() - INTERVAL 1 DAY
GROUP BY nasipv6address
ORDER BY auths DESC;
```

```bash
# FreeRADIUS SQL post-auth schema - add a custom column for NAS-IPv6-Address
mysql -u radius -p radius << 'EOF'
ALTER TABLE radpostauth ADD COLUMN nasipv6address VARCHAR(45) DEFAULT NULL;
EOF

# FreeRADIUS mods-config/sql/main/mysql/queries.conf
# post-auth query - add nasipv6address and %{NAS-IPv6-Address} to the INSERT
```

## Troubleshooting NAS-IPv6-Address

```bash
# Check if NAS-IPv6-Address appears in Access-Request
# Enable FreeRADIUS debug mode
radiusd -X 2>&1 | grep -i "NAS-IPv6"

# Packet capture: view raw RADIUS attribute 95
tcpdump -i eth0 -n udp port 1812 -w /tmp/radius.pcap
tshark -r /tmp/radius.pcap -Y "radius.NAS_IPv6_Address" -T fields \
    -e radius.NAS_IPv6_Address | head -20

# Generate a test Access-Request with NAS-IPv6-Address
radtest -6 -x testuser testpass 2001:db8::10 10 testing123

# Common issue: source IPv6 address of the packet not matching the client block
# FreeRADIUS looks up client by source IP of RADIUS packet
# NAS-IPv6-Address attribute is informational - not used for auth
```

## Conclusion

NAS-IPv6-Address (attribute 95) is the IPv6 counterpart to NAS-IP-Address for identifying a NAS in Access-Request packets. Configure it on Cisco IOS by setting `ip radius source-interface` to an IPv6 loopback, and on Juniper by setting `source-address` in the RADIUS server configuration. FreeRADIUS receives this attribute but authenticates the NAS by its source IP address (matched against `clients.conf`). Use `NAS-IPv6-Address` in FreeRADIUS policy (`unlang`) to apply site-specific configurations, and store it in custom post-auth SQL logs when you need historical reporting.
