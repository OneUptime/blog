# How to Upgrade PostgreSQL with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Upgrade, Rolling Update, Migration

Description: A comprehensive guide to upgrading PostgreSQL clusters with CloudNativePG, covering minor version updates, major version upgrades, rolling updates, and in-place upgrades with minimal downtime.

---

Keeping PostgreSQL up to date is essential for security, performance, and new features. CloudNativePG supports multiple upgrade strategies including rolling updates for minor versions and in-place upgrades for major versions. This guide covers all upgrade scenarios.

## Prerequisites

- CloudNativePG operator installed
- Running PostgreSQL cluster
- Recent backup verified
- Understanding of PostgreSQL version compatibility

## Upgrade Types

### Minor Version Upgrade (e.g., 16.0 to 16.1)

- Rolling update with zero downtime
- Binary compatible - no data migration needed
- Automatic with image change

### Major Version Upgrade (e.g., 15.x to 16.x)

- Requires data migration (pg_upgrade)
- May require application changes
- More planning and testing needed

## Minor Version Upgrades

### Rolling Update Strategy

CloudNativePG performs rolling updates automatically:

1. Updates replicas first
2. Performs switchover to promote replica
3. Updates old primary last

### Upgrade via Image Change

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 3

  # Change image to new version
  imageName: ghcr.io/cloudnative-pg/postgresql:16.2  # Updated from 16.1

  storage:
    size: 100Gi
```

Apply the change:

```bash
kubectl apply -f cluster.yaml

# Watch rolling update
kubectl get pods -l cnpg.io/cluster=postgres-cluster -w
```

### Configure Update Strategy

```yaml
spec:
  # Update strategy
  primaryUpdateStrategy: unsupervised  # or supervised
  primaryUpdateMethod: switchover       # or restart

  # Minimum wait between updates
  minReadySeconds: 0

  # Maximum time for switchover
  switchoverDelay: 40000000  # microseconds (40s)
```

### Supervised Updates

For critical clusters, use supervised mode:

```yaml
spec:
  primaryUpdateStrategy: supervised
```

With supervised mode:

1. Replicas update automatically
2. Primary waits for manual approval
3. Approve with annotation:

```bash
kubectl annotate cluster postgres-cluster \
  cnpg.io/primaryUpdateStrategy=unsupervised
```

### Monitor Rolling Update

```bash
# Watch pods
kubectl get pods -l cnpg.io/cluster=postgres-cluster -w

# Check cluster status
kubectl describe cluster postgres-cluster

# View events
kubectl get events --field-selector involvedObject.name=postgres-cluster --sort-by='.lastTimestamp'

# Check current image
kubectl get pods -l cnpg.io/cluster=postgres-cluster -o jsonpath='{.items[*].spec.containers[0].image}'
```

## Major Version Upgrades

### Overview

Major upgrades require special handling:

1. **In-Place Upgrade**: Using pg_upgrade within cluster
2. **Import Method**: Create new cluster, import from old
3. **Logical Replication**: Set up replication between versions

### Method 1: Import from Existing Cluster

Create new cluster importing from old:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-v16
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  storage:
    size: 100Gi

  bootstrap:
    initdb:
      import:
        type: microservice  # or monolith
        databases:
          - myapp
        source:
          externalCluster: postgres-v15

  externalClusters:
    - name: postgres-v15
      connectionParameters:
        host: postgres-v15-rw.default.svc
        user: postgres
        dbname: postgres
      password:
        name: postgres-v15-superuser
        key: password
```

### Method 2: pg_upgrade In-Place

For in-place upgrade, use the import bootstrap with same storage:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-upgraded
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  storage:
    size: 100Gi

  bootstrap:
    initdb:
      import:
        type: monolith  # Import entire cluster
        databases:
          - "*"  # All databases
        roles:
          - "*"  # All roles
        source:
          externalCluster: old-cluster

  externalClusters:
    - name: old-cluster
      connectionParameters:
        host: postgres-v15-rw
        user: postgres
      password:
        name: postgres-v15-superuser
        key: password
```

### Method 3: Logical Replication

Set up logical replication between versions:

#### On Source (v15) Cluster

```yaml
spec:
  postgresql:
    parameters:
      wal_level: "logical"
      max_replication_slots: "10"
      max_wal_senders: "10"
```

Create publication:

```sql
CREATE PUBLICATION upgrade_pub FOR ALL TABLES;
```

#### On Target (v16) Cluster

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-v16
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  storage:
    size: 100Gi

  bootstrap:
    initdb:
      database: myapp
      owner: myuser
```

Create subscription:

```sql
CREATE SUBSCRIPTION upgrade_sub
  CONNECTION 'host=postgres-v15-rw dbname=myapp user=replication password=secret'
  PUBLICATION upgrade_pub;
```

## Upgrade Procedures

### Pre-Upgrade Checklist

```bash
# 1. Verify current version
kubectl exec postgres-cluster-1 -- psql -c "SELECT version();"

# 2. Check cluster health
kubectl get cluster postgres-cluster

# 3. Verify recent backup
kubectl get backup -l cnpg.io/cluster=postgres-cluster

# 4. Check replication lag
kubectl exec postgres-cluster-1 -- psql -c "SELECT * FROM pg_stat_replication;"

# 5. Review release notes for breaking changes
```

### Minor Upgrade Procedure

```bash
# 1. Create pre-upgrade backup
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: pre-upgrade-backup
spec:
  cluster:
    name: postgres-cluster
EOF

# Wait for backup
kubectl get backup pre-upgrade-backup -w

# 2. Update cluster image
kubectl patch cluster postgres-cluster --type merge -p '{"spec":{"imageName":"ghcr.io/cloudnative-pg/postgresql:16.2"}}'

# 3. Monitor upgrade
kubectl get pods -l cnpg.io/cluster=postgres-cluster -w

# 4. Verify new version
kubectl exec postgres-cluster-1 -- psql -c "SELECT version();"

# 5. Check cluster health
kubectl get cluster postgres-cluster
```

### Major Upgrade Procedure

```bash
# 1. Create comprehensive backup
kubectl apply -f - <<EOF
apiVersion: postgresql.cnpg.io/v1
kind: Backup
metadata:
  name: pre-major-upgrade-backup
spec:
  cluster:
    name: postgres-v15
EOF

# 2. Test upgrade in staging first

# 3. Create new cluster with import
kubectl apply -f postgres-v16-cluster.yaml

# 4. Wait for import to complete
kubectl get cluster postgres-v16 -w

# 5. Verify data integrity
kubectl exec postgres-v16-1 -- psql -d myapp -c "SELECT COUNT(*) FROM important_table;"

# 6. Update application connection strings

# 7. Monitor for issues

# 8. Decommission old cluster after validation period
```

## Operator Upgrades

### Upgrade CloudNativePG Operator

```bash
# Using Helm
helm repo update
helm upgrade cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system

# Using kubectl
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.22.0/releases/cnpg-1.22.0.yaml
```

### Operator Upgrade Considerations

- Operator upgrades are independent of PostgreSQL upgrades
- Check compatibility matrix before upgrading
- Upgrades are typically backward compatible
- Test in staging first

## Rollback Procedures

### Rollback Minor Version

```bash
# Revert to previous image
kubectl patch cluster postgres-cluster --type merge -p '{"spec":{"imageName":"ghcr.io/cloudnative-pg/postgresql:16.1"}}'

# Monitor rollback
kubectl get pods -l cnpg.io/cluster=postgres-cluster -w
```

### Rollback Major Version

Restore from backup:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-rollback
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:15.5  # Previous version

  storage:
    size: 100Gi

  bootstrap:
    recovery:
      source: pre-upgrade-backup-source

  externalClusters:
    - name: pre-upgrade-backup-source
      barmanObjectStore:
        destinationPath: s3://backups/postgres/
        s3Credentials:
          accessKeyId:
            name: backup-credentials
            key: ACCESS_KEY_ID
          secretAccessKey:
            name: backup-credentials
            key: SECRET_ACCESS_KEY
```

## Zero-Downtime Upgrades

### Configure for Minimal Disruption

```yaml
spec:
  instances: 3  # Minimum 3 for HA during upgrade

  # Fast switchover
  switchoverDelay: 10000000  # 10 seconds

  # Quick health checks
  startDelay: 30
  stopDelay: 30

  # Affinity for spread
  affinity:
    enablePodAntiAffinity: true
    topologyKey: kubernetes.io/hostname
```

### Application Connection Handling

```yaml
# Use read-write service
apiVersion: v1
kind: Service
metadata:
  name: postgres-rw
spec:
  selector:
    cnpg.io/cluster: postgres-cluster
    cnpg.io/instanceRole: primary
  ports:
    - port: 5432
```

Applications should:

1. Use connection pooling
2. Implement retry logic
3. Handle brief disconnections
4. Connect via service, not pod IP

## Monitoring Upgrades

### Key Metrics During Upgrade

```yaml
# Watch these in Prometheus/Grafana:

# Cluster health
cnpg_cluster_ready_instances

# Replication lag
cnpg_pg_replication_lag

# Connection count
pg_stat_activity_count

# WAL position
cnpg_pg_stat_replication_sent_lag_bytes
```

### Alert During Upgrade

```yaml
# Suppress non-critical alerts during maintenance
# Or adjust thresholds temporarily
```

## Troubleshooting

### Upgrade Stuck

```bash
# Check pod status
kubectl describe pod postgres-cluster-2

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Check operator logs
kubectl logs -n cnpg-system deployment/cnpg-controller-manager

# Force pod recreation if needed
kubectl delete pod postgres-cluster-2
```

### Switchover Failed

```bash
# Check cluster status
kubectl describe cluster postgres-cluster

# Manual switchover
kubectl annotate cluster postgres-cluster \
  cnpg.io/targetPrimary=postgres-cluster-2
```

### Import Failed

```bash
# Check import logs
kubectl logs postgres-v16-1

# Verify source connectivity
kubectl exec postgres-v16-1 -- psql "host=postgres-v15-rw user=postgres" -c "SELECT 1"

# Check permissions
kubectl exec postgres-v15-1 -- psql -c "SELECT * FROM pg_hba_file_rules;"
```

## Best Practices

### Upgrade Checklist

1. **Test in staging** - Always test upgrade path first
2. **Create backup** - Verify backup before upgrade
3. **Check compatibility** - Review release notes
4. **Plan maintenance window** - Even for zero-downtime upgrades
5. **Monitor closely** - Watch metrics during upgrade
6. **Have rollback plan** - Know how to revert
7. **Validate after** - Test application functionality

### Recommended Upgrade Frequency

| Type | Frequency | Notes |
|------|-----------|-------|
| Patch releases | Monthly | Security fixes |
| Minor versions | Quarterly | Bug fixes, improvements |
| Major versions | Annually | New features, may need testing |

## Conclusion

PostgreSQL upgrades with CloudNativePG are straightforward:

1. **Minor versions** - Simple image change with rolling update
2. **Major versions** - Use import or logical replication
3. **Always backup** - Before any upgrade
4. **Test first** - In staging environment
5. **Monitor** - During and after upgrade

CloudNativePG handles the complexity of rolling updates and provides multiple options for major version upgrades, making it safe to keep your PostgreSQL clusters current.
