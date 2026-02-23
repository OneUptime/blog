# How to Convert Terraform HCL to CDKTF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, HCL, Migration, Infrastructure as Code

Description: A step-by-step guide to converting existing Terraform HCL configurations to CDKTF using the built-in convert command and manual migration techniques.

---

If you have existing Terraform configurations written in HCL and want to move to CDKTF, you do not have to start from scratch. CDKTF includes a built-in `convert` command that translates HCL to your preferred programming language. The conversion is not always perfect, but it gives you a solid starting point. This guide covers the automated conversion process, what it handles well, where it falls short, and how to clean up the output.

## The CDKTF Convert Command

The `cdktf convert` command reads HCL and outputs equivalent CDKTF code:

```bash
# Convert a single Terraform file to TypeScript
cat main.tf | cdktf convert --language typescript

# Convert from a file directly
cdktf convert --language typescript < main.tf

# Convert to Python
cat main.tf | cdktf convert --language python

# Convert to other supported languages
cat main.tf | cdktf convert --language java
cat main.tf | cdktf convert --language csharp
cat main.tf | cdktf convert --language go
```

## A Simple Conversion Example

Let us start with a basic HCL configuration:

```hcl
# main.tf - Original HCL
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet"
  }
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

Running `cdktf convert` produces something like this:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";

class MyConvertedStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", {
      region: "us-east-1",
    });

    const mainVpc = new Vpc(this, "main", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Name: "main-vpc",
      },
    });

    new Subnet(this, "public", {
      vpcId: mainVpc.id,
      cidrBlock: "10.0.1.0/24",
      mapPublicIpOnLaunch: true,
      tags: {
        Name: "public-subnet",
      },
    });

    new TerraformOutput(this, "vpc_id", {
      value: mainVpc.id,
    });
  }
}

const app = new App();
new MyConvertedStack(app, "my-converted-stack");
app.synth();
```

The converter handles the resource references automatically. `aws_vpc.main.id` in HCL becomes `mainVpc.id` in TypeScript.

## What the Converter Handles Well

The converter does a good job with:

- **Basic resources and their properties**. Simple resource definitions translate cleanly.
- **Resource references**. Cross-resource references like `aws_vpc.main.id` are resolved to variable references.
- **Outputs**. `output` blocks become `TerraformOutput` instances.
- **Variables**. `variable` blocks become `TerraformVariable` instances.
- **Data sources**. `data` blocks become the appropriate data source classes.
- **Providers**. Provider blocks are converted with their configuration.

## What Needs Manual Attention

Several HCL features require manual cleanup after conversion:

### Dynamic Blocks

HCL dynamic blocks do not have a direct equivalent. The converter may produce incomplete code:

```hcl
# HCL with dynamic block
resource "aws_security_group" "example" {
  name = "example"

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

In CDKTF, you would use a regular loop:

```typescript
// Manual conversion using TypeScript loops
const ingressRules = [
  { fromPort: 80, toPort: 80, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
  { fromPort: 443, toPort: 443, protocol: "tcp", cidrBlocks: ["0.0.0.0/0"] },
];

new SecurityGroup(this, "example", {
  name: "example",
  ingress: ingressRules.map((rule) => ({
    fromPort: rule.fromPort,
    toPort: rule.toPort,
    protocol: rule.protocol,
    cidrBlocks: rule.cidrBlocks,
  })),
});
```

### Count and For Each

HCL `count` and `for_each` meta-arguments need to be replaced with loops:

```hcl
# HCL with count
resource "aws_subnet" "private" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.${count.index + 10}.0/24"
}
```

```typescript
// CDKTF equivalent using a loop
const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];

azs.forEach((az, index) => {
  new Subnet(this, `private-${index}`, {
    vpcId: vpc.id,
    cidrBlock: `10.0.${index + 10}.0/24`,
    availabilityZone: az,
  });
});
```

### Terraform Functions

HCL functions like `file()`, `templatefile()`, `jsonencode()`, and `lookup()` are replaced by native language equivalents:

```hcl
# HCL
resource "aws_iam_role" "example" {
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}
```

```typescript
// CDKTF - use native JSON.stringify
new IamRole(this, "example", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
      },
    ],
  }),
});
```

### Modules

Terraform modules need special handling. You can either generate bindings for them or rewrite them as constructs:

```hcl
# HCL module usage
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"
}
```

In CDKTF, add the module to `cdktf.json` and generate bindings:

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

## Step-by-Step Migration Process

Here is a practical workflow for migrating an existing Terraform project:

### Step 1: Create the CDKTF Project

```bash
mkdir cdktf-migration && cd cdktf-migration
cdktf init --template=typescript --local
```

### Step 2: Run the Converter

```bash
# Convert each .tf file
cat ../terraform-project/main.tf | cdktf convert --language typescript > converted-main.ts
cat ../terraform-project/variables.tf | cdktf convert --language typescript > converted-variables.ts
```

### Step 3: Merge and Clean Up

Combine the converted output into your `main.ts`, fix any issues, and make sure imports are correct.

### Step 4: Import Existing State

If you want to manage the existing resources with CDKTF (instead of recreating them), import the state:

```bash
# Synthesize first
cdktf synth

# Navigate to the stack directory
cd cdktf.out/stacks/my-stack

# Import existing resources
terraform import aws_vpc.main_vpc_12345 vpc-abcdef123456
terraform import aws_subnet.public_subnet_67890 subnet-fedcba654321
```

### Step 5: Verify with Diff

```bash
# Go back to project root
cd ../../..

# Run diff to see if there are any differences
cdktf diff
```

If the diff shows no changes, your migration is complete. If there are differences, adjust your CDKTF code to match the existing infrastructure.

## Handling Large Projects

For projects with many files, convert them systematically:

```bash
# Convert all .tf files in a directory
for file in ../terraform-project/*.tf; do
  echo "// Converted from: $file"
  cat "$file" | cdktf convert --language typescript
  echo ""
done > all-converted.ts
```

Then manually organize the output into proper stack and construct files.

## Best Practices

1. **Convert incrementally**. Do not try to convert everything at once. Start with one module or component.

2. **Test after conversion**. Write tests for the converted code and verify with `cdktf diff` that no changes are detected.

3. **Refactor after converting**. The converter produces functional but not elegant code. Take time to refactor into proper constructs.

4. **Import state carefully**. State import is a one-way operation. Back up your state file before starting.

5. **Keep HCL and CDKTF in sync during migration**. Do not modify both versions simultaneously.

Converting from HCL to CDKTF is a worthwhile investment, especially for large projects that benefit from the programming capabilities of a real language. The converter gets you most of the way there, and manual cleanup handles the rest. For more on CDKTF patterns, see our guide on [using CDKTF for complex programming logic](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-for-complex-programming-logic/view).
