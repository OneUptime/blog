# How to Import Large Numbers of Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import, Bulk Import, Automation, Infrastructure as Code

Description: Learn strategies and automation techniques for importing hundreds or thousands of existing cloud resources into Terraform efficiently and reliably.

---

Importing a few resources into Terraform is straightforward, but importing hundreds or thousands requires a different approach. Manual imports do not scale, and a single mistake can leave your state in an inconsistent condition. This guide covers automation strategies, tooling, and best practices for bulk importing resources into Terraform at scale.

## The Challenge of Scale

Large-scale imports present several challenges. Each resource requires a matching Terraform configuration, the correct import ID, and post-import verification. With hundreds of resources, doing this manually is impractical. You need automation for discovering resources, generating configurations, creating import commands, and verifying results.

## Strategy 1: Use Terraformer for Bulk Generation

Terraformer can generate both configurations and state for large numbers of resources:

```bash
# Import all supported AWS resources in a region
terraformer import aws --resources=* --regions=us-east-1

# Import specific resource types in bulk
terraformer import aws \
  --resources=ec2_instance,ebs_volume,security_group,vpc,subnet \
  --regions=us-east-1,us-west-2

# Filter by tags to import only production resources
terraformer import aws \
  --resources=ec2_instance \
  --filter="Name=tags.Environment;Value=production" \
  --regions=us-east-1
```

Then merge the generated state files and clean up configurations.

## Strategy 2: Script-Based Import with Cloud CLI

Use cloud provider CLIs to discover resources and generate import commands:

```bash
#!/bin/bash
# discover-and-import-aws.sh
# Discover AWS resources and generate import blocks

OUTPUT_FILE="imports.tf"
CONFIG_FILE="generated_resources.tf"

echo "" > "$OUTPUT_FILE"
echo "" > "$CONFIG_FILE"

# Discover all EC2 instances
echo "Discovering EC2 instances..."
INSTANCES=$(aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,ImageId,SubnetId,Tags[?Key==`Name`].Value|[0]]' \
  --output text)

INDEX=0
while IFS=$'\t' read -r id type ami subnet name; do
  # Skip terminated instances
  [ -z "$id" ] && continue

  RESOURCE_NAME="instance_${name:-unnamed_$INDEX}"
  # Sanitize resource name for Terraform
  RESOURCE_NAME=$(echo "$RESOURCE_NAME" | tr -cs 'a-zA-Z0-9_' '_' | sed 's/^_//')

  # Generate import block
  cat >> "$OUTPUT_FILE" <<EOF
import {
  to = aws_instance.${RESOURCE_NAME}
  id = "${id}"
}

EOF

  # Generate resource configuration
  cat >> "$CONFIG_FILE" <<EOF
resource "aws_instance" "${RESOURCE_NAME}" {
  ami           = "${ami}"
  instance_type = "${type}"
  subnet_id     = "${subnet}"

  tags = {
    Name = "${name}"
  }

  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

EOF

  INDEX=$((INDEX + 1))
done <<< "$INSTANCES"

echo "Generated $INDEX import blocks in $OUTPUT_FILE"
echo "Generated $INDEX resource configs in $CONFIG_FILE"
```

## Strategy 3: Terraform Import Blocks in Batches

For very large imports, split the work into batches to manage risk:

```bash
#!/bin/bash
# batch-import.sh
# Import resources in batches of 50

BATCH_SIZE=50
IMPORT_DIR="./import-batches"
mkdir -p "$IMPORT_DIR"

# Split import blocks into batch files
split -l $((BATCH_SIZE * 4)) imports.tf "$IMPORT_DIR/batch_" --additional-suffix=".tf"

# Process each batch
for batch in "$IMPORT_DIR"/batch_*.tf; do
  BATCH_NAME=$(basename "$batch" .tf)
  echo "Processing $BATCH_NAME..."

  # Copy batch to working directory
  cp "$batch" ./current_imports.tf

  # Plan the batch
  if terraform plan -out="$BATCH_NAME.tfplan" 2>&1; then
    echo "Plan succeeded for $BATCH_NAME"

    # Apply the batch
    terraform apply "$BATCH_NAME.tfplan"

    # Remove the import file (imports are one-time)
    rm ./current_imports.tf
    echo "Completed $BATCH_NAME"
  else
    echo "ERROR: Plan failed for $BATCH_NAME"
    rm ./current_imports.tf
    exit 1
  fi

  # Brief pause between batches
  sleep 5
done
```

## Strategy 4: Use terraform-import-gen Tools

Several community tools generate import configurations:

```bash
# Install cf-terraforming for Cloudflare resources
go install github.com/cloudflare/cf-terraforming/cmd/cf-terraforming@latest

# Generate import commands for all Cloudflare DNS records
cf-terraforming import --resource-type cloudflare_record --zone YOUR_ZONE_ID

# Install terraforming (legacy tool for AWS)
gem install terraforming

# Generate Terraform for all S3 buckets
terraforming s3
```

## Building a Bulk Import Pipeline

For enterprise-scale imports, build a structured pipeline:

```python
#!/usr/bin/env python3
"""
bulk_import_pipeline.py
Pipeline for discovering, generating, and importing resources at scale.
"""

import subprocess
import json
import os

def discover_resources(resource_type, region):
    """Discover existing cloud resources."""
    if resource_type == "ec2":
        result = subprocess.run(
            ["aws", "ec2", "describe-instances",
             "--region", region,
             "--query", "Reservations[].Instances[]",
             "--output", "json"],
            capture_output=True, text=True
        )
        return json.loads(result.stdout)
    return []

def generate_import_block(resource_type, terraform_name, resource_id):
    """Generate a Terraform import block."""
    return f"""import {{
  to = {resource_type}.{terraform_name}
  id = "{resource_id}"
}}
"""

def generate_config(resource_type, terraform_name, attributes):
    """Generate a Terraform resource configuration."""
    # Build HCL configuration from discovered attributes
    config = f'resource "{resource_type}" "{terraform_name}" {{\n'
    for key, value in attributes.items():
        if isinstance(value, str):
            config += f'  {key} = "{value}"\n'
        elif isinstance(value, bool):
            config += f'  {key} = {str(value).lower()}\n'
    config += "}\n"
    return config

def run_import_batch(batch_file):
    """Run terraform plan and apply for a batch."""
    # Plan
    result = subprocess.run(
        ["terraform", "plan", "-out=batch.tfplan"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"Plan failed: {result.stderr}")
        return False

    # Apply
    result = subprocess.run(
        ["terraform", "apply", "batch.tfplan"],
        capture_output=True, text=True
    )
    return result.returncode == 0

# Main pipeline
def main():
    regions = ["us-east-1", "us-west-2", "eu-west-1"]
    resource_types = ["ec2", "rds", "s3"]

    for region in regions:
        for rtype in resource_types:
            resources = discover_resources(rtype, region)
            print(f"Found {len(resources)} {rtype} resources in {region}")
            # Generate and import in batches
            # ... batch processing logic ...

if __name__ == "__main__":
    main()
```

## Handling State File Size

Large imports create large state files. Optimize state management:

```hcl
# Use remote state with locking
terraform {
  backend "s3" {
    bucket         = "terraform-state-large"
    key            = "bulk-import/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

Consider splitting into multiple state files by domain:

```bash
# Split resources across multiple configurations
project/
  networking/
    main.tf          # VPCs, subnets, route tables
    terraform.tfstate
  compute/
    main.tf          # EC2 instances, ASGs
    terraform.tfstate
  databases/
    main.tf          # RDS instances, ElastiCache
    terraform.tfstate
```

## Parallel Import Execution

Speed up imports by running them in parallel where safe:

```bash
#!/bin/bash
# parallel-import.sh
# Run imports in parallel for independent resources

MAX_PARALLEL=5

import_resource() {
  local address="$1"
  local id="$2"
  echo "Importing $address..."
  terraform import "$address" "$id" 2>&1
}

export -f import_resource

# Read import pairs from a file and run in parallel
cat import_list.txt | xargs -P $MAX_PARALLEL -I {} bash -c 'import_resource {}'
```

Note: Parallel imports with CLI commands risk state file corruption. Use import blocks with `terraform apply` instead, which handles concurrency safely.

## Verification at Scale

Verify large imports systematically:

```bash
#!/bin/bash
# verify-bulk-import.sh
# Verify all imported resources

echo "Running terraform plan for verification..."
terraform plan -detailed-exitcode -out=verify.tfplan 2>&1 | tee verify.log

# Parse the plan output
TOTAL=$(grep -c "resource" verify.log || true)
CHANGES=$(grep -c "will be updated\|will be created\|will be destroyed" verify.log || true)
REPLACES=$(grep -c "must be replaced" verify.log || true)

echo ""
echo "Verification Summary:"
echo "  Total resources: $TOTAL"
echo "  Resources with changes: $CHANGES"
echo "  Resources requiring replacement: $REPLACES"

if [ "$REPLACES" -gt 0 ]; then
  echo ""
  echo "CRITICAL: Some resources would be replaced!"
  grep -B2 "must be replaced" verify.log
fi
```

## Best Practices for Large-Scale Imports

Break imports into logical batches by resource type or environment. Start with resources that have no dependencies (like VPCs and S3 buckets) before importing dependent resources (like EC2 instances and RDS databases). Use import blocks exclusively for bulk imports as they are safer and more auditable than CLI commands. Keep detailed logs of every import operation. Test your import process in a non-production environment first. Use remote state with locking to prevent corruption during long-running import sessions.

## Conclusion

Importing large numbers of resources into Terraform requires automation, batching, and systematic verification. Whether you use Terraformer, custom scripts, or a combination of tools, the key principles are the same: discover resources programmatically, generate configurations and import blocks automatically, process in manageable batches, and verify everything before moving on. With the right approach, you can bring even the largest cloud environments under Terraform management efficiently.

For related topics, see [How to Use Terraformer to Auto-Generate Terraform from Cloud](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraformer-to-auto-generate-terraform-from-cloud/view) and [How to Verify Imported Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-verify-imported-resources-in-terraform/view).
