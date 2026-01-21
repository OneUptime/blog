# How to Handle PostgreSQL Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Failover, High Availability, Disaster Recovery, Replication, Patroni

Description: A comprehensive guide to handling PostgreSQL failover, covering manual and automatic failover procedures, Patroni configuration, application connection handling, and post-failover recovery.

---

Database failover is critical for maintaining availability when the primary server fails. This guide covers manual failover procedures, automatic failover with Patroni, and best practices for minimizing downtime.

## Prerequisites

- PostgreSQL streaming replication configured
- At least one standby replica
- Network connectivity between servers
- Understanding of your RPO/RTO requirements

## Failover Types

| Type | Description | Data Loss Risk | Downtime |
|------|-------------|----------------|----------|
| Planned Switchover | Controlled primary change | None | Seconds |
| Automatic Failover | System-triggered promotion | Minimal | Seconds-minutes |
| Manual Failover | Operator-initiated | Variable | Minutes |
| Disaster Recovery | Complete site failure | Possible | Minutes-hours |

## Manual Failover Procedure

### Step 1: Verify Primary is Down

```bash
# Check if primary is accessible
pg_isready -h primary.example.com -p 5432

# Check replication status on standby
sudo -u postgres psql -c "SELECT pg_is_in_recovery();"
```

### Step 2: Check Standby Status

```sql
-- On standby: Check replication lag
SELECT
    pg_last_wal_receive_lsn() AS received,
    pg_last_wal_replay_lsn() AS replayed,
    pg_last_xact_replay_timestamp() AS last_transaction;

-- Check if standby is caught up
SELECT pg_wal_lsn_diff(
    pg_last_wal_receive_lsn(),
    pg_last_wal_replay_lsn()
) AS bytes_behind;
```

### Step 3: Promote Standby

```bash
# Method 1: Using pg_ctl
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/16/main

# Method 2: Using SQL (PostgreSQL 12+)
sudo -u postgres psql -c "SELECT pg_promote();"

# Method 3: Create trigger file (legacy)
sudo -u postgres touch /var/lib/postgresql/16/main/failover.trigger
```

### Step 4: Verify Promotion

```sql
-- Should return false (no longer in recovery)
SELECT pg_is_in_recovery();

-- Check server is accepting writes
CREATE TABLE failover_test (id int);
DROP TABLE failover_test;
```

### Step 5: Update Application Connections

```bash
# Update DNS or load balancer to point to new primary
# Or update application configuration

# Example: Update HAProxy
# Edit /etc/haproxy/haproxy.cfg to change primary server
sudo systemctl reload haproxy
```

## Automatic Failover with Patroni

### Patroni Configuration

```yaml
# /etc/patroni/patroni.yml
scope: postgres-cluster
namespace: /db/
name: pg-node1

restapi:
  listen: 0.0.0.0:8008
  connect_address: 10.0.0.11:8008

etcd:
  hosts: 10.0.0.1:2379,10.0.0.2:2379,10.0.0.3:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB max lag for failover candidate

postgresql:
  listen: 0.0.0.0:5432
  connect_address: 10.0.0.11:5432
  data_dir: /var/lib/postgresql/16/main
```

### Check Cluster Status

```bash
patronictl -c /etc/patroni/patroni.yml list

# Output:
# + Cluster: postgres-cluster --------+----+-----------+
# | Member   | Host      | Role    | State     | TL | Lag |
# +----------+-----------+---------+-----------+----+-----+
# | pg-node1 | 10.0.0.11 | Leader  | running   | 3  |     |
# | pg-node2 | 10.0.0.12 | Replica | streaming | 3  | 0   |
# | pg-node3 | 10.0.0.13 | Replica | streaming | 3  | 0   |
# +----------+-----------+---------+-----------+----+-----+
```

### Manual Switchover with Patroni

```bash
# Planned switchover (no data loss)
patronictl -c /etc/patroni/patroni.yml switchover postgres-cluster

# Interactive prompts:
# Master [pg-node1]:
# Candidate ['pg-node2', 'pg-node3'] []: pg-node2
# When [now]:

# Or non-interactive
patronictl -c /etc/patroni/patroni.yml switchover \
  --master pg-node1 \
  --candidate pg-node2 \
  --force
```

### Manual Failover with Patroni

```bash
# Force failover when leader is down
patronictl -c /etc/patroni/patroni.yml failover postgres-cluster

# Specify candidate
patronictl -c /etc/patroni/patroni.yml failover \
  --candidate pg-node2 \
  --force
```

## Application Connection Handling

### Connection String with Multiple Hosts

```python
# Python with psycopg
import psycopg

# Automatic failover to first available host
conn = psycopg.connect(
    "host=primary.example.com,standby1.example.com,standby2.example.com "
    "port=5432 dbname=myapp user=myuser password=mypass "
    "target_session_attrs=read-write"
)
```

### Connection Retry Logic

```python
import time
import psycopg
from psycopg import OperationalError

def get_connection(max_retries=5, retry_delay=2):
    """Get database connection with failover handling."""
    hosts = ["primary.example.com", "standby1.example.com", "standby2.example.com"]

    for attempt in range(max_retries):
        for host in hosts:
            try:
                conn = psycopg.connect(
                    host=host,
                    dbname="myapp",
                    user="myuser",
                    password="mypass",
                    connect_timeout=5
                )
                # Verify it's writable
                with conn.cursor() as cur:
                    cur.execute("SELECT pg_is_in_recovery()")
                    if not cur.fetchone()[0]:  # False = primary
                        return conn
                conn.close()
            except OperationalError as e:
                print(f"Connection to {host} failed: {e}")
                continue

        print(f"Attempt {attempt + 1} failed, retrying in {retry_delay}s...")
        time.sleep(retry_delay)

    raise Exception("Could not connect to any database server")
```

### HAProxy Health Checks

```haproxy
# /etc/haproxy/haproxy.cfg

backend pg_backend
    option httpchk GET /master
    http-check expect status 200

    server pg-node1 10.0.0.11:5432 check port 8008
    server pg-node2 10.0.0.12:5432 check port 8008
    server pg-node3 10.0.0.13:5432 check port 8008
```

Patroni's REST API responds:

- `/master` - 200 if leader, 503 otherwise
- `/replica` - 200 if replica, 503 otherwise
- `/health` - 200 if healthy

## Post-Failover Recovery

### Rejoin Old Primary as Replica

After failover, the old primary needs to rejoin as a replica:

#### Method 1: pg_rewind (Fast)

```bash
# On old primary (now to become replica)
# Stop PostgreSQL
sudo systemctl stop postgresql

# Rewind to match new primary
sudo -u postgres pg_rewind \
    --target-pgdata=/var/lib/postgresql/16/main \
    --source-server="host=new-primary port=5432 user=replicator"

# Create standby.signal
sudo -u postgres touch /var/lib/postgresql/16/main/standby.signal

# Update postgresql.auto.conf
cat << EOF | sudo -u postgres tee /var/lib/postgresql/16/main/postgresql.auto.conf
primary_conninfo = 'host=new-primary port=5432 user=replicator password=xxx'
primary_slot_name = 'old_primary_slot'
EOF

# Start PostgreSQL
sudo systemctl start postgresql
```

#### Method 2: Fresh Base Backup (Slower but Safer)

```bash
# On old primary
sudo systemctl stop postgresql
sudo rm -rf /var/lib/postgresql/16/main/*

# Take fresh backup from new primary
sudo -u postgres pg_basebackup \
    -h new-primary.example.com \
    -D /var/lib/postgresql/16/main \
    -U replicator \
    -R \
    -P

sudo systemctl start postgresql
```

### Reinitialize with Patroni

```bash
# Patroni handles rejoining automatically, but can force reinit
patronictl -c /etc/patroni/patroni.yml reinit postgres-cluster pg-node1
```

## Failover Testing

### Test Procedure

```bash
# 1. Verify cluster health
patronictl list

# 2. Simulate primary failure
sudo systemctl stop patroni  # On primary

# 3. Watch automatic failover
# Patroni on other nodes will detect and elect new leader

# 4. Verify new primary
patronictl list

# 5. Test application connectivity
psql -h haproxy.example.com -U myuser -d myapp -c "SELECT 1"

# 6. Restart old primary
sudo systemctl start patroni
# It will automatically rejoin as replica
```

### Chaos Testing Script

```bash
#!/bin/bash
# failover_test.sh

echo "Starting failover test..."

# Get current leader
LEADER=$(patronictl -c /etc/patroni/patroni.yml list -f json | jq -r '.[] | select(.Role=="Leader") | .Member')
echo "Current leader: $LEADER"

# Record test start
START_TIME=$(date +%s)

# Stop leader
echo "Stopping leader..."
ssh $LEADER "sudo systemctl stop patroni"

# Wait for failover
echo "Waiting for failover..."
sleep 30

# Get new leader
NEW_LEADER=$(patronictl -c /etc/patroni/patroni.yml list -f json | jq -r '.[] | select(.Role=="Leader") | .Member')
echo "New leader: $NEW_LEADER"

# Calculate failover time
END_TIME=$(date +%s)
FAILOVER_TIME=$((END_TIME - START_TIME))
echo "Failover completed in ${FAILOVER_TIME} seconds"

# Verify application connectivity
echo "Testing application connectivity..."
psql -h haproxy.example.com -U myuser -d myapp -c "SELECT 1" && echo "Application connected successfully"

# Restart old leader
echo "Restarting old leader..."
ssh $LEADER "sudo systemctl start patroni"

echo "Failover test complete"
```

## Monitoring Failover

### Alerting Rules

```yaml
# prometheus_rules.yml
groups:
  - name: postgresql_failover
    rules:
      - alert: PostgreSQLLeaderChanged
        expr: changes(pg_replication_is_replica[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL leadership change detected"

      - alert: PostgreSQLNoLeader
        expr: sum(pg_up{job="postgresql"} * on(instance) group_left() (1 - pg_replication_is_replica)) == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "No PostgreSQL primary available"

      - alert: PostgreSQLFailoverLag
        expr: pg_replication_lag_seconds > 60
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High replication lag may affect failover"
```

### Logging Failover Events

```sql
-- Create failover log table (on each server)
CREATE TABLE IF NOT EXISTS failover_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    old_role VARCHAR(20),
    new_role VARCHAR(20),
    event_time TIMESTAMP DEFAULT NOW(),
    details JSONB
);

-- Trigger to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS EVENT_TRIGGER AS $$
BEGIN
    INSERT INTO failover_log (event_type, details)
    VALUES ('role_change', jsonb_build_object(
        'is_recovery', pg_is_in_recovery(),
        'timeline', pg_control_checkpoint().timeline_id
    ));
END;
$$ LANGUAGE plpgsql;
```

## Best Practices

### Before Failover

1. **Test regularly** - Practice failover in staging
2. **Monitor replication lag** - Ensure replicas are caught up
3. **Document procedures** - Clear runbooks for operators
4. **Automate where possible** - Use Patroni or similar

### During Failover

1. **Verify replica status** - Check lag before promoting
2. **Notify stakeholders** - Alert teams of the event
3. **Monitor applications** - Watch for connection errors
4. **Check data consistency** - Verify no data loss

### After Failover

1. **Rejoin old primary** - As replica
2. **Review logs** - Understand what happened
3. **Update documentation** - Record any issues
4. **Post-mortem** - Improve for next time

## Failover Decision Tree

```
Primary Unresponsive?
├── Yes
│   ├── Check Replica Lag
│   │   ├── Lag < threshold
│   │   │   └── Promote replica
│   │   └── Lag > threshold
│   │       └── Wait or accept data loss
│   └── Verify Primary is truly down
│       └── Network partition possible?
│           ├── Yes: Use fencing
│           └── No: Proceed with promotion
└── No
    └── Investigate issue
        └── Consider planned switchover
```

## Conclusion

Effective PostgreSQL failover requires:

1. **Preparation** - Proper replication setup and testing
2. **Automation** - Tools like Patroni for automatic failover
3. **Application resilience** - Connection retry and routing
4. **Monitoring** - Detect failures quickly
5. **Recovery procedures** - Rejoin failed nodes

Regular testing and clear procedures ensure minimal downtime during actual failures.
