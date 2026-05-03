# Declarative vs Imperative IaC with OpenTofu Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Declarative, Imperative, Infrastructure as Code, Concept

Description: Learn the fundamental difference between declarative and imperative Infrastructure as Code approaches, illustrated with OpenTofu and shell script examples.

## Introduction

Infrastructure as Code tools fall into two broad categories: declarative and imperative. Understanding the difference helps you choose the right tool and explains why OpenTofu's declarative approach scales better for complex infrastructure management.

## Imperative: Describing HOW to Do Something

Imperative IaC specifies the exact steps to execute. Shell scripts are the classic example.

```bash
#!/bin/bash
# Imperative: step-by-step instructions

# Check if bucket exists first (you manage the logic)

if ! aws s3api head-bucket --bucket my-app-data 2>/dev/null; then
  echo "Creating bucket..."
  aws s3api create-bucket \
    --bucket my-app-data \
    --region us-east-1

  aws s3api put-bucket-versioning \
    --bucket my-app-data \
    --versioning-configuration Status=Enabled
else
  echo "Bucket already exists, skipping..."
fi

# You must handle every edge case manually:
# - What if the bucket was partially created?
# - What if the tags changed?
# - What if you want to delete it later?
```

## Declarative: Describing WHAT You Want

Declarative IaC specifies the desired end state. OpenTofu is declarative.

```hcl
# Declarative: describe what you want, not how to get there

resource "aws_s3_bucket" "app_data" {
  bucket = "my-app-data"
}

resource "aws_s3_bucket_versioning" "app_data" {
  bucket = aws_s3_bucket.app_data.id
  versioning_configuration {
    status = "Enabled"
  }
}

# OpenTofu handles ALL the logic:
# - Create if missing
# - Update if different
# - Do nothing if correct
# - Delete if removed from config
```

## Side-by-Side Comparison

```hcl
Scenario: Add a tag to an EC2 instance

Imperative (bash):                    Declarative (OpenTofu):
--------------------------------      --------------------------------
# Get current tags                    resource "aws_instance" "web" {
CURRENT=$(aws ec2 describe-tags...)     # Simply update the tags block
                                        tags = {
# Check if tag exists                     Name        = "web-server"
if echo "$CURRENT" | grep -q "Env";       Environment = "production"
then                                      Team        = "platform"   # added
  aws ec2 create-tags --tags ...        }
else                                  }
  aws ec2 create-tags --tags ...
fi                                    tofu apply
                                      # OpenTofu determines what changed
                                      # and makes the minimum API call
```

## Why Declarative Scales Better

```hcl
Imperative problems at scale:
- You must handle ALL state transitions manually
- Order of operations matters and is error-prone
- Partial failures leave infrastructure in unknown states
- Drift detection requires custom code
- Change history is in bash scripts, not config

Declarative advantages:
- You only describe desired state
- OpenTofu handles create/update/delete/noop automatically
- Idempotent: safe to run multiple times
- State file tracks reality
- Git diff shows exactly what changed
```

## Hybrid Approaches

Some tools blend both styles.

```hcl
# OpenTofu is declarative for resources
resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  # ...
}

# But uses provisioners for imperative steps when needed
resource "aws_instance" "app" {
  ami           = "ami-0abc123"
  instance_type = "t3.medium"

  # Imperative hook for bootstrapping
  provisioner "remote-exec" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y nginx",
    ]
  }
}
# Best practice: avoid provisioners; use user_data or configuration management
```

## Choosing Declarative vs Imperative

```text
Use declarative (OpenTofu) when:
✓ Managing cloud resources with CRUD lifecycle
✓ Team needs to review infrastructure changes
✓ Drift detection is important
✓ Resources have complex dependencies
✓ State needs to be tracked over time

Use imperative (scripts) when:
✓ One-time operational tasks (db migrations, key rotation)
✓ Tasks without idempotent cloud APIs
✓ Bootstrapping machines during provisioning
✓ CI/CD pipeline steps
```

## Summary

Declarative IaC with OpenTofu lets you describe what your infrastructure should look like and trusts the tool to figure out how to get there. This is fundamentally different from imperative scripts where you specify every step. Declarative approaches scale better because OpenTofu handles idempotency, dependency ordering, drift detection, and state management - problems that grow exponentially complex when solved imperatively.
