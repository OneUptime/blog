# How to Restrict GCP Resource Access by Geographic Region Using Access Levels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Context Manager, Security, IAM, Zero Trust

Description: Learn how to use GCP Access Context Manager to create geographic access levels that restrict resource access based on the requester's location.

---

If your organization deals with sensitive data or operates in regulated industries, you probably need to control where your cloud resources can be accessed from. Maybe your compliance requirements say that production databases should only be reachable from specific countries, or your security team wants to make sure administrative access only comes from trusted locations. GCP's Access Context Manager gives you a clean way to handle this through access levels.

In this post, I will walk through creating geographic-based access levels in GCP and binding them to resources so that only requests from approved regions can get through.

## What Is Access Context Manager?

Access Context Manager is a GCP service that lets you define fine-grained, attribute-based access control policies. It works alongside Identity-Aware Proxy (IAP) and VPC Service Controls to enforce contextual access decisions.

An access level is essentially a set of conditions that a request must meet. These conditions can include things like IP address ranges, device attributes, and - what we care about today - geographic location.

## Prerequisites

Before diving in, make sure you have:

- A GCP organization (Access Context Manager works at the org level)
- The Access Context Manager Admin role (`roles/accesscontextmanager.policyAdmin`)
- The `gcloud` CLI installed and configured
- An existing access policy for your organization

If you do not have an access policy yet, you can create one. Note that each organization gets one access policy.

The following command creates an access policy for your org:

```bash
# Create an access policy tied to your organization
gcloud access-context-manager policies create \
  --organization=ORGANIZATION_ID \
  --title="My Org Access Policy"
```

## Step 1: Define a Geographic Access Level Using YAML

Access levels can be defined inline or via YAML files. For geographic restrictions, I prefer YAML because it is easier to version control and review.

Create a file called `geo-access-level.yaml` with the regions you want to allow:

```yaml
# geo-access-level.yaml
# This access level allows requests only from the US and Canada
- regions:
    - US
    - CA
```

The region codes follow the ISO 3166-1 alpha-2 standard. So `US` is the United States, `CA` is Canada, `DE` is Germany, and so on.

## Step 2: Create the Access Level

Now use the `gcloud` CLI to create the access level. You will need your access policy ID, which you can find with:

```bash
# List existing access policies to find your policy ID
gcloud access-context-manager policies list \
  --organization=ORGANIZATION_ID
```

Once you have the policy ID, create the access level:

```bash
# Create a geographic access level from the YAML definition
gcloud access-context-manager levels create geo-restricted-na \
  --policy=POLICY_ID \
  --title="North America Only" \
  --basic-level-spec=geo-access-level.yaml
```

This creates an access level called `geo-restricted-na` that only allows requests originating from the US or Canada.

## Step 3: Verify the Access Level

Check that the access level was created correctly:

```bash
# Describe the access level to verify its configuration
gcloud access-context-manager levels describe geo-restricted-na \
  --policy=POLICY_ID
```

You should see output confirming the geographic conditions you specified.

## Step 4: Use the Access Level with VPC Service Controls

One of the most common uses for geographic access levels is with VPC Service Controls. You can create a service perimeter that uses your access level to control who can access resources inside the perimeter.

Here is how to create a service perimeter that references the geographic access level:

```bash
# Create a service perimeter that enforces geographic restrictions
gcloud access-context-manager perimeters create geo-perimeter \
  --policy=POLICY_ID \
  --title="Geo-Restricted Perimeter" \
  --resources="projects/PROJECT_NUMBER" \
  --restricted-services="bigquery.googleapis.com,storage.googleapis.com" \
  --access-levels="accessPolicies/POLICY_ID/accessLevels/geo-restricted-na"
```

This perimeter wraps your project's BigQuery and Cloud Storage services so that only requests from North America (matching the access level) can reach them.

## Step 5: Combine Geographic and Other Conditions

In practice, you often want to combine geographic restrictions with other conditions. For example, you might want to allow access only from North America AND only from corporate-managed devices.

Here is a more complete YAML that combines conditions:

```yaml
# combined-access-level.yaml
# Require both geographic location AND specific IP ranges
- regions:
    - US
    - CA
  ipSubnetworks:
    - 203.0.113.0/24
    - 198.51.100.0/24
```

When multiple conditions are in the same block, they are combined with AND logic. If you want OR logic (allow if any condition matches), put them in separate blocks:

```yaml
# or-logic-access-level.yaml
# Allow access from US OR from specific IP ranges
- regions:
    - US
- ipSubnetworks:
    - 203.0.113.0/24
```

## Step 6: Using Access Levels with Identity-Aware Proxy

If you are using Identity-Aware Proxy to protect web applications, you can bind access levels to IAP-protected resources through IAM conditions.

The following command grants a user access to an IAP-protected resource but only when the geographic access level is satisfied:

```bash
# Bind IAP access with a geographic access level condition
gcloud iap web add-iam-policy-binding \
  --resource-type=app-engine \
  --member="user:developer@example.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --condition="expression=accessPolicies/POLICY_ID/accessLevels/geo-restricted-na in request.auth.access_levels,title=geo-restriction"
```

## Managing Access Levels with Terraform

If you manage your infrastructure as code (and you should), here is how to define geographic access levels in Terraform:

```hcl
# Define an access level that restricts to specific geographic regions
resource "google_access_context_manager_access_level" "geo_restricted" {
  parent = "accessPolicies/${var.policy_id}"
  name   = "accessPolicies/${var.policy_id}/accessLevels/geo_restricted_na"
  title  = "North America Only"

  basic {
    conditions {
      regions = ["US", "CA"]
    }
  }
}

# Reference the access level in a VPC service perimeter
resource "google_access_context_manager_service_perimeter" "geo_perimeter" {
  parent = "accessPolicies/${var.policy_id}"
  name   = "accessPolicies/${var.policy_id}/servicePerimeters/geo_perimeter"
  title  = "Geo-Restricted Perimeter"

  status {
    restricted_services = [
      "bigquery.googleapis.com",
      "storage.googleapis.com",
    ]
    access_levels = [
      google_access_context_manager_access_level.geo_restricted.name,
    ]
    resources = ["projects/${var.project_number}"]
  }
}
```

## Testing and Troubleshooting

A few tips from my experience working with geographic access levels:

**Test with dry-run perimeters first.** VPC Service Controls supports a dry-run mode where violations are logged but not enforced. This is critical because a misconfigured perimeter can lock you out of your own resources.

```bash
# Create a dry-run perimeter to test without enforcing
gcloud access-context-manager perimeters dry-run create geo-perimeter-test \
  --policy=POLICY_ID \
  --title="Geo Perimeter Test" \
  --resources="projects/PROJECT_NUMBER" \
  --restricted-services="storage.googleapis.com" \
  --access-levels="accessPolicies/POLICY_ID/accessLevels/geo-restricted-na"
```

**Check audit logs for denied requests.** When a request is blocked by an access level, it shows up in Cloud Audit Logs. Look for `PERMISSION_DENIED` errors with details about which access level was not satisfied.

**Be aware of VPN and proxy traffic.** Geographic restrictions are based on the source IP's geolocation. If your users connect through a VPN that exits in a different country, they might get blocked. Plan your access levels with this in mind.

**Service accounts are evaluated differently.** Requests from GCP service accounts within the same project may or may not need to satisfy access levels, depending on how your perimeter is configured. Test this carefully.

## Summary

Geographic access levels in GCP give you a practical way to enforce location-based access controls. By combining Access Context Manager with VPC Service Controls and Identity-Aware Proxy, you can build a layered security model where sensitive resources are only reachable from approved regions. Start with a dry-run perimeter, validate your access levels against real traffic patterns, and then move to enforcement once you are confident nothing will break.
