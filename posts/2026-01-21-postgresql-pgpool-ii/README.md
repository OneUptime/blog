# How to Use Pgpool-II for PostgreSQL Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Pgpool-II, Load Balancing, Connection Pooling, High Availability

Description: A guide to setting up Pgpool-II for PostgreSQL connection pooling, load balancing, and high availability.

---

Pgpool-II provides connection pooling, load balancing, and automatic failover for PostgreSQL. This guide covers setup and configuration.

## Installation

```bash
# Ubuntu/Debian

sudo apt install pgpool2

# RHEL/CentOS
sudo dnf install pgpool-II
```

## Basic Configuration

```conf
# /etc/pgpool2/pgpool.conf

# Clustering mode
backend_clustering_mode = 'streaming_replication'

# Backend servers
backend_hostname0 = 'primary.example.com'
backend_port0 = 5432
backend_weight0 = 1
backend_flag0 = 'ALLOW_TO_FAILOVER'

backend_hostname1 = 'replica1.example.com'
backend_port1 = 5432
backend_weight1 = 1
backend_flag1 = 'ALLOW_TO_FAILOVER'

# Listen settings
listen_addresses = '*'
port = 9999

# Connection pooling
num_init_children = 32
max_pool = 4
child_max_connections = 0

# Load balancing
load_balance_mode = on
```

## Connection Pooling

```conf
# Connection pooling settings
connection_cache = on
num_init_children = 32  # Max client connections / max_pool
max_pool = 4  # Connections per child
```

## Load Balancing

```conf
# Enable load balancing
load_balance_mode = on

# Eligible SELECT queries are load balanced across backends
# Write queries go to primary

# Function lists for load balancing
read_only_function_list = ''
write_function_list = 'currval,lastval,nextval,setval'
```

## Failover Configuration

```conf
# Failover settings
failover_command = '/etc/pgpool2/failover.sh %d %h %p %D %m %H %M %P %r %R'
failover_on_backend_error = on

# Health check
health_check_period = 10
health_check_timeout = 20
health_check_user = 'pgpool'
health_check_password = 'pgpool_pass'
health_check_max_retries = 3
```

## Failover Script

```bash
#!/bin/bash
# /etc/pgpool2/failover.sh

FAILED_NODE_ID=$1
FAILED_HOST=$2
NEW_MAIN_ID=$5
NEW_MAIN_HOST=$6
OLD_PRIMARY_ID=$8

if [ "$FAILED_NODE_ID" -eq "$OLD_PRIMARY_ID" ] && [ "$NEW_MAIN_ID" -ge 0 ]; then
    # Primary failed, promote replica
    ssh -T "$NEW_MAIN_HOST" "sudo -u postgres pg_ctl promote -D /var/lib/postgresql/16/main"
fi
```

## Authentication

```conf
# /etc/pgpool2/pgpool.conf
enable_pool_hba = on

# /etc/pgpool2/pool_hba.conf
host all all 0.0.0.0/0 scram-sha-256

# /etc/pgpool2/pool_passwd
# Generate with: pg_enc -m -k /path/to/.pgpoolkey -u username -p
myuser:AESencryptedpassword
```

## Client Connection

```bash
# Connect through Pgpool-II
psql -h pgpool-host -p 9999 -U myuser -d mydb
```

## Monitoring

```sql
-- Check pool status
SHOW pool_nodes;
SHOW pool_processes;
SHOW pool_pools;
```

## Best Practices

1. **Size pools appropriately** - Based on workload
2. **Configure health checks** - Detect failures
3. **Test failover** - Verify scripts work
4. **Monitor connections** - Pool utilization
5. **Use watchdog** - For Pgpool-II HA

## Conclusion

Pgpool-II provides comprehensive PostgreSQL middleware functionality. Configure for your specific needs - pooling, load balancing, or full HA.
