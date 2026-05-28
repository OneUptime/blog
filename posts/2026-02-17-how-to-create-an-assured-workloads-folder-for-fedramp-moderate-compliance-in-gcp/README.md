# How to Create an Assured Workloads Folder for FedRAMP Moderate Compliance in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, FedRAMP, Compliance, Google Cloud Security

Description: Learn how to create and configure an Assured Workloads folder for FedRAMP Moderate compliance in GCP, including data residency, encryption, and organizational policy setup.

---

If you are building applications for the US federal government or handling Controlled Unclassified Information (CUI), FedRAMP Moderate compliance is not optional. Google Cloud's Assured Workloads makes this achievable without building the entire compliance framework from scratch. It creates a controlled environment within your GCP organization that enforces the guardrails required by the Data Boundary for FedRAMP Moderate control package.

In this post, I will walk through creating an Assured Workloads folder for Data Boundary for FedRAMP Moderate, what it configures behind the scenes, and how to manage it after creation.

## What Assured Workloads Does for FedRAMP

When you create an Assured Workloads folder with the Data Boundary for FedRAMP Moderate control package, GCP automatically configures:

- **Data residency restrictions** - Supported resources can be restricted to US locations
- **Organization policies** - Enforces constraints like allowed resource locations
- **Key management** - Optional CMEK (Customer-Managed Encryption Keys) project and key ring setup
- **Personnel controls** - Ensures Google support personnel who access your data meet FedRAMP requirements
- **Audit logging** - Enhanced logging for compliance evidence

You get all of this by creating a single folder. The policies are applied automatically and enforced at the folder level, so any project created under this folder inherits the compliance controls.

## Prerequisites

Before creating an Assured Workloads folder, you need:

1. A GCP Organization (not just a standalone project)
2. The Assured Workloads Admin role
3. Billing account linked to the organization

```bash
# Verify you have organization-level access

gcloud organizations list

# Check your current IAM roles at the organization level
gcloud organizations get-iam-policy ORG_ID \
  --filter="bindings.members:user:$(gcloud config get-value account)" \
  --flatten="bindings[].members" \
  --format="table(bindings.role)"
```

Enable the Assured Workloads API:

```bash
# Enable the Assured Workloads API
gcloud services enable assuredworkloads.googleapis.com --project=my-admin-project
```

## Creating the Assured Workloads Folder

You can create the folder using gcloud. Here is the command for FedRAMP Moderate:

```bash
# Create an Assured Workloads folder for Data Boundary for FedRAMP Moderate
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=us \
  --display-name="FedRAMP Moderate Workloads" \
  --compliance-regime=data-boundary-for-fedramp-moderate \
  --billing-account=billingAccounts/BILLING_ACCOUNT_ID \
  --provisioned-resources-parent=organizations/ORG_ID
```

This command does several things:
- Creates a new folder in your organization hierarchy
- Applies FedRAMP Moderate organizational policies to that folder
- Restricts resource locations to US regions
- Enables Access Transparency if it is not already enabled on the organization

The creation takes a few minutes. You can check the status:

```bash
# List Assured Workloads to verify creation
gcloud assured workloads list \
  --organization=ORG_ID \
  --location=us
```

## Understanding the Applied Policies

After the folder is created, several organization policies are automatically applied. Let us examine what each one does.

Resource Location Restriction

This policy ensures all resources are created in US locations:

```bash
# View the resource location restriction policy on the Assured Workloads folder
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --folder=FOLDER_ID \
  --effective
```

The policy will show the allowed locations selected for the folder, such as US regions and multi-regions. You cannot create a VM in europe-west1 under this folder when the policy allows only US locations.

### Service Usage Restriction

Only services supported by the Data Boundary for FedRAMP Moderate control package should be used:

```bash
# View which services are restricted
gcloud resource-manager org-policies describe \
  constraints/gcp.restrictServiceUsage \
  --folder=FOLDER_ID \
  --effective
```

Not all GCP services are supported by the Data Boundary for FedRAMP Moderate control package. A resource usage restriction organization policy can prevent non-compliant service usage for services and resource types covered by that constraint.

### CMEK Policies

Data Boundary for FedRAMP Moderate does not require CMEK by default, but you can still configure CMEK policies for services that must use Customer-Managed Encryption Keys:

```bash
# Check CMEK policy
gcloud resource-manager org-policies describe \
  constraints/gcp.restrictNonCmekServices \
  --folder=FOLDER_ID \
  --effective
```

## Creating Projects Under the Folder

Projects created under the Assured Workloads folder automatically inherit all compliance policies:

```bash
# Create a new project under the Assured Workloads folder
gcloud projects create fedramp-app-prod \
  --folder=FOLDER_ID

# Link a billing account to the project
gcloud billing projects link fedramp-app-prod \
  --billing-account=BILLING_ACCOUNT_ID
```

Verify the policies are inherited:

```bash
# Confirm the project inherits resource location restrictions
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --project=fedramp-app-prod \
  --effective
```

## Setting Up CMEK for Services That Need It

If your workload requires CMEK, here is how to set up a key ring and key in an allowed location:

```bash
# Create a key ring in a US region
gcloud kms keyrings create fedramp-keyring \
  --location=us \
  --project=fedramp-app-prod

# Create an encryption key for Cloud Storage
gcloud kms keys create storage-key \
  --keyring=fedramp-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=fedramp-app-prod

# Create an encryption key for BigQuery
gcloud kms keys create bigquery-key \
  --keyring=fedramp-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=fedramp-app-prod
```

When creating resources, specify the CMEK:

```bash
# Create a Cloud Storage bucket with CMEK
gcloud storage buckets create gs://fedramp-data-bucket \
  --location=us \
  --default-encryption-key=projects/fedramp-app-prod/locations/us/keyRings/fedramp-keyring/cryptoKeys/storage-key \
  --project=fedramp-app-prod
```

## Enabling Audit Logging

FedRAMP requires comprehensive audit logging. Enable data access logs for all services:

```bash
# Get the current IAM policy before adding auditConfigs
gcloud projects get-iam-policy fedramp-app-prod --format=json > /tmp/policy.json
```

You need to add audit log configuration to the IAM policy and write it back with `gcloud projects set-iam-policy fedramp-app-prod /tmp/policy.json`. Cloud Audit Logs include Admin Activity logs by default, but Data Access logs need explicit configuration for each service you use or for `allServices`.

## Monitoring Compliance Status

Assured Workloads provides a compliance monitoring dashboard. You can also check compliance status programmatically:

```bash
# Check the compliance status of your Assured Workloads environment
gcloud assured workloads describe WORKLOAD_ID \
  --organization=ORG_ID \
  --location=us \
  --format="yaml(complianceStatus)"
```

Look for any violations:

```bash
# List compliance violations
gcloud assured workloads violations list \
  --workload=WORKLOAD_ID \
  --organization=ORG_ID \
  --location=us
```

## Common Issues and Solutions

### Service Not Allowed Error

If you get an error like "Service X is not allowed under the current organization policy," it means that service has not been authorized for FedRAMP Moderate. Check the list of authorized services in the GCP documentation and use an alternative if available.

Resource Location Denied

Attempting to create resources outside of US regions will fail:

```text
ERROR: (gcloud.compute.instances.create) Could not fetch resource:
- Constraint 'constraints/gcp.resourceLocations' violated for resource
```

Make sure all your resource creation commands specify a US region or zone.

### Moving Existing Projects

You cannot simply move an existing project into an Assured Workloads folder and expect it to become compliant. Existing resources may violate the new policies. The recommended approach is to create new projects under the folder and migrate workloads.

## Best Practices

Treat the Assured Workloads folder as a production compliance boundary. Do not put development or testing workloads in it unless they also need to be FedRAMP compliant.

Use separate CMEK keys for different services and environments. This limits the blast radius if a key is compromised.

Set up regular compliance reviews. Even with automated controls, FedRAMP requires periodic assessment and evidence collection.

Document everything. FedRAMP auditors will want to see not just that controls are in place, but that you have documented procedures for maintaining them.

## Summary

Creating an Assured Workloads folder for Data Boundary for FedRAMP Moderate in GCP gives you an automated compliance framework that enforces data residency, service restrictions, and personnel controls. The setup is straightforward - create the folder, let the policies propagate, create projects under it, and set up CMEK if your workload requires it. The ongoing work is monitoring for violations and maintaining documentation for auditors.
