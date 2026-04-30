# How to Import Existing Infrastructure in Bulk with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Import, Bulk Import, State Management, Migration

Description: Learn how to import large numbers of existing resources into OpenTofu state in bulk using scripted import blocks, the generate config feature, and systematic migration workflows.

## Introduction

Importing an entire existing environment into OpenTofu can involve hundreds of resources. Bulk import strategies using scripts, the `tofu plan -generate-config-out` feature, and systematic grouping by resource type make this tractable.

## Strategy 1: Generate Config from Existing Resources

OpenTofu 1.6+ can generate HCL from imported resources as an experimental feature:

```hcl
# Step 1: Write import blocks for all resources

# import-blocks.tf

import {
  to = aws_vpc.main
  id = "vpc-0123456789abcdef0"
}

import {
  to = aws_subnet.private["us-east-1a"]
  id = "subnet-0123456789abcdef0"
}

import {
  to = aws_subnet.private["us-east-1b"]
  id = "subnet-abcdef0123456789"
}
```

```bash
# Step 2: Generate HCL config for all import blocks into a new file
tofu plan -generate-config-out=generated.tf

# Step 3: Review the generated config, clean it up, then apply
tofu apply
```

## Strategy 2: Scripted Import Block Generation

If you already model these resources with a `for_each` resource, generate import blocks programmatically:

```bash
#!/bin/bash
# generate_imports.sh - Generate import blocks for all EC2 instances

echo "# Auto-generated import blocks" > import-ec2.tf

# Get all instances in the account
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId, Tags[?Key==`Name`].Value|[0]]' \
  --output text | while IFS=$'\t' read -r id name; do
    # Normalize the tag value into a predictable for_each key
    key_source=${name:-$id}
    if [ "$key_source" = "None" ]; then
      key_source=$id
    fi
    resource_key=$(echo "$key_source" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9_-]/_/g')

    cat >> import-ec2.tf << EOF

import {
  to = aws_instance.instances["${resource_key}"]
  id = "${id}"
}
EOF
done

echo "Generated import blocks in import-ec2.tf"
```

## Strategy 3: Resource-Type-by-Resource-Type Migration

If you already have matching `resource` blocks, organize the import in phases by resource type:

```bash
#!/bin/bash
# Phase 1: Foundation resources (VPC, subnets, security groups)
echo "=== Phase 1: Networking ==="
tofu import aws_vpc.main vpc-0123456789abcdef0
tofu import aws_internet_gateway.main igw-0123456789abcdef0

# Verify after each phase
tofu plan 2>&1 | tail -5

# Phase 2: Security and IAM
echo "=== Phase 2: IAM ==="
tofu import aws_iam_role.app my-app-role

# Phase 3: Compute and services
echo "=== Phase 3: Services ==="
tofu import aws_db_instance.main my-app-database
```

## Strategy 4: Using AWS Config for Discovery

AWS Config can enumerate recorded resources of supported types in a region:

```bash
# Query all EC2 instances via AWS Config
aws configservice list-discovered-resources \
  --resource-type AWS::EC2::Instance \
  --query 'resourceIdentifiers[].resourceId' \
  --output text

# Use the results to generate import blocks
aws configservice list-discovered-resources \
  --resource-type AWS::EC2::Instance \
  --query 'resourceIdentifiers[].resourceId' \
  --output text | tr '\t' '\n' | while read instance_id; do
    echo "import { to = aws_instance.all[\"$instance_id\"]; id = \"$instance_id\" }"
  done
```

## Post-Import Cleanup

After bulk import, clean up the plan:

```bash
# Run plan to see what needs reconciliation
tofu plan -out=import-plan.tfplan

# Count resources needing changes
tofu show -json import-plan.tfplan | jq '.resource_changes | group_by(.change.actions) | map({action: .[0].change.actions, count: length})'

# Apply a specific reconciliation after reviewing the plan
tofu apply -target=specific.resource.to.fix
```

## Conclusion

Bulk import is most efficient when automated with scripts and the `generate-config-out` feature. Work by resource type in dependency order (networking before compute before services), verify with `tofu plan` after each phase, and expect to spend time reconciling the generated HCL with your intended configuration. The experimental generate-config feature significantly reduces manual HCL writing for large imports.
