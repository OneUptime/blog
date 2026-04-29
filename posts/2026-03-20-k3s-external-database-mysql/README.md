# How to Configure K3s with an External Database (MySQL)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, MySQL, External Database, Kubernetes, High Availability, SUSE Rancher, Cluster Storage

Description: Learn how to configure K3s to use an external MySQL database as the cluster datastore instead of the embedded SQLite, enabling multi-server HA deployments.

---

By default K3s uses embedded SQLite which only supports a single server node. Switching to an external MySQL database enables running multiple K3s server nodes for high availability.

---

## Step 1: Set Up MySQL

Install and configure a K3s-supported MySQL release such as 8.0 or 8.4:

```bash
# Install MySQL on a dedicated database node

sudo apt-get install -y mysql-server

# Secure the installation
sudo mysql_secure_installation
```

Create the K3s database and user:

```sql
-- Connect as root
-- Create the k3s database
CREATE DATABASE k3s CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user with limited privileges
CREATE USER 'k3suser'@'%' IDENTIFIED BY 'strongpassword123';
GRANT ALL PRIVILEGES ON k3s.* TO 'k3suser'@'%';
FLUSH PRIVILEGES;
```

Enable remote connections in MySQL:

```bash
# Edit /etc/mysql/mysql.conf.d/mysqld.cnf
# Change bind-address from 127.0.0.1 to 0.0.0.0 or the server IP
sudo sed -i 's/bind-address.*/bind-address = 0.0.0.0/' \
  /etc/mysql/mysql.conf.d/mysqld.cnf
sudo systemctl restart mysql
```

---

## Step 2: Install K3s Server with MySQL Datastore

On the first K3s server node, provide the MySQL DSN via the `--datastore-endpoint` flag:

```bash
# Format: mysql://user:password@tcp(host:port)/database
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="mysql://k3suser:strongpassword123@tcp(192.168.1.50:3306)/k3s" \
  --tls-san="k3s-lb.example.com" \
  --tls-san="192.168.1.10"
```

Or use the configuration file:

```yaml
# /etc/rancher/k3s/config.yaml
datastore-endpoint: "mysql://k3suser:strongpassword123@tcp(192.168.1.50:3306)/k3s"
tls-san:
  - "k3s-lb.example.com"
  - "192.168.1.10"
```

---

## Step 3: Start Additional Server Nodes

Additional server nodes connect to the same MySQL database. K3s automatically coordinates leadership via the database:

```bash
# On each additional server node
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="mysql://k3suser:strongpassword123@tcp(192.168.1.50:3306)/k3s" \
  --tls-san="k3s-lb.example.com" \
  --tls-san="192.168.1.10" \
  --token="<token-from-first-server>"
```

---

## Step 4: Add a Load Balancer

Put a load balancer (HAProxy, Nginx, or cloud LB) in front of all server nodes on port 6443 for the Kubernetes API and fixed registration address:

```text
backend k3s-servers
    server k3s-1 192.168.1.11:6443 check
    server k3s-2 192.168.1.12:6443 check
    server k3s-3 192.168.1.13:6443 check
```

---

## Step 5: Verify the Setup

```bash
# From any server node
kubectl get nodes

# Verify datastore connectivity
journalctl -u k3s | grep -i "datastore"
```

---

## MySQL Backup and Maintenance

```bash
# Back up the K3s database
mysqldump -h 192.168.1.50 -u k3suser -p k3s > k3s-backup-$(date +%Y%m%d).sql

# Restore from backup
mysql -h 192.168.1.50 -u k3suser -p k3s < k3s-backup-20260320.sql
```

Also back up `/var/lib/rancher/k3s/server/token` and restore the same token value, or pass it with `--token`, before starting K3s again after a restore.

---

## Best Practices

- If you use MySQL replication for failover, point K3s at the writable primary or a failover endpoint that always routes to it.
- Enable SSL/TLS for the MySQL connection with `--datastore-cafile`, `--datastore-certfile`, and `--datastore-keyfile` as needed.
- Back up the MySQL database and the K3s server token before every K3s upgrade.
- Monitor MySQL replication lag if you use primary/replica failover.
