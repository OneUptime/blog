# How to Configure Oracle Database for IPv6 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Oracle Database, IPv6, DBA, TNS, Listeners, Database Networking

Description: Configure Oracle Database listener and TNS settings to accept client connections over IPv6, enabling database access from IPv6 networks and dual-stack environments.

---

Oracle Database supports IPv6 for client connections through its listener configuration. Enabling IPv6 requires updating the listener.ora to bind to IPv6 addresses and configuring tnsnames.ora for IPv6 connection descriptors.

## Prerequisites for Oracle IPv6

```bash
# Verify OS IPv6 is working

ip -6 addr show scope global

# Verify Oracle OS user can reach IPv6
ping6 -c 3 ::1

# Check Oracle version (11.2+ for full IPv6 support)
sqlplus -V

# Environment
export ORACLE_HOME=/u01/app/oracle/product/19.3.0/dbhome_1
export ORACLE_SID=ORCL
export PATH=$ORACLE_HOME/bin:$PATH
```

## Oracle Listener IPv6 Configuration

```text
# $ORACLE_HOME/network/admin/listener.ora

# Listener with IPv6 (dual-stack)
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = 0.0.0.0)(PORT = 1521))
      (ADDRESS = (PROTOCOL = TCP)(HOST = ::)(PORT = 1521))
    )
  )

# Or bind to specific IPv6 address
LISTENER_IPV6 =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS = (PROTOCOL = TCP)(HOST = 2001:db8::1)(PORT = 1521))
    )
  )

# ADR base for logging
ADR_BASE_LISTENER = /u01/app/oracle

# Enable automatic discovery
ENABLE_GLOBAL_DYNAMIC_ENDPOINT_LISTENER = ON
```

## TNS Client Configuration for IPv6

```text
# $ORACLE_HOME/network/admin/tnsnames.ora

# IPv6 connection descriptor
ORCL_IPV6 =
  (DESCRIPTION =
    (ADDRESS_LIST =
      (ADDRESS = (PROTOCOL = TCP)
                 (HOST = 2001:db8::1)
                 (PORT = 1521))
    )
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL)
    )
  )

# Dual-stack connection (tries both)
ORCL_DUAL =
  (DESCRIPTION =
    (ADDRESS_LIST =
      (ADDRESS = (PROTOCOL = TCP)
                 (HOST = oracle.example.com)
                 (PORT = 1521))
    )
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = ORCL)
    )
  )
# Note: HOST can be FQDN with AAAA record for IPv6 resolution
```

## Starting Oracle Listener with IPv6

```bash
# Start the listener
lsnrctl start LISTENER

# Check listener status (should show IPv6 endpoint)
lsnrctl status LISTENER

# Expected output:
# Listening Endpoints Summary...
#   (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=::)(PORT=1521)))
#   (DESCRIPTION=(ADDRESS=(PROTOCOL=tcp)(HOST=0.0.0.0)(PORT=1521)))

# Verify OS-level binding
ss -6 -tlnp | grep 1521
```

## Testing Oracle Connection over IPv6

```bash
# Test TNS connection over IPv6
tnsping ORCL_IPV6

# Connect with SQLPlus over IPv6
sqlplus system@"(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=2001:db8::1)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ORCL)))"

# Or using tnsnames alias
sqlplus system@ORCL_IPV6

# Test with connection string
sqlplus "system/password@//[2001:db8::1]:1521/ORCL"
```

## Firewall Configuration for Oracle IPv6

```bash
# Allow Oracle listener port over IPv6
sudo ip6tables -A INPUT -p tcp \
  -s 2001:db8:1::/48 \
  --dport 1521 -j ACCEPT

# Allow from specific client
sudo ip6tables -A INPUT -p tcp \
  -s 2001:db8::dba \
  --dport 1521 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6

# Verify access
ss -6 -tlnp | grep 1521
```

## Oracle sqlnet.ora IPv6 Settings

```text
# $ORACLE_HOME/network/admin/sqlnet.ora

# Prefer IPv6 for connections (when dual-stack)
TCP.CONNECT_TIMEOUT = 10

# Note: Oracle resolves hostnames to both A and AAAA
# and connects to the first available

# For IPv6-only clients, disable IPv4:
# NAMES.DIRECTORY_PATH = (EZCONNECT)
# (Relies on OS DNS resolution which uses AAAA)
```

Oracle Database listener IPv6 support via the `HOST = ::` binding in listener.ora allows the TNS listener to accept connections from IPv6 clients, with JDBC thin drivers also supporting IPv6 through bracket notation in connection URLs (`jdbc:oracle:thin:@//[2001:db8::1]:1521/ORCL`).
