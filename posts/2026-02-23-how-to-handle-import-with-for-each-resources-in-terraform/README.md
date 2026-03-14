# How to Handle Import with for_each Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import, For_each, State Management, Infrastructure as Code

Description: Learn how to import existing cloud resources into Terraform configurations that use for_each, including proper addressing and common pitfalls.

---

Terraform's `for_each` meta-argument creates multiple resource instances from a map or set, and each instance has a unique string key in the state. Importing existing resources into `for_each`-based configurations requires careful attention to how Terraform addresses these instances. This guide covers the syntax, techniques, and common pitfalls of importing into for_each resources.

## Understanding for_each Resource Addresses

When you use `for_each`, Terraform creates resource instances with addresses that include the map key in square brackets:

```hcl
# Resource definition using for_each
resource "aws_s3_bucket" "data" {
  for_each = toset(["logs", "backups", "artifacts"])
  bucket   = "${var.prefix}-${each.key}"
}
```

This creates three resource instances with these addresses:

```text
aws_s3_bucket.data["logs"]
aws_s3_bucket.data["backups"]
aws_s3_bucket.data["artifacts"]
```

When importing, you must specify the exact key that matches the for_each map.

## Importing with the CLI Command

The import command requires quoting to handle the bracket syntax correctly. The exact quoting depends on your shell:

```bash
# Bash - use single quotes around the address
terraform import 'aws_s3_bucket.data["logs"]' my-prefix-logs
terraform import 'aws_s3_bucket.data["backups"]' my-prefix-backups
terraform import 'aws_s3_bucket.data["artifacts"]' my-prefix-artifacts

# If using double quotes for the outer string, escape the inner quotes
terraform import "aws_s3_bucket.data[\"logs\"]" my-prefix-logs

# PowerShell - use backtick to escape quotes
terraform import "aws_s3_bucket.data[\`"logs\`"]" my-prefix-logs
```

Shell quoting issues are the most common source of errors when importing for_each resources. If you see an error about the resource address not being valid, double-check your quoting.

## Importing with Import Blocks

Import blocks (Terraform 1.5+) provide a cleaner approach that avoids shell quoting entirely:

```hcl
# imports.tf
import {
  to = aws_s3_bucket.data["logs"]
  id = "my-prefix-logs"
}

import {
  to = aws_s3_bucket.data["backups"]
  id = "my-prefix-backups"
}

import {
  to = aws_s3_bucket.data["artifacts"]
  id = "my-prefix-artifacts"
}
```

Run the import:

```bash
# Preview the imports
terraform plan

# Execute the imports
terraform apply
```

## Importing with Map-Based for_each

When for_each uses a map, the keys correspond to the map keys:

```hcl
# Resource using a map for for_each
variable "databases" {
  default = {
    users = {
      engine         = "postgres"
      instance_class = "db.t3.medium"
    }
    orders = {
      engine         = "mysql"
      instance_class = "db.t3.large"
    }
  }
}

resource "aws_db_instance" "app" {
  for_each       = var.databases
  identifier     = "${var.env}-${each.key}"
  engine         = each.value.engine
  instance_class = each.value.instance_class
  # ... other configuration
}
```

Import using the map keys:

```bash
# Import using the map keys
terraform import 'aws_db_instance.app["users"]' prod-users
terraform import 'aws_db_instance.app["orders"]' prod-orders
```

Or with import blocks:

```hcl
import {
  to = aws_db_instance.app["users"]
  id = "prod-users"
}

import {
  to = aws_db_instance.app["orders"]
  id = "prod-orders"
}
```

## Importing Modules with for_each

When a module uses for_each, the module address includes the key:

```hcl
# Module using for_each
module "vpc" {
  for_each = {
    us-east-1 = { cidr = "10.0.0.0/16" }
    us-west-2 = { cidr = "10.1.0.0/16" }
  }

  source     = "./modules/vpc"
  cidr_block = each.value.cidr
  region     = each.key
}
```

Import resources inside the keyed module:

```bash
# Import a VPC into the us-east-1 module instance
terraform import 'module.vpc["us-east-1"].aws_vpc.main' vpc-0abc123

# Import a VPC into the us-west-2 module instance
terraform import 'module.vpc["us-west-2"].aws_vpc.main' vpc-0def456
```

## Generating Import Blocks Programmatically

For large numbers of for_each resources, generate import blocks with a script:

```bash
#!/bin/bash
# generate-imports.sh
# Generate import blocks for S3 buckets

# Map of Terraform keys to AWS bucket names
declare -A BUCKETS=(
  ["logs"]="prod-logs-bucket"
  ["backups"]="prod-backups-bucket"
  ["artifacts"]="prod-artifacts-bucket"
  ["uploads"]="prod-uploads-bucket"
  ["static"]="prod-static-bucket"
)

# Generate import blocks
for key in "${!BUCKETS[@]}"; do
  cat <<EOF
import {
  to = aws_s3_bucket.data["${key}"]
  id = "${BUCKETS[$key]}"
}

EOF
done
```

Run the script and save the output:

```bash
# Generate the import blocks file
bash generate-imports.sh > imports.tf

# Review and then apply
terraform plan
terraform apply
```

## Converting from count to for_each During Import

If you are migrating resources from `count` to `for_each`, you need to handle the state transition. Resources addressed by index (e.g., `aws_instance.server[0]`) must be moved to key-based addresses:

```bash
# Move resources from count-based to for_each-based addresses
terraform state mv 'aws_instance.server[0]' 'aws_instance.server["web-1"]'
terraform state mv 'aws_instance.server[1]' 'aws_instance.server["web-2"]'
terraform state mv 'aws_instance.server[2]' 'aws_instance.server["web-3"]'
```

Or use moved blocks for a declarative approach:

```hcl
# moved.tf
moved {
  from = aws_instance.server[0]
  to   = aws_instance.server["web-1"]
}

moved {
  from = aws_instance.server[1]
  to   = aws_instance.server["web-2"]
}

moved {
  from = aws_instance.server[2]
  to   = aws_instance.server["web-3"]
}
```

## Handling Dynamic for_each Keys

When for_each keys come from a data source or are dynamically generated, you need to know the exact keys before importing. Use `terraform console` to inspect the keys:

```bash
# Start Terraform console
terraform console

# Inspect the for_each keys
> keys(var.databases)
[
  "orders",
  "users",
]

# Check a specific resource address
> aws_s3_bucket.data
# This will show all instances and their keys
```

## Common Errors and Solutions

The most frequent error is "Invalid resource instance key." This happens when the key you specify in the import does not match any key in the for_each expression:

```text
Error: Invalid resource instance key
The resource aws_s3_bucket.data does not have an instance with the key "log".
```

Verify that your for_each expression includes the key you are trying to import into. Another common error is "Resource already managed by Terraform," which means the resource is already in the state. Check with `terraform state list` before importing.

## Best Practices

Always use import blocks instead of CLI commands for for_each resources to avoid shell quoting issues. Before importing, run `terraform plan` to see the expected resource addresses and verify they match your import targets. Keep the for_each map definition stable during imports to avoid key changes that would confuse the import process. After importing all resources, run a full `terraform plan` to verify that no unexpected changes are detected.

When working with large for_each maps, consider importing resources in batches. This makes it easier to troubleshoot issues and track progress. Always back up your state file before starting the import process.

## Conclusion

Importing into for_each resources requires understanding Terraform's addressing scheme and careful attention to key values. Import blocks are strongly preferred over CLI commands because they avoid shell quoting complexities and are easier to review. Whether you are importing new resources or migrating from count to for_each, the key is matching your import addresses exactly to the keys in your for_each expression.

For related topics, see [How to Handle Import with count Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-import-with-count-resources-in-terraform/view) and [How to Import Resources with Complex IDs in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-resources-with-complex-ids-in-terraform/view).
