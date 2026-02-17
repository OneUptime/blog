# How to Debug Organization Policy Constraints Blocking Resource Creation in Child Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Organization Policy, IAM, Governance, Google Cloud

Description: Learn how to identify and debug organization policy constraints that prevent resource creation in child projects within your Google Cloud organization.

---

You have the right IAM permissions. You have checked your quotas. But when you try to create a resource in your project, you get an error saying the operation is blocked by an organization policy. Organization policies are constraints applied at the organization or folder level that trickle down to all child projects. They enforce guardrails like "no public IP addresses on VMs" or "only allow resources in specific regions." When they block something you need to do, figuring out which constraint is responsible and where it is set can be a real puzzle.

## Understanding Organization Policy Hierarchy

Organization policies follow the Google Cloud resource hierarchy: Organization > Folders > Projects > Resources. A constraint set at the organization level applies to every folder and project underneath it. Folders can override or further restrict the organization-level policy, and projects can do the same relative to their parent folder.

The key thing to understand is that policies are inherited by default. A project inherits constraints from its parent folder and ultimately from the organization. You cannot override a constraint from a parent unless the parent explicitly allows overrides.

## Step 1: Identify the Constraint Causing the Block

The error message usually mentions the constraint name. Look for something like:

```
Operation denied by organization policy constraint: constraints/compute.vmExternalIpAccess
```

If the error does not explicitly state the constraint, look at the error code and the resource type you are creating to narrow it down. Common constraints that block resource creation:

| Constraint | What It Blocks |
|---|---|
| `compute.vmExternalIpAccess` | VMs with external IPs |
| `compute.restrictVpcPeering` | VPC peering to certain networks |
| `gcp.resourceLocations` | Resources outside allowed regions |
| `iam.allowedPolicyMemberDomains` | IAM bindings for external identities |
| `compute.requireShieldedVm` | Non-shielded VMs |
| `storage.uniformBucketLevelAccess` | Buckets without uniform access |

## Step 2: Check the Effective Policy on Your Project

See what the effective (inherited + local) policy is for a specific constraint:

```bash
# Check the effective policy for a constraint on your project
gcloud resource-manager org-policies describe \
    constraints/compute.vmExternalIpAccess \
    --project=your-project-id \
    --effective
```

The `--effective` flag shows the final merged policy after inheritance. This is what actually applies to your project.

The output shows whether the constraint is enforced, and if it has an allow list or deny list.

## Step 3: Trace the Policy Through the Hierarchy

To find where the constraint is set, check each level of the hierarchy:

```bash
# Check at the project level
gcloud resource-manager org-policies describe \
    constraints/compute.vmExternalIpAccess \
    --project=your-project-id

# Check at the folder level
gcloud resource-manager org-policies describe \
    constraints/compute.vmExternalIpAccess \
    --folder=your-folder-id

# Check at the organization level
gcloud resource-manager org-policies describe \
    constraints/compute.vmExternalIpAccess \
    --organization=your-org-id
```

If a level does not have the policy set, it inherits from the parent. The first level that explicitly sets the policy is where you need to make changes (or request changes).

To find your project's folder and organization:

```bash
# Get the project's parent (folder or organization)
gcloud projects describe your-project-id \
    --format="json(parent)"

# Get the folder's parent
gcloud resource-manager folders describe your-folder-id \
    --format="json(parent)"
```

## Step 4: Understand the Constraint Type

There are two types of constraints:

Boolean constraints are either enforced (true) or not (false). For example, `compute.requireShieldedVm` is either on or off.

List constraints have allow lists or deny lists. For example, `gcp.resourceLocations` has a list of allowed or denied locations.

For boolean constraints:

```bash
# Check if a boolean constraint is enforced
gcloud resource-manager org-policies describe \
    constraints/compute.requireShieldedVm \
    --project=your-project-id \
    --effective
```

For list constraints:

```bash
# Check allowed values for a list constraint
gcloud resource-manager org-policies describe \
    constraints/gcp.resourceLocations \
    --project=your-project-id \
    --effective
```

## Step 5: Request an Exception

If you have a legitimate need to bypass a constraint, there are a few approaches:

Option 1 - Add your project to an exception list (requires organization admin):

```bash
# Set a project-level override for a boolean constraint
gcloud resource-manager org-policies disable-enforce \
    constraints/compute.requireShieldedVm \
    --project=your-project-id
```

Option 2 - Add specific values to an allow list:

```bash
# Allow specific locations for a project
gcloud resource-manager org-policies allow \
    constraints/gcp.resourceLocations \
    --project=your-project-id \
    "in:us-east1-locations" "in:us-central1-locations"
```

Option 3 - Use tags and conditional policies (recommended for fine-grained control):

```bash
# Create a tag for exception projects
gcloud resource-manager tags keys create org-policy-exception \
    --parent=organizations/your-org-id \
    --description="Tag for org policy exceptions"

gcloud resource-manager tags values create allowed \
    --parent=organizations/your-org-id/org-policy-exception

# Create a conditional org policy that relaxes the constraint for tagged resources
gcloud org-policies set-policy policy.yaml
```

## Step 6: List All Constraints on Your Project

If you are not sure which constraint is blocking you, list all effective constraints:

```bash
# List all organization policy constraints and their effective settings
gcloud resource-manager org-policies list \
    --project=your-project-id \
    --format="table(constraint, listPolicy, booleanPolicy)"
```

This gives you a comprehensive view of every constraint affecting your project. Look for constraints related to the resource type you are trying to create.

## Step 7: Check the Audit Log

Organization policy violations are logged. Check the audit logs for the exact constraint and violation:

```bash
# Search audit logs for org policy violations
gcloud logging read 'protoPayload.status.message:"orgpolicy" OR protoPayload.status.message:"constraint"' \
    --project=your-project-id \
    --limit=20 \
    --format="table(timestamp, protoPayload.status.message)"
```

The log entries contain the full constraint name and the specific value that was rejected, which helps you understand exactly what needs to change.

## Step 8: Simulate Policy Changes

Before making changes to organization policies, you can use the Policy Simulator to understand the impact:

```bash
# Simulate the effect of changing an org policy
gcloud resource-manager org-policies simulate \
    constraints/gcp.resourceLocations \
    --project=your-project-id \
    --values="in:us-east1-locations"
```

This shows you how the change would affect existing resources and future resource creation.

## Common Gotchas

1. Even project owners cannot override organization policies unless the parent allows it
2. Some constraints take a few minutes to propagate after changes
3. The `restoreDefault` policy resets to the Google-defined default, not to "no policy"
4. Conditional organization policies based on tags require the resource to be tagged before creation, which creates a chicken-and-egg problem for some resource types
5. The `inheritFromParent` flag on list constraints adds to the parent's list rather than replacing it

## Monitoring Policy Compliance

Use [OneUptime](https://oneuptime.com) to monitor for organization policy violations in real time. By tracking audit log events related to policy denials, you can quickly identify when teams hit constraints and proactively work with your platform team to resolve them.

Organization policies are a powerful governance tool, but they need proper documentation and exception processes to avoid blocking legitimate work. Make sure your organization has a clear process for requesting policy exceptions when needed.
