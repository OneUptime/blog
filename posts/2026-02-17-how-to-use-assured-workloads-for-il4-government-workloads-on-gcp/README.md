# How to Use Assured Workloads for IL4 Government Workloads on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, IL4, Government Cloud, Google Cloud Security

Description: Learn how to set up and manage GCP Assured Workloads for Impact Level 4 government workloads, including data residency, personnel controls, and security configurations.

---

Impact Level 4 (IL4) workloads contain Controlled Unclassified Information (CUI) that requires protection under specific Department of Defense (DoD) guidelines. Running IL4 workloads on a commercial cloud requires a controlled environment with data residency restrictions, personnel access controls, and specific encryption standards. GCP Assured Workloads provides this environment.

This post covers setting up Assured Workloads for IL4, understanding the controls it applies, and managing the environment for ongoing compliance.

## What IL4 Means for Cloud Deployments

IL4 is a DoD classification for information systems that handle CUI. The requirements are more stringent than FedRAMP Moderate and include:

- Data must reside in the continental United States
- Only US persons can access the data and infrastructure
- FIPS 140-2 validated encryption is required
- Specific logging and monitoring requirements
- Network isolation from non-IL4 workloads

GCP addresses these through a combination of Assured Workloads controls and the underlying Google infrastructure certifications.

## Prerequisites

IL4 Assured Workloads has stricter prerequisites than other compliance regimes:

1. A GCP Organization with a signed agreement for IL4 workloads
2. The Assured Workloads Admin role
3. Engagement with Google Cloud's government sales team (IL4 is not self-service)
4. A billing account approved for IL4 usage

```bash
# Verify organization setup
gcloud organizations list

# Enable required APIs
gcloud services enable assuredworkloads.googleapis.com --project=my-admin-project
gcloud services enable cloudkms.googleapis.com --project=my-admin-project
```

## Creating the IL4 Assured Workloads Environment

```bash
# Create an Assured Workloads folder for IL4
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=us \
  --display-name="IL4 Government Workloads" \
  --compliance-regime=IL4 \
  --billing-account=BILLING_ACCOUNT_ID \
  --provisioned-resources-parent=organizations/ORG_ID \
  --resource-settings='[{
    "resourceType": "CONSUMER_FOLDER",
    "displayName": "il4-workloads"
  }, {
    "resourceType": "ENCRYPTION_KEYS_PROJECT",
    "displayName": "il4-keys-project"
  }, {
    "resourceType": "KEYRING",
    "displayName": "il4-keyring"
  }]'
```

For IL4, Assured Workloads automatically provisions a dedicated key project and key ring. This separation ensures encryption keys are managed independently from the workload resources.

Verify the creation:

```bash
# List the workload and check its status
gcloud assured workloads describe WORKLOAD_ID \
  --organization=ORG_ID \
  --location=us \
  --format="yaml(name,displayName,complianceRegime,resources,kmsSettings)"
```

## IL4-Specific Controls

The IL4 Assured Workloads folder applies several controls beyond what FedRAMP Moderate requires.

### Data Residency

Resources are restricted to US locations only:

```bash
# Verify the resource location policy
gcloud resource-manager org-policies describe \
  constraints/gcp.resourceLocations \
  --folder=FOLDER_ID \
  --effective
```

### Service Restrictions

Only a subset of GCP services are authorized for IL4. The list is narrower than FedRAMP Moderate:

```bash
# Check which services are allowed
gcloud resource-manager org-policies describe \
  constraints/gcp.restrictServiceUsage \
  --folder=FOLDER_ID \
  --effective
```

Common services authorized for IL4 include Compute Engine, Cloud Storage, Cloud SQL, BigQuery, GKE, Cloud Run, and Cloud Functions. Always verify the current list as Google continuously adds services.

### CMEK Requirements

IL4 requires Customer-Managed Encryption Keys for all supported services. The key project and key ring were provisioned during folder creation:

```bash
# List keys in the IL4 key ring
gcloud kms keys list \
  --keyring=il4-keyring \
  --location=us \
  --project=il4-keys-project \
  --format="table(name,purpose,rotationPeriod)"
```

Create encryption keys for each service:

```bash
# Create keys for different services
gcloud kms keys create compute-key \
  --keyring=il4-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --algorithm=google-symmetric-encryption \
  --project=il4-keys-project

gcloud kms keys create storage-key \
  --keyring=il4-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --algorithm=google-symmetric-encryption \
  --project=il4-keys-project

gcloud kms keys create database-key \
  --keyring=il4-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --algorithm=google-symmetric-encryption \
  --project=il4-keys-project
```

### Personnel Controls

Google applies personnel controls ensuring that only US persons can access the underlying infrastructure supporting your IL4 workloads. This is handled at the Google infrastructure level and does not require configuration on your part, but it is an important part of why IL4 requires Assured Workloads.

## Deploying Workloads in the IL4 Environment

### Creating Projects

```bash
# Create a project under the IL4 folder
gcloud projects create il4-app-prod \
  --folder=FOLDER_ID \
  --organization=ORG_ID

# Link billing
gcloud billing projects link il4-app-prod \
  --billing-account=BILLING_ACCOUNT_ID

# Enable required services
gcloud services enable compute.googleapis.com \
  storage.googleapis.com \
  sqladmin.googleapis.com \
  container.googleapis.com \
  --project=il4-app-prod
```

### Creating Compute Resources with CMEK

```bash
# Create a disk with CMEK encryption
gcloud compute disks create il4-boot-disk \
  --zone=us-central1-a \
  --image-project=debian-cloud \
  --image-family=debian-12 \
  --size=50GB \
  --kms-key=projects/il4-keys-project/locations/us/keyRings/il4-keyring/cryptoKeys/compute-key \
  --project=il4-app-prod

# Create an instance using the encrypted disk
gcloud compute instances create il4-server \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --disk=name=il4-boot-disk,boot=yes \
  --no-address \
  --network=il4-vpc \
  --subnet=il4-subnet \
  --project=il4-app-prod
```

### Creating Storage with CMEK

```bash
# Create a Cloud Storage bucket with CMEK and strict access controls
gcloud storage buckets create gs://il4-data-bucket \
  --location=us \
  --default-encryption-key=projects/il4-keys-project/locations/us/keyRings/il4-keyring/cryptoKeys/storage-key \
  --uniform-bucket-level-access \
  --public-access-prevention \
  --project=il4-app-prod
```

### Network Configuration

IL4 workloads need network isolation:

```bash
# Create a VPC with no default subnets
gcloud compute networks create il4-vpc \
  --subnet-mode=custom \
  --project=il4-app-prod

# Create a subnet with flow logs enabled
gcloud compute networks subnets create il4-subnet \
  --network=il4-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --enable-flow-logs \
  --enable-private-ip-google-access \
  --project=il4-app-prod

# Deny all ingress by default
gcloud compute firewall-rules create il4-deny-ingress \
  --network=il4-vpc \
  --direction=INGRESS \
  --action=DENY \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --priority=65534 \
  --project=il4-app-prod

# Deny all egress by default
gcloud compute firewall-rules create il4-deny-egress \
  --network=il4-vpc \
  --direction=EGRESS \
  --action=DENY \
  --rules=all \
  --destination-ranges=0.0.0.0/0 \
  --priority=65534 \
  --project=il4-app-prod
```

Then selectively allow only required traffic:

```bash
# Allow internal communication within the subnet
gcloud compute firewall-rules create il4-allow-internal \
  --network=il4-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp,udp,icmp \
  --source-ranges=10.0.0.0/24 \
  --priority=1000 \
  --project=il4-app-prod
```

## Audit Logging for IL4

Enable comprehensive audit logging across all services:

```bash
# Enable data access audit logs for all services
# First, get the current policy
gcloud projects get-iam-policy il4-app-prod --format=json > /tmp/policy.json
```

Update the policy to include audit logging for all services with all log types (ADMIN_READ, DATA_READ, DATA_WRITE), then apply it back.

Export logs to a secure, long-term storage location:

```bash
# Create a log sink to export audit logs to a secure bucket
gcloud logging sinks create il4-audit-sink \
  storage.googleapis.com/il4-audit-logs-bucket \
  --log-filter='logName:"cloudaudit.googleapis.com"' \
  --project=il4-app-prod
```

## Ongoing Compliance Management

Monitor for violations regularly:

```bash
# Check for compliance violations
gcloud assured workloads violations list \
  --workload=WORKLOAD_ID \
  --organization=ORG_ID \
  --location=us \
  --format="table(name,state,category,description)"

# Verify encryption key status
gcloud kms keys list \
  --keyring=il4-keyring \
  --location=us \
  --project=il4-keys-project \
  --format="table(name,primary.state,nextRotationTime)"
```

Set up automated checks to verify CMEK is applied to all resources:

```bash
# Find any Cloud Storage buckets without CMEK
gcloud storage buckets list \
  --project=il4-app-prod \
  --format="table(name,default_encryption_key)" \
  --filter="NOT default_encryption_key:*"

# Find any Compute Engine disks without CMEK
gcloud compute disks list \
  --project=il4-app-prod \
  --format="table(name,zone,diskEncryptionKey)" \
  --filter="NOT diskEncryptionKey:*"
```

## Summary

IL4 Assured Workloads on GCP provides a controlled environment for DoD Controlled Unclassified Information. The setup requires creating an Assured Workloads folder with the IL4 compliance regime, which automatically provisions a key project and applies strict organizational policies for data residency, service restrictions, and encryption requirements. Every resource you deploy needs CMEK encryption, network isolation, and comprehensive audit logging. The ongoing work is monitoring for violations, managing encryption keys, and maintaining documentation for assessors.
