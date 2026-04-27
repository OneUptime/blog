# How to Use OpenTofu with Terrateam for GitHub Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terrateam, GitHub, GitOps, PR Automation, CI/CD

Description: Learn how to set up Terrateam for OpenTofu to enable pull request-based infrastructure deployments with plan visibility, cost estimation, and approval workflows directly in GitHub.

## Introduction

Terrateam provides GitHub-native OpenTofu automation: plan output in PR comments, cost estimates from Infracost, security scanning from tfsec, and approval gates - all driven by a simple YAML configuration file.

## GitHub App Installation and Repository Setup

```yaml
# .terrateam/config.yml

# Terrateam configuration for OpenTofu

engine:
  name: tofu
  version: "1.7.0"

# Define directories containing OpenTofu configurations
dirs:
  environments/prod/networking:
    tags:
      - prod
      - networking

  environments/prod/app:
    tags:
      - prod
      - app
    when_modified:
      # Re-plan app when shared networking changes
      depends_on: "dir:environments/prod/networking"

  environments/dev:
    tags:
      - dev

# Default trigger behavior applied to all dirs unless overridden
when_modified:
  autoapply: false
  autoplan: true
  file_patterns:
    - "${DIR}/*.tf"
    - "${DIR}/*.tfvars"

# Top-level hooks run before/after plan or apply for every dir
hooks:
  plan:
    pre:
      - type: run
        cmd: ["echo", "Planning..."]
  apply:
    post:
      - type: run
        cmd: ["./scripts/notify-slack.sh", "Apply finished"]
```

## PR Workflow with Cost Estimation

```yaml
# .terrateam/config.yml
engine:
  name: tofu
  version: "1.7.0"

# Cost estimation is a top-level option. Set INFRACOST_API_KEY as a
# GitHub Actions Secret on the repo and Terrateam will use it automatically.
cost_estimation:
  enabled: true
  provider: infracost
  currency: USD

# Run tfsec as a post-plan hook so security findings appear alongside
# the plan output in PR comments.
hooks:
  plan:
    post:
      - type: run
        cmd: ["tfsec", ".", "--minimum-severity", "MEDIUM"]
        capture_output: true
```

## Access Control Configuration

```yaml
# .terrateam/config.yml
access_control:
  enabled: true
  # Each policy applies to dirspaces matching its tag_query.
  # Teams are referenced by their GitHub team slug as "team:<slug>".
  policies:
    - tag_query: ""
      plan:
        - "team:engineers"
        - "team:platform-team"
      apply:
        - "team:platform-team"

# Require a PR approval before apply will run
apply_requirements:
  checks:
    - tag_query: ""
      approved:
        enabled: true
```

## Environment-Specific Configuration

```yaml
# dirs supports glob patterns - the most specific match wins.
dirs:
  "environments/*/networking":
    tags:
      - networking

  "environments/prod/**":
    tags:
      - prod
    when_modified:
      autoapply: false  # Never auto-apply to prod

  "environments/dev/**":
    tags:
      - dev
    when_modified:
      autoapply: true  # Auto-apply dev changes
```

## Workflow Triggers via PR Comments

```bash
# Comment on PR to trigger Terrateam operations:
terrateam plan             # Plan all affected dirs
terrateam plan dir:environments/prod/networking  # Plan specific dir
terrateam apply            # Apply (if approved)
terrateam apply dir:environments/prod/app  # Apply specific dir
terrateam unlock           # Release lock
```

## Notifications Configuration

```yaml
# Control how Terrateam manages PR comments as new plans run.
# comment_strategy options:
#   minimize - collapse old comments (default)
#   append   - leave old comments untouched
#   delete   - remove old comments
notifications:
  policies:
    - tag_query: ""
      comment_strategy: minimize
```

## Conclusion

Terrateam provides a fully managed GitHub integration for OpenTofu without requiring any server infrastructure. Configuration lives in `.terrateam/config.yml` alongside your HCL code, making it easy to version-control workflow changes. The GitHub-native experience - cost estimates and security scan results directly in PR comments - makes infrastructure reviews as familiar as code reviews.
