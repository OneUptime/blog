# How to Use Sentinel Policy Sets in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, HCP Terraform, Policy Sets, Terraform Cloud

Description: Learn how to create, configure, and manage Sentinel policy sets in HCP Terraform to enforce governance across workspaces and organizations.

---

Policy sets are the mechanism for deploying Sentinel policies to HCP Terraform (formerly Terraform Cloud). They let you group policies together and apply them to specific workspaces, projects, or your entire organization. Understanding how policy sets work is essential for operationalizing your Sentinel policies.

## What is a Policy Set?

A policy set is a collection of Sentinel policies that are evaluated together during Terraform runs. You can attach a policy set to:

- Specific workspaces
- All workspaces in a project
- All workspaces in the organization (global)

When a Terraform run triggers in an attached workspace, all policies in the policy set are evaluated against the plan.

## Creating a Policy Set via the UI

The simplest way to get started is through the HCP Terraform web interface:

1. Navigate to your organization settings
2. Click on "Policy Sets" under "Governance"
3. Click "Create a new policy set"
4. Choose the source (VCS or API)
5. Configure the connection
6. Select which workspaces to apply it to

## Creating a Policy Set from VCS

The recommended approach is connecting a VCS repository that contains your Sentinel policies. This gives you version control, code review, and automatic deployment.

### Repository Structure

Your VCS repository needs a `sentinel.hcl` file that defines the policies:

```hcl
# sentinel.hcl - Policy set configuration

policy "enforce-tags" {
    source            = "./policies/enforce-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-instance-types" {
    source            = "./policies/restrict-instance-types.sentinel"
    enforcement_level = "soft-mandatory"
}

policy "cost-limit" {
    source            = "./policies/cost-limit.sentinel"
    enforcement_level = "advisory"
}
```

The complete repository structure:

```
my-policy-repo/
  sentinel.hcl
  policies/
    enforce-tags.sentinel
    restrict-instance-types.sentinel
    cost-limit.sentinel
  lib/
    helpers.sentinel
  test/
    enforce-tags/
      pass.hcl
      fail.hcl
  testdata/
    mock-tfplan.sentinel
```

### Connecting the Repository

```bash
# Using the Terraform CLI or API to create a policy set
# Or configure it through the HCP Terraform UI

# Navigate to:
# Organization Settings > Policy Sets > Create Policy Set
# Source: "Connect to a version control provider"
# Repository: your-org/sentinel-policies
# Branch: main
# Policies Path: / (or a subdirectory)
```

## Creating Policy Sets via the API

For automation, use the HCP Terraform API:

```bash
# Create a policy set via the API
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": {
      "type": "policy-sets",
      "attributes": {
        "name": "security-policies",
        "description": "Core security policies for all workspaces",
        "global": true,
        "policies-path": "/security",
        "vcs-repo": {
          "identifier": "myorg/sentinel-policies",
          "branch": "main",
          "oauth-token-id": "ot-xxxxxxxxxxxx"
        }
      },
      "relationships": {
        "organization": {
          "data": {
            "type": "organizations",
            "id": "my-org"
          }
        }
      }
    }
  }' \
  https://app.terraform.io/api/v2/organizations/my-org/policy-sets
```

## Scoping Policy Sets

### Global Policy Sets

Global policy sets apply to every workspace in the organization:

```bash
# Set a policy set as global
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request PATCH \
  --data '{
    "data": {
      "type": "policy-sets",
      "attributes": {
        "global": true
      }
    }
  }' \
  https://app.terraform.io/api/v2/policy-sets/polset-xxxxxxxxxxxx
```

Use global policy sets for organization-wide standards like:
- Required tagging
- Region restrictions
- Basic encryption requirements

### Workspace-Scoped Policy Sets

Attach policy sets to specific workspaces:

```bash
# Attach a policy set to specific workspaces
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": [
      { "type": "workspaces", "id": "ws-xxxxxxxxxxxx" },
      { "type": "workspaces", "id": "ws-yyyyyyyyyyyy" }
    ]
  }' \
  https://app.terraform.io/api/v2/policy-sets/polset-xxxxxxxxxxxx/relationships/workspaces
```

### Project-Scoped Policy Sets

You can also attach policy sets to projects, which applies them to all workspaces in the project:

```bash
# Attach a policy set to a project
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  --data '{
    "data": [
      { "type": "projects", "id": "prj-xxxxxxxxxxxx" }
    ]
  }' \
  https://app.terraform.io/api/v2/policy-sets/polset-xxxxxxxxxxxx/relationships/projects
```

## Multiple Policy Sets Strategy

Most organizations use multiple policy sets with different scopes:

```
Global Policy Set (all workspaces):
  - enforce-tags (hard-mandatory)
  - restrict-regions (hard-mandatory)
  - basic-encryption (hard-mandatory)

Security Policy Set (production workspaces):
  - network-security (hard-mandatory)
  - restrict-public-access (hard-mandatory)
  - enforce-tls (hard-mandatory)

Cost Policy Set (all workspaces):
  - cost-limits (soft-mandatory)
  - restrict-instance-types (soft-mandatory)

HIPAA Policy Set (healthcare workspaces):
  - hipaa-encryption (hard-mandatory)
  - hipaa-logging (hard-mandatory)
  - hipaa-backup (hard-mandatory)

PCI Policy Set (payment workspaces):
  - pci-network (hard-mandatory)
  - pci-encryption (hard-mandatory)
```

## Policy Parameters

You can pass parameters to policies through the policy set configuration. This lets you reuse the same policy with different settings:

```hcl
# sentinel.hcl with parameters

policy "restrict-instance-types" {
    source            = "./policies/restrict-instance-types.sentinel"
    enforcement_level = "hard-mandatory"

    params = {
        allowed_types = ["t3.micro", "t3.small", "t3.medium"]
    }
}
```

In the policy, access the parameter:

```python
# restrict-instance-types.sentinel
import "tfplan/v2" as tfplan

# Parameter with default value
param allowed_types default ["t3.micro", "t3.small"]

instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    rc.change.actions contains "create"
}

main = rule {
    all instances as _, inst {
        inst.change.after.instance_type in allowed_types
    }
}
```

## Updating Policy Sets

When you push changes to the connected VCS repository, HCP Terraform automatically picks up the updates. The new policies are applied to the next Terraform run.

For immediate updates without a VCS push:

```bash
# Manually trigger a policy set sync
# This is done automatically on VCS pushes, but can be triggered manually
# through the UI: Policy Set > Settings > "Update from VCS"
```

## Monitoring Policy Evaluations

After policy sets are deployed, you can monitor their evaluations:

```bash
# List policy checks for a run
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/runs/run-xxxxxxxxxxxx/policy-checks

# Get details of a specific policy check
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/policy-checks/polchk-xxxxxxxxxxxx
```

The UI also shows policy evaluation results directly on the run page, including which policies passed, failed, and any print output.

## Troubleshooting Policy Sets

### Common Issues

1. **Policies not evaluating** - Check that the policy set is attached to the workspace and the sentinel.hcl file is correct.

2. **Import errors** - Make sure your policy file paths in sentinel.hcl match the actual file locations.

3. **Unexpected failures** - Check the print output from your policies. Add more print statements for debugging.

4. **Policy set not syncing** - Verify the VCS connection is active and the branch is correct.

### Debugging Steps

```bash
# Check policy set status
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/policy-sets/polset-xxxxxxxxxxxx

# Check recent policy evaluations
curl \
  --header "Authorization: Bearer $TFC_TOKEN" \
  https://app.terraform.io/api/v2/policy-sets/polset-xxxxxxxxxxxx/policy-checks
```

## Best Practices

1. **Start with advisory** - Deploy new policy sets as advisory first to see their impact
2. **Use separate repos** - Keep policy sets in separate repositories for independent versioning
3. **Test before deploying** - Always run `sentinel test` in CI before merging
4. **Document scope** - Clearly document which workspaces each policy set targets
5. **Review regularly** - Audit policy set attachments quarterly to ensure they are still relevant

Policy sets are the bridge between writing policies and enforcing them. Get the scoping right and your policies will protect the right workspaces without being overbearing. For more on enforcement levels, see our post on [configuring Sentinel policy enforcement levels](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-sentinel-policy-enforcement-levels/view).
