# How to Set Up 389 Directory Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, 389 Directory Server, Authentication, Active Directory

Description: A complete guide to installing and configuring 389 Directory Server on Ubuntu for enterprise LDAP authentication and directory services.

---

389 Directory Server (formerly known as Fedora Directory Server) is a production-grade LDAP server used by organizations that need a high-performance, feature-rich directory service. It supports multi-master replication, role-based access control, and a comprehensive web console. If you are moving away from OpenLDAP or need an alternative to Active Directory, 389 DS is a solid choice.

## Prerequisites

- Ubuntu 22.04 LTS (the package availability improved significantly on 22.04)
- At least 2 GB RAM (4 GB recommended for production)
- A properly configured hostname with forward and reverse DNS
- Root or sudo access

### Configure Hostname

389 DS relies on a fully qualified domain name (FQDN). Set the hostname before installing:

```bash
# Set the hostname
sudo hostnamectl set-hostname ldap.example.com

# Add the hostname to /etc/hosts if DNS is not configured
echo "127.0.1.1 ldap.example.com ldap" | sudo tee -a /etc/hosts

# Verify
hostname -f
# Output: ldap.example.com
```

## Installing 389 Directory Server

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install 389 Directory Server
sudo apt install -y 389-ds-base 389-ds-base-libs

# Verify the installation
dsctl --version
```

## Creating a Directory Server Instance

389 DS uses a tool called `dscreate` to set up instances. You can run it interactively or use an INF file for automation.

### Interactive Setup

```bash
# Run the interactive setup wizard
sudo dscreate interactive
```

The wizard asks for:
- Instance name (e.g., `ldap`)
- Port numbers (default: 389 for LDAP, 636 for LDAPS)
- Root DN (default: `cn=Directory Manager`)
- Root password
- Suffix (e.g., `dc=example,dc=com`)

### Automated Setup with INF File

For repeatable deployments, use an INF file:

```bash
# Create the setup INF file
sudo tee /tmp/389ds-setup.inf > /dev/null <<'EOF'
[general]
config_version = 2

[slapd]
instance_name = ldap
root_password = SecurePassword123!
port = 389
secure_port = 636

[backend-userroot]
suffix = dc=example,dc=com
sample_entries = yes
EOF

# Create the instance
sudo dscreate from-file /tmp/389ds-setup.inf

# Remove the INF file (it contains a password)
rm /tmp/389ds-setup.inf
```

## Managing the Instance

```bash
# Start the directory server instance
sudo dsctl ldap start

# Stop the instance
sudo dsctl ldap stop

# Restart the instance
sudo dsctl ldap restart

# Check instance status
sudo dsctl ldap status

# Enable the service to start at boot
sudo systemctl enable dirsrv@ldap
```

## Verifying the Installation

```bash
# Install LDAP client tools
sudo apt install -y ldap-utils

# Test a connection to the directory server
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" -D "cn=Directory Manager" -W

# If sample entries were enabled, search for them
ldapsearch -x -H ldap://localhost -b "dc=example,dc=com" "(objectClass=*)" dn
```

## Configuring Basic Structure

After setup, create the organizational structure for your directory:

```bash
# Create an LDIF file to add organizational units
cat > /tmp/structure.ldif <<'EOF'
# People OU
dn: ou=People,dc=example,dc=com
objectClass: organizationalUnit
ou: People

# Groups OU
dn: ou=Groups,dc=example,dc=com
objectClass: organizationalUnit
ou: Groups

# Service Accounts OU
dn: ou=ServiceAccounts,dc=example,dc=com
objectClass: organizationalUnit
ou: ServiceAccounts
EOF

# Add the structure to the directory
ldapadd -x -H ldap://localhost -D "cn=Directory Manager" -W -f /tmp/structure.ldif
```

### Adding User Accounts

```bash
# Create an LDIF file for a user
cat > /tmp/user.ldif <<'EOF'
dn: uid=jsmith,ou=People,dc=example,dc=com
objectClass: inetOrgPerson
objectClass: posixAccount
objectClass: shadowAccount
uid: jsmith
cn: John Smith
sn: Smith
givenName: John
mail: jsmith@example.com
uidNumber: 10001
gidNumber: 10001
homeDirectory: /home/jsmith
loginShell: /bin/bash
userPassword: {SSHA}hashedpasswordhere
EOF

# Add the user
ldapadd -x -H ldap://localhost -D "cn=Directory Manager" -W -f /tmp/user.ldif

# Set the user password securely
ldappasswd -x -H ldap://localhost -D "cn=Directory Manager" -W \
  -s "UserPassword123!" \
  "uid=jsmith,ou=People,dc=example,dc=com"
```

## Enabling TLS/LDAPS

Secure your directory server with TLS:

```bash
# Install certbot for Let's Encrypt certificates (if public domain)
sudo apt install -y certbot
sudo certbot certonly --standalone -d ldap.example.com

# Or generate a self-signed certificate for internal use
sudo openssl req -newkey rsa:4096 -x509 -days 3650 -nodes \
  -out /etc/dirsrv/slapd-ldap/server.crt \
  -keyout /etc/dirsrv/slapd-ldap/server.key \
  -subj "/CN=ldap.example.com"

# Set correct permissions
sudo chown dirsrv:dirsrv /etc/dirsrv/slapd-ldap/server.crt \
  /etc/dirsrv/slapd-ldap/server.key
sudo chmod 640 /etc/dirsrv/slapd-ldap/server.crt \
  /etc/dirsrv/slapd-ldap/server.key

# Enable TLS using dsconf
sudo dsconf ldap security set \
  --tls-protocol-min TLS1.2 \
  --nss-cert-name Server-Cert

# Import the certificate
sudo dsctl ldap tls import-server-key-cert \
  /etc/dirsrv/slapd-ldap/server.key \
  /etc/dirsrv/slapd-ldap/server.crt

sudo dsctl ldap restart
```

## Installing the Web Console

The 389 DS web console provides a browser-based management interface:

```bash
# Install the cockpit-389-ds module
sudo apt install -y cockpit cockpit-389-ds

# Enable and start cockpit
sudo systemctl enable --now cockpit.socket

# Allow cockpit through the firewall
sudo ufw allow 9090/tcp

# Access the web console at:
# https://your-server:9090
# Login with your Ubuntu user credentials, then navigate to 389 Directory Server
```

## Firewall Configuration

```bash
# Allow LDAP and LDAPS ports
sudo ufw allow 389/tcp comment "LDAP"
sudo ufw allow 636/tcp comment "LDAPS"
sudo ufw reload
```

## Basic Replication Setup

For high availability, 389 DS supports multi-master replication. This is a simplified overview of enabling replication on a supplier:

```bash
# Enable replication on the supplier server
sudo dsconf ldap replication enable \
  --suffix "dc=example,dc=com" \
  --role supplier \
  --replica-id 1 \
  --bind-dn "cn=replication manager,cn=config" \
  --bind-passwd "ReplPassword123!"
```

Configuring a full replication topology requires setting up consumer servers and replication agreements, which depends on your network topology and redundancy requirements.

389 Directory Server is a capable, enterprise-ready LDAP server that serves as a solid foundation for centralized authentication in Linux environments. Once running, applications like OpenVPN, Apache, Postfix, and Samba can authenticate against it via standard LDAP queries.
