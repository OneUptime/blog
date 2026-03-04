# How to Set Up Squid Proxy Authentication with LDAP on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Squid, LDAP, Authentication, Proxy, Active Directory, Linux

Description: Configure Squid proxy on RHEL to authenticate users against an LDAP directory or Active Directory, controlling internet access based on user identity.

---

LDAP-based authentication in Squid lets you control proxy access using your existing directory service. Users must provide credentials before accessing the internet through the proxy.

## Prerequisites

```bash
# Install Squid and LDAP utilities
sudo dnf install -y squid openldap-clients
```

## Configure LDAP Authentication Helper

Squid uses external helper programs for authentication. The `basic_ldap_auth` helper connects to LDAP:

```bash
# Verify the LDAP auth helper exists
ls /usr/lib64/squid/basic_ldap_auth

# Test LDAP connectivity
ldapsearch -x -H ldap://ldap.example.com -b "dc=example,dc=com" \
  -D "cn=binduser,dc=example,dc=com" -W "(uid=testuser)"
```

## Configure Squid for LDAP Auth

```bash
sudo tee /etc/squid/squid.conf << 'CONF'
# LDAP Authentication Configuration
auth_param basic program /usr/lib64/squid/basic_ldap_auth \
  -b "dc=example,dc=com" \
  -D "cn=binduser,dc=example,dc=com" \
  -w "BindPassword123" \
  -f "(uid=%s)" \
  -H ldap://ldap.example.com

auth_param basic children 10 startup=2 idle=2
auth_param basic realm Proxy Authentication Required
auth_param basic credentialsttl 8 hours

# Require authentication
acl authenticated proxy_auth REQUIRED

# Define local networks
acl localnet src 10.0.0.0/8
acl localnet src 192.168.0.0/16

# Standard port ACLs
acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 443

# Access rules - require authentication from local network
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localnet authenticated
http_access allow localhost
http_access deny all

# Proxy port
http_port 3128

# Cache
cache_dir ufs /var/spool/squid 5000 16 256

# Logging with username
access_log /var/log/squid/access.log squid

visible_hostname proxy.example.com
CONF
```

## Configure for Active Directory

For Active Directory, adjust the authentication parameters:

```bash
# Active Directory authentication helper
auth_param basic program /usr/lib64/squid/basic_ldap_auth \
  -R \
  -b "dc=corp,dc=example,dc=com" \
  -D "CN=Squid Bind,OU=Service Accounts,DC=corp,DC=example,DC=com" \
  -w "BindPassword123" \
  -f "(&(sAMAccountName=%s)(objectClass=person))" \
  -H ldap://dc01.corp.example.com
```

## Group-Based Access Control

Restrict proxy access to members of specific LDAP groups:

```bash
# Add group-based authorization
external_acl_type ldap_group %LOGIN /usr/lib64/squid/ext_ldap_group_acl \
  -b "dc=example,dc=com" \
  -D "cn=binduser,dc=example,dc=com" \
  -w "BindPassword123" \
  -f "(&(objectClass=groupOfNames)(cn=%g)(member=uid=%u,ou=People,dc=example,dc=com))" \
  -H ldap://ldap.example.com

# Define group ACLs
acl internet_users external ldap_group InternetUsers
acl admin_users external ldap_group ProxyAdmins

# Block certain sites for regular users
acl blocked_sites dstdomain .socialmedia.com .streaming.com

# Access rules
http_access deny internet_users blocked_sites
http_access allow admin_users
http_access allow internet_users
http_access deny all
```

## Secure the LDAP Connection

```bash
# Use LDAPS (LDAP over TLS)
auth_param basic program /usr/lib64/squid/basic_ldap_auth \
  -b "dc=example,dc=com" \
  -D "cn=binduser,dc=example,dc=com" \
  -w "BindPassword123" \
  -f "(uid=%s)" \
  -H ldaps://ldap.example.com \
  -Z

# If using a self-signed CA
# Set the LDAP TLS CA certificate
# Add to /etc/openldap/ldap.conf:
# TLS_CACERT /etc/pki/tls/certs/ldap-ca.pem
```

## Start and Test

```bash
# Verify configuration
sudo squid -k parse

# Initialize cache and start
sudo squid -z
sudo systemctl enable --now squid

# Test authentication
curl -x http://proxy.example.com:3128 -U testuser:password http://www.example.com

# Test failed authentication
curl -x http://proxy.example.com:3128 -U baduser:wrongpass http://www.example.com
# Should return 407 Proxy Authentication Required
```

## Firewall

```bash
sudo firewall-cmd --permanent --add-port=3128/tcp
sudo firewall-cmd --reload
```

## Monitor Authenticated Access

```bash
# View access logs with usernames
sudo tail -f /var/log/squid/access.log
# Output includes the authenticated username in each log entry
```

LDAP authentication ensures that only authorized users can access the internet through your proxy and provides accountability through per-user logging.
