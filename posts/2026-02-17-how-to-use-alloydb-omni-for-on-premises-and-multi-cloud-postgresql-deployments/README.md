# How to Use AlloyDB Omni for On-Premises and Multi-Cloud PostgreSQL Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB Omni, PostgreSQL, Multi-Cloud, On-Premise

Description: A hands-on guide to deploying AlloyDB Omni for running Google's enhanced PostgreSQL engine on-premises, on other clouds, or anywhere you need it.

---

AlloyDB Omni brings Google's AlloyDB engine to environments outside of GCP. If you want the performance benefits of AlloyDB - the columnar engine, the adaptive caching, the PostgreSQL compatibility - but need to run it on-premises, on AWS, or in your own Kubernetes cluster, Omni is how you do it.

I was skeptical at first. Running a cloud database engine outside the cloud sounded like it would be a stripped-down experience. But after deploying it in a few different environments, I found that the core performance features actually work as expected. The columnar engine, the intelligent caching, and the compatibility with standard PostgreSQL tools are all there.

## What AlloyDB Omni Includes

AlloyDB Omni is distributed as a container image that you can run anywhere Docker or Kubernetes is available. It includes the AlloyDB storage engine with its columnar capabilities, the adaptive buffer pool, and the ML integration features. What it does not include is the managed infrastructure - you handle backups, high availability, and scaling yourself.

The licensing model is straightforward: free for development and testing, with a per-vCPU license for production use.

## Running AlloyDB Omni with Docker

The fastest way to get started is running the container directly with Docker.

```bash
# Pull the AlloyDB Omni container image

docker pull google/alloydbomni:latest

# Create a directory for persistent data
mkdir -p /data/alloydb-omni

# Run AlloyDB Omni as a Docker container
# The POSTGRES_PASSWORD environment variable sets the postgres user password
docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your-secure-password \
  -v /data/alloydb-omni:/var/lib/postgresql/data \
  -p 5432:5432 \
  google/alloydbomni:latest
```

Wait about 30 seconds for the database to initialize, then connect:

```bash
# Create the application database
docker exec -it alloydb-omni createdb -U postgres myapp

# Connect using psql
psql -h localhost -U postgres -d myapp

# Verify AlloyDB Omni is running
SELECT version();
# Should show something like: PostgreSQL <major-version> (AlloyDB Omni ...)
```

## Deploying on Kubernetes

For production workloads, deploy AlloyDB Omni on Kubernetes with proper resource management and persistence.

```yaml
# alloydb-omni-deployment.yaml
# This DBCluster manifest assumes the AlloyDB Omni Kubernetes operator
# is already installed in the cluster.
apiVersion: v1
kind: Namespace
metadata:
  name: alloydb-omni
---
apiVersion: v1
kind: Secret
metadata:
  name: db-pw-alloydb-omni
  namespace: alloydb-omni
type: Opaque
data:
  alloydb-omni: "eW91ci1zZWN1cmUtcGFzc3dvcmQ="
---
apiVersion: alloydbomni.dbadmin.goog/v1
kind: DBCluster
metadata:
  name: alloydb-omni
  namespace: alloydb-omni
spec:
  databaseVersion: "17.5.0"
  primarySpec:
    adminUser:
      passwordRef:
        name: db-pw-alloydb-omni
    resources:
      cpu: 4
      memory: 32Gi
      disks:
      - name: DataDisk
        size: 100Gi
```

Deploy it:

```bash
# Apply the Kubernetes manifests
kubectl apply -f alloydb-omni-deployment.yaml

# Check the database cluster status
kubectl get dbclusters.alloydbomni.dbadmin.goog alloydb-omni -n alloydb-omni

# Connect to the database from the database pod
export DBPOD=$(kubectl get pod \
  --selector=alloydbomni.internal.dbadmin.goog/dbcluster=alloydb-omni,alloydbomni.internal.dbadmin.goog/task-type=database \
  -n alloydb-omni \
  -o jsonpath='{.items[0].metadata.name}')
kubectl exec -ti "$DBPOD" -n alloydb-omni -c database -- psql -h localhost -U postgres
```

## Enabling the Columnar Engine

The columnar engine works in AlloyDB Omni just like it does in the managed service. Enable it through configuration:

```yaml
# If running on Kubernetes, add parameters to the DBCluster manifest
apiVersion: alloydbomni.dbadmin.goog/v1
kind: DBCluster
metadata:
  name: alloydb-omni
  namespace: alloydb-omni
spec:
  databaseVersion: "17.5.0"
  primarySpec:
    parameters:
      google_columnar_engine.enabled: "on"
      google_columnar_engine.memory_size_in_mb: "4096"
```

Or configure it through postgresql.conf:

```sql
-- Connect to the database and enable the columnar engine
ALTER SYSTEM SET google_columnar_engine.enabled = 'on';
ALTER SYSTEM SET google_columnar_engine.memory_size_in_mb = 4096;

-- Restart the AlloyDB Omni container for the changes to take effect
-- docker restart alloydb-omni

-- Verify the columnar engine is active
SHOW google_columnar_engine.enabled;
```

## Deploying on AWS EC2

AlloyDB Omni runs on any cloud. Here is an example deploying on AWS with an EC2 instance:

```bash
# Launch an EC2 instance (using AWS CLI)
# Use a compute-optimized instance for best database performance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type c5.4xlarge \
  --key-name my-key \
  --security-group-ids sg-12345 \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":200,"VolumeType":"gp3","Iops":10000}}]'

# SSH into the instance and install Docker
ssh -i my-key.pem ec2-user@<instance-ip>
sudo yum install -y docker
sudo systemctl start docker

# Run AlloyDB Omni
sudo mkdir -p /data/alloydb
sudo docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your-secure-password \
  -v /data/alloydb:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  google/alloydbomni:latest
```

## Configuring Backups

Since AlloyDB Omni is self-managed, you need to handle your own backup strategy:

```bash
#!/bin/bash
# Set up automated backups using pgBackRest
# After completing the one-time pgBackRest setup and stanza-create step,
# Run this as a cron job for regular backups

# backup-alloydb.sh
# Creates a full physical backup and uploads to object storage

BACKUP_DIR="/backups/alloydb/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Take a full physical backup using the pgBackRest utility included in the container
docker exec -u postgres alloydb-omni pgbackrest \
  --config-path=/var/lib/postgresql/backups \
  --stanza=omni \
  --type=full \
  backup

# Copy the backup out of the container
docker cp alloydb-omni:/var/lib/postgresql/backups/. "$BACKUP_DIR/"

# Upload to object storage (works with any S3-compatible storage)
aws s3 sync "$BACKUP_DIR/" \
  "s3://my-backups/alloydb/$(date +%Y-%m-%d)/"

echo "Backup completed: $BACKUP_DIR"
```

For continuous archiving with WAL:

```sql
-- Enable WAL archiving for point-in-time recovery
ALTER SYSTEM SET archive_command = 'pgbackrest --config-path=/var/lib/postgresql/backups --stanza=omni archive-push %p';
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET wal_level = replica;

-- Restart required for archive_mode change
-- docker restart alloydb-omni
```

## Application Migration

Migrating an existing PostgreSQL application to AlloyDB Omni is straightforward since it is wire-compatible:

```bash
# Dump your existing PostgreSQL database
pg_dump -h old-postgres-host -U postgres -d myapp -Fc > myapp.dump

# Restore into AlloyDB Omni
pg_restore -h localhost -U postgres -d myapp -Fc myapp.dump

# Run your application with the new connection string
# No application code changes needed
export DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp"
```

## Monitoring AlloyDB Omni

Set up monitoring using standard PostgreSQL tools:

```sql
-- Check database performance statistics
SELECT
  datname,
  numbackends AS active_connections,
  xact_commit AS transactions_committed,
  xact_rollback AS transactions_rolled_back,
  blks_read AS disk_blocks_read,
  blks_hit AS cache_hits,
  ROUND(
    blks_hit::numeric / NULLIF(blks_hit + blks_read, 0) * 100, 2
  ) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = 'myapp';

-- Monitor long-running queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle'
ORDER BY duration DESC;
```

## Summary

AlloyDB Omni brings the AlloyDB engine to any environment where you can run containers. Whether you need it on-premises for data residency requirements, on AWS for a multi-cloud strategy, or in your Kubernetes cluster for development parity, the deployment process is the same: run the container, configure persistent storage, and connect. You get the columnar engine, adaptive caching, and full PostgreSQL compatibility. The trade-off is that you manage the operational aspects yourself - backups, high availability, and scaling. For teams that already have infrastructure management capabilities and want the AlloyDB performance benefits without being locked into GCP, Omni is a solid option.
