# How to Integrate 389 Directory Server with SSSD on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, SSSD, LDAP, Authentication, Linux

Description: Configure SSSD on RHEL clients to authenticate users against a 389 Directory Server, enabling centralized identity management.

---

SSSD (System Security Services Daemon) provides a way for RHEL clients to authenticate against a remote 389 Directory Server. This setup enables centralized user management where accounts in the LDAP directory can log into any connected RHEL machine.

## Install SSSD and Required Packages

```bash
# Install SSSD with LDAP provider support
sudo dnf install -y sssd sssd-ldap oddjob-mkhomedir
```

## Configure SSSD

Edit the SSSD configuration file to point at your 389 DS instance.

```bash
# Create the SSSD configuration file
sudo tee /etc/sssd/sssd.conf > /dev/null << 'EOF'
[sssd]
services = nss, pam
domains = example.com

[domain/example.com]
# Use LDAP as the identity and authentication provider
id_provider = ldap
auth_provider = ldap

# LDAP server URI - use ldaps for encrypted connections
ldap_uri = ldaps://ldap.example.com

# Base DN for user and group searches
ldap_search_base = dc=example,dc=com

# Bind credentials for SSSD to search the directory
ldap_default_bind_dn = cn=Directory Manager
ldap_default_authtok = your_password_here

# TLS settings
ldap_tls_reqcert = demand
ldap_tls_cacert = /etc/pki/tls/certs/ca-bundle.crt

# User and group object class mappings
ldap_user_object_class = inetOrgPerson
ldap_group_object_class = groupOfNames
EOF

# Set strict permissions - SSSD requires 0600
sudo chmod 0600 /etc/sssd/sssd.conf
```

## Enable Automatic Home Directory Creation

When LDAP users log in for the first time, they need a home directory.

```bash
# Enable oddjobd for automatic home directory creation
sudo systemctl enable --now oddjobd

# Configure authselect to use SSSD with home directory creation
sudo authselect select sssd with-mkhomedir --force
```

## Start and Enable SSSD

```bash
# Enable and start the SSSD service
sudo systemctl enable --now sssd

# Check that SSSD is running without errors
sudo systemctl status sssd
```

## Test the Integration

```bash
# Look up an LDAP user using getent
getent passwd jdoe

# Verify group resolution
getent group engineering

# Test SSH login as an LDAP user
ssh jdoe@localhost
```

## Troubleshooting

```bash
# Increase SSSD log verbosity for debugging
sudo sss_debuglevel 6

# Check SSSD logs for connection issues
sudo journalctl -u sssd -f

# Clear the SSSD cache if stale data appears
sudo sss_cache -E
sudo systemctl restart sssd
```

If user lookups fail, verify that your LDAP base DN and object class mappings match your 389 DS schema. The `ldapsearch` command is useful for testing connectivity independently of SSSD.
