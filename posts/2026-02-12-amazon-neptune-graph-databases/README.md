# How to Set Up Amazon Neptune for Graph Databases

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Neptune, Graph Database, Database, Cloud

Description: A complete guide to setting up Amazon Neptune for graph databases, covering cluster creation, connectivity, and best practices for production deployments.

---

Graph databases solve problems that relational databases struggle with. When you're dealing with highly connected data - social networks, recommendation engines, fraud detection, or knowledge graphs - the relationship between entities matters as much as the entities themselves. Amazon Neptune is AWS's fully managed graph database service, and getting it running properly takes some careful planning.

In this post, we'll walk through setting up Neptune from scratch, connecting to it, and configuring it for real workloads.

## Why Neptune Over Self-Managed Graph Databases

If you've ever tried running Neo4j or JanusGraph on your own EC2 instances, you know the pain. You end up babysitting storage, managing backups, handling failover, and worrying about patching. Neptune takes all of that off your plate.

Neptune supports two query languages - Gremlin (for property graphs) and SPARQL (for RDF graphs). You don't have to pick one at cluster creation time, but your data model will naturally lean toward one or the other. If you're building application features like "friends of friends" or "products similar to X," Gremlin is typically the better fit. If you're working with ontologies and linked data, SPARQL is your go-to.

For more on querying Neptune with these languages, check out our posts on [querying with Gremlin](https://oneuptime.com/blog/post/2026-02-12-query-neptune-gremlin/view) and [querying with SPARQL](https://oneuptime.com/blog/post/2026-02-12-query-neptune-sparql/view).

## Prerequisites

Before you create a Neptune cluster, you need a few things in place:

- A VPC with at least two subnets in different availability zones
- An IAM role with Neptune permissions
- Security groups that allow traffic on port 8182 (Neptune's default port)

Neptune doesn't have a public endpoint. It lives entirely inside your VPC, which is great for security but means you'll need a bastion host, VPN, or VPC endpoint to connect from outside.

## Creating a Neptune Cluster with the AWS CLI

Here's how to create a basic Neptune cluster. Start by setting up the DB subnet group.

```bash
# Create a subnet group that tells Neptune which subnets to use
aws neptune create-db-subnet-group \
  --db-subnet-group-name my-neptune-subnets \
  --db-subnet-group-description "Subnets for Neptune cluster" \
  --subnet-ids subnet-abc123 subnet-def456
```

Now create the cluster itself.

```bash
# Create the Neptune cluster - this sets up the storage layer
aws neptune create-db-cluster \
  --db-cluster-identifier my-neptune-cluster \
  --engine neptune \
  --db-subnet-group-name my-neptune-subnets \
  --vpc-security-group-ids sg-12345678 \
  --storage-encrypted \
  --backup-retention-period 7
```

The cluster alone isn't enough - you also need at least one instance to handle queries.

```bash
# Add a writer instance to the cluster
aws neptune create-db-instance \
  --db-instance-identifier my-neptune-instance-1 \
  --db-cluster-identifier my-neptune-cluster \
  --db-instance-class db.r5.large \
  --engine neptune
```

The instance will take about 10-15 minutes to become available. You can check its status with this command.

```bash
# Check if the instance is ready
aws neptune describe-db-instances \
  --db-instance-identifier my-neptune-instance-1 \
  --query 'DBInstances[0].DBInstanceStatus'
```

## Setting Up with CloudFormation

If you prefer infrastructure as code, here's a CloudFormation template that creates a production-ready Neptune setup.

```yaml
# CloudFormation template for Neptune cluster with encryption and backups
AWSTemplateFormatVersion: '2010-09-09'
Description: Amazon Neptune Graph Database Cluster

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>

Resources:
  NeptuneSubnetGroup:
    Type: AWS::Neptune::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Neptune subnet group
      SubnetIds: !Ref SubnetIds

  NeptuneSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Neptune access
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8182
          ToPort: 8182
          CidrIp: 10.0.0.0/16

  NeptuneCluster:
    Type: AWS::Neptune::DBCluster
    Properties:
      DBClusterIdentifier: production-neptune
      StorageEncrypted: true
      BackupRetentionPeriod: 14
      DBSubnetGroupName: !Ref NeptuneSubnetGroup
      VpcSecurityGroupIds:
        - !Ref NeptuneSecurityGroup

  NeptunePrimaryInstance:
    Type: AWS::Neptune::DBInstance
    Properties:
      DBInstanceClass: db.r5.xlarge
      DBClusterIdentifier: !Ref NeptuneCluster
      DBInstanceIdentifier: neptune-primary

Outputs:
  ClusterEndpoint:
    Value: !GetAtt NeptuneCluster.Endpoint
  ClusterReadEndpoint:
    Value: !GetAtt NeptuneCluster.ReadEndpoint
```

## Connecting to Your Neptune Cluster

Once the cluster is up, you'll get two endpoints: a writer endpoint and a reader endpoint. Always use the reader endpoint for queries that don't modify data.

To test connectivity from an EC2 instance in the same VPC, you can use curl.

```bash
# Quick health check against the Neptune endpoint
curl -X POST https://my-neptune-cluster.cluster-xxxxx.us-east-1.neptune.amazonaws.com:8182/status
```

For Gremlin queries, you can use the Gremlin console. Install it on your bastion host.

```bash
# Download and extract the Gremlin console
wget https://archive.apache.org/dist/tinkerpop/3.6.2/apache-tinkerpop-gremlin-console-3.6.2-bin.zip
unzip apache-tinkerpop-gremlin-console-3.6.2-bin.zip
cd apache-tinkerpop-gremlin-console-3.6.2
```

Create a connection configuration file for Neptune.

```yaml
# neptune-remote.yaml - config file for connecting to Neptune
hosts: [my-neptune-cluster.cluster-xxxxx.us-east-1.neptune.amazonaws.com]
port: 8182
connectionPool: { enableSsl: true }
serializer: { className: org.apache.tinkerpop.gremlin.driver.ser.GraphBinaryMessageSerializerV1,
               config: { serializeResultToString: true }}
```

## IAM Authentication

For production, you should always enable IAM authentication. It adds a layer of security beyond just security groups.

```bash
# Modify the cluster to require IAM auth
aws neptune modify-db-cluster \
  --db-cluster-identifier my-neptune-cluster \
  --enable-iam-database-authentication
```

When IAM auth is enabled, every request to Neptune must be signed with SigV4 credentials. The AWS SDK handles this if you're using a supported client library.

## Adding Read Replicas

For read-heavy workloads, add replicas. Neptune supports up to 15 read replicas that share the same storage volume as the primary instance.

```bash
# Add a read replica for scaling read queries
aws neptune create-db-instance \
  --db-instance-identifier my-neptune-reader-1 \
  --db-cluster-identifier my-neptune-cluster \
  --db-instance-class db.r5.large \
  --engine neptune
```

Read replicas automatically register with the reader endpoint. Your application just connects to the reader endpoint, and Neptune load-balances across available replicas.

## Monitoring and Maintenance

Neptune publishes metrics to CloudWatch. The ones you'll want to watch most closely are:

- **GremlinRequestsPerSec** - query throughput
- **SparqlRequestsPerSec** - same for SPARQL workloads
- **VolumeBytesUsed** - storage consumption
- **BufferCacheHitRatio** - if this drops below 99%, you probably need a larger instance

Setting up alarms on these metrics is straightforward and something you should do before going to production. For a complete monitoring setup, consider using [OneUptime to monitor your Neptune cluster](https://oneuptime.com/blog/post/aws-cloudwatch-metrics/view) alongside CloudWatch.

## Common Gotchas

There are a few things that trip people up when they're getting started with Neptune.

First, Neptune doesn't support cross-region replication natively. If you need multi-region, you'll have to build your own replication pipeline using Neptune streams and Lambda.

Second, instance sizing matters more than you'd think. Neptune keeps frequently accessed data in a buffer cache, and if your dataset outgrows that cache, query performance falls off a cliff. Start with db.r5.large for development, but plan on db.r5.2xlarge or bigger for production.

Third, bulk loading is different from transaction-by-transaction inserts. If you're loading a large dataset, use the Neptune bulk loader instead of sending individual Gremlin or SPARQL queries. It's dramatically faster.

```bash
# Start a bulk load from S3
curl -X POST \
  -H 'Content-Type: application/json' \
  https://your-neptune-endpoint:8182/loader \
  -d '{
    "source": "s3://my-graph-data/",
    "format": "csv",
    "iamRoleArn": "arn:aws:iam::123456789:role/NeptuneLoadFromS3",
    "region": "us-east-1",
    "failOnError": "FALSE"
  }'
```

## Wrapping Up

Neptune is a solid choice when your data is naturally graph-shaped. The setup is straightforward if you've worked with other managed AWS databases, but the VPC-only access and the choice between Gremlin and SPARQL add some decisions you need to make early. Get your networking right, pick the correct instance size, and enable IAM auth before you go to production. Everything else can be tuned as you learn your workload's patterns.
