# How to Configure Assured Workloads for HIPAA Compliance in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, HIPAA, Healthcare Compliance, Google Cloud Security

Description: Learn how to configure GCP Assured Workloads for HIPAA compliance, including setting up the environment, managing PHI, encryption requirements, and audit logging.

---

Healthcare organizations and their business associates handling Protected Health Information (PHI) need to comply with HIPAA. Google Cloud supports HIPAA compliance through a Business Associate Agreement (BAA) and the Assured Workloads service, which creates a controlled environment with the technical safeguards HIPAA requires.

This post walks through setting up Assured Workloads for HIPAA, configuring the necessary encryption and access controls, and maintaining ongoing compliance.

## HIPAA and Google Cloud - The Basics

Before diving into the technical setup, here is what you need to understand about HIPAA on GCP:

- Google Cloud offers a BAA that covers specific GCP services
- Not all GCP services are covered under the BAA
- The BAA alone is not enough - you need technical controls in place
- Assured Workloads automates many of these technical controls

The BAA must be signed before you handle any PHI on GCP. You can review and accept it through the Google Cloud Console under the Compliance section.

## Prerequisites

You need:

1. A GCP Organization
2. A signed BAA with Google Cloud
3. The Assured Workloads Admin role
4. A billing account linked to the organization

```bash
# Verify organization access
gcloud organizations list

# Enable the Assured Workloads API
gcloud services enable assuredworkloads.googleapis.com \
  --project=my-admin-project
```

## Creating the HIPAA Assured Workloads Environment

Create an Assured Workloads folder with the HIPAA compliance regime:

```bash
# Create an Assured Workloads folder for HIPAA compliance
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=us \
  --display-name="HIPAA Workloads" \
  --compliance-regime=HIPAA \
  --billing-account=BILLING_ACCOUNT_ID \
  --provisioned-resources-parent=organizations/ORG_ID \
  --resource-settings='[{
    "resourceType": "CONSUMER_FOLDER",
    "displayName": "hipaa-workloads"
  }]'
```

Wait for creation to complete and verify:

```bash
# Verify the Assured Workloads environment was created
gcloud assured workloads list \
  --organization=ORG_ID \
  --location=us \
  --format="table(name,displayName,complianceRegime,createTime)"
```

## Understanding HIPAA-Specific Controls

The HIPAA Assured Workloads folder applies controls focused on the HIPAA Security Rule's technical safeguards:

### Access Controls

The environment enforces strict IAM policies. Review the applied policies:

```bash
# List organization policies applied to the HIPAA folder
gcloud resource-manager org-policies list \
  --folder=FOLDER_ID \
  --format="table(constraint,listPolicy,booleanPolicy)"
```

### Audit Controls

HIPAA requires that you log all access to PHI. Enable comprehensive audit logging:

```bash
# Get the current IAM policy with audit config
gcloud projects get-iam-policy hipaa-project \
  --format=json > /tmp/iam-policy.json
```

Add audit log configuration for all services. Here is the structure you need:

```json
{
  "auditConfigs": [
    {
      "service": "allServices",
      "auditLogConfigs": [
        { "logType": "ADMIN_READ" },
        { "logType": "DATA_READ" },
        { "logType": "DATA_WRITE" }
      ]
    }
  ]
}
```

Apply the updated policy:

```bash
# Apply the audit logging configuration
gcloud projects set-iam-policy hipaa-project /tmp/iam-policy.json
```

### Encryption Controls

HIPAA requires encryption of PHI both at rest and in transit. GCP encrypts data at rest by default, but Assured Workloads recommends CMEK for additional control.

```bash
# Create a key ring for HIPAA workloads
gcloud kms keyrings create hipaa-keyring \
  --location=us \
  --project=hipaa-project

# Create encryption keys for different services
gcloud kms keys create gcs-phi-key \
  --keyring=hipaa-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=hipaa-project

gcloud kms keys create bq-phi-key \
  --keyring=hipaa-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=hipaa-project

gcloud kms keys create sql-phi-key \
  --keyring=hipaa-keyring \
  --location=us \
  --purpose=encryption \
  --rotation-period=90d \
  --project=hipaa-project
```

## Configuring Services for HIPAA

### Cloud Storage for PHI

When storing PHI in Cloud Storage, use CMEK and restrict access:

```bash
# Create a bucket for PHI with CMEK and uniform bucket-level access
gcloud storage buckets create gs://hipaa-phi-data \
  --location=us \
  --default-encryption-key=projects/hipaa-project/locations/us/keyRings/hipaa-keyring/cryptoKeys/gcs-phi-key \
  --uniform-bucket-level-access \
  --project=hipaa-project

# Disable public access prevention at the bucket level
gcloud storage buckets update gs://hipaa-phi-data \
  --public-access-prevention
```

### Cloud SQL for PHI

Database instances storing PHI need CMEK and restricted network access:

```bash
# Create a Cloud SQL instance with CMEK and private IP only
gcloud sql instances create hipaa-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --network=projects/hipaa-project/global/networks/hipaa-vpc \
  --no-assign-ip \
  --disk-encryption-key=projects/hipaa-project/locations/us/keyRings/hipaa-keyring/cryptoKeys/sql-phi-key \
  --require-ssl \
  --project=hipaa-project
```

The `--no-assign-ip` flag ensures the database is only accessible via private IP, and `--require-ssl` enforces encryption in transit.

### BigQuery for PHI Analytics

```bash
# Create a BigQuery dataset with CMEK and restricted access
bq mk --dataset \
  --default_kms_key=projects/hipaa-project/locations/us/keyRings/hipaa-keyring/cryptoKeys/bq-phi-key \
  --location=US \
  --description="PHI analytics dataset" \
  hipaa-project:phi_analytics
```

## Network Security for HIPAA

PHI should only be accessible through private, secured networks:

```bash
# Create a VPC for HIPAA workloads with no default subnets
gcloud compute networks create hipaa-vpc \
  --subnet-mode=custom \
  --project=hipaa-project

# Create a subnet in a US region
gcloud compute networks subnets create hipaa-subnet \
  --network=hipaa-vpc \
  --region=us-central1 \
  --range=10.0.0.0/24 \
  --enable-flow-logs \
  --enable-private-ip-google-access \
  --project=hipaa-project

# Create a restrictive default firewall - deny all ingress
gcloud compute firewall-rules create hipaa-deny-all-ingress \
  --network=hipaa-vpc \
  --direction=INGRESS \
  --action=DENY \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --priority=65534 \
  --project=hipaa-project
```

Enable VPC Service Controls to create a security perimeter:

```bash
# Create an access policy for VPC Service Controls
gcloud access-context-manager policies create \
  --organization=ORG_ID \
  --title="HIPAA Access Policy"
```

## Monitoring and Incident Response

HIPAA requires breach notification and incident response capabilities. Set up monitoring for suspicious access patterns:

```bash
# Create a log-based metric for access to PHI resources
gcloud logging metrics create phi-data-access \
  --description="Tracks data access to PHI resources" \
  --log-filter='resource.type="gcs_bucket" AND
                resource.labels.bucket_name="hipaa-phi-data" AND
                protoPayload.methodName=("storage.objects.get" OR "storage.objects.list")' \
  --project=hipaa-project

# Alert on unusual access patterns
gcloud monitoring policies create \
  --display-name="PHI Access Spike Alert" \
  --condition-display-name="Unusual PHI data access volume" \
  --condition-filter='metric.type="logging.googleapis.com/user/phi-data-access"' \
  --condition-threshold-value=100 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels="projects/hipaa-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=hipaa-project
```

## Regular Compliance Checks

Set up a regular compliance review process:

```bash
# Check for any compliance violations
gcloud assured workloads violations list \
  --workload=WORKLOAD_ID \
  --organization=ORG_ID \
  --location=us

# Verify all buckets have CMEK
gcloud storage buckets list \
  --project=hipaa-project \
  --format="table(name,default_encryption_key)"

# Verify all SQL instances have CMEK and SSL
gcloud sql instances list \
  --project=hipaa-project \
  --format="table(name,settings.ipConfiguration.requireSsl,settings.dataDiskEncryptionKeyName)"

# Check IAM permissions for overly broad access
gcloud projects get-iam-policy hipaa-project \
  --flatten="bindings[].members" \
  --format="table(bindings.role,bindings.members)"
```

## Training and Documentation

HIPAA compliance is not just technical. You also need:

- Staff training on PHI handling procedures
- Documentation of all security controls and their configuration
- Incident response procedures
- Regular risk assessments
- Business associate agreements with any third parties accessing PHI

Keep documentation in a secure, version-controlled repository and update it whenever configurations change.

## Summary

Configuring Assured Workloads for HIPAA compliance on GCP starts with creating the Assured Workloads folder, which applies the baseline organizational policies. From there, you layer on CMEK encryption for data at rest, enforce SSL for data in transit, restrict network access through VPC configurations, enable comprehensive audit logging, and set up monitoring for suspicious access patterns. The technical controls are only part of the picture - you also need documented procedures, staff training, and regular compliance reviews to satisfy HIPAA requirements.
