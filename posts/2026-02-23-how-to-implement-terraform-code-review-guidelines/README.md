# How to Implement Terraform Code Review Guidelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Code Review, Best Practices, Team Collaboration, DevOps

Description: Establish effective Terraform code review guidelines that catch infrastructure issues early while maintaining team velocity and code quality standards.

---

Code review for Terraform is fundamentally different from reviewing application code. When you review a Python function, you are checking logic and readability. When you review Terraform code, you are checking whether someone's changes will safely modify production infrastructure, cost the organization money, or expose systems to security vulnerabilities.

Many teams apply their general code review practices to Terraform without adaptation, and the results are predictable: reviews that miss critical infrastructure issues while focusing on trivial formatting details. This guide helps you build Terraform-specific review guidelines that catch what matters.

## Why Terraform Reviews Need Specific Guidelines

Terraform configurations describe desired infrastructure state. A reviewer needs to understand not just the code but also its effect on running systems. A one-line change to an instance type triggers a replacement that could cause 15 minutes of downtime. A missing lifecycle block on a database means Terraform could delete it during a routine refactor.

Without specific guidelines, reviewers default to checking syntax and style. These are the least important aspects of a Terraform review because automated tools handle them better than humans.

## The Three Layers of Terraform Review

Structure your review process around three layers, from most critical to least critical.

### Layer 1: Infrastructure Impact

This is the most important layer. Every reviewer should start by understanding what the change does to real infrastructure.

```markdown
# Review Checklist - Infrastructure Impact

## Resource Lifecycle
- Does this change destroy any existing resources?
- Does this change force replacement of any stateful resources?
- Are lifecycle rules properly configured?

## Dependencies
- Does this change affect resources used by other services?
- Are there implicit dependencies that could cause issues?
- Has the execution order been considered?

## State
- Does this change introduce any state conflicts?
- Are resources properly addressed in the state?
- Is the state backend configuration correct?
```

Reviewers should always check the Terraform plan output before approving:

```hcl
# Look for these warning signs in the plan:

# Force replacement - could cause downtime
-/+ resource "aws_db_instance" "main" {
    # This will destroy and recreate the database!
  }

# Unexpected changes - resources you did not intend to modify
~ resource "aws_lambda_function" "api" {
    # Why is this changing? Nobody modified this resource.
  }

# Large-scale changes - many resources affected at once
Plan: 0 to add, 47 to change, 0 to destroy.
# 47 changes from a small PR? Something might be wrong.
```

### Layer 2: Security and Compliance

The second layer focuses on security implications:

```markdown
# Review Checklist - Security

## Network Access
- Are security groups properly scoped?
- No CIDR blocks set to 0.0.0.0/0 without justification
- Private subnets used for internal resources

## Identity and Access
- IAM policies follow least privilege
- No wildcard actions or resources without justification
- Service roles are scoped to specific resources

## Data Protection
- Encryption enabled for storage resources
- KMS keys properly configured
- No secrets in plain text in configuration files

## Compliance
- Resources tagged according to organizational standards
- Logging enabled where required
- Backup policies configured for data stores
```

Security issues are easy to miss because they often look like normal configuration. Train reviewers to recognize patterns like these:

```hcl
# BAD: Overly permissive IAM policy
resource "aws_iam_policy" "app" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:*"      # Should be specific actions
      Resource = "*"          # Should be specific bucket ARN
    }]
  })
}

# GOOD: Least-privilege IAM policy
resource "aws_iam_policy" "app" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = [
        "s3:GetObject",
        "s3:PutObject",
      ]
      Resource = "${aws_s3_bucket.app.arn}/*"
    }]
  })
}
```

### Layer 3: Code Quality

The third layer covers readability, maintainability, and style. While less critical than the first two layers, it matters for long-term codebase health:

```markdown
# Review Checklist - Code Quality

## Structure
- Resources organized logically within files
- Module boundaries are clear and sensible
- No unnecessary duplication

## Naming
- Resource names are descriptive and consistent
- Variable names follow team conventions
- Output names clearly describe what they expose

## Documentation
- Complex logic is explained with comments
- Variable descriptions are helpful
- Module README is updated if interfaces changed

## Best Practices
- Variables have appropriate types and validation
- Outputs expose useful information
- Data sources used instead of hardcoded values
```

## Implementing the Review Process

### Create a Pull Request Template

Standardize the information PR authors provide:

```markdown
# Terraform Change Request

## What does this change do?
<!-- Describe the infrastructure change in plain language -->

## Why is this change needed?
<!-- Link to ticket, incident, or business requirement -->

## Plan Output
<!-- Paste or link to the terraform plan output -->

## Risk Assessment
- [ ] This change modifies production resources
- [ ] This change destroys or replaces resources
- [ ] This change modifies security configurations
- [ ] This change affects shared infrastructure

## Rollback Plan
<!-- How to revert this change if something goes wrong -->

## Testing
- [ ] Plan reviewed for unexpected changes
- [ ] Applied successfully in staging/dev
- [ ] Security scan passed
```

### Automate What Can Be Automated

Do not waste human review time on things machines can check:

```yaml
# .github/workflows/terraform-lint.yml
name: Terraform Lint

on:
  pull_request:

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Formatting check - do not waste reviewer time on this
      - name: Terraform Format
        run: terraform fmt -check -recursive

      # Static analysis catches common mistakes
      - name: TFLint
        uses: terraform-linters/setup-tflint@v4
      - run: |
          tflint --init
          tflint --recursive

      # Security scanning catches policy violations
      - name: tfsec
        uses: aquasecurity/tfsec-action@v1.0.3

      # Cost estimation helps reviewers assess financial impact
      - name: Infracost
        uses: infracost/actions/setup@v3
      - run: infracost breakdown --path . --format json > /tmp/infracost.json
```

When these checks pass automatically, reviewers can focus on the three layers described above instead of counting spaces.

### Define Response Time Expectations

Set clear expectations for review turnaround:

```markdown
# Review SLA by Change Type

| Change Type | Response Time | Approvals Required |
|------------|---------------|-------------------|
| Critical hotfix | 30 minutes | 1 senior engineer |
| Production change | 4 hours | 2 platform engineers |
| Staging change | 8 hours | 1 platform engineer |
| Module update | 24 hours | 1 module maintainer |
| Documentation only | 48 hours | 1 team member |
```

### Train Reviewers

Not every engineer knows how to review Terraform effectively. Invest in training:

1. Pair new reviewers with experienced ones for the first month
2. Create a library of example reviews showing good and bad patterns
3. Hold monthly review calibration sessions where the team reviews a PR together
4. Document common issues and how to spot them

## Common Review Mistakes

### Approving Without Checking the Plan

The plan is the single most important piece of information in a Terraform review. Never approve a PR without reading the plan output. If the plan is not attached, request it.

### Focusing Only on Changed Lines

Terraform resources have implicit relationships. A change to a security group might be fine in isolation but problematic in the context of the resources that reference it. Look beyond the diff.

### Ignoring Cost Implications

A reviewer who approves a change from `t3.micro` to `r5.4xlarge` without questioning it is not doing their job. Use cost estimation tools and ask about the business justification for expensive changes.

### Rubber-Stamping Module Versions

When a module version is bumped, reviewers often approve without checking what changed in the new version. Always review the module changelog for breaking changes or behavior differences.

For more on establishing team standards, see our guide on [creating Terraform style guides for teams](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-style-guides-for-teams/view).

## Measuring Review Effectiveness

Track metrics to understand how well your review process is working:

- Time to first review
- Number of review rounds before approval
- Incidents caused by changes that passed review
- Review coverage (percentage of changes that get meaningful review)

Use monitoring tools like OneUptime to correlate Terraform changes with infrastructure incidents. If reviewed changes frequently cause problems, your review process needs improvement.

Good Terraform review guidelines balance thoroughness with velocity. They ensure that critical issues are caught without turning every PR into a week-long debate. Start with the three-layer approach, automate what you can, and continuously refine based on what your team learns from production incidents.
