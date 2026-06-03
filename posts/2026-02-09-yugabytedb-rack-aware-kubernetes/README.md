# How to Set Up YugabyteDB with Rack-Aware Placement on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YugabyteDB, Kubernetes, Database

Description: Learn how to deploy YugabyteDB on Kubernetes with rack-aware replica placement for optimal availability across failure domains, combining PostgreSQL compatibility with distributed architecture.

---

YugabyteDB provides PostgreSQL-compatible distributed SQL with automatic sharding and replication. Rack-aware placement ensures replicas spread across failure domains like availability zones, protecting against infrastructure failures. This guide demonstrates deploying YugabyteDB on Kubernetes with topology-aware replica placement for production workloads requiring high availability and strong consistency.

## Understanding Rack-Aware Placement

Rack-aware placement distributes database replicas across different failure domains defined by node labels. In cloud environments, these typically map to availability zones. YugabyteDB ensures each tablet (shard) has replicas in different racks, so losing an entire availability zone doesn't cause data loss or unavailability.

The placement strategy uses Kubernetes scheduling constraints to place pods in the right failure domains and YugabyteDB placement flags to identify each server's cloud, region, and zone. When combined with YugabyteDB's placement policy, this creates a resilient architecture where hardware failures, network partitions, or zone outages don't impact database availability.

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

These labels let Kubernetes schedule pods across the topology you want. YugabyteDB also needs matching `placement_cloud`, `placement_region`, and `placement_zone` configuration so its own tablet placement policy can distribute replicas for maximum resilience.

## Installing YugabyteDB with Helm

Deploy YugabyteDB using the official Helm chart with rack awareness enabled:

```bash
# Add YugabyteDB Helm repository
helm repo add yugabytedb https://charts.yugabyte.com
helm repo update

# Create one namespace per availability zone
kubectl create namespace yb-demo-us-west-2a
kubectl create namespace yb-demo-us-west-2b
kubectl create namespace yb-demo-us-west-2c

MASTER_ADDRESSES="yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100"

# Install one Helm release per zone
helm install yb-demo-us-west-2a yugabytedb/yugabyte \
  --namespace yb-demo-us-west-2a \
  --set storage.master.size=50Gi \
  --set storage.tserver.size=200Gi \
  --set resource.master.requests.cpu=2 \
  --set resource.master.requests.memory=4Gi \
  --set resource.tserver.requests.cpu=4 \
  --set resource.tserver.requests.memory=8Gi \
  --set isMultiAz=true \
  --set AZ=us-west-2a \
  --set masterAddresses="${MASTER_ADDRESSES}" \
  --set replicas.master=1 \
  --set replicas.tserver=1 \
  --set replicas.totalMasters=3 \
  --set enableLoadBalancer=true \
  --set gflags.master.placement_cloud=kubernetes \
  --set gflags.master.placement_region=us-west-2 \
  --set gflags.master.placement_zone=us-west-2a \
  --set gflags.tserver.placement_cloud=kubernetes \
  --set gflags.tserver.placement_region=us-west-2 \
  --set gflags.tserver.placement_zone=us-west-2a \
  --wait

helm install yb-demo-us-west-2b yugabytedb/yugabyte \
  --namespace yb-demo-us-west-2b \
  --set storage.master.size=50Gi \
  --set storage.tserver.size=200Gi \
  --set resource.master.requests.cpu=2 \
  --set resource.master.requests.memory=4Gi \
  --set resource.tserver.requests.cpu=4 \
  --set resource.tserver.requests.memory=8Gi \
  --set isMultiAz=true \
  --set AZ=us-west-2b \
  --set masterAddresses="${MASTER_ADDRESSES}" \
  --set replicas.master=1 \
  --set replicas.tserver=1 \
  --set replicas.totalMasters=3 \
  --set enableLoadBalancer=true \
  --set gflags.master.placement_cloud=kubernetes \
  --set gflags.master.placement_region=us-west-2 \
  --set gflags.master.placement_zone=us-west-2b \
  --set gflags.tserver.placement_cloud=kubernetes \
  --set gflags.tserver.placement_region=us-west-2 \
  --set gflags.tserver.placement_zone=us-west-2b \
  --wait

helm install yb-demo-us-west-2c yugabytedb/yugabyte \
  --namespace yb-demo-us-west-2c \
  --set storage.master.size=50Gi \
  --set storage.tserver.size=200Gi \
  --set resource.master.requests.cpu=2 \
  --set resource.master.requests.memory=4Gi \
  --set resource.tserver.requests.cpu=4 \
  --set resource.tserver.requests.memory=8Gi \
  --set isMultiAz=true \
  --set AZ=us-west-2c \
  --set masterAddresses="${MASTER_ADDRESSES}" \
  --set replicas.master=1 \
  --set replicas.tserver=1 \
  --set replicas.totalMasters=3 \
  --set enableLoadBalancer=true \
  --set gflags.master.placement_cloud=kubernetes \
  --set gflags.master.placement_region=us-west-2 \
  --set gflags.master.placement_zone=us-west-2c \
  --set gflags.tserver.placement_cloud=kubernetes \
  --set gflags.tserver.placement_region=us-west-2 \
  --set gflags.tserver.placement_zone=us-west-2c \
  --wait

# Configure zone-aware replica placement
kubectl exec -it -n yb-demo-us-west-2a yb-master-0 -- \
  /home/yugabyte/master/bin/yb-admin \
  --master_addresses "${MASTER_ADDRESSES}" \
  modify_placement_info \
  kubernetes.us-west-2.us-west-2a,kubernetes.us-west-2.us-west-2b,kubernetes.us-west-2.us-west-2c 3

# Wait for deployment to complete
kubectl get pods -A -l 'app in (yb-master,yb-tserver)' -w
```

## Configuring Advanced Rack-Aware Placement

For more control, create a custom values file:

```yaml
# overrides-us-west-2a.yaml
isMultiAz: true
AZ: us-west-2a
masterAddresses: "yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100"

Image:
  repository: yugabytedb/yugabyte
  tag: 2025.2.3.0-b149
  pullPolicy: IfNotPresent

storage:
  master:
    size: 50Gi
    storageClass: fast-ssd
  tserver:
    size: 200Gi
    storageClass: fast-ssd

replicas:
  master: 1
  tserver: 3
  totalMasters: 3

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

# Rack awareness configuration
gflags:
  master:
    placement_cloud: kubernetes
    placement_region: us-west-2
    placement_zone: us-west-2a
  tserver:
    placement_cloud: kubernetes
    placement_region: us-west-2
    placement_zone: us-west-2a
    ysql_enable_auth: true

# Service configuration
enableLoadBalancer: true

# Monitoring
serviceMonitor:
  enabled: true
  extraLabels:
    release: prom
```

Deploy with custom values:

```bash
helm install yb-demo-us-west-2a yugabytedb/yugabyte \
  --namespace yb-demo-us-west-2a \
  --values overrides-us-west-2a.yaml \
  --wait
```

Create matching override files for `us-west-2b` and `us-west-2c` by changing `AZ` and the `placement_zone` values, then install those releases in their corresponding namespaces.

## Verifying Rack-Aware Placement

Check that replicas are properly distributed:

```bash
# Connect to YugabyteDB Admin UI
kubectl port-forward -n yb-demo-us-west-2a svc/yb-master-ui 7000:7000

# Or check programmatically
kubectl exec -it -n yb-demo-us-west-2a yb-tserver-0 -- bash

# Inside the pod, check placement
/home/yugabyte/master/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100 \
  get_universe_config

# Check server location metadata
ysqlsh -h yb-tserver-0.yb-tservers.yb-demo-us-west-2a -c \
  "SELECT host, cloud, region, zone FROM yb_servers() ORDER BY host;"
```

Each TServer should show the expected placement metadata, and the Admin UI's tablet servers page should show tablet peers and leaders placed across the zones.

## Connecting to YugabyteDB

Connect using PostgreSQL-compatible clients:

```bash
# Get service endpoint
kubectl get svc -n yb-demo-us-west-2a yb-tserver-service

# Connect via port-forward
kubectl port-forward -n yb-demo-us-west-2a svc/yb-tserver-service 5433:5433

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
SELECT * FROM yb_tablet_metadata WHERE db_name = 'myapp' AND relname = 'users';

-- View server placement metadata
SELECT host, cloud, region, zone FROM yb_servers() ORDER BY host;
```

The `SPLIT INTO 9 TABLETS` directive creates 9 shards that YugabyteDB distributes across the available TServer pods according to the configured placement policy.

## Configuring Preferred Placement Zones

Set leader preferences to minimize cross-zone traffic:

```bash
# Set leader preference for zone us-west-2a
kubectl exec -it -n yb-demo-us-west-2a yb-master-0 -- \
  /home/yugabyte/master/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100 \
  set_preferred_zones \
  kubernetes.us-west-2.us-west-2a:1 \
  kubernetes.us-west-2.us-west-2b:2 \
  kubernetes.us-west-2.us-west-2c:2
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

Enable Prometheus Operator ServiceMonitor resources in the Helm values:

```yaml
serviceMonitor:
  enabled: true
  interval: 30s
  extraLabels:
    release: prom
  master:
    enabled: true
    port: http-ui
    path: /prometheus-metrics
  tserver:
    enabled: true
    port: http-ui
    path: /prometheus-metrics
```

Key metrics to monitor:

- Tablet peers: `ts_live_tablet_peers`
- Server placement: `SELECT host, cloud, region, zone FROM yb_servers()`
- Leader distribution: the `yb_tablet_metadata` view and the Admin UI tablet servers page
- xCluster replication lag, if using xCluster: `async_replication_committed_lag_micros`

## Testing Zone Failure Scenarios

Simulate zone failure to verify high availability:

```bash
# Drain all nodes in one zone
for node in node-1 node-2 node-3; do
  kubectl drain "$node" --ignore-daemonsets --delete-emptydir-data
done

# Verify database remains available
psql -h <YB_ENDPOINT> -p 5433 -U yugabyte -c "SELECT COUNT(*) FROM users;"

# Check that replicas promoted in remaining zones
kubectl exec -it -n yb-demo-us-west-2a yb-master-0 -- \
  /home/yugabyte/master/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100 \
  list_all_tablet_servers

# Restore zone
for node in node-1 node-2 node-3; do
  kubectl uncordon "$node"
done
```

YugabyteDB automatically promotes followers to leaders in the remaining zones, maintaining availability.

## Scaling Across Additional Zones

Add capacity by scaling TServer replicas:

```bash
# Scale TServers to 12 (4 per zone)
helm upgrade yb-demo-us-west-2a yugabytedb/yugabyte \
  --namespace yb-demo-us-west-2a \
  --reuse-values \
  --set replicas.tserver=4

# YugabyteDB automatically rebalances tablets
kubectl get pods -A -l app=yb-tserver
```

Repeat the upgrade in each zone namespace to reach 12 TServers total. The database automatically redistributes tablets across new TServers while maintaining rack-aware placement.

## Configuring Backup and Restore

Set up distributed backups with zone awareness:

```bash
# Create a distributed snapshot
kubectl exec -it -n yb-demo-us-west-2a yb-master-0 -- \
  /home/yugabyte/master/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100 \
  create_database_snapshot myapp

# Export snapshot metadata to a local file
kubectl exec -it -n yb-demo-us-west-2a yb-master-0 -- \
  /home/yugabyte/master/bin/yb-admin \
  --master_addresses yb-master-0.yb-masters.yb-demo-us-west-2a.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2b.svc.cluster.local:7100,yb-master-0.yb-masters.yb-demo-us-west-2c.svc.cluster.local:7100 \
  export_snapshot <SNAPSHOT_ID> /home/yugabyte/myapp.snapshot
```

For object-store backups, use YugabyteDB's backup tooling (for example `yb_backup.py` or YugabyteDB Anywhere) rather than `export_snapshot`, which exports snapshot metadata.

## Conclusion

Rack-aware placement in YugabyteDB on Kubernetes provides enterprise-grade availability by distributing replicas across failure domains. The combination of Kubernetes scheduling and YugabyteDB's built-in placement policies ensures tablets can survive zone failures without manual intervention.

The PostgreSQL compatibility makes YugabyteDB an excellent choice for applications needing distributed SQL with strong consistency. By configuring follower reads and leader preferences, you optimize for both availability and performance, serving queries from local replicas while maintaining the ability to promote followers when zones fail. This architecture delivers the scalability of distributed databases without sacrificing the familiar PostgreSQL interface developers expect.
