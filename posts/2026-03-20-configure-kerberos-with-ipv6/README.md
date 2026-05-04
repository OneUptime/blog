# How to Configure Kerberos with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kerberos, IPv6, Authentication, MIT Kerberos, KDC, Security, Active Directory

Description: Configure MIT Kerberos KDC and clients for IPv6-based authentication, covering KDC binding, krb5.conf settings, and testing Kerberos ticket acquisition over IPv6.

---

Kerberos is the primary authentication protocol for enterprise environments. Enabling Kerberos over IPv6 requires configuring the KDC to listen on IPv6 interfaces and ensuring clients can locate the KDC through DNS AAAA records.

## MIT Kerberos IPv6 Support

MIT Kerberos (krb5) has supported IPv6 client-to-KDC requests since version 1.3, with kadmin and GSSRPC IPv6 support added in 1.9. The KDC listens on all interfaces by default, including IPv6, when IPv6 is enabled on the system.

## Installing Kerberos KDC

```bash
# Ubuntu/Debian

sudo apt install krb5-kdc krb5-admin-server krb5-config -y

# RHEL/CentOS
sudo dnf install krb5-server krb5-workstation krb5-libs -y
```

## Configuring the KDC for IPv6

```ini
# /etc/krb5.conf

[libdefaults]
default_realm = EXAMPLE.COM
dns_lookup_realm = false
# Enable DNS lookup for KDC - finds IPv6 KDC via AAAA records
dns_lookup_kdc = true
forwardable = true
# Allow KDC connections over IPv6
noaddresses = true  # Important: don't restrict tickets to specific addresses

[realms]
EXAMPLE.COM = {
    # KDC address - use IPv6 with brackets
    kdc = [2001:db8::10]:88
    # Fallback to IPv4
    kdc = 192.168.1.10:88
    admin_server = [2001:db8::10]:749
}

[domain_realm]
.example.com = EXAMPLE.COM
example.com = EXAMPLE.COM
```

## Configuring kdc.conf for IPv6 Listening

```ini
# /etc/krb5kdc/kdc.conf

[kdcdefaults]
kdc_ports = 88
kdc_tcp_ports = 88
# Listen on all interfaces (default - includes IPv6)
# To restrict to specific IPv6 address:
# kdc_listen = [2001:db8::10]:88

[realms]
EXAMPLE.COM = {
    # Database location
    database_name = /var/lib/krb5kdc/principal
    admin_keytab = /etc/krb5kdc/kadm5.keytab
    acl_file = /etc/krb5kdc/kadm5.acl
    max_life = 10h 0m 0s
    max_renewable_life = 7d 0h 0m 0s
}
```

## Setting Up DNS SRV Records for IPv6 KDC Discovery

```bash
# Add SRV records pointing to the KDC
# In BIND zone file:
_kerberos._tcp.example.com.  IN SRV 0 100 88 kdc.example.com.
_kerberos._udp.example.com.  IN SRV 0 100 88 kdc.example.com.
_kerberos-adm._tcp.example.com. IN SRV 0 100 749 kdc.example.com.

# Add AAAA record for the KDC hostname
kdc.example.com.  IN AAAA 2001:db8::10

# Verify SRV records
dig SRV _kerberos._tcp.example.com
dig AAAA kdc.example.com
```

## Creating the Kerberos Realm and Principals

```bash
# Create the Kerberos database
sudo kdb5_util create -s -r EXAMPLE.COM

# Start KDC services
sudo systemctl enable --now krb5-kdc
sudo systemctl enable --now krb5-admin-server

# Create admin principal
sudo kadmin.local -q "addprinc admin/admin"

# Create a test user principal
sudo kadmin.local -q "addprinc testuser@EXAMPLE.COM"
```

## Testing Kerberos over IPv6

```bash
# Test kinit (acquire a Kerberos ticket)
kinit testuser@EXAMPLE.COM

# Verify the ticket (show enctypes and flags)
klist -e -f

# Check which KDC was contacted
kinit -V testuser@EXAMPLE.COM 2>&1 | grep "KDC\|TCP\|UDP"

# Verify the KDC is reachable over IPv6
nc -6 -w 3 2001:db8::10 88 && echo "KDC reachable over IPv6"

# Test TCP Kerberos (more reliable than UDP for IPv6)
KRB5_CONFIG=/tmp/krb5_ipv6.conf kinit testuser
```

## Firewall Rules for Kerberos over IPv6

```bash
# Allow Kerberos UDP and TCP on port 88
sudo ip6tables -A INPUT -p udp --dport 88 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 88 -j ACCEPT
# Admin server
sudo ip6tables -A INPUT -p tcp --dport 749 -j ACCEPT

# For kadmin
sudo ip6tables -A INPUT -p tcp --dport 464 -j ACCEPT  # kpasswd

# Save rules
sudo ip6tables-save > /etc/ip6tables/rules.v6
```

## Enabling noaddresses for IPv6 Clients

The `noaddresses` option in krb5.conf is important for IPv6:

```ini
# /etc/krb5.conf
[libdefaults]
# Don't include client IP in ticket - required for NAT and IPv6/IPv4 mixed
noaddresses = true
```

```bash
# With noaddresses = true, a ticket can be used from any address
# This is required when:
# - Client has both IPv4 and IPv6
# - Client is behind NAT
# - Network address changes (mobile clients)
```

Kerberos over IPv6 works reliably when the KDC listens on all interfaces, DNS is configured with AAAA/SRV records for KDC discovery, and `noaddresses = true` is set to avoid address binding issues in dual-stack environments.
