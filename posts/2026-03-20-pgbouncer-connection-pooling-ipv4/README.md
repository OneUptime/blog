# How to Set Up PgBouncer Connection Pooling with IPv4 Backend Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PgBouncer, PostgreSQL, IPv4, Connection Pooling, Performance, Database, Configuration

Description: Learn how to configure PgBouncer to pool connections between IPv4 application servers and PostgreSQL backends, reducing connection overhead.

---

PostgreSQL creates one process per client connection, making it expensive to scale to hundreds or thousands of connections. PgBouncer sits between applications and PostgreSQL, multiplexing many client connections into a smaller pool of backend connections.

## PgBouncer Pooling Modes

| Mode | Description | Use Case |
|------|-------------|---------|
| `session` | One backend connection per client session | Compatibility with session-level features |
| `transaction` | Connection returned to pool after each transaction | Best performance for stateless apps |
| `statement` | Connection returned after each statement | Most efficient; no multi-statement transactions |

## Installing PgBouncer

```bash
apt install pgbouncer -y    # Debian/Ubuntu
dnf install pgbouncer -y    # RHEL/Rocky
```

## pgbouncer.ini Configuration

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
# Map client-facing database names to backend IPv4 addresses

# Format: dbname = host=ip port=5432 dbname=actual_db
myapp_db = host=10.0.0.10 port=5432 dbname=production_db
reporting_db = host=10.0.0.11 port=5432 dbname=reporting

# Wildcard: forward any database name to the backend
* = host=10.0.0.10 port=5432

[pgbouncer]
# PgBouncer listening address (IPv4)
listen_addr = 192.168.1.5
listen_port = 5432

# Authentication
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
admin_users = appuser       # Required to run SHOW commands on the admin console

# Pooling mode
pool_mode = transaction

# Connection limits
max_client_conn = 200       # Max clients PgBouncer accepts
default_pool_size = 20      # Backend connections per database/user pair
min_pool_size = 5           # Pre-warm backend connections once the pool is in use
reserve_pool_size = 5       # Extra connections for bursts
reserve_pool_timeout = 5    # Seconds to wait before using reserve pool

# Server connection settings
server_idle_timeout = 600   # Close idle backend connections after 10 min
server_connect_timeout = 15
server_login_retry = 15

# Logging
log_connections = 1
log_disconnections = 1
logfile = /var/log/pgbouncer/pgbouncer.log
pidfile = /var/run/pgbouncer/pgbouncer.pid
```

## userlist.txt - Authentication File

```bash
# /etc/pgbouncer/userlist.txt
# Format: "username" "password"
# Plain-text passwords work with PostgreSQL backends using MD5 or SCRAM authentication

"appuser" "mypassword"
"readonly" "readonlypassword"
```

```bash
# If the backend still uses MD5 authentication, you can store an MD5 hash instead
# Generate the correct md5 hash (password + username concatenated)
echo -n "mypasswordappuser" | md5sum
# Prepend "md5" to the output before placing it in userlist.txt
```

## Starting and Verifying

```bash
systemctl enable --now pgbouncer

# Check that PgBouncer is listening on the IPv4 address
ss -tlnp | grep :5432

# Connect through PgBouncer (same syntax as psql)
psql -h 192.168.1.5 -p 5432 -U appuser myapp_db

# View pool statistics
psql -h 192.168.1.5 -p 5432 -U appuser pgbouncer -c "SHOW POOLS;"
```

## Key Takeaways

- `transaction` pooling mode usually provides the best balance of performance and compatibility for stateless web application backends.
- Set `max_client_conn` to handle the maximum number of application connections expected.
- `default_pool_size` is the key tuning parameter - it controls how many real PostgreSQL connections are maintained.
- Use `SHOW POOLS;` via the PgBouncer admin interface to monitor active and idle connections.
