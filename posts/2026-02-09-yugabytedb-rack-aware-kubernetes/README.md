# How to Set Up YugabyteDB with Rack-Aware Placement on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YugabyteDB, Kubernetes, Databases

Description: Learn how to deploy YugabyteDB on Kubernetes with rack-aware replica placement for optimal availability across failure domains, combining PostgreSQL compatibility with distributed architecture.

---

YugabyteDB provides PostgreSQL-compatible distributed SQL with automatic sharding and replication. Rack-aware placement ensures replicas spread across failure domains like availability zones, protecting against infrastructure failures. This guide demonstrates deploying YugabyteDB on Kubernetes with topology-aware replica placement for production workloads requiring high availability and strong consistency.

## Understanding Rack-Aware Placement

Rack-aware placement distributes database replicas across different failure domains defined by node labels. In cloud environments, these typically map to availability zones. YugabyteDB ensures each tablet (shard) has replicas in different racks, so losing an entire availability zone doesn't cause data loss or unavailability.

The placement strategy uses Kubernetes node topology labels to make intelligent replica decisions. When combined with pod anti-affinity rules, this creates a resilient architecture where hardware failures, network partitions, or zone outages don't impact database availability.

## Labeling Nodes by Topology

Start by ensuring nodes have proper topology labels:

```bash
# Label nodes by availability zone (cloud providers often do this automatically)
kubectl label nodes node-1 node-2 node-3 \
  topology.kubernetes.io/zone=us-west-2a

kubectl label nodes node-4 node-5 node-6 \
  topology.kubernetes.io/zone=us-west-2b

kubectl label nodes node-7 node-8 node-9 \
  topology.kubernetes.io/zone=us-west-2c

# Verify labels
kubectl get nodes -L topology.kubernetes.io/zone

# For on-premises deployments, use rack labels
kubectl label nodes node-1 topology.kubernetes.io/rack=rack-1
kubectl label nodes node-2 topology.kubernetes.io/rack=rack-2
kubectl label nodes node-3 topology.kubernetes.io/rack=rack-3
```

These labels tell YugabyteDB how to distribute replicas for maximum resilience.

## Installing YugabyteDB with Helm

Deploy YugabyteDB using the official Helm chart with rack awareness enabled:

```bash
# Add YugabyteDB Helm repository
helm repo add yugabytedb https://charts.yugabyte.com
helm repo update

# Create namespace
kubectl create namespace yugabytedb

# Install with rack-aware configuration
helm install yb-demo yugabytedb/yugabyte \
  --namespace yugabytedb \
  --set storage.master.size=50Gi \
  --set storage.tserver.size=200Gi \
  --set resource.master.requests.cpu=2 \
  --set resource.master.requests.memory=4Gi \
  --set resource.tserver.requests.cpu=4 \
  --set resource.tserver.requests.memory=8Gi \
  --set replicas.master=3 \
  --set replicas.tserver=3 \
  --set enableLoadBalancer=true \
  --set tserver.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].weight=100 \
  --set tserver.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchExpressions[0].key=app \
  --set tserver.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchExpressions[0].operator=In \
  --set tserver.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.labelSelector.matchExpressions[0].values[0]=yb-tserver \
  --set tserver.affinity.podAntiAffinity.preferredDuringSchedulingIgnoredDuringExecution[0].podAffinityTerm.topologyKey=topology.kubernetes.io/zone

# Wait for deployment to complete
kubectl get pods -n yugabytedb -w
```

## Configuring Advanced Rack-Aware Placement

For more control, create a custom values file:

```yaml
# yugabyte-values.yaml
image:
  repository: yugabytedb/yugabyte
  tag: 2.19.2.0-b121
  pullPolicy: IfNotPresent

storage:
  master:
    size: 50Gi
    storageClass: fast-ssd
  tserver:
    size: 200Gi
    storageClass: fast-ssd

replicas:
  master: 3
  tserver: 9  # 3 per availability zone

resource:
  master:
    requests:
      cpu: 2
      memory: 4Gi
    limits:
      cpu: 4
      memory: 8Gi
  tserver:
    requests:
      cpu: 4
      memory: 8Gi
    limits:
      cpu: 8
      memory: 16Gi

# Enable rack awareness
tserver:
  affinity:
    # Hard requirement: spread across zones
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - yb-tserver
          topologyKey: topology.kubernetes.io/zone
          namespaceSelector: {}

  # Rack awareness configuration
  extraEnv:
    - name: YSQL_ENABLE_AUTH
      value: "true"
    - name: placement_cloud
      value: "kubernetes"
    - name: placement_region
      value: "us-west-2"
    - name: placement_zone
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName  # Will be transformed to zone

  # Custom placement info script
  customStartScript: |
    #!/bin/bash
    ZONE=$(kubectl get node ${HOSTNAME} -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
    export placement_zone=${ZONE}
    echo "Starting TServer in zone: ${ZONE}"

master:
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - yb-master
          topologyKey: topology.kubernetes.io/zone

# Service configuration
enableLoadBalancer: true

# Monitoring
tserver:
  extraEnv:
    - name: YSQL_ENABLE_AUTH
      value: "true"
  podLabels:
    monitoring: "prometheus"

master:
  podLabels:
    monitoring: "prometheus"
```

Deploy with custom values:

```bash
helm install yb-demo yugabytedb/yugabyte \
  --namespace yugabytedb \
  --values yugabyte-values.yaml
```

## Verifying Rack-Aware Placement

Check that replicas are properly distributed:

```bash
# Connect to YugabyteDB Admin UI
kubectl port-forward -n yugabytedb svc/yb-master-ui 7000:7000

# Or check programmatically
kubectl exec -it -n yugabytedb yb-tserver-0 -- bash

# Inside the pod, check placement
/home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabytedb:7100,yb-master-1.yb-masters.yugabytedb:7100,yb-master-2.yb-masters.yugabytedb:7100 \
  get_universe_config

# Check tablet placement
/home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabytedb:7100,yb-master-1.yb-masters.yugabytedb:7100,yb-master-2.yb-masters.yugabytedb:7100 \
  list_tablets
```

Each tablet should show replicas in different availability zones.

## Connecting to YugabyteDB

Connect using PostgreSQL-compatible clients:

```bash
# Get service endpoint
kubectl get svc -n yugabytedb yb-tserver-service

# Connect via port-forward
kubectl port-forward -n yugabytedb svc/yb-tserver-service 5433:5433

# Connect with psql
psql -h 127.0.0.1 -p 5433 -U yugabyte

# Or connect directly if using LoadBalancer
psql -h <EXTERNAL_IP> -p 5433 -U yugabyte
```

Create a database and verify placement:

```sql
-- Create database
CREATE DATABASE myapp;

\c myapp

-- Create table with explicit replica placement
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) SPLIT INTO 9 TABLETS;

-- Insert test data
INSERT INTO users (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob'),
  ('charlie@example.com', 'Charlie');

-- Check tablet distribution
SELECT * FROM yb_local_tablets;

-- View replication status
SELECT * FROM pg_stat_replication;
```

The `SPLIT INTO 9 TABLETS` directive creates 9 shards distributed across your 9 TServer pods.

## Configuring Preferred Placement Zones

Set leader preferences to minimize cross-zone traffic:

```bash
# Set leader preference for zone us-west-2a
kubectl exec -it -n yugabytedb yb-master-0 -- \
  /home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabytedb:7100 \
  modify_placement_info \
  kubernetes.us-west-2.us-west-2a,kubernetes.us-west-2.us-west-2b,kubernetes.us-west-2.us-west-2c 3 \
  kubernetes.us-west-2.us-west-2a
```

This ensures tablet leaders prefer zone us-west-2a, reducing latency for applications in that zone.

## Implementing Zone-Local Reads

Configure follower reads to serve queries from local replicas:

```sql
-- Enable follower reads at session level
SET yb_read_from_followers = true;

-- Set maximum staleness
SET yb_follower_read_staleness_ms = 10000;  -- 10 seconds

-- Queries now read from local replicas
SELECT * FROM users WHERE email = 'alice@example.com';
```

This dramatically reduces latency for read queries by avoiding cross-zone network hops.

## Monitoring Placement and Replication

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: yugabytedb-monitor
  namespace: yugabytedb
spec:
  selector:
    matchLabels:
      monitoring: prometheus
  endpoints:
    - port: http-ui
      path: /prometheus-metrics
      interval: 30s
```

Key metrics to monitor:

- Replication lag: `async_replication_committed_lag_micros`
- Tablet placement: `tablet_peers_per_ts`
- Zone distribution: `rpc_connections_alive` by zone
- Leader distribution: `is_tablet_leader`

## Testing Zone Failure Scenarios

Simulate zone failure to verify high availability:

```bash
# Drain all nodes in one zone
kubectl drain node-1 node-2 node-3 --ignore-daemonsets --delete-emptydir-data

# Verify database remains available
psql -h <YB_ENDPOINT> -p 5433 -U yugabyte -c "SELECT COUNT(*) FROM users;"

# Check that replicas promoted in remaining zones
kubectl exec -it -n yugabytedb yb-master-0 -- \
  /home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabytedb:7100 \
  list_tablet_servers

# Restore zone
kubectl uncordon node-1 node-2 node-3
```

YugabyteDB automatically promotes followers to leaders in the remaining zones, maintaining availability.

## Scaling Across Additional Zones

Add capacity by scaling TServer replicas:

```bash
# Scale TServers to 12 (4 per zone)
helm upgrade yb-demo yugabytedb/yugabyte \
  --namespace yugabytedb \
  --reuse-values \
  --set replicas.tserver=12

# YugabyteDB automatically rebalances tablets
kubectl get pods -n yugabytedb -l app=yb-tserver
```

The database automatically redistributes tablets across new TServers while maintaining rack-aware placement.

## Configuring Backup and Restore

Set up distributed backups with zone awareness:

```bash
# Create backup
kubectl exec -it -n yugabytedb yb-tserver-0 -- \
  /home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabytedb:7100 \
  create_snapshot ysql.myapp

# Export snapshot to S3
kubectl exec -it -n yugabytedb yb-tserver-0 -- \
  /home/yugabyte/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yugabytedb:7100 \
  export_snapshot <SNAPSHOT_ID> s3://my-backups/yugabyte/
```

Backups use all TServers in parallel, completing quickly even for large databases.

## Conclusion

Rack-aware placement in YugabyteDB on Kubernetes provides enterprise-grade availability by distributing replicas across failure domains. The combination of pod anti-affinity rules and YugabyteDB's built-in placement policies ensures every tablet survives zone failures without manual intervention.

The PostgreSQL compatibility makes YugabyteDB an excellent choice for applications needing distributed SQL with strong consistency. By configuring follower reads and leader preferences, you optimize for both availability and performance, serving queries from local replicas while maintaining the ability to promote followers when zones fail. This architecture delivers the scalability of distributed databases without sacrificing the familiar PostgreSQL interface developers expect.
