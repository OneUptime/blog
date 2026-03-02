# How to Set Up OpenLDAP Replication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenLDAP, LDAP, Replication, High Availability

Description: Configure OpenLDAP replication on Ubuntu using syncrepl to build a provider-consumer setup for high availability and load distribution.

---

Running a single OpenLDAP server is a single point of failure for any system that relies on it for authentication. If your LDAP server goes down, users cannot log in anywhere. OpenLDAP replication solves this by keeping copies of the directory on multiple servers, ensuring availability even when one server fails.

OpenLDAP supports replication through the `syncrepl` mechanism, which uses the LDAP Content Synchronization protocol. The two main deployment modes are:

- **Provider-Consumer (formerly Master-Slave)** - writes go to the provider, consumers pull changes
- **Multi-Master (N-Way Multi-Provider)** - writes accepted on any node, all nodes sync with each other

This guide covers provider-consumer replication, which is simpler and suitable for most deployments.

## Environment

- Provider (writable): `ldap1.example.com` (192.168.1.10)
- Consumer (read-only replica): `ldap2.example.com` (192.168.1.11)
- Both running Ubuntu 22.04 with OpenLDAP installed

## Step 1: Configure the Provider

### Enable the syncprov Overlay

The `syncprov` (Sync Provider) overlay must be enabled on the provider. Use LDAP Dynamic Configuration:

```bash
# On ldap1 (the provider)
sudo nano /tmp/syncprov-overlay.ldif
```

```ldif
# Load the syncprov module
dn: cn=module{0},cn=config
changetype: modify
add: olcModuleLoad
olcModuleLoad: syncprov

# Add syncprov overlay to the database
dn: olcOverlay=syncprov,olcDatabase={1}mdb,cn=config
objectClass: olcOverlayConfig
objectClass: olcSyncProvConfig
olcOverlay: syncprov
olcSpSessionLog: 100
olcSpCheckpoint: 100 10
```

```bash
# Apply with root credentials (SASL EXTERNAL via socket)
sudo ldapadd -Y EXTERNAL -H ldapi:/// -f /tmp/syncprov-overlay.ldif
```

### Create a Replication User on the Provider

The consumer will bind to the provider with a dedicated replication account:

```ldif
# Save as replication-user.ldif
dn: cn=replicator,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: replicator
description: LDAP replication account
userPassword: {SSHA}ReplPasswordHashHere
```

Generate the password hash first:

```bash
slappasswd -s "ReplicationSecret!"
```

```bash
ldapadd -x -H ldap://localhost \
  -D "cn=admin,dc=example,dc=com" \
  -W -f replication-user.ldif
```

### Grant Replication Access

The replicator account needs read access to all entries including passwords:

```ldif
# Save as replication-acl.ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
replace: olcAccess
olcAccess: {0}to attrs=userPassword
  by dn="cn=replicator,dc=example,dc=com" read
  by dn="cn=admin,dc=example,dc=com" write
  by anonymous auth
  by * none
olcAccess: {1}to *
  by dn="cn=replicator,dc=example,dc=com" read
  by dn="cn=admin,dc=example,dc=com" write
  by self write
  by * read
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f replication-acl.ldif
```

## Step 2: Configure the Consumer

On `ldap2.example.com`, install OpenLDAP with the same base DN and admin password:

```bash
sudo apt install -y slapd ldap-utils
sudo dpkg-reconfigure slapd
# Use same domain: example.com
# Same organization name
```

### Add syncrepl Configuration

```bash
sudo nano /tmp/consumer-syncrepl.ldif
```

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcSyncRepl
olcSyncRepl: rid=001
  provider=ldap://ldap1.example.com:389
  type=refreshAndPersist
  retry="5 5 300 +"
  searchbase="dc=example,dc=com"
  attrs="*,+"
  bindmethod=simple
  binddn="cn=replicator,dc=example,dc=com"
  credentials=ReplicationSecret!
  starttls=yes
  tls_cacert=/etc/ssl/certs/ca-certificates.crt
  tls_reqcert=demand
  logbase="cn=accesslog"
  logfilter="(&(objectClass=auditWriteObject)(reqResult=0))"
  syncdata=accesslog
add: olcUpdateRef
olcUpdateRef: ldap://ldap1.example.com
```

```bash
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/consumer-syncrepl.ldif
```

The `olcUpdateRef` tells clients to send write operations to the provider when they contact the consumer.

### Simpler syncrepl Without Accesslog

If you have not configured the accesslog overlay, use a simpler syncrepl configuration without `logbase`:

```ldif
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcSyncRepl
olcSyncRepl: rid=001
  provider=ldap://ldap1.example.com:389
  type=refreshAndPersist
  retry="5 5 300 +"
  searchbase="dc=example,dc=com"
  attrs="*,+"
  bindmethod=simple
  binddn="cn=replicator,dc=example,dc=com"
  credentials=ReplicationSecret!
  starttls=yes
  tls_cacert=/etc/ssl/certs/ca-certificates.crt
```

## Step 3: Verify Replication

### Check Initial Sync

After starting slapd on the consumer, it will perform an initial full sync from the provider:

```bash
# On consumer - watch the logs
sudo journalctl -u slapd -f

# Wait for "do_syncrepl: rid=001 inserted" messages
```

### Verify Data is Replicated

```bash
# On consumer - search should return same data as provider
ldapsearch -x -H ldap://ldap2.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W "(objectClass=posixAccount)"
```

### Test Write Referral

```bash
# Attempt a write on the consumer - should get referral back to provider
ldapmodify -x -H ldap://ldap2.example.com \
  -D "cn=admin,dc=example,dc=com" \
  -W << EOF
dn: uid=testuser,ou=People,dc=example,dc=com
changetype: add
objectClass: inetOrgPerson
uid: testuser
cn: Test User
sn: User
EOF
```

With `olcUpdateRef` set, the client receives a referral to `ldap://ldap1.example.com` and should retry the write there. Many LDAP clients handle referrals transparently.

## Monitoring Replication

### Check Replication Status via csn

The `contextCSN` attribute tracks the most recent change sequence number. Compare between provider and consumer:

```bash
# On provider
ldapsearch -x -H ldap://ldap1.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -s base contextCSN

# On consumer (should match)
ldapsearch -x -H ldap://ldap2.example.com \
  -b "dc=example,dc=com" \
  -D "cn=admin,dc=example,dc=com" \
  -W -s base contextCSN
```

If the CSNs match, replication is in sync.

### Monitor via slapd Logs

```bash
# On consumer
sudo journalctl -u slapd | grep -E "syncrepl|rid=001"
```

## Delta-Sync with Accesslog Overlay

For efficiency with large directories, enable delta-sync using the accesslog overlay on the provider. This sends only changes rather than full entries:

```ldif
# Load accesslog module and create accesslog database
dn: cn=module{0},cn=config
changetype: modify
add: olcModuleLoad
olcModuleLoad: accesslog

dn: olcDatabase={2}mdb,cn=config
objectClass: olcDatabaseConfig
objectClass: olcMdbConfig
olcDatabase: mdb
olcDbDirectory: /var/lib/ldap/accesslog
olcSuffix: cn=accesslog
olcAccess: {0}to * by dn.base="cn=replicator,dc=example,dc=com" read by * none
olcDbIndex: default eq
olcDbIndex: entryCSN,objectClass,reqEnd,reqResult,reqStart
```

```bash
sudo mkdir -p /var/lib/ldap/accesslog
sudo chown openldap:openldap /var/lib/ldap/accesslog
sudo ldapadd -Y EXTERNAL -H ldapi:/// -f accesslog-db.ldif
```

## Firewall Rules

```bash
# On the provider - allow LDAP from consumer
sudo ufw allow from 192.168.1.11 to any port 389
sudo ufw allow from 192.168.1.11 to any port 636
```

## Troubleshooting

**Consumer shows "Can't contact LDAP server"** - verify network connectivity, firewall rules, and that slapd is listening on the correct interface on the provider.

**"Invalid credentials" for replicator** - double-check the password in `olcSyncRepl` matches the stored hash on the provider.

**contextCSN not matching** - check consumer logs for replication errors; may be a TLS certificate issue or network interruption.

With replication running, point your LDAP clients at both servers (or use a round-robin DNS or load balancer) to distribute load and maintain availability.
