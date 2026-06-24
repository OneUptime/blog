# How to Set Up MySQL on DigitalOcean Managed Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DigitalOcean, Managed, Database, Cloud

Description: Create and configure a DigitalOcean Managed MySQL database with connection pooling, trusted sources, and read replicas using the DigitalOcean control panel or API.

---

DigitalOcean Managed Databases for MySQL handle server provisioning, automatic backups, patching, and failover, so you can focus on your application instead of database operations. This guide covers creating a cluster, connecting securely, and adding read replicas.

## Creating a Managed MySQL Cluster

You can create a MySQL cluster via the DigitalOcean control panel or with the `doctl` CLI:

```bash
# Install doctl and authenticate
doctl auth init

# Create a MySQL 8 cluster in the NYC3 region with a 4GB/2-vCPU node
doctl databases create my-mysql-cluster \
  --engine mysql \
  --version 8 \
  --region nyc3 \
  --size db-s-2vcpu-4gb \
  --num-nodes 1
```

For a production setup with high availability, use at least 3 nodes:

```bash
doctl databases create my-mysql-cluster \
  --engine mysql \
  --version 8 \
  --region nyc3 \
  --size db-s-4vcpu-8gb \
  --num-nodes 3
```

## Getting Connection Details

After the cluster is created, retrieve connection details:

```bash
doctl databases connection my-mysql-cluster --format Host,Port,User,Password,Database
```

Or via the API:

```bash
curl -X GET \
  -H "Authorization: Bearer $DO_API_TOKEN" \
  "https://api.digitalocean.com/v2/databases" | jq '.databases[] | select(.name=="my-mysql-cluster") | .connection'
```

The response includes a `uri` field for direct connection:

```text
mysql://doadmin:password@my-mysql-cluster.db.ondigitalocean.com:25060/defaultdb?ssl-mode=require
```

## Connecting with SSL

DigitalOcean requires SSL for managed MySQL connections. Download the CA certificate:

```bash
doctl databases get-ca my-mysql-cluster --format Certificate --no-header > ca-certificate.crt

mysql --host=my-mysql-cluster.db.ondigitalocean.com \
  --port=25060 \
  --user=doadmin \
  --password \
  --ssl-ca=ca-certificate.crt \
  defaultdb
```

## Restricting Trusted Sources

Restrict database access to specific Droplets or VPCs:

```bash
# Allow only specific Droplets by ID
doctl databases firewalls append my-mysql-cluster \
  --rule droplet:12345678

# Allow a specific IP range
doctl databases firewalls append my-mysql-cluster \
  --rule ip_addr:10.0.0.0/8
```

## Adding a Read Replica

Scale read capacity by adding a read-only replica:

```bash
doctl databases replica create my-mysql-cluster read-replica-1 \
  --region nyc3 \
  --size db-s-2vcpu-4gb
```

Get the replica connection details separately:

```bash
doctl databases replica connection my-mysql-cluster read-replica-1
```

## Creating Additional Users and Databases

```bash
# Create a new database
doctl databases db create my-mysql-cluster myapp_production

# Create a new user
doctl databases user create my-mysql-cluster appuser

# Get the generated password
doctl databases user get my-mysql-cluster appuser --format Password
```

In MySQL, grant the user appropriate privileges:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_production.* TO 'appuser'@'%';
```

## Summary

DigitalOcean Managed MySQL eliminates infrastructure management by handling backups, failover, and patching automatically. Use `doctl databases create` to provision a cluster, restrict access with firewall rules to specific Droplets or IP ranges, and always connect with SSL using the provided CA certificate. Add read replicas with a single command when your read workload grows, and monitor metrics through the DigitalOcean control panel or the Metrics API.
