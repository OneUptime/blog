# How to Version Control Sentinel Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Version Control, Git, Policy as Code, Governance, CI/CD

Description: Structure, version, and manage Sentinel policies in Git with proper branching strategies, testing pipelines, and release workflows for reliable policy governance.

---

Sentinel policies are code, and like all code, they need proper version control. Storing policies in a Git repository is just the starting point. You also need a branching strategy, a review process, automated testing, and a release workflow that prevents untested policies from breaking your Terraform pipelines.

This post covers how to set up a professional version control workflow for Sentinel policies, from repository structure to CI/CD integration.

## Repository Structure

A well-organized repository makes it easy to find, modify, and test policies. Here is a structure that scales from a handful of policies to hundreds:

```text
sentinel-policies/
    README.md
    sentinel.hcl
    modules/
        tfplan-functions/
            tfplan-functions.sentinel
        aws-functions/
            aws-functions.sentinel
        azure-functions/
            azure-functions.sentinel
    policies/
        security/
            deny-public-databases.sentinel
            require-encryption.sentinel
            restrict-security-groups.sentinel
        compliance/
            require-tags.sentinel
            restrict-regions.sentinel
            enforce-naming.sentinel
        cost/
            cost-limits.sentinel
            restrict-instance-types.sentinel
    test/
        deny-public-databases/
            pass.hcl
            fail.hcl
            testdata/
                private-rds.sentinel
                public-rds.sentinel
        require-encryption/
            pass.hcl
            fail.hcl
            testdata/
                encrypted-resources.sentinel
                unencrypted-resources.sentinel
    .github/
        workflows/
            test.yml
            release.yml
```

Group policies by concern (security, compliance, cost) rather than by cloud provider. A single policy might check resources across multiple providers, and grouping by concern makes it easier to assign ownership and find the right policy to modify.

## The sentinel.hcl Configuration

Your `sentinel.hcl` file maps policies to their source files and enforcement levels:

```hcl
# sentinel.hcl
# Central configuration for all Sentinel policies

# Shared modules
module "tfplan-functions" {
    source = "./modules/tfplan-functions/tfplan-functions.sentinel"
}

module "aws-functions" {
    source = "./modules/aws-functions/aws-functions.sentinel"
}

# Security policies - hard enforcement
policy "deny-public-databases" {
    source            = "./policies/security/deny-public-databases.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "require-encryption" {
    source            = "./policies/security/require-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}

# Compliance policies - soft enforcement with override capability
policy "require-tags" {
    source            = "./policies/compliance/require-tags.sentinel"
    enforcement_level = "soft-mandatory"
}

# Cost policies - advisory during rollout
policy "cost-limits" {
    source            = "./policies/cost/cost-limits.sentinel"
    enforcement_level = "advisory"
}
```

## Branching Strategy

Use a branching strategy that matches your risk tolerance. For most organizations, a modified GitHub Flow works well:

**main branch**: The production branch. Terraform Cloud or Enterprise pulls policies from this branch. Changes to main immediately affect all Terraform runs.

**feature branches**: All policy changes start on a feature branch. Name them descriptively: `add-encryption-policy`, `fix-tag-check-false-positive`, `update-approved-regions`.

**staging branch** (optional): For organizations that want an extra testing layer, merge feature branches to staging first. Connect a separate policy set in Terraform Cloud to the staging branch and apply it to test workspaces.

```bash
# Create a feature branch for a new policy
git checkout -b add-rds-backup-policy

# Make your changes
# Write the policy, write tests, update sentinel.hcl

# Push and open a pull request
git push origin add-rds-backup-policy
```

## Automated Testing with CI

Every pull request should run the Sentinel test suite automatically. Here is a GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
# Run Sentinel tests on every pull request

name: Sentinel Tests

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Sentinel CLI
        run: |
          # Download the Sentinel CLI
          SENTINEL_VERSION="0.24.1"
          wget -q "https://releases.hashicorp.com/sentinel/${SENTINEL_VERSION}/sentinel_${SENTINEL_VERSION}_linux_amd64.zip"
          unzip "sentinel_${SENTINEL_VERSION}_linux_amd64.zip"
          sudo mv sentinel /usr/local/bin/
          sentinel version

      - name: Run Sentinel tests
        run: |
          # Run all tests with verbose output
          sentinel test -verbose

      - name: Validate sentinel.hcl syntax
        run: |
          # Check that sentinel.hcl is valid
          sentinel fmt -check sentinel.hcl
```

For GitLab CI:

```yaml
# .gitlab-ci.yml
# Sentinel testing pipeline

stages:
  - test
  - validate

sentinel-test:
  stage: test
  image: hashicorp/sentinel:latest
  script:
    - sentinel test -verbose
  rules:
    - if: $CI_MERGE_REQUEST_ID
    - if: $CI_COMMIT_BRANCH == "main"

sentinel-fmt:
  stage: validate
  image: hashicorp/sentinel:latest
  script:
    - sentinel fmt -check .
  rules:
    - if: $CI_MERGE_REQUEST_ID
```

## Code Review Process

Sentinel policy changes deserve the same review rigor as application code. Establish these review requirements:

**Every PR must include tests.** If you are adding a new policy, include both passing and failing test cases. If you are fixing a bug, include a test that reproduces the bug.

**Require security team review.** For policies in the security category, require approval from at least one security team member. Use GitHub CODEOWNERS:

```text
# .github/CODEOWNERS
# Security policies require security team review
/policies/security/    @myorg/security-team

# Cost policies require finops team review
/policies/cost/        @myorg/finops-team

# Modules require platform team review
/modules/              @myorg/platform-team

# sentinel.hcl changes require platform team review
sentinel.hcl           @myorg/platform-team
```

**PR template** to standardize what reviewers need to verify:

```markdown
## Policy Change Description
<!-- What policy is being added/modified and why -->

## Testing
- [ ] Added passing test case(s)
- [ ] Added failing test case(s)
- [ ] All existing tests pass locally
- [ ] Tested against real Terraform plan (for complex changes)

## Rollout Plan
- [ ] Starting as advisory
- [ ] Moving directly to soft-mandatory
- [ ] Moving directly to hard-mandatory

## Impact Assessment
- Workspaces affected: <!-- list or "all" -->
- Expected violations on existing resources: <!-- yes/no, details -->
```

## Tagging and Releases

Use Git tags to create versioned releases of your policy set. This is especially important if multiple Terraform Enterprise instances or Terraform Cloud organizations reference your policies:

```bash
# Tag a release
git tag -a v1.5.0 -m "Add RDS backup retention policy, fix tag check edge case"
git push origin v1.5.0
```

In your Terraform Enterprise policy set configuration, reference a specific tag:

```hcl
# In Terraform Enterprise, configure the policy set to use a specific branch or tag
# This prevents unexpected policy changes from affecting production runs
```

Maintain a CHANGELOG in your repository:

```text
# CHANGELOG

## v1.5.0 - 2026-02-23
### Added
- require-rds-backups policy (hard-mandatory)
- Azure SQL encryption check

### Fixed
- require-tags policy now handles null tags correctly

### Changed
- restrict-instance-types updated with new approved types

## v1.4.0 - 2026-02-10
### Added
- cost-limits policy (advisory)
```

## Managing Multiple Policy Sets

Large organizations often need multiple policy sets with different scopes. Use a monorepo with subdirectories:

```text
sentinel-policies/
    global/
        sentinel.hcl
        policies/
        modules/
        test/
    production/
        sentinel.hcl
        policies/
        test/
    team-platform/
        sentinel.hcl
        policies/
        test/
    team-data/
        sentinel.hcl
        policies/
        test/
```

Each subdirectory is a separate policy set in Terraform Cloud or Enterprise. The CI pipeline runs tests for all of them:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        policy-set: [global, production, team-platform, team-data]
    steps:
      - uses: actions/checkout@v4
      - name: Install Sentinel
        run: |
          wget -q "https://releases.hashicorp.com/sentinel/0.24.1/sentinel_0.24.1_linux_amd64.zip"
          unzip sentinel_0.24.1_linux_amd64.zip
          sudo mv sentinel /usr/local/bin/
      - name: Test ${{ matrix.policy-set }}
        working-directory: ${{ matrix.policy-set }}
        run: sentinel test -verbose
```

## Handling Breaking Changes

Sometimes you need to change a policy in a way that will cause existing Terraform configurations to fail. Handle this carefully:

1. Communicate the change to affected teams with a timeline
2. Deploy the updated policy as advisory first
3. Give teams time to fix their configurations
4. Promote to soft-mandatory with override capability
5. After confirming no legitimate overrides remain, promote to hard-mandatory

Document this process in your repository so that policy authors follow it consistently.

## Secrets and Sensitive Data

Never store secrets in your Sentinel policy repository. If a policy needs to reference sensitive data like approved AMI IDs or allowed account numbers, pass them as parameters through Terraform Cloud's policy set parameters:

```hcl
# sentinel.hcl with parameters
policy "restrict-accounts" {
    source            = "./policies/restrict-accounts.sentinel"
    enforcement_level = "hard-mandatory"
}

# Parameters are set in Terraform Cloud UI or API, not in version control
```

## Conclusion

Version controlling Sentinel policies transforms policy governance from an ad-hoc process into an engineering discipline. A well-structured repository, automated tests, mandatory code review, and a careful rollout process prevent policies from causing unexpected disruptions while still keeping your infrastructure secure. Treat your policy repository with the same care as your application code - because a broken policy can be just as disruptive as a broken application.

For more on writing Sentinel policies, see our guide on [using Sentinel with Terraform Enterprise](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-with-terraform-enterprise/view).
