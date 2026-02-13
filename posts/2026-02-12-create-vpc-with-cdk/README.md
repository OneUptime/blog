# How to Create a VPC with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, VPC, Networking

Description: Learn how to create and configure a VPC with CDK including subnets, NAT gateways, VPC endpoints, flow logs, and common networking patterns for production workloads.

---

A VPC is the foundation of almost every AWS deployment. Get the networking right, and everything else falls into place. Get it wrong, and you'll be troubleshooting connectivity issues for days. CDK's VPC construct makes it straightforward to create production-ready networks with sensible defaults.

Let's build a VPC from simple to production-grade, covering the patterns you'll actually use.

## The Simple VPC

The simplest VPC creation is a single line. CDK's defaults give you a reasonable starting point.

```typescript
// Create a VPC with CDK defaults
// This creates public and private subnets across 3 AZs, plus a NAT gateway
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const vpc = new ec2.Vpc(this, 'MyVpc');
```

That one line creates a VPC with a /16 CIDR block, public subnets, private subnets with egress (via NAT gateway), and route tables. It's a good starting point, but you'll want more control for production.

## Production VPC Configuration

Here's a VPC configuration that covers common production requirements.

```typescript
// Production VPC with custom CIDR, multiple subnet tiers, and NAT gateways
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';

const vpc = new ec2.Vpc(this, 'ProductionVpc', {
  // Custom CIDR block
  ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),

  // Use 3 Availability Zones for high availability
  maxAzs: 3,

  // NAT gateways for private subnet internet access
  // Use 1 for dev (cost savings), 3 for production (HA)
  natGateways: 3,

  // Define subnet configuration
  subnetConfiguration: [
    {
      // Public subnets for load balancers and bastion hosts
      name: 'Public',
      subnetType: ec2.SubnetType.PUBLIC,
      cidrMask: 24,
      mapPublicIpOnLaunch: false,
    },
    {
      // Private subnets for application servers
      // These have outbound internet via NAT gateway
      name: 'Application',
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      cidrMask: 24,
    },
    {
      // Isolated subnets for databases
      // No internet access at all
      name: 'Database',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      cidrMask: 24,
    },
  ],
});
```

This creates a three-tier network architecture. Public subnets face the internet (for ALBs and bastions), private subnets have outbound-only internet access (for application servers that need to pull packages or call external APIs), and isolated subnets have no internet access at all (perfect for databases).

## VPC Flow Logs

Flow logs capture network traffic metadata for security auditing and troubleshooting.

```typescript
// Enable VPC Flow Logs to CloudWatch
import * as logs from 'aws-cdk-lib/aws-logs';

vpc.addFlowLog('FlowLog', {
  destination: ec2.FlowLogDestination.toCloudWatchLogs(
    new logs.LogGroup(this, 'VpcFlowLogs', {
      logGroupName: '/vpc/flow-logs/production',
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }),
  ),
  trafficType: ec2.FlowLogTrafficType.ALL,
});

// Or send flow logs to S3 for cheaper long-term storage
vpc.addFlowLog('FlowLogS3', {
  destination: ec2.FlowLogDestination.toS3(flowLogBucket, 'vpc-flow-logs/'),
  trafficType: ec2.FlowLogTrafficType.REJECT,  // Only log rejected traffic
});
```

## VPC Endpoints

VPC endpoints let your private resources access AWS services without going through the internet. This is important for both security and cost (NAT gateway data processing charges add up fast).

```typescript
// Add Gateway endpoints (free)
// S3 and DynamoDB use gateway endpoints
vpc.addGatewayEndpoint('S3Endpoint', {
  service: ec2.GatewayVpcEndpointAwsService.S3,
});

vpc.addGatewayEndpoint('DynamoDbEndpoint', {
  service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
});

// Add Interface endpoints (cost per hour + data processed)
// These are needed for other AWS services accessed from private subnets
vpc.addInterfaceEndpoint('EcrEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.ECR,
  privateDnsEnabled: true,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
  privateDnsEnabled: true,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
  privateDnsEnabled: true,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
  privateDnsEnabled: true,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});
```

If you're running ECS tasks in private subnets, you'll need the ECR, ECR Docker, CloudWatch Logs, and S3 endpoints at minimum. Without them, your containers can't pull images or send logs.

## Security Groups

Security groups control traffic to and from your resources. CDK makes them easy to define and connect.

```typescript
// Create security groups for different tiers
const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
  vpc,
  description: 'Security group for the application load balancer',
  allowAllOutbound: true,
});

albSg.addIngressRule(
  ec2.Peer.anyIpv4(),
  ec2.Port.tcp(443),
  'Allow HTTPS from anywhere',
);

const appSg = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
  vpc,
  description: 'Security group for application servers',
  allowAllOutbound: true,
});

// Allow traffic from ALB to app servers
appSg.addIngressRule(
  albSg,
  ec2.Port.tcp(8080),
  'Allow traffic from ALB',
);

const dbSg = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
  vpc,
  description: 'Security group for database',
  allowAllOutbound: false,  // Databases shouldn't initiate connections
});

// Allow traffic from app servers to database
dbSg.addIngressRule(
  appSg,
  ec2.Port.tcp(5432),
  'Allow PostgreSQL from app servers',
);
```

## Importing an Existing VPC

If you have a VPC created outside of CDK (by another team, or before you adopted CDK), you can import it.

```typescript
// Import an existing VPC by ID
const existingVpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', {
  vpcId: 'vpc-1234567890abcdef0',
});

// Or look up by tags
const taggedVpc = ec2.Vpc.fromLookup(this, 'TaggedVpc', {
  tags: {
    'Environment': 'production',
  },
});

// Or import by attributes (no AWS lookup required)
const importedVpc = ec2.Vpc.fromVpcAttributes(this, 'ImportedVpc', {
  vpcId: 'vpc-1234567890abcdef0',
  availabilityZones: ['us-east-1a', 'us-east-1b'],
  publicSubnetIds: ['subnet-aaa', 'subnet-bbb'],
  privateSubnetIds: ['subnet-ccc', 'subnet-ddd'],
});
```

The `fromLookup` approach queries AWS during synthesis and caches the result. The `fromVpcAttributes` approach uses hardcoded values and doesn't need AWS access during synthesis.

## Selecting Subnets

When placing resources, you select subnets by type or by name.

```typescript
// Select subnets for resource placement
// By type
const privateSubnets = vpc.selectSubnets({
  subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
});

// By name (matches the name in subnetConfiguration)
const dbSubnets = vpc.selectSubnets({
  subnetGroupName: 'Database',
});

// Use selected subnets when creating resources
const rdsInstance = new rds.DatabaseInstance(this, 'Database', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15,
  }),
  vpc,
  vpcSubnets: dbSubnets,
  // ...
});
```

## Exposing the VPC for Other Stacks

When other stacks need your VPC, expose it as a public property.

```typescript
// Network stack exposes the VPC
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      // ... configuration
    });
  }
}

// Other stacks receive it through props
interface AppStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // Use the VPC from the network stack
    new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
    });
  }
}
```

The VPC is usually the first thing you create and the last thing you delete. Put it in its own stack with a long lifecycle, and pass it to application stacks that change frequently. For more on organizing stacks, see the post on [CDK stacks and environments](https://oneuptime.com/blog/post/2026-02-12-cdk-stacks-and-environments/view). For a complete Fargate deployment that uses a VPC like this, check out [CDK L3 constructs for complete architectures](https://oneuptime.com/blog/post/2026-02-12-cdk-l3-constructs-patterns-complete-architectures/view).
