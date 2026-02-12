# How to Recover from Terraform State Corruption with AWS Backend

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, State Management, Disaster Recovery

Description: Learn how to recover from Terraform state corruption when using an S3 backend, including versioning recovery, state reconstruction, and prevention strategies.

---

Terraform state corruption is one of those problems that makes your heart rate spike. Your state file is the only thing linking your Terraform configuration to real AWS resources. If it gets corrupted, Terraform might try to recreate resources that already exist, fail to manage resources it should know about, or just refuse to run at all. The good news is that if you've set up your S3 backend correctly, recovery is usually straightforward.

Let's cover what causes state corruption, how to recover from it, and most importantly, how to prevent it.

## Common Causes of State Corruption

State corruption doesn't happen randomly. Here are the usual suspects:

- **Concurrent runs**: Two people running `terraform apply` simultaneously without proper locking
- **Interrupted applies**: A `terraform apply` gets killed mid-execution (network drop, Ctrl+C at the wrong moment, CI/CD timeout)
- **Manual state editing gone wrong**: Someone edits the state JSON and introduces syntax errors
- **State push mistakes**: Using `terraform state push` with an incorrect or outdated state file
- **Backend migration issues**: Moving from local to S3 backend and losing data in the process

## Your S3 Backend Should Have Versioning

Before we talk about recovery, let's make sure your backend is set up to survive corruption. The key is S3 versioning:

```hcl
# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "mycompany-terraform-state"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning - this is your lifeline
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt the state at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

The DynamoDB table prevents concurrent modifications. Without it, you're asking for trouble.

## Recovery Method 1: Restore from S3 Version History

This is the fastest and most reliable recovery method. If your state file is corrupted but S3 versioning is enabled, you can restore a previous version:

```bash
# List versions of the state file
aws s3api list-object-versions \
  --bucket mycompany-terraform-state \
  --prefix env/production/terraform.tfstate \
  --max-items 10
```

The output shows recent versions with timestamps. Find the last good version:

```bash
# Download a specific version of the state file
aws s3api get-object \
  --bucket mycompany-terraform-state \
  --key env/production/terraform.tfstate \
  --version-id "abc123xyz" \
  restored_state.json
```

Inspect the restored state to make sure it looks correct:

```bash
# Check the state file is valid JSON
python3 -m json.tool restored_state.json > /dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Check the resource count
cat restored_state.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Resources: {len(d.get(\"resources\", []))}')"
```

If the state looks good, push it back:

```bash
# Upload the restored state file
aws s3 cp restored_state.json \
  s3://mycompany-terraform-state/env/production/terraform.tfstate

# Verify by running a plan
terraform plan
```

The plan might show some drift if changes were made between the corrupted state and the restored version, but it shouldn't show wholesale resource recreation.

## Recovery Method 2: Force Unlock Stuck State

Sometimes the state isn't corrupted - it's locked by a process that crashed. You'll see an error like:

```
Error: Error locking state: Error acquiring the state lock
Lock Info:
  ID:        a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Path:      mycompany-terraform-state/env/production/terraform.tfstate
  Operation: OperationTypeApply
```

If you're sure no other process is running:

```bash
# Force unlock the state
terraform force-unlock a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Double-check by looking at the DynamoDB table directly:

```bash
# Check if there's still a lock in DynamoDB
aws dynamodb get-item \
  --table-name terraform-state-locks \
  --key '{"LockID": {"S": "mycompany-terraform-state/env/production/terraform.tfstate"}}'
```

## Recovery Method 3: Reconstruct State from AWS

If your state is completely lost and you don't have a backup, you'll need to reconstruct it by importing existing resources. This is the most time-consuming option but it works.

Start by listing what actually exists in AWS:

```bash
# List EC2 instances
aws ec2 describe-instances --query 'Reservations[].Instances[].{Id:InstanceId,Name:Tags[?Key==`Name`].Value|[0],State:State.Name}' --output table

# List RDS instances
aws rds describe-db-instances --query 'DBInstances[].{Id:DBInstanceIdentifier,Engine:Engine,Status:DBInstanceStatus}' --output table

# List VPCs
aws ec2 describe-vpcs --query 'Vpcs[].{Id:VpcId,Cidr:CidrBlock,Name:Tags[?Key==`Name`].Value|[0]}' --output table
```

Then import each resource into your Terraform configuration:

```bash
# Import resources one by one
terraform import aws_vpc.main vpc-abc123
terraform import aws_subnet.public[0] subnet-abc123
terraform import aws_subnet.public[1] subnet-def456
terraform import aws_instance.web i-0abc123def456
terraform import aws_db_instance.main mydb-instance
terraform import aws_s3_bucket.data my-data-bucket
```

After importing, run `terraform plan` and work through any differences between the imported state and your configuration. This is tedious but thorough.

## Recovery Method 4: State Surgery with jq

If the state file has a specific structural issue (like a duplicate resource entry), you can fix it with JSON manipulation:

```bash
# Backup first
cp corrupted_state.json corrupted_state_backup.json

# Remove a specific resource that's causing problems
cat corrupted_state.json | \
  python3 -c "
import sys, json
state = json.load(sys.stdin)
state['resources'] = [r for r in state['resources'] if not (r['type'] == 'aws_instance' and r['name'] == 'problematic')]
state['serial'] += 1
json.dump(state, sys.stdout, indent=2)
" > fixed_state.json

# Validate the fixed state
python3 -m json.tool fixed_state.json > /dev/null && echo "Valid"

# Push the fixed state
terraform state push fixed_state.json
```

Always increment the `serial` number when manually editing state. Terraform uses it to detect state conflicts.

## Prevention: Setting Up Automatic Backups

Don't wait for corruption to happen. Set up automatic state backups:

```hcl
# Lifecycle rule to keep old versions
resource "aws_s3_bucket_lifecycle_configuration" "state_versions" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "keep-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }
  }
}
```

This keeps 90 days of state versions. Old versions move to Glacier after 30 days to save costs.

## Prevention: State Locking

Make sure locking is working. Here's the backend configuration that uses both S3 and DynamoDB:

```hcl
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "env/production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

## Prevention: CI/CD Pipeline Safety

If you're running Terraform in CI/CD, add safety checks:

```yaml
# Example GitHub Actions workflow with safety steps
steps:
  - name: Terraform Init
    run: terraform init

  - name: Backup State
    run: |
      terraform state pull > state_backup_$(date +%Y%m%d_%H%M%S).json
      aws s3 cp state_backup_*.json s3://terraform-backups/

  - name: Terraform Plan
    run: terraform plan -out=tfplan

  - name: Terraform Apply
    run: terraform apply tfplan
    timeout-minutes: 30  # prevent hanging applies
```

## Summary

State corruption is recoverable if you've prepared. S3 versioning is your first line of defense - it gives you point-in-time recovery with minimal effort. DynamoDB locking prevents the most common cause of corruption (concurrent access). And if everything else fails, you can reconstruct state from AWS using `terraform import`. The key is preparation: enable versioning before you need it, back up your state regularly, and always use locking.
