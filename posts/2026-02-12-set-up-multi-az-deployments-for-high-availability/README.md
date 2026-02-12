# How to Set Up Multi-AZ Deployments for High Availability

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Multi-AZ, High Availability, RDS, Architecture

Description: Complete guide to setting up Multi-AZ deployments on AWS for databases, compute, caching, and messaging to achieve high availability and automatic failover.

---

An Availability Zone (AZ) is essentially a separate data center within an AWS region. They're physically isolated from each other with independent power, cooling, and networking, but connected through low-latency links. When you deploy to a single AZ and it has problems, your application goes down. Multi-AZ deployments eliminate this single point of failure.

Here's how to set up Multi-AZ for every layer of your stack.

## Understanding AZ Failures

AZ failures are rare, but they happen. In the past decade, several major AZ outages have taken down applications that only deployed to one zone. The symptoms range from increased latency to complete unavailability.

The fix is straightforward: run everything in at least two AZs, preferably three. AWS manages the hard part - you just need to configure it.

## VPC and Network Setup

Start with a VPC that spans multiple AZs with proper subnet allocation.

```typescript
// CDK VPC spanning 3 availability zones
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class MultiAzStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string) {
    super(scope, id);

    const vpc = new ec2.Vpc(this, 'MultiAzVpc', {
      maxAzs: 3,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 22, // 1,022 IPs per AZ
        },
        {
          name: 'Application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 20, // 4,094 IPs per AZ
        },
        {
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24, // 254 IPs per AZ
        },
      ],
      natGateways: 2, // NAT Gateways in 2 AZs for redundancy
    });
  }
}
```

Notice we're deploying 2 NAT Gateways instead of 1. A single NAT Gateway is a single point of failure - if its AZ goes down, your private subnets lose internet access.

## Compute: Multi-AZ Auto Scaling Groups

Your compute layer should automatically spread across AZs.

```typescript
// Auto Scaling Group across multiple AZs
const asg = new autoscaling.AutoScalingGroup(this, 'AppASG', {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  minCapacity: 3,  // At least 1 per AZ
  maxCapacity: 12,
  desiredCapacity: 3,
  healthCheck: autoscaling.HealthCheck.elb({
    grace: cdk.Duration.minutes(5),
  }),
});

// The ALB distributes traffic across all AZs
const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
  vpc,
  internetFacing: true,
  crossZoneEnabled: true, // Distribute evenly across AZs
});

const listener = alb.addListener('Listener', { port: 443 });
listener.addTargets('AppTarget', {
  port: 80,
  targets: [asg],
  healthCheck: {
    path: '/health',
    interval: cdk.Duration.seconds(15),
    healthyThresholdCount: 2,
    unhealthyThresholdCount: 3,
  },
});
```

### AZ Rebalancing

When one AZ has problems and instances terminate, the ASG automatically launches replacements in healthy AZs. Once the problematic AZ recovers, the ASG rebalances.

Set a minimum capacity that can handle your traffic even with one AZ down. If you normally need 3 instances and run 3 AZs, your minimum should be 4 (so losing one AZ still leaves enough capacity).

## Database: RDS Multi-AZ

RDS Multi-AZ creates a synchronous standby in a different AZ. If the primary fails, RDS automatically promotes the standby.

```typescript
// RDS Multi-AZ PostgreSQL
const dbSubnetGroup = new rds.SubnetGroup(this, 'DBSubnetGroup', {
  vpc,
  description: 'Multi-AZ database subnet group',
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
});

const database = new rds.DatabaseInstance(this, 'AppDatabase', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15,
  }),
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
  vpc,
  subnetGroup: dbSubnetGroup,
  multiAz: true,
  storageType: rds.StorageType.GP3,
  allocatedStorage: 100,
  maxAllocatedStorage: 500, // Auto-expand storage
  backupRetention: cdk.Duration.days(14),
  deletionProtection: true,
  parameterGroup: new rds.ParameterGroup(this, 'DBParams', {
    engine: rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_15,
    }),
    parameters: {
      'max_connections': '200',
      'shared_buffers': '256MB',
    },
  }),
});
```

### Aurora Multi-AZ

Aurora takes Multi-AZ further with up to 15 read replicas automatically spread across AZs. Failover is typically under 30 seconds.

```typescript
// Aurora cluster with read replicas in multiple AZs
const auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_15_4,
  }),
  instances: 3,
  instanceProps: {
    vpc,
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
    instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
  },
  backup: { retention: cdk.Duration.days(14) },
  deletionProtection: true,
  storageEncrypted: true,
});
```

## Caching: ElastiCache Multi-AZ

Redis replication groups with Multi-AZ provide automatic failover for your cache layer.

```typescript
// Redis with Multi-AZ automatic failover
const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnets', {
  description: 'Redis subnets across AZs',
  subnetIds: vpc.selectSubnets({
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
  }).subnetIds,
});

const redis = new elasticache.CfnReplicationGroup(this, 'RedisCluster', {
  replicationGroupDescription: 'Multi-AZ Redis',
  engine: 'redis',
  engineVersion: '7.0',
  cacheNodeType: 'cache.r6g.large',
  numNodeGroups: 1,
  replicasPerNodeGroup: 2,  // 1 primary + 2 replicas across AZs
  automaticFailoverEnabled: true,
  multiAzEnabled: true,
  atRestEncryptionEnabled: true,
  transitEncryptionEnabled: true,
  cacheSubnetGroupName: redisSubnetGroup.ref,
  preferredCacheClusterAZs: [
    cdk.Fn.select(0, cdk.Fn.getAzs()),
    cdk.Fn.select(1, cdk.Fn.getAzs()),
    cdk.Fn.select(2, cdk.Fn.getAzs()),
  ],
});
```

## Messaging: Multi-AZ SQS and SNS

SQS and SNS are inherently Multi-AZ - messages are automatically replicated across AZs. You don't need to do anything special.

But if you're running self-managed message brokers like RabbitMQ on Amazon MQ, enable Multi-AZ.

```typescript
// Amazon MQ broker in active/standby Multi-AZ
const broker = new amazonmq.CfnBroker(this, 'MessageBroker', {
  brokerName: 'app-broker',
  deploymentMode: 'ACTIVE_STANDBY_MULTI_AZ',
  engineType: 'RABBITMQ',
  engineVersion: '3.11',
  hostInstanceType: 'mq.m5.large',
  publiclyAccessible: false,
  subnetIds: [
    vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }).subnetIds[0],
    vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }).subnetIds[1],
  ],
});
```

## Application Configuration for Multi-AZ

Your application needs to handle failover gracefully. Database connections will break during failover, so implement reconnection logic.

```javascript
// Database connection with retry for Multi-AZ failover
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'myapp',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Retry wrapper for database operations
async function queryWithRetry(sql, params, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await pool.query(sql, params);
    } catch (error) {
      // Connection errors during failover
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        console.log(`Database connection failed, retry ${attempt + 1}/${retries}`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Database unavailable after retries');
}
```

## Monitoring Multi-AZ Health

Track the health of each AZ and get alerts when AZ-specific issues arise.

```typescript
// Per-AZ monitoring
new cloudwatch.Alarm(this, 'AZ-A-HealthyHosts', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApplicationELB',
    metricName: 'HealthyHostCount',
    dimensionsMap: {
      TargetGroup: targetGroup.targetGroupFullName,
      LoadBalancer: alb.loadBalancerFullName,
      AvailabilityZone: `${cdk.Aws.REGION}a`,
    },
  }),
  threshold: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  evaluationPeriods: 2,
  alarmDescription: 'No healthy hosts in AZ-A',
});
```

For comprehensive monitoring across your Multi-AZ deployment, see our guide on [building a logging and monitoring stack on AWS](https://oneuptime.com/blog/post/build-logging-and-monitoring-stack-on-aws/view).

## Summary

Multi-AZ deployment is the minimum bar for production workloads on AWS. Spread your compute across AZs with auto scaling, use RDS or Aurora Multi-AZ for databases, ElastiCache Multi-AZ for caching, and take advantage of inherently Multi-AZ services like SQS, SNS, and DynamoDB. The cost premium is modest - typically an extra AZ doubles your data tier cost but barely affects compute cost (you're just spreading the same instances across zones). It's a small price for not having your application go down when a single data center has issues.
