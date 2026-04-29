# How to Choose Between Monorepo and Polyrepo for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Monorepo, Polyrepo, Repository Structure, Infrastructure as Code, Best Practice

Description: Learn the trade-offs between monorepo and polyrepo approaches for OpenTofu configurations to help you choose the right structure for your team and organization.

## Introduction

Whether to store all OpenTofu configurations in a single repository (monorepo) or distribute them across multiple repositories (polyrepo) is a foundational architectural decision. Both approaches have valid use cases, and the right choice depends on team size, release coupling, and governance requirements.

## Monorepo Approach

All infrastructure configurations in a single repository:

```text
infra-monorepo/
├── environments/
│   ├── dev/
│   │   ├── networking/
│   │   ├── databases/
│   │   └── applications/
│   └── prod/
│       ├── networking/
│       ├── databases/
│       └── applications/
├── modules/
│   ├── vpc/
│   ├── eks/
│   └── rds/
└── policies/
    └── opa/
```

### Monorepo Advantages

```text
+ Single place to see all infrastructure
+ Cross-team changes in one PR (e.g., module + consumer in one commit)
+ Shared modules are always co-located with consumers
+ Simpler CI/CD - one pipeline to rule them all
+ Easier to enforce organization-wide standards
```

### Monorepo Challenges

```text
- Large repos slow down git operations
- CI must determine which configs changed (use Terramate or path filters)
- Merge conflicts when many teams work simultaneously
- Access control is per-repo - can't restrict teams to their directory
```

### Monorepo CI Pattern

```yaml
# Only plan configurations that changed

on:
  pull_request:
    paths:
      - "environments/prod/networking/**"   # Only run for networking changes

jobs:
  plan-networking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      # ... opentofu init / plan steps
```

## Polyrepo Approach

Infrastructure split across multiple repositories:

```text
infra-platform/       → VPC, IAM, shared services (platform team)
infra-data/           → RDS, Kafka, data pipelines (data team)
infra-app-frontend/   → CDN, static hosting (frontend team)
infra-app-backend/    → ECS, Lambda, APIs (backend team)
tf-modules/           → Shared modules (platform team)
```

### Polyrepo Advantages

```text
+ Natural team ownership and access control
+ Faster git operations on smaller repos
+ Teams release independently
+ Clear blast radius per repository
+ Easier to enforce CODEOWNERS per team
```

### Polyrepo Challenges

```text
- Cross-team changes require multiple PRs
- Module consumers may lag behind module updates
- No single view of all infrastructure
- More CI/CD pipelines to maintain
```

## Decision Framework

| Factor | Monorepo | Polyrepo |
|---|---|---|
| Team size | < 10 engineers | > 20 engineers |
| Release coupling | High (changes often span teams) | Low (teams release independently) |
| Access control | Less critical | Important (strict team boundaries) |
| Module governance | Centralized | Each team owns modules |
| Complexity | Lower | Higher |

## Hybrid Approach

Many organizations use a hybrid: a platform monorepo for shared infrastructure and team-specific polyrepos for applications:

```text
infra-platform/    → Monorepo: networking, IAM, shared services
app-team-alpha/    → Polyrepo: team Alpha's application infrastructure
app-team-beta/     → Polyrepo: team Beta's application infrastructure
tf-modules/        → Shared module registry
```

## Conclusion

Start with a monorepo for small teams and early-stage organizations - the simplicity wins. Move toward polyrepos (or a hybrid) as team boundaries solidify and access control becomes important. The decision is reversible: splitting a monorepo is easier than merging polyrepos, so err toward the simpler structure initially.
