# How to Use AlloyDB Omni for On-Premises and Multi-Cloud PostgreSQL Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB Omni, PostgreSQL, Multi-Cloud, On-Premises

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
# The PG_PASSWORD environment variable sets the postgres user password
docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e PG_DATABASE=myapp \
  -v /data/alloydb-omni:/var/lib/postgresql/data \
  -p 5432:5432 \
  google/alloydbomni:latest
```

Wait about 30 seconds for the database to initialize, then connect:

```bash
# Connect using psql
psql -h localhost -U postgres -d myapp

# Verify AlloyDB Omni is running
SELECT version();
# Should show something like: PostgreSQL 15.x (AlloyDB Omni ...)
```

## Deploying on Kubernetes

For production workloads, deploy AlloyDB Omni on Kubernetes with proper resource management and persistence.

```yaml
# alloydb-omni-deployment.yaml
# This deployment runs AlloyDB Omni with persistent storage
# and resource limits appropriate for a production workload
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: alloydb-omni-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
---
apiVersion: v1
kind: Secret
metadata:
  name: alloydb-omni-secret
type: Opaque
stringData:
  POSTGRES_PASSWORD: "your-secure-password"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alloydb-omni
  labels:
    app: alloydb-omni
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alloydb-omni
  template:
    metadata:
      labels:
        app: alloydb-omni
    spec:
      containers:
        - name: alloydb-omni
          image: google/alloydbomni:latest
          ports:
            - containerPort: 5432
          envFrom:
            - secretRef:
                name: alloydb-omni-secret
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
            limits:
              cpu: "8"
              memory: "32Gi"
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - postgres
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: alloydb-omni-data
---
apiVersion: v1
kind: Service
metadata:
  name: alloydb-omni
spec:
  selector:
    app: alloydb-omni
  ports:
    - port: 5432
      targetPort: 5432
  type: ClusterIP
```

Deploy it:

```bash
# Apply the Kubernetes manifests
kubectl apply -f alloydb-omni-deployment.yaml

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod -l app=alloydb-omni --timeout=120s

# Connect to the database from within the cluster
kubectl exec -it deploy/alloydb-omni -- psql -U postgres -d myapp
```

## Enabling the Columnar Engine

The columnar engine works in AlloyDB Omni just like it does in the managed service. Enable it through configuration:

```bash
# If running with Docker, pass additional configuration
docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e ALLOYDB_OMNI_COLUMNAR_ENGINE_ENABLED=true \
  -e ALLOYDB_OMNI_COLUMNAR_ENGINE_MEMORY_SIZE=4294967296 \
  -v /data/alloydb-omni:/var/lib/postgresql/data \
  -p 5432:5432 \
  google/alloydbomni:latest
```

Or configure it through postgresql.conf:

```sql
-- Connect to the database and enable the columnar engine
ALTER SYSTEM SET google_columnar_engine.enabled = on;
ALTER SYSTEM SET google_columnar_engine.memory_size_in_bytes = 4294967296;

-- Reload the configuration
SELECT pg_reload_conf();

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
# Set up automated backups using pg_basebackup
# Run this as a cron job for regular backups

#!/bin/bash
# backup-alloydb.sh
# Creates a full physical backup and uploads to object storage

BACKUP_DIR="/backups/alloydb/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Take a physical backup using pg_basebackup
docker exec alloydb-omni pg_basebackup \
  -U postgres \
  -D /tmp/backup \
  -Ft -z -P

# Copy the backup out of the container
docker cp alloydb-omni:/tmp/backup/base.tar.gz "$BACKUP_DIR/"

# Upload to object storage (works with any S3-compatible storage)
aws s3 cp "$BACKUP_DIR/base.tar.gz" \
  "s3://my-backups/alloydb/$(date +%Y-%m-%d)/base.tar.gz"

echo "Backup completed: $BACKUP_DIR"
```

For continuous archiving with WAL:

```sql
-- Enable WAL archiving for point-in-time recovery
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /backups/wal/%f';
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
