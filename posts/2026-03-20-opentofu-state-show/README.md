# Using tofu state show in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, State

Description: Learn how to use tofu state show to inspect the full attributes of a specific resource in your OpenTofu state.

The `tofu state show` command displays all the attributes of a specific resource stored in state. It's invaluable for debugging unexpected plan behavior, verifying resource properties, and understanding what OpenTofu knows about your infrastructure.

## Basic Usage

```bash
# Show a specific resource

tofu state show aws_instance.web

# Example output:
# resource "aws_instance" "web" {
#     ami                          = "ami-0c55b159cbfafe1f0"
#     arn                          = "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc"
#     id                           = "i-0123456789abcdef0"
#     instance_state               = "running"
#     instance_type                = "t3.medium"
#     private_ip                   = "10.0.1.45"
#     public_ip                    = "54.123.45.67"
#     tags                         = {
#         "Environment" = "prod"
#         "Name"        = "web-server"
#     }
#     ...
# }
```

## Showing Module Resources

```bash
# Resources inside modules use their full address
tofu state show 'module.networking.aws_vpc.main'

# Output:
# resource "aws_vpc" "main" {
#     id                               = "vpc-0abc12345"
#     arn                              = "arn:aws:ec2:us-east-1:123:vpc/vpc-0abc12345"
#     cidr_block                       = "10.0.0.0/16"
#     default_network_acl_id           = "acl-0abc"
#     default_route_table_id           = "rtb-0abc"
#     default_security_group_id        = "sg-0abc"
#     enable_dns_hostnames             = true
#     enable_dns_support               = true
#     ...
# }
```

## Showing count and for_each Resources

```bash
# Show a specific count instance
tofu state show 'aws_instance.app[0]'
tofu state show 'aws_instance.app[1]'

# Show a specific for_each instance
tofu state show 'aws_s3_bucket.regional["us-east-1"]'
tofu state show 'module.regional["eu-west-1"].aws_vpc.main'
```

## Specifying State File

```bash
# Show resource from a specific state file
tofu state show -state=prod.tfstate aws_instance.web

# Useful for comparing between environments
tofu state show -state=dev.tfstate aws_db_instance.db
tofu state show -state=prod.tfstate aws_db_instance.db
```

## Common Use Cases

### Debugging Plan Differences

```bash
# When a plan shows unexpected changes, check current state values
tofu state show aws_security_group.web

# Check the state vs your config
# If state shows sg-0abc but config expects different rules,
# the plan will show those as changes
```

### Getting Resource IDs for Other Tools

```bash
# Extract a specific attribute (combine with grep/awk)
tofu state show aws_db_instance.main | grep 'address '
#     address                      = "mydb.abc123.us-east-1.rds.amazonaws.com"

tofu state show aws_eks_cluster.main | grep 'endpoint'
#     endpoint                     = "https://ABC123.gr7.us-east-1.eks.amazonaws.com"
```

### Verifying an Import

```bash
# Import an existing resource
tofu import aws_instance.legacy i-0123456789abcdef0

# Verify all attributes were captured correctly
tofu state show aws_instance.legacy

# Then run plan to see if any changes are needed
tofu plan
```

### Comparing State to Actual Infrastructure

```bash
# If you suspect drift, compare state show output
# to the actual AWS Console values

tofu state show aws_instance.web | grep instance_type
#     instance_type = "t3.medium"

# If AWS Console shows t3.large, you have drift
# Fix with: tofu refresh
tofu refresh
tofu state show aws_instance.web | grep instance_type
#     instance_type = "t3.large"  # Now matches reality
```

## JSON Output for Scripting

```bash
# For machine-readable output, use tofu show -json
tofu show -json | jq '.values.root_module.resources[] | select(.address == "aws_instance.web")'

# Get a specific attribute
tofu show -json | jq -r '.values.root_module.resources[] | select(.address == "aws_instance.web") | .values.private_ip'
# 10.0.1.45
```

## Full State Inspection

```bash
# Show the entire state (all resources)
tofu show

# Show with no colors (for piping to files)
tofu show -no-color

# Show JSON format of entire state
tofu show -json

# Show a specific state file
tofu show -state=path/to/terraform.tfstate
```

## Practical Script: Resource Inventory

```bash
#!/bin/bash
# resource-inventory.sh - export key attributes

echo "Resource Inventory"
echo "=================="

for resource in $(tofu state list); do
  echo ""
  echo "## $resource"
  tofu state show "$resource" | grep -E '^\s+(id|arn|name|tags)\s+=' | head -5
done
```

## Conclusion

`tofu state show` is essential for understanding the exact state of your infrastructure as OpenTofu sees it. Use it to debug plan discrepancies, verify imports, extract resource attributes, and detect drift. Combine it with `state list` to navigate large state files and find the resources you need to inspect.
