# How to Configure Organization Policies to Restrict Resource Locations in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Organization Policies, Resource Locations, Compliance, Google Cloud

Description: Learn how to use GCP Organization Policies to restrict where resources can be created, ensuring compliance with data residency requirements and cost control.

---

Data residency is not optional anymore. Whether it is GDPR requiring European data to stay in Europe, HIPAA dictating where health data can be processed, or simply your company's policy to keep workloads in specific regions, you need a way to enforce resource location constraints across your entire GCP environment. Organization Policies let you do exactly that - define where resources can and cannot be created, enforced automatically across all projects.

This guide covers how to set up location restriction policies, handle exceptions, and avoid the common pitfalls.

## What Are Organization Policies?

Organization Policies are constraints that you apply at the organization, folder, or project level. They override individual user permissions - even a project owner cannot create resources that violate an organization policy.

The location restriction policy uses the constraint `constraints/gcp.resourceLocations`. It controls where GCP resources can be deployed.

## Understanding Location Values

GCP organizes locations into a hierarchy:

- **Regions**: `us-central1`, `europe-west1`, `asia-east1`
- **Zones**: `us-central1-a`, `europe-west1-b`
- **Multi-regions**: `us`, `eu`, `asia`
- **Value groups**: `in:us-locations`, `in:eu-locations`, `in:asia-locations`

Value groups are especially useful because they cover all regions within a continent, including any new regions Google adds in the future.

## Setting Up a Basic Location Restriction

### Restrict to US Locations Only

If your compliance requirement is to keep all resources in the United States:

```yaml
# us-only-policy.yaml
# Restrict all resources to US locations
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:us-locations
```

Apply it at the organization level:

```bash
# Apply the policy to the entire organization
gcloud resource-manager org-policies set-policy us-only-policy.yaml \
  --organization=ORGANIZATION_ID
```

Or at a specific folder:

```bash
# Apply only to the Production folder
gcloud resource-manager org-policies set-policy us-only-policy.yaml \
  --folder=PRODUCTION_FOLDER_ID
```

### Restrict to Specific Regions

For tighter control, specify exact regions:

```yaml
# specific-regions-policy.yaml
# Only allow resources in specific regions
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - us-central1
    - us-east1
    - us-east4
```

This is stricter than `in:us-locations` because it excludes US regions you have not explicitly allowed.

### Restrict to EU Locations (GDPR)

For GDPR compliance, restrict to European locations:

```yaml
# eu-only-policy.yaml
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:eu-locations
```

## Applying Different Policies at Different Levels

One of the most powerful aspects of organization policies is that they can be set at different levels of the resource hierarchy, and child nodes can inherit or override parent policies.

### Example: US-Only Organization with EU Exception

Your organization defaults to US locations, but one team needs EU resources for a GDPR-specific workload:

```bash
# Set US-only at the organization level
gcloud resource-manager org-policies set-policy us-only-policy.yaml \
  --organization=ORGANIZATION_ID
```

Then override for the specific folder or project that needs EU access:

```yaml
# eu-override-policy.yaml
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:eu-locations
  inheritFromParent: false
```

```bash
# Apply the EU override to a specific folder
gcloud resource-manager org-policies set-policy eu-override-policy.yaml \
  --folder=EU_TEAM_FOLDER_ID
```

Setting `inheritFromParent: false` means this folder ignores the organization-level US restriction and only allows EU locations.

## Using the gcloud CLI for Policy Management

### Check the Current Policy

```bash
# View the effective policy for a project
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --project=my-project

# View the effective policy for a folder
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --folder=FOLDER_ID

# View the effective policy at the org level
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --organization=ORGANIZATION_ID
```

### List All Active Policies

```bash
# List all organization policies set on a resource
gcloud resource-manager org-policies list \
  --organization=ORGANIZATION_ID \
  --format="table(constraint, listPolicy, booleanPolicy)"
```

### Delete a Policy (Revert to Parent)

```bash
# Remove the policy from a project (it will inherit from its parent)
gcloud resource-manager org-policies delete \
  constraints/gcp.resourceLocations \
  --project=my-project
```

## Terraform Implementation

Managing organization policies as code with Terraform:

```hcl
# Organization-wide location restriction
resource "google_organization_policy" "location_restriction" {
  org_id     = "ORGANIZATION_ID"
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    allow {
      values = ["in:us-locations"]
    }
  }
}

# Folder-level override for EU team
resource "google_folder_organization_policy" "eu_team_location" {
  folder     = google_folder.eu_team.name
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    inherit_from_parent = false
    allow {
      values = ["in:eu-locations"]
    }
  }
}

# Project-level override for a specific project
resource "google_project_organization_policy" "multi_region_project" {
  project    = "special-multi-region-project"
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    inherit_from_parent = false
    allow {
      values = [
        "in:us-locations",
        "in:eu-locations"
      ]
    }
  }
}
```

## Other Useful Organization Policies for Cost and Security

While you are configuring location restrictions, consider these related policies:

### Restrict VM External IP Addresses

Prevent VMs from having external IPs (forces use of Cloud NAT or load balancers):

```yaml
# no-external-ip-policy.yaml
constraint: constraints/compute.vmExternalIpAccess
listPolicy:
  allValues: DENY
```

```bash
gcloud resource-manager org-policies set-policy no-external-ip-policy.yaml \
  --folder=PRODUCTION_FOLDER_ID
```

### Restrict Which Machine Types Can Be Used

Prevent teams from provisioning expensive machine types:

```yaml
# allowed-machine-types.yaml
constraint: constraints/compute.restrictMachineTypes
listPolicy:
  allowedValues:
    - e2-micro
    - e2-small
    - e2-medium
    - e2-standard-2
    - e2-standard-4
    - e2-standard-8
    - n2-standard-2
    - n2-standard-4
    - n2-standard-8
```

### Disable Service Account Key Creation

Reduce security risk by preventing the creation of service account keys:

```bash
gcloud resource-manager org-policies enable-enforce \
  iam.disableServiceAccountKeyCreation \
  --organization=ORGANIZATION_ID
```

### Restrict VPC Peering

Control which networks can be peered:

```bash
gcloud resource-manager org-policies enable-enforce \
  compute.restrictVpcPeering \
  --organization=ORGANIZATION_ID
```

## Testing Policy Changes

Before applying a policy broadly, test it on a single project:

```bash
# Apply the policy to a test project first
gcloud resource-manager org-policies set-policy us-only-policy.yaml \
  --project=my-test-project

# Try to create a resource in a restricted location
gcloud compute instances create test-vm \
  --zone=europe-west1-b \
  --machine-type=e2-micro \
  --project=my-test-project
```

The second command should fail with an error like:
```
ERROR: (gcloud.compute.instances.create) Could not fetch resource:
 - Operation denied by org policy constraint: constraints/gcp.resourceLocations
```

## Handling Global Resources

Some GCP resources are global and do not belong to a specific region:

- Cloud DNS records
- Global load balancers
- IAM roles and policies
- Organization-level resources

The `in:us-locations` value group includes the `global` location, so global resources are allowed when US locations are permitted. If you need to explicitly allow global resources alongside specific regions:

```yaml
# Allow specific regions plus global resources
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - us-central1
    - us-east1
    - global
```

## Monitoring Policy Violations

Even with policies in place, it is good practice to monitor for attempts to violate them:

```bash
# Search audit logs for policy violation attempts
gcloud logging read \
  'protoPayload.status.code=7 AND
   protoPayload.status.message:"orgpolicy"' \
  --organization=ORGANIZATION_ID \
  --limit=20 \
  --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.methodName)"
```

Set up a log-based alert to notify your security team when someone tries to create resources in restricted locations:

```bash
# Create an alert for organization policy violations
gcloud logging metrics create org-policy-violations \
  --description="Count of organization policy violations" \
  --log-filter='protoPayload.status.code=7 AND
    protoPayload.status.message:"orgpolicy"' \
  --project=shared-monitoring-project
```

## Common Mistakes

1. **Forgetting about global resources** - Some services require global resources even if your data is regional. Make sure your policy allows `global` if needed.

2. **Not testing before org-wide rollout** - A too-restrictive policy can break CI/CD pipelines and automated provisioning. Test on a single project first.

3. **Ignoring multi-region services** - Services like BigQuery and Cloud Storage have multi-region options (e.g., `us`, `eu`). Make sure your policy covers these if your teams use them.

4. **Over-granting Organization Policy Admin** - The role `roles/orgpolicy.policyAdmin` lets users change any organization policy. Limit this to a small number of trusted administrators.

5. **Not documenting exceptions** - When you create folder or project-level overrides, document why the exception exists and who approved it.

## Wrapping Up

Organization policies for resource locations are one of the most powerful governance tools in GCP. They enforce compliance automatically, prevent accidental deployment in wrong regions, and give you confidence that data residency requirements are being met. Start with a broad policy at the organization level, create targeted exceptions where needed, and monitor for violation attempts. Combined with a well-designed folder hierarchy, location policies give you control without slowing down your development teams.
