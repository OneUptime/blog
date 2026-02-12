# How to Set Up Amazon DocumentDB (MongoDB-Compatible)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DocumentDB, MongoDB, Database, Cloud

Description: Step-by-step guide to setting up Amazon DocumentDB, AWS's MongoDB-compatible document database, including cluster creation, connectivity, and production configuration.

---

Amazon DocumentDB is AWS's managed document database that's compatible with the MongoDB API. If you're running MongoDB workloads and want to stop managing replication, backups, and patching, DocumentDB is worth a serious look. It's not a fork of MongoDB - it's a completely different engine under the hood that happens to speak the MongoDB wire protocol. That distinction matters, and we'll cover the practical implications.

## What Makes DocumentDB Different from MongoDB

DocumentDB uses a storage architecture similar to Amazon Aurora. Your data is automatically replicated six ways across three availability zones, and storage grows automatically up to 128 TB. You don't provision storage or worry about running out of disk space.

The compatibility is with MongoDB 3.6, 4.0, and 5.0 APIs. This means your existing MongoDB drivers and tools will work, but not every MongoDB feature is supported. Notably, DocumentDB doesn't support client-side field-level encryption, the `$graphLookup` aggregation stage in all scenarios, or MongoDB's change streams in exactly the same way.

That said, for the vast majority of CRUD operations, aggregation pipelines, and indexing strategies, your MongoDB code will run on DocumentDB without changes.

## Prerequisites

Before creating your DocumentDB cluster, make sure you have:

- A VPC with at least two subnets in different AZs
- Security groups allowing TCP traffic on port 27017
- The AWS CLI configured with appropriate permissions

Like Neptune, DocumentDB doesn't provide public endpoints. It's VPC-only, so you'll need an EC2 instance, VPN, or SSH tunnel to connect from your local machine.

## Creating a DocumentDB Cluster

Start by creating a subnet group.

```bash
# Create a subnet group for DocumentDB
aws docdb create-db-subnet-group \
  --db-subnet-group-name docdb-subnets \
  --db-subnet-group-description "DocumentDB subnet group" \
  --subnet-ids subnet-abc123 subnet-def456
```

Now create the cluster with a master user.

```bash
# Create the DocumentDB cluster
aws docdb create-db-cluster \
  --db-cluster-identifier my-docdb-cluster \
  --engine docdb \
  --master-username dbadmin \
  --master-user-password 'YourSecurePassword123!' \
  --db-subnet-group-name docdb-subnets \
  --vpc-security-group-ids sg-12345678 \
  --storage-encrypted \
  --backup-retention-period 7
```

Add at least one instance to the cluster.

```bash
# Add a primary instance
aws docdb create-db-instance \
  --db-instance-identifier my-docdb-instance-1 \
  --db-cluster-identifier my-docdb-cluster \
  --db-instance-class db.r5.large \
  --engine docdb
```

For production, add a couple more instances for read scaling and high availability.

```bash
# Add read replicas for HA and read scaling
aws docdb create-db-instance \
  --db-instance-identifier my-docdb-instance-2 \
  --db-cluster-identifier my-docdb-cluster \
  --db-instance-class db.r5.large \
  --engine docdb

aws docdb create-db-instance \
  --db-instance-identifier my-docdb-instance-3 \
  --db-cluster-identifier my-docdb-cluster \
  --db-instance-class db.r5.large \
  --engine docdb
```

## Connecting to DocumentDB

DocumentDB requires TLS by default. You need to download the AWS CA certificate bundle.

```bash
# Download the Amazon DocumentDB Certificate Authority (CA) cert
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

Connect using the mongo shell.

```bash
# Connect to DocumentDB with TLS using the mongo shell
mongo --tls \
  --host my-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017 \
  --tlsCAFile global-bundle.pem \
  --username dbadmin \
  --password 'YourSecurePassword123!'
```

Here's a Python connection example using PyMongo.

```python
# Connect to DocumentDB from Python
import pymongo
import urllib.parse

# URL-encode the password in case it contains special characters
username = urllib.parse.quote_plus('dbadmin')
password = urllib.parse.quote_plus('YourSecurePassword123!')
cluster_endpoint = 'my-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com'

# Build the connection string with TLS
connection_string = (
    f'mongodb://{username}:{password}@{cluster_endpoint}:27017/'
    f'?tls=true&tlsCAFile=global-bundle.pem&retryWrites=false'
)

client = pymongo.MongoClient(connection_string)

# Test the connection
db = client['myapp']
print(db.list_collection_names())
```

Note the `retryWrites=false` parameter. DocumentDB doesn't support retryable writes in the same way MongoDB does. This is one of those compatibility gaps to be aware of.

For Node.js applications, the setup is similar.

```javascript
// Connect to DocumentDB from Node.js
const { MongoClient } = require('mongodb');
const fs = require('fs');

// Read the CA certificate
const ca = [fs.readFileSync('global-bundle.pem')];

const uri = 'mongodb://dbadmin:YourSecurePassword123!@my-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/?tls=true&retryWrites=false';

const client = new MongoClient(uri, {
  tls: true,
  tlsCAFile: 'global-bundle.pem'
});

async function main() {
  await client.connect();
  const db = client.db('myapp');
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections);
}

main().catch(console.error);
```

## Configuring Parameter Groups

DocumentDB uses parameter groups to control database behavior. The default group is read-only, so create a custom one for production.

```bash
# Create a custom parameter group
aws docdb create-db-cluster-parameter-group \
  --db-cluster-parameter-group-name my-docdb-params \
  --db-parameter-group-family docdb5.0 \
  --description "Custom DocumentDB parameters"

# Enable change streams (disabled by default)
aws docdb modify-db-cluster-parameter-group \
  --db-cluster-parameter-group-name my-docdb-params \
  --parameters "ParameterName=change_stream_log_retention_duration,ParameterValue=10800,ApplyMethod=immediate"

# Enable profiler for slow queries (log queries taking longer than 100ms)
aws docdb modify-db-cluster-parameter-group \
  --db-cluster-parameter-group-name my-docdb-params \
  --parameters "ParameterName=profiler,ParameterValue=enabled,ApplyMethod=immediate" \
  "ParameterName=profiler_threshold_ms,ParameterValue=100,ApplyMethod=immediate"

# Apply the parameter group to your cluster
aws docdb modify-db-cluster \
  --db-cluster-identifier my-docdb-cluster \
  --db-cluster-parameter-group-name my-docdb-params
```

## Creating Indexes

Proper indexing is crucial for DocumentDB performance, just like MongoDB. Create indexes for your common query patterns.

```javascript
// Create indexes for common query patterns
const db = client.db('myapp');
const users = db.collection('users');

// Single field index
await users.createIndex({ email: 1 }, { unique: true });

// Compound index for queries that filter on both fields
await users.createIndex({ status: 1, createdAt: -1 });

// Text index for search functionality
await users.createIndex({ name: 'text', bio: 'text' });

// TTL index to auto-delete old sessions after 24 hours
const sessions = db.collection('sessions');
await sessions.createIndex(
  { lastAccessed: 1 },
  { expireAfterSeconds: 86400 }
);
```

## Setting Up Monitoring

DocumentDB publishes metrics to CloudWatch. Here are the most important ones to watch.

```bash
# Create a CloudWatch alarm for high CPU utilization
aws cloudwatch put-metric-alarm \
  --alarm-name docdb-high-cpu \
  --metric-name CPUUtilization \
  --namespace AWS/DocDB \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=DBInstanceIdentifier,Value=my-docdb-instance-1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

You should also monitor `FreeableMemory`, `DatabaseConnections`, and `ReadLatency`. For a comprehensive monitoring solution, take a look at how to [set up monitoring for your AWS resources](https://oneuptime.com/blog/post/aws-cloudwatch-metrics/view).

## CloudFormation Template

Here's a production-ready CloudFormation template.

```yaml
# DocumentDB cluster with encryption and multi-AZ instances
AWSTemplateFormatVersion: '2010-09-09'

Parameters:
  MasterUsername:
    Type: String
  MasterPassword:
    Type: String
    NoEcho: true
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>

Resources:
  DocDBSubnetGroup:
    Type: AWS::DocDB::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: DocumentDB subnets
      SubnetIds: !Ref SubnetIds

  DocDBCluster:
    Type: AWS::DocDB::DBCluster
    Properties:
      DBClusterIdentifier: production-docdb
      MasterUsername: !Ref MasterUsername
      MasterUserPassword: !Ref MasterPassword
      DBSubnetGroupName: !Ref DocDBSubnetGroup
      StorageEncrypted: true
      BackupRetentionPeriod: 14
      PreferredBackupWindow: "02:00-04:00"

  DocDBInstance1:
    Type: AWS::DocDB::DBInstance
    Properties:
      DBClusterIdentifier: !Ref DocDBCluster
      DBInstanceClass: db.r5.large
      DBInstanceIdentifier: docdb-primary

  DocDBInstance2:
    Type: AWS::DocDB::DBInstance
    Properties:
      DBClusterIdentifier: !Ref DocDBCluster
      DBInstanceClass: db.r5.large
      DBInstanceIdentifier: docdb-replica-1
```

## Wrapping Up

DocumentDB is a solid choice if you want MongoDB API compatibility with the operational simplicity of a fully managed AWS service. The setup is straightforward, but pay attention to the compatibility gaps - test your application thoroughly before migrating production workloads. If you're considering moving an existing MongoDB deployment over, check out our guide on [migrating from MongoDB to DocumentDB](https://oneuptime.com/blog/post/migrate-mongodb-amazon-documentdb/view) for a detailed walkthrough of the process.
