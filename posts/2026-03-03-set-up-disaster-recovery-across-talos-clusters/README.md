# How to Set Up Disaster Recovery Across Talos Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Disaster Recovery, Backups, Velero, Multi-Cluster

Description: Step-by-step instructions for setting up disaster recovery across Talos Linux clusters including backup strategies, failover procedures, and recovery testing.

---

Disaster recovery is not something you think about until you need it, and by then it is too late to set it up. For organizations running production workloads on Talos Linux, having a tested DR plan across clusters is not optional. This guide covers how to set up disaster recovery across Talos Linux clusters, from backing up cluster state to failing over workloads and recovering from total cluster loss.

## Defining Your DR Requirements

Before building anything, define your Recovery Time Objective (RTO) and Recovery Point Objective (RPO). RTO is how long you can afford to be down. RPO is how much data you can afford to lose.

A 4-hour RTO with a 1-hour RPO is very different from a 15-minute RTO with near-zero RPO. The former can use periodic backups. The latter requires active-active or active-passive replication with real-time data sync.

## Backing Up Talos Cluster State

Talos Linux cluster state consists of several components: the etcd database (which holds all Kubernetes state), the Talos machine configurations, persistent volumes, and any external state like DNS records or load balancer configurations.

### Backing Up etcd

etcd is the most critical component. Lose etcd and you lose your entire cluster state. Talos makes etcd backups straightforward:

```bash
# Take an etcd snapshot from a control plane node
talosctl etcd snapshot /tmp/etcd-backup.db \
  --nodes 10.0.1.10

# Verify the snapshot
talosctl etcd snapshot /tmp/etcd-backup-verify.db \
  --nodes 10.0.1.11

# Upload to object storage
aws s3 cp /tmp/etcd-backup.db \
  s3://talos-backups/prod-us/etcd/$(date +%Y%m%d-%H%M%S).db
```

Automate this with a CronJob or external script:

```bash
#!/bin/bash
# backup-etcd.sh - Run via cron every hour

CLUSTER="prod-us"
CONTROL_PLANE="10.0.1.10"
BUCKET="s3://talos-backups/$CLUSTER/etcd"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Take snapshot
talosctl etcd snapshot /tmp/etcd-$TIMESTAMP.db \
  --nodes $CONTROL_PLANE

# Upload to S3
aws s3 cp /tmp/etcd-$TIMESTAMP.db "$BUCKET/$TIMESTAMP.db"

# Clean up local file
rm /tmp/etcd-$TIMESTAMP.db

# Clean up old backups (keep 7 days)
aws s3 ls "$BUCKET/" | while read -r line; do
  backup_date=$(echo "$line" | awk '{print $1}')
  if [[ $(date -d "$backup_date" +%s) -lt $(date -d "7 days ago" +%s) ]]; then
    file=$(echo "$line" | awk '{print $4}')
    aws s3 rm "$BUCKET/$file"
  fi
done
```

### Backing Up Machine Configurations

Store your Talos machine configurations in Git. But also back up the running configuration from each node as a safety net:

```bash
# Backup running config from all nodes
for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
  talosctl get machineconfig -n $node -o yaml > \
    "backups/machineconfig-$node-$(date +%Y%m%d).yaml"
done
```

### Backing Up Persistent Volumes with Velero

Velero is the standard tool for backing up Kubernetes resources and persistent volumes. Install it on each cluster:

```bash
# Install Velero with S3 backend
velero install \
  --provider aws \
  --bucket talos-backups \
  --secret-file ./aws-credentials \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --use-volume-snapshots=true
```

Create scheduled backups:

```bash
# Full cluster backup every 6 hours
velero schedule create full-backup \
  --schedule="0 */6 * * *" \
  --ttl 168h  # Keep for 7 days

# Critical namespace backup every hour
velero schedule create critical-apps \
  --schedule="0 * * * *" \
  --include-namespaces production,databases \
  --ttl 72h
```

## Active-Passive Failover

For faster recovery, set up an active-passive configuration where a standby cluster is always ready to take over.

### Preparing the Standby Cluster

The standby cluster should mirror the primary cluster's infrastructure components:

```yaml
# On the standby cluster, deploy the same infrastructure
# but with applications scaled to zero
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 0  # Standby - will scale up during failover
  selector:
    matchLabels:
      app: api-server
  template:
    spec:
      containers:
        - name: api
          image: api-server:v2.3.1
```

### Data Replication

For stateful workloads, you need data replication between clusters. Use database-native replication when possible:

```yaml
# PostgreSQL streaming replication to standby cluster
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: app-db
  namespace: databases
spec:
  instances: 3
  replica:
    enabled: true
    source: app-db-primary
  externalClusters:
    - name: app-db-primary
      connectionParameters:
        host: db.primary-cluster.example.com
        user: replication
      password:
        name: replication-credentials
        key: password
```

### Failover Procedure

Document and automate your failover procedure. A typical sequence looks like this:

```bash
#!/bin/bash
# failover.sh - Execute failover to standby cluster

STANDBY_CONTEXT="standby-cluster"

echo "Starting failover to standby cluster"

# Step 1: Promote database replicas
kubectl --context $STANDBY_CONTEXT exec -n databases app-db-1 -- \
  pg_ctl promote

# Step 2: Scale up application deployments
kubectl --context $STANDBY_CONTEXT scale deployment \
  -n production --all --replicas=3

# Step 3: Update DNS to point to standby cluster
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "'$STANDBY_LB_IP'"}]
      }
    }]
  }'

# Step 4: Verify services are healthy
kubectl --context $STANDBY_CONTEXT get pods -n production
kubectl --context $STANDBY_CONTEXT run health-check --rm -it --image=busybox -- \
  wget -qO- http://api-server.production.svc:8080/health

echo "Failover complete"
```

## Recovering from Total Cluster Loss

If a cluster is completely lost, here is how to rebuild it using your backups:

```bash
# Step 1: Generate new Talos configs from your Git repository
./scripts/generate.sh prod-us

# Step 2: Provision new nodes with Talos
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file generated/prod-us/controlplane.yaml

# Step 3: Bootstrap the cluster
talosctl bootstrap --nodes 10.0.1.10

# Step 4: Wait for the cluster to be ready
talosctl health --wait-timeout 600s

# Step 5: Restore etcd from backup (if not starting fresh)
talosctl etcd restore /tmp/etcd-backup.db --nodes 10.0.1.10

# Step 6: Restore Kubernetes resources from Velero backup
velero restore create --from-backup full-backup-20260301-060000 \
  --restore-volumes=true
```

## Testing Your DR Plan

A disaster recovery plan that has not been tested is just a document full of assumptions. Schedule regular DR drills:

```bash
#!/bin/bash
# dr-drill.sh - Quarterly DR drill

echo "=== DR Drill Started ==="
echo "Simulating loss of primary cluster"

# Record start time
START=$(date +%s)

# Execute failover
./failover.sh

# Run smoke tests against standby
./smoke-tests.sh standby-cluster

# Record recovery time
END=$(date +%s)
RECOVERY_TIME=$((END - START))

echo "Recovery completed in $RECOVERY_TIME seconds"
echo "RTO target: 900 seconds"

if [ $RECOVERY_TIME -gt 900 ]; then
  echo "WARNING: Recovery exceeded RTO target"
fi

echo "=== DR Drill Complete ==="
```

Track your RTO and RPO measurements over time. They should improve as you refine your procedures.

## Key Practices

Keep backups in a different region than your primary cluster. Test restores regularly, not just backups. Automate everything you can - manual steps during a disaster are where mistakes happen. Document the failover procedure and make sure multiple team members know how to execute it. Use runbooks with clear, numbered steps.

Talos Linux helps with disaster recovery in a few specific ways. The immutable OS means there is no node-level configuration to reconstruct - just reapply the machine config. The API-driven approach means cluster bootstrapping can be fully automated. And the minimal attack surface means fewer things can break in unexpected ways during a high-pressure recovery scenario.

Plan for the worst, test regularly, and hope you never need any of it.
