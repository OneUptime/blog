# How to Create Terraform Onboarding Guides for New Team Members

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Onboarding, Documentation, DevOps, Training

Description: Learn how to create effective Terraform onboarding guides that help new team members become productive quickly with your organization's infrastructure as code practices and conventions.

---

New team members joining an organization that uses Terraform face a steep learning curve. They need to understand not just Terraform itself, but your organization's specific conventions, modules, workflows, and tooling. A well-crafted onboarding guide bridges this gap, transforming weeks of confusion into days of productive ramp-up.

In this guide, we will cover how to create onboarding materials that get new team members writing Terraform confidently and correctly.

## Structuring the Onboarding Program

Break the onboarding into progressive stages that build on each other:

```yaml
# onboarding/program-structure.yaml
# Terraform onboarding program for new team members

program:
  week_1:
    name: "Foundations"
    goals:
      - Understand our infrastructure architecture
      - Set up local development environment
      - Run terraform plan on a dev workspace
      - Read and understand existing modules
    activities:
      - Complete environment setup guide
      - Pair with buddy on infrastructure walkthrough
      - Review 3 recent infrastructure PRs
      - Complete Terraform basics tutorial

  week_2:
    name: "First Changes"
    goals:
      - Make a simple infrastructure change
      - Submit first PR with terraform changes
      - Understand our CI/CD pipeline
      - Learn our module library
    activities:
      - Add tags to existing resources (starter task)
      - Walk through CI/CD pipeline with buddy
      - Explore internal module catalog
      - Complete intermediate tutorial

  week_3:
    name: "Independent Work"
    goals:
      - Handle a real infrastructure request
      - Use shared modules in a new deployment
      - Understand state management practices
      - Debug a terraform plan issue
    activities:
      - Complete first independent task from backlog
      - Create a small deployment using shared modules
      - Practice state operations in sandbox
      - Attend Terraform office hours

  week_4:
    name: "Full Contributor"
    goals:
      - Work independently on infrastructure tasks
      - Review other team members' PRs
      - Understand cross-team dependencies
      - Know when and how to ask for help
    activities:
      - Handle infrastructure tasks independently
      - Review at least 2 PRs from other team members
      - Document one thing you learned
      - Complete onboarding feedback survey
```

## Creating the Environment Setup Guide

The first thing a new team member needs is a working environment:

```markdown
# Environment Setup Guide

## Prerequisites

Install the following tools:

### 1. Terraform
```bash
# macOS
brew install terraform

# Verify installation
terraform version
# Expected: Terraform v1.6.x or later
```

### 2. AWS CLI
```bash
# macOS
brew install awscli

# Configure your profile
aws configure --profile myorg-dev
# Use the access key ID and secret from your onboarding email
```

### 3. TFLint
```bash
brew install tflint
tflint --init
```

### 4. Pre-commit
```bash
pip install pre-commit
cd /path/to/infrastructure-repo
pre-commit install
```

## Repository Setup

```bash
# Clone the infrastructure repository
git clone git@github.com:myorg/infrastructure.git
cd infrastructure

# Install pre-commit hooks
pre-commit install

# Verify you can access the dev environment
cd teams/YOUR_TEAM/development
terraform init
terraform plan
# You should see "No changes. Your infrastructure matches the configuration."
```
```text

## Writing the Architecture Overview

New team members need context about the overall infrastructure:

```yaml
# onboarding/architecture-overview.yaml
# High-level infrastructure architecture for new team members

architecture:
  accounts:
    - name: "production"
      id: "123456789012"
      purpose: "All production workloads"
      access: "Read-only for most teams, write for platform team"

    - name: "staging"
      id: "234567890123"
      purpose: "Pre-production testing"
      access: "Write access for all teams"

    - name: "development"
      id: "345678901234"
      purpose: "Development and experimentation"
      access: "Full access for all teams"

  key_components:
    networking:
      description: "VPCs, subnets, NAT gateways, VPN connections"
      managed_by: "platform-team"
      location: "shared/networking/"

    compute:
      description: "ECS clusters, Lambda functions, EC2 instances"
      managed_by: "individual teams"
      location: "teams/{team-name}/compute/"

    databases:
      description: "RDS instances, DynamoDB tables, ElastiCache"
      managed_by: "individual teams with DBA review"
      location: "teams/{team-name}/databases/"

  conventions:
    naming: "{team}-{service}-{environment}-{resource}"
    tagging:
      required: ["Team", "Environment", "Service", "ManagedBy"]
    modules: "Use shared modules from modules/internal/ when available"
```

## Creating Hands-On Tutorials

Build tutorials that use your actual infrastructure:

```hcl
# onboarding/tutorials/01-first-plan/main.tf
# Tutorial 1: Your First Terraform Plan
#
# In this tutorial, you will:
# 1. Initialize a Terraform workspace
# 2. Run a plan against the dev environment
# 3. Understand the plan output
#
# Instructions:
# 1. cd to this directory
# 2. Run: terraform init
# 3. Run: terraform plan -var-file=dev.tfvars
# 4. Read the output carefully - do NOT run apply

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }

  # This uses the sandbox backend - safe to experiment
  backend "s3" {
    bucket = "myorg-terraform-sandbox"
    key    = "onboarding/tutorial-01/terraform.tfstate"
    region = "us-east-1"
  }
}

# This creates a simple S3 bucket in the sandbox account
resource "aws_s3_bucket" "tutorial" {
  # YOUR_NAME will be replaced with your actual name
  bucket = "myorg-onboarding-${var.your_name}-tutorial-01"

  tags = {
    Team        = var.team
    Environment = "sandbox"
    ManagedBy   = "terraform"
    Purpose     = "onboarding-tutorial"
  }
}

variable "your_name" {
  description = "Your first name (lowercase, no spaces)"
  type        = string
}

variable "team" {
  description = "Your team name"
  type        = string
}
```

## Building a Common Mistakes Guide

Document the mistakes that new team members commonly make:

```markdown
# Common Terraform Mistakes and How to Avoid Them

## Mistake 1: Running terraform apply without reviewing the plan
ALWAYS review the plan output before applying. Look for:
- Resources being destroyed (marked with -)
- Unexpected changes (marked with ~)
- Resources being recreated (marked with -/+)

## Mistake 2: Editing state files directly
NEVER edit .tfstate files by hand. If you need to modify state:
- Use `terraform state mv` to rename resources
- Use `terraform state rm` to remove resources from state
- Use `terraform import` to add existing resources to state
- Always backup state before any state operation

## Mistake 3: Hardcoding values instead of using variables
BAD:
```hcl
resource "aws_instance" "web" {
  instance_type = "t3.medium"  # Hardcoded
  ami           = "ami-12345"  # Hardcoded
}
```

GOOD:
```hcl
resource "aws_instance" "web" {
  instance_type = var.instance_type
  ami           = data.aws_ami.latest.id
}
```

## Mistake 4: Not using our shared modules
Before writing a new resource configuration, check our
module catalog at modules/internal/. Chances are someone
has already built a tested, approved module for what you need.

## Mistake 5: Forgetting to run terraform fmt before committing
Our pre-commit hooks should catch this, but if you see
formatting errors in CI, run:
```bash
terraform fmt -recursive
```
```text

## Creating a Cheat Sheet

Give new team members a quick reference they can keep handy:

```markdown
# Terraform Quick Reference

## Daily Commands
| Command | What it does |
|---------|-------------|
| terraform init | Initialize workspace, download providers |
| terraform plan | Preview changes without applying |
| terraform apply | Apply changes (requires confirmation) |
| terraform fmt | Format code to standard style |
| terraform validate | Check syntax without accessing providers |

## Our Workflow
1. Create a branch from main
2. Make your changes in teams/YOUR_TEAM/
3. Run terraform plan locally to verify
4. Push and create a PR
5. CI runs plan automatically and posts results
6. Get required approvals
7. Merge to main - CI runs apply automatically

## Getting Help
- Slack: #terraform-help (response within 4 hours)
- Office Hours: Tuesdays 2-3pm
- Documentation: wiki.internal/terraform
- Your buddy: [assigned during onboarding]

## Important Links
- Module Catalog: registry.internal/modules
- Standards Document: wiki.internal/terraform/standards
- CI Pipeline: github.com/myorg/infrastructure/actions
- State Buckets: s3://myorg-terraform-state/
```

## Implementing a Buddy System

Pair each new team member with an experienced Terraform user:

```yaml
# onboarding/buddy-program.yaml
# Buddy system for Terraform onboarding

buddy_responsibilities:
  - Walk through the infrastructure architecture
  - Review the new member's first 5 PRs
  - Answer questions during the first 4 weeks
  - Introduce to other team members and stakeholders
  - Share tribal knowledge not captured in docs

buddy_schedule:
  week_1:
    - "Day 1: 1-hour architecture walkthrough"
    - "Day 2: Pair on environment setup"
    - "Day 3: Review first tutorial together"
    - "Day 5: Check-in meeting"
  week_2:
    - "Day 1: Walk through CI/CD pipeline"
    - "Day 3: Pair on first real change"
    - "Day 5: Check-in meeting"
  week_3:
    - "Day 3: Review independent work"
    - "Day 5: Check-in meeting"
  week_4:
    - "Day 3: Discuss areas for growth"
    - "Day 5: Final check-in and feedback"
```

## Measuring Onboarding Effectiveness

Track how well the onboarding program works:

```python
# scripts/onboarding-metrics.py
# Track onboarding program effectiveness

onboarding_metrics = {
    "time_to_first_pr": {
        "target_days": 5,
        "average_days": 3.8,
        "trend": "improving"
    },
    "time_to_independent_work": {
        "target_days": 21,
        "average_days": 18.5,
        "trend": "stable"
    },
    "first_month_pr_count": {
        "target": 8,
        "average": 10.2,
        "trend": "improving"
    },
    "onboarding_satisfaction": {
        "target": 4.0,
        "average": 4.3,
        "scale": "1-5",
        "trend": "stable"
    },
    "common_feedback": [
        "Architecture overview was very helpful",
        "Wish there were more hands-on tutorials",
        "Buddy system is great",
        "Module catalog needs better search"
    ]
}
```

## Keeping Onboarding Materials Current

Onboarding guides decay quickly if not maintained:

```yaml
# onboarding/maintenance.yaml
# Schedule for keeping onboarding materials current

review_schedule:
  monthly:
    - Verify all links and references work
    - Update version numbers for tools
    - Check tutorial environments are working

  quarterly:
    - Review feedback from recent new hires
    - Update architecture diagrams
    - Add new common mistakes
    - Refresh hands-on tutorials

  annually:
    - Complete overhaul of onboarding program
    - Update all screenshots and examples
    - Review and update buddy program
    - Benchmark against industry best practices
```

## Best Practices

Start with the "why" before the "how." New team members need to understand why the organization uses Terraform and why specific conventions exist before they can internalize the practices.

Make the first experience positive. If setting up the environment takes a full day and the first tutorial is broken, you have already lost momentum. Invest in making the first day smooth.

Use real infrastructure in tutorials, not toy examples. New team members should practice on the same infrastructure they will work on, in a safe sandbox environment.

Collect and act on feedback. Every new hire has a fresh perspective on what is confusing or missing. Capture that feedback and use it to improve the onboarding experience.

Assign buddies intentionally. The buddy should be someone patient, knowledgeable, and available. A great buddy can make the difference between a new hire who thrives and one who struggles.

## Conclusion

Effective Terraform onboarding guides reduce the time it takes for new team members to become productive contributors. By structuring the onboarding into progressive stages, providing hands-on tutorials, documenting common mistakes, and implementing a buddy system, you create an environment where new team members can learn your organization's Terraform practices quickly and confidently.
