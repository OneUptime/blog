# How to Create an RDS Database with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, RDS, Database, PostgreSQL

Description: Learn how to provision and configure Amazon RDS databases using AWS CDK, including PostgreSQL setup, multi-AZ deployments, security groups, and automated backups.

---

Relational databases are still the backbone of most applications. When you need ACID transactions, complex joins, or a schema that enforces data integrity, RDS is the go-to choice on AWS. But setting up an RDS instance correctly - with proper networking, security, backups, and encryption - involves a lot of moving parts.

CDK takes the pain out of this by letting you define everything in code. You get type-safe configuration, sensible defaults, and the ability to spin up identical databases across environments.

## Choosing Your Engine

RDS supports MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and Aurora. For new projects, I'd recommend PostgreSQL or Aurora PostgreSQL. PostgreSQL is mature, feature-rich, and has an excellent ecosystem. Aurora gives you better performance and availability at a higher price point.

We'll use PostgreSQL in this guide, but switching to MySQL or Aurora is mostly a matter of changing the engine property.

## Project Setup

```bash
mkdir rds-cdk && cd rds-cdk
cdk init app --language typescript
npm install aws-cdk-lib constructs
```

## Defining the VPC

Every RDS instance lives inside a VPC. You'll want private subnets for the database - it should never be directly accessible from the internet.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class RdsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with public and private subnets
    const vpc = new ec2.Vpc(this, 'DatabaseVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // No internet access
        },
      ],
    });
  }
}
```

The `PRIVATE_ISOLATED` subnets have no route to the internet, which is the most secure option for databases. Your application connects from the private subnets, and the database sits in isolated subnets.

## Creating a Security Group

Control who can talk to your database with a security group.

```typescript
// Security group for the RDS instance
const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
  vpc,
  description: 'Security group for RDS PostgreSQL',
  allowAllOutbound: false, // Databases don't need outbound access
});

// Allow inbound PostgreSQL connections from within the VPC
dbSecurityGroup.addIngressRule(
  ec2.Peer.ipv4(vpc.vpcCidrBlock),
  ec2.Port.tcp(5432),
  'Allow PostgreSQL connections from within the VPC'
);
```

## Creating the RDS Instance

Now for the main event - the database instance itself.

```typescript
// Create the RDS PostgreSQL instance
const database = new rds.DatabaseInstance(this, 'PostgresDb', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_16_2,
  }),
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.MEDIUM, // 2 vCPU, 4 GB RAM - good for dev/staging
  ),
  vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // Place in isolated subnets
  },
  securityGroups: [dbSecurityGroup],

  // Database configuration
  databaseName: 'appdb',
  port: 5432,
  credentials: rds.Credentials.fromGeneratedSecret('dbadmin', {
    secretName: 'rds-credentials', // Stored in Secrets Manager
  }),

  // Storage settings
  allocatedStorage: 20,        // Start with 20 GB
  maxAllocatedStorage: 100,    // Auto-scale up to 100 GB
  storageType: rds.StorageType.GP3,
  storageEncrypted: true,       // Encrypt at rest

  // Availability and durability
  multiAz: false,              // Set to true for production
  deletionProtection: false,   // Set to true for production

  // Backup configuration
  backupRetention: cdk.Duration.days(7),
  preferredBackupWindow: '03:00-04:00',      // 3 AM UTC
  preferredMaintenanceWindow: 'sun:04:00-sun:05:00',

  // Monitoring
  monitoringInterval: cdk.Duration.seconds(60),
  enablePerformanceInsights: true,
  performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days free

  // Removal behavior
  removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // Take a final snapshot before deletion
});
```

There's a lot going on here, so let's break down the key decisions.

**Credentials**: Using `fromGeneratedSecret` creates a random password and stores it in AWS Secrets Manager. Never hardcode database passwords in your CDK code.

**Storage**: GP3 is the latest general-purpose SSD type. It's cheaper than GP2 for the same performance and lets you provision IOPS independently of storage size. Auto-scaling storage means you don't have to predict your data growth ahead of time.

**Multi-AZ**: For production, always set this to `true`. It creates a standby replica in a different AZ that automatically takes over if the primary fails. It roughly doubles your cost, but the failover is automatic and takes only a minute or two.

**Removal policy**: `SNAPSHOT` takes a final backup before deleting the instance, which is a good middle ground between `RETAIN` (keep the instance) and `DESTROY` (delete everything).

## Configuring Parameter Groups

Parameter groups let you tune database settings. Here's how to create a custom one.

```typescript
// Custom parameter group for PostgreSQL tuning
const parameterGroup = new rds.ParameterGroup(this, 'DbParameterGroup', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_16_2,
  }),
  parameters: {
    'log_statement': 'all',           // Log all SQL statements (dev only!)
    'log_min_duration_statement': '1000', // Log queries slower than 1 second
    'shared_preload_libraries': 'pg_stat_statements',
    'max_connections': '200',
  },
});
```

Then pass `parameterGroup` to your `DatabaseInstance` constructor.

## Creating an Aurora Cluster

If you need more performance or availability, Aurora is the upgrade path. The CDK code is slightly different.

```typescript
// Aurora PostgreSQL cluster (higher performance, higher cost)
const auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_16_1,
  }),
  credentials: rds.Credentials.fromGeneratedSecret('dbadmin'),
  writer: rds.ClusterInstance.provisioned('Writer', {
    instanceType: ec2.InstanceType.of(
      ec2.InstanceClass.R6G,
      ec2.InstanceSize.LARGE,
    ),
  }),
  readers: [
    rds.ClusterInstance.provisioned('Reader1', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.R6G,
        ec2.InstanceSize.LARGE,
      ),
    }),
  ],
  vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
  },
  defaultDatabaseName: 'appdb',
  storageEncrypted: true,
  backup: {
    retention: cdk.Duration.days(14),
  },
});
```

Aurora gives you automatic storage scaling, faster failover, and up to 15 read replicas. The trade-off is cost - Aurora instances are more expensive than equivalent RDS instances.

## Outputs and Connection Info

Export the connection details so other stacks or services can use them.

```typescript
// Output connection information
new cdk.CfnOutput(this, 'DbEndpoint', {
  value: database.instanceEndpoint.hostname,
  description: 'Database endpoint hostname',
});

new cdk.CfnOutput(this, 'DbPort', {
  value: database.instanceEndpoint.port.toString(),
  description: 'Database port',
});

new cdk.CfnOutput(this, 'SecretArn', {
  value: database.secret?.secretArn || 'N/A',
  description: 'ARN of the secret containing database credentials',
});
```

## Deploying

```bash
cdk diff
cdk deploy
```

RDS deployments take 10-15 minutes typically, so grab a coffee.

## Connecting from Your Application

Retrieve credentials from Secrets Manager in your application code.

```typescript
// Example: Reading RDS credentials from Secrets Manager in Node.js
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });

async function getDbCredentials() {
  const response = await client.getSecretValue({
    SecretId: 'rds-credentials',
  });
  return JSON.parse(response.SecretString || '{}');
}
```

## Monitoring

RDS provides CloudWatch metrics for CPU, memory, disk I/O, and connection count. Performance Insights (which we enabled) gives you a detailed view of database load and query performance. For comprehensive monitoring that ties database health to application performance, consider using [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) alongside CloudWatch.

## Wrapping Up

CDK makes RDS setup reproducible and safe. Define your instance in code, store credentials in Secrets Manager, encrypt everything, and enable automated backups. Start with a small instance type and scale up as needed - it's easy to modify instance types through CDK.

For the networking layer, pair this with proper VPC design. And if your application runs on ECS, check out our guide on [creating an ECS Fargate service with CDK](https://oneuptime.com/blog/post/create-ecs-fargate-service-with-cdk/view).
