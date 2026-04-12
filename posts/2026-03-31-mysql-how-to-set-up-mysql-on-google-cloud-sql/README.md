# How to Set Up MySQL on Google Cloud SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Google Cloud SQL, GCP, Cloud Database, Infrastructure

Description: Learn how to create and configure a MySQL instance on Google Cloud SQL, connect securely, and manage backups, replicas, and database flags.

---

## What Is Google Cloud SQL for MySQL

Google Cloud SQL is a fully managed relational database service on Google Cloud Platform that supports MySQL 8.0 and 8.4 (MySQL 5.7 is deprecated). It automates backups, replication, patches, and failover, letting you focus on application development rather than database operations.

## Prerequisites

- A Google Cloud project with billing enabled
- `gcloud` CLI installed and authenticated
- Cloud SQL Admin API enabled

```bash
gcloud services enable sqladmin.googleapis.com
```

## Create a Cloud SQL MySQL Instance

```bash
gcloud sql instances create my-mysql-instance \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=100GB \
  --storage-auto-increase \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=4 \
  --availability-type=REGIONAL \
  --no-assign-ip
```

The `--availability-type=REGIONAL` flag enables High Availability with automatic failover.

## Set the Root Password and Create a Database

```bash
# Set root password
gcloud sql users set-password root \
  --host=% \
  --instance=my-mysql-instance \
  --password=S3cur3P@ssw0rd

# Create a database
gcloud sql databases create appdb \
  --instance=my-mysql-instance

# Create an application user
gcloud sql users create appuser \
  --host=% \
  --instance=my-mysql-instance \
  --password=AppP@ssw0rd
```

## Connect Securely Using Cloud SQL Auth Proxy

The Cloud SQL Auth Proxy is the recommended way to connect without exposing the instance publicly:

```bash
# Download the proxy
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.0.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

# Start the proxy
./cloud-sql-proxy my-project:us-central1:my-mysql-instance --port=3306 &

# Connect via local port
mysql -u root -p -h 127.0.0.1 -P 3306
```

## Configure Database Flags

Database flags are equivalent to `my.cnf` settings:

```bash
gcloud sql instances patch my-mysql-instance \
  --database-flags=slow_query_log=on,long_query_time=2,max_connections=200
```

## Create a Read Replica

```bash
gcloud sql instances create my-mysql-replica \
  --master-instance-name=my-mysql-instance \
  --region=us-east1 \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2
```

## Set Up Automated Backups and Point-in-Time Recovery

```bash
gcloud sql instances patch my-mysql-instance \
  --backup-start-time=02:00 \
  --enable-bin-log \
  --retained-backups-count=14 \
  --retained-transaction-log-days=7
```

## Connect from a Kubernetes Pod Using Workload Identity

```yaml
# cloud-sql-proxy sidecar in a Kubernetes pod
containers:
  - name: cloud-sql-proxy
    image: gcr.io/cloud-sql-connectors/cloud-sql-proxy:2
    args:
      - "--structured-logs"
      - "--port=3306"
      - "my-project:us-central1:my-mysql-instance"
    resources:
      requests:
        memory: "64Mi"
        cpu: "100m"
```

## Monitor Using Cloud Monitoring

```bash
# View instance metrics
gcloud monitoring metrics list --filter="metric.type:cloudsql.googleapis.com"

# Set up an alert for high CPU
gcloud alpha monitoring policies create \
  --notification-channels=projects/my-project/notificationChannels/abc123 \
  --display-name="MySQL High CPU" \
  --condition-display-name="CPU > 80%" \
  --condition-filter='resource.type="cloudsql_database" AND metric.type="cloudsql.googleapis.com/database/cpu/utilization"' \
  --condition-threshold-value=0.8
```

## Summary

Google Cloud SQL for MySQL offers a fully managed MySQL experience with automatic backups, High Availability failover, and seamless integration with other GCP services. Using the Cloud SQL Auth Proxy for secure connections and configuring database flags for performance tuning makes it straightforward to run production MySQL workloads on GCP.
