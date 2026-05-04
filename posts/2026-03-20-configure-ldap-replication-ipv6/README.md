# How to Configure LDAP Replication over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LDAP, Replication, IPv6, OpenLDAP, High Availability, Directory Services

Description: Configure OpenLDAP multi-master and provider-consumer replication over IPv6 to build a highly available directory service on IPv6 networks.

---

LDAP replication ensures directory availability and distributes read load. Setting up replication over IPv6 requires specifying IPv6 URIs for replication connections between providers and consumers.

## OpenLDAP Replication Architecture

```text
Provider (Master)          Consumer (Replica)
[2001:db8::10]:389   →→→   [2001:db8::11]:389
                    LDAP Sync Replication (syncrepl)
```

## Setting Up the Provider (Master Server)

Configure the provider to send changes to consumers:

```bash
# Create provider configuration LDIF

cat > /tmp/provider_sync.ldif << 'EOF'
dn: cn=module{0},cn=config
changetype: modify
# Enable syncprov overlay for the database
add: olcModuleLoad
olcModuleLoad: syncprov

dn: olcOverlay=syncprov,olcDatabase={1}mdb,cn=config
objectClass: olcOverlayConfig
objectClass: olcSyncProvConfig
olcOverlay: syncprov
olcSpCheckpoint: 100 10
olcSpSessionlog: 100
EOF

# Apply the provider configuration
sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/provider_sync.ldif

# Create a replication user on the provider
cat > /tmp/repl_user.ldif << 'EOF'
dn: cn=replicator,dc=example,dc=com
objectClass: simpleSecurityObject
objectClass: organizationalRole
cn: replicator
description: LDAP Replication User
userPassword: ReplicationPassword123
EOF

sudo ldapadd -H ldap://[::1]:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w adminpassword \
  -f /tmp/repl_user.ldif
```

## Setting Up the Consumer (Replica Server)

Configure the consumer to pull changes from the provider using IPv6:

```bash
# Configure syncrepl on the consumer
cat > /tmp/consumer_sync.ldif << 'EOF'
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcSyncRepl
# Use IPv6 URI for the provider connection
olcSyncRepl: rid=001
  provider=ldap://[2001:db8::10]:389
  type=refreshAndPersist
  searchbase="dc=example,dc=com"
  scope=sub
  schemachecking=on
  bindmethod=simple
  binddn="cn=replicator,dc=example,dc=com"
  credentials=ReplicationPassword123
  logbase="cn=accesslog"
  logfilter="(&(objectClass=auditWriteObject)(reqResult=0))"
  syncdata=accesslog
  retry="5 5 300 5"
EOF

sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/consumer_sync.ldif
```

## Configuring Mirror Mode (Multi-Master)

For active-active replication between two servers:

```bash
# On both servers, add the mirroring configuration
cat > /tmp/mirror_mode.ldif << 'EOF'
dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcMirrorMode
olcMirrorMode: TRUE

dn: olcDatabase={1}mdb,cn=config
changetype: modify
add: olcSyncRepl
# Server 1 replicates from Server 2 (IPv6 URI)
olcSyncRepl: rid=001
  provider=ldap://[2001:db8::11]:389
  type=refreshAndPersist
  searchbase="dc=example,dc=com"
  scope=sub
  bindmethod=simple
  binddn="cn=replicator,dc=example,dc=com"
  credentials=ReplicationPassword123
  retry="5 5 300 5"
  schemachecking=on

add: olcUpdateRef
olcUpdateRef: ldap://[2001:db8::10]:389
EOF

sudo ldapmodify -Y EXTERNAL -H ldapi:/// -f /tmp/mirror_mode.ldif
```

## Verifying Replication over IPv6

```bash
# Add a test entry on the provider
ldapadd -H ldap://[2001:db8::10]:389 \
  -D "cn=admin,dc=example,dc=com" \
  -w adminpassword << 'EOF'
dn: uid=repltest,ou=People,dc=example,dc=com
objectClass: inetOrgPerson
cn: Replication Test
sn: Test
uid: repltest
EOF

# Check the entry on the consumer (within a few seconds)
ldapsearch -H ldap://[2001:db8::11]:389 \
  -x \
  -b "dc=example,dc=com" \
  "(uid=repltest)" cn uid

# Check replication context CSN on both servers
ldapsearch -H ldap://[2001:db8::10]:389 -x \
  -D "cn=admin,dc=example,dc=com" -w adminpassword \
  -b "dc=example,dc=com" -s base "(objectClass=*)" contextCSN

ldapsearch -H ldap://[2001:db8::11]:389 -x \
  -D "cn=admin,dc=example,dc=com" -w adminpassword \
  -b "dc=example,dc=com" -s base contextCSN
# CSNs should be identical when fully replicated
```

## Monitoring Replication Status

```bash
# Check replication errors in slapd logs
sudo journalctl -u slapd | grep -i "repl\|sync\|error"

# Monitor accesslog for replication activity
sudo ldapsearch -H ldapi:/// \
  -Y EXTERNAL \
  -b "cn=accesslog" \
  "(reqType=modify)" reqDN reqResult | tail -20

# Test replication latency
time ldapadd -H ldap://[2001:db8::10]:389 ... && \
  ldapsearch -H ldap://[2001:db8::11]:389 ...
```

LDAP replication over IPv6 using syncrepl provides a reliable foundation for high-availability directory services in IPv6 networks, with the same rich replication features available in IPv4 deployments.
