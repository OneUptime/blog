# How to Use Workspaces vs Separate State Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, State Management, Architecture, Best Practices

Description: A practical comparison of Terraform workspaces versus separate state files for managing multiple environments, with guidance on choosing the right approach for your team and project.

---

When your Terraform project needs to manage multiple environments, two main strategies compete for your attention: workspaces and separate state files (directory-based environments). Both solve the same fundamental problem - keeping dev, staging, and production infrastructure isolated - but they make different tradeoffs. This post puts them side by side with concrete examples so you can make an informed choice.

## The Two Approaches

### Workspaces

One set of Terraform files, multiple state files managed through `terraform workspace` commands:

```
project/
  main.tf
  variables.tf
  outputs.tf
  envs/
    dev.tfvars
    staging.tfvars
    prod.tfvars
```

```bash
terraform workspace select dev
terraform apply -var-file=envs/dev.tfvars

terraform workspace select prod
terraform apply -var-file=envs/prod.tfvars
```

### Separate State Files (Directory-Based)

Each environment gets its own directory with its own Terraform configuration:

```
project/
  modules/
    app/
      main.tf
      variables.tf
  environments/
    dev/
      main.tf
      backend.tf
      terraform.tfvars
    staging/
      main.tf
      backend.tf
      terraform.tfvars
    prod/
      main.tf
      backend.tf
      terraform.tfvars
```

```bash
cd environments/dev
terraform apply

cd environments/prod
terraform apply
```

## Code Reuse

### Workspaces

Code reuse is automatic. There is one copy of every `.tf` file. All workspaces execute the same code. Differences come from the `terraform.workspace` variable and workspace-specific tfvars:

```hcl
# Single main.tf used by all workspaces
resource "aws_instance" "web" {
  count         = var.instance_count
  instance_type = var.instance_type

  tags = {
    Environment = terraform.workspace
  }
}
```

The downside: when environments need different resources, you end up with conditionals:

```hcl
# This gets messy as environments diverge
resource "aws_wafv2_web_acl" "main" {
  count = terraform.workspace == "prod" ? 1 : 0
  # ...
}

resource "aws_cloudfront_distribution" "cdn" {
  count = contains(["staging", "prod"], terraform.workspace) ? 1 : 0
  # ...
}
```

### Separate State Files

Code reuse requires explicit module calls. Each environment directory calls shared modules:

```hcl
# environments/dev/main.tf
module "app" {
  source = "../../modules/app"

  environment    = "dev"
  instance_type  = "t3.micro"
  instance_count = 1
}

# environments/prod/main.tf
module "app" {
  source = "../../modules/app"

  environment    = "prod"
  instance_type  = "t3.large"
  instance_count = 3
}

# Prod has extra resources that dev does not
module "waf" {
  source = "../../modules/waf"
  # ...
}

module "cdn" {
  source = "../../modules/cdn"
  # ...
}
```

The upside: production can have completely different resources without conditionals. The downside: changes to shared modules need to be applied in each environment separately.

## State Isolation

### Workspaces

All workspaces typically share the same backend configuration. State files live in the same bucket or storage account, differentiated by key prefix:

```
s3://my-state-bucket/env:/dev/app/terraform.tfstate
s3://my-state-bucket/env:/prod/app/terraform.tfstate
```

This means:

- Same IAM role accesses all environment state
- One misconfigured backend could affect multiple environments
- Accidental workspace switch is a real risk

### Separate State Files

Each environment can have a completely independent backend:

```hcl
# environments/dev/backend.tf
terraform {
  backend "s3" {
    bucket = "dev-terraform-state"
    key    = "app/terraform.tfstate"
    region = "us-east-1"
    role_arn = "arn:aws:iam::111111111111:role/dev-terraform"
  }
}

# environments/prod/backend.tf
terraform {
  backend "s3" {
    bucket = "prod-terraform-state"
    key    = "app/terraform.tfstate"
    region = "us-east-1"
    role_arn = "arn:aws:iam::222222222222:role/prod-terraform"
  }
}
```

This means:

- Different buckets, different accounts, different credentials
- Impossible to accidentally modify prod from the dev directory
- Stronger blast radius isolation

## Access Control

### Workspaces

Access control is coarse-grained. Anyone who can access the backend can access all workspaces. You can restrict access per workspace using S3 bucket policies with key prefixes, but it requires careful setup:

```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::state-bucket/env:/dev/*"
}
```

This works but is fragile. One policy mistake and a developer has production access.

### Separate State Files

Access control maps naturally to existing IAM patterns:

```json
{
  "Effect": "Allow",
  "Action": ["s3:*"],
  "Resource": "arn:aws:s3:::dev-terraform-state/*"
}
```

Developers get access to the dev state bucket. Only the CI/CD pipeline and senior engineers get the prod state bucket. Simple, standard IAM.

## Operational Safety

### Workspaces

The biggest risk is running commands in the wrong workspace:

```bash
# Developer thinks they are in dev...
terraform destroy -auto-approve
# ...but they were in prod

# This is a real scenario that has happened to teams
```

Mitigation requires discipline, wrapper scripts, or CI/CD enforcement:

```bash
# Safety wrapper
WORKSPACE=$(terraform workspace show)
if [ "$WORKSPACE" = "prod" ]; then
  echo "Cannot destroy production!"
  exit 1
fi
```

### Separate State Files

The risk of operating in the wrong environment is lower because you physically navigate to a different directory:

```bash
cd environments/dev
terraform destroy -auto-approve
# Can only affect dev resources, regardless of confusion
```

The directory path serves as a visual and structural safeguard.

## CI/CD Complexity

### Workspaces

Workspace-based pipelines need workspace selection logic:

```yaml
steps:
  - run: terraform init
  - run: terraform workspace select -or-create ${{ inputs.environment }}
  - run: terraform plan -var-file="envs/${{ inputs.environment }}.tfvars"
```

The pipeline is simpler because there is one set of init/plan/apply steps parameterized by workspace.

### Separate State Files

Directory-based pipelines navigate to the right directory:

```yaml
steps:
  - run: |
      cd environments/${{ inputs.environment }}
      terraform init
      terraform plan
```

Or you might have separate pipeline definitions per environment:

```yaml
# deploy-dev.yml
steps:
  - run: cd environments/dev && terraform init && terraform plan

# deploy-prod.yml (with approval gate)
steps:
  - run: cd environments/prod && terraform init && terraform plan
```

More pipeline files but clearer separation of concerns.

## Maintenance Overhead

### Workspaces

Lower initial overhead. One set of files to maintain. But as the project grows:

- Conditionals make the code harder to read
- Testing changes for one environment might affect another
- Refactoring is riskier because all environments share the same code path

### Separate State Files

Higher initial overhead due to duplication. But maintenance scales better:

- Each environment's configuration is explicit
- Changes to prod do not risk breaking dev
- You can update environments incrementally (upgrade dev first, then staging, then prod)

## When to Use Workspaces

Workspaces are the better choice when:

- Your environments are truly identical except for sizing and counts
- You are a small team that trusts everyone with all environments
- You want minimal setup overhead
- You are creating ephemeral environments (feature branches, PR environments)
- The infrastructure is simple (fewer than 20 resources)

```hcl
# Perfect for workspaces - identical structure, different sizes
locals {
  sizes = {
    dev  = { instance_type = "t3.micro", count = 1 }
    prod = { instance_type = "t3.large", count = 3 }
  }
  config = local.sizes[terraform.workspace]
}

resource "aws_instance" "web" {
  count         = local.config.count
  instance_type = local.config.instance_type
}
```

## When to Use Separate State Files

Separate state files win when:

- Environments have different resource sets (not just different sizes)
- Different teams manage different environments
- You need strict access control between environments
- Compliance requires environment isolation
- The infrastructure is complex (50+ resources)
- You want to upgrade/change environments independently

## Hybrid Approach

Some teams use both:

```
project/
  modules/
    core/          # Shared across all envs
    prod-extras/   # Only used in prod
  environments/
    dev/           # Separate directory for dev
      main.tf
    prod/          # Separate directory for prod
      main.tf
```

Within each environment directory, you might use workspaces for regional variants:

```bash
cd environments/prod
terraform workspace select us-east-1
terraform apply

terraform workspace select eu-west-1
terraform apply
```

This gives you directory-level separation between dev and prod, with workspace-level separation for regions within each environment.

## Decision Framework

Ask these questions:

1. **Do environments have the same resources?** If yes, workspaces. If environments have different resource sets, separate directories.

2. **Do different people manage different environments?** If yes, separate directories with separate backends for access control.

3. **How complex is the infrastructure?** Under 20 resources, workspaces are fine. Over 50, separate directories reduce risk.

4. **How critical is production isolation?** If an accidental `terraform destroy` in production would be catastrophic, separate directories add a meaningful safety layer.

5. **Are you using Terraform Cloud?** Terraform Cloud workspaces are more like directories than CLI workspaces. If you are on Terraform Cloud, lean into its workspace model.

## Conclusion

There is no universally correct choice. Workspaces optimize for simplicity and code reuse. Separate state files optimize for isolation and safety. Small projects with uniform environments should start with workspaces. Teams managing production infrastructure with compliance requirements should lean toward separate directories. And you can always migrate from one to the other as your needs evolve - see our post on [migrating from workspaces to directory-based environments](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-workspaces-to-directory-based-environments/view) for step-by-step guidance.
