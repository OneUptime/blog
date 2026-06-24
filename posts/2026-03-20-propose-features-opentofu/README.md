# How to Propose Features for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Feature Proposals, Open Source, RFC, Community, GitHub

Description: Learn how to propose new features for OpenTofu through GitHub discussions, RFCs, and the community process to maximize the chance of your proposal being accepted.

## Introduction

OpenTofu is community-driven and welcomes feature proposals. However, a well-structured proposal that explains the problem, motivates the solution, and considers alternatives is far more likely to be accepted than a vague request. This guide covers how to write effective feature proposals.

## Before Proposing

```bash
# 1. Search existing issues and discussions to avoid duplicates

# https://github.com/opentofu/opentofu/issues
# https://github.com/opentofu/opentofu/discussions

# 2. Check open milestones and related issue labels
# https://github.com/opentofu/opentofu/milestones
# https://github.com/opentofu/opentofu/labels

# 3. Review the feature request template and RFC process
# https://github.com/opentofu/opentofu/blob/main/.github/ISSUE_TEMPLATE/feature_request.yml
# https://github.com/opentofu/opentofu/blob/main/rfc/README.md
```

## Types of Feature Proposals

Small and medium features → GitHub Issue using the feature request template
Complex features that need deeper design review → RFC (Request for Comments), usually after maintainers add the `needs-rfc` label
GitHub Discussions → Optional for early feedback or clarifying questions

## Writing a GitHub Issue Feature Request

````markdown
## Feature Request: Allow provider `for_each` to refer to data sources or child module outputs

### OpenTofu Version
```text
paste output of `tofu version`
```

### The problem in your OpenTofu project
I'm attempting to fetch a list of AWS account IDs from remote state and
dynamically generate one provider instance per account. OpenTofu supports
`for_each` on aliased `provider` blocks, but the `for_each` value must be
available in the static context used to configure providers.

### Attempted Solutions

```hcl
data "terraform_remote_state" "org" {
  backend = "s3"
  config = {
    bucket = var.s3_bucket_name
    key    = "terraform-aws-org/terraform.tfstate"
    region = var.aws_region
  }
}

locals {
  account_ids = values(data.terraform_remote_state.org.outputs.member_account_ids)
}

provider "aws" {
  alias    = "child"
  for_each = toset(local.account_ids)

  region = var.aws_region
  assume_role {
    role_arn     = "arn:aws:iam::${each.key}:role/OrganizationAccountAccessRole"
    session_name = "TerraformSession-${each.key}"
  }
}
```

### Proposal
Allow provider `for_each` to accept collections derived from data sources
or child module outputs when that information is available during planning.

### Workarounds and Alternatives
- Declare provider instances statically
- Split account discovery and account-specific infrastructure into separate configurations
- Generate provider blocks outside OpenTofu before running `tofu plan`

### References
- Link related issues, discussions, and prior art
````

## Writing an RFC for Large Features

For features requiring design review, use the RFC process after maintainers
identify that an issue needs one.

```markdown
# Allow provider `for_each` to refer to data sources or child module outputs

Issue: https://github.com/opentofu/opentofu/issues/2155

A short description of the problem that is trying to be solved, with links
to existing documentation, issue discussion, and code examples.

Background on the issue and any related prior art.

## Proposed Solution

### User Documentation
[Describe the user-facing behavior, configuration examples, and docs changes]

### Technical Approach
[Describe the design, implementation approach, limitations, and impacts]

### Open Questions
[List questions that still need community or maintainer input]

### Future Considerations
[Describe follow-up work or related features to keep in mind]

## Potential Alternatives
[Compare other approaches and explain tradeoffs]
```

File the RFC at:
```bash
# After the issue gets a `needs-rfc` label, fork the repo and add your RFC
cp rfc/yyyymmdd-template.md rfc/20260424-provider-for-each-static-context.md
# Edit the file, then open a draft PR
```

## Following Up on Your Proposal

```markdown
# Checklist for proposal follow-up:
# - Respond to questions within a few days
# - Provide additional context if asked
# - Offer to prototype an implementation
# - Link to related issues or prior art
# - Update the proposal based on feedback
```

## Summary

Effective OpenTofu feature proposals clearly state the problem being solved, show the current limitation with concrete examples, document workarounds and alternatives, and link related issues or prior art. In the current OpenTofu process, most feature ideas start as a GitHub issue using the feature request template, and more complex design work moves to an RFC when maintainers ask for one.
