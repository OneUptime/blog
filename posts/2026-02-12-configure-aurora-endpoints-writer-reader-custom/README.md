# How to Configure Aurora Endpoints (Writer, Reader, Custom)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Aurora, Database, Endpoints, RDS

Description: Understand and configure Aurora cluster endpoints including writer, reader, and custom endpoints to optimize read/write routing and application performance.

---

Every Aurora cluster comes with multiple endpoints, and using the right one for the right workload makes a real difference. Connect your application to the wrong endpoint and you might be sending all traffic to one instance while others sit idle, or accidentally sending reads to the writer and wasting resources.

Let's break down the different endpoint types, when to use each one, and how to create custom endpoints for specific workloads.

## The Three Types of Aurora Endpoints

Aurora provides three kinds of endpoints out of the box, plus the ability to create custom ones.

### 1. Cluster (Writer) Endpoint

This always points to the current writer instance. When a failover happens, the endpoint automatically updates to point to the new writer. All write operations should use this endpoint.

Format: `my-cluster.cluster-abc123.us-east-1.rds.amazonaws.com`

### 2. Reader Endpoint

This load-balances connections across all reader instances. It uses DNS round-robin to distribute connections. All read-only operations that don't need the absolute latest data should use this endpoint.

Format: `my-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com`

### 3. Instance Endpoints

Each individual instance has its own endpoint. You'd rarely use these directly unless you need to connect to a specific instance for troubleshooting.

Format: `my-instance-1.abc123.us-east-1.rds.amazonaws.com`

### 4. Custom Endpoints

These let you define groups of instances and create an endpoint that load-balances across just that group. This is where things get interesting.

```mermaid
graph TD
    App[Application] --> WE[Writer Endpoint]
    App --> RE[Reader Endpoint]
    App --> CE1[Custom Endpoint - Analytics]
    App --> CE2[Custom Endpoint - Reporting]

    WE --> W[Writer Instance - db.r5.2xlarge]
    RE --> R1[Reader 1 - db.r5.large]
    RE --> R2[Reader 2 - db.r5.large]
    RE --> R3[Reader 3 - db.r5.4xlarge]
    RE --> R4[Reader 4 - db.r5.4xlarge]

    CE1 --> R3
    CE1 --> R4

    CE2 --> R1
    CE2 --> R2
```

## Viewing Current Endpoints

You can see all endpoints for your cluster with this CLI command:

```bash
# List all endpoints for an Aurora cluster
aws rds describe-db-clusters \
  --db-cluster-identifier my-aurora-cluster \
  --query 'DBClusters[0].{
    WriterEndpoint:Endpoint,
    ReaderEndpoint:ReaderEndpoint,
    Port:Port,
    CustomEndpoints:CustomEndpoints
  }'
```

To see instance-level endpoints:

```bash
# List all instance endpoints in the cluster
aws rds describe-db-instances \
  --filters Name=db-cluster-id,Values=my-aurora-cluster \
  --query 'DBInstances[*].{
    Instance:DBInstanceIdentifier,
    Endpoint:Endpoint.Address,
    Class:DBInstanceClass,
    Role:DBInstanceStatus
  }' \
  --output table
```

## Creating Custom Endpoints

Custom endpoints let you group instances by workload type. This is incredibly useful when you have different instance sizes serving different purposes.

### Use Case: Separate Analytics from OLTP Reads

Say you have four readers: two small ones for your application's OLTP reads and two large ones for analytics queries. You don't want a heavy analytics query to land on a small OLTP reader.

Create a custom endpoint for analytics:

```bash
# Create a custom endpoint for analytics queries
aws rds create-db-cluster-endpoint \
  --db-cluster-identifier my-aurora-cluster \
  --db-cluster-endpoint-identifier analytics-endpoint \
  --endpoint-type READER \
  --static-members my-reader-large-1 my-reader-large-2
```

Create a custom endpoint for OLTP reads:

```bash
# Create a custom endpoint for OLTP read queries
aws rds create-db-cluster-endpoint \
  --db-cluster-identifier my-aurora-cluster \
  --db-cluster-endpoint-identifier oltp-reads-endpoint \
  --endpoint-type READER \
  --static-members my-reader-small-1 my-reader-small-2
```

### Static Members vs Excluded Members

You can define custom endpoints two ways:

**Static members** - Explicitly list which instances belong to the endpoint. Only these instances will receive traffic:

```bash
# Custom endpoint with specific instances included
aws rds create-db-cluster-endpoint \
  --db-cluster-identifier my-aurora-cluster \
  --db-cluster-endpoint-identifier static-endpoint \
  --endpoint-type READER \
  --static-members reader-1 reader-2
```

**Excluded members** - Include all instances EXCEPT the ones you list. New instances added to the cluster automatically join this endpoint:

```bash
# Custom endpoint that includes all readers except the analytics ones
aws rds create-db-cluster-endpoint \
  --db-cluster-identifier my-aurora-cluster \
  --db-cluster-endpoint-identifier app-reads-endpoint \
  --endpoint-type READER \
  --excluded-members analytics-reader-1 analytics-reader-2
```

The excluded members approach is useful when you use [auto scaling](https://oneuptime.com/blog/post/configure-aurora-auto-scaling-for-read-replicas/view) because new instances get automatically included.

## Configuring Your Application

Your application should use different connection pools for different endpoint types. Here's a Python example using SQLAlchemy:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Writer connection for all INSERT, UPDATE, DELETE operations
writer_engine = create_engine(
    "mysql+pymysql://app:password@my-cluster.cluster-abc123.us-east-1.rds.amazonaws.com:3306/mydb",
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True
)

# Reader connection for general read queries
reader_engine = create_engine(
    "mysql+pymysql://app_reader:password@my-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com:3306/mydb",
    pool_size=30,
    max_overflow=15,
    pool_recycle=3600,
    pool_pre_ping=True
)

# Analytics connection using the custom endpoint
analytics_engine = create_engine(
    "mysql+pymysql://analytics:password@analytics-endpoint.cluster-custom-abc123.us-east-1.rds.amazonaws.com:3306/mydb",
    pool_size=5,
    max_overflow=5,
    pool_recycle=3600,
    pool_pre_ping=True,
    # Longer timeout for analytics queries
    connect_args={"read_timeout": 300}
)

WriterSession = sessionmaker(bind=writer_engine)
ReaderSession = sessionmaker(bind=reader_engine)
AnalyticsSession = sessionmaker(bind=analytics_engine)
```

A Node.js example with separate connection pools:

```javascript
const mysql = require('mysql2/promise');

// Writer pool for mutations
const writerPool = mysql.createPool({
  host: 'my-cluster.cluster-abc123.us-east-1.rds.amazonaws.com',
  user: 'app',
  password: 'password',
  database: 'mydb',
  connectionLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000
});

// Reader pool for queries
const readerPool = mysql.createPool({
  host: 'my-cluster.cluster-ro-abc123.us-east-1.rds.amazonaws.com',
  user: 'app_reader',
  password: 'password',
  database: 'mydb',
  connectionLimit: 30,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000
});

// Analytics pool with custom endpoint and longer timeouts
const analyticsPool = mysql.createPool({
  host: 'analytics-endpoint.cluster-custom-abc123.us-east-1.rds.amazonaws.com',
  user: 'analytics',
  password: 'password',
  database: 'mydb',
  connectionLimit: 5,
  connectTimeout: 10000,
  // 5-minute timeout for heavy queries
  timeout: 300000
});

// Usage example
async function getUser(userId) {
  const [rows] = await readerPool.execute(
    'SELECT * FROM users WHERE id = ?', [userId]
  );
  return rows[0];
}

async function createUser(name, email) {
  const [result] = await writerPool.execute(
    'INSERT INTO users (name, email) VALUES (?, ?)', [name, email]
  );
  return result.insertId;
}
```

## Modifying Custom Endpoints

You can update which instances belong to a custom endpoint:

```bash
# Add an instance to a custom endpoint
aws rds modify-db-cluster-endpoint \
  --db-cluster-endpoint-identifier analytics-endpoint \
  --static-members my-reader-large-1 my-reader-large-2 my-reader-large-3
```

## Deleting Custom Endpoints

When you no longer need a custom endpoint:

```bash
# Delete a custom endpoint
aws rds delete-db-cluster-endpoint \
  --db-cluster-endpoint-identifier analytics-endpoint
```

## Terraform Configuration

Here's how to set up custom endpoints in Terraform:

```hcl
# Custom endpoint for analytics workloads
resource "aws_rds_cluster_endpoint" "analytics" {
  cluster_identifier          = aws_rds_cluster.main.id
  cluster_endpoint_identifier = "analytics"
  custom_endpoint_type        = "READER"
  static_members = [
    aws_rds_cluster_instance.analytics_reader_1.id,
    aws_rds_cluster_instance.analytics_reader_2.id,
  ]
}

# Custom endpoint for application reads (excludes analytics readers)
resource "aws_rds_cluster_endpoint" "app_reads" {
  cluster_identifier          = aws_rds_cluster.main.id
  cluster_endpoint_identifier = "app-reads"
  custom_endpoint_type        = "READER"
  excluded_members = [
    aws_rds_cluster_instance.analytics_reader_1.id,
    aws_rds_cluster_instance.analytics_reader_2.id,
  ]
}
```

## Common Mistakes

**Using instance endpoints in application code.** This bypasses automatic failover. If that instance goes down, your application breaks. Always use cluster or custom endpoints.

**Not using the reader endpoint at all.** I've seen production setups where all traffic hits the writer endpoint, while reader instances sit completely idle. If your application does any reads that can tolerate sub-second lag, use the reader endpoint.

**Ignoring DNS caching.** Aurora endpoints use DNS. If your application caches DNS for too long, it won't pick up endpoint changes during failover. Set DNS TTL to 30 seconds or less in your connection library. You can also use [RDS Proxy](https://oneuptime.com/blog/post/set-up-aurora-with-rds-proxy/view) to eliminate this issue entirely.

## Wrapping Up

Getting your endpoint configuration right is one of the highest-impact, lowest-effort optimizations you can make for Aurora. Use the writer endpoint for writes, the reader endpoint for general reads, and create custom endpoints when you need workload isolation. Your database instances are already running - make sure you're actually using all of them.
