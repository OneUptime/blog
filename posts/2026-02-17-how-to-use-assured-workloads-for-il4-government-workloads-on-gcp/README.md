# How to Use Assured Workloads for IL4 Government Workloads on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, IL4, Government Cloud, Google Cloud Security

Description: Learn how to set up and manage GCP Assured Workloads for Impact Level 4 government workloads, including data residency, personnel controls, and security configurations.

---

Impact Level 4 (IL4) workloads contain Controlled Unclassified Information (CUI) that requires protection under specific Department of Defense (DoD) guidelines. Running IL4 workloads on a commercial cloud requires a controlled environment with data residency restrictions, personnel access controls, and specific encryption standards. GCP Assured Workloads provides this environment.

This post covers setting up Assured Workloads for IL4, understanding the controls it applies, and managing the environment for ongoing compliance.

## What IL4 Means for Cloud Deployments

IL4 is a DoD classification for information systems that handle CUI. The requirements are more stringent than FedRAMP Moderate and include:

- Data must reside in US-only locations
- IL4 support cases are routed to US Persons located in the US
- FIPS 140-2 validated encryption is required
- Specific logging and monitoring requirements
- Network isolation from non-IL4 workloads

GCP addresses these through a combination of Assured Workloads controls and the underlying Google infrastructure certifications.

## Prerequisites

IL4 Assured Workloads has stricter prerequisites than other compliance regimes:

1. A GCP Organization configured for Assured Workloads
2. The Assured Workloads Admin role
3. An Enhanced or Premium Cloud Customer Care subscription for IL4 support cases
4. A billing account for the Assured Workloads Premium tier

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
  --compliance-regime=data-boundary-for-il4 \
  --billing-account=billingAccounts/BILLING_ACCOUNT_ID \
  --provisioned-resources-parent=organizations/ORG_ID
```

For IL4, Assured Workloads creates a folder that applies the Data Boundary for IL4 controls. If you configure CMEK settings during folder creation, Assured Workloads can also create a separate key project and key ring. Folder creation does not create cryptographic keys for you.

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
gcloud org-policies describe \
  gcp.resourceLocations \
  --folder=FOLDER_ID \
  --effective
```

### Service Restrictions

Only a subset of GCP services are authorized for IL4. The list is narrower than FedRAMP Moderate:

```bash
# Check which services are allowed
gcloud org-policies describe \
  gcp.restrictServiceUsage \
  --folder=FOLDER_ID \
  --effective
```

Common services authorized for IL4 include Compute Engine, Cloud Storage, Cloud SQL, BigQuery, GKE, Cloud Run, and Cloud Functions. Always verify the current list as Google continuously adds services.

### CMEK Requirements

The IL4 control package sets the `gcp.restrictNonCmekServices` organization policy constraint for in-scope services. If you created a key project and key ring during folder creation, list them before creating keys:

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
  --project=il4-keys-project

gcloud kms keys create storage-key \
  --keyring=il4-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=il4-keys-project

gcloud kms keys create database-key \
  --keyring=il4-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=il4-keys-project
```

### Personnel Controls

For Data Boundary for IL4, technical support cases are routed to US Persons located in the US when you use an Enhanced or Premium Cloud Customer Care subscription. This is handled by Google Cloud support processes and does not require configuration in your projects.

## Deploying Workloads in the IL4 Environment

### Creating Projects

```bash
# Create a project under the IL4 folder
gcloud projects create il4-app-prod \
  --folder=FOLDER_ID \
  --organization=ORG_ID

# Link billing
gcloud billing projects link il4-app-prod \
  --billing-account=billingAccounts/BILLING_ACCOUNT_ID

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

The destination bucket must already exist, and the sink's writer identity must be granted permission to write to it.

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
  --format="value(name)" | while read bucket; do
    kms_key=$(gcloud storage buckets describe "gs://${bucket}" \
      --format="value(default_kms_key)")
    if [ -z "$kms_key" ]; then
      echo "gs://${bucket}"
    fi
  done

# Find any Compute Engine disks without CMEK
gcloud compute disks list \
  --project=il4-app-prod \
  --format="table(name,zone,diskEncryptionKey)" \
  --filter="NOT diskEncryptionKey:*"
```

## Summary

IL4 Assured Workloads on GCP provides a controlled environment for DoD Controlled Unclassified Information. The setup requires creating an Assured Workloads folder with the IL4 compliance regime, which applies strict organizational policies for data residency, service restrictions, and encryption requirements. Every supported resource you deploy needs appropriate encryption, network isolation, and comprehensive audit logging. The ongoing work is monitoring for violations, managing encryption keys, and maintaining documentation for assessors.
