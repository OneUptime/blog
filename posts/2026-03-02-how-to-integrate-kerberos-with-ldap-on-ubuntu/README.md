# How to Integrate Kerberos with LDAP on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kerberos, LDAP, OpenLDAP, Authentication

Description: Integrate MIT Kerberos with OpenLDAP on Ubuntu to store Kerberos principals in LDAP, enabling unified identity management.

---

Running Kerberos and LDAP separately means maintaining two user stores. When a user is created or deleted, you need to update both systems. Integrating them solves this: store Kerberos principal data in LDAP, so user management happens in one place. This configuration is sometimes called "Kerberos over LDAP" or "MIT Kerberos with LDAP backend."

## How the Integration Works

In the standard MIT Kerberos setup, the KDC stores principals in its own Berkeley DB database. In the LDAP backend setup:

- The KDC reads and writes principal data to OpenLDAP
- POSIX account attributes (`uid`, `uidNumber`, etc.) and Kerberos attributes (`krb5Principal`, `krb5EncryptionType`, etc.) coexist on the same LDAP entry
- SSSD can provide both identity (from POSIX attributes) and authentication (from Kerberos) using a single directory lookup

## Prerequisites

- Ubuntu 22.04 with OpenLDAP installed (`slapd`)
- MIT Kerberos packages installed
- Base DN: `dc=example,dc=com`
- Realm: `EXAMPLE.COM`

## Step 1: Load the Kerberos Schema into OpenLDAP

MIT Kerberos ships with an LDAP schema. Load it into slapd:

```bash
# Find the schema file
find /usr/share -name "kerberos*.ldif" 2>/dev/null
# Usually: /usr/share/doc/krb5-kdc-ldap/kerberos.schema.gz

# Install the LDAP KDC backend package
sudo apt install -y krb5-kdc-ldap ldap-utils

# Decompress if needed
sudo gunzip /usr/share/doc/krb5-kdc-ldap/kerberos.schema.gz 2>/dev/null || true

# Convert schema to LDIF if it's in .schema format
mkdir -p /tmp/krb5-schema-output
cat > /tmp/krb5-schema.conf << 'EOF'
include /usr/share/doc/krb5-kdc-ldap/kerberos.schema
EOF

sudo slaptest -f /tmp/krb5-schema.conf -F /tmp/krb5-schema-output/

# The output file will be named something like cn={1}kerberos.ldif
# Fix the dn to match what OpenLDAP expects
sudo sed -i 's/dn: cn={1}kerberos/dn: cn=kerberos/' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i 's/cn: {1}kerberos/cn: kerberos/' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^structuralObjectClass/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^entryUUID/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^creatorsName/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^createTimestamp/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^entryCSN/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^modifiersName/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
sudo sed -i '/^modifyTimestamp/d' \
  /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif

# Add the schema
sudo ldapadd -Y EXTERNAL -H ldapi:/// \
  -f /tmp/krb5-schema-output/cn=config/cn=schema/cn={1}kerberos.ldif
```

## Step 2: Create a Kerberos Service Account in LDAP

The KDC needs a dedicated account to read and write principal data:

```bash
# Generate a password hash
slappasswd -s "KerberosLDAPSecret!"
```

```ldif
# Save as kdc-service.ldif
dn: cn=kdc-service,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: kdc-service
description: KDC service account for LDAP backend
userPassword: {SSHA}GeneratedHashHere
```

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f kdc-service.ldif
```

## Step 3: Create a Kerberos Container in LDAP

```ldif
# Save as kerberos-container.ldif
dn: cn=krbContainer,dc=example,dc=com
objectClass: krbContainer
cn: krbContainer
```

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f kerberos-container.ldif
```

## Step 4: Configure ACLs for the KDC Account

The KDC service account needs write access to the Kerberos container:

```ldif
# Append to existing ACLs or create acl-kerberos.ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcAccess
olcAccess: {0}to dn.subtree="cn=krbContainer,dc=example,dc=com"
  by dn.exact="cn=kdc-service,dc=example,dc=com" write
  by dn.exact="cn=admin,dc=example,dc=com" write
  by * none
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f acl-kerberos.ldif
```

## Step 5: Configure the KDC to Use LDAP

Edit `kdc.conf` to switch to the LDAP backend:

```bash
sudo nano /etc/krb5kdc/kdc.conf
```

```ini
[kdcdefaults]
    kdc_listen = 88
    kdc_tcp_listen = 88

[realms]
    EXAMPLE.COM = {
        # Use LDAP backend
        database_module = openldap_ldapconf
    }

[dbdefaults]
    ldap_kerberos_container_dn = cn=krbContainer,dc=example,dc=com

[dbmodules]
    openldap_ldapconf = {
        db_library = kldap

        # LDAP server to connect to
        ldap_servers = ldap://localhost

        # Service account for KDC
        ldap_kdc_dn = cn=kdc-service,dc=example,dc=com
        ldap_kadmind_dn = cn=kdc-service,dc=example,dc=com

        # Subtree where principals are stored
        ldap_kerberos_container_dn = cn=krbContainer,dc=example,dc=com
        ldap_kdc_sasl_mech = EXTERNAL

        # TLS settings
        ldap_conns_per_server = 5
    }
```

Store the LDAP password in the KDC stash file:

```bash
sudo kdb5_ldap_util stashsrvpw -f /etc/krb5kdc/service.keyfile \
  cn=kdc-service,dc=example,dc=com
# Enter the KDC service account password when prompted
```

Update `kdc.conf` to reference the keyfile:

```ini
[dbmodules]
    openldap_ldapconf = {
        # ... other settings ...
        ldap_service_password_file = /etc/krb5kdc/service.keyfile
    }
```

## Step 6: Create the Kerberos Realm in LDAP

Use `kdb5_ldap_util` to initialize the realm in LDAP:

```bash
sudo kdb5_ldap_util -D "cn=admin,dc=example,dc=com" \
  -H ldap://localhost \
  create -r EXAMPLE.COM -s -P

# Enter the LDAP admin password, then set the KDC master key
```

Verify the realm was created in LDAP:

```bash
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -b "cn=krbContainer,dc=example,dc=com" \
  "(objectClass=*)"
```

## Step 7: Start the KDC

```bash
sudo systemctl restart krb5-kdc krb5-admin-server
sudo systemctl status krb5-kdc
```

## Step 8: Link POSIX Users to Kerberos Principals

With the LDAP backend, each LDAP user entry can store Kerberos attributes directly. Add Kerberos attributes to existing users:

```ldif
# Link POSIX user to Kerberos principal
dn: uid=jsmith,ou=People,dc=example,dc=com
changetype: modify
add: objectClass
objectClass: krbPrincipalAux
-
add: krbPrincipalName
krbPrincipalName: jsmith@EXAMPLE.COM
```

```bash
ldapmodify -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f link-kerberos.ldif
```

Then create the principal in Kerberos:

```bash
sudo kadmin.local -q "addprinc jsmith"
```

## Verifying the Integration

```bash
# Test Kerberos authentication
kinit jsmith

# Verify the principal is stored in LDAP
ldapsearch -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W \
  -b "cn=krbContainer,dc=example,dc=com" \
  "(krbPrincipalName=jsmith@EXAMPLE.COM)"

# List all Kerberos principals via kadmin
sudo kadmin.local -q "listprincs"
```

## Configuring SSSD to Use Both

With this integration, configure SSSD to get identity from LDAP and authentication from Kerberos:

```ini
# /etc/sssd/sssd.conf
[domain/example.com]
id_provider = ldap
auth_provider = krb5

ldap_uri = ldap://localhost
ldap_search_base = dc=example,dc=com

krb5_realm = EXAMPLE.COM
krb5_server = kdc.example.com
krb5_store_password_if_offline = true
```

This is the recommended production setup: LDAP handles user/group information, Kerberos handles passwords and ticket issuance.

## Troubleshooting

**KDC not starting after LDAP backend switch** - check that the stash file exists and is readable: `ls -la /etc/krb5kdc/service.keyfile`.

**"ldap_bind: Invalid credentials"** - verify the KDC service account password stored with `kdb5_ldap_util stashsrvpw` matches the account's LDAP password.

**Principal not found** - ensure the realm container was created in LDAP and the KDC is pointing at the right `ldap_kerberos_container_dn`.

This integrated setup gives you a single source of truth for user identity, simplifying account lifecycle management in environments that need both POSIX authentication and Kerberos SSO.
