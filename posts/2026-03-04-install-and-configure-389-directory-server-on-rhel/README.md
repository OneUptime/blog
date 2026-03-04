# How to Install and Configure 389 Directory Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, LDAP, Identity Management, Linux

Description: Install and configure 389 Directory Server on RHEL for centralized LDAP-based authentication and directory services.

---

389 Directory Server is an enterprise-grade LDAP server included in RHEL. It provides centralized user authentication, authorization, and directory services for Linux and mixed-platform environments.

## Install 389 Directory Server

```bash
# Install the 389 Directory Server packages
sudo dnf install -y 389-ds-base

# Verify the installation
dsctl --version
```

## Create a New Instance

Use `dscreate` to set up a new directory server instance:

```bash
# Generate a template configuration
dscreate create-template /tmp/ds-setup.inf
```

Edit the template with your settings:

```bash
cat > /tmp/ds-setup.inf << 'EOF'
[general]
config_version = 2
full_machine_name = ldap.example.com
start = True

[slapd]
instance_name = localhost
port = 389
secure_port = 636
root_dn = cn=Directory Manager
root_password = YourSecurePassword123

[backend-userroot]
suffix = dc=example,dc=com
sample_entries = yes
EOF

# Create the instance
sudo dscreate from-file /tmp/ds-setup.inf
```

## Verify the Instance is Running

```bash
# Check the instance status
sudo dsctl localhost status

# List all instances
sudo dsctl -l

# View the server configuration
sudo dsconf localhost backend list
```

## Add Organizational Units

```bash
# Create organizational units for users and groups
sudo dsidm localhost -b "dc=example,dc=com" organizationalunit create \
    --ou People

sudo dsidm localhost -b "dc=example,dc=com" organizationalunit create \
    --ou Groups
```

## Add Users

```bash
# Add a user
sudo dsidm localhost -b "dc=example,dc=com" user create \
    --uid jdoe \
    --cn "John Doe" \
    --displayName "John Doe" \
    --uidNumber 2001 \
    --gidNumber 2001 \
    --homeDirectory /home/jdoe

# Set the user's password
sudo dsidm localhost -b "dc=example,dc=com" user modify jdoe \
    add:userPassword:changeme123
```

## Add Groups

```bash
# Create a group
sudo dsidm localhost -b "dc=example,dc=com" group create --cn developers

# Add a user to the group
sudo dsidm localhost -b "dc=example,dc=com" group add_member developers \
    "uid=jdoe,ou=People,dc=example,dc=com"
```

## Test LDAP Queries

```bash
# Search for all users
ldapsearch -x -H ldap://localhost -b "ou=People,dc=example,dc=com" "(objectClass=inetOrgPerson)"

# Search for a specific user
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" "(uid=jdoe)"

# Bind as the Directory Manager
ldapsearch -x -H ldap://localhost -D "cn=Directory Manager" -W \
    -b "dc=example,dc=com" "(objectClass=*)"
```

## Configure Firewall

```bash
# Open LDAP and LDAPS ports
sudo firewall-cmd --permanent --add-service=ldap
sudo firewall-cmd --permanent --add-service=ldaps
sudo firewall-cmd --reload
```

## Enable TLS

```bash
# Enable TLS with a self-signed certificate (for testing)
sudo dsconf localhost security enable

# Or import your own certificate
sudo dsconf localhost security certificate add \
    --file /etc/pki/tls/certs/ldap.crt \
    --name "Server-Cert" \
    --primary-cert

# Restart the instance
sudo dsctl localhost restart
```

389 Directory Server on RHEL provides a reliable, performant LDAP service for managing users, groups, and authentication across your organization.
