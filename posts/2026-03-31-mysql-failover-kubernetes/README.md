# How to Handle MySQL Failover on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Failover, HighAvailability, Replication

Description: Handle MySQL failover on Kubernetes using InnoDB Cluster automatic election, MySQL Router re-routing, and pod restart policies to minimize downtime.

---

Failover in MySQL on Kubernetes means detecting when the primary pod is unavailable and promoting a secondary to become the new primary. The right architecture ensures this happens automatically with minimal disruption to applications.

## Automatic Failover with InnoDB Cluster

MySQL InnoDB Cluster with Group Replication handles failover automatically. When the primary pod fails, the remaining members hold a new election and promote a secondary within seconds. MySQL Router detects the topology change and re-routes new connections to the new primary.

This sequence happens without any manual intervention:

1. Primary pod becomes unavailable (OOMKilled, node failure, pod eviction)
2. Group Replication detects the failure via a heartbeat timeout (default 5 seconds)
3. The remaining members elect a new primary
4. MySQL Router queries `performance_schema.replication_group_members` and updates its routing table
5. New connections are directed to the new primary

## Testing Failover

Simulate a failover by deleting the primary pod:

```bash
# Find the primary pod
kubectl exec -it mysql-0 -n mysql-cluster -- mysql -uroot -psecret \
  -e "SELECT MEMBER_HOST, MEMBER_ROLE FROM performance_schema.replication_group_members;"

# Delete the primary pod
kubectl delete pod mysql-0 -n mysql-cluster

# Watch a new pod start and check the new primary
kubectl get pods -n mysql-cluster -w

# After mysql-0 restarts, check which pod is now primary
kubectl exec -it mysql-1 -n mysql-cluster -- mysql -uroot -psecret \
  -e "SELECT MEMBER_HOST, MEMBER_ROLE FROM performance_schema.replication_group_members;"
```

## MySQL Router Failover Configuration

MySQL Router's failover speed depends on its configuration. Tune these parameters for faster detection:

```text
[routing:primary]
bind_address = 0.0.0.0
bind_port = 6446
destinations = metadata-cache://myCluster/?role=PRIMARY
routing_strategy = first-available
connect_timeout = 5
client_connect_timeout = 9
max_connect_errors = 10

[routing:secondaries]
bind_address = 0.0.0.0
bind_port = 6447
destinations = metadata-cache://myCluster/?role=SECONDARY
routing_strategy = round-robin-with-fallback
```

## Kubernetes Pod Restart Policy

Configure the StatefulSet to restart failed pods quickly:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: mysql
        livenessProbe:
          exec:
            command: ["mysqladmin", "ping", "-h", "localhost"]
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command:
            - bash
            - "-c"
            - |
              mysql -h localhost -uroot -p"$MYSQL_ROOT_PASSWORD" \
                -e "SELECT 1" 2>/dev/null
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3
```

## Monitoring Failover Events

Alert on failover events by monitoring Group Replication member state:

```text
# Prometheus alert for Group Replication member not online
- alert: MySQLGroupMemberNotOnline
  expr: mysql_perf_schema_replication_group_members{member_state!="ONLINE"} > 0
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "MySQL Group Replication member {{ $labels.member_host }} is {{ $labels.member_state }}"
```

## Handling Application Reconnection

Applications must handle connection drops during failover. Use connection retry logic:

```python
import mysql.connector
from mysql.connector import errors
import time

def get_connection(retries=5, delay=2):
    for attempt in range(retries):
        try:
            return mysql.connector.connect(
                host="mysql-router.mysql-cluster.svc.cluster.local",
                port=6446,
                user="appuser",
                password="apppassword",
                database="mydb",
                connect_timeout=10
            )
        except errors.DatabaseError as e:
            if attempt < retries - 1:
                time.sleep(delay * (2 ** attempt))
            else:
                raise
```

## Summary

MySQL failover on Kubernetes relies on InnoDB Cluster's Group Replication to elect a new primary automatically when the current one fails. MySQL Router detects the topology change and re-routes connections within seconds. Tune liveness probes and MySQL Router timeouts to balance fast failure detection against false positives. Applications should implement retry logic with exponential backoff to handle the brief connection interruption that occurs during the failover window.
