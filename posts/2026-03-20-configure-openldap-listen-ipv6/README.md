# How to Configure OpenLDAP to Listen on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenLDAP, IPv6, LDAP, Directory Services, Slapd, Linux

Description: Configure OpenLDAP's slapd daemon to accept LDAP connections over IPv6, including URL configuration, access control, TLS, and verification steps.

---

OpenLDAP's slapd daemon can be configured to listen on IPv6 by specifying IPv6 LDAP URLs in its startup configuration. This enables directory lookups and authentication over IPv6 for clients on dual-stack or IPv6-only networks.

## Installing OpenLDAP

```bash
# Ubuntu/Debian

sudo apt install slapd ldap-utils -y

# RHEL/CentOS
sudo dnf install openldap-servers openldap-clients -y

# Verify slapd version
slapd -VV
```

## Configuring slapd to Listen on IPv6

slapd uses URL listeners specified at startup. The format `ldap:///` means all interfaces; `ldap://[::]/` means all IPv6 interfaces:

```bash
# Ubuntu/Debian: Edit /etc/default/slapd
sudo nano /etc/default/slapd

# Find the SLAPD_SERVICES line and modify it:
# Listen on both IPv4 and IPv6 LDAP and LDAPS
SLAPD_SERVICES="ldap:/// ldap://[::1]/ ldaps:/// ldaps://[::1]/ ldapi:///"

# IPv6-specific listeners:
# ldap://[::]/     - all IPv6 interfaces, standard LDAP (port 389)
# ldap://[::1]/    - IPv6 loopback only
# ldap://[2001:db8::1]/ - specific IPv6 address
SLAPD_SERVICES="ldap:/// ldap://[::]/  ldaps:/// ldaps://[::]/  ldapi:///"
```

For RHEL/CentOS, edit the systemd service:

```bash
# Create systemd override
sudo mkdir -p /etc/systemd/system/slapd.service.d/
cat > /etc/systemd/system/slapd.service.d/ipv6.conf << 'EOF'
[Service]
# Override ExecStart to add IPv6 listeners
ExecStart=
ExecStart=/usr/sbin/slapd -d 0 \
  -h "ldap:/// ldap://[::]/  ldaps:/// ldaps://[::]/  ldapi:///"
EOF

sudo systemctl daemon-reload
```

## Restarting and Verifying IPv6 Listening

```bash
# Restart slapd
sudo systemctl restart slapd

# Verify slapd is listening on IPv6 port 389
ss -tlnp | grep :389

# Expected output includes:
# LISTEN 0 128 [::]:389 [::]:*  users:(("slapd",pid=...))

# Also check LDAPS port 636 if configured
ss -tlnp | grep :636
```

## Configuring Access Control for IPv6 Clients

In slapd.conf or via cn=config, add access rules that cover IPv6:

```ldif
# slapd.conf style access control
# Allow IPv6 subnet to read the directory
access to *
  by peername.ipv6="2001:db8::%ffff:ffff::" read
  by self write
  by anonymous auth
  by * none
```

For cn=config (modern LDAP configuration):

```bash
# Create ACL modification LDIF
cat > /tmp/acl_ipv6.ldif << 'EOF'
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcAccess
olcAccess: {0}to attrs=userPassword
  by peername.ipv6="2001:db8::%ffff:ffff::" auth
  by self write
  by anonymous auth
  by * none
olcAccess: {1}to *
  by peername.ipv6="2001:db8::%ffff:ffff::" read
  by self write
  by * none
EOF

# Apply the changes
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/acl_ipv6.ldif
```

## Testing LDAP Connectivity over IPv6

```bash
# Test LDAP search from an IPv6 address
ldapsearch -x -H ldap://[2001:db8::1] \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -w adminpassword \
  "(objectClass=*)"

# Test anonymous bind over IPv6
ldapsearch -H ldap://[2001:db8::1] \
  -b "dc=example,dc=com" \
  -x "(objectClass=posixAccount)" uid cn

# Test with the hostname (if AAAA record exists)
ldapsearch -H ldap://ldap.example.com \
  -b "dc=example,dc=com" \
  -x "(cn=testuser)" uid
```

## Firewall Configuration for IPv6 LDAP

```bash
# Open LDAP ports for IPv6
sudo ip6tables -A INPUT -p tcp --dport 389 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 636 -j ACCEPT  # LDAPS

# Restrict to specific subnet
sudo ip6tables -A INPUT -p tcp -s 2001:db8::/32 --dport 389 -j ACCEPT

# Save rules
sudo ip6tables-save > /etc/iptables/rules.v6
```

## Monitoring OpenLDAP IPv6 Connections

```bash
# Check current LDAP connections (including IPv6)
sudo ldapsearch -Y EXTERNAL -H ldapi:/// \
  -b "cn=Current,cn=Connections,cn=Monitor" \
  "(objectClass=*)" | grep -E "cn:|ops"

# View slapd logs
sudo journalctl -u slapd -f

# Look for IPv6 connection attempts
sudo journalctl -u slapd | grep "::ffff\|2001\|fd"
```

Configuring OpenLDAP to listen on IPv6 is straightforward with the correct URL syntax in the slapd startup configuration, enabling LDAP-based authentication and directory lookups across your IPv6 network.
