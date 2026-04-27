# How to Understand When Not to Use Workspaces in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Workspaces

Description: Learn the limitations of OpenTofu workspaces and when separate configuration directories or separate repositories are a better approach for environment isolation.

## Introduction

Workspaces are a useful tool but they are not the right solution for every situation. HashiCorp and the OpenTofu community have documented several cases where workspaces create more complexity than they solve. Understanding these limitations helps you choose the right isolation strategy.

## When Workspaces Work Well

Workspaces are appropriate when:
- Environments share the same infrastructure topology
- The only differences are sizing, counts, or naming
- You need quick ephemeral environments (feature branches, PR previews)
- Teams are small and the workspace concept is well-understood

## Limitation 1: No Access Control Between Workspaces

All workspaces in a configuration share the same backend credentials:

```bash
# Anyone who can run tofu against production can also run it against staging

# There is no workspace-level RBAC in the backend config

tofu workspace select production  # No additional auth required
tofu apply                        # Same credentials as staging
```

For strict environment separation with different access controls, use separate backend configurations with separate IAM roles per environment.

## Limitation 2: Shared Provider Configuration

Provider configuration is shared across workspaces:

```hcl
# This provider config applies to ALL workspaces
provider "aws" {
  region = "us-east-1"
  # Cannot use a different account per workspace without aliases
}
```

If production and staging use different AWS accounts, workspaces become awkward. Separate configuration directories with per-directory provider configuration are cleaner.

## Limitation 3: Configuration Divergence Over Time

As environments evolve, you may need fundamentally different resources:

```hcl
# This grows into hard-to-read conditional logic
resource "aws_rds_cluster" "db" {
  count = terraform.workspace == "production" ? 1 : 0
  # ...
}

resource "aws_db_instance" "db" {
  count = terraform.workspace != "production" ? 1 : 0
  # ...
}
```

When more than ~20% of resources differ per workspace, separate directories are more maintainable.

## Limitation 4: Workspace State is Coupled

Workspace state lives in the same backend path:

```text
s3://bucket/
├── prefix/terraform.tfstate                  # default
└── env:/production/prefix/terraform.tfstate  # production
```

A backend migration moves all workspaces together. You cannot independently move one environment's state to a new backend.

## Better Alternative: Separate Directories

```text
infrastructure/
├── development/
│   ├── main.tf
│   ├── backend.tf    # Points to dev state bucket
│   └── terraform.tfvars
├── staging/
│   ├── main.tf
│   ├── backend.tf    # Points to staging state bucket
│   └── terraform.tfvars
└── production/
    ├── main.tf
    ├── backend.tf    # Points to production state bucket
    └── terraform.tfvars
```

Each directory has its own backend configuration with separate IAM roles and access controls.

## Better Alternative: Separate State Paths with Same Config

```hcl
# shared/main.tf - shared configuration
terraform {
  backend "s3" {}  # Partial config
}
```

```bash
# Initialize with environment-specific backend
tofu init -backend-config="key=production/terraform.tfstate" \
          -backend-config="role_arn=arn:aws:iam::PROD_ACCOUNT:role/TofuRole"
```

## When to Choose Workspaces vs Directories

| Scenario | Use Workspaces | Use Directories |
|---|---|---|
| Identical topology, different sizes | Yes | No |
| Different AWS accounts | No | Yes |
| Need env-specific access control | No | Yes |
| Ephemeral feature environments | Yes | No |
| >50% different resources | No | Yes |
| Large team with strict RBAC | No | Yes |

## Conclusion

Workspaces are not a universal environment isolation solution. They share credentials, provider configuration, and state backends. For environments that require separate access controls, different cloud accounts, or significantly different architectures, separate configuration directories with per-directory backend configurations provide stronger isolation and clearer boundaries.
