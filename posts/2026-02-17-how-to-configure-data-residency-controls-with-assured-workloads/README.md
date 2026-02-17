# How to Configure Data Residency Controls with Assured Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, Data Residency, Data Sovereignty, Google Cloud Compliance

Description: Learn how to configure and enforce data residency controls in GCP using Assured Workloads to keep your data within specific geographic boundaries for regulatory compliance.

---

Data residency requirements are becoming more common as regulations like GDPR, data sovereignty laws, and industry-specific compliance frameworks mandate that data stays within specific geographic boundaries. If you are operating in healthcare, government, or financial services, you likely have strict rules about where your data can be stored and processed.

GCP Assured Workloads provides built-in data residency controls that enforce these restrictions at the infrastructure level. This post covers how to configure data residency, what it actually controls, and how to verify your data stays where it belongs.

## What Data Residency Controls Cover

When you configure data residency in Assured Workloads, it controls where:

- Compute resources (VMs, containers) run
- Storage resources (buckets, disks, databases) are located
- Data processing occurs
- Encryption keys are stored
- Backups and replicas are placed

It does this through organization policies that restrict resource creation to specific regions.

## Setting Up Data Residency with Assured Workloads

Create an Assured Workloads folder with the appropriate compliance regime and location:

```bash
# Create an Assured Workloads folder for EU data residency
# Using the EU_REGIONS_AND_SUPPORT compliance regime
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=eu \
  --display-name="EU Data Residency Workloads" \
  --compliance-regime=EU_REGIONS_AND_SUPPORT \
  --billing-account=BILLING_ACCOUNT_ID \
  --provisioned-resources-parent=organizations/ORG_ID \
  --resource-settings='[{
    "resourceType": "CONSUMER_FOLDER",
    "displayName": "eu-data-residency"
  }]'
```

For US data residency (common for FedRAMP or ITAR):

```bash
# Create an Assured Workloads folder for US data residency
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=us \
  --display-name="US Data Residency Workloads" \
  --compliance-regime=FEDRAMP_MODERATE \
  --billing-account=BILLING_ACCOUNT_ID \
  --provisioned-resources-parent=organizations/ORG_ID \
  --resource-settings='[{
    "resourceType": "CONSUMER_FOLDER",
    "displayName": "us-data-residency"
  }]'
```

## Understanding the Resource Location Policy

The core mechanism for data residency is the `gcp.resourceLocations` organization policy. After creating the Assured Workloads folder, inspect the policy:

```bash
# View the resource location restriction on the folder
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --folder=FOLDER_ID \
  --effective \
  --format=yaml
```

For EU data residency, the output will show that only EU regions are allowed:

```yaml
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:eu-locations
```

This means any attempt to create a resource in a non-EU region will be rejected at the API level.

## Customizing Location Restrictions

Sometimes you need more specific control than "all EU" or "all US." You can customize the resource location policy at the folder or project level:

```bash
# Restrict resources to specific EU regions only
gcloud resource-manager org-policies set-policy \
  --folder=FOLDER_ID \
  /tmp/location-policy.yaml
```

Where the policy file looks like:

```yaml
# location-policy.yaml - Restrict to specific EU regions
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:europe-west1-locations  # Belgium
    - in:europe-west3-locations  # Frankfurt
    - in:europe-west4-locations  # Netherlands
```

This is useful when your compliance requirements specify certain countries rather than an entire continent.

## Verifying Data Residency

After setting up the controls, verify they are working correctly.

### Test That Non-Compliant Regions Are Blocked

```bash
# This should fail if you have EU data residency controls
gcloud compute instances create test-vm \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --project=eu-residency-project

# Expected error:
# ERROR: Constraint 'constraints/gcp.resourceLocations' violated
```

### Audit Existing Resources

Check that all existing resources are in compliant locations:

```bash
# List all resources and their locations using Cloud Asset Inventory
gcloud asset search-all-resources \
  --scope="folders/FOLDER_ID" \
  --format="table(name,assetType,location)" \
  --order-by="location"
```

For a more targeted check, look for resources outside allowed regions:

```bash
# Find any resources not in EU regions (for EU data residency)
gcloud asset search-all-resources \
  --scope="folders/FOLDER_ID" \
  --query="NOT location:europe*" \
  --format="table(name,assetType,location)"
```

### Verify Storage Locations

```bash
# Check Cloud Storage bucket locations
gcloud storage buckets list \
  --project=eu-residency-project \
  --format="table(name,location,locationType)"

# Check Cloud SQL instance locations
gcloud sql instances list \
  --project=eu-residency-project \
  --format="table(name,region)"

# Check BigQuery dataset locations
bq ls --project_id=eu-residency-project --format=json | \
  python3 -c "import json,sys; [print(f'{d[\"datasetReference\"][\"datasetId\"]}: {d[\"location\"]}') for d in json.load(sys.stdin)]"
```

## Handling Multi-Region Services

Some GCP services use multi-region configurations by default. You need to be careful with these.

### Cloud Storage

Use regional buckets, not multi-region:

```bash
# Create a regional bucket in a specific EU location
gcloud storage buckets create gs://eu-data-bucket \
  --location=europe-west1 \
  --project=eu-residency-project

# Avoid: gs://eu-data-bucket --location=EU  (multi-region, data could be in any EU location)
```

### BigQuery

Specify the location when creating datasets:

```bash
# Create a BigQuery dataset in a specific EU region
bq mk --dataset \
  --location=europe-west1 \
  --description="EU resident data" \
  eu-residency-project:eu_data
```

### Spanner

Use regional Spanner configurations:

```bash
# Create a regional Spanner instance
gcloud spanner instances create eu-instance \
  --config=regional-europe-west1 \
  --description="EU Spanner instance" \
  --nodes=1 \
  --project=eu-residency-project
```

## Encryption Key Residency

Data residency also applies to encryption keys. Your CMEK keys should be in the same region as the data they protect:

```bash
# Create a key ring in the EU
gcloud kms keyrings create eu-keyring \
  --location=europe-west1 \
  --project=eu-residency-project

# Create an encryption key
gcloud kms keys create data-key \
  --keyring=eu-keyring \
  --location=europe-west1 \
  --purpose=encryption \
  --rotation-period=90d \
  --project=eu-residency-project
```

If you use a global key location, the key material might be replicated outside your desired region. Always use regional key locations for data residency compliance.

## Monitoring Data Residency Compliance

Set up ongoing monitoring to catch any drift:

```bash
# Create a log-based metric to track resource creation attempts in wrong regions
gcloud logging metrics create wrong-region-attempts \
  --description="Tracks resource creation attempts in non-compliant regions" \
  --log-filter='protoPayload.status.message:"constraints/gcp.resourceLocations"' \
  --project=eu-residency-project

# Create an alert for these attempts
gcloud monitoring policies create \
  --display-name="Data Residency Violation Attempt" \
  --condition-display-name="Resource creation attempted in wrong region" \
  --condition-filter='metric.type="logging.googleapis.com/user/wrong-region-attempts"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=0s \
  --notification-channels="projects/eu-residency-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=eu-residency-project
```

## Data Residency and Backups

Do not forget about backups. A common compliance gap is having data in the right region but backups in a different one:

```bash
# For Cloud SQL, verify backup location
gcloud sql instances describe my-db \
  --project=eu-residency-project \
  --format="yaml(settings.backupConfiguration)"
```

Make sure backup regions match your data residency requirements. For Cloud SQL, you can specify the backup location:

```bash
# Configure Cloud SQL backups to stay in the EU
gcloud sql instances patch my-db \
  --backup-location=europe-west1 \
  --project=eu-residency-project
```

## Summary

Data residency controls in Assured Workloads enforce geographic restrictions on where your GCP resources can be created. The setup involves creating an Assured Workloads folder with the right compliance regime and location, which automatically applies the resource location organization policy. Verify the controls by attempting to create resources in non-compliant regions, audit existing resources with Cloud Asset Inventory, and set up monitoring for violation attempts. Remember that data residency extends beyond just compute and storage - encryption keys, backups, and replicas all need to be in compliant locations too.
