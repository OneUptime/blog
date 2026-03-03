# How to Use Policy Enforcement in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Sentinel, OPA, Policy as Code, Security, Governance

Description: Implement policy enforcement in HCP Terraform using Sentinel and Open Policy Agent (OPA) to enforce security, compliance, and operational standards across your infrastructure.

---

Policy enforcement in HCP Terraform catches problems before they reach production. Instead of relying on code reviews alone to catch oversized instances, missing tags, or insecure configurations, you codify your rules and HCP Terraform checks them automatically on every run. A plan that violates a policy gets blocked before anyone can click "Confirm & Apply."

HCP Terraform supports two policy frameworks: Sentinel (HashiCorp's own) and Open Policy Agent (OPA). This guide covers both, with practical examples for common use cases.

## How Policy Enforcement Works

Policies run after the plan phase and before the apply:

```text
Plan -> Cost Estimation -> Policy Check -> Apply
```

Each policy has an enforcement level:
- **hard-mandatory** - Cannot be overridden. If it fails, the run stops.
- **soft-mandatory** - Can be overridden by authorized users. Useful for exceptions.
- **advisory** - Shows warnings but does not block the run.

## Sentinel Policies

Sentinel is HashiCorp's policy language. It is purpose-built for Terraform and has deep access to plan data, state data, and configuration.

### Creating a Policy Set

Policy sets group policies together and attach them to workspaces.

```hcl
# Create a Sentinel policy set from a VCS repository
resource "tfe_policy_set" "security" {
  name         = "security-policies"
  description  = "Security and compliance policies"
  organization = var.organization
  kind         = "sentinel"

  # Policies live in a VCS repository
  vcs_repo {
    identifier     = "acme/terraform-policies"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  # Apply to all workspaces in the organization
  global = true
}
```

Or scope policies to specific workspaces:

```hcl
resource "tfe_policy_set" "production_only" {
  name         = "production-policies"
  description  = "Strict policies for production workspaces"
  organization = var.organization
  kind         = "sentinel"

  vcs_repo {
    identifier     = "acme/terraform-policies"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  # Only apply to specific workspaces
  workspace_ids = [
    tfe_workspace.production_networking.id,
    tfe_workspace.production_compute.id,
    tfe_workspace.production_database.id,
  ]
}
```

### Sentinel Policy Repository Structure

```text
terraform-policies/
  sentinel.hcl           # Policy configuration
  restrict-instance-types.sentinel
  require-tags.sentinel
  enforce-encryption.sentinel
  restrict-cidr-blocks.sentinel
  test/
    restrict-instance-types/
      pass.hcl
      fail.hcl
    require-tags/
      pass.hcl
      fail.hcl
```

### sentinel.hcl Configuration

```hcl
# sentinel.hcl - Defines policies and their enforcement levels

policy "restrict-instance-types" {
  source            = "./restrict-instance-types.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "require-tags" {
  source            = "./require-tags.sentinel"
  enforcement_level = "soft-mandatory"
}

policy "enforce-encryption" {
  source            = "./enforce-encryption.sentinel"
  enforcement_level = "hard-mandatory"
}

policy "restrict-cidr-blocks" {
  source            = "./restrict-cidr-blocks.sentinel"
  enforcement_level = "advisory"
}
```

### Example: Restrict Instance Types

```python
# restrict-instance-types.sentinel
# Ensures only approved instance types are used

import "tfplan/v2" as tfplan

# List of allowed instance types
allowed_types = [
  "t3.micro",
  "t3.small",
  "t3.medium",
  "t3.large",
  "t3.xlarge",
  "r5.large",
  "r5.xlarge",
  "m5.large",
  "m5.xlarge",
]

# Find all EC2 instances in the plan
ec2_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check each instance uses an allowed type
violations = filter ec2_instances as _, instance {
  instance.change.after.instance_type not in allowed_types
}

# Policy passes if no violations
main = rule {
  length(violations) is 0
}
```

### Example: Require Tags

```python
# require-tags.sentinel
# Ensures all taggable resources have required tags

import "tfplan/v2" as tfplan

# Required tags
required_tags = ["Environment", "Team", "ManagedBy"]

# Find all resources that support tags
taggable_resources = filter tfplan.resource_changes as _, rc {
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update") and
  rc.change.after is not null and
  keys(rc.change.after) contains "tags"
}

# Check each resource has all required tags
violations = []
for taggable_resources as _, resource {
  tags = resource.change.after.tags else {}
  for required_tags as tag {
    if tag not in keys(tags) {
      append(violations, resource.address + " is missing tag: " + tag)
    }
  }
}

# Print violations for debugging
if length(violations) > 0 {
  print("Tag violations found:")
  for violations as v {
    print("  - " + v)
  }
}

main = rule {
  length(violations) is 0
}
```

### Example: Enforce Encryption

```python
# enforce-encryption.sentinel
# Ensures storage resources are encrypted

import "tfplan/v2" as tfplan

# Check S3 buckets do not have public access
s3_buckets = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_s3_bucket" and
  rc.mode is "managed" and
  rc.change.actions contains "create"
}

# Check RDS instances have storage encryption
rds_instances = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_db_instance" and
  rc.mode is "managed" and
  (rc.change.actions contains "create" or rc.change.actions contains "update")
}

rds_violations = filter rds_instances as _, instance {
  instance.change.after.storage_encrypted is not true
}

# Check EBS volumes are encrypted
ebs_volumes = filter tfplan.resource_changes as _, rc {
  rc.type is "aws_ebs_volume" and
  rc.mode is "managed" and
  rc.change.actions contains "create"
}

ebs_violations = filter ebs_volumes as _, volume {
  volume.change.after.encrypted is not true
}

main = rule {
  length(rds_violations) is 0 and
  length(ebs_violations) is 0
}
```

## Open Policy Agent (OPA) Policies

OPA uses Rego as its policy language. If your organization already uses OPA for Kubernetes policies or other systems, you can use the same language for Terraform.

### OPA Policy Set

```hcl
resource "tfe_policy_set" "opa_security" {
  name         = "opa-security-policies"
  description  = "Security policies using OPA"
  organization = var.organization
  kind         = "opa"

  vcs_repo {
    identifier     = "acme/terraform-opa-policies"
    branch         = "main"
    oauth_token_id = data.tfe_oauth_client.github.oauth_token_id
  }

  global = true
}
```

### OPA Repository Structure

```text
terraform-opa-policies/
  policies.hcl           # Policy configuration
  restrict-instance-types.rego
  require-tags.rego
```

### policies.hcl for OPA

```hcl
policy "restrict-instance-types" {
  query             = "data.terraform.policies.restrict_instance_types.deny"
  enforcement_level = "mandatory"
}

policy "require-tags" {
  query             = "data.terraform.policies.require_tags.deny"
  enforcement_level = "mandatory"
}
```

### Example OPA Policy: Restrict Instance Types

```rego
# restrict-instance-types.rego
package terraform.policies.restrict_instance_types

import input.plan as tfplan

# Allowed instance types
allowed_types := {
  "t3.micro", "t3.small", "t3.medium", "t3.large",
  "r5.large", "r5.xlarge", "m5.large", "m5.xlarge",
}

# Deny if an EC2 instance uses a disallowed type
deny[msg] {
  resource := tfplan.resource_changes[_]
  resource.type == "aws_instance"
  resource.change.actions[_] == "create"
  instance_type := resource.change.after.instance_type
  not allowed_types[instance_type]
  msg := sprintf(
    "Instance %s uses disallowed type %s. Allowed: %v",
    [resource.address, instance_type, allowed_types]
  )
}
```

### Example OPA Policy: Require Tags

```rego
# require-tags.rego
package terraform.policies.require_tags

import input.plan as tfplan

required_tags := {"Environment", "Team", "ManagedBy"}

deny[msg] {
  resource := tfplan.resource_changes[_]
  resource.change.actions[_] == "create"
  tags := object.get(resource.change.after, "tags", {})
  tag := required_tags[_]
  not tags[tag]
  msg := sprintf(
    "Resource %s is missing required tag: %s",
    [resource.address, tag]
  )
}
```

## Policy Check Results

When policies run, the results appear in the run output:

```text
Sentinel Result: true

This result means that all Sentinel policies passed and the
protected behavior is allowed.

2 policies evaluated:
  - restrict-instance-types: passed (hard-mandatory)
  - require-tags: passed (soft-mandatory)
```

When a policy fails:

```text
Sentinel Result: false

This result means that one or more Sentinel policies failed.
The run cannot be applied.

2 policies evaluated:
  - restrict-instance-types: FAILED (hard-mandatory)
      Instance aws_instance.web uses disallowed type p3.16xlarge.
  - require-tags: passed (soft-mandatory)

Hard-mandatory policy failed. This run cannot be applied.
```

## Overriding Soft-Mandatory Policies

Organization owners and users with override permissions can override soft-mandatory failures:

1. The policy check shows the failure
2. An authorized user clicks "Override & Continue"
3. They must provide a reason for the override
4. The override is logged in the audit trail

This is useful for emergency changes or legitimate exceptions that do not warrant changing the policy.

## Wrapping Up

Policy enforcement transforms Terraform governance from manual code reviews into automated guardrails. Start with a few high-impact policies - required tags, instance type restrictions, and encryption enforcement. Use hard-mandatory for security non-negotiables and soft-mandatory for standards that occasionally need exceptions. Whether you choose Sentinel or OPA depends on your team's existing experience. Both get the job done. Store policies in version control, test them with mock data, and roll them out gradually from advisory to mandatory.
