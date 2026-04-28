# How to Store OpenTofu Configurations in Version Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Control, Git, Best Practice, Infrastructure as Code, GitOps

Description: Learn what to commit and what to exclude when storing OpenTofu configurations in Git, including lock files, variable files, and generated code.

## Introduction

Storing OpenTofu configurations in version control is the foundation of GitOps for infrastructure. The key decisions are: what to commit, what to exclude, and how to structure commits for meaningful history.

## What to Commit

```text
ALWAYS COMMIT:
  *.tf                        → All configuration files
  .terraform.lock.hcl         → Provider version lock file (critical)
  terraform.tfvars            → Non-sensitive variable values
  modules/                    → All module files
  .gitignore                  → Standard exclusions
  README.md                   → Project documentation

SOMETIMES COMMIT:
  backend.hcl                 → Backend config (if no secrets)
  example.tfvars              → Template with placeholder values
  policies/                   → OPA/Rego policy files
```

## What NOT to Commit

```text
NEVER COMMIT:
  .terraform/                 → Downloaded providers and modules (large binaries)
  *.tfstate                   → State files (contain secrets)
  *.tfstate.backup            → State backups
  *.tfvars                    → Variable files with real secrets
  crash.log                   → Provider crash logs
  terraform.tfstate.d/        → Workspace state directory (local backend)
  *.tfplan                    → Binary plan files
  override.tf                 → Local overrides
  *_override.tf               → Local overrides
```

## Standard .gitignore

```gitignore
# .gitignore for OpenTofu projects

# Local .terraform directories

**/.terraform/

# .tfstate files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Exclude all .tfvars files (contain real secrets)
*.tfvars
*.tfvars.json

# But include the example template
!example.tfvars
!example.tfvars.json

# Override files (local-only changes)
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# Include lock file - important for reproducibility
!.terraform.lock.hcl

# Binary plan files
*.tfplan
```

## Commit Message Conventions

```bash
# Format: <type>: <description>
# Types: feat, fix, refactor, chore, docs

# Good commit messages
git commit -m "feat: add ElastiCache Redis cluster for session storage"
git commit -m "fix: correct security group egress rules for RDS access"
git commit -m "chore: upgrade AWS provider from 5.38 to 5.40"
git commit -m "refactor: split monolithic state into networking and compute configs"

# Bad commit messages
git commit -m "update terraform"
git commit -m "fix"
git commit -m "changes"
```

## Branch Strategy

```text
main          → Production-ready configurations (protected)
  └── staging → Staging configurations (requires passing CI)
       └── feature/* → Feature branches (PR against staging or main)
```

## Pre-Commit Validation

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.6
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
        args:
          - --args=--output-file README.md
      - id: terraform_tflint
```

## Signed Commits for Infrastructure Changes

```bash
# Sign commits to create an auditable trail of who authorized each change
git config --global commit.gpgsign true
git config --global user.signingkey YOUR_GPG_KEY_ID
git commit -m "feat: add production RDS instance"
# Creates a signed commit that cannot be forged
```

## Conclusion

Commit everything needed to reproduce your infrastructure (`.tf` files, lock file, non-sensitive variable values) and exclude everything that is generated, large, or sensitive (`.terraform/`, state files, secret var files). Use meaningful commit messages, sign your commits for production infrastructure, and enforce formatting and validation in pre-commit hooks before any code reaches main.
