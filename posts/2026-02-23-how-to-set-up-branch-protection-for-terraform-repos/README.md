# How to Set Up Branch Protection for Terraform Repos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Git, Branch Protection, DevOps, Infrastructure as Code

Description: Configure branch protection rules for Terraform repositories to prevent unauthorized infrastructure changes and enforce code review requirements.

---

Branch protection rules are your last line of defense against accidental or unauthorized infrastructure changes. In a Terraform repository, where every merged commit can alter production infrastructure, branch protection is not optional. It is essential. Without these rules, a single force push or an unreviewed merge could destroy databases, expose private networks, or break critical services.

This guide covers how to configure branch protection for Terraform repositories on GitHub, GitLab, and Bitbucket, with specific recommendations for infrastructure-as-code workflows.

## Why Branch Protection Matters for Terraform

Application code typically goes through multiple deployment stages before reaching users. Terraform code often has a more direct path to production. When a commit lands on the main branch, it may trigger an automatic apply that modifies live infrastructure within minutes.

This directness is both a strength and a risk. Branch protection rules add the necessary friction to prevent costly mistakes while still allowing your team to move quickly.

## GitHub Branch Protection Configuration

GitHub provides comprehensive branch protection through its repository settings. Here is how to configure it for a Terraform repository.

### Basic Protection Rules

Navigate to your repository settings, then to Branches, and add a branch protection rule for your main branch:

```text
Branch name pattern: main

Required settings:
- Require a pull request before merging: YES
  - Required approving reviews: 2
  - Dismiss stale pull request approvals: YES
  - Require review from Code Owners: YES
- Require status checks to pass before merging: YES
  - Required checks:
    - terraform-validate
    - terraform-plan
    - terraform-security-scan
- Require branches to be up to date before merging: YES
- Require signed commits: YES (recommended)
- Include administrators: YES
- Restrict who can push to matching branches: YES
```

The "Dismiss stale pull request approvals" setting is particularly important for Terraform. When new commits are pushed after a review, the plan output may change. Dismissing stale approvals forces a re-review of the updated plan.

### Configuring Required Status Checks

Your CI pipeline should define the status checks that branch protection enforces:

```yaml
# .github/workflows/terraform-checks.yml
name: Terraform Checks

on:
  pull_request:
    branches: [main]
    paths:
      - '**/*.tf'
      - '**/*.tfvars'
      - '.terraform.lock.hcl'

jobs:
  # This job name must match the required status check
  terraform-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Init
        run: terraform init -backend=false
      - name: Validate
        run: terraform validate

  terraform-plan:
    runs-on: ubuntu-latest
    needs: terraform-validate
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Init
        run: terraform init
      - name: Plan
        run: terraform plan -no-color

  terraform-security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.3
```

Each job name corresponds to a required status check in the branch protection settings. If any of these checks fail, the PR cannot be merged.

## GitLab Branch Protection Configuration

GitLab uses a different model with protected branches and merge request approvals:

```yaml
# .gitlab-ci.yml
stages:
  - validate
  - plan
  - security

terraform-validate:
  stage: validate
  image: hashicorp/terraform:1.7
  script:
    - terraform init -backend=false
    - terraform fmt -check -recursive
    - terraform validate
  rules:
    - if: $CI_MERGE_REQUEST_ID

terraform-plan:
  stage: plan
  image: hashicorp/terraform:1.7
  script:
    - terraform init
    - terraform plan -no-color
  rules:
    - if: $CI_MERGE_REQUEST_ID

terraform-security:
  stage: security
  image: aquasec/tfsec:latest
  script:
    - tfsec .
  rules:
    - if: $CI_MERGE_REQUEST_ID
```

In GitLab, configure protected branches under Settings > Repository > Protected Branches:

```text
Branch: main
Allowed to merge: Maintainers
Allowed to push: No one
Allowed to force push: No
Code owner approval required: Yes
```

Set up merge request approval rules under Settings > General > Merge request approvals:

```text
Rule: Infrastructure Review
Approvers: @platform-team
Approvals required: 2
```

## Environment-Specific Protection

Different environments need different levels of protection. Production should have stricter rules than development:

```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  push:
    branches: [main]

jobs:
  apply-staging:
    runs-on: ubuntu-latest
    environment: staging  # Less restrictive
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
        working-directory: environments/staging
      - run: terraform apply -auto-approve
        working-directory: environments/staging

  apply-production:
    runs-on: ubuntu-latest
    needs: apply-staging
    environment: production  # More restrictive, requires approval
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
        working-directory: environments/production
      - run: terraform apply -auto-approve
        working-directory: environments/production
```

GitHub Environments let you define separate protection rules for each environment. Configure production to require manual approval from specific team members before the apply runs.

## Protecting Against Force Pushes

Force pushes are especially dangerous in Terraform repositories because they can rewrite history, removing evidence of previous infrastructure states:

```text
# GitHub branch protection rule
- Allow force pushes: NEVER
- Allow deletions: NEVER
```

If someone force pushes over a commit that was already applied, the Terraform state and the Git history will diverge, creating confusion about what is actually deployed.

## Setting Up Tag Protection

If you use tags for versioning your Terraform modules, protect them as well:

```text
# GitHub tag protection rule
Tag name pattern: v*
Restrict who can create matching tags: @platform-team
```

This prevents anyone outside the platform team from creating version tags that might be referenced by other modules or environments.

## Handling Emergency Situations

Even with strict branch protection, you need a process for emergency changes. Rather than weakening your protection rules, create a dedicated emergency workflow:

```yaml
# .github/workflows/emergency-apply.yml
name: Emergency Terraform Apply

on:
  workflow_dispatch:
    inputs:
      reason:
        description: 'Reason for emergency change'
        required: true
      target_resource:
        description: 'Specific resource to modify'
        required: true

jobs:
  emergency-apply:
    runs-on: ubuntu-latest
    environment: emergency  # Requires on-call lead approval
    steps:
      - uses: actions/checkout@v4
      - name: Log Emergency Change
        run: |
          echo "Emergency change initiated"
          echo "Reason: ${{ inputs.reason }}"
          echo "Target: ${{ inputs.target_resource }}"
          # Send notification to incident channel
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform apply -target=${{ inputs.target_resource }} -auto-approve
```

This workflow requires a separate environment approval and logs the reason for the emergency change. You can learn more about emergency procedures in our guide on [handling emergency Terraform changes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-emergency-terraform-changes/view).

## Auditing Branch Protection Changes

Monitor changes to your branch protection rules. If someone weakens the rules, you need to know immediately:

```bash
# Use GitHub API to check branch protection status
gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '{
    required_reviews: .required_pull_request_reviews.required_approving_review_count,
    dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
    require_codeowners: .required_pull_request_reviews.require_code_owner_reviews,
    required_checks: [.required_status_checks.contexts[]]
  }'
```

Set up monitoring with tools like OneUptime to alert your team when branch protection configurations change unexpectedly.

## Common Mistakes to Avoid

Do not exclude administrators from branch protection rules. The whole point is to enforce process, and administrators are just as capable of making mistakes. The "Include administrators" setting should always be enabled.

Do not set required reviews to just one person. A single reviewer can approve their own colleagues' changes without thorough review. Two reviewers ensure that at least two people have looked at every change.

Do not forget to require status checks to be up to date. Without this, a PR could be approved when the plan showed no changes, but by the time it merges, the main branch has moved forward and the actual plan is different.

Branch protection for Terraform repositories is about creating a consistent, reliable process for infrastructure changes. It takes time to configure properly, but the investment pays for itself the first time it prevents a catastrophic change from reaching production.
