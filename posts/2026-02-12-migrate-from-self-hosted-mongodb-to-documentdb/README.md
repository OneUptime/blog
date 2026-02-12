# How to Migrate from Self-Hosted MongoDB to DocumentDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DocumentDB, MongoDB, Database Migration, DMS, Migration

Description: Learn how to migrate from self-hosted MongoDB to Amazon DocumentDB with minimal downtime using mongodump, DMS, and change stream replication.

---

Running self-hosted MongoDB in production means handling replication, backups, security patches, scaling, and monitoring yourself. Amazon DocumentDB is a managed database service compatible with MongoDB that takes those operational burdens off your plate. It provides automatic backups, Multi-AZ high availability, encryption, and scales storage automatically up to 128 TB.

This guide covers how to migrate from self-hosted MongoDB to DocumentDB with minimal downtime.

## Understanding DocumentDB Compatibility

DocumentDB implements the MongoDB 3.6, 4.0, and 5.0 wire protocol, but it is not a MongoDB fork. It has its own storage engine and some MongoDB features are not supported. Check these before migrating:

**Supported:**
- CRUD operations
- Aggregation pipeline (most stages)
- Indexes (single field, compound, multikey, text, geospatial)
- Change streams
- Transactions (4.0+ compatible)

**Not supported or different:**
- $where operator
- Map-reduce (use aggregation instead)
- Full-text search (use OpenSearch instead)
- Capped collections
- GridFS
- Some aggregation stages ($graphLookup with sharding, etc.)

```python
# Check your application's MongoDB feature usage
# Run this against your MongoDB to identify potential issues
from pymongo import MongoClient

client = MongoClient('mongodb://your-mongodb-host:27017/')
db = client['your_database']

# Check for capped collections
for coll_name in db.list_collection_names():
    coll_stats = db.command('collStats', coll_name)
    if coll_stats.get('capped'):
        print(f"WARNING: {coll_name} is a capped collection (not supported)")

# Check indexes
for coll_name in db.list_collection_names():
    indexes = db[coll_name].index_information()
    for idx_name, idx_info in indexes.items():
        if 'textIndexVersion' in idx_info:
            print(f"WARNING: {coll_name} has text index {idx_name} (limited support)")
```

## Setting Up DocumentDB

Create a DocumentDB cluster in your VPC:

```python
# Create a DocumentDB cluster
import boto3

docdb = boto3.client('docdb')

# Create subnet group
docdb.create_db_subnet_group(
    DBSubnetGroupName='docdb-subnets',
    DBSubnetGroupDescription='Private subnets for DocumentDB',
    SubnetIds=['subnet-private-1', 'subnet-private-2', 'subnet-private-3']
)

# Create parameter group for tuning
docdb.create_db_cluster_parameter_group(
    DBClusterParameterGroupName='docdb-params',
    DBParameterGroupFamily='docdb5.0',
    Description='Custom params for DocumentDB 5.0'
)

# Create the cluster
cluster = docdb.create_db_cluster(
    DBClusterIdentifier='mongodb-migrated',
    Engine='docdb',
    EngineVersion='5.0.0',
    MasterUsername='docdbadmin',
    MasterUserPassword='SecurePassword123!',
    DBSubnetGroupName='docdb-subnets',
    VpcSecurityGroupIds=['sg-docdb'],
    StorageEncrypted=True,
    DeletionProtection=True,
    DBClusterParameterGroupName='docdb-params',
    BackupRetentionPeriod=7
)

# Add instances to the cluster
for i in range(3):
    docdb.create_db_instance(
        DBInstanceIdentifier=f'docdb-instance-{i+1}',
        DBClusterIdentifier='mongodb-migrated',
        DBInstanceClass='db.r6g.large',
        Engine='docdb'
    )
```

## Migration Option 1: mongodump/mongorestore (Simplest)

For smaller databases or when downtime is acceptable, `mongodump` and `mongorestore` is the simplest approach.

```bash
# Export from self-hosted MongoDB
mongodump --host mongodb-primary:27017 \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --db your_database \
  --out /backup/mongodump/

# Import to DocumentDB
# First, download the DocumentDB CA certificate
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

# Restore to DocumentDB
mongorestore --host mongodb-migrated.cluster-abc123.us-east-1.docdb.amazonaws.com:27017 \
  --username docdbadmin \
  --password SecurePassword123! \
  --ssl \
  --sslCAFile global-bundle.pem \
  --db your_database \
  /backup/mongodump/your_database/
```

After restore, rebuild indexes:

```bash
# Indexes may need to be rebuilt, DocumentDB does not import all index types
mongosh --host mongodb-migrated.cluster-abc123.us-east-1.docdb.amazonaws.com:27017 \
  --username docdbadmin \
  --password SecurePassword123! \
  --tls --tlsCAFile global-bundle.pem \
  --eval "db.your_collection.createIndex({field1: 1, field2: -1})"
```

## Migration Option 2: AWS DMS (Minimal Downtime)

For production databases that need continuous replication during migration, use AWS DMS.

```python
# Set up DMS for MongoDB to DocumentDB migration
import boto3
import json

dms = boto3.client('dms')

# Source endpoint - self-hosted MongoDB
dms.create_endpoint(
    EndpointIdentifier='source-mongodb',
    EndpointType='source',
    EngineName='mongodb',
    ServerName='mongodb-primary.internal.company.com',
    Port=27017,
    DatabaseName='your_database',
    Username='dms_user',
    Password='password',
    MongoDbSettings={
        'AuthType': 'password',
        'AuthMechanism': 'scram_sha_1',
        'NestingLevel': 'one',
        'ExtractDocId': 'true',
        'DocsToInvestigate': '1000',
        'AuthSource': 'admin'
    }
)

# Target endpoint - DocumentDB
dms.create_endpoint(
    EndpointIdentifier='target-docdb',
    EndpointType='target',
    EngineName='docdb',
    ServerName='mongodb-migrated.cluster-abc123.us-east-1.docdb.amazonaws.com',
    Port=27017,
    DatabaseName='your_database',
    Username='docdbadmin',
    Password='SecurePassword123!'
)

# Create replication task
dms.create_replication_task(
    ReplicationTaskIdentifier='mongodb-to-docdb',
    SourceEndpointArn='arn:aws:dms:...:endpoint:source-mongodb',
    TargetEndpointArn='arn:aws:dms:...:endpoint:target-docdb',
    ReplicationInstanceArn='arn:aws:dms:...:rep:migration-instance',
    MigrationType='full-load-and-cdc',
    TableMappings=json.dumps({
        'rules': [
            {
                'rule-type': 'selection',
                'rule-id': '1',
                'rule-name': 'all-collections',
                'object-locator': {
                    'schema-name': 'your_database',
                    'table-name': '%'
                },
                'rule-action': 'include'
            }
        ]
    })
)
```

## Migration Option 3: Change Streams (Custom Replication)

For maximum control, build a custom replication pipeline using MongoDB change streams:

```python
# Custom replication using MongoDB change streams
from pymongo import MongoClient
import ssl

# Source MongoDB connection
source = MongoClient('mongodb://admin:password@mongodb-primary:27017/')
source_db = source['your_database']

# Target DocumentDB connection
target = MongoClient(
    'mongodb://docdbadmin:SecurePassword123!@mongodb-migrated.cluster-abc123.us-east-1.docdb.amazonaws.com:27017/',
    tls=True,
    tlsCAFile='global-bundle.pem',
    retryWrites=False
)
target_db = target['your_database']

# Step 1: Initial full copy
for coll_name in source_db.list_collection_names():
    print(f"Copying collection: {coll_name}")
    source_coll = source_db[coll_name]
    target_coll = target_db[coll_name]

    batch = []
    for doc in source_coll.find():
        batch.append(doc)
        if len(batch) >= 1000:
            target_coll.insert_many(batch)
            batch = []

    if batch:
        target_coll.insert_many(batch)

# Step 2: Watch for changes and replicate
print("Starting change stream replication...")
with source_db.watch() as stream:
    for change in stream:
        operation = change['operationType']
        ns = change['ns']
        coll_name = ns['coll']
        target_coll = target_db[coll_name]

        if operation == 'insert':
            target_coll.insert_one(change['fullDocument'])
        elif operation == 'update':
            target_coll.update_one(
                {'_id': change['documentKey']['_id']},
                change['updateDescription']
            )
        elif operation == 'delete':
            target_coll.delete_one({'_id': change['documentKey']['_id']})
```

## Data Validation

After migration, validate your data:

```python
# Validate document counts and sample data
from pymongo import MongoClient

source_db = MongoClient('mongodb://source:27017/')['your_database']
target_db = MongoClient('mongodb://target:27017/', tls=True, tlsCAFile='global-bundle.pem')['your_database']

for coll_name in source_db.list_collection_names():
    source_count = source_db[coll_name].count_documents({})
    target_count = target_db[coll_name].count_documents({})

    status = 'OK' if source_count == target_count else 'MISMATCH'
    print(f"{coll_name}: source={source_count}, target={target_count} [{status}]")
```

## Updating Your Application

DocumentDB requires TLS connections. Update your connection string:

```python
# Before (self-hosted MongoDB)
# client = MongoClient('mongodb://user:pass@mongodb-host:27017/mydb')

# After (DocumentDB)
client = MongoClient(
    'mongodb://docdbadmin:password@mongodb-migrated.cluster-abc123.us-east-1.docdb.amazonaws.com:27017/mydb',
    tls=True,
    tlsCAFile='/path/to/global-bundle.pem',
    retryWrites=False  # DocumentDB does not support retryWrites
)
```

Important application changes:
- Add TLS configuration
- Set `retryWrites=False` (DocumentDB does not support this MongoDB feature)
- Update any code using unsupported features (map-reduce, $where, etc.)
- Test aggregation pipelines thoroughly

## Monitoring DocumentDB

Set up CloudWatch alarms for your new DocumentDB cluster:

```python
# Create CloudWatch alarms for DocumentDB
import boto3

cloudwatch = boto3.client('cloudwatch')

# Monitor CPU utilization
cloudwatch.put_metric_alarm(
    AlarmName='DocumentDB-High-CPU',
    Namespace='AWS/DocDB',
    MetricName='CPUUtilization',
    Dimensions=[
        {'Name': 'DBClusterIdentifier', 'Value': 'mongodb-migrated'}
    ],
    Statistic='Average',
    Period=300,
    EvaluationPeriods=3,
    Threshold=80,
    ComparisonOperator='GreaterThanThreshold',
    AlarmActions=['arn:aws:sns:us-east-1:123456789:db-alerts']
)
```

For end-to-end monitoring of your DocumentDB cluster alongside your application, [OneUptime](https://oneuptime.com/blog/post/build-a-time-series-dashboard-for-iot-on-aws/view) provides comprehensive observability.

## Wrapping Up

Migrating from self-hosted MongoDB to DocumentDB gives you a managed database with automatic backups, Multi-AZ availability, and seamless scaling. The migration path you choose depends on your downtime tolerance: mongodump/mongorestore for simple migrations, DMS for minimal downtime, or custom change stream replication for full control. The most important step is testing your application thoroughly against DocumentDB before cutting over, paying special attention to any MongoDB features that DocumentDB handles differently.
