# How to Use CDKTF for Multi-Stack Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Multi-Stack, Deployment, Infrastructure as Code

Description: Learn how to design, organize, and deploy multi-stack CDKTF architectures for complex infrastructure spanning multiple environments, regions, and services.

---

As infrastructure grows, a single stack becomes unwieldy. Hundreds of resources in one state file means slow plans, large blast radius, and tangled dependencies. Multi-stack architectures solve this by splitting infrastructure into focused, independently deployable units. This guide covers patterns for designing multi-stack CDKTF applications, managing cross-stack data flow, and deploying them effectively.

## Why Multi-Stack?

A single CDKTF stack works fine for small projects. But as your infrastructure grows, you hit problems:

- **Slow plans**: Terraform has to refresh every resource in the state before planning. With 500 resources, that takes minutes.
- **Large blast radius**: A mistake in any resource can affect the entire stack during deployment.
- **Deployment coupling**: You cannot update your application without also running the plan against your network and database.
- **Team conflicts**: Multiple teams editing the same stack leads to merge conflicts and coordination overhead.

Multi-stack solves all of these by splitting resources into logical groups with separate state and separate deployment lifecycles.

## Architecture Patterns

### Layer-Based Architecture

Split by infrastructure layer, with higher layers depending on lower ones:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, S3Backend, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

// Layer 1: Foundation - rarely changes
class NetworkStack extends TerraformStack {
  public readonly vpcId: string;
  public readonly publicSubnetIds: string[];
  public readonly privateSubnetIds: string[];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "terraform-state",
      key: "network/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-lock",
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // VPC, subnets, route tables, NAT gateways, VPN
    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });
    this.vpcId = vpc.id;

    // Create subnets, expose IDs
    // ...

    new TerraformOutput(this, "vpc-id", { value: vpc.id });
  }
}

// Layer 2: Data - changes occasionally
class DataStack extends TerraformStack {
  public readonly dbEndpoint: string;
  public readonly cacheEndpoint: string;

  constructor(
    scope: Construct,
    id: string,
    props: { vpcId: string; subnetIds: string[] }
  ) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "terraform-state",
      key: "data/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-lock",
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // RDS, ElastiCache, S3 buckets for data
    // ...
  }
}

// Layer 3: Compute - changes frequently
class ComputeStack extends TerraformStack {
  constructor(
    scope: Construct,
    id: string,
    props: {
      vpcId: string;
      subnetIds: string[];
      dbEndpoint: string;
    }
  ) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "terraform-state",
      key: "compute/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-lock",
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // ECS services, Lambda functions, API Gateway
    // ...
  }
}

// Wire everything together
const app = new App();

const network = new NetworkStack(app, "network");
const data = new DataStack(app, "data", {
  vpcId: network.vpcId,
  subnetIds: network.privateSubnetIds,
});
const compute = new ComputeStack(app, "compute", {
  vpcId: network.vpcId,
  subnetIds: network.privateSubnetIds,
  dbEndpoint: data.dbEndpoint,
});

app.synth();
```

### Service-Based Architecture

For microservices, each service gets its own stack:

```typescript
// Shared infrastructure
class SharedStack extends TerraformStack {
  public readonly vpcId: string;
  public readonly ecsClusterId: string;
  public readonly albArn: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    // VPC, ECS cluster, ALB, shared security groups
  }
}

// Interface for service configuration
interface ServiceConfig {
  name: string;
  cpu: number;
  memory: number;
  port: number;
  image: string;
  replicas: number;
  healthCheckPath: string;
}

// Reusable service stack
class ServiceStack extends TerraformStack {
  constructor(
    scope: Construct,
    id: string,
    shared: { vpcId: string; clusterId: string; albArn: string },
    config: ServiceConfig
  ) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "terraform-state",
      key: `services/${config.name}/terraform.tfstate`,
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-lock",
    });

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // ECS task definition, service, target group, listener rule
    // Log group, IAM roles, security groups
    // Each service is independently deployable
  }
}

// Create stacks for each service
const app = new App();
const shared = new SharedStack(app, "shared");

const services: ServiceConfig[] = [
  {
    name: "user-api",
    cpu: 256,
    memory: 512,
    port: 8080,
    image: "user-api:latest",
    replicas: 3,
    healthCheckPath: "/health",
  },
  {
    name: "order-api",
    cpu: 512,
    memory: 1024,
    port: 8080,
    image: "order-api:latest",
    replicas: 2,
    healthCheckPath: "/health",
  },
  {
    name: "notification-service",
    cpu: 256,
    memory: 512,
    port: 8080,
    image: "notification:latest",
    replicas: 2,
    healthCheckPath: "/status",
  },
];

services.forEach((config) => {
  new ServiceStack(app, config.name, {
    vpcId: shared.vpcId,
    clusterId: shared.ecsClusterId,
    albArn: shared.albArn,
  }, config);
});

app.synth();
```

### Environment-Based Architecture

Create identical stacks per environment with different configurations:

```typescript
interface EnvironmentConfig {
  name: string;
  region: string;
  instanceType: string;
  dbInstanceClass: string;
  minCapacity: number;
  maxCapacity: number;
  enableMultiAz: boolean;
}

const environments: EnvironmentConfig[] = [
  {
    name: "dev",
    region: "us-east-1",
    instanceType: "t3.micro",
    dbInstanceClass: "db.t3.micro",
    minCapacity: 1,
    maxCapacity: 2,
    enableMultiAz: false,
  },
  {
    name: "staging",
    region: "us-east-1",
    instanceType: "t3.small",
    dbInstanceClass: "db.t3.small",
    minCapacity: 2,
    maxCapacity: 4,
    enableMultiAz: false,
  },
  {
    name: "production",
    region: "us-east-1",
    instanceType: "t3.medium",
    dbInstanceClass: "db.r5.large",
    minCapacity: 3,
    maxCapacity: 10,
    enableMultiAz: true,
  },
];

const app = new App();

environments.forEach((env) => {
  // Each environment is a complete, independent stack
  new FullEnvironmentStack(app, `${env.name}-infra`, env);
});

app.synth();
```

### Multi-Region Architecture

Deploy the same infrastructure across multiple regions:

```typescript
interface RegionConfig {
  region: string;
  isPrimary: boolean;
}

const regions: RegionConfig[] = [
  { region: "us-east-1", isPrimary: true },
  { region: "eu-west-1", isPrimary: false },
  { region: "ap-southeast-1", isPrimary: false },
];

const app = new App();

regions.forEach((regionConfig) => {
  const stackId = `app-${regionConfig.region}`;

  new RegionalStack(app, stackId, {
    region: regionConfig.region,
    isPrimary: regionConfig.isPrimary,
    // Primary region has the database, others have read replicas
  });
});

// Global resources (Route53, CloudFront, etc.)
new GlobalStack(app, "global", {
  regions: regions.map((r) => r.region),
});

app.synth();
```

## Deploying Multi-Stack Applications

### Deploy All Stacks

```bash
# Deploy everything in dependency order
cdktf deploy '*'

# CDKTF automatically detects dependencies and deploys in order
```

### Deploy Individual Stacks

```bash
# Deploy just the network stack
cdktf deploy network

# Deploy just one service
cdktf deploy user-api

# Deploy multiple specific stacks
cdktf deploy network data
```

### Deployment Scripts

For complex multi-stack deployments, create a deployment script:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "Deploying foundation layer..."
cdktf deploy network --auto-approve

echo "Deploying data layer..."
cdktf deploy data --auto-approve

echo "Deploying compute layer..."
cdktf deploy compute --auto-approve

echo "Deploying services..."
cdktf deploy user-api order-api notification-service --auto-approve

echo "Deployment complete!"
```

## Managing Cross-Stack Data

### Using Constructor Parameters

For stacks in the same CDKTF application:

```typescript
const network = new NetworkStack(app, "network");
const data = new DataStack(app, "data", {
  vpcId: network.vpcId,
});
```

CDKTF automatically creates remote state data sources to resolve cross-stack references.

### Using SSM Parameters

For loosely coupled stacks:

```typescript
// In the producing stack
new SsmParameter(this, "vpc-id-param", {
  name: "/infra/network/vpc-id",
  type: "String",
  value: vpc.id,
});

// In the consuming stack
const vpcIdParam = new DataAwsSsmParameter(this, "vpc-id", {
  name: "/infra/network/vpc-id",
});
```

## Monitoring Multi-Stack Deployments

Track the health of all your stacks with monitoring:

```typescript
// In each service stack, create health check outputs
new TerraformOutput(this, "service-url", {
  value: `https://${loadBalancer.dnsName}/${config.name}`,
});

// Use OneUptime or similar monitoring to check service health
// after each deployment
```

## Best Practices

1. **Minimize cross-stack dependencies**. Each additional dependency makes deployment more complex.

2. **Use consistent naming**. Name stacks like `{project}-{env}-{component}` for clarity.

3. **Document the dependency graph**. Make it easy for anyone to understand which stacks depend on which.

4. **Deploy foundational stacks first**. Network and shared resources should be deployed and stable before service stacks.

5. **Test stacks independently**. Each stack should have its own tests that can run without deploying other stacks.

6. **Use the same backend for all stacks**. Consistent state management reduces surprises.

7. **Keep service stacks small**. A service stack should have 10-30 resources, not 100+.

Multi-stack architectures require more up-front design, but they pay off with faster deployments, smaller blast radii, and better team autonomy. For more on stack dependencies, see our guide on [handling CDKTF stack dependencies](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cdktf-stack-dependencies/view).
