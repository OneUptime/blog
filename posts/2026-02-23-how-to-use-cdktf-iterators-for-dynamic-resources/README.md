# How to Use CDKTF Iterators for Dynamic Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Iterator, Dynamic Resources, Infrastructure as Code

Description: Learn how to use CDKTF iterators to create dynamic resources from lists and maps, equivalent to Terraform's for_each and count meta-arguments.

---

In Terraform HCL, you use `count` and `for_each` to create multiple resources from a single block. In CDKTF, you typically use native language loops for this. But there are situations where you need Terraform-level iteration - specifically when the number of resources depends on a value that is only known at apply time (like the result of a data source). CDKTF provides the `TerraformIterator` class for exactly this purpose. This guide covers when and how to use iterators versus native loops.

## Native Loops vs CDKTF Iterators

There are two ways to create multiple resources in CDKTF:

### Native Loops (Preferred When Possible)

Use TypeScript loops when the data is known at synthesis time:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
    });

    // The AZ list is known at synthesis time, so use a native loop
    const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];

    azs.forEach((az, index) => {
      new Subnet(this, `subnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index}.0/24`,
        availabilityZone: az,
        tags: { Name: `subnet-${az}` },
      });
    });
  }
}
```

This creates three separate subnet resources in the Terraform configuration. It is clean, type-safe, and easy to understand.

### CDKTF Iterators (For Dynamic Data)

Use iterators when the data comes from a Terraform data source or other dynamic value:

```typescript
import { TerraformIterator } from "cdktf";
import { DataAwsAvailabilityZones } from "@cdktf/provider-aws/lib/data-aws-availability-zones";

class DynamicStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
    });

    // The list of AZs comes from a data source - not known until apply time
    const azs = new DataAwsAvailabilityZones(this, "azs", {
      state: "available",
    });

    // Use TerraformIterator for dynamic data
    const iterator = TerraformIterator.fromList(azs.names);

    new Subnet(this, "dynamic-subnet", {
      forEach: iterator,
      vpcId: vpc.id,
      cidrBlock: iterator.value,
      availabilityZone: iterator.value,
      tags: {
        Name: `subnet-${iterator.value}`,
      },
    });
  }
}
```

## TerraformIterator.fromList

`fromList` creates an iterator from a list value:

```typescript
import { TerraformIterator, TerraformVariable } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Variable value is not known until apply time
    const subnetCidrs = new TerraformVariable(this, "subnet-cidrs", {
      type: "list(string)",
      default: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"],
    });

    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });

    // Create an iterator from the variable
    const iterator = TerraformIterator.fromList(subnetCidrs.listValue);

    // Create a subnet for each CIDR in the list
    new Subnet(this, "subnet", {
      forEach: iterator,
      vpcId: vpc.id,
      cidrBlock: iterator.value,
      tags: {
        Name: `subnet-${iterator.value}`,
      },
    });
  }
}
```

## TerraformIterator.fromMap

`fromMap` creates an iterator from a map, giving you access to both keys and values:

```typescript
import { TerraformIterator } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Define a map of subnet configurations
    const subnetConfigs = {
      "web-a": "10.0.1.0/24",
      "web-b": "10.0.2.0/24",
      "app-a": "10.0.11.0/24",
      "app-b": "10.0.12.0/24",
    };

    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });

    // Create an iterator from the map
    const iterator = TerraformIterator.fromMap(subnetConfigs);

    new Subnet(this, "subnet", {
      forEach: iterator,
      vpcId: vpc.id,
      // iterator.key is the map key (subnet name)
      // iterator.value is the map value (CIDR)
      cidrBlock: iterator.value,
      tags: {
        Name: iterator.key,
      },
    });
  }
}
```

## Complex Iterators with Objects

For more complex data, use `fromComplexList`:

```typescript
import { TerraformIterator, TerraformVariable, TerraformLocal } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Define a local with complex objects
    const subnetsLocal = new TerraformLocal(this, "subnets", [
      { name: "web", cidr: "10.0.1.0/24", public: true },
      { name: "app", cidr: "10.0.2.0/24", public: false },
      { name: "db", cidr: "10.0.3.0/24", public: false },
    ]);

    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });

    // Create iterator from complex list
    const iterator = TerraformIterator.fromComplexList(
      subnetsLocal.expression,
      "name"  // Use the name field as the key
    );

    new Subnet(this, "subnet", {
      forEach: iterator,
      vpcId: vpc.id,
      cidrBlock: iterator.getString("cidr"),
      mapPublicIpOnLaunch: iterator.getBoolean("public"),
      tags: {
        Name: iterator.getString("name"),
      },
    });
  }
}
```

## Iterators with Dynamic Blocks

You can use iterators for dynamic blocks within a single resource:

```typescript
import { TerraformIterator } from "cdktf";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Define ingress rules as data
    const ingressRules = [
      { port: 80, description: "HTTP" },
      { port: 443, description: "HTTPS" },
      { port: 8080, description: "Application" },
    ];

    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });

    // For static data, native loops work best
    new SecurityGroup(this, "sg", {
      vpcId: vpc.id,
      ingress: ingressRules.map((rule) => ({
        fromPort: rule.port,
        toPort: rule.port,
        protocol: "tcp",
        cidrBlocks: ["0.0.0.0/0"],
        description: rule.description,
      })),
    });
  }
}
```

## Chaining Iterators

You can chain operations on iterators:

```typescript
import { TerraformIterator, Fn } from "cdktf";

const azs = new DataAwsAvailabilityZones(this, "azs", {
  state: "available",
});

// Create an iterator and chain operations
const iterator = TerraformIterator.fromList(azs.names);

// Use Fn functions to transform values
new Subnet(this, "subnet", {
  forEach: iterator,
  vpcId: vpc.id,
  availabilityZone: iterator.value,
  // Use Fn.cidrsubnet to calculate CIDRs dynamically
  cidrBlock: Fn.cidrsubnet(vpc.cidrBlock, 8, Fn.index(azs.names, iterator.value)),
  tags: {
    Name: Fn.join("-", ["subnet", iterator.value]),
  },
});
```

## When to Use Which Approach

### Use Native Loops When:

- The data is hardcoded or computed at synthesis time
- You want each resource to have a unique, predictable name
- You need different configuration per resource
- You want simple, readable code

```typescript
// Good: data is known at synthesis time
const environments = ["dev", "staging", "prod"];
environments.forEach((env) => {
  new S3Bucket(this, `bucket-${env}`, {
    bucket: `my-app-${env}-data`,
  });
});
```

### Use TerraformIterator When:

- The data comes from a Terraform data source
- The data comes from a Terraform variable
- The count or list of items is not known until apply time
- You need Terraform's `for_each` behavior (keyed state tracking)

```typescript
// Good: data is not known until apply time
const azs = new DataAwsAvailabilityZones(this, "azs", {
  state: "available",
});
const iterator = TerraformIterator.fromList(azs.names);
```

## Practical Example: Multi-AZ Database Setup

```typescript
class DatabaseStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Get available AZs dynamically
    const azs = new DataAwsAvailabilityZones(this, "azs", {
      state: "available",
    });

    const vpc = new Vpc(this, "vpc", { cidrBlock: "10.0.0.0/16" });

    // Create a subnet in each AZ for the database
    const subnetIterator = TerraformIterator.fromList(azs.names);

    const dbSubnets = new Subnet(this, "db-subnet", {
      forEach: subnetIterator,
      vpcId: vpc.id,
      availabilityZone: subnetIterator.value,
      cidrBlock: Fn.cidrsubnet(vpc.cidrBlock, 8, Fn.index(azs.names, subnetIterator.value)),
      tags: {
        Name: Fn.join("-", ["db-subnet", subnetIterator.value]),
        Tier: "database",
      },
    });
  }
}
```

## Best Practices

1. **Prefer native loops** for static data. They produce cleaner, more predictable configurations.

2. **Use iterators for dynamic data**. When the iteration data comes from Terraform data sources or variables, iterators are the right choice.

3. **Use meaningful keys**. When using `fromMap`, choose keys that describe the resource. Terraform tracks state by these keys.

4. **Avoid mixing approaches**. Within a single resource type, pick one approach and stick with it.

5. **Test both paths**. Iterators generate different Terraform code than native loops. Test both to make sure they produce the expected results.

Iterators in CDKTF bridge the gap between Terraform's dynamic features and programming language loops. Use native loops when you can, and iterators when you must. For more on CDKTF programming patterns, see our guide on [complex programming logic in CDKTF](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-for-complex-programming-logic/view).
