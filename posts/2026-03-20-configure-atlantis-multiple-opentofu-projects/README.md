# How to Configure Atlantis for Multiple OpenTofu Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Atlantis, Multiple Projects, GitOps, Repository Configuration

Description: Learn how to configure Atlantis to manage multiple OpenTofu projects in a monorepo, with per-project settings, dependencies, and workflow customizations.

## Introduction

Infrastructure monorepos often contain dozens of OpenTofu projects across multiple environments and components. Atlantis supports this through its `atlantis.yaml` configuration file, which defines which directories are projects, when to auto-plan them, and how to handle inter-project dependencies.

## Multi-Project atlantis.yaml

```yaml
# atlantis.yaml

version: 3

# Optional: limit regex-targeted Atlantis commands to environments/*
allowed_regexp_prefixes:
  - environments/

projects:
  # Networking layer
  - name: dev-networking
    dir: environments/dev/networking
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    execution_order_group: 1
    autoplan:
      when_modified:
        - "*.tf"
        - "**/*.tf"
      enabled: true

  - name: staging-networking
    dir: environments/staging/networking
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    execution_order_group: 1
    autoplan:
      when_modified: ["*.tf"]
      enabled: true
    apply_requirements:
      - approved

  - name: prod-networking
    dir: environments/prod/networking
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    execution_order_group: 1
    autoplan:
      when_modified: ["*.tf"]
      enabled: true
    apply_requirements:
      - approved
      - mergeable
    workflow: prod

  # Application layer - depends on networking
  - name: dev-app
    dir: environments/dev/app
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    depends_on:
      - dev-networking
    execution_order_group: 2
    autoplan:
      when_modified:
        - "*.tf"
        - "../../../modules/**/*.tf"  # Replan when shared modules change
      enabled: true

  - name: prod-app
    dir: environments/prod/app
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    depends_on:
      - prod-networking
    execution_order_group: 2
    autoplan:
      when_modified: ["*.tf", "../../../modules/**/*.tf"]
      enabled: true
    apply_requirements:
      - approved
    workflow: prod

workflows:
  prod:
    plan:
      steps:
        - run: tfsec . --minimum-severity MEDIUM
        - init
        - plan:
            extra_args: ["-lock-timeout=60s"]
    apply:
      steps:
        - apply
```

If you use `apply_requirements` or `workflow` in `atlantis.yaml`, the Atlantis server must permit those keys via `allowed_overrides` in its server-side `repos.yaml`. Repo-defined `workflows` also require `allow_custom_workflows: true`.

## Auto-Detecting Projects

For very large monorepos, use Atlantis's auto-detect mode instead of listing all projects:

```yaml
# atlantis.yaml with auto-detection
version: 3

autodiscover:
  mode: auto

automerge: false
delete_source_branch_on_merge: false

# Auto-detect projects when no explicit projects are listed
```

```yaml
# repos.yaml - Server side configuration for auto-detection
repos:
  - id: github.com/my-org/infrastructure
    apply_requirements: [approved]
    autodiscover:
      mode: auto
      ignore_paths:
        - "**/modules/**"
        - "**/.terraform/**"
```

## Project-Level Variables per Environment

Atlantis does not support inline variable maps in `atlantis.yaml`. For per-environment values, keep `.tfvars` files inside each project and let Atlantis load them during `plan`.

```yaml
projects:
  - name: prod-database
    dir: environments/prod/database
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    workflow: prod
    # Atlantis automatically includes env/default.tfvars from this directory.

  - name: dev-database
    dir: environments/dev/database
    terraform_distribution: opentofu
    terraform_version: v1.7.0
    # Atlantis automatically includes env/default.tfvars from this directory.
```

## Handling Plan-Apply Dependencies

When project B depends on project A's outputs, model that dependency in `atlantis.yaml` with `depends_on`. If both projects already have unapplied plans in the PR, you can still apply them explicitly in order:

```bash
# In a PR that changes networking (A) and app (B):

# First, apply networking
# atlantis apply -p prod-networking

# Wait for networking apply to complete, then apply app
# atlantis apply -p prod-app
```

## Splitting Large atlantis.yaml

For very large repos, Atlantis still uses a single repo config file per repo match, but you can store it outside the repo root and point to it from server-side `repos.yaml`:

```yaml
# repos.yaml
repos:
  - id: github.com/my-org/infrastructure
    repo_config_file: teams/platform/atlantis.yaml

# teams/platform/atlantis.yaml
version: 3
projects:
  - name: platform-network
    dir: platform/networking
  # ...
```

## Conclusion

Multi-project Atlantis configuration scales from a few projects to hundreds by using the `when_modified` file patterns to trigger only relevant plans, requiring approvals for higher environments, and using custom workflows for production. Keep the `atlantis.yaml` in version control alongside your infrastructure code so project configuration changes go through the same review process as HCL changes.
