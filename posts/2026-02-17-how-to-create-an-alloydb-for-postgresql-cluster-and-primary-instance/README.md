# How to Create an AlloyDB for PostgreSQL Cluster and Primary Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, PostgreSQL, Database, Google Cloud

Description: Step-by-step guide to creating an AlloyDB for PostgreSQL cluster and primary instance on Google Cloud, including network setup and initial configuration.

---

AlloyDB for PostgreSQL is Google Cloud's fully managed PostgreSQL-compatible database service. It is designed to handle demanding enterprise workloads with significantly better performance than standard Cloud SQL for PostgreSQL, especially for transactional and analytical mixed workloads. If you are looking for a PostgreSQL database that scales well and integrates tightly with GCP, AlloyDB is worth serious consideration.

In this post, I will walk through creating an AlloyDB cluster and primary instance from scratch, including the networking setup that often trips people up.

## What You Get with AlloyDB

Before we dive into the setup, let me quickly outline what makes AlloyDB different from Cloud SQL for PostgreSQL:

- **Disaggregated compute and storage** - The compute layer and storage layer are separated, which allows independent scaling
- **Log-based storage** - Uses a custom storage engine that stores changes as a log, reducing write amplification
- **Columnar engine** - An in-memory column store that accelerates analytical queries without extra infrastructure
- **PostgreSQL compatibility** - Runs a modified version of PostgreSQL, compatible with standard PostgreSQL drivers and tools
- **Automatic failover** - Built-in high availability with fast failover

## Prerequisites

You need:

- A GCP project with billing enabled
- The AlloyDB API and related APIs enabled
- A VPC network with Private Services Access configured
- The gcloud CLI installed and authenticated

## Step 1 - Enable Required APIs

AlloyDB requires several APIs to be enabled:

```bash
# Enable the AlloyDB API and related services
gcloud services enable alloydb.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable servicenetworking.googleapis.com
```

## Step 2 - Configure Private Services Access

AlloyDB instances are only accessible through private IP addresses within your VPC. You need Private Services Access configured to allocate IP ranges for Google-managed services.

Check if you already have it set up:

```bash
# Check for existing private service connections
gcloud services vpc-peerings list \
  --network=default \
  --service=servicenetworking.googleapis.com
```

If no connection exists, create one:

```bash
# Allocate an IP range for Google-managed services
gcloud compute addresses create google-managed-services \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

# Create the private services connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services \
  --network=default
```

This step is critical. Without Private Services Access, AlloyDB cluster creation will fail.

## Step 3 - Create the AlloyDB Cluster

The cluster is the top-level container that manages the storage layer and the network configuration. All instances (primary and read replicas) live within a cluster.

```bash
# Create an AlloyDB cluster
gcloud alloydb clusters create my-alloydb-cluster \
  --region=us-central1 \
  --network=default \
  --password=YOUR_STRONG_PASSWORD
```

The `--password` flag sets the password for the default `postgres` user. Use a strong password and store it securely.

For production, you might want to enable automated backups at cluster creation:

```bash
# Create a cluster with automated daily backups enabled
gcloud alloydb clusters create my-alloydb-cluster \
  --region=us-central1 \
  --network=default \
  --password=YOUR_STRONG_PASSWORD \
  --automated-backup-enabled \
  --automated-backup-days-of-week=MONDAY,WEDNESDAY,FRIDAY \
  --automated-backup-start-times=02:00 \
  --automated-backup-retention-count=7
```

Monitor the cluster creation:

```bash
# Check cluster status
gcloud alloydb clusters describe my-alloydb-cluster \
  --region=us-central1 \
  --format="yaml(state,network,databaseVersion)"
```

Wait for the state to become `READY`.

## Step 4 - Create the Primary Instance

The primary instance is the read-write compute node. You choose the machine type based on your performance requirements.

```bash
# Create a primary instance with 4 vCPUs and 32 GB RAM
gcloud alloydb instances create my-primary \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --instance-type=PRIMARY \
  --cpu-count=4
```

The `--cpu-count` determines the machine size. AlloyDB maps CPU counts to specific memory allocations:

- 2 CPUs = 16 GB RAM
- 4 CPUs = 32 GB RAM
- 8 CPUs = 64 GB RAM
- 16 CPUs = 128 GB RAM
- 32 CPUs = 256 GB RAM
- 64 CPUs = 512 GB RAM

Instance creation takes several minutes. Monitor progress:

```bash
# Check instance status
gcloud alloydb instances describe my-primary \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --format="yaml(state,ipAddress,instanceType,machineConfig)"
```

## Step 5 - Get the Connection Details

Once the instance is ready, get the private IP address:

```bash
# Get the primary instance IP address
gcloud alloydb instances describe my-primary \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --format="value(ipAddress)"
```

This is the IP you will use to connect from your applications. Remember, this is a private IP only accessible from within the VPC.

## Step 6 - Connect to the Instance

From a Compute Engine VM in the same VPC, connect using psql:

```bash
# Install the PostgreSQL client
sudo apt-get update && sudo apt-get install -y postgresql-client

# Connect to AlloyDB
psql -h ALLOYDB_IP -U postgres -d postgres
```

You can also use the AlloyDB Auth Proxy for secure connections from local development machines or other environments:

```bash
# Download the AlloyDB Auth Proxy
wget https://storage.googleapis.com/alloydb-auth-proxy/v1/alloydb-auth-proxy.linux.amd64 -O alloydb-auth-proxy
chmod +x alloydb-auth-proxy

# Start the proxy (it creates a local socket)
./alloydb-auth-proxy \
  "projects/my-project/locations/us-central1/clusters/my-alloydb-cluster/instances/my-primary"
```

In another terminal, connect through the proxy:

```bash
# Connect through the Auth Proxy
psql -h 127.0.0.1 -p 5432 -U postgres -d postgres
```

## Step 7 - Create Your Database

Once connected, set up your application database:

```sql
-- Create a new database for your application
CREATE DATABASE myapp;

-- Create a dedicated application user (do not use the postgres superuser)
CREATE USER appuser WITH PASSWORD 'app_password_here';

-- Grant the application user access to the database
GRANT ALL PRIVILEGES ON DATABASE myapp TO appuser;

-- Connect to the new database
\c myapp

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO appuser;
```

## Configuring High Availability

AlloyDB clusters automatically replicate data across zones within the region. The primary instance can fail over to another zone if the current zone becomes unavailable. This is built into the storage layer and does not require manual configuration.

However, for even faster failover, you can check that the cluster has redundancy enabled:

```bash
# Verify cluster HA configuration
gcloud alloydb clusters describe my-alloydb-cluster \
  --region=us-central1 \
  --format="yaml(continuousBackupConfig,automatedBackupPolicy)"
```

## Connecting from Applications

Here is a Python example using psycopg2:

```python
# Connect to AlloyDB from a Python application
import psycopg2

conn = psycopg2.connect(
    host='10.0.0.5',       # AlloyDB private IP
    port=5432,
    dbname='myapp',
    user='appuser',
    password='app_password_here',
    sslmode='require',      # Always use SSL
    connect_timeout=10
)

cursor = conn.cursor()
cursor.execute('SELECT version()')
print(cursor.fetchone())
conn.close()
```

And a Node.js example:

```javascript
// Connect to AlloyDB from a Node.js application
const { Pool } = require('pg');

const pool = new Pool({
  host: '10.0.0.5',       // AlloyDB private IP
  port: 5432,
  database: 'myapp',
  user: 'appuser',
  password: 'app_password_here',
  ssl: { rejectUnauthorized: false },
  max: 20,                 // Connection pool size
  connectionTimeoutMillis: 10000,
});

pool.query('SELECT version()')
  .then(res => console.log(res.rows[0]))
  .catch(err => console.error(err));
```

## Cost Optimization Tips

AlloyDB pricing is based on compute (vCPUs and RAM) and storage (data stored). A few tips to manage costs:

1. Start with a smaller CPU count and scale up as needed
2. Use read pool instances for read-heavy workloads instead of scaling up the primary
3. Review and adjust backup retention to avoid storing more backups than you need
4. Consider using the columnar engine for analytical queries instead of provisioning a separate analytics database

Creating an AlloyDB cluster and primary instance is straightforward once you get the networking (Private Services Access) sorted out. From there, it behaves like any PostgreSQL database, so your existing tools, libraries, and knowledge all carry over.
