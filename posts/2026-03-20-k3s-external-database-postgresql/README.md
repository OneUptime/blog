# How to Configure K3s with an External Database (PostgreSQL)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, PostgreSQL, External Database, Kubernetes, High Availability, SUSE Rancher

Description: Learn how to configure K3s to use an external PostgreSQL database as the cluster datastore for multi-server high availability deployments.

---

PostgreSQL is a popular alternative to MySQL for K3s's external datastore. It supports the same HA topology and offers excellent reliability and operational tooling.

---

## Step 1: Set Up PostgreSQL

```bash
# Install PostgreSQL and contrib packages

sudo apt-get install -y postgresql postgresql-contrib

sudo systemctl enable --now postgresql
```

Create the K3s database and role:

```sql
-- Connect as postgres user: sudo -u postgres psql
CREATE USER k3suser WITH PASSWORD 'strongpassword123';
CREATE DATABASE k3s OWNER k3suser;
GRANT ALL PRIVILEGES ON DATABASE k3s TO k3suser;
```

Allow remote connections in `pg_hba.conf`:

```bash
# Add this line to your pg_hba.conf
# On Ubuntu/Debian, this is typically /etc/postgresql/<major>/main/pg_hba.conf
# TYPE  DATABASE  USER      ADDRESS         METHOD
host    k3s       k3suser   192.168.1.0/24  scram-sha-256

# Configure PostgreSQL to listen on all interfaces
sudo -u postgres psql -c "ALTER SYSTEM SET listen_addresses = '*';"

sudo systemctl restart postgresql
```

---

## Step 2: Install K3s Server with PostgreSQL Datastore

```bash
# PostgreSQL DSN format:
# postgres://user:password@host:port/database?sslmode=disable
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="postgres://k3suser:strongpassword123@192.168.1.50:5432/k3s?sslmode=disable" \
  --tls-san="k3s-lb.example.com"
```

Or use a config file:

```yaml
# /etc/rancher/k3s/config.yaml
datastore-endpoint: "postgres://k3suser:strongpassword123@192.168.1.50:5432/k3s?sslmode=disable"
tls-san:
  - "k3s-lb.example.com"
  - "192.168.1.10"
```

---

## Step 3: Enable SSL for the PostgreSQL Connection

For production, always use SSL. Generate or obtain a certificate for the PostgreSQL server, then:

```bash
# Reference SSL in the DSN
# The hostname in the DSN must match the PostgreSQL server certificate
--datastore-endpoint="postgres://k3suser:pass@db.example.com:5432/k3s?sslmode=verify-full&sslrootcert=/path/to/ca.crt"
```

---

## Step 4: Add Additional Server Nodes

Each additional K3s server node uses the same datastore endpoint, token, and any other critical server configuration values:

```yaml
# /etc/rancher/k3s/config.yaml (on server-2 and server-3)
datastore-endpoint: "postgres://k3suser:strongpassword123@192.168.1.50:5432/k3s?sslmode=disable"
tls-san:
  - "k3s-lb.example.com"
token: "<token-from-first-server>"
```

---

## Step 5: Verify Cluster Health

```bash
# Confirm all server nodes are visible
kubectl get nodes

# Check K3s is connected to PostgreSQL
journalctl -u k3s -n 50 | grep -i "kine\|datastore"
```

K3s uses **kine** as a shim between etcd's gRPC API and SQL databases - you may see kine log entries.

---

## PostgreSQL Backup

```bash
# Backup the K3s database
pg_dump -h 192.168.1.50 -U k3suser k3s > k3s-backup-$(date +%Y%m%d).sql

# Restore
psql -h 192.168.1.50 -U k3suser k3s < k3s-backup-20260320.sql
```

---

## Best Practices

- If you place PgBouncer between K3s servers and PostgreSQL, configure it for prepared statement support, because K3s requires prepared statements.
- Use `sslmode=verify-full` in production - never `sslmode=disable` on untrusted networks.
- Monitor PostgreSQL table bloat in the `k3s` database - kine can accumulate rows that need periodic vacuuming.
