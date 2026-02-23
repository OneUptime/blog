# How to Verify Imported Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Import, Verification, State Management, Infrastructure as Code

Description: Learn how to verify that imported Terraform resources match your configuration and actual cloud infrastructure with systematic validation techniques.

---

Importing resources into Terraform is only half the battle. After the import, you need to verify that the Terraform state accurately reflects the real infrastructure and that your configuration matches both. An unverified import can lead to unexpected changes, resource recreation, or even data loss when you run `terraform apply`. This guide covers systematic techniques for verifying imported resources.

## Why Verification Matters

When you import a resource, Terraform reads the current state of the resource from the cloud provider and stores it in the state file. However, your HCL configuration might not match every attribute of the imported resource. Without verification, the next `terraform apply` could modify or replace the resource to match your configuration, potentially causing downtime.

## Step 1: Run terraform plan

The most fundamental verification step is running `terraform plan` immediately after importing:

```bash
# Run plan to see what Terraform wants to change
terraform plan
```

A successful import with matching configuration shows:

```
No changes. Your infrastructure matches the configuration.

Terraform has compared your real infrastructure against your configuration
and found no differences, so no changes are needed.
```

If the plan shows changes, you need to investigate each one.

## Step 2: Analyze Plan Output

When the plan shows differences, categorize them:

```bash
# Save the plan output for analysis
terraform plan -out=verify.tfplan
terraform show verify.tfplan > verify.txt
```

Common categories of differences:

### Harmless Differences - Safe to Apply

```
# aws_instance.web will be updated in-place
~ resource "aws_instance" "web" {
    ~ tags = {
        + "ManagedBy" = "terraform"  # Adding a new tag is safe
      }
  }
```

### Configuration Gaps - Need Config Updates

```
# aws_instance.web will be updated in-place
~ resource "aws_instance" "web" {
    ~ monitoring = true -> false  # Config missing monitoring = true
  }
```

Fix by updating your configuration:

```hcl
resource "aws_instance" "web" {
  # ... existing config ...
  monitoring = true  # Add the missing attribute
}
```

### Destructive Changes - Require Immediate Attention

```
# aws_instance.web must be replaced
-/+ resource "aws_instance" "web" {
    ~ ami = "ami-old123" -> "ami-new456"  # Forces replacement!
  }
```

Fix by matching your configuration to the actual resource:

```hcl
resource "aws_instance" "web" {
  ami = "ami-old123"  # Use the actual AMI, not a different one
  # ...
}
```

## Step 3: Compare State with Configuration

Use `terraform state show` to examine what was imported:

```bash
# Show the imported resource state
terraform state show aws_instance.web
```

This outputs all attributes stored in state:

```
# aws_instance.web:
resource "aws_instance" "web" {
    ami                          = "ami-0abcdef1234567890"
    arn                          = "arn:aws:ec2:us-east-1:123456789012:instance/i-0abc123"
    instance_state               = "running"
    instance_type                = "t3.medium"
    key_name                     = "my-keypair"
    monitoring                   = true
    private_ip                   = "10.0.1.50"
    public_ip                    = "54.123.45.67"
    subnet_id                    = "subnet-0abc123"
    vpc_security_group_ids       = ["sg-0abc123"]
    tags                         = {
        "Environment" = "production"
        "Name"        = "web-server"
    }
}
```

Compare this with your configuration and update any mismatches.

## Step 4: Verify with Cloud Provider CLI

Cross-check the imported state against the actual cloud resource:

```bash
# AWS - Verify EC2 instance
aws ec2 describe-instances \
  --instance-ids i-0abc123def456789a \
  --query 'Reservations[0].Instances[0].{Type:InstanceType,AMI:ImageId,State:State.Name,SubnetId:SubnetId}' \
  --output table

# Azure - Verify VM
az vm show \
  --resource-group my-rg \
  --name my-vm \
  --query '{Size:hardwareProfile.vmSize,Location:location,State:provisioningState}' \
  --output table

# GCP - Verify compute instance
gcloud compute instances describe my-instance \
  --zone us-central1-a \
  --format='table(name,machineType,status,networkInterfaces[0].networkIP)'
```

## Step 5: Use terraform refresh

Refresh the state to pick up any recent changes made outside Terraform:

```bash
# Refresh state from the cloud provider
terraform refresh

# Or use plan with refresh (default behavior)
terraform plan
```

This ensures the state reflects the current reality, not a stale snapshot from when you imported.

## Step 6: Validate Resource Dependencies

Imported resources often reference other resources. Verify that all dependencies are correctly resolved:

```bash
# List all resources in state
terraform state list

# Check for resources that reference the imported resource
terraform state show aws_instance.web | grep -E "subnet_id|security_group|key_name"
```

Ensure that referenced resources (subnets, security groups, key pairs) are either also imported or defined as data sources:

```hcl
# If the subnet is not managed by Terraform, use a data source
data "aws_subnet" "web" {
  id = "subnet-0abc123"
}

resource "aws_instance" "web" {
  subnet_id = data.aws_subnet.web.id
  # ...
}
```

## Step 7: Test with terraform apply -target

For critical resources, use targeted apply to test the import in isolation:

```bash
# Apply only the imported resource to verify no changes
terraform apply -target=aws_instance.web
```

If the targeted apply shows no changes, the import is verified for that resource.

## Automated Verification Script

Create a script to automate the verification process:

```bash
#!/bin/bash
# verify-imports.sh
# Verify that all imported resources have clean plans

set -e

echo "Starting import verification..."

# Run terraform plan and capture output
PLAN_OUTPUT=$(terraform plan -detailed-exitcode 2>&1) || EXIT_CODE=$?

case ${EXIT_CODE:-0} in
  0)
    echo "SUCCESS: No changes detected. All imports are verified."
    ;;
  1)
    echo "ERROR: Terraform plan encountered an error."
    echo "$PLAN_OUTPUT"
    exit 1
    ;;
  2)
    echo "WARNING: Terraform plan detected changes."
    echo "$PLAN_OUTPUT"

    # Count the number of changes
    ADDS=$(echo "$PLAN_OUTPUT" | grep -c "will be created" || true)
    CHANGES=$(echo "$PLAN_OUTPUT" | grep -c "will be updated" || true)
    DESTROYS=$(echo "$PLAN_OUTPUT" | grep -c "will be destroyed" || true)
    REPLACES=$(echo "$PLAN_OUTPUT" | grep -c "must be replaced" || true)

    echo ""
    echo "Summary:"
    echo "  Resources to add:     $ADDS"
    echo "  Resources to change:  $CHANGES"
    echo "  Resources to destroy: $DESTROYS"
    echo "  Resources to replace: $REPLACES"

    if [ "$REPLACES" -gt 0 ] || [ "$DESTROYS" -gt 0 ]; then
      echo ""
      echo "CRITICAL: Destructive changes detected! Review immediately."
      exit 1
    fi
    ;;
esac
```

## Using Sentinel or OPA for Import Verification

For teams using policy as code, add verification policies:

```rego
# verify_imports.rego
# OPA policy to verify imported resources have no destructive changes

package terraform.verify

# Deny any resource replacements after import
deny[msg] {
  resource := input.resource_changes[_]
  resource.change.actions[_] == "delete"
  msg := sprintf("Resource %s would be deleted - verify import configuration", [resource.address])
}

# Warn about any in-place updates
warn[msg] {
  resource := input.resource_changes[_]
  resource.change.actions == ["update"]
  msg := sprintf("Resource %s has configuration drift - review changes", [resource.address])
}
```

## Handling Verification Failures

When verification reveals problems, follow this decision tree:

1. If plan shows no changes - import is verified, proceed.
2. If plan shows only tag additions - usually safe, apply or update config.
3. If plan shows in-place updates - update your configuration to match the real resource.
4. If plan shows resource replacement - stop and investigate. Your configuration has a fundamental mismatch with the imported resource.
5. If plan shows errors - check for missing providers, invalid references, or corrupted state.

## Best Practices

Run `terraform plan` immediately after every import, before doing any other operations. Save plan output to a file for audit purposes. Compare state attributes with cloud provider CLI output for critical resources. Use lifecycle ignore_changes sparingly and only for attributes genuinely managed outside Terraform. Document any expected drift that cannot be eliminated. Automate verification as part of your import workflow.

## Conclusion

Verifying imported resources is essential to preventing unexpected infrastructure changes. A systematic approach that includes plan analysis, state inspection, cloud provider verification, and dependency checking ensures that your imports are accurate and safe. Automate as much of the verification as possible, and always investigate destructive changes before applying. With proper verification, you can confidently bring existing infrastructure under Terraform management.

For related topics, see [How to Handle Import Conflicts in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-import-conflicts-in-terraform/view) and [How to Import Large Numbers of Resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-large-numbers-of-resources-in-terraform/view).
