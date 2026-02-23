# How to Handle Terraform Knowledge Sharing in Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Knowledge Sharing, Team Collaboration, DevOps, Training

Description: Build effective knowledge sharing practices for Terraform teams to prevent knowledge silos, accelerate onboarding, and improve infrastructure code quality.

---

Every organization has that one engineer who knows where all the Terraform bodies are buried. They know why the VPC uses that specific CIDR range, why the database has a particular parameter group, and what happens when you try to resize the EKS cluster on a Tuesday afternoon. When that person goes on vacation, infrastructure changes slow to a crawl. When they leave the company, critical knowledge walks out the door.

Knowledge sharing is the antidote to this single-point-of-failure problem. It transforms individual expertise into team capability, making your infrastructure operations resilient regardless of who is available.

## The Knowledge Silo Problem

Terraform knowledge silos form naturally. The engineer who built the networking module understands it deeply. The engineer who set up the CI/CD pipeline knows every quirk of the apply process. Over time, these individuals become the only ones who can safely modify certain parts of the infrastructure.

The consequences are significant. Pull requests sit unreviewed because only one person can evaluate them. On-call engineers escalate routine infrastructure issues because they do not understand the Terraform code. New team members take months to become productive because there is no structured way to learn.

## Creating a Knowledge Base

Start by documenting the knowledge that currently lives only in people's heads:

### Architecture Documentation

```markdown
# Infrastructure Architecture Overview

## Network Topology
- Production VPC: 10.0.0.0/16 (us-east-1)
  - Public subnets: 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24
  - Private subnets: 10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24
  - VPN CIDR: 10.0.100.0/24 (corporate office connection)

- Staging VPC: 10.1.0.0/16 (us-east-1)
  - Mirrors production layout with smaller instance sizes

## State Organization
- Networking state: s3://company-state/networking/{env}/
- Application state: s3://company-state/app/{env}/
- Database state: s3://company-state/database/{env}/
- Dependencies flow: networking -> database -> application

## Key Design Decisions
- See ADR directory for detailed decision records
- Multi-AZ NAT gateways in production (ADR-003)
- Separate state files per team (ADR-007)
- ECS Fargate for all application workloads (ADR-012)
```

### Operational Knowledge

Document the things that are not obvious from reading the code:

```markdown
# Operational Knowledge Base

## Things That Can Go Wrong

### EKS Node Group Scaling
When scaling EKS node groups, Terraform may try to replace
all nodes simultaneously. Always use `create_before_destroy`
lifecycle rules and set `max_unavailable` to 1.

### RDS Parameter Group Changes
Changing certain RDS parameters requires a reboot. Terraform
will not tell you this - it will apply the change and the
parameter will show as "pending-reboot" until you manually
restart the instance.

### S3 Bucket Deletion
S3 buckets with objects cannot be deleted by Terraform. You
must either empty the bucket first or set `force_destroy = true`
(use with extreme caution in production).

## Workarounds Currently in Place

### Lambda@Edge Deletion
Lambda@Edge functions cannot be deleted immediately after
removing them from CloudFront. There is a 30-minute delay.
Our CI pipeline retries the destroy operation with exponential
backoff. See: modules/cdn/destroy_retry.sh

### Cross-Account IAM
Cross-account IAM role assumption requires the trust policy
to be created before the assuming role. We handle this by
splitting the apply into two phases. See: docs/cross-account-setup.md
```

## Pair Programming for Terraform

Pair programming is one of the most effective knowledge sharing techniques for infrastructure work:

### Structured Pairing Sessions

```markdown
# Terraform Pairing Schedule

## Weekly Pairing Rotation
Each week, two engineers pair on infrastructure tasks.
One drives, one navigates. Roles swap halfway through each session.

## Pairing Topics by Week
Week 1: Networking changes (VPC, subnets, route tables)
Week 2: Application infrastructure (ECS, ALB, auto-scaling)
Week 3: Database operations (RDS, ElastiCache, DynamoDB)
Week 4: Security and IAM (policies, roles, security groups)

## Pairing Guidelines
- Sessions are 2 hours, twice per week
- The navigator asks questions and takes notes
- After each session, update the knowledge base with learnings
- Both engineers review and approve the resulting PR
```

### Cross-Team Pairing

Schedule regular pairing sessions between teams:

```markdown
# Cross-Team Knowledge Exchange

## Monthly Cross-Team Pairing
- Networking team pairs with Application team
  Focus: How networking decisions affect application deployment
- Security team pairs with Database team
  Focus: How security policies interact with data access patterns
- Platform team pairs with any team requesting help
  Focus: Module usage, CI/CD workflows, best practices
```

## Terraform Show and Tell

Run regular sessions where team members present their work:

```markdown
# Terraform Show and Tell

## Format
- 30 minutes, every two weeks
- One presenter per session
- 15 minutes presentation, 15 minutes Q&A
- Recorded for team members who cannot attend

## Topic Ideas
- "How I migrated our VPC without downtime"
- "Lessons from upgrading the AWS provider to v5"
- "Building our first Terraform test suite"
- "Debugging a state corruption incident"
- "How the new ECS module simplifies deployments"

## Presenter Rotation
Rotate through all team members. New hires present within
their first 3 months on topics they found confusing - this
helps identify documentation gaps.
```

## Code Review as Knowledge Sharing

Transform code reviews from gatekeeping into teaching opportunities:

```markdown
# Review as Learning

## For Reviewers
- Explain WHY something should change, not just WHAT
- Link to documentation or examples for best practices
- Share relevant context about the infrastructure being modified
- If you learn something from the PR, say so

## Example Review Comments

# BAD review comment:
"This is wrong."

# GOOD review comment:
"This security group allows traffic from 0.0.0.0/0 on port 22.
Our security policy requires SSH access only from the VPN CIDR
(10.0.100.0/24). See our security baseline docs:
/docs/security-baseline.md#ssh-access"

# GREAT review comment (teaches the reviewer too):
"I noticed this uses a data source to look up the AMI. We recently
switched to using our custom AMI pipeline that publishes AMI IDs
to SSM Parameter Store. Using the parameter instead would ensure
we always get our hardened base image. Example:
data 'aws_ssm_parameter' 'ami' {
  name = '/amis/base/latest'
}
This was decided in ADR-015 if you want more context."
```

## Building a Learning Path

Create structured learning paths for new team members:

```markdown
# Terraform Learning Path

## Week 1: Foundations
- Read: Terraform documentation (Getting Started)
- Do: Complete the HashiCorp Learn tutorials
- Read: Our style guide and code review guidelines
- Pair with: Any senior engineer on a small task

## Week 2: Our Infrastructure
- Read: Architecture documentation
- Read: ADR directory (all records)
- Tour: Walk through each module with its owner
- Do: Make a small, low-risk change (update a tag, add a variable)

## Week 3: Operations
- Read: Operational runbooks
- Shadow: On-call engineer for infrastructure tasks
- Do: Run terraform plan in staging (with guidance)
- Read: Incident postmortems related to infrastructure

## Week 4: Independence
- Do: Take on a medium-sized infrastructure task independently
- Review: Participate in code reviews
- Write: Document something you found confusing
- Present: Give a 5-minute talk at show-and-tell
```

## Maintaining a Lessons Learned Repository

After incidents, capture lessons in a searchable format:

```markdown
# Incident: RDS Instance Replacement
# Date: 2025-11-15
# Severity: High

## What Happened
A Terraform apply replaced the production database instead of
modifying it in-place. The `engine_version` change from 13.4
to 14.1 required replacement, which was not caught in review.

## Root Cause
The reviewer did not check the plan output for force-replacement
indicators. The `-/+` symbol was present but overlooked.

## Lessons Learned
1. Always search plan output for `-/+` on stateful resources
2. Add a CI check that flags force-replacement of databases
3. Update review checklist to specifically call out engine upgrades

## Changes Made
- Added automated plan analysis script (PR #456)
- Updated review checklist (PR #457)
- Added lifecycle prevent_destroy to all RDS instances (PR #458)

## Tags: rds, plan-review, force-replacement
```

For more on creating structured operational documentation, see our guide on [creating Terraform runbooks for operations](https://oneuptime.com/blog/post/2026-02-23-how-to-create-terraform-runbooks-for-operations/view).

## Measuring Knowledge Distribution

Track whether knowledge is actually spreading:

```markdown
# Knowledge Distribution Metrics

## Code Authorship
Track how many unique authors contribute to each module per quarter.
A module with only one author is a knowledge silo.

## Review Participation
Track how many unique reviewers approve PRs in each area.
If the same person reviews all networking PRs, knowledge is concentrated.

## On-Call Resolution
Track whether on-call engineers can resolve infrastructure issues
independently or need to escalate.
A high escalation rate signals knowledge gaps.
```

Knowledge sharing is not a one-time project. It is an ongoing practice that requires investment and commitment. The return on that investment is a team that can operate independently, recover from incidents faster, and scale without bottlenecks. Build knowledge sharing into your daily workflow, not as an extra activity but as part of how your team works.
