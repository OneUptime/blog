# How to Use CDKTF Tokens for Lazy Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Tokens, Infrastructure as Code, TypeScript

Description: Learn how CDKTF tokens work as lazy value placeholders that resolve at synthesis time, enabling cross-resource references and dynamic configurations.

---

When you write `vpc.id` in CDKTF and pass it to a subnet resource, you might expect it to contain an actual VPC ID string. It does not. At the time your TypeScript code runs, no VPC exists yet. Instead, CDKTF uses a system called tokens to represent values that will only be known later - either at synthesis time or at Terraform apply time. Understanding how tokens work is essential for writing correct CDKTF code, especially when you need to manipulate or conditionally use these values.

## What Are Tokens?

Tokens are placeholder values that CDKTF uses to represent references between resources. When you access a property like `instance.publicIp`, CDKTF returns a special string that looks something like `${aws_instance.my_instance.public_ip}`. This string is not a real IP address - it is a Terraform expression that gets resolved when Terraform runs.

There are three types of tokens:
- **String tokens**: Represent string values (most common)
- **Number tokens**: Represent numeric values
- **List tokens**: Represent list values

## How Tokens Work in Practice

Here is a simple example:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput, Token } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Instance } from "@cdktf/provider-aws/lib/instance";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    const server = new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
    });

    // server.publicIp is NOT a real IP address at this point
    // It is a token that represents a Terraform reference
    console.log(server.publicIp);
    // Output: ${aws_instance.server.public_ip}

    // You can check if a value is a token
    console.log(Token.isUnresolved(server.publicIp));
    // Output: true

    // Tokens work naturally in outputs and resource references
    new TerraformOutput(this, "ip", {
      value: server.publicIp,
    });
  }
}
```

## Why Tokens Matter

Tokens matter because they affect what you can and cannot do with resource attributes. Since token values are not real values at synthesis time, certain operations will not work as expected.

### Things You Cannot Do with Tokens

```typescript
const server = new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// DO NOT do this - the comparison will always be false
// because server.publicIp is a token string, not a real IP
if (server.publicIp === "1.2.3.4") {
  // This code will never execute
}

// DO NOT do this - string methods on tokens produce garbage
const parts = server.publicIp.split(".");
// parts will be something like ["${aws_instance", "server", "public_ip}"]

// DO NOT try to parse tokens as numbers
const port = parseInt(server.somePort, 10);
// This will return NaN
```

### Things You Can Do with Tokens

```typescript
// Pass tokens to other resources - this is the primary use case
const bucket = new S3Bucket(this, "bucket", {
  bucket: "my-bucket",
});

new S3BucketPolicy(this, "policy", {
  bucket: bucket.id, // Token reference - works perfectly
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: "*",
        Action: "s3:GetObject",
        Resource: `${bucket.arn}/*`, // String interpolation with tokens works
      },
    ],
  }),
});

// Use tokens in outputs
new TerraformOutput(this, "bucket-arn", {
  value: bucket.arn,
});

// Use tokens as values for other resource properties
new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
  userData: `#!/bin/bash
echo "Bucket: ${bucket.bucket}" > /etc/config
`,
});
```

## Creating Custom Tokens

You can create your own tokens for lazy evaluation:

```typescript
import { Token, Lazy } from "cdktf";

class MyStack extends TerraformStack {
  private instanceType: string = "t3.micro";

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Create a lazy string that resolves at synthesis time
    const lazyInstanceType = Token.asString(
      Lazy.stringValue({
        produce: () => this.instanceType,
      })
    );

    new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: lazyInstanceType,
    });

    // The value can be changed before synthesis
    this.instanceType = "t3.medium";
    // When synth runs, the instance type will be "t3.medium"
  }
}
```

## Lazy Values for Dynamic Configuration

Lazy values are particularly useful when the value depends on something that is not known when the construct is created:

```typescript
import { Lazy, Token } from "cdktf";

class ConfigurableStack extends TerraformStack {
  private securityGroupIds: string[] = [];

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Create a lazy list that resolves at synthesis time
    const lazySgIds = Token.asList(
      Lazy.listValue({
        produce: () => this.securityGroupIds,
      })
    );

    // Create the instance with the lazy security group list
    new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      vpcSecurityGroupIds: lazySgIds,
    });

    // Add security groups later in the constructor
    const sg1 = new SecurityGroup(this, "sg1", {
      name: "sg1",
    });
    this.securityGroupIds.push(sg1.id);

    const sg2 = new SecurityGroup(this, "sg2", {
      name: "sg2",
    });
    this.securityGroupIds.push(sg2.id);
    // Both SGs will be included when synth runs
  }
}
```

## Number Tokens

Number tokens work similarly to string tokens but represent numeric values:

```typescript
import { Token, Lazy } from "cdktf";

// Create a lazy number
const lazyPort = Token.asNumber(
  Lazy.numberValue({
    produce: () => 8080,
  })
);

// Number tokens look like very large numbers when printed
console.log(lazyPort);
// Output: something like 1.8446744073709552e+19

// But they resolve correctly at synthesis time
new SecurityGroup(this, "sg", {
  ingress: [
    {
      fromPort: lazyPort,
      toPort: lazyPort,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});
```

## Checking for Token Values

Before performing operations on a value that might be a token, check first:

```typescript
import { Token } from "cdktf";

function processValue(value: string): string {
  // Check if the value is a token before manipulating it
  if (Token.isUnresolved(value)) {
    // Cannot manipulate tokens - return as-is or use Terraform functions
    return value;
  }

  // Safe to manipulate non-token values
  return value.toUpperCase();
}
```

## Using Terraform Functions with Tokens

When you need to transform token values, use Terraform functions through the `Fn` class:

```typescript
import { Fn } from "cdktf";

const vpc = new Vpc(this, "vpc", {
  cidrBlock: "10.0.0.0/16",
});

// Use Fn.cidrsubnet to calculate subnet CIDRs from the VPC CIDR
const subnetCidr = Fn.cidrsubnet(vpc.cidrBlock, 8, 1);
// This generates: cidrsubnet(aws_vpc.vpc.cidr_block, 8, 1)

new Subnet(this, "subnet", {
  vpcId: vpc.id,
  cidrBlock: subnetCidr,
});

// Other useful Fn operations
const joinedString = Fn.join("-", ["prefix", vpc.id, "suffix"]);
const upperString = Fn.upper("hello");
const lookupValue = Fn.lookup({ key: "value" }, "key", "default");
```

## Common Token Pitfalls

1. **String comparison**: Never compare a token to a literal value. The comparison will always be false.

2. **Conditional creation**: Do not use token values in `if` statements for conditional resource creation. Use Terraform conditionals instead, or design your code so the condition is known at synthesis time.

3. **Array operations**: Do not use `.length`, `.map()`, or `.filter()` on token lists. These operations work on the token representation, not the actual values.

4. **JSON parsing**: Do not try to `JSON.parse()` a token that represents a JSON string. Pass it directly to the resource property.

## Best Practices

1. **Treat resource attributes as opaque**. Do not try to parse or manipulate them. Pass them directly to other resources.

2. **Use `Token.isUnresolved()`** when you need to check if a value is a token before operating on it.

3. **Use `Fn` class methods** when you need to transform token values. These generate Terraform function calls that execute at apply time.

4. **Use `Lazy` values** when you need to defer a decision until synthesis time.

5. **Keep token-aware code separate** from business logic to maintain testability.

Tokens are the glue that holds CDKTF configurations together. Once you understand that resource attributes are lazy references rather than concrete values, the rest of CDKTF makes much more sense. For more on CDKTF internals, see our guide on [CDKTF escape hatches](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cdktf-escape-hatches/view).
