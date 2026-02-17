# How to Set Up AlloyDB Omni for Running AlloyDB On-Premises

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB Omni, PostgreSQL, On-Premises, Hybrid Cloud

Description: A practical guide to installing and running AlloyDB Omni on your own infrastructure, bringing AlloyDB performance features to on-premises and hybrid cloud environments.

---

AlloyDB Omni is Google's answer to the question: "What if I want AlloyDB's performance features but cannot or will not run in Google Cloud?" It is a downloadable version of AlloyDB that runs on your own hardware, in other clouds, or anywhere you can run a container. You get the same columnar engine, adaptive autovacuum, and performance optimizations, but you manage the infrastructure yourself.

In this post, I will walk through installing AlloyDB Omni, configuring it for production use, and understanding what you get versus what you give up compared to the fully managed AlloyDB service.

## What AlloyDB Omni Includes

AlloyDB Omni gives you:

- The AlloyDB-enhanced PostgreSQL engine
- The columnar engine for analytical query acceleration
- Adaptive autovacuum
- PostgreSQL wire protocol compatibility (works with any PostgreSQL client)
- Container-based deployment using Docker or Kubernetes

What you do not get:

- Automatic failover and high availability (you manage this yourself)
- Managed backups (you handle backup and restore)
- The disaggregated storage layer (Omni uses local storage)
- Automatic patching and upgrades
- Google Cloud integration (IAM, VPC, Cloud Monitoring)

## Prerequisites

AlloyDB Omni runs as a container, so you need:

- Docker Engine 20.10+ or a Kubernetes cluster
- A Linux host (Ubuntu 20.04+, Debian 11+, CentOS 7+, or RHEL 8+)
- At least 4 GB of RAM (8+ GB recommended)
- At least 2 CPU cores (4+ recommended)
- Sufficient disk space for your data

## Step 1 - Install Docker

If Docker is not already installed:

```bash
# Install Docker on Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl enable docker
sudo systemctl start docker

# Add your user to the docker group
sudo usermod -aG docker $USER
```

## Step 2 - Pull the AlloyDB Omni Image

AlloyDB Omni is distributed as a container image through Google's Artifact Registry:

```bash
# Pull the AlloyDB Omni container image
docker pull gcr.io/alloydb-omni/pg-service:latest
```

You can also pull a specific version:

```bash
# Pull a specific version of AlloyDB Omni
docker pull gcr.io/alloydb-omni/pg-service:15.5.2
```

## Step 3 - Create a Data Directory

AlloyDB Omni stores database files in a volume. Create a directory on the host:

```bash
# Create a directory for AlloyDB Omni data
sudo mkdir -p /var/lib/alloydb-omni/data
sudo chmod 700 /var/lib/alloydb-omni/data
```

## Step 4 - Start AlloyDB Omni

Run the container with the following command:

```bash
# Start AlloyDB Omni with persistent storage
docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your_strong_password \
  -e PGDATA=/var/lib/postgresql/data \
  -v /var/lib/alloydb-omni/data:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  --shm-size=1g \
  gcr.io/alloydb-omni/pg-service:latest
```

Let me explain each flag:

- `-e POSTGRES_PASSWORD` - Sets the password for the postgres superuser
- `-e PGDATA` - Specifies the data directory inside the container
- `-v` - Mounts the host directory for persistent storage
- `-p 5432:5432` - Maps PostgreSQL port to the host
- `--restart unless-stopped` - Automatically restart the container after host reboot
- `--shm-size=1g` - Allocates shared memory for PostgreSQL (increase for larger workloads)

Check that it started successfully:

```bash
# Check the container status
docker logs alloydb-omni --tail=20

# Verify the container is running
docker ps | grep alloydb-omni
```

## Step 5 - Connect and Configure

Connect to AlloyDB Omni using any PostgreSQL client:

```bash
# Connect using psql
psql -h localhost -U postgres -p 5432
```

Create your application database and users:

```sql
-- Create an application database
CREATE DATABASE myapp;

-- Create an application user with a strong password
CREATE USER appuser WITH PASSWORD 'app_password_here';
GRANT ALL PRIVILEGES ON DATABASE myapp TO appuser;

-- Verify the AlloyDB version
SELECT version();
```

The version output should show AlloyDB Omni branding, confirming you are running the enhanced engine.

## Step 6 - Enable the Columnar Engine

The columnar engine is one of the main reasons to use AlloyDB Omni over vanilla PostgreSQL. Enable it:

```sql
-- Enable the columnar engine
ALTER SYSTEM SET google_columnar_engine.enabled = 'on';

-- Configure memory allocation for the columnar engine (30% of available memory)
ALTER SYSTEM SET google_columnar_engine.memory_size_percentage = 30;

-- Reload the configuration
SELECT pg_reload_conf();

-- Verify it is enabled
SHOW google_columnar_engine.enabled;
```

## Step 7 - Configure for Production

For production use, tune the PostgreSQL settings. Create a custom configuration:

```bash
# Create a custom PostgreSQL configuration file
# This will be mounted into the container
cat > /var/lib/alloydb-omni/custom.conf << 'CONF'
# Connection settings
max_connections = 200
listen_addresses = '*'

# Memory settings (adjust based on available RAM)
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB

# Write-ahead log
wal_buffers = 64MB
wal_level = replica
max_wal_senders = 5

# Autovacuum (AlloyDB adaptive autovacuum is built-in)
autovacuum_max_workers = 5
autovacuum_vacuum_cost_delay = 2ms

# Logging
log_min_duration_statement = 1000
log_checkpoints = on
log_connections = on
log_disconnections = on

# Columnar engine
google_columnar_engine.enabled = on
google_columnar_engine.memory_size_percentage = 30
CONF
```

Restart the container to apply the configuration:

```bash
# Stop and recreate the container with the custom config
docker stop alloydb-omni
docker rm alloydb-omni

docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your_strong_password \
  -e PGDATA=/var/lib/postgresql/data \
  -v /var/lib/alloydb-omni/data:/var/lib/postgresql/data \
  -v /var/lib/alloydb-omni/custom.conf:/var/lib/postgresql/data/postgresql.auto.conf:ro \
  -p 5432:5432 \
  --restart unless-stopped \
  --shm-size=2g \
  gcr.io/alloydb-omni/pg-service:latest
```

## Running AlloyDB Omni on Kubernetes

For Kubernetes deployments, use a StatefulSet with persistent volumes:

```yaml
# StatefulSet for AlloyDB Omni on Kubernetes
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: alloydb-omni
spec:
  serviceName: alloydb-omni
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
          image: gcr.io/alloydb-omni/pg-service:latest
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: alloydb-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data
          resources:
            requests:
              cpu: "2"
              memory: 8Gi
            limits:
              cpu: "4"
              memory: 16Gi
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
---
# Service to expose AlloyDB Omni
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

Apply it:

```bash
# Create the secret and deploy
kubectl create secret generic alloydb-secret --from-literal=password=your_strong_password
kubectl apply -f alloydb-omni-k8s.yaml
```

## Setting Up Backups

Since AlloyDB Omni does not have managed backups, you need to handle this yourself:

```bash
# Create a backup using pg_basebackup
docker exec alloydb-omni pg_basebackup \
  -U postgres \
  -D /tmp/backup \
  --format=tar \
  --gzip \
  --checkpoint=fast

# Copy the backup out of the container
docker cp alloydb-omni:/tmp/backup /var/backups/alloydb-omni/

# Or use pg_dump for logical backups
docker exec alloydb-omni pg_dump \
  -U postgres \
  -d myapp \
  --format=custom \
  -f /tmp/myapp.dump

docker cp alloydb-omni:/tmp/myapp.dump /var/backups/alloydb-omni/
```

Schedule backups with cron:

```bash
# Add a daily backup cron job
echo "0 2 * * * docker exec alloydb-omni pg_dump -U postgres -d myapp -Fc -f /tmp/daily.dump && docker cp alloydb-omni:/tmp/daily.dump /var/backups/alloydb-omni/daily-\$(date +\%Y\%m\%d).dump" | crontab -
```

## Upgrading AlloyDB Omni

To upgrade to a new version:

```bash
# Pull the new image
docker pull gcr.io/alloydb-omni/pg-service:NEW_VERSION

# Stop the current container
docker stop alloydb-omni
docker rm alloydb-omni

# Start with the new image (data persists in the mounted volume)
docker run -d \
  --name alloydb-omni \
  -e POSTGRES_PASSWORD=your_strong_password \
  -e PGDATA=/var/lib/postgresql/data \
  -v /var/lib/alloydb-omni/data:/var/lib/postgresql/data \
  -p 5432:5432 \
  --restart unless-stopped \
  --shm-size=2g \
  gcr.io/alloydb-omni/pg-service:NEW_VERSION
```

Always take a backup before upgrading.

## When to Use AlloyDB Omni vs Managed AlloyDB

**Use Omni when:** You have regulatory requirements that mandate on-premises data storage, you want to run in a non-GCP cloud, you need to test AlloyDB features before committing to the managed service, or you want the columnar engine in your existing Kubernetes infrastructure.

**Use managed AlloyDB when:** You want fully managed operations with zero infrastructure work, you need built-in HA and automatic failover, you want tight GCP integration, or you prefer to minimize operational burden.

AlloyDB Omni brings AlloyDB's key performance features - the columnar engine, adaptive autovacuum, and the optimized PostgreSQL engine - to any environment where you can run containers. The trade-off is that you own the operations. For teams already running PostgreSQL on their own infrastructure, Omni is a meaningful performance upgrade with minimal deployment friction.
