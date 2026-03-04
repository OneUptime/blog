# How to Set Up Multi-Master Replication in 389 Directory Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, 389 Directory Server, LDAP, Replication, High Availability

Description: Configure multi-master replication between two 389 Directory Server instances on RHEL for high availability and load balancing of LDAP services.

---

Multi-master replication allows two or more 389 Directory Server instances to accept write operations and replicate changes to each other. This provides high availability and geographic redundancy for your LDAP infrastructure.

## Prerequisites

- Two RHEL servers with 389 Directory Server installed and configured
- Both instances must share the same suffix (e.g., `dc=example,dc=com`)
- Network connectivity between servers on LDAP ports (389/636)

## Enable Replication on Server 1

```bash
# Enable the replication plugin and configure as a supplier
sudo dsconf ldap1 replication enable \
    --suffix "dc=example,dc=com" \
    --role supplier \
    --replica-id 1 \
    --bind-dn "cn=replication manager,cn=config" \
    --bind-passwd "ReplicaPass123"
```

## Enable Replication on Server 2

```bash
# Enable replication on the second server with a different replica ID
sudo dsconf ldap2 replication enable \
    --suffix "dc=example,dc=com" \
    --role supplier \
    --replica-id 2 \
    --bind-dn "cn=replication manager,cn=config" \
    --bind-passwd "ReplicaPass123"
```

## Create Replication Agreements

### Server 1 to Server 2

```bash
# Create an agreement on server 1 to replicate to server 2
sudo dsconf ldap1 repl-agmt create \
    --suffix "dc=example,dc=com" \
    --host ldap2.example.com \
    --port 636 \
    --conn-protocol LDAPS \
    --bind-dn "cn=replication manager,cn=config" \
    --bind-passwd "ReplicaPass123" \
    --bind-method SIMPLE \
    "agmt-to-ldap2"
```

### Server 2 to Server 1

```bash
# Create an agreement on server 2 to replicate to server 1
sudo dsconf ldap2 repl-agmt create \
    --suffix "dc=example,dc=com" \
    --host ldap1.example.com \
    --port 636 \
    --conn-protocol LDAPS \
    --bind-dn "cn=replication manager,cn=config" \
    --bind-passwd "ReplicaPass123" \
    --bind-method SIMPLE \
    "agmt-to-ldap1"
```

## Initialize Replication

One server must send its data to the other to establish the initial sync:

```bash
# Initialize server 2 from server 1
sudo dsconf ldap1 repl-agmt init --suffix "dc=example,dc=com" "agmt-to-ldap2"

# Check initialization status
sudo dsconf ldap1 repl-agmt init-status --suffix "dc=example,dc=com" "agmt-to-ldap2"
# Wait until it shows "Agreement successfully initialized"
```

## Verify Replication

```bash
# Check replication status on server 1
sudo dsconf ldap1 repl-agmt status --suffix "dc=example,dc=com" "agmt-to-ldap2"

# Check replication status on server 2
sudo dsconf ldap2 repl-agmt status --suffix "dc=example,dc=com" "agmt-to-ldap1"

# Test by adding a user on server 1 and verifying it appears on server 2
sudo dsidm ldap1 -b "dc=example,dc=com" user create \
    --uid testuser --cn "Test User" --displayName "Test User" \
    --uidNumber 3001 --gidNumber 3001 --homeDirectory /home/testuser

# Check on server 2
ldapsearch -x -H ldap://ldap2.example.com -b "dc=example,dc=com" "(uid=testuser)"
```

## Monitor Replication Lag

```bash
# View the replication lag (CSN difference)
sudo dsconf ldap1 repl-agmt status --suffix "dc=example,dc=com" "agmt-to-ldap2" | grep -i lag

# Check the changelog
sudo dsconf ldap1 replication get-changelog
```

## Handle Replication Conflicts

```bash
# Search for replication conflicts
ldapsearch -x -H ldap://ldap1.example.com \
    -D "cn=Directory Manager" -W \
    -b "dc=example,dc=com" "(nsds5ReplConflict=*)"
```

Multi-master replication in 389 Directory Server ensures your RHEL LDAP infrastructure remains available even when one server goes down, with both servers actively handling read and write requests.
