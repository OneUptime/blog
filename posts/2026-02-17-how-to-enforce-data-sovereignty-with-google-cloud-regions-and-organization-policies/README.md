# How to Enforce Data Sovereignty with Google Cloud Regions and Organization Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Data Sovereignty, Organization Policies, Compliance, Cloud Governance

Description: Learn how to enforce data sovereignty requirements on Google Cloud using region restrictions, organization policies, and resource location constraints.

---

Data sovereignty laws are getting stricter around the world. Whether it is GDPR in Europe, LGPD in Brazil, or data localization requirements in India and Russia, the mandate is clear: certain data must stay within specific geographic boundaries. On Google Cloud, enforcing this is not just about choosing the right region when you create a resource. You need guardrails that prevent anyone in your organization from accidentally or deliberately storing data in the wrong place.

This guide covers how to set up those guardrails using organization policies, resource location constraints, and monitoring.

## Understanding GCP's Region and Zone Structure

Google Cloud resources exist in regions and zones. A region is a specific geographic area like us-central1 (Iowa) or europe-west1 (Belgium). Zones are isolated locations within a region. Multi-regional locations like "US" or "EU" span multiple regions within a geographic boundary.

For data sovereignty, you care about regions because they determine the physical location of your data. When a regulation says data must stay in the EU, you need to ensure resources only get created in EU regions and that data does not replicate to non-EU locations.

## Step 1: Define Your Location Requirements

Start by mapping your regulatory requirements to GCP regions. Here is a typical mapping for an organization that operates in Europe and the US:

| Data Category | Allowed Regions | Regulation |
|---|---|---|
| EU Customer PII | europe-west1, europe-west3, europe-west4 | GDPR |
| US Financial Data | us-central1, us-east1, us-east4 | SOX |
| General Internal | Any US or EU region | Internal Policy |

## Step 2: Apply Resource Location Restrictions

The `gcp.resourceLocations` organization policy constraint restricts where resources can be created. Apply it at the organization, folder, or project level.

```bash
# Set the organization policy to restrict resource creation to EU regions only
# Apply this to the folder containing EU customer data projects
gcloud resource-manager org-policies set-policy \
  --folder=EU_FOLDER_ID \
  policy-eu-only.yaml
```

Create the policy file:

```yaml
# policy-eu-only.yaml
# This restricts all resource creation to EU locations only
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - "in:eu-locations"     # All EU regions
  deniedValues: []
```

For more granular control, specify individual regions:

```yaml
# policy-specific-eu-regions.yaml
# Allow only specific EU regions that meet your requirements
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - "in:europe-west1-locations"   # Belgium
    - "in:europe-west3-locations"   # Frankfurt
    - "in:europe-west4-locations"   # Netherlands
```

```bash
# Apply the specific regions policy
gcloud resource-manager org-policies set-policy \
  --folder=EU_FOLDER_ID \
  policy-specific-eu-regions.yaml

# Verify the policy is applied
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --folder=EU_FOLDER_ID
```

## Step 3: Restrict Service-Specific Locations

Some services have their own location settings that you should also constrain.

### BigQuery

```bash
# Create a BigQuery dataset that can only exist in the EU
bq mk --dataset \
  --location=EU \
  --default_table_expiration=0 \
  --description="EU-only customer data" \
  project_id:eu_customer_data
```

### Cloud Storage

```bash
# Create a bucket in a specific EU region
gcloud storage buckets create gs://eu-customer-data-bucket \
  --location=europe-west1 \
  --uniform-bucket-level-access

# Set a retention policy to prevent deletion of compliance data
gcloud storage buckets update gs://eu-customer-data-bucket \
  --retention-period=2592000  # 30 days in seconds
```

### Cloud SQL

```bash
# Create a Cloud SQL instance in an EU region
gcloud sql instances create eu-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=europe-west1 \
  --availability-type=REGIONAL
```

## Step 4: Prevent Data Replication to Wrong Regions

Even with location restrictions, data can move through replication, backups, or cross-region operations. Lock these down too.

```yaml
# policy-disable-cross-region.yaml
# Prevent Cloud Storage from replicating to non-EU locations
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - "in:eu-locations"
```

For Spanner, which can be configured with multi-region instances:

```bash
# Create a Spanner instance using an EU-only multi-region config
gcloud spanner instances create eu-spanner \
  --config=eur3 \
  --description="EU-only Spanner instance" \
  --nodes=3
```

## Step 5: Set Up Custom Organization Policies

Beyond the built-in location constraint, create custom organization policies for more specific controls.

```yaml
# custom-policy-no-external-sharing.yaml
# Prevent BigQuery datasets from being shared outside the organization
name: organizations/ORG_ID/customConstraints/custom.bigquery.noExternalSharing
resourceTypes:
  - bigquery.googleapis.com/Dataset
methodTypes:
  - CREATE
  - UPDATE
condition: "resource.access.specialGroup != 'allAuthenticatedUsers' && resource.access.specialGroup != 'allUsers'"
actionType: ALLOW
displayName: "Prevent external BigQuery sharing"
description: "Prevents BigQuery datasets from being shared with allUsers or allAuthenticatedUsers"
```

```bash
# Create the custom constraint
gcloud org-policies set-custom-constraint custom-policy-no-external-sharing.yaml

# Apply it to the organization
gcloud org-policies set-policy \
  --organization=ORG_ID \
  custom-policy-enforcement.yaml
```

## Step 6: Monitor for Compliance Violations

Set up monitoring to detect any resources created in unauthorized locations, even if someone manages to bypass the policies.

```python
from google.cloud import asset_v1

def find_resources_in_wrong_locations(org_id, allowed_regions):
    """Scan for resources that exist outside allowed regions."""
    client = asset_v1.AssetServiceClient()
    parent = f"organizations/{org_id}"

    # Search for all compute and storage resources
    request = asset_v1.SearchAllResourcesRequest(
        scope=parent,
        asset_types=[
            "compute.googleapis.com/Instance",
            "storage.googleapis.com/Bucket",
            "bigquery.googleapis.com/Dataset",
            "sqladmin.googleapis.com/Instance",
        ],
    )

    violations = []
    for resource in client.search_all_resources(request=request):
        # Check if the resource location matches allowed regions
        location = resource.location
        if location and not any(
            location.startswith(region) for region in allowed_regions
        ):
            violations.append({
                "resource": resource.name,
                "type": resource.asset_type,
                "location": location,
                "project": resource.project,
            })

    return violations

# Check for EU compliance
eu_regions = ["europe-west1", "europe-west3", "europe-west4", "EU", "eu"]
violations = find_resources_in_wrong_locations("123456789", eu_regions)

for v in violations:
    print(f"VIOLATION: {v['type']} in {v['location']}: {v['resource']}")
```

## Step 7: Automate Remediation

When a violation is detected, automatically tag it and notify the responsible team.

```python
from google.cloud import functions_v1
import json

def remediate_location_violation(event, context):
    """Respond to resources created in unauthorized locations."""
    # Parse the asset change notification
    asset = json.loads(event["data"])

    resource_name = asset.get("asset", {}).get("name", "")
    location = asset.get("asset", {}).get("resource", {}).get("location", "")

    # Check against allowed locations for this folder/project
    allowed = get_allowed_locations(asset.get("asset", {}).get("ancestors", []))

    if location not in allowed:
        # Send alert to security team
        send_alert(
            channel="security-alerts",
            message=f"Data sovereignty violation detected: {resource_name} "
                    f"created in {location}. Allowed locations: {allowed}"
        )

        # Tag the resource as non-compliant
        tag_resource_non_compliant(resource_name)

        # Optionally, delete the resource if policy allows
        # delete_resource(resource_name)
```

## Using Assured Workloads for Stronger Guarantees

For the strongest data sovereignty guarantees, use Assured Workloads. This creates a managed environment where Google guarantees that data stays in the specified region and that only personnel in that region can access it.

```bash
# Create an Assured Workloads environment for EU sovereignty
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=europe-west1 \
  --display-name="EU Sovereign Workload" \
  --compliance-regime=EU_REGIONS_AND_SUPPORT \
  --billing-account=BILLING_ACCOUNT_ID \
  --next-rotation-time="2026-03-01T00:00:00Z" \
  --rotation-period="2592000s"
```

Data sovereignty is not a one-time configuration - it requires ongoing vigilance. The combination of organization policies for prevention, asset inventory scans for detection, and automated remediation for response gives you a defense-in-depth approach. Start with the organization policy constraints, then layer on monitoring and remediation as your compliance requirements mature.
