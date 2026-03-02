# How to Handle CDKTF Stack Dependencies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Stack, Dependencies, Infrastructure as Code

Description: Learn how to manage dependencies between CDKTF stacks, pass data across stacks, and control deployment ordering for multi-stack architectures.

---

When you split your infrastructure into multiple CDKTF stacks, those stacks often depend on each other. Your application stack needs the VPC ID from your network stack. Your monitoring stack needs the instance IDs from your compute stack. Managing these dependencies correctly is critical - deploy stacks in the wrong order and you get errors, pass data incorrectly and you get broken references. This guide covers the patterns for handling stack dependencies in CDKTF.

## Understanding Stack Dependencies

Each CDKTF stack is an independent Terraform state. This means resources in one stack cannot directly reference resources in another stack using the normal attribute syntax. You need explicit mechanisms to share data between stacks.

There are two main approaches:
1. **In-application references**: Pass data between stacks through constructor parameters within your CDKTF application
2. **Remote state references**: Use Terraform remote state data sources to read outputs from other stacks

## In-Application Stack References

The simplest approach is passing values through TypeScript constructor parameters:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Instance } from "@cdktf/provider-aws/lib/instance";

// Network stack produces VPC and subnet IDs
class NetworkStack extends TerraformStack {
  public readonly vpcId: string;
  public readonly publicSubnetId: string;
  public readonly privateSubnetId: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
    });

    const publicSubnet = new Subnet(this, "public", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      mapPublicIpOnLaunch: true,
    });

    const privateSubnet = new Subnet(this, "private", {
      vpcId: vpc.id,
      cidrBlock: "10.0.2.0/24",
    });

    // Expose values as public properties
    this.vpcId = vpc.id;
    this.publicSubnetId = publicSubnet.id;
    this.privateSubnetId = privateSubnet.id;

    // Also expose as Terraform outputs for remote state access
    new TerraformOutput(this, "vpc-id", { value: vpc.id });
    new TerraformOutput(this, "public-subnet-id", { value: publicSubnet.id });
    new TerraformOutput(this, "private-subnet-id", { value: privateSubnet.id });
  }
}

// Compute stack consumes network values
class ComputeStack extends TerraformStack {
  public readonly instanceId: string;

  constructor(
    scope: Construct,
    id: string,
    props: { vpcId: string; subnetId: string }
  ) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const instance = new Instance(this, "web", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      subnetId: props.subnetId,
    });

    this.instanceId = instance.id;

    new TerraformOutput(this, "instance-id", { value: instance.id });
  }
}

// Wire them together in the application
const app = new App();

const network = new NetworkStack(app, "network");
const compute = new ComputeStack(app, "compute", {
  vpcId: network.vpcId,
  subnetId: network.publicSubnetId,
});

app.synth();
```

CDKTF automatically detects these cross-stack references and generates the appropriate Terraform remote state data sources in the consuming stack.

## Remote State Data Sources

When stacks are deployed independently or managed by different teams, use remote state data sources explicitly:

```typescript
import { DataTerraformRemoteStateS3 } from "cdktf";

class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Read outputs from the network stack's state
    const networkState = new DataTerraformRemoteStateS3(this, "network", {
      bucket: "my-terraform-state",
      key: "network/terraform.tfstate",
      region: "us-east-1",
    });

    // Access specific output values
    const vpcId = networkState.getString("vpc-id");
    const subnetId = networkState.getString("public-subnet-id");

    // Use the values in resource definitions
    new Instance(this, "app-server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      subnetId: subnetId,
    });
  }
}
```

## Deployment Ordering

When stacks depend on each other, you need to deploy them in order:

```bash
# Deploy the network stack first
cdktf deploy network

# Then deploy the compute stack
cdktf deploy compute

# Or deploy in the correct order using dependency detection
cdktf deploy '*'
# CDKTF will detect the dependency and deploy network first
```

When you use in-application references (constructor parameters), CDKTF automatically determines the deployment order. When you use remote state data sources directly, you need to manage the order yourself.

## Handling Circular Dependencies

Circular dependencies between stacks are not allowed. If stack A depends on stack B, stack B cannot depend on stack A. If you find yourself in this situation, you need to reorganize:

```typescript
// BAD: Circular dependency
class StackA extends TerraformStack {
  constructor(scope: Construct, id: string, bValue: string) {
    super(scope, id);
    // Uses value from StackB
  }
}

class StackB extends TerraformStack {
  constructor(scope: Construct, id: string, aValue: string) {
    super(scope, id);
    // Uses value from StackA - CIRCULAR!
  }
}

// GOOD: Extract shared resources into a common stack
class SharedStack extends TerraformStack {
  public readonly sharedVpcId: string;

  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Resources that both stacks need
  }
}

class StackA extends TerraformStack {
  constructor(scope: Construct, id: string, vpcId: string) {
    super(scope, id);
    // Uses shared VPC
  }
}

class StackB extends TerraformStack {
  constructor(scope: Construct, id: string, vpcId: string) {
    super(scope, id);
    // Uses shared VPC
  }
}

// Wire it up
const shared = new SharedStack(app, "shared");
new StackA(app, "stack-a", shared.sharedVpcId);
new StackB(app, "stack-b", shared.sharedVpcId);
```

## Dependency Graph Patterns

### Linear Chain

```typescript
// Stack A -> Stack B -> Stack C
const foundation = new FoundationStack(app, "foundation");
const platform = new PlatformStack(app, "platform", {
  vpcId: foundation.vpcId,
});
const application = new ApplicationStack(app, "application", {
  clusterId: platform.clusterId,
});
```

### Fan-Out Pattern

```typescript
// Stack A -> Stack B, Stack C, Stack D (all depend on A)
const network = new NetworkStack(app, "network");

new ServiceAStack(app, "service-a", { vpcId: network.vpcId });
new ServiceBStack(app, "service-b", { vpcId: network.vpcId });
new ServiceCStack(app, "service-c", { vpcId: network.vpcId });
```

### Diamond Pattern

```typescript
// A -> B and C, then B and C -> D
const network = new NetworkStack(app, "network");

const database = new DatabaseStack(app, "database", {
  vpcId: network.vpcId,
  subnetIds: network.privateSubnetIds,
});

const cache = new CacheStack(app, "cache", {
  vpcId: network.vpcId,
  subnetIds: network.privateSubnetIds,
});

const application = new ApplicationStack(app, "application", {
  vpcId: network.vpcId,
  dbEndpoint: database.endpoint,
  cacheEndpoint: cache.endpoint,
});
```

## Using SSM Parameter Store for Loose Coupling

For teams that want loose coupling between stacks, you can use AWS SSM Parameter Store:

```typescript
import { SsmParameter } from "@cdktf/provider-aws/lib/ssm-parameter";
import { DataAwsSsmParameter } from "@cdktf/provider-aws/lib/data-aws-ssm-parameter";

// In the producing stack
class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
    });

    // Store the VPC ID in SSM Parameter Store
    new SsmParameter(this, "vpc-id-param", {
      name: "/infrastructure/vpc-id",
      type: "String",
      value: vpc.id,
    });
  }
}

// In the consuming stack
class ApplicationStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Read the VPC ID from SSM Parameter Store
    const vpcIdParam = new DataAwsSsmParameter(this, "vpc-id", {
      name: "/infrastructure/vpc-id",
    });

    new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      // Use the SSM parameter value
      tags: {
        VpcId: vpcIdParam.value,
      },
    });
  }
}
```

This approach decouples the stacks completely. They can be in different CDKTF applications, deployed by different teams, at different times.

## Best Practices

1. **Minimize cross-stack references**. The fewer dependencies between stacks, the more independently they can be managed.

2. **Always expose outputs**. Even if you use constructor parameters, define `TerraformOutput` for key values. They serve as documentation and enable remote state access.

3. **Use the fan-out pattern when possible**. Having one foundation stack that many service stacks depend on is simpler than chains of dependencies.

4. **Document the dependency graph**. Make it clear which stacks depend on which and why.

5. **Deploy dependencies first in CI/CD**. Structure your pipeline to deploy stacks in dependency order.

6. **Use SSM Parameter Store or similar** for cross-team dependencies where stacks are managed independently.

Stack dependencies are one of the most important architectural decisions in a CDKTF project. Get them right and your infrastructure is modular and manageable. Get them wrong and you end up with a tangled mess that is hard to deploy. For more on multi-stack patterns, see our guide on [CDKTF multi-stack deployments](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-for-multi-stack-deployments/view).
