# How to Use Workspaces to Manage Feature Branches

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Feature Branches, CI/CD, Development Workflow

Description: Learn how to use Terraform workspaces to create isolated infrastructure environments for feature branches, enabling parallel development with automatic cleanup on merge.

---

Feature branch infrastructure is the practice of spinning up a complete environment for each feature branch in your repository. Instead of sharing a single staging environment where developers step on each other's changes, each branch gets its own isolated copy of the infrastructure. Terraform workspaces make this practical by letting you manage multiple instances of the same configuration with separate state. This post shows you how to set it up end to end.

## Why Feature Branch Infrastructure

Shared staging environments cause problems. Developer A deploys their changes, then Developer B deploys theirs, overwriting Developer A's work. QA tests against a moving target. Bugs from one feature bleed into testing of another.

Feature branch environments eliminate these issues:

- Each developer gets an isolated copy of the infrastructure
- QA can test features independently
- No deployment coordination needed
- You can run integration tests against a real environment before merging

The tradeoff is cost, but if you tear down environments when branches merge, the expense is manageable.

## Workspace Naming Convention

Use the branch name as part of the workspace name. Sanitize it to remove characters that are not valid in workspace names or resource names:

```bash
#!/bin/bash
# sanitize-branch-name.sh
# Convert a git branch name to a valid workspace name

BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Replace slashes and special chars with hyphens
# Trim to 20 characters to avoid hitting resource name limits
WORKSPACE=$(echo "$BRANCH" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-20 | sed 's/-$//')

echo "$WORKSPACE"
```

Examples:

```text
feature/user-auth    -> feature-user-auth
bugfix/login-crash   -> bugfix-login-crash
feature/JIRA-1234    -> feature-jira-1234
```

## Basic Setup

Start with a Terraform configuration that uses `terraform.workspace` to name resources uniquely:

```hcl
# main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket               = "myapp-terraform-state"
    key                  = "terraform.tfstate"
    region               = "us-east-1"
    dynamodb_table       = "terraform-locks"
    workspace_key_prefix = "feature-envs"
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = terraform.workspace
      ManagedBy   = "terraform"
      Temporary   = terraform.workspace == "prod" || terraform.workspace == "staging" ? "false" : "true"
    }
  }
}

locals {
  # Use smaller instances for feature branches
  is_persistent = contains(["prod", "staging", "dev"], terraform.workspace)

  instance_type = local.is_persistent ? "t3.small" : "t3.micro"
  db_class      = local.is_persistent ? "db.t3.small" : "db.t3.micro"
}
```

## Infrastructure for Feature Branches

Here is a complete set of resources for a feature branch environment:

```hcl
# networking.tf

# Use the shared VPC but create a unique subnet for each branch
resource "aws_subnet" "feature" {
  vpc_id            = data.aws_vpc.shared.id
  cidr_block        = cidrsubnet(data.aws_vpc.shared.cidr_block, 8, random_integer.subnet.result)
  availability_zone = "us-east-1a"

  tags = {
    Name = "feature-${terraform.workspace}"
  }
}

# Random integer to avoid CIDR conflicts between branches
resource "random_integer" "subnet" {
  min = 100
  max = 250
}

data "aws_vpc" "shared" {
  tags = {
    Name = "shared-dev-vpc"
  }
}
```

```hcl
# compute.tf

resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type
  subnet_id     = aws_subnet.feature.id

  user_data = <<-EOF
    #!/bin/bash
    # Deploy the application from the feature branch
    apt-get update
    apt-get install -y docker.io
    docker pull myapp:${terraform.workspace}
    docker run -d -p 80:8080 myapp:${terraform.workspace}
  EOF

  tags = {
    Name   = "app-${terraform.workspace}"
    Branch = terraform.workspace
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  owners = ["099720109477"]
}
```

```hcl
# database.tf

resource "aws_db_instance" "app" {
  identifier     = "db-${terraform.workspace}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = local.db_class

  allocated_storage = 20
  db_name           = "myapp"
  username          = "admin"
  password          = var.db_password

  # Feature branch databases do not need backups
  backup_retention_period = local.is_persistent ? 7 : 0
  skip_final_snapshot     = !local.is_persistent

  tags = {
    Name   = "db-${terraform.workspace}"
    Branch = terraform.workspace
  }
}
```

```hcl
# dns.tf

# Create a subdomain for the feature branch
resource "aws_route53_record" "feature" {
  zone_id = data.aws_route53_zone.dev.zone_id
  name    = "${terraform.workspace}.dev.example.com"
  type    = "A"
  ttl     = 60
  records = [aws_instance.app.public_ip]
}

data "aws_route53_zone" "dev" {
  name = "dev.example.com"
}

output "url" {
  value = "http://${terraform.workspace}.dev.example.com"
}
```

## CI/CD Pipeline Integration

### GitHub Actions

```yaml
# .github/workflows/feature-env.yml
name: Feature Environment

on:
  pull_request:
    types: [opened, synchronize, reopened]

  pull_request_target:
    types: [closed]

env:
  TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}

jobs:
  # Create or update the feature environment
  deploy:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/terraform
          aws-region: us-east-1

      - name: Set workspace name
        id: workspace
        run: |
          # Sanitize branch name for workspace
          WS=$(echo "${{ github.head_ref }}" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-20 | sed 's/-$//')
          echo "name=$WS" >> "$GITHUB_OUTPUT"

      - name: Terraform Init
        run: terraform init -input=false

      - name: Select Workspace
        run: terraform workspace select -or-create ${{ steps.workspace.outputs.name }}

      - name: Terraform Apply
        run: terraform apply -auto-approve

      - name: Post URL to PR
        uses: actions/github-script@v7
        with:
          script: |
            const output = require('child_process').execSync('terraform output -raw url').toString();
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Feature environment deployed: ${output}`
            });

  # Destroy the feature environment when PR is closed
  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/terraform
          aws-region: us-east-1

      - name: Set workspace name
        id: workspace
        run: |
          WS=$(echo "${{ github.head_ref }}" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-20 | sed 's/-$//')
          echo "name=$WS" >> "$GITHUB_OUTPUT"

      - name: Terraform Init
        run: terraform init -input=false

      - name: Destroy Resources
        run: |
          terraform workspace select ${{ steps.workspace.outputs.name }}
          terraform destroy -auto-approve

      - name: Delete Workspace
        run: |
          terraform workspace select default
          terraform workspace delete ${{ steps.workspace.outputs.name }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
variables:
  TF_VAR_db_password: $DB_PASSWORD

.terraform_base:
  image: hashicorp/terraform:latest
  before_script:
    - export WORKSPACE=$(echo "$CI_COMMIT_REF_NAME" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-20 | sed 's/-$//')
    - terraform init -input=false
    - terraform workspace select -or-create "$WORKSPACE"

deploy_feature:
  extends: .terraform_base
  stage: deploy
  script:
    - terraform apply -auto-approve
    - echo "Environment URL:" $(terraform output -raw url)
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: $(terraform output -raw url)
    on_stop: destroy_feature
  only:
    - branches
  except:
    - main
    - master

destroy_feature:
  extends: .terraform_base
  stage: deploy
  script:
    - terraform destroy -auto-approve
    - terraform workspace select default
    - terraform workspace delete "$WORKSPACE"
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    action: stop
  when: manual
  only:
    - branches
  except:
    - main
    - master
```

## Cost Control

Feature branch environments can get expensive. Here are strategies to keep costs down:

```hcl
# Use spot instances for feature branches
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.instance_type

  # Use spot instances for non-persistent environments
  instance_market_options {
    market_type = local.is_persistent ? null : "spot"
  }

  tags = {
    Name = "app-${terraform.workspace}"
  }
}
```

### Scheduled Shutdown

```bash
#!/bin/bash
# nightly-cleanup.sh - Stop feature branch instances at night

WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//' | grep -v -E '^(default|dev|staging|prod)$')

for WS in $WORKSPACES; do
  terraform workspace select "$WS"
  # Just stop instances, do not destroy
  terraform apply -auto-approve -var="stop_instances=true"
done
```

### TTL-Based Cleanup

```bash
#!/bin/bash
# ttl-cleanup.sh - Destroy environments older than 7 days

MAX_AGE_SECONDS=$((7 * 24 * 60 * 60))
NOW=$(date +%s)

WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//' | grep -v -E '^(default|dev|staging|prod)$')

for WS in $WORKSPACES; do
  terraform workspace select "$WS"

  # Check when the state was last modified
  LAST_MODIFIED=$(terraform state pull | python3 -c "import json,sys; print(json.load(sys.stdin).get('serial', 0))")

  # Use S3 object metadata for actual timestamp
  STATE_AGE=$(aws s3api head-object \
    --bucket myapp-terraform-state \
    --key "feature-envs/${WS}/terraform.tfstate" \
    --query 'LastModified' --output text 2>/dev/null)

  if [ -n "$STATE_AGE" ]; then
    STATE_EPOCH=$(date -d "$STATE_AGE" +%s 2>/dev/null || date -jf "%Y-%m-%dT%H:%M:%S" "$STATE_AGE" +%s)
    AGE=$((NOW - STATE_EPOCH))

    if [ "$AGE" -gt "$MAX_AGE_SECONDS" ]; then
      echo "Destroying $WS (age: $((AGE / 86400)) days)"
      terraform destroy -auto-approve
      terraform workspace select default
      terraform workspace delete "$WS"
    fi
  fi
done
```

## Handling Database Seeding

Feature branches often need test data:

```hcl
# Use a database snapshot for quick setup
resource "aws_db_instance" "app" {
  identifier     = "db-${terraform.workspace}"
  instance_class = local.db_class

  # For feature branches, restore from a snapshot instead of creating empty
  snapshot_identifier = local.is_persistent ? null : "dev-seed-snapshot"

  skip_final_snapshot = true

  tags = {
    Name = "db-${terraform.workspace}"
  }
}
```

## Limitations and Considerations

**Resource name length limits.** AWS resource names have maximum lengths. If your branch names are long, the combined name might exceed limits. Always truncate workspace names.

**Shared resource conflicts.** Some resources are global (S3 bucket names, IAM role names). Make sure workspace prefixes keep them unique.

**Cost awareness.** Without cleanup automation, abandoned feature environments will run indefinitely. Always pair feature workspaces with automated cleanup.

**Secret management.** Feature environments need access to secrets. Use AWS Secrets Manager or similar tools rather than embedding secrets in your Terraform configuration.

## Conclusion

Feature branch workspaces give your team isolated environments for testing and development. The key ingredients are workspace-aware resource naming, CI/CD integration for automatic creation and cleanup, and cost control measures to prevent runaway spending. Start with a simple setup - an instance and a DNS record - then expand to include databases and other services as your team gets comfortable with the workflow. For managing variable files specific to each workspace, see our guide on [workspace-specific variable files](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-specific-variable-files-in-terraform/view).
