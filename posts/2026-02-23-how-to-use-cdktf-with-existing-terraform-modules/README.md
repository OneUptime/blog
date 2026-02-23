# How to Use CDKTF with Existing Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Modules, Infrastructure as Code, Reusability

Description: Learn how to use existing Terraform modules from the registry and local sources in your CDKTF projects with full type safety and autocompletion.

---

The Terraform module ecosystem is massive. There are thousands of well-tested, community-maintained modules for everything from VPCs to Kubernetes clusters. When you adopt CDKTF, you do not have to leave all those modules behind. CDKTF can generate typed bindings for any Terraform module, letting you use them with full autocompletion and type safety. This guide covers how to integrate modules from the Terraform Registry, Git repositories, and local paths.

## Why Use Existing Modules?

Building everything from scratch is tempting when you have the full power of a programming language. But existing modules offer real advantages:

- **Battle-tested configurations**: Popular modules have been used by thousands of organizations
- **Best practices built in**: Modules like `terraform-aws-modules/vpc/aws` encode years of networking best practices
- **Faster development**: Why spend days building a VPC module when one already exists?
- **Community maintenance**: Bug fixes and updates come from the community

The key is knowing when to use an existing module and when to build a custom construct.

## Adding Modules to Your Project

Modules are declared in `cdktf.json` and bindings are generated with `cdktf get`:

```json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "terraformProviders": [
    "hashicorp/aws@~> 5.0"
  ],
  "terraformModules": [
    {
      "name": "vpc",
      "source": "terraform-aws-modules/vpc/aws",
      "version": "~> 5.0"
    },
    {
      "name": "security_group",
      "source": "terraform-aws-modules/security-group/aws",
      "version": "~> 5.0"
    },
    {
      "name": "eks",
      "source": "terraform-aws-modules/eks/aws",
      "version": "~> 19.0"
    }
  ]
}
```

Then generate the bindings:

```bash
# Generate typed bindings for all modules
cdktf get

# Bindings are created in .gen/modules/
ls .gen/modules/
# vpc/
# security_group/
# eks/
```

## Using Registry Modules

Here is how to use the popular VPC module from the Terraform Registry:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "./.gen/modules/vpc";

class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Use the VPC module - all inputs are typed
    const vpc = new Vpc(this, "vpc", {
      name: "production-vpc",
      cidr: "10.0.0.0/16",
      azs: ["us-east-1a", "us-east-1b", "us-east-1c"],
      privateSubnets: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"],
      publicSubnets: ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"],
      enableNatGateway: true,
      singleNatGateway: true,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Environment: "production",
        ManagedBy: "cdktf",
      },
    });

    // Access module outputs
    new TerraformOutput(this, "vpc-id", {
      value: vpc.vpcIdOutput,
    });
    new TerraformOutput(this, "private-subnets", {
      value: vpc.privateSubnetsOutput,
    });
  }
}
```

## Using the EKS Module

```typescript
import { Eks } from "./.gen/modules/eks";

class KubernetesStack extends TerraformStack {
  constructor(scope: Construct, id: string, vpcId: string, subnetIds: string[]) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const cluster = new Eks(this, "eks", {
      clusterName: "production-cluster",
      clusterVersion: "1.28",
      vpcId: vpcId,
      subnetIds: subnetIds,
      clusterEndpointPublicAccess: true,
      eksManagedNodeGroups: {
        default: {
          minSize: 2,
          maxSize: 5,
          desiredSize: 3,
          instanceTypes: ["t3.medium"],
        },
      },
      tags: {
        Environment: "production",
      },
    });

    new TerraformOutput(this, "cluster-endpoint", {
      value: cluster.clusterEndpointOutput,
    });
  }
}
```

## Using Modules from Git Repositories

You can use modules from Git repos, including private ones:

```json
{
  "terraformModules": [
    {
      "name": "custom_vpc",
      "source": "git::https://github.com/your-org/terraform-modules.git//modules/vpc?ref=v1.2.0"
    },
    {
      "name": "internal_module",
      "source": "git::ssh://git@github.com/your-org/private-modules.git//modules/database?ref=main"
    }
  ]
}
```

```typescript
import { CustomVpc } from "./.gen/modules/custom_vpc";

const vpc = new CustomVpc(this, "vpc", {
  environment: "production",
  cidrBlock: "10.0.0.0/16",
});
```

## Using Local Modules

If you have Terraform modules locally (perhaps from a monorepo):

```json
{
  "terraformModules": [
    {
      "name": "local_database",
      "source": "../terraform-modules/database"
    }
  ]
}
```

```typescript
import { LocalDatabase } from "./.gen/modules/local_database";

new LocalDatabase(this, "db", {
  engine: "postgres",
  engineVersion: "15",
  instanceClass: "db.t3.medium",
});
```

## Combining Modules with Custom Constructs

You can wrap modules in custom constructs to add your own defaults and validation:

```typescript
import { Construct } from "constructs";
import { Vpc } from "./.gen/modules/vpc";
import { SecurityGroup } from "./.gen/modules/security_group";

interface ProductionVpcConfig {
  name: string;
  cidr: string;
  environment: string;
}

// Wrap the VPC module in a custom construct
class ProductionVpc extends Construct {
  public readonly vpcId: string;
  public readonly privateSubnetIds: string;
  public readonly publicSubnetIds: string;

  constructor(scope: Construct, id: string, config: ProductionVpcConfig) {
    super(scope, id);

    const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];

    // Use the community VPC module with production defaults
    const vpc = new Vpc(this, "vpc", {
      name: config.name,
      cidr: config.cidr,
      azs: azs,
      // Calculate subnet CIDRs automatically
      privateSubnets: azs.map((_, i) =>
        `${config.cidr.split(".").slice(0, 2).join(".")}.${i + 1}.0/24`
      ),
      publicSubnets: azs.map((_, i) =>
        `${config.cidr.split(".").slice(0, 2).join(".")}.${i + 101}.0/24`
      ),
      // Production defaults
      enableNatGateway: true,
      singleNatGateway: config.environment !== "production",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      enableFlowLog: true,
      tags: {
        Environment: config.environment,
        ManagedBy: "cdktf",
      },
    });

    this.vpcId = vpc.vpcIdOutput;
    this.privateSubnetIds = vpc.privateSubnetsOutput;
    this.publicSubnetIds = vpc.publicSubnetsOutput;
  }
}

// Usage is clean and simple
const network = new ProductionVpc(this, "network", {
  name: "production-vpc",
  cidr: "10.0.0.0/16",
  environment: "production",
});
```

## Passing Data Between Modules

Modules often need to reference each other's outputs:

```typescript
import { Vpc } from "./.gen/modules/vpc";
import { SecurityGroup } from "./.gen/modules/security_group";
import { Eks } from "./.gen/modules/eks";

class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Create VPC
    const vpc = new Vpc(this, "vpc", {
      name: "production",
      cidr: "10.0.0.0/16",
      azs: ["us-east-1a", "us-east-1b"],
      privateSubnets: ["10.0.1.0/24", "10.0.2.0/24"],
      publicSubnets: ["10.0.101.0/24", "10.0.102.0/24"],
      enableNatGateway: true,
    });

    // Create security group using VPC output
    const sgModule = new SecurityGroup(this, "web-sg", {
      name: "web-server",
      description: "Security group for web servers",
      vpcId: vpc.vpcIdOutput,
      ingressWithCidrBlocks: [
        {
          from_port: "443",
          to_port: "443",
          protocol: "tcp",
          cidr_blocks: "0.0.0.0/0",
          description: "HTTPS",
        },
      ],
    });

    // Create EKS cluster using VPC and subnet outputs
    new Eks(this, "eks", {
      clusterName: "production",
      vpcId: vpc.vpcIdOutput,
      subnetIds: [vpc.privateSubnetsOutput],
    });
  }
}
```

## Module Versioning Strategy

Pin module versions to avoid unexpected changes:

```json
{
  "terraformModules": [
    {
      "name": "vpc",
      "source": "terraform-aws-modules/vpc/aws",
      "version": "5.4.0"
    }
  ]
}
```

Use exact versions in production. Use version ranges only in development:

```json
{
  "terraformModules": [
    {
      "name": "vpc",
      "source": "terraform-aws-modules/vpc/aws",
      "version": "~> 5.0"
    }
  ]
}
```

## Troubleshooting Module Issues

### Module Inputs Not Recognized

If a module input is not in the generated types, the module version might not support it:

```bash
# Regenerate bindings with the latest module version
cdktf get

# Check what inputs are available
# Look in .gen/modules/vpc/index.ts for the interface
```

### Module Outputs Not Available

Module outputs are available as `*Output` properties:

```typescript
// Module outputs follow this pattern
vpc.vpcIdOutput        // The vpc_id output
vpc.privateSubnetsOutput  // The private_subnets output
```

### Type Mismatches

Some module inputs expect specific types. Check the generated TypeScript interface:

```bash
# Look at the generated types
cat .gen/modules/vpc/index.ts | grep "interface"
```

## Best Practices

1. **Use well-maintained modules**. Check the module's GitHub stars, last update date, and issue count before adopting it.

2. **Pin versions for production**. Use exact versions to prevent surprise changes.

3. **Wrap modules in constructs**. Add your organization's defaults and naming conventions.

4. **Test module configurations**. Use CDKTF's testing utilities to verify module properties.

5. **Keep module count manageable**. Too many modules slow down generation and increase complexity.

6. **Read the module documentation**. Generated types help, but understanding the module's behavior requires reading the docs.

Using existing Terraform modules in CDKTF gives you the best of both ecosystems: the mature module library of Terraform with the programming power of CDKTF. For more on building your own reusable components, see our guide on [CDKTF constructs](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-constructs-for-infrastructure/view).
