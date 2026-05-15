# How to Set Up pgpool-II for PostgreSQL Connection Pooling on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PostgreSQL, Pgpool-II, Connection Pooling, Load Balancing, Database

Description: Install and configure pgpool-II on RHEL to provide connection pooling, load balancing, and automatic failover for PostgreSQL database clusters.

---

pgpool-II sits between your application and PostgreSQL, providing connection pooling, read query load balancing across replicas, and automatic failover. This reduces the number of connections PostgreSQL handles and distributes read queries for better performance.

## Install pgpool-II

```bash
# Install the pgpool-II YUM repository

sudo dnf install -y https://www.pgpool.net/yum/rpms/4.5/redhat/rhel-9-x86_64/pgpool-II-release-4.5-1.noarch.rpm

# Install pgpool-II for PostgreSQL 16
sudo dnf install -y pgpool-II-pg16

# Optional: install the extension package on PostgreSQL servers for online recovery
sudo dnf install -y pgpool-II-pg16-extensions
```

## Configure Connection Pooling

```bash
# Edit the main configuration file
sudo vi /etc/pgpool-II/pgpool.conf
```

Key settings:

```bash
# /etc/pgpool-II/pgpool.conf

# Listen on all interfaces
listen_addresses = '*'
port = 9999

# Backend PostgreSQL servers
backend_hostname0 = '192.168.1.50'
backend_port0 = 5432
backend_weight0 = 1
backend_data_directory0 = '/var/lib/pgsql/16/data'
backend_flag0 = 'ALLOW_TO_FAILOVER'

backend_hostname1 = '192.168.1.51'
backend_port1 = 5432
backend_weight1 = 1
backend_data_directory1 = '/var/lib/pgsql/16/data'
backend_flag1 = 'ALLOW_TO_FAILOVER'

# Connection pooling settings
connection_cache = on
num_init_children = 32
max_pool = 4

# Pool process lifecycle
child_life_time = 300
child_max_connections = 0
connection_life_time = 0
client_idle_limit = 0
```

## Configure Load Balancing

```bash
# Enable load balancing (distributes eligible SELECT queries across backends)
load_balance_mode = on

# Streaming replication mode
backend_clustering_mode = 'streaming_replication'

# Replication delay threshold (bytes) - do not send reads to lagging replicas
delay_threshold = 10000000

# Functions that always go to primary
write_function_list = 'nextval,setval,lastval,currval'
read_only_function_list = ''
```

## Configure Authentication

```bash
# Create the pool_passwd file for pgpool authentication
sudo pg_md5 --config-file=/etc/pgpool-II/pgpool.conf --md5auth --username=myuser mypassword
# This writes to /etc/pgpool-II/pool_passwd

# Or register users manually
sudo pg_md5 -m -f /etc/pgpool-II/pgpool.conf -u myuser mypassword

# Enable pool_hba authentication
enable_pool_hba = on
```

Edit `pool_hba.conf`:

```bash
sudo tee /etc/pgpool-II/pool_hba.conf << 'EOF'
# TYPE  DATABASE  USER     ADDRESS        METHOD
local   all       all                     trust
host    all       all      0.0.0.0/0      md5
EOF
```

## Configure Health Check

```bash
# Health check to detect backend failures
health_check_period = 10
health_check_timeout = 20
health_check_user = 'pgpool_checker'
health_check_password = 'checkerpass'
health_check_max_retries = 3
health_check_retry_delay = 1

# Create the health check user in PostgreSQL
sudo -u postgres psql -c "CREATE USER pgpool_checker WITH PASSWORD 'checkerpass';"
```

## Configure Automatic Failover

```bash
# Failover command - executed when a backend goes down
failover_command = '/etc/pgpool-II/failover.sh %d %h %p %D %m %H %M %P %r %R'

# Create failover script
sudo tee /etc/pgpool-II/failover.sh << 'SCRIPT'
#!/bin/bash
# Failover script for pgpool-II
FAILED_NODE_ID=$1
NEW_MAIN_HOST=$6
OLD_PRIMARY_ID=$8
NEW_MAIN_DATA_DIR=${10}

if [ "$FAILED_NODE_ID" = "$OLD_PRIMARY_ID" ] && [ -n "$NEW_MAIN_HOST" ]; then
    # Primary failed, promote the new main node
    ssh -T postgres@$NEW_MAIN_HOST "/usr/pgsql-16/bin/pg_ctl promote -D $NEW_MAIN_DATA_DIR"
    echo "Promoted $NEW_MAIN_HOST to primary"
fi
SCRIPT

sudo chmod 755 /etc/pgpool-II/failover.sh
```

## Start pgpool-II

```bash
sudo systemctl enable --now pgpool.service

# Open the firewall
sudo firewall-cmd --permanent --add-port=9999/tcp
sudo firewall-cmd --reload
```

## Connect Through pgpool-II

```bash
# Connect via pgpool instead of directly to PostgreSQL
psql -h localhost -p 9999 -U myuser -d mydb

# Check which backend handled the query
SHOW pool_nodes;

# Check connection pool status
SHOW pool_pools;
```

## Verify Load Balancing

```bash
# Run read queries multiple times, then check select_cnt and load_balance_node
for i in {1..10}; do
    psql -h localhost -p 9999 -U myuser -d mydb -t -c "SELECT 1;"
done

psql -h localhost -p 9999 -U myuser -d mydb -c "SHOW pool_nodes;"
```

pgpool-II adds a layer between your application and PostgreSQL that improves connection management, distributes read load, and provides automatic failover for streaming replication setups.
