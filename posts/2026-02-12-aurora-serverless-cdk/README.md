# How to Create Aurora Serverless with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Aurora, Serverless, Database

Description: Deploy Amazon Aurora Serverless v2 clusters using AWS CDK with automatic scaling, security configuration, and integration with Lambda and Secrets Manager.

---

Aurora Serverless takes the best relational database engine on AWS and removes the capacity planning headache. Instead of picking an instance size and hoping you got it right, Aurora Serverless scales compute capacity up and down based on actual demand. Version 2 is the current generation, and it's a genuine game-changer for workloads with variable traffic patterns.

CDK makes Aurora Serverless provisioning clean and repeatable. Let's build out a production cluster with proper networking, encryption, monitoring, and application integration.

## Basic Aurora Serverless v2 Cluster

Here's a PostgreSQL-compatible Aurora Serverless v2 cluster:

```typescript
// lib/aurora-stack.ts - Aurora Serverless v2 with CDK
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AuroraStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for the database
    const vpc = new ec2.Vpc(this, 'DatabaseVpc', {
      maxAzs: 3,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Aurora Serverless v2 cluster
    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      clusterIdentifier: 'production-db',
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_4,
      }),
      credentials: rds.Credentials.fromGeneratedSecret('dbadmin', {
        secretName: 'production/aurora/credentials',
      }),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 16,
      writer: rds.ClusterInstance.serverlessV2('Writer', {
        publiclyAccessible: false,
      }),
      readers: [
        rds.ClusterInstance.serverlessV2('Reader1', {
          scaleWithWriter: true,
        }),
      ],
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      defaultDatabaseName: 'myapp',
      storageEncrypted: true,
      backup: {
        retention: cdk.Duration.days(14),
        preferredWindow: '03:00-04:00',
      },
      deletionProtection: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
```

The `serverlessV2MinCapacity` and `serverlessV2MaxCapacity` control the scaling range in Aurora Capacity Units (ACUs). Each ACU is roughly 2 GB of memory. Setting min to 0.5 means the cluster can scale down to nearly nothing during quiet periods, saving significant costs.

## Security Configuration

Lock down the database with proper security groups and encryption:

```typescript
// Security group for database access
const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
  vpc: vpc,
  description: 'Security group for Aurora Serverless',
  allowAllOutbound: false,
});

// Only allow access from the application security group
const appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
  vpc: vpc,
  description: 'Security group for application tier',
});

dbSecurityGroup.addIngressRule(
  appSecurityGroup,
  ec2.Port.tcp(5432),
  'Allow PostgreSQL from app tier'
);

// Use the security group in the cluster
const cluster = new rds.DatabaseCluster(this, 'SecureCluster', {
  clusterIdentifier: 'secure-db',
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_15_4,
  }),
  credentials: rds.Credentials.fromGeneratedSecret('dbadmin'),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 8,
  writer: rds.ClusterInstance.serverlessV2('Writer'),
  vpc: vpc,
  securityGroups: [dbSecurityGroup],
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  storageEncrypted: true,
  storageEncryptionKey: encryptionKey, // Customer managed KMS key
  iamAuthentication: true, // Enable IAM authentication
});
```

IAM authentication eliminates the need for password-based access from applications. Your Lambda functions or ECS tasks authenticate using their IAM role instead.

## MySQL-Compatible Cluster

If you prefer MySQL:

```typescript
// Aurora Serverless v2 with MySQL compatibility
const mysqlCluster = new rds.DatabaseCluster(this, 'MySQLCluster', {
  clusterIdentifier: 'mysql-serverless',
  engine: rds.DatabaseClusterEngine.auroraMysql({
    version: rds.AuroraMysqlEngineVersion.VER_3_04_1,
  }),
  credentials: rds.Credentials.fromGeneratedSecret('admin'),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 16,
  writer: rds.ClusterInstance.serverlessV2('Writer'),
  readers: [
    rds.ClusterInstance.serverlessV2('Reader1', {
      scaleWithWriter: true,
    }),
    rds.ClusterInstance.serverlessV2('Reader2', {
      scaleWithWriter: false, // Independent scaling
    }),
  ],
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
  defaultDatabaseName: 'myapp',
  storageEncrypted: true,
});
```

Setting `scaleWithWriter: false` on Reader2 means it scales independently based on read traffic, which is useful when your read workload doesn't correlate with writes.

## Lambda Integration

Connect Lambda functions to Aurora Serverless:

```typescript
// Lambda function with Aurora access
import * as lambda from 'aws-cdk-lib/aws-lambda';

const apiHandler = new lambda.Function(this, 'ApiHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/api'),
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [appSecurityGroup],
  environment: {
    DB_SECRET_ARN: cluster.secret!.secretArn,
    DB_CLUSTER_ENDPOINT: cluster.clusterEndpoint.hostname,
    DB_READER_ENDPOINT: cluster.clusterReadEndpoint.hostname,
    DB_PORT: '5432',
    DB_NAME: 'myapp',
  },
  timeout: cdk.Duration.seconds(30),
});

// Grant the Lambda function access to the database credentials
cluster.secret!.grantRead(apiHandler);

// Allow the Lambda's security group to connect to the database
cluster.connections.allowFrom(apiHandler, ec2.Port.tcp(5432));
```

Here's how the Lambda handler uses the credentials:

```typescript
// lambda/api/index.ts - Connect to Aurora from Lambda
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Client } from 'pg';

const secretsClient = new SecretsManagerClient({});
let dbCredentials: any = null;

async function getCredentials() {
  if (!dbCredentials) {
    const response = await secretsClient.send(new GetSecretValueCommand({
      SecretId: process.env.DB_SECRET_ARN,
    }));
    dbCredentials = JSON.parse(response.SecretString!);
  }
  return dbCredentials;
}

export const handler = async (event: any) => {
  const creds = await getCredentials();

  const client = new Client({
    host: process.env.DB_CLUSTER_ENDPOINT,
    port: parseInt(process.env.DB_PORT!),
    database: process.env.DB_NAME,
    user: creds.username,
    password: creds.password,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const result = await client.query('SELECT NOW() as current_time');
    return {
      statusCode: 200,
      body: JSON.stringify({ time: result.rows[0].current_time }),
    };
  } finally {
    await client.end();
  }
};
```

## Data API for Serverless Access

Aurora Serverless v2 supports the Data API, which lets you run SQL queries over HTTP without managing database connections:

```typescript
// Enable Data API on the cluster
const dataApiCluster = new rds.DatabaseCluster(this, 'DataApiCluster', {
  clusterIdentifier: 'data-api-db',
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_15_4,
  }),
  credentials: rds.Credentials.fromGeneratedSecret('admin'),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 4,
  writer: rds.ClusterInstance.serverlessV2('Writer'),
  vpc: vpc,
  enableDataApi: true, // Enable HTTP Data API
});
```

## Monitoring and Alarms

Set up monitoring for your Aurora cluster:

```typescript
// CloudWatch alarms for Aurora Serverless
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';

const alertTopic = new sns.Topic(this, 'DbAlerts');

// Alarm on high CPU
const cpuAlarm = new cloudwatch.Alarm(this, 'HighCPU', {
  metric: cluster.metricCPUUtilization({
    period: cdk.Duration.minutes(5),
  }),
  threshold: 80,
  evaluationPeriods: 3,
  alarmDescription: 'Aurora CPU exceeds 80%',
});
cpuAlarm.addAlarmAction(new actions.SnsAction(alertTopic));

// Alarm on high connection count
const connectionAlarm = new cloudwatch.Alarm(this, 'HighConnections', {
  metric: cluster.metricDatabaseConnections({
    period: cdk.Duration.minutes(5),
  }),
  threshold: 100,
  evaluationPeriods: 3,
});
connectionAlarm.addAlarmAction(new actions.SnsAction(alertTopic));
```

For more on monitoring alarms, see our post on [CloudWatch alarms with CDK](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-alarms-cdk/view). And for managing your database credentials securely, check out [Secrets Manager secrets with CDK](https://oneuptime.com/blog/post/2026-02-12-secrets-manager-secrets-cdk/view).

## Wrapping Up

Aurora Serverless v2 with CDK gives you a production-grade relational database that scales automatically and deploys consistently. The key decisions are: choose your min/max capacity based on your workload (start conservative and adjust), put the cluster in isolated subnets, enable encryption with a customer managed key, and set up proper IAM authentication for your applications. The combination of Aurora's scaling capabilities and CDK's infrastructure-as-code approach means you spend less time on database operations and more time building features.
