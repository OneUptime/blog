# How to Create Terraform Architecture Decision Records

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Architecture Decision Records, Documentation, DevOps, Design

Description: Learn how to create and maintain Terraform Architecture Decision Records (ADRs) that document the reasoning behind infrastructure design choices and help future teams understand past decisions.

---

Every Terraform codebase contains decisions. Why did we use a specific module structure? Why did we choose this backend configuration? Why did we split state files this way? Without documentation, these decisions become tribal knowledge that evaporates when team members leave. Architecture Decision Records (ADRs) capture the context, options considered, and reasoning behind significant infrastructure decisions.

In this guide, we will cover how to create ADRs specifically for Terraform infrastructure projects.

## What Makes a Good ADR

A good ADR captures not just what was decided, but why. It records the context that led to the decision, the alternatives that were considered, and the trade-offs that were accepted. Months or years later, someone should be able to read the ADR and understand why the current approach was chosen.

## ADR Template for Terraform Decisions

```markdown
# ADR-XXXX: [Decision Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-YYYY]

## Date
YYYY-MM-DD

## Context
What is the issue that we are seeing that is motivating this decision?
What technical or organizational constraints exist?

## Decision
What is the change that we are proposing or have agreed to implement?

## Terraform Impact
- Affected workspaces:
- Affected modules:
- State changes required:
- Migration steps needed:

## Alternatives Considered

### Option A: [Name]
- Description:
- Pros:
- Cons:

### Option B: [Name]
- Description:
- Pros:
- Cons:

## Consequences
What becomes easier or more difficult because of this change?

## References
- Related PRs:
- Related ADRs:
- External documentation:
```

## Real-World ADR Examples

Here is a concrete example of a Terraform ADR:

```markdown
# ADR-0012: Use S3 Backend with DynamoDB Locking

## Status
Accepted

## Date
2026-01-15

## Context
Our team has grown from 3 to 15 engineers managing Terraform.
We are currently using local state files committed to Git,
which causes frequent merge conflicts and makes concurrent
work impossible. Two incidents in the past month were caused
by engineers applying stale state.

We need a remote state solution that supports:
- Concurrent access with locking
- State versioning for recovery
- Encryption at rest
- Access from CI/CD pipelines

## Decision
We will use S3 as our Terraform state backend with DynamoDB
for state locking. Each team will have separate state files
organized by team and environment.

State file path convention:
`{team}/{environment}/terraform.tfstate`

## Terraform Impact
- All existing workspaces need to be migrated to remote state
- CI/CD pipelines need updated IAM permissions
- New backend configuration in all workspaces
- State files need to be imported from local to remote

### Migration Steps
1. Create S3 bucket with versioning enabled
2. Create DynamoDB table for locking
3. For each workspace:
   a. Add backend configuration
   b. Run `terraform init -migrate-state`
   c. Verify state was migrated correctly
   d. Remove local state file from Git

## Alternatives Considered

### Option A: Terraform Cloud
- Description: Use HashiCorp's managed Terraform Cloud
- Pros: Managed service, built-in features, nice UI
- Cons: Additional cost ($$$), vendor dependency,
  data leaves our network
- Rejected because: Cost and data sovereignty concerns

### Option B: Consul Backend
- Description: Use HashiCorp Consul for state storage
- Pros: Fast, built-in locking, key-value store
- Cons: Need to manage Consul cluster, less durable
  than S3, no built-in versioning
- Rejected because: Operational overhead of managing
  another system

### Option C: PostgreSQL Backend
- Description: Use existing PostgreSQL database
- Pros: Already have the infrastructure, SQL-queryable
- Cons: Shared resource, potential performance impact,
  less battle-tested for this use case
- Rejected because: Risk to existing database workloads

## Consequences
### Positive
- Engineers can work concurrently without conflicts
- State versioning enables recovery from mistakes
- CI/CD pipelines can safely run terraform operations
- Encryption at rest meets our compliance requirements

### Negative
- AWS dependency for state storage
- Need to manage S3 bucket and DynamoDB table
- State migration will require a maintenance window
- Team needs to learn remote state workflows

## References
- Terraform S3 Backend docs: https://developer.hashicorp.com/terraform/language/settings/backends/s3
- Related incident: INC-0089 (stale state applied)
- Related incident: INC-0092 (merge conflict in state)
```

## Organizing ADRs in Your Repository

Store ADRs alongside the code they document:

```
infrastructure/
  adr/
    0001-initial-terraform-adoption.md
    0002-module-structure-convention.md
    0003-state-isolation-strategy.md
    0012-s3-backend-with-dynamodb-locking.md
    0013-provider-version-pinning-strategy.md
    0014-testing-framework-selection.md
    template.md
    README.md
```

```markdown
# ADR Index (adr/README.md)

## Architecture Decision Records

| ID | Title | Status | Date |
|----|-------|--------|------|
| 0001 | Initial Terraform Adoption | Accepted | 2025-03-15 |
| 0002 | Module Structure Convention | Accepted | 2025-04-02 |
| 0003 | State Isolation Strategy | Accepted | 2025-04-20 |
| 0012 | S3 Backend with DynamoDB Locking | Accepted | 2026-01-15 |
| 0013 | Provider Version Pinning Strategy | Accepted | 2026-01-22 |
| 0014 | Testing Framework Selection | Proposed | 2026-02-10 |
```

## When to Write an ADR

Not every decision needs an ADR. Use ADRs for decisions that are significant and hard to reverse:

```yaml
# adr/decision-criteria.yaml
# When to write a Terraform ADR

always_write_adr:
  - Backend or state management changes
  - Module architecture decisions
  - Provider selection or version strategy changes
  - CI/CD pipeline design decisions
  - Security model changes
  - Multi-account or multi-region strategy
  - Major refactoring decisions
  - Tool selection (testing frameworks, linters)

probably_write_adr:
  - Naming convention changes
  - New module design patterns
  - Changes to approval workflow
  - Policy enforcement decisions

probably_skip_adr:
  - Bug fixes in modules
  - Adding new resources to existing patterns
  - Updating provider versions within constraints
  - Documentation improvements
```

## ADR Review Process

ADRs should go through a review process before being accepted:

```yaml
# adr/review-process.yaml
# Process for reviewing and accepting ADRs

process:
  1_draft:
    action: "Author writes ADR in proposed status"
    format: "PR with ADR file in adr/ directory"

  2_review:
    action: "Team reviews and discusses"
    timeline: "5 business days for feedback"
    reviewers:
      - At least 2 team members
      - Platform team for infrastructure decisions
      - Security team for security-related decisions

  3_discussion:
    action: "Address feedback, discuss alternatives"
    format: "PR comments and optional meeting"

  4_decision:
    action: "Accept, modify, or reject the ADR"
    authority: "Technical lead or architecture team"

  5_implementation:
    action: "Implement the decision"
    tracking: "Link implementation PRs to the ADR"
```

## Superseding ADRs

When a previous decision is revisited, create a new ADR that supersedes the old one:

```markdown
# ADR-0025: Migrate from S3 Backend to Terraform Cloud

## Status
Accepted (Supersedes ADR-0012)

## Date
2026-02-20

## Context
Since ADR-0012, our organization has grown from 15 to 50 engineers.
The S3 backend, while functional, lacks several features that our
growing team needs:
- No built-in plan visualization
- No native approval workflows
- Manual state locking management
- No centralized variable management

Terraform Cloud now meets our data sovereignty requirements after
they launched their EU data center.

## Decision
We will migrate from S3 backend to Terraform Cloud for all
workspaces over the next 8 weeks.

(... rest of ADR follows standard template ...)
```

## Automating ADR Management

Use tools to help manage ADRs:

```bash
#!/bin/bash
# scripts/new-adr.sh
# Create a new ADR from template

# Get the next ADR number
LAST_ADR=$(ls adr/*.md | grep -o '[0-9]\{4\}' | sort -n | tail -1)
NEXT_ADR=$(printf "%04d" $((10#$LAST_ADR + 1)))

# Get the title from the user
TITLE=$1
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Create the ADR file from template
cp adr/template.md "adr/${NEXT_ADR}-${SLUG}.md"

echo "Created adr/${NEXT_ADR}-${SLUG}.md"
echo "Edit the file and submit a PR for review."
```

## Best Practices

Keep ADRs concise and focused. Each ADR should cover one decision. If you find yourself documenting multiple related decisions, split them into separate ADRs.

Write ADRs at the time of the decision, not after. The context is freshest when the decision is being made. Writing ADRs retroactively loses important nuance.

Include enough context for someone unfamiliar with the project. A new team member should be able to read the ADR and understand why the decision was made without needing additional explanation.

Link ADRs to implementation PRs and vice versa. This creates traceability between decisions and the code that implements them.

Review ADRs periodically. Some decisions may need to be revisited as the organization grows or technology changes. A periodic review helps identify ADRs that should be superseded.

## Conclusion

Architecture Decision Records are a simple but powerful tool for maintaining institutional knowledge about your Terraform infrastructure decisions. By documenting the context, alternatives, and reasoning behind significant decisions, you create a record that helps future teams understand the current state of the infrastructure and make informed decisions about its evolution. Start writing ADRs today, and your future self will thank you.
