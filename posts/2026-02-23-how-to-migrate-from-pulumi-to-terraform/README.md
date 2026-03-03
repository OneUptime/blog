# How to Migrate from Pulumi to Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Pulumi, Migration, Infrastructure as Code, State Management

Description: Learn how to migrate your infrastructure from Pulumi to Terraform including converting code, transferring state, and handling resource ownership safely.

---

Pulumi and Terraform both manage infrastructure as code but take different approaches. Pulumi uses general-purpose programming languages like Python, TypeScript, and Go, while Terraform uses its purpose-built HCL language. Teams may migrate from Pulumi to Terraform for various reasons including standardization, broader team familiarity with HCL, or consolidation of tooling. This guide covers the complete migration process.

## Why Migrate from Pulumi to Terraform

Common reasons for migration include organizational standardization on Terraform, challenges with Pulumi's language-specific dependencies, preference for HCL's declarative approach, or integration with existing Terraform-based CI/CD pipelines. Terraform's larger community, extensive module registry, and widespread adoption in the industry also drive adoption.

## Understanding the Differences

Before migrating, understand the key differences:

```text
Pulumi                              Terraform
------                              ---------
General-purpose languages           HCL (domain-specific)
Pulumi state (JSON)                 Terraform state (JSON)
pulumi up                           terraform apply
pulumi preview                      terraform plan
pulumi stack export                 terraform state pull
Resource URNs                       Resource addresses
__provider resources                provider blocks
```

Both tools use similar underlying cloud provider APIs, so resource attributes often have a direct mapping.

## Step 1: Inventory Pulumi Resources

Export your Pulumi state to understand what resources exist:

```bash
# Export the Pulumi stack state
pulumi stack export --stack my-stack > pulumi-state.json

# List all resources in the stack
pulumi stack --stack my-stack --show-urns

# Get resource details
pulumi stack export --stack my-stack | \
  jq '.deployment.resources[] | {type: .type, id: .id, urn: .urn}'
```

This gives you a complete list of resources to migrate.

## Step 2: Map Pulumi Resources to Terraform

Pulumi and Terraform resource types have a predictable mapping since they often share the same underlying provider:

```text
Pulumi Resource Type                    Terraform Resource Type
--------------------                    ----------------------
aws:ec2/instance:Instance           ->  aws_instance
aws:s3/bucket:Bucket                ->  aws_s3_bucket
aws:rds/instance:Instance           ->  aws_db_instance
azure:compute/virtualMachine        ->  azurerm_virtual_machine
gcp:compute/instance:Instance       ->  google_compute_instance
```

The pattern is usually straightforward: replace the Pulumi package path with the Terraform provider prefix and convert to snake_case.

## Step 3: Convert Pulumi Code to Terraform HCL

Convert your Pulumi program to Terraform configuration:

Pulumi (TypeScript):

```typescript
import * as aws from "@pulumi/aws";

// VPC
const vpc = new aws.ec2.Vpc("main-vpc", {
    cidrBlock: "10.0.0.0/16",
    enableDnsHostnames: true,
    tags: { Name: "main-vpc" },
});

// Subnet
const subnet = new aws.ec2.Subnet("web-subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    availabilityZone: "us-east-1a",
    tags: { Name: "web-subnet" },
});

// Instance
const instance = new aws.ec2.Instance("web-server", {
    ami: "ami-0abcdef1234567890",
    instanceType: "t3.medium",
    subnetId: subnet.id,
    tags: { Name: "web-server" },
});
```

Terraform equivalent:

```hcl
provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "web" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "web-subnet"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.web.id

  tags = {
    Name = "web-server"
  }
}
```

## Step 4: Handle Pulumi-Specific Features

Pulumi has features that require different approaches in Terraform:

### Component Resources

```typescript
// Pulumi ComponentResource
class WebServer extends pulumi.ComponentResource {
    constructor(name: string, args: WebServerArgs) {
        super("custom:WebServer", name);
        // ... create child resources
    }
}
```

In Terraform, use modules:

```hcl
# modules/web-server/main.tf
resource "aws_instance" "server" {
  ami           = var.ami_id
  instance_type = var.instance_type
  # ...
}

# main.tf
module "web_server" {
  source        = "./modules/web-server"
  ami_id        = "ami-0abcdef1234567890"
  instance_type = "t3.medium"
}
```

### Stack References

```typescript
// Pulumi stack reference
const networkStack = new pulumi.StackReference("org/network/prod");
const vpcId = networkStack.getOutput("vpcId");
```

In Terraform, use remote state data sources:

```hcl
# Terraform remote state reference
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the output
resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.network.outputs.subnet_id
}
```

### Dynamic Resource Creation

```typescript
// Pulumi dynamic creation with loops
for (let i = 0; i < 3; i++) {
    new aws.ec2.Instance(`server-${i}`, { ... });
}
```

In Terraform:

```hcl
resource "aws_instance" "server" {
  count         = 3
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name = "server-${count.index}"
  }
}
```

## Step 5: Extract Resource IDs from Pulumi State

Get the cloud provider resource IDs from Pulumi state for importing:

```bash
# Extract resource IDs from Pulumi state
pulumi stack export --stack my-stack | \
  jq -r '.deployment.resources[] |
    select(.type != "pulumi:pulumi:Stack" and .type != "pulumi:providers:aws") |
    "\(.type)\t\(.id)"'
```

Or use a more detailed extraction:

```python
#!/usr/bin/env python3
"""extract_pulumi_ids.py - Extract resource IDs from Pulumi state"""
import json
import sys

with open("pulumi-state.json") as f:
    state = json.load(f)

for resource in state["deployment"]["resources"]:
    # Skip internal Pulumi resources
    if resource["type"].startswith("pulumi:"):
        continue

    resource_type = resource["type"]
    resource_id = resource.get("id", "N/A")
    resource_urn = resource["urn"]

    # Extract the logical name from URN
    name = resource_urn.split("::")[-1]

    print(f"Type: {resource_type}")
    print(f"Name: {name}")
    print(f"ID: {resource_id}")
    print("---")
```

## Step 6: Import Resources into Terraform

Create import blocks using the extracted IDs:

```hcl
# imports.tf
import {
  to = aws_vpc.main
  id = "vpc-0abc123def456"
}

import {
  to = aws_subnet.web
  id = "subnet-0abc123def456"
}

import {
  to = aws_instance.web
  id = "i-0abc123def456789a"
}
```

Execute the import:

```bash
terraform init
terraform plan
terraform apply
```

## Step 7: Verify and Transition

After importing, verify the state matches:

```bash
# Verify Terraform shows no changes
terraform plan

# If there are differences, adjust configuration
```

Once verified, destroy the Pulumi stack state without destroying resources:

```bash
# Remove all resources from Pulumi state without deleting them
# This must be done resource by resource
pulumi state delete <resource-urn> --force

# Or export, remove resources, and reimport empty state
pulumi stack export > backup.json
# Edit to remove all resources except the stack resource
pulumi stack import < empty-state.json
```

## Handling Pulumi Secrets

Pulumi encrypts secrets in state. Extract them before migration:

```bash
# Decrypt and view secrets
pulumi config --show-secrets

# Export secrets for Terraform
pulumi config get dbPassword --show-secrets
```

Store these in Terraform using appropriate secret management:

```hcl
# Use Terraform variables for secrets
variable "db_password" {
  type      = string
  sensitive = true
}

# Or use a secrets manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}
```

## Best Practices

Migrate one Pulumi stack at a time. Keep both Pulumi and Terraform codebases during the transition period. Verify every import with terraform plan before proceeding. Handle secrets separately and never store them in plain text. Test the migration in a development environment before production. Document the mapping between Pulumi resource names and Terraform resource addresses for team reference.

## Conclusion

Migrating from Pulumi to Terraform involves converting code from a general-purpose language to HCL, extracting resource IDs from Pulumi state, and importing resources into Terraform. While the code conversion requires manual work, the underlying resources translate directly because both tools use similar cloud provider APIs. Take a methodical approach, verify each step, and you will have a successful migration from Pulumi to Terraform.

For related migration guides, see [How to Migrate from CloudFormation to Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-cloudformation-to-terraform/view) and [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view).
