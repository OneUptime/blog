# How to Set Up Code Owners for Terraform Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Code Owners, Team Collaboration, DevOps, Git

Description: Configure CODEOWNERS files for Terraform repositories to enforce ownership boundaries and ensure the right teams review infrastructure changes.

---

As Terraform repositories grow, it becomes critical to know who is responsible for each piece of infrastructure. Without clear ownership, changes to networking configurations might be reviewed by someone who only understands compute resources, or database modifications might be approved by an engineer who has never managed a production database.

The CODEOWNERS file solves this problem by mapping file paths to responsible teams or individuals. When combined with branch protection rules, it ensures that every pull request is reviewed by someone who actually understands the infrastructure being changed.

## What is CODEOWNERS?

CODEOWNERS is a file in your repository that defines which users or teams are responsible for specific files and directories. When a pull request modifies files that match a CODEOWNERS pattern, the defined owners are automatically requested as reviewers.

GitHub, GitLab, and Bitbucket all support some form of code ownership, though the implementation details differ.

## Designing Ownership Boundaries

Before writing your CODEOWNERS file, decide how you want to divide ownership. Common strategies include:

### By Infrastructure Domain

Assign ownership based on the type of infrastructure:

```text
# Networking team owns all VPC, subnet, and routing configs
/modules/networking/           @org/networking-team
/environments/*/networking.tf  @org/networking-team

# Database team owns all RDS, DynamoDB, and ElastiCache configs
/modules/database/             @org/database-team
/environments/*/database.tf    @org/database-team

# Security team owns IAM, KMS, and security group configs
/modules/security/             @org/security-team
/environments/*/security.tf    @org/security-team
```

### By Environment

Assign stricter ownership for production environments:

```text
# Anyone on the platform team can review staging changes
/environments/staging/    @org/platform-team

# Production requires senior engineers
/environments/production/ @org/platform-leads

# Development is open to all infrastructure engineers
/environments/dev/        @org/infrastructure-team
```

### By Module vs. Environment

Separate ownership between module developers and environment operators:

```text
# Module maintainers review module changes
/modules/  @org/module-maintainers

# Operations team reviews environment-specific configurations
/environments/  @org/operations-team
```

## Creating the CODEOWNERS File

Place the CODEOWNERS file in one of these locations (GitHub checks them in order):

```text
# Option 1: Root of the repository
/CODEOWNERS

# Option 2: .github directory (most common)
/.github/CODEOWNERS

# Option 3: docs directory
/docs/CODEOWNERS
```

Here is a comprehensive example for a Terraform repository:

```text
# .github/CODEOWNERS

# Default owners for everything in the repo
# These are the fallback reviewers when no more specific rule matches
*  @org/platform-team

# Core Terraform configuration
# Changes to provider versions, backend config, or required versions
# affect the entire infrastructure and need careful review
versions.tf        @org/platform-leads
backend.tf         @org/platform-leads
providers.tf       @org/platform-leads

# Lock file changes should be reviewed by platform leads
# to prevent accidental provider downgrades
.terraform.lock.hcl  @org/platform-leads

# Module definitions
/modules/networking/    @org/networking-team @org/platform-leads
/modules/compute/       @org/compute-team
/modules/database/      @org/database-team @org/database-leads
/modules/monitoring/    @org/observability-team
/modules/security/      @org/security-team
/modules/storage/       @org/storage-team

# Environment configurations
/environments/production/    @org/platform-leads
/environments/staging/       @org/platform-team
/environments/development/   @org/infrastructure-team

# CI/CD pipeline configurations
/.github/workflows/    @org/platform-leads @org/devops-team
/.gitlab-ci.yml        @org/platform-leads @org/devops-team

# Variable definitions and tfvars files
# These often contain environment-specific values
*.tfvars  @org/platform-team

# Documentation
/docs/  @org/platform-team
```

## CODEOWNERS Pattern Syntax

Understanding pattern syntax is essential for effective ownership rules:

```text
# Exact file match
Makefile  @org/devops-team

# All files with a specific extension
*.tf  @org/platform-team

# Directory and all its contents (recursive)
/modules/networking/  @org/networking-team

# Files in a directory (not recursive)
/environments/production/*.tf  @org/platform-leads

# Multiple owners - all teams are requested for review
/modules/security/  @org/security-team @org/platform-leads

# Wildcard in directory names
/environments/*/backend.tf  @org/platform-leads

# Negation is NOT supported in CODEOWNERS
# You cannot exclude files from a broader pattern
```

Rules are processed from top to bottom, and the last matching rule wins. Place more specific rules after general ones:

```text
# General rule: platform team reviews all .tf files
*.tf  @org/platform-team

# Specific rule: networking team reviews networking module
# This overrides the general rule above for these files
/modules/networking/*.tf  @org/networking-team
```

## Enforcing Code Ownership in Branch Protection

The CODEOWNERS file is only useful when combined with branch protection rules that enforce reviews:

```text
# GitHub branch protection settings for main branch:
# - Require a pull request before merging: YES
# - Require review from Code Owners: YES
# - Required approving reviews: 1 (or more)
# - Dismiss stale pull request approvals: YES
```

Without the "Require review from Code Owners" setting, the CODEOWNERS file only suggests reviewers. It does not enforce them.

## GitLab Code Owners Configuration

GitLab uses a similar but slightly different format:

```text
# CODEOWNERS file for GitLab
# Uses sections for different approval rules

[Infrastructure Core]
*.tf @platform-leads
backend.tf @platform-leads
versions.tf @platform-leads

[Networking]
/modules/networking/ @networking-team

[Security] @security-team
/modules/security/
/environments/*/security.tf

[Production]
/environments/production/ @platform-leads
```

GitLab also supports optional code owners that are suggested but not required:

```text
# Optional owner - suggested but not required
^[Documentation]
/docs/ @technical-writers
```

## Handling Cross-Team Changes

Some changes span multiple ownership boundaries. For example, adding a new service might require changes to networking, compute, and database configurations. In this case, multiple teams will be requested for review:

```text
# A PR that touches these files will require reviews from all three teams:
# /modules/networking/service_endpoints.tf  -> @org/networking-team
# /modules/compute/ecs_service.tf           -> @org/compute-team
# /modules/database/rds_instance.tf         -> @org/database-team
```

This is actually a feature, not a problem. Cross-team changes should get cross-team review. However, it can slow down development if the teams are not responsive.

Set expectations for review turnaround time:

```markdown
# Team Review SLA
- Security-related changes: 4 hours
- Production changes: 8 hours
- Staging/Development changes: 24 hours
- Documentation-only changes: 48 hours
```

## Maintaining the CODEOWNERS File

The CODEOWNERS file itself should be owned and maintained:

```text
# Meta: CODEOWNERS file is owned by platform leads
/.github/CODEOWNERS  @org/platform-leads
```

Review the CODEOWNERS file quarterly to ensure it reflects your current team structure. When teams are reorganized or new infrastructure domains are added, update the file accordingly.

You can validate the CODEOWNERS file in your CI pipeline:

```yaml
# .github/workflows/validate-codeowners.yml
name: Validate CODEOWNERS

on:
  pull_request:
    paths:
      - '.github/CODEOWNERS'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate CODEOWNERS
        run: |
          # Check that all referenced teams exist
          # Check that all file patterns match at least one file
          # This is a simplified check - use a dedicated tool for production
          while IFS= read -r line; do
            # Skip comments and empty lines
            [[ "$line" =~ ^#.*$ ]] && continue
            [[ -z "$line" ]] && continue
            # Extract the file pattern
            pattern=$(echo "$line" | awk '{print $1}')
            # Check if the pattern matches any files
            if ! ls $pattern 2>/dev/null | head -1 > /dev/null; then
              echo "WARNING: Pattern '$pattern' does not match any files"
            fi
          done < .github/CODEOWNERS
```

## Common Pitfalls

Do not make ownership too granular. If every file has a different owner, PRs will require reviews from a dozen teams. Keep ownership at the directory or module level.

Do not forget to update CODEOWNERS when you add new directories. New modules or environments without ownership rules fall through to the default owner, which may not be the right team.

Do not assign ownership to individuals. Use team handles instead. When someone leaves the team, individual ownership assignments become blockers.

For more on managing team ownership of Terraform code, see our guide on [Terraform module ownership in organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-module-ownership-in-organizations/view).

A well-maintained CODEOWNERS file is a living document that reflects your organization's structure and expertise. It turns the abstract question of "who should review this?" into an automated, enforceable process.
