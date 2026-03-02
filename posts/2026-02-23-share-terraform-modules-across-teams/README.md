# How to Share Terraform Modules Across Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Team, Collaboration, DevOps

Description: Strategies for sharing Terraform modules across multiple teams including module ownership, versioning policies, contribution workflows, and governance models.

---

Building a Terraform module is one thing. Getting five different teams to actually use it, contribute to it, and not break each other's deployments is another challenge entirely. Module sharing is as much an organizational problem as a technical one.

This guide covers the practical patterns for making Terraform modules work across multiple teams.

## The Module Sharing Challenge

When modules are shared across teams, several problems emerge:

- Who owns the module? Who approves changes?
- How do you update a module without breaking teams that depend on it?
- How do teams request new features?
- How do you prevent one team's requirements from making the module unusable for others?
- How do you make modules discoverable?

## Module Ownership Models

### Centralized Platform Team

A dedicated platform or infrastructure team owns and maintains all shared modules:

```
Platform Team owns:
  - terraform-aws-vpc
  - terraform-aws-ecs-service
  - terraform-aws-rds-postgres
  - terraform-aws-s3-bucket

Product teams consume modules:
  module "api_service" {
    source  = "app.terraform.io/myorg/ecs-service/aws"
    version = "~> 2.0"
  }
```

**Pros**: Consistent quality, centralized standards, clear ownership.

**Cons**: Platform team becomes a bottleneck, slow to respond to individual team needs.

### Federated Ownership

Different teams own modules related to their domain:

```
Networking team owns:
  - terraform-aws-vpc
  - terraform-aws-transit-gateway

Data team owns:
  - terraform-aws-rds-postgres
  - terraform-aws-redshift

Platform team owns:
  - terraform-aws-ecs-service
  - terraform-aws-lambda-function
```

**Pros**: Domain expertise in each module, no single bottleneck.

**Cons**: Inconsistent standards across modules, coordination overhead.

### Inner Source Model

Any team can contribute to any module through pull requests, with designated maintainers per module:

```yaml
# CODEOWNERS file in the module repository
* @platform-team

# Specific teams have ownership of specific modules
/modules/vpc/ @networking-team
/modules/rds/ @data-team
/modules/ecs/ @platform-team
```

**Pros**: Leverages expertise across the organization, fastest iteration.

**Cons**: Requires mature code review culture, need clear contribution guidelines.

## Version Pinning Strategy

How callers pin module versions is critical for stability:

```hcl
# Exact version pin - safest, but requires manual updates
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "1.3.2"
}

# Pessimistic constraint - allows patch updates
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "~> 1.3"  # Allows 1.3.x but not 1.4.0
}

# Range constraint - allows minor updates
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = ">= 1.3, < 2.0"  # Allows 1.x but not 2.0
}
```

Recommendation: Use `~>` (pessimistic constraint) for most teams. It allows bug fixes automatically while requiring deliberate upgrades for feature changes.

## Contribution Workflow

Set up a clear process for contributing to shared modules:

### 1. Propose the Change

Open an issue or RFC (Request for Comments) before writing code:

```markdown
## Proposal: Add auto-scaling support to ECS module

### Problem
The ECS module does not support auto-scaling. Teams are adding
auto-scaling resources outside the module, leading to inconsistent
configurations.

### Proposed Solution
Add an optional `autoscaling` variable to the module.

### Impact
- No breaking changes (new variable with default value)
- Backwards compatible
- Affects: all teams using the ECS module
```

### 2. Write and Test

Fork the module, make changes, and write tests:

```bash
# Run formatting
terraform fmt -recursive

# Validate
terraform validate

# Run tests
cd tests/
go test -v -timeout 30m
```

### 3. Review and Merge

The module maintainer reviews the pull request:

```yaml
# PR review checklist
- [ ] No breaking changes (or major version bump)
- [ ] Variables have descriptions and validations
- [ ] Outputs are documented
- [ ] Examples updated
- [ ] Tests pass
- [ ] README updated (terraform-docs)
```

### 4. Release

The maintainer tags and releases a new version:

```bash
git tag -a v1.4.0 -m "Add auto-scaling support"
git push origin v1.4.0
```

## Module Catalog

Create a central catalog so teams can discover available modules. This can be as simple as a wiki page:

```markdown
# Internal Terraform Module Catalog

## Compute
| Module | Version | Owner | Description |
|--------|---------|-------|-------------|
| [ecs-service](link) | v2.1.0 | Platform | ECS Fargate service with ALB |
| [ec2-instance](link) | v1.5.0 | Platform | EC2 instance with monitoring |
| [lambda-function](link) | v1.3.0 | Platform | Lambda with IAM and logging |

## Networking
| Module | Version | Owner | Description |
|--------|---------|-------|-------------|
| [vpc](link) | v3.0.0 | Networking | VPC with subnets and NAT |
| [security-group](link) | v1.2.0 | Networking | Security group with rules |

## Data
| Module | Version | Owner | Description |
|--------|---------|-------|-------------|
| [rds-postgres](link) | v2.0.0 | Data | PostgreSQL RDS with backups |
| [s3-bucket](link) | v1.4.0 | Platform | S3 with encryption and lifecycle |
```

Or use a private Terraform registry with a UI for browsing.

## Module Standards Document

Publish a standards document that all module authors must follow:

```markdown
# Terraform Module Standards

## Required
- All variables must have descriptions
- All variables with limited valid values must have validation blocks
- All outputs must have descriptions
- Version constraints in versions.tf
- At least one working example in examples/
- README with usage section
- CHANGELOG.md maintained

## Naming
- Repository: terraform-<provider>-<name>
- Resources: use "this" for primary resource
- Variables: snake_case, descriptive names
- Outputs: match the attribute name when possible

## Defaults
- Encryption must be enabled by default
- Public access must be disabled by default
- Tags must include ManagedBy=terraform

## Testing
- At least one integration test
- Tests must clean up all created resources
```

## Handling Conflicting Requirements

When two teams want contradictory features, you have several options:

**Make it configurable**: If both approaches are valid, add a variable:

```hcl
variable "networking_mode" {
  description = "Network mode: 'bridge' for legacy apps, 'awsvpc' for modern apps"
  type        = string
  default     = "awsvpc"
}
```

**Create separate modules**: If the use cases are fundamentally different, maintain separate modules rather than cramming everything into one.

**Use wrapper modules**: Each team creates their own wrapper module around a shared base module, adding their team-specific configuration.

## Communication Channels

Set up dedicated channels for module-related communication:

- A Slack channel or Teams channel for module discussions
- A regular (monthly) meeting for module maintainers
- Release announcements when new versions are published
- A deprecation notice process with defined timelines

## Metrics

Track module adoption to understand what is working:

- Number of teams using each module
- Version distribution (are teams keeping up with updates?)
- Contribution rate (are teams contributing back?)
- Issue resolution time

These metrics help identify modules that need more investment and modules that nobody is using.

For the technical side of module distribution, see [how to manage private Terraform module registries](https://oneuptime.com/blog/post/2026-02-23-manage-private-terraform-module-registries/view).
