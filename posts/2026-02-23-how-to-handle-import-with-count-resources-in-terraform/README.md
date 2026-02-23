# How to Handle Import with count Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import, count, State Management, Infrastructure as Code

Description: Learn how to import existing cloud resources into Terraform configurations that use the count meta-argument with proper index-based addressing.

---

Terraform's `count` meta-argument creates multiple instances of a resource using numeric indices. Importing existing resources into count-based configurations requires you to specify the exact index for each resource. This guide covers how to properly import into count resources, handle index assignments, and avoid common pitfalls.

## Understanding count Resource Addresses

When you use `count`, Terraform creates resource instances with zero-based numeric indices:

```hcl
# Resource using count
resource "aws_instance" "web" {
  count         = 3
  ami           = var.ami_id
  instance_type = var.instance_type

  tags = {
    Name = "web-server-${count.index}"
  }
}
```

This creates three instances:

```
aws_instance.web[0]
aws_instance.web[1]
aws_instance.web[2]
```

Each index must map to exactly one real resource during import.

## Importing with the CLI Command

Use the `terraform import` command with the index in square brackets:

```bash
# Import the first instance (index 0)
terraform import 'aws_instance.web[0]' i-0abc111def000001

# Import the second instance (index 1)
terraform import 'aws_instance.web[1]' i-0abc111def000002

# Import the third instance (index 2)
terraform import 'aws_instance.web[2]' i-0abc111def000003
```

The order matters because each index corresponds to a specific configuration. If your count-based resource uses `count.index` to differentiate instances (like naming or subnet placement), make sure you assign the correct real resource to the correct index.

## Importing with Import Blocks

Import blocks (Terraform 1.5+) make count imports cleaner:

```hcl
# imports.tf
import {
  to = aws_instance.web[0]
  id = "i-0abc111def000001"
}

import {
  to = aws_instance.web[1]
  id = "i-0abc111def000002"
}

import {
  to = aws_instance.web[2]
  id = "i-0abc111def000003"
}
```

Apply the imports:

```bash
terraform plan
terraform apply
```

## Determining the Correct Index Assignment

The most critical step is mapping each real resource to the correct index. If your configuration uses `count.index` to derive resource attributes, you must match accordingly:

```hcl
# Configuration that uses count.index for subnet placement
variable "subnet_ids" {
  default = [
    "subnet-aaa111",  # index 0
    "subnet-bbb222",  # index 1
    "subnet-ccc333",  # index 2
  ]
}

resource "aws_instance" "web" {
  count         = length(var.subnet_ids)
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_ids[count.index]

  tags = {
    Name = "web-server-${count.index}"
  }
}
```

To determine the correct mapping, check which instance is in which subnet:

```bash
# Find which instance is in which subnet
aws ec2 describe-instances \
  --instance-ids i-0abc111def000001 i-0abc111def000002 i-0abc111def000003 \
  --query 'Reservations[].Instances[].[InstanceId,SubnetId,Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

Then assign indices based on the subnet order in your variable.

## Handling Index Gaps

If you have a count of 5 but only 3 resources currently exist, you cannot import into indices 0, 1, and 4 while skipping 2 and 3. Terraform requires all count instances to be present. Either adjust the count or import placeholder resources:

```hcl
# Option 1: Reduce count to match existing resources
resource "aws_instance" "web" {
  count = 3  # Match the number of existing resources
  # ...
}

# Option 2: Create missing resources in a separate step
# First import 3, then increase count to 5 and apply
```

## Importing Modules with count

When a module uses count, the module address includes the index:

```hcl
module "app" {
  count  = 2
  source = "./modules/app"

  name = "app-${count.index}"
}
```

Import resources inside the indexed module:

```bash
# Import into module instance 0
terraform import 'module.app[0].aws_instance.server' i-0abc111

# Import into module instance 1
terraform import 'module.app[1].aws_instance.server' i-0abc222
```

## Scripting Bulk Imports for count Resources

For resources with high count values, script the imports:

```bash
#!/bin/bash
# bulk-import-count.sh
# Import multiple EC2 instances into a count-based resource

# Array of instance IDs in order matching count.index
INSTANCE_IDS=(
  "i-0abc001"  # index 0
  "i-0abc002"  # index 1
  "i-0abc003"  # index 2
  "i-0abc004"  # index 3
  "i-0abc005"  # index 4
)

# Generate import blocks
for i in "${!INSTANCE_IDS[@]}"; do
  echo "import {"
  echo "  to = aws_instance.web[$i]"
  echo "  id = \"${INSTANCE_IDS[$i]}\""
  echo "}"
  echo ""
done > imports.tf

echo "Generated ${#INSTANCE_IDS[@]} import blocks in imports.tf"
echo "Run 'terraform plan' to preview and 'terraform apply' to import."
```

## Migrating from count to for_each

If you need to migrate resources from count-based to for_each-based addressing (a common refactoring), use state moves:

```bash
# Move from count indices to for_each keys
terraform state mv 'aws_instance.web[0]' 'aws_instance.web["web-prod-1"]'
terraform state mv 'aws_instance.web[1]' 'aws_instance.web["web-prod-2"]'
terraform state mv 'aws_instance.web[2]' 'aws_instance.web["web-prod-3"]'
```

Or declaratively with moved blocks:

```hcl
# moved.tf
moved {
  from = aws_instance.web[0]
  to   = aws_instance.web["web-prod-1"]
}

moved {
  from = aws_instance.web[1]
  to   = aws_instance.web["web-prod-2"]
}

moved {
  from = aws_instance.web[2]
  to   = aws_instance.web["web-prod-3"]
}
```

Update the resource block simultaneously:

```hcl
# Updated resource using for_each instead of count
resource "aws_instance" "web" {
  for_each = {
    "web-prod-1" = { subnet_id = "subnet-aaa111" }
    "web-prod-2" = { subnet_id = "subnet-bbb222" }
    "web-prod-3" = { subnet_id = "subnet-ccc333" }
  }

  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = each.value.subnet_id

  tags = {
    Name = each.key
  }
}
```

## Troubleshooting count Imports

A common error is "Index out of range." This occurs when the index you specify exceeds the count value:

```
Error: Invalid resource instance key
The resource aws_instance.web has 3 instances, but the given key 5 is out of range.
```

Ensure your count value is set high enough to accommodate all imports before running the import commands.

Another issue is "Resource already exists in state." If you accidentally import the wrong resource to an index, remove it first:

```bash
# Remove a wrongly imported resource
terraform state rm 'aws_instance.web[1]'

# Re-import with the correct resource ID
terraform import 'aws_instance.web[1]' i-correct-id
```

## Why count Imports Are Fragile

Count-based resources are inherently fragile because removing an item from the middle of the list causes all subsequent indices to shift. For example, if you remove index 1 from a list of 5, indices 2-4 shift down to 1-3, and Terraform wants to destroy and recreate them. This is one of the main reasons teams migrate from count to for_each.

When importing into count resources, be aware that future changes to the count or the ordering of your input lists may trigger unintended resource replacements. Plan your import with this limitation in mind.

## Best Practices

Document the mapping between indices and real resources clearly. Use comments in your import blocks or a separate mapping file. Prefer import blocks over CLI commands for traceability. Always verify the index-to-resource mapping before importing by checking resource attributes against what count.index would produce. Consider migrating to for_each after importing if you need more stable resource addressing.

## Conclusion

Importing into count-based Terraform resources requires careful attention to index ordering and total count values. While the process is straightforward once you understand the addressing scheme, the fragility of count-based indices means you should consider migrating to for_each after the import is complete. Use import blocks for clarity and always verify your imports with `terraform plan` to confirm a clean state.

For related topics, see [How to Handle Import with for_each Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-import-with-for-each-resources-in-terraform/view) and [How to Import Resources into Modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-resources-into-modules-in-terraform/view).
