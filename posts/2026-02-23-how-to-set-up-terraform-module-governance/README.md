# How to Set Up Terraform Module Governance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Governance, Best Practices, Infrastructure as Code

Description: Establish a Terraform module governance framework that ensures quality, security, and consistency across your organization's shared infrastructure modules.

---

As Terraform adoption grows across an organization, the number of shared modules multiplies rapidly. Without governance, teams create duplicate modules, publish modules with security flaws, or abandon modules that other teams depend on. Module governance provides the structure needed to maintain quality and consistency at scale.

This guide walks through building a governance framework from scratch, covering module standards, review processes, publishing workflows, and ongoing maintenance requirements.

## What Module Governance Covers

Module governance is the set of policies, processes, and tools that control how modules are created, reviewed, published, maintained, and retired. It answers questions like: Who can publish a module to the internal registry? What quality standards must a module meet? How are breaking changes communicated?

Without governance, you get the wild west. Every team creates their own VPC module with slightly different interfaces. Nobody knows which module is the "official" one. Security vulnerabilities go unpatched because the module author left the company six months ago.

## Establishing Module Standards

Define minimum requirements that every module must meet before publication:

```hcl
# Module Quality Standards

# 1. Structure Requirements
# Every module must have these files:
# - main.tf          Resources
# - variables.tf     Input variables with types and descriptions
# - outputs.tf       Output values with descriptions
# - versions.tf      Required provider and Terraform versions
# - README.md        Usage documentation
# - CHANGELOG.md     Version history

# 2. Variable Standards
# All variables must have types and descriptions
variable "name" {
  type        = string
  description = "Name prefix for all resources created by this module."

  validation {
    condition     = length(var.name) > 0 && length(var.name) <= 64
    error_message = "Name must be between 1 and 64 characters."
  }
}

# 3. Output Standards
# All outputs must have descriptions
output "id" {
  description = "The ID of the primary resource created by this module."
  value       = aws_vpc.main.id
}

# 4. Tagging Standards
# All taggable resources must include standard tags
locals {
  default_tags = {
    ManagedBy = "terraform"
    Module    = "networking"
    ModuleVersion = "2.1.0"
  }
}
```

### Automated Standards Enforcement

Create a CI pipeline that validates modules against your standards:

```yaml
# .github/workflows/module-governance.yml
name: Module Governance Checks

on:
  pull_request:
    paths:
      - 'modules/**'

jobs:
  structure-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Required Files
        run: |
          # Find all modules that were changed
          CHANGED_MODULES=$(git diff --name-only origin/main | \
            grep '^modules/' | \
            cut -d'/' -f1-2 | sort -u)

          for module in $CHANGED_MODULES; do
            echo "Checking $module..."

            # Verify required files exist
            for file in main.tf variables.tf outputs.tf versions.tf README.md; do
              if [ ! -f "$module/$file" ]; then
                echo "ERROR: $module is missing $file"
                exit 1
              fi
            done

            # Verify all variables have descriptions
            cd "$module"
            terraform-docs check . || {
              echo "ERROR: Missing documentation in $module"
              exit 1
            }
            cd -
          done

  security-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Security Scan
        uses: aquasecurity/tfsec-action@v1.0.3
        with:
          working_directory: modules/

  lint-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Format Check
        run: terraform fmt -check -recursive modules/

      - name: TFLint
        uses: terraform-linters/setup-tflint@v4
      - run: |
          tflint --init
          cd modules && tflint --recursive
```

## Module Review Process

Every module change should go through a structured review:

```markdown
# Module Review Requirements

## New Module Submission
1. Architecture review - does this module serve a clear purpose?
2. Interface review - are inputs/outputs well-designed?
3. Security review - no hardcoded credentials, proper encryption
4. Documentation review - README complete and accurate
5. Test review - are there meaningful tests?

Required approvals:
- Module maintainer (if updating existing module)
- Platform team member
- Security team member (for security-sensitive modules)

## Existing Module Update
1. Backward compatibility check
2. Changelog updated
3. Tests pass
4. Documentation updated

Required approvals:
- Module maintainer
- One additional reviewer
```

### Semantic Versioning Enforcement

Enforce semantic versioning for all modules:

```bash
#!/bin/bash
# scripts/check-version-bump.sh
# Ensures version is bumped appropriately for the type of change

MODULE_PATH=$1
CURRENT_VERSION=$(git show origin/main:$MODULE_PATH/versions.tf | \
  grep 'module_version' | \
  grep -oP '\d+\.\d+\.\d+')

NEW_VERSION=$(grep 'module_version' $MODULE_PATH/versions.tf | \
  grep -oP '\d+\.\d+\.\d+')

if [ "$CURRENT_VERSION" == "$NEW_VERSION" ]; then
  echo "ERROR: Module version was not bumped"
  echo "Current version: $CURRENT_VERSION"
  echo "Bump the version according to semver:"
  echo "  - MAJOR: Breaking interface changes"
  echo "  - MINOR: New features, backward compatible"
  echo "  - PATCH: Bug fixes, backward compatible"
  exit 1
fi

echo "Version bump: $CURRENT_VERSION -> $NEW_VERSION"
```

## Module Registry Management

Use an internal module registry to publish and discover modules:

### Terraform Cloud Private Registry

```hcl
# Publishing to Terraform Cloud private registry
# terraform-cloud/module-publishing.tf

resource "tfe_registry_module" "networking" {
  organization = "acme-corp"

  vcs_repo {
    display_identifier = "acme-corp/terraform-aws-networking"
    identifier         = "acme-corp/terraform-aws-networking"
    oauth_token_id     = var.github_oauth_token_id
  }
}
```

### Self-Hosted Registry Alternative

If you do not use Terraform Cloud, set up a simple registry using S3 and API Gateway:

```hcl
# Module publishing workflow
# packages modules and uploads to S3 for consumption

# modules are consumed via S3 source
module "networking" {
  source = "s3::https://s3-us-east-1.amazonaws.com/company-modules/networking/v2.1.0.zip"
}
```

## Module Testing Requirements

Governance should include testing standards:

```hcl
# tests/networking_test.go (using Terratest)
# Every module must have at least:
# 1. A validation test (terraform validate)
# 2. A plan test (terraform plan succeeds)
# 3. An integration test (for critical modules)

# Example Terratest for a networking module
package test

import (
  "testing"
  "github.com/gruntwork-io/terratest/modules/terraform"
  "github.com/stretchr/io/terratest/modules/aws"
)

func TestNetworkingModule(t *testing.T) {
  terraformOptions := &terraform.Options{
    TerraformDir: "../modules/networking",
    Vars: map[string]interface{}{
      "vpc_cidr":     "10.99.0.0/16",
      "environment":  "test",
      "name_prefix":  "governance-test",
    },
  }

  // Clean up after test
  defer terraform.Destroy(t, terraformOptions)

  // Create the resources
  terraform.InitAndApply(t, terraformOptions)

  // Verify outputs
  vpcId := terraform.Output(t, terraformOptions, "vpc_id")
  if vpcId == "" {
    t.Fatal("Expected non-empty VPC ID")
  }
}
```

## Deprecation and Sunset Policy

Define how modules are deprecated and eventually removed:

```markdown
# Module Deprecation Policy

## Phase 1: Deprecation Notice (Month 0)
- Add deprecation notice to README
- Add deprecation warning output to module
- Notify all known consumers via email and Slack
- Create migration guide to replacement module

## Phase 2: Soft Sunset (Month 3)
- CI pipeline warns when deprecated module is used
- No new features added, security patches only
- Active outreach to remaining consumers

## Phase 3: Hard Sunset (Month 6)
- CI pipeline fails when deprecated module is used in new code
- Existing usage still works but is not supported
- Final notification to remaining consumers

## Phase 4: Removal (Month 9)
- Module removed from registry
- Source code archived (not deleted)
- Any remaining consumers must have migrated
```

## Governance Committee

For larger organizations, establish a governance committee:

```markdown
# Terraform Module Governance Committee

## Composition
- 1 representative from Platform Team (chair)
- 1 representative from Security Team
- 2 rotating representatives from consumer teams
- 1 representative from Architecture Team

## Responsibilities
- Review and approve new module proposals
- Resolve ownership disputes
- Set and update governance policies
- Review quarterly module health reports

## Meeting Cadence
- Monthly governance review meeting
- Ad-hoc meetings for urgent decisions
- Quarterly policy review and update
```

## Measuring Governance Effectiveness

Track metrics to understand whether your governance is working:

```markdown
# Governance Metrics

## Quality Metrics
- Percentage of modules passing all automated checks
- Number of security issues found in production modules
- Average time to patch security vulnerabilities

## Adoption Metrics
- Number of teams using the internal module registry
- Percentage of infrastructure using governed modules vs. ad-hoc code
- Number of duplicate modules (should decrease over time)

## Velocity Metrics
- Average time from module proposal to publication
- Average time for module change review
- Number of breaking changes per quarter
```

For related topics, see our guide on [handling Terraform module ownership in organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-module-ownership-in-organizations/view).

Module governance is about finding the right balance between control and velocity. Too little governance leads to chaos. Too much governance leads to teams bypassing the system entirely. Start with lightweight standards, enforce them automatically, and add process only when you have evidence that it is needed.
