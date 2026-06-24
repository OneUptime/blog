# How to Set Up Rancher with an External Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Database, High Availability, Installation

Description: Configure Rancher to use an external MySQL or PostgreSQL database for improved reliability and easier backups.

By default, single-server K3s uses an embedded SQLite database. For production Rancher deployments on K3s, using an external database for the K3s datastore provides better reliability, easier backup and restore procedures, and separation of concerns between compute and storage. This guide covers setting up Rancher on K3s with both external MySQL and PostgreSQL databases.

## Prerequisites

- Two or more Linux servers (Ubuntu 22.04) for the K3s cluster
- An external database server (MySQL 8.0+ or PostgreSQL 14+) or a managed database service
- Network connectivity between the K3s nodes and the database server
- A domain name for Rancher
- SSH access to all servers

## Architecture

```plaintext
K3s Node 1 --+
              +--> External Database (MySQL/PostgreSQL)
K3s Node 2 --+
```

The K3s server nodes use the external database for cluster state storage. Rancher runs on top of the K3s cluster.

## Option A: Setting Up with MySQL

### Step 1: Prepare the MySQL Database

If you are running your own MySQL server, install and configure it:

```bash
ssh ubuntu@db-server

sudo apt update
sudo apt install -y mysql-server

sudo systemctl start mysql
sudo systemctl enable mysql
```

Create the database and user for K3s:

```bash
sudo mysql -u root <<EOF
CREATE DATABASE k3s;
CREATE USER 'k3s'@'%' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON k3s.* TO 'k3s'@'%';
FLUSH PRIVILEGES;
EOF
```

Configure MySQL to accept remote connections:

```bash
sudo sed -i 's/bind-address\s*=\s*127.0.0.1/bind-address = 0.0.0.0/' /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql
```

If you are using a managed database service like Amazon RDS, Azure Database for MySQL, or Google Cloud SQL, create a MySQL instance through the cloud console and note the connection endpoint, username, and password.

### Step 2: Install K3s with MySQL Datastore

On the first K3s node:

```bash
ssh ubuntu@192.168.1.101

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint='mysql://k3s:YourSecurePassword123!@tcp(db-server:3306)/k3s' \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com
```

On additional K3s nodes, use the same datastore endpoint:

```bash
ssh ubuntu@192.168.1.102

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint='mysql://k3s:YourSecurePassword123!@tcp(db-server:3306)/k3s' \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --token <server-token>
```

If you did not set `--token` on the first server, you can retrieve the generated server token from `/var/lib/rancher/k3s/server/token`.

## Option B: Setting Up with PostgreSQL

### Step 1: Prepare the PostgreSQL Database

Install PostgreSQL:

```bash
ssh ubuntu@db-server

sudo apt update
sudo apt install -y postgresql postgresql-contrib

sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create the database and user:

```bash
sudo -u postgres psql <<EOF
CREATE DATABASE k3s;
CREATE USER k3s WITH PASSWORD 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON DATABASE k3s TO k3s;
ALTER DATABASE k3s OWNER TO k3s;
EOF
```

Configure PostgreSQL to accept remote connections:

```bash
echo "host all all 0.0.0.0/0 md5" | sudo tee -a /etc/postgresql/14/main/pg_hba.conf
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/14/main/postgresql.conf
sudo systemctl restart postgresql
```

### Step 2: Install K3s with PostgreSQL Datastore

On the first node:

```bash
ssh ubuntu@192.168.1.101

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint='postgres://k3s:YourSecurePassword123!@db-server:5432/k3s?sslmode=disable' \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com
```

On additional nodes:

```bash
ssh ubuntu@192.168.1.102

curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint='postgres://k3s:YourSecurePassword123!@db-server:5432/k3s?sslmode=disable' \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --token <server-token>
```

For production environments, change `sslmode=disable` to `sslmode=require` or `sslmode=verify-full` with the appropriate CA certificate.

## Step 3: Verify the Cluster

On any K3s node:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
```

All nodes should show Ready status.

## Step 4: Install Helm, cert-manager, and Rancher

On the first node:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Install Helm

curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Wait for cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager
kubectl -n cert-manager rollout status deploy/cert-manager-webhook
kubectl -n cert-manager rollout status deploy/cert-manager-cainjector

# Install Rancher
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
kubectl create namespace cattle-system

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=2
```

## Step 5: Verify Rancher

```bash
kubectl -n cattle-system rollout status deploy/rancher
kubectl -n cattle-system get pods -o wide
```

## Database Backup Strategies

With an external database, you can use standard database backup tools independently of the K3s cluster. In addition to backing up the database itself, also back up the K3s server token at `/var/lib/rancher/k3s/server/token`, because K3s requires the same token value when restoring the cluster.

### MySQL Backup

```bash
mysqldump -h db-server -u k3s -p k3s > k3s-backup-$(date +%Y%m%d).sql
```

### PostgreSQL Backup

```bash
pg_dump -h db-server -U k3s k3s > k3s-backup-$(date +%Y%m%d).sql
```

### Automated Backups with Cron

```bash
# Add to crontab on a management server
0 2 * * * mysqldump -h db-server -u k3s -pYourPassword k3s | gzip > /backups/k3s-$(date +\%Y\%m\%d).sql.gz
```

## Using Managed Database Services

For production deployments, managed database services reduce operational overhead:

- **Amazon RDS**: Use the standard K3s MySQL or PostgreSQL datastore format with your RDS endpoint, for example `--datastore-endpoint='mysql://user:pass@tcp(rds-endpoint.rds.amazonaws.com:3306)/k3s'`
- **Azure Database for MySQL**: Use `--datastore-endpoint='mysql://user:pass@tcp(server.mysql.database.azure.com:3306)/k3s'` and configure datastore TLS with K3s datastore certificate flags if your service requires a custom CA or client certificates
- **Google Cloud SQL**: Use the Cloud SQL Auth Proxy for secure connections, then point K3s at the local proxy endpoint

Managed services provide automated backups, high availability, read replicas, and maintenance patches.

## Database Sizing Guidelines

For most Rancher deployments:

- **Small** (1-5 clusters): 2 vCPU, 4 GB RAM, 20 GB storage
- **Medium** (5-20 clusters): 4 vCPU, 8 GB RAM, 50 GB storage
- **Large** (20+ clusters): 8 vCPU, 16 GB RAM, 100 GB storage

## Summary

You have configured a K3s cluster for Rancher with an external database, separating the cluster state from the compute nodes. This architecture simplifies backups, enables independent scaling of compute and storage, and provides a more robust foundation for production Rancher deployments. Whether you choose MySQL or PostgreSQL, the external database approach gives you greater control over your data management strategy.
