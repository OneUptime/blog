# How to Implement HIPAA-Compliant Architecture for Healthcare Applications on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, HIPAA, Healthcare, Compliance, PHI, Cloud Security

Description: A detailed guide to building HIPAA-compliant healthcare applications on Google Cloud, covering BAAs, PHI protection, encryption, access controls, and audit logging.

---

Building healthcare applications that handle Protected Health Information (PHI) on Google Cloud requires more than just turning on encryption. HIPAA compliance is a combination of administrative, physical, and technical safeguards, and while Google Cloud provides the technical tools, you are responsible for configuring them correctly and maintaining the compliance posture over time.

This guide covers the practical steps to architect, deploy, and operate HIPAA-compliant workloads on Google Cloud.

## The Business Associate Agreement

Before anything else, you need a Business Associate Agreement (BAA) with Google. Without a BAA, you cannot process PHI on Google Cloud, period. Google offers a BAA that covers specific Google Cloud services. Only services listed in the BAA are approved for PHI processing.

Key services covered under the Google Cloud BAA include:
- Compute Engine
- Google Kubernetes Engine
- Cloud SQL
- Cloud Storage
- BigQuery
- Cloud Functions
- Pub/Sub
- Cloud KMS
- Cloud Logging
- Cloud Monitoring

Check the current list at Google's HIPAA compliance page, as it is updated regularly.

```bash
# Verify your organization has accepted the BAA
# This is done through the Google Cloud Console under
# Organization > Settings > HIPAA BAA
# There is no gcloud command for this - it requires manual acceptance
```

## Project Structure for PHI Workloads

Isolate PHI workloads in dedicated projects with strict access controls.

```bash
# Create a folder for HIPAA workloads
gcloud resource-manager folders create \
  --display-name="HIPAA Workloads" \
  --organization=123456789

# Create the PHI processing project
gcloud projects create hipaa-phi-project \
  --organization=123456789 \
  --folder=HIPAA_FOLDER_ID

# Create a separate project for de-identified data and analytics
gcloud projects create hipaa-analytics-project \
  --organization=123456789 \
  --folder=HIPAA_FOLDER_ID
```

## Network Architecture

HIPAA requires that PHI is accessible only to authorized systems and users. Build a network architecture that enforces this.

```bash
# Create an isolated VPC for PHI processing
gcloud compute networks create phi-vpc \
  --subnet-mode=custom \
  --project=hipaa-phi-project

# Application subnet with flow logs enabled
gcloud compute networks subnets create phi-app-subnet \
  --network=phi-vpc \
  --region=us-central1 \
  --range=10.20.1.0/24 \
  --enable-private-ip-google-access \
  --enable-flow-logs \
  --logging-flow-sampling=1.0 \
  --project=hipaa-phi-project

# Database subnet
gcloud compute networks subnets create phi-db-subnet \
  --network=phi-vpc \
  --region=us-central1 \
  --range=10.20.2.0/24 \
  --enable-private-ip-google-access \
  --enable-flow-logs \
  --project=hipaa-phi-project

# Deny all ingress by default
gcloud compute firewall-rules create phi-deny-all \
  --network=phi-vpc \
  --priority=65534 \
  --direction=INGRESS \
  --action=DENY \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --project=hipaa-phi-project

# Allow only specific traffic between tiers
gcloud compute firewall-rules create phi-app-to-db \
  --network=phi-vpc \
  --priority=1000 \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:5432 \
  --source-tags=phi-app \
  --target-tags=phi-db \
  --project=hipaa-phi-project
```

## Encryption Requirements

HIPAA requires encryption of PHI at rest and in transit. Use CMEK for encryption at rest and TLS for all communications.

```bash
# Create a dedicated key ring for PHI encryption
gcloud kms keyrings create phi-keyring \
  --location=us-central1 \
  --project=hipaa-phi-project

# Create encryption keys for different data stores
gcloud kms keys create phi-storage-key \
  --keyring=phi-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --rotation-period=7776000s \
  --project=hipaa-phi-project

gcloud kms keys create phi-database-key \
  --keyring=phi-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --rotation-period=7776000s \
  --project=hipaa-phi-project

# Create Cloud SQL with CMEK and private IP only
gcloud sql instances create phi-database \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --network=projects/hipaa-phi-project/global/networks/phi-vpc \
  --no-assign-ip \
  --disk-encryption-key=projects/hipaa-phi-project/locations/us-central1/keyRings/phi-keyring/cryptoKeys/phi-database-key \
  --require-ssl \
  --backup-start-time=02:00 \
  --retained-backups-count=30 \
  --project=hipaa-phi-project

# Create Cloud Storage bucket with CMEK
gcloud storage buckets create gs://hipaa-phi-documents \
  --location=us-central1 \
  --default-encryption-key=projects/hipaa-phi-project/locations/us-central1/keyRings/phi-keyring/cryptoKeys/phi-storage-key \
  --uniform-bucket-level-access \
  --project=hipaa-phi-project
```

## Access Controls

HIPAA's minimum necessary standard requires that access to PHI is limited to the minimum needed for the user's role.

```bash
# Create groups for different PHI access levels
gcloud identity groups create hipaa-clinical@yourcompany.com \
  --organization=yourcompany.com \
  --display-name="HIPAA Clinical Staff"

gcloud identity groups create hipaa-admins@yourcompany.com \
  --organization=yourcompany.com \
  --display-name="HIPAA System Admins"

# Grant clinical staff access to read PHI
gcloud projects add-iam-policy-binding hipaa-phi-project \
  --member="group:hipaa-clinical@yourcompany.com" \
  --role="roles/cloudsql.client"

# Grant admins operational access without direct data access
gcloud projects add-iam-policy-binding hipaa-phi-project \
  --member="group:hipaa-admins@yourcompany.com" \
  --role="roles/cloudsql.admin"

# Use IAM conditions to restrict access to business hours
gcloud projects add-iam-policy-binding hipaa-phi-project \
  --member="group:hipaa-clinical@yourcompany.com" \
  --role="roles/storage.objectViewer" \
  --condition="expression=request.time.getHours('America/New_York') >= 6 && request.time.getHours('America/New_York') <= 22,title=clinical-hours"
```

## Comprehensive Audit Logging

HIPAA requires logging of all access to PHI. Enable Data Access audit logs for all relevant services.

```bash
# Enable comprehensive audit logging for the PHI project
# Create the audit config
cat > audit-config.json << 'EOF'
{
  "auditConfigs": [
    {
      "service": "allServices",
      "auditLogConfigs": [
        {"logType": "ADMIN_READ"},
        {"logType": "DATA_READ"},
        {"logType": "DATA_WRITE"}
      ]
    }
  ]
}
EOF

# Apply to the project (merge with existing policy)
gcloud projects get-iam-policy hipaa-phi-project --format=json > current-policy.json
# Merge audit configs and apply
gcloud projects set-iam-policy hipaa-phi-project merged-policy.json

# Create a log sink for long-term retention (HIPAA requires 6 years)
gcloud logging sinks create hipaa-audit-archive \
  storage.googleapis.com/hipaa-audit-archive-bucket \
  --project=hipaa-phi-project \
  --include-children

# Create the archive bucket with a 6-year retention policy
gcloud storage buckets create gs://hipaa-audit-archive-bucket \
  --location=us-central1 \
  --retention-period=189216000 \
  --uniform-bucket-level-access \
  --project=hipaa-audit-project
```

## GKE Configuration for HIPAA Workloads

If you run healthcare applications on GKE, additional configuration is needed.

```hcl
# HIPAA-compliant GKE cluster configuration
resource "google_container_cluster" "hipaa" {
  name     = "hipaa-cluster"
  location = "us-central1"
  project  = "hipaa-phi-project"

  # Private cluster - no public endpoint
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Network configuration
  network    = google_compute_network.phi.id
  subnetwork = google_compute_subnetwork.phi_app.id

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "hipaa-phi-project.svc.id.goog"
  }

  # Enable Shielded Nodes
  enable_shielded_nodes = true

  # Application-layer secret encryption
  database_encryption {
    state    = "ENCRYPTED"
    key_name = google_kms_crypto_key.gke_secrets.id
  }

  # Binary Authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Enable Security Posture
  security_posture_config {
    mode               = "BASIC"
    vulnerability_mode = "VULNERABILITY_ENTERPRISE"
  }

  # Master authorized networks - restrict API access
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "10.20.0.0/16"
      display_name = "VPC internal"
    }
  }

  # Enable network policy
  network_policy {
    enabled = true
  }

  node_config {
    machine_type = "n2d-standard-4"
    image_type   = "COS_CONTAINERD"

    # Enable Confidential Computing for PHI processing
    confidential_nodes {
      enabled = true
    }

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # CMEK for boot disks
    boot_disk_kms_key = google_kms_crypto_key.gke_disk.id
  }
}
```

## Data Loss Prevention

Use Cloud DLP to identify and protect PHI in your data stores.

```bash
# Create a DLP inspection job to scan for PHI
gcloud dlp jobs create \
  --project=hipaa-phi-project \
  --inspect-config='{"infoTypes":[{"name":"PERSON_NAME"},{"name":"PHONE_NUMBER"},{"name":"EMAIL_ADDRESS"},{"name":"US_SOCIAL_SECURITY_NUMBER"},{"name":"MEDICAL_RECORD_NUMBER"}],"minLikelihood":"LIKELY"}' \
  --storage-config='{"cloudStorageOptions":{"fileSet":{"url":"gs://hipaa-phi-documents/*"}}}'
```

## Monitoring and Alerting

Set up alerts for security events that could indicate a breach.

```bash
# Alert on unauthorized access attempts
gcloud monitoring policies create \
  --display-name="PHI Unauthorized Access Alert" \
  --condition-display-name="Permission denied on PHI resources" \
  --condition-filter='resource.type="gce_instance" AND protoPayload.status.code=7' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s \
  --notification-channels=projects/hipaa-phi-project/notificationChannels/CHANNEL_ID

# Alert on data export attempts
gcloud monitoring policies create \
  --display-name="PHI Data Export Alert" \
  --condition-display-name="Large data export from PHI project" \
  --condition-filter='resource.type="gcs_bucket" AND protoPayload.methodName="storage.objects.get"' \
  --condition-threshold-value=100 \
  --condition-threshold-duration=600s \
  --notification-channels=projects/hipaa-phi-project/notificationChannels/CHANNEL_ID
```

## Breach Notification Preparation

HIPAA requires notification within 60 days of discovering a breach. Prepare by having an incident response plan that includes:

1. **Detection** - Cloud Monitoring and SCC alerts trigger incident response
2. **Assessment** - determine if PHI was accessed or disclosed
3. **Containment** - isolate affected systems
4. **Notification** - notify affected individuals within 60 days
5. **Documentation** - maintain records of the breach and response

## Compliance Checklist

Here is a mapping of key HIPAA safeguards to Google Cloud configurations:

| HIPAA Requirement | Google Cloud Control |
|-------------------|---------------------|
| Access controls | IAM, groups, conditions |
| Audit controls | Cloud Audit Logs, 6-year retention |
| Integrity controls | CMEK, Binary Authorization |
| Transmission security | TLS, Private connectivity |
| Encryption at rest | CMEK with Cloud KMS |
| Emergency access | Break-glass accounts |
| Automatic logoff | Session duration controls |
| Unique user IDs | Cloud Identity, no shared accounts |

HIPAA compliance on Google Cloud is achievable with the right architecture, but it requires ongoing attention. The technical controls are the foundation - equally important are the policies, training, and processes that surround them. Start with the BAA, isolate your PHI, encrypt everything, log everything, and restrict access to the minimum necessary.
