# How to Use CDKTF Stacks for Deployment Units

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Stacks, Infrastructure as Code, Deployment

Description: Learn how to organize your CDKTF infrastructure into stacks as independent deployment units, enabling modular and manageable infrastructure deployments.

---

In CDKTF, a stack is an independent deployment unit that maps to a separate Terraform state file. Each stack can be deployed, updated, or destroyed independently of other stacks. This is a powerful organizational tool that lets you split your infrastructure into logical pieces with separate lifecycles. This guide covers how stacks work, when to use multiple stacks, and patterns for organizing your infrastructure.

## What Is a Stack?

A stack in CDKTF extends `TerraformStack` and represents a complete Terraform configuration. When you run `cdktf synth`, each stack produces its own directory in `cdktf.out/stacks/` containing the generated Terraform JSON.

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

// A simple stack definition
class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Network resources go here
  }
}

const app = new App();
new NetworkStack(app, "network");
app.synth();
```

The key thing to understand is that each stack gets its own Terraform state. This means resources in different stacks are tracked independently and can be deployed separately.

## Why Use Multiple Stacks?

There are several reasons to split your infrastructure into multiple stacks:

1. **Different lifecycles**: Your VPC changes rarely but your application containers change daily. Separate stacks let you deploy each at its own pace.

2. **Blast radius reduction**: If a deployment goes wrong, it only affects resources in that stack. Your network stack remains untouched when you update your application stack.

3. **Team boundaries**: Different teams can own different stacks. The platform team manages the network stack, the application team manages the app stack.

4. **Faster deployments**: Terraform plans and applies are faster with smaller state files. A stack with 20 resources is much faster to plan than one with 500.

5. **Different permissions**: Each stack can use different provider configurations with different IAM roles, following the principle of least privilege.

## Defining Multiple Stacks

Here is how you define multiple stacks in a single CDKTF application:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Instance } from "@cdktf/provider-aws/lib/instance";

// Stack for networking resources
class NetworkStack extends TerraformStack {
  // Expose values that other stacks need
  public readonly vpcId: string;
  public readonly subnetId: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      tags: { Name: "production-vpc" },
    });

    const subnet = new Subnet(this, "subnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      tags: { Name: "production-subnet" },
    });

    // Store references for cross-stack use
    this.vpcId = vpc.id;
    this.subnetId = subnet.id;

    // Output values so other stacks can read them
    new TerraformOutput(this, "vpc-id-output", {
      value: vpc.id,
    });
    new TerraformOutput(this, "subnet-id-output", {
      value: subnet.id,
    });
  }
}

// Stack for application resources
class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string, vpcId: string, subnetId: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Use the VPC and subnet IDs from the network stack
    new Instance(this, "app-server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      subnetId: subnetId,
      tags: { Name: "app-server" },
    });
  }
}

// Wire the stacks together
const app = new App();
const networkStack = new NetworkStack(app, "network");
new ApplicationStack(app, "application",
  networkStack.vpcId,
  networkStack.subnetId
);
app.synth();
```

## Deploying Individual Stacks

CDKTF lets you deploy stacks independently:

```bash
# Deploy all stacks
cdktf deploy '*'

# Deploy only the network stack
cdktf deploy network

# Deploy only the application stack
cdktf deploy application

# Deploy multiple specific stacks
cdktf deploy network application

# Diff a specific stack
cdktf diff network

# Destroy a specific stack
cdktf destroy application
```

## Passing Data Between Stacks

There are several ways to share data between stacks.

### Constructor Parameters

The simplest approach is passing values through constructor parameters:

```typescript
class DatabaseStack extends TerraformStack {
  public readonly connectionString: string;

  constructor(scope: Construct, id: string, subnetIds: string[]) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const db = new DbInstance(this, "database", {
      engine: "postgres",
      instanceClass: "db.t3.micro",
      allocatedStorage: 20,
      // Use subnet IDs from another stack
      dbSubnetGroupName: new DbSubnetGroup(this, "db-subnets", {
        subnetIds: subnetIds,
      }).name,
    });

    this.connectionString = db.endpoint;
  }
}
```

### Using Terraform Remote State

For stacks that are deployed independently or managed by different teams, use remote state data sources:

```typescript
import { DataTerraformRemoteState } from "cdktf";

class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Read outputs from the network stack's remote state
    const networkState = new DataTerraformRemoteState(this, "network-state", {
      backend: "s3",
      config: {
        bucket: "my-terraform-state",
        key: "network/terraform.tfstate",
        region: "us-east-1",
      },
    });

    // Use the values from remote state
    new Instance(this, "app-server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      subnetId: networkState.getString("subnet-id-output"),
    });
  }
}
```

## Stack Organization Patterns

### By Layer

Organize stacks by infrastructure layer:

```typescript
const app = new App();

// Layer 1: Foundation
const networkStack = new NetworkStack(app, "network");

// Layer 2: Data
const databaseStack = new DatabaseStack(app, "database", {
  vpcId: networkStack.vpcId,
  subnetIds: networkStack.privateSubnetIds,
});

// Layer 3: Application
const appStack = new ApplicationStack(app, "application", {
  vpcId: networkStack.vpcId,
  subnetIds: networkStack.publicSubnetIds,
  dbEndpoint: databaseStack.endpoint,
});

app.synth();
```

### By Environment

Create the same stack for different environments:

```typescript
interface EnvironmentConfig {
  region: string;
  instanceType: string;
  instanceCount: number;
}

const environments: Record<string, EnvironmentConfig> = {
  dev: { region: "us-east-1", instanceType: "t3.micro", instanceCount: 1 },
  staging: { region: "us-east-1", instanceType: "t3.small", instanceCount: 2 },
  prod: { region: "us-east-1", instanceType: "t3.medium", instanceCount: 3 },
};

const app = new App();

// Create a stack for each environment
for (const [env, config] of Object.entries(environments)) {
  new ApplicationStack(app, `app-${env}`, config);
}

app.synth();
```

### By Service

For microservice architectures, each service can have its own stack:

```typescript
const app = new App();

const sharedStack = new SharedInfraStack(app, "shared");

new ServiceStack(app, "user-service", {
  serviceName: "user-service",
  vpcId: sharedStack.vpcId,
});

new ServiceStack(app, "order-service", {
  serviceName: "order-service",
  vpcId: sharedStack.vpcId,
});

new ServiceStack(app, "payment-service", {
  serviceName: "payment-service",
  vpcId: sharedStack.vpcId,
});

app.synth();
```

## Stack Naming Conventions

Consistent naming helps when you have many stacks:

```typescript
// Pattern: {project}-{environment}-{component}
new NetworkStack(app, "myapp-prod-network");
new DatabaseStack(app, "myapp-prod-database");
new ApplicationStack(app, "myapp-prod-app");

new NetworkStack(app, "myapp-dev-network");
new DatabaseStack(app, "myapp-dev-database");
new ApplicationStack(app, "myapp-dev-app");
```

## Best Practices

1. **Keep stacks focused**. Each stack should have a clear responsibility. If a stack is getting too large, split it.

2. **Minimize cross-stack references**. The fewer dependencies between stacks, the more independently they can be deployed.

3. **Use outputs for sharing**. Always use `TerraformOutput` to expose values that other stacks need.

4. **Document stack dependencies**. Make it clear which stacks depend on which, and what order they should be deployed in.

5. **Use consistent backends**. All stacks should use the same backend type for state management, even if they have different state files.

Stacks are the primary organizational tool in CDKTF. Getting the boundaries right makes your infrastructure easier to manage, deploy, and reason about. For more on managing stack dependencies, see our guide on [handling CDKTF stack dependencies](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cdktf-stack-dependencies/view).
