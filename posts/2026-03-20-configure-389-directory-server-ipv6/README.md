# How to Configure 389 Directory Server with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: 389 Directory Server, IPv6, LDAP, Red Hat, Directory Services, Linux

Description: Configure 389 Directory Server (Red Hat Directory Server) to listen on IPv6 interfaces, manage access controls for IPv6 clients, and verify LDAP connectivity over IPv6.

---

389 Directory Server is the LDAP implementation underlying FreeIPA and Red Hat Directory Server. It supports IPv6 through interface configuration and provides robust tools for managing IPv6 LDAP access.

## Installing 389 Directory Server

```bash
# RHEL/CentOS/AlmaLinux/Fedora

sudo dnf install 389-ds-base -y

# Ubuntu/Debian (if available)
sudo apt install 389-ds-base -y

# Verify installation
dsconf --version
```

## Creating an Instance with IPv6 Support

Use the `dscreate` tool with an installation file:

```bash
# Create an installation INF file
cat > /tmp/ds-setup.inf << 'EOF'
[general]
config_version = 2

[slapd]
# Instance name
instance_name = myldap

# Root DN and password
root_dn = cn=Directory Manager
root_password = SecurePassword123

# Port configuration
port = 389
secure_port = 636

# Self-signed TLS for development
self_sign_cert = True

[backend-userroot]
sample_entries = yes
suffix = dc=example,dc=com
EOF

# Create the instance
sudo dscreate from-file /tmp/ds-setup.inf

# Start and enable the instance
sudo systemctl enable --now dirsrv@myldap
```

## Configuring 389 DS to Listen on IPv6

389 DS listens on all interfaces by default when `nsslapd-listenhost` is unset. To verify the current settings or bind to a specific IPv6 address assigned to the host:

```bash
# Check current listening configuration
dsconf myldap config get nsslapd-listenhost
dsconf myldap config get nsslapd-securelistenhost

# Replace with an IPv6 address that exists on this host
dsconf myldap config replace nsslapd-listenhost="2001:db8::10"

# For LDAPS on a specific IPv6 address
dsconf myldap config replace nsslapd-securelistenhost="2001:db8::10"

# Restart the instance
sudo systemctl restart dirsrv@myldap

# Verify IPv6 listening
ss -tlnp | grep :389
ss -tlnp | grep :636
```

## Configuring Access Control for IPv6 Networks

Add ACI (Access Control Instructions) for IPv6 clients:

```bash
# Allow read access from a specific IPv6 client
ldapmodify -x -H ldap://[::1] \
  -D "cn=Directory Manager" \
  -w SecurePassword123 << 'EOF'
dn: dc=example,dc=com
changetype: modify
add: aci
aci: (targetattr="*")(version 3.0; acl "IPv6 read access";
  allow (read, search, compare)
  userdn="ldap:///anyone" and
  ip="2001:db8::10";)
EOF
```

## Testing LDAP over IPv6

```bash
# Test LDAP search over IPv6
ldapsearch -x -H ldap://[2001:db8::1]:389 \
  -D "cn=Directory Manager" \
  -w SecurePassword123 \
  -b "dc=example,dc=com" \
  "(objectClass=*)" dn | head -20

# Test from localhost IPv6
ldapsearch -x -H ldap://[::1]:389 \
  -D "cn=Directory Manager" \
  -w SecurePassword123 \
  -b "dc=example,dc=com" \
  "(objectClass=domain)"

# Test LDAPS over IPv6 using a hostname that matches the certificate
LDAPTLS_CACERT=/etc/dirsrv/slapd-myldap/ca.crt \
ldapsearch -x -H ldaps://ldap.example.com:636 \
  -D "cn=Directory Manager" \
  -w SecurePassword123 \
  -b "dc=example,dc=com" \
  "(objectClass=*)" dn
```

## Adding LDAP Entries over IPv6

```bash
# Add a test user via IPv6
ldapadd -x -H ldap://[2001:db8::1]:389 \
  -D "cn=Directory Manager" \
  -w SecurePassword123 << 'EOF'
dn: uid=testuser,ou=People,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: top
cn: Test User
sn: User
uid: testuser
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/testuser
loginShell: /bin/bash
userPassword: UserPassword123
EOF
```

## Configuring TLS for IPv6 LDAPS

```bash
# Check current TLS configuration
dsconf myldap security get

# Show the certificate LDAPS is presenting
dsctl myldap tls show-server-cert

# Import a PEM server certificate and matching private key
dsctl myldap tls import-server-key-cert /path/to/server-cert.pem /path/to/server-key.pem

# Enable LDAPS with the imported certificate
dsconf myldap security enable --cert-name Server-Cert

# Restart with the updated certificate
sudo systemctl restart dirsrv@myldap
```

## Monitoring 389 DS IPv6 Connections

```bash
# Monitor connection activity
dsconf myldap monitor server | grep -i "currentconnections\|totalconnections"

# View access log for IPv6 client connections
sudo tail -f /var/log/dirsrv/slapd-myldap/access | grep "connection from"

# Check error log
sudo tail -50 /var/log/dirsrv/slapd-myldap/errors

# Get performance statistics
dsconf myldap monitor server
```

389 Directory Server's configurable listen host feature and robust ACL system make it well-suited for IPv6 deployments, whether as a standalone LDAP server or as the backend for Red Hat Identity Management.
