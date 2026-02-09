# How to Run Apache Cassandra on Kubernetes Using K8ssandra Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cassandra, Kubernetes, K8ssandra

Description: Learn how to deploy and manage Apache Cassandra on Kubernetes using the K8ssandra operator for production-ready distributed NoSQL with automated operations and built-in observability.

---

K8ssandra provides a complete operational stack for Apache Cassandra on Kubernetes, bundling the database with essential tools like backup/restore, repair operations, and monitoring. This production-ready distribution eliminates the complexity of assembling separate components, delivering a turnkey Cassandra platform. This guide demonstrates deploying Cassandra clusters with K8ssandra, implementing operational best practices from day one.

## Understanding K8ssandra Architecture

K8ssandra combines several components into a unified platform. At the core, the Cass Operator manages Cassandra StatefulSets and configuration. Medusa handles backup and restore operations to object storage. Reaper automates repair operations to maintain data consistency. Prometheus and Grafana provide comprehensive monitoring with pre-built dashboards.

This integrated approach solves the operational challenges that make Cassandra difficult to run in production. Instead of manually configuring each component, K8ssandra provides tested configurations and automation that follow Cassandra best practices.

## Installing K8ssandra Operator

Deploy K8ssandra using Helm:

```bash
# Add K8ssandra Helm repository
helm repo add k8ssandra https://helm.k8ssandra.io/stable
helm repo update

# Create namespace
kubectl create namespace k8ssandra

# Install K8ssandra operator
helm install k8ssandra-operator k8ssandra/k8ssandra-operator \
  --namespace k8ssandra \
  --set global.clusterScoped=true

# Verify installation
kubectl get pods -n k8ssandra

# Expected pods:
# - cass-operator
# - k8ssandra-operator
```

The operator watches for K8ssandraCluster custom resources across all namespaces.

## Deploying a Cassandra Cluster

Create a production Cassandra cluster:

```yaml
# k8ssandra-cluster.yaml
apiVersion: k8ssandra.io/v1alpha1
kind: K8ssandraCluster
metadata:
  name: prod-cluster
  namespace: cassandra
spec:
  cassandra:
    clusterName: prod-cluster
    serverVersion: "4.1.3"

    # Multi-datacenter configuration
    datacenters:
      - metadata:
          name: dc1
        size: 3

        # Storage configuration
        storageConfig:
          cassandraDataVolumeClaimSpec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
            storageClassName: fast-ssd

        # Resource allocation
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
          limits:
            cpu: 8000m
            memory: 32Gi

        # JVM configuration
        config:
          jvmOptions:
            heapSize: 8G
            heapNewGenSize: 2G
            additionalOptions:
              - -XX:+UseG1GC
              - -XX:G1RSetUpdatingPauseTimePercent=5
              - -XX:MaxGCPauseMillis=500

        # Cassandra configuration
        cassandraConfig:
          cassandraYaml:
            num_tokens: 16
            authenticator: PasswordAuthenticator
            authorizer: CassandraAuthorizer
            concurrent_reads: 32
            concurrent_writes: 32
            memtable_flush_writers: 2
            concurrent_compactors: 4
            compaction_throughput_mb_per_sec: 64
            stream_throughput_outbound_megabits_per_sec: 400

        # Rack awareness
        racks:
          - name: rack1
            nodeAffinityLabels:
              topology.kubernetes.io/zone: us-west-2a
          - name: rack2
            nodeAffinityLabels:
              topology.kubernetes.io/zone: us-west-2b
          - name: rack3
            nodeAffinityLabels:
              topology.kubernetes.io/zone: us-west-2c

  # Stargate API (optional CQL, REST, GraphQL)
  stargate:
    size: 1
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi

  # Medusa backup configuration
  medusa:
    storageProperties:
      storageProvider: s3
      bucketName: cassandra-backups
      prefix: prod-cluster
      region: us-west-2
      storageSecretRef:
        name: medusa-s3-credentials

  # Reaper repair automation
  reaper:
    enabled: true
    autoScheduling:
      enabled: true
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
```

Create S3 credentials secret:

```bash
kubectl create secret generic medusa-s3-credentials \
  -n cassandra \
  --from-literal=access_key_id=YOUR_ACCESS_KEY \
  --from-literal=secret_access_key=YOUR_SECRET_KEY
```

Deploy the cluster:

```bash
kubectl create namespace cassandra
kubectl apply -f k8ssandra-cluster.yaml

# Watch cluster initialization
kubectl get k8ssandraclusters -n cassandra -w

# Monitor pod creation
kubectl get pods -n cassandra -w

# Cluster becomes ready in 10-15 minutes
```

## Connecting to Cassandra

Access Cassandra using CQL:

```bash
# Get default superuser credentials
CASS_USER=$(kubectl get secret prod-cluster-superuser -n cassandra \
  -o jsonpath='{.data.username}' | base64 -d)

CASS_PASS=$(kubectl get secret prod-cluster-superuser -n cassandra \
  -o jsonpath='{.data.password}' | base64 -d)

# Connect via cqlsh
kubectl exec -it -n cassandra prod-cluster-dc1-rack1-sts-0 -- \
  cqlsh -u ${CASS_USER} -p ${CASS_PASS}

# Or port-forward for local access
kubectl port-forward -n cassandra svc/prod-cluster-dc1-service 9042:9042

# Connect from local machine
cqlsh -u ${CASS_USER} -p ${CASS_PASS} localhost 9042
```

Create a keyspace and table:

```sql
-- Create keyspace with replication
CREATE KEYSPACE myapp WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3
};

USE myapp;

-- Create user table
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email TEXT,
  name TEXT,
  created_at TIMESTAMP
);

-- Create index
CREATE INDEX ON users (email);

-- Insert data
INSERT INTO users (user_id, email, name, created_at)
VALUES (uuid(), 'alice@example.com', 'Alice', toTimestamp(now()));

-- Query data
SELECT * FROM users WHERE email = 'alice@example.com' ALLOW FILTERING;
```

## Configuring Automated Backups

Medusa handles backup operations automatically:

```yaml
# backup-schedule.yaml
apiVersion: medusa.k8ssandra.io/v1alpha1
kind: MedusaBackupSchedule
metadata:
  name: daily-backup
  namespace: cassandra
spec:
  backupSpec:
    cassandraDatacenter: prod-cluster-dc1
    backupType: differential
  cronSchedule: "0 2 * * *"  # Daily at 2 AM
```

Apply the schedule:

```bash
kubectl apply -f backup-schedule.yaml

# Trigger manual backup
cat <<EOF | kubectl apply -f -
apiVersion: medusa.k8ssandra.io/v1alpha1
kind: MedusaBackup
metadata:
  name: manual-backup-$(date +%Y%m%d)
  namespace: cassandra
spec:
  cassandraDatacenter: prod-cluster-dc1
  backupType: full
EOF

# Monitor backup progress
kubectl get medusabackups -n cassandra -w
```

## Restoring from Backup

Restore data when needed:

```yaml
# restore-operation.yaml
apiVersion: medusa.k8ssandra.io/v1alpha1
kind: MedusaRestoreJob
metadata:
  name: restore-20260209
  namespace: cassandra
spec:
  cassandraDatacenter: prod-cluster-dc1
  backup: manual-backup-20260209
```

Execute restore:

```bash
kubectl apply -f restore-operation.yaml

# Monitor restore progress
kubectl get medusarestorejobs -n cassandra -w

# Check logs
kubectl logs -n cassandra -l app.kubernetes.io/name=medusa
```

## Automating Repair Operations

Reaper handles anti-entropy repairs automatically:

```bash
# Access Reaper UI
kubectl port-forward -n cassandra svc/prod-cluster-reaper-service 8080:8080

# Open browser to http://localhost:8080

# Or configure via API
kubectl exec -it -n cassandra prod-cluster-dc1-rack1-sts-0 -- \
  curl -X POST http://prod-cluster-reaper-service:8080/repair_schedule \
  -H "Content-Type: application/json" \
  -d '{
    "clusterName": "prod-cluster",
    "keyspace": "myapp",
    "owner": "admin",
    "intensity": 0.9,
    "scheduleDaysBetween": 7,
    "scheduleTriggerTime": "2026-02-10T02:00:00"
  }'
```

Reaper schedules repairs automatically, preventing data inconsistency.

## Monitoring with Prometheus and Grafana

K8ssandra includes monitoring stack:

```bash
# Port-forward Grafana
kubectl port-forward -n cassandra svc/prod-cluster-grafana 3000:3000

# Get Grafana credentials
kubectl get secret prod-cluster-grafana -n cassandra \
  -o jsonpath='{.data.admin-password}' | base64 -d

# Open browser to http://localhost:3000
# Username: admin
# Password: <from above command>
```

K8ssandra provides pre-built dashboards showing:

- Cluster overview (node status, disk usage)
- Read/write latency percentiles
- Compaction statistics
- Repair progress
- Backup status

## Scaling the Cluster

Add more nodes for capacity:

```bash
# Scale datacenter
kubectl patch k8ssandracluster prod-cluster -n cassandra \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/cassandra/datacenters/0/size", "value": 6}]'

# Cassandra automatically rebalances
kubectl get pods -n cassandra -w

# Monitor rebalancing
kubectl exec -it -n cassandra prod-cluster-dc1-rack1-sts-0 -- \
  nodetool status
```

## Implementing Multi-Datacenter Replication

Add additional datacenters for geo-replication:

```yaml
spec:
  cassandra:
    datacenters:
      - metadata:
          name: dc1
        size: 3
        # ... dc1 configuration ...

      - metadata:
          name: dc2
        size: 3
        storageConfig:
          cassandraDataVolumeClaimSpec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 200Gi
        resources:
          requests:
            cpu: 4000m
            memory: 16Gi
        # ... dc2 configuration ...
```

Update keyspace replication:

```sql
ALTER KEYSPACE myapp WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3,
  'dc2': 3
};

-- Rebuild dc2 from dc1
kubectl exec -it -n cassandra prod-cluster-dc2-rack1-sts-0 -- \
  nodetool rebuild -- dc1
```

## Upgrading Cassandra Version

K8ssandra handles rolling upgrades:

```bash
# Update cluster version
kubectl patch k8ssandracluster prod-cluster -n cassandra \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/cassandra/serverVersion", "value": "4.1.4"}]'

# Operator performs rolling upgrade
kubectl get pods -n cassandra -w

# One pod at a time restarts with new version
```

## Tuning for Performance

Optimize for your workload:

```yaml
spec:
  cassandra:
    datacenters:
      - cassandraConfig:
          cassandraYaml:
            # Increase for write-heavy workloads
            concurrent_writes: 64
            memtable_allocation_type: heap_buffers

            # Adjust compaction
            compaction_throughput_mb_per_sec: 128
            concurrent_compactors: 8

            # Network tuning
            rpc_min_threads: 16
            rpc_max_threads: 2048
```

## Conclusion

K8ssandra transforms Cassandra operations on Kubernetes from a complex challenge into a manageable platform. By bundling essential operational tools like backup, repair, and monitoring, it eliminates the need to assemble and integrate separate components.

The operator-based approach provides declarative cluster management with automated day-2 operations. For teams running Cassandra in production, K8ssandra delivers the reliability and operational automation needed to run distributed NoSQL at scale while significantly reducing operational burden.
