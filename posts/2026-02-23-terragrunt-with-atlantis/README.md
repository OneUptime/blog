# How to Use Terragrunt with Atlantis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Atlantis, GitOps, Infrastructure as Code, DevOps

Description: Learn how to configure Atlantis to work with Terragrunt for automated plan and apply workflows on pull requests, including multi-module support and custom workflows.

---

Atlantis is a popular open-source tool that runs Terraform plan and apply in response to pull request comments. It gives you a GitOps-style workflow where infrastructure changes are reviewed and applied through pull requests. Terragrunt isn't supported out of the box, but with some configuration, you can get a smooth Atlantis-Terragrunt integration that handles dependencies, multiple modules, and environment-specific workflows.

## How Atlantis Works

The basic Atlantis flow:
1. Developer opens a PR with infrastructure changes
2. Atlantis detects the changes and runs `terraform plan`
3. Plan output is posted as a PR comment
4. After review, someone comments `atlantis apply`
5. Atlantis runs `terraform apply` and posts the result

With Terragrunt, we need to replace the `terraform` commands with `terragrunt` and handle the multi-module nature of Terragrunt projects.

## Installing Terragrunt in Atlantis

Atlantis doesn't ship with Terragrunt, so you need to add it to the Atlantis Docker image or server:

```dockerfile
# Dockerfile for Atlantis with Terragrunt
FROM ghcr.io/runatlantis/atlantis:latest

# Install Terragrunt
ARG TERRAGRUNT_VERSION=0.55.0
USER root
RUN curl -sL "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
    -o /usr/local/bin/terragrunt && \
    chmod +x /usr/local/bin/terragrunt

USER atlantis
```

Build and deploy:

```bash
docker build -t atlantis-terragrunt:latest .
```

## Server-Side Configuration

Create an `atlantis.yaml` (also called `repos.yaml`) for server-side repo configuration:

```yaml
# atlantis.yaml (server-side)
repos:
  - id: github.com/your-org/infrastructure
    workflow: terragrunt
    allowed_overrides: [workflow]
    allow_custom_workflows: true
```

## Custom Terragrunt Workflow

Define a custom workflow that uses Terragrunt instead of Terraform:

```yaml
# atlantis.yaml (server-side) - continued
workflows:
  terragrunt:
    plan:
      steps:
        - env:
            name: TERRAGRUNT_TFPATH
            command: 'which terraform'
        - run: terragrunt plan -no-color -out=$PLANFILE
    apply:
      steps:
        - run: terragrunt apply -no-color $PLANFILE
```

The `$PLANFILE` variable is provided by Atlantis and points to where the plan file should be saved.

## Repo-Level Configuration

In your infrastructure repository, create an `atlantis.yaml` that tells Atlantis which directories to watch:

```yaml
# atlantis.yaml (in repository root)
version: 3
automerge: false
parallel_plan: true
parallel_apply: false    # Apply sequentially for safety

projects:
  # Dev VPC
  - name: dev-vpc
    dir: infrastructure/dev/vpc
    workflow: terragrunt
    autoplan:
      when_modified:
        - "*.hcl"
        - "../../modules/vpc/**"
        - "../../terragrunt.hcl"

  # Dev ECS
  - name: dev-ecs
    dir: infrastructure/dev/ecs
    workflow: terragrunt
    autoplan:
      when_modified:
        - "*.hcl"
        - "../../modules/ecs/**"
        - "../../terragrunt.hcl"

  # Production VPC
  - name: prod-vpc
    dir: infrastructure/prod/vpc
    workflow: terragrunt
    apply_requirements: [approved, mergeable]
    autoplan:
      when_modified:
        - "*.hcl"
        - "../../modules/vpc/**"
        - "../../terragrunt.hcl"
```

## Generating atlantis.yaml Automatically

Maintaining the `atlantis.yaml` by hand becomes tedious with many modules. Use a script to generate it:

```bash
#!/bin/bash
# scripts/generate-atlantis-config.sh

cat <<'HEADER'
version: 3
automerge: false
parallel_plan: true
parallel_apply: false
projects:
HEADER

# Find all terragrunt.hcl files (excluding root)
find infrastructure -name "terragrunt.hcl" -not -path "*/terragrunt.hcl" | sort | while read -r file; do
  dir=$(dirname "$file")
  # Create a project name from the path
  name=$(echo "$dir" | sed 's|infrastructure/||' | sed 's|/|-|g')

  # Determine if this is a production module
  apply_req=""
  if echo "$dir" | grep -q "prod"; then
    apply_req="    apply_requirements: [approved, mergeable]"
  fi

  cat <<EOF
  - name: ${name}
    dir: ${dir}
    workflow: terragrunt
${apply_req}
    autoplan:
      when_modified:
        - "*.hcl"
        - "../../terragrunt.hcl"
EOF
done
```

## Handling Terragrunt Dependencies in Atlantis

Atlantis processes each project independently. This means if module B depends on module A, and both are changed in the same PR, Atlantis might try to plan both simultaneously. To handle this properly:

### Option 1: Define Explicit Dependencies

```yaml
# atlantis.yaml
projects:
  - name: dev-vpc
    dir: infrastructure/dev/vpc
    workflow: terragrunt

  - name: dev-ecs
    dir: infrastructure/dev/ecs
    workflow: terragrunt
    depends_on:
      - dev-vpc      # Plan this after dev-vpc
```

### Option 2: Use run-all in a Single Project

Instead of defining individual projects, use a single project that runs `run-all`:

```yaml
# atlantis.yaml
projects:
  - name: dev-all
    dir: infrastructure/dev
    workflow: terragrunt-run-all

workflows:
  terragrunt-run-all:
    plan:
      steps:
        - run: terragrunt run-all plan --terragrunt-non-interactive -no-color 2>&1 | tee plan-output.txt
    apply:
      steps:
        - run: terragrunt run-all apply --terragrunt-non-interactive -auto-approve -no-color
```

This is simpler but gives you less granular control.

## Custom Workflow with Pre/Post Steps

Add validation and notification steps:

```yaml
workflows:
  terragrunt-with-checks:
    plan:
      steps:
        # Check formatting
        - run: terragrunt hclfmt --terragrunt-check
        # Run the plan
        - run: terragrunt plan -no-color -out=$PLANFILE
        # Run cost estimation
        - run: |
            if command -v infracost &> /dev/null; then
              terraform show -json $PLANFILE > plan.json
              infracost diff --path plan.json --no-color || true
            fi
    apply:
      steps:
        - run: terragrunt apply -no-color $PLANFILE
        # Notify on completion
        - run: |
            curl -X POST "$SLACK_WEBHOOK" \
              -H 'Content-Type: application/json' \
              -d "{\"text\":\"Atlantis applied: $REPO_NAME/$DIR ($PROJECT_NAME)\"}" || true
```

## Environment Variables

Pass environment variables to Atlantis for Terragrunt:

```yaml
# In the Atlantis server configuration or Docker environment
environment:
  - TERRAGRUNT_DOWNLOAD=/tmp/terragrunt-cache
  - TF_PLUGIN_CACHE_DIR=/tmp/terraform-plugins
  - AWS_DEFAULT_REGION=us-east-1
```

For per-project variables:

```yaml
# atlantis.yaml
projects:
  - name: dev-vpc
    dir: infrastructure/dev/vpc
    workflow: terragrunt
    terraform_version: v1.7.0    # Pin Terraform version per project
```

## Locking and Concurrency

Atlantis provides workspace-level locking to prevent concurrent applies. With Terragrunt, make sure each project maps to a unique workspace:

```yaml
projects:
  - name: dev-vpc
    dir: infrastructure/dev/vpc
    workspace: default           # Each dir+workspace combo is locked independently
    workflow: terragrunt
```

When using `run-all`, the entire directory is treated as one lock unit, preventing partial applies.

## Handling Sensitive Output

Terragrunt plans can contain sensitive values. Configure Atlantis to handle this:

```yaml
# Server-side atlantis.yaml
repos:
  - id: github.com/your-org/infrastructure
    workflow: terragrunt
    # Don't include plan output in PR comments for production
    silence_no_projects: true
```

For individual projects:

```yaml
projects:
  - name: prod-rds
    dir: infrastructure/prod/rds
    workflow: terragrunt-silent    # Custom workflow that doesn't post full output
```

## Multiple Atlantis Instances

For large organizations, run separate Atlantis instances for different environments:

- Atlantis instance 1: Dev and staging (auto-apply enabled)
- Atlantis instance 2: Production (manual approval required, restricted access)

```yaml
# Dev Atlantis instance
repos:
  - id: github.com/your-org/infrastructure
    workflow: terragrunt
    allowed_overrides: [workflow]
    # Only process dev and staging directories
```

## Troubleshooting

Common issues when running Terragrunt with Atlantis:

1. **Terragrunt cache conflicts**: Multiple projects sharing the same cache directory can cause issues. Set unique cache paths per project.

2. **Timeout issues**: Large `run-all` operations may exceed Atlantis timeouts. Increase the timeout in Atlantis configuration.

3. **Missing dependencies**: If Atlantis can't find parent `terragrunt.hcl` files, make sure the `dir` path is correct relative to the repo root.

```bash
# Debug Atlantis Terragrunt issues
# Check what Atlantis sees as the working directory
ls -la $DIR/
# Verify parent config is accessible
ls -la $(dirname $DIR)/terragrunt.hcl
```

## Summary

Atlantis and Terragrunt work well together once you set up the custom workflow and configure project discovery correctly. The main decisions are whether to use individual projects or `run-all`, and how to handle the dependency ordering. For small to medium repos, individual projects with explicit dependencies give you the most control. For larger repos, consider `run-all` within environments or auto-generating the `atlantis.yaml`. For more CI/CD patterns, see our [Terragrunt with GitHub Actions guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-with-github-actions/view).
