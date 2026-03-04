# How to Organize Sentinel Policies for Large Organizations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Organizations, Governance, Enterprise, Best Practices

Description: Learn how to organize and manage Sentinel policies at scale for large organizations with multiple teams, environments, and compliance requirements.

---

When you have five Sentinel policies, organization is not a problem. When you have fifty or a hundred, it becomes critical. Large organizations need a structured approach to managing policies across multiple teams, environments, cloud providers, and compliance frameworks. This guide covers the patterns and practices that work at scale.

## The Challenge of Scale

As organizations grow their Sentinel policy libraries, they face several challenges:

- Different teams need different policies
- Compliance requirements vary by project
- Policies need different enforcement levels in different environments
- Multiple people need to contribute and review policies
- Testing and deployment need to be automated
- Policy changes need to be auditable

Without good organization, you end up with duplicated policies, inconsistent enforcement, and policies that nobody understands or maintains.

## Repository Structure

The foundation of good organization is a clear repository structure. Here is a pattern that scales well:

```text
sentinel-policies/
  global/
    enforce-tags.sentinel
    restrict-regions.sentinel
    enforce-encryption.sentinel
  security/
    network-security.sentinel
    restrict-public-access.sentinel
    enforce-tls.sentinel
  cost/
    cost-limits.sentinel
    restrict-instance-types.sentinel
    restrict-storage-sizes.sentinel
  compliance/
    cis/
      cis-cloudtrail.sentinel
      cis-s3-encryption.sentinel
      cis-vpc-flow-logs.sentinel
    hipaa/
      hipaa-encryption.sentinel
      hipaa-logging.sentinel
    pci/
      pci-network.sentinel
      pci-encryption-transit.sentinel
  lib/
    common-functions.sentinel
    aws-helpers.sentinel
  test/
    global/
      enforce-tags/
        pass.hcl
        fail.hcl
    security/
      network-security/
        pass.hcl
        fail.hcl
    ...
  testdata/
    mock-tfplan-basic.sentinel
    mock-tfrun-prod.sentinel
    ...
  sentinel.hcl
  README.md
```

### Key Organization Principles

1. **Group by domain** - Security, cost, compliance, and global policies each get their own directory
2. **Separate compliance frameworks** - Each framework (CIS, HIPAA, PCI) gets its own subdirectory
3. **Shared libraries** - Common functions go in `lib/` to avoid duplication
4. **Tests mirror policy structure** - The test directory mirrors the policy directory structure
5. **Shared test data** - Common mock data goes in `testdata/`

## Using Shared Functions

Reusable functions prevent code duplication across policies:

```python
# lib/common-functions.sentinel
# Shared helper functions for all policies

# Filter resources by type and action
filter_resources = func(resource_changes, resource_type, actions) {
    return filter resource_changes as _, rc {
        rc.type is resource_type and
        any actions as action {
            rc.change.actions contains action
        }
    }
}

# Check if a resource has required tags
has_required_tags = func(resource, required_tags) {
    if resource.change.after.tags is null {
        return false
    }
    tags = resource.change.after.tags
    for required_tags as tag {
        if tag not in tags {
            return false
        }
    }
    return true
}

# Get environment from workspace name
get_environment = func(workspace_name) {
    if workspace_name matches ".*-prod$" {
        return "production"
    } else if workspace_name matches ".*-staging$" {
        return "staging"
    } else if workspace_name matches ".*-dev$" {
        return "development"
    } else {
        return "sandbox"
    }
}
```

Then use these functions in your policies:

```python
# global/enforce-tags.sentinel
import "tfplan/v2" as tfplan
import "lib/common-functions" as common

required_tags = ["Environment", "Team", "Owner"]

instances = common.filter_resources(
    tfplan.resource_changes,
    "aws_instance",
    ["create", "update"],
)

main = rule {
    all instances as _, inst {
        common.has_required_tags(inst, required_tags)
    }
}
```

## Policy Sets for Different Teams

In HCP Terraform, policy sets let you apply different policies to different workspaces. Structure your policy sets to match your organizational needs:

```hcl
# sentinel.hcl for global policies (applied to all workspaces)

policy "enforce-tags" {
    source            = "./global/enforce-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-regions" {
    source            = "./global/restrict-regions.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "enforce-encryption" {
    source            = "./global/enforce-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}
```

```hcl
# sentinel-security.hcl for security-sensitive workspaces

policy "network-security" {
    source            = "./security/network-security.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-public-access" {
    source            = "./security/restrict-public-access.sentinel"
    enforcement_level = "hard-mandatory"
}
```

```hcl
# sentinel-hipaa.hcl for HIPAA workspaces

policy "hipaa-encryption" {
    source            = "./compliance/hipaa/hipaa-encryption.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "hipaa-logging" {
    source            = "./compliance/hipaa/hipaa-logging.sentinel"
    enforcement_level = "hard-mandatory"
}
```

## Versioning and Release Process

Treat your policy repository like a software project:

### Branching Strategy

```text
main          - Production policies (applied to workspaces)
develop       - Integration branch for testing
feature/*     - Individual policy development
hotfix/*      - Urgent policy fixes
```

### Release Tagging

```bash
# Tag releases for traceability
git tag -a v1.5.0 -m "Add HIPAA encryption policies"
git push origin v1.5.0
```

### Pull Request Process

Every policy change should go through a pull request with:

1. Description of what the policy does and why
2. Test results (passing CI)
3. Review from both policy and domain experts
4. Approval from the governance team

## Configuration-Driven Policies

For large organizations, making policies configurable reduces the need for duplicate policies:

```python
# configurable-tagging.sentinel
# A single policy that accepts configuration

import "tfplan/v2" as tfplan

# These values can be overridden in policy set configuration
param required_tags default ["Environment", "Team"]
param tag_prefix default ""
param strict_mode default false

resources = filter tfplan.resource_changes as _, rc {
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.tags is not null
}

main = rule {
    all resources as _, rc {
        tags = rc.change.after.tags
        all required_tags as tag {
            full_tag = tag_prefix + tag
            full_tag in tags
        }
    }
}
```

Configure it differently per policy set:

```hcl
policy "enforce-tags-platform" {
    source            = "./global/configurable-tagging.sentinel"
    enforcement_level = "hard-mandatory"

    params = {
        required_tags = ["Environment", "Team", "CostCenter", "Owner"]
        strict_mode   = true
    }
}
```

## Documentation Standards

Each policy should have clear documentation:

```python
# Policy: enforce-tags
# Version: 1.3
# Author: Platform Team
# Last Modified: 2026-02-15
#
# Description:
#   Ensures all taggable AWS resources have required tags.
#   Tags are necessary for cost allocation and ownership tracking.
#
# Enforcement Level: hard-mandatory
# Scope: All workspaces
#
# Required Tags:
#   - Environment: Must be one of: production, staging, development, sandbox
#   - Team: Must match a valid team name
#   - Owner: Must be a valid email address
#
# Exceptions: None. Contact platform-team for questions.
```

## Monitoring and Reporting

Track policy effectiveness over time:

```python
# Add structured output to policies for reporting
print("=== Policy Check: enforce-tags ===")
print("Workspace:", tfrun.workspace.name)
print("Resources checked:", length(resources))
print("Violations found:", violation_count)
print("===")
```

## Scaling Patterns

### Pattern 1: Tiered Enforcement

```text
Tier 1 (All workspaces):
  - Basic tagging
  - Region restrictions
  - Encryption requirements

Tier 2 (Production workspaces):
  - Strict instance types
  - Network security
  - Cost limits

Tier 3 (Compliance workspaces):
  - Framework-specific policies (HIPAA, PCI, etc.)
  - Audit logging requirements
  - Data classification enforcement
```

### Pattern 2: Team-Owned Policies

Different teams own different policy sets:

- **Security team** owns security and compliance policies
- **Platform team** owns infrastructure standards
- **FinOps team** owns cost control policies
- **Individual teams** can add workspace-specific policies

### Pattern 3: Graduated Rollout

When introducing new policies:

1. Start as `advisory` (warn but do not block)
2. Monitor for false positives over 2-4 weeks
3. Move to `soft-mandatory` (can be overridden)
4. After validation, move to `hard-mandatory`

Good organization is what makes Sentinel sustainable at scale. Without it, policies become a burden rather than a benefit. For more on deploying policies, see our posts on [policy sets in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-policy-sets-in-hcp-terraform/view) and [configuring enforcement levels](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-sentinel-policy-enforcement-levels/view).
