# How to Configure Assured Workloads for EU Data Sovereignty Compliance on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Assured Workloads, EU Sovereignty, GDPR, Compliance

Description: Step-by-step guide to configuring Google Cloud Assured Workloads for EU data sovereignty compliance, including environment setup, key management, and access controls.

---

If your organization handles EU citizen data, you know the compliance requirements are not optional. GDPR demands that personal data stays protected, and increasingly, European regulators expect data to physically reside within the EU with controls over who can access it. Google Cloud Assured Workloads provides a managed way to meet these requirements without building everything from scratch.

Assured Workloads creates a controlled environment within GCP that enforces data residency, restricts personnel access by geography, and provides encryption with EU-based key management. This guide walks through setting it up.

## What Assured Workloads Actually Provides

When you create an Assured Workloads environment with the EU Regions and Support compliance regime, Google guarantees several things. First, all data at rest stays in EU regions. Second, only EU-based Google support personnel can access your data. Third, Access Transparency logs show you every time Google personnel access your environment. Fourth, organization policies are automatically applied to prevent data from leaving the EU.

This is a step beyond just creating resources in EU regions. Without Assured Workloads, a Google support engineer in the US could theoretically access your EU data during a support case. With Assured Workloads, that access is technically blocked.

## Prerequisites

Before you start, you need an active Google Cloud organization, a billing account with sufficient quota, the Assured Workloads Admin role, and either Premium or Enhanced support (required for the compliance features).

```bash
# Verify your organization
gcloud organizations list

# Check your current roles
gcloud organizations get-iam-policy YOUR_ORG_ID \
  --filter="bindings.role:roles/assuredworkloads.admin" \
  --format="table(bindings.members)"

# Enable the Assured Workloads API
gcloud services enable assuredworkloads.googleapis.com
```

## Step 1: Create the Assured Workloads Environment

The Assured Workloads environment is essentially a folder in your resource hierarchy with compliance controls baked in.

```bash
# Create an Assured Workloads environment for EU sovereignty
gcloud assured workloads create \
  --organization=ORG_ID \
  --location=europe-west1 \
  --display-name="EU Sovereign Environment" \
  --compliance-regime=EU_REGIONS_AND_SUPPORT \
  --billing-account=BILLING_ACCOUNT_ID \
  --next-rotation-time="2026-05-17T00:00:00Z" \
  --rotation-period="7776000s" \
  --partner=LOCAL_CONTROLS_BY_S3NS
```

You can also create it programmatically:

```python
from google.cloud import assuredworkloads_v1

def create_eu_workload(org_id, billing_account):
    """Create an Assured Workloads environment for EU compliance."""
    client = assuredworkloads_v1.AssuredWorkloadsServiceClient()

    workload = assuredworkloads_v1.Workload()
    workload.display_name = "EU Sovereign Environment"
    workload.compliance_regime = (
        assuredworkloads_v1.Workload.ComplianceRegime.EU_REGIONS_AND_SUPPORT
    )
    workload.billing_account = f"billingAccounts/{billing_account}"

    # Configure the KMS settings
    workload.kms_settings = assuredworkloads_v1.Workload.KMSSettings(
        next_rotation_time={"seconds": 1747440000},  # 90 days from now
        rotation_period={"seconds": 7776000},  # 90 days
    )

    # Create the workload
    operation = client.create_workload(
        parent=f"organizations/{org_id}/locations/europe-west1",
        workload=workload,
    )

    # Wait for the operation to complete
    result = operation.result()
    print(f"Created workload: {result.name}")
    print(f"Workload folder: {result.resources}")
    return result
```

## Step 2: Understand What Gets Auto-Configured

When the Assured Workloads environment is created, several things happen automatically. A new folder is created in your organization hierarchy. Organization policies are applied to that folder, including resource location restrictions to EU regions, restrictions on sharing data outside the organization, and enforcement of CMEK for supported services.

A Cloud KMS key ring is created in an EU region, and a project for managing encryption keys is provisioned.

```bash
# List the resources created by Assured Workloads
gcloud assured workloads describe WORKLOAD_ID \
  --organization=ORG_ID \
  --location=europe-west1

# Check the organization policies applied to the workload folder
gcloud resource-manager org-policies list \
  --folder=WORKLOAD_FOLDER_ID
```

## Step 3: Create Projects Inside the Workload

All projects that handle EU data should be created inside the Assured Workloads folder.

```bash
# Create a project inside the Assured Workloads folder
gcloud projects create eu-data-project-001 \
  --folder=WORKLOAD_FOLDER_ID \
  --name="EU Data Processing"

# Link it to your billing account
gcloud billing projects link eu-data-project-001 \
  --billing-account=BILLING_ACCOUNT_ID

# Enable the services you need
gcloud services enable \
  bigquery.googleapis.com \
  storage.googleapis.com \
  compute.googleapis.com \
  sqladmin.googleapis.com \
  --project=eu-data-project-001
```

## Step 4: Configure Customer-Managed Encryption Keys

Assured Workloads creates a key project and key ring for you. Use these keys to encrypt your resources.

```bash
# List the keys in the Assured Workloads key ring
gcloud kms keys list \
  --keyring=WORKLOAD_KEYRING \
  --location=europe-west1 \
  --project=WORKLOAD_KEY_PROJECT

# Create additional keys as needed
gcloud kms keys create bigquery-key \
  --keyring=WORKLOAD_KEYRING \
  --location=europe-west1 \
  --project=WORKLOAD_KEY_PROJECT \
  --purpose=encryption \
  --rotation-period=90d

# Create a BigQuery dataset encrypted with the workload key
bq mk --dataset \
  --location=EU \
  --default_kms_key="projects/WORKLOAD_KEY_PROJECT/locations/europe-west1/keyRings/WORKLOAD_KEYRING/cryptoKeys/bigquery-key" \
  eu-data-project-001:customer_data

# Create an encrypted Cloud Storage bucket
gcloud storage buckets create gs://eu-sovereign-data \
  --project=eu-data-project-001 \
  --location=europe-west1 \
  --default-encryption-key="projects/WORKLOAD_KEY_PROJECT/locations/europe-west1/keyRings/WORKLOAD_KEYRING/cryptoKeys/storage-key"
```

## Step 5: Set Up Access Controls

Restrict who can access the Assured Workloads environment. Use IAM conditions to limit access to specific users and service accounts.

```bash
# Grant access to EU-based team members only
gcloud projects add-iam-policy-binding eu-data-project-001 \
  --member="group:eu-data-team@company.com" \
  --role="roles/bigquery.dataEditor" \
  --condition='expression=request.time.getHours("Europe/Berlin") >= 6 && request.time.getHours("Europe/Berlin") <= 22,title=business-hours-only,description=Access only during EU business hours'

# Set up a dedicated service account for data processing
gcloud iam service-accounts create eu-data-processor \
  --project=eu-data-project-001 \
  --display-name="EU Data Processor"

gcloud projects add-iam-policy-binding eu-data-project-001 \
  --member="serviceAccount:eu-data-processor@eu-data-project-001.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

## Step 6: Enable and Monitor Access Transparency

Access Transparency logs give you visibility into when Google personnel access your environment.

```bash
# Access Transparency is automatically enabled for Assured Workloads
# Query the logs to see access events
gcloud logging read '
  logName:"accessTransparency"
  AND resource.type="project"
' --project=eu-data-project-001 --limit=50 --format=json
```

Build a monitoring dashboard for these events:

```python
from google.cloud import monitoring_v3

def create_access_transparency_alert(project_id):
    """Alert when Google personnel access the Assured Workloads environment."""
    client = monitoring_v3.AlertPolicyServiceClient()

    alert_policy = monitoring_v3.AlertPolicy()
    alert_policy.display_name = "Google Personnel Access Alert"
    alert_policy.conditions = [
        monitoring_v3.AlertPolicy.Condition(
            display_name="Access Transparency Event Detected",
            condition_matched_log=monitoring_v3.AlertPolicy.Condition.LogMatch(
                filter='logName:"accessTransparency"',
            ),
        )
    ]
    alert_policy.combiner = monitoring_v3.AlertPolicy.ConditionCombinerType.OR
    alert_policy.notification_channels = [
        f"projects/{project_id}/notificationChannels/CHANNEL_ID"
    ]

    response = client.create_alert_policy(
        name=f"projects/{project_id}",
        alert_policy=alert_policy,
    )
    print(f"Created alert: {response.name}")
```

## Step 7: Validate Compliance Continuously

Regularly check that your Assured Workloads environment remains compliant.

```bash
# Check for compliance violations
gcloud assured workloads violations list \
  --workload=WORKLOAD_ID \
  --organization=ORG_ID \
  --location=europe-west1

# Get details on a specific violation
gcloud assured workloads violations describe VIOLATION_ID \
  --workload=WORKLOAD_ID \
  --organization=ORG_ID \
  --location=europe-west1
```

```python
def check_compliance_status(org_id, workload_id, location="europe-west1"):
    """Check the compliance status of an Assured Workloads environment."""
    client = assuredworkloads_v1.AssuredWorkloadsServiceClient()

    workload_name = (
        f"organizations/{org_id}/locations/{location}/workloads/{workload_id}"
    )

    # List any violations
    violations = client.list_violations(parent=workload_name)

    violation_count = 0
    for violation in violations:
        violation_count += 1
        print(f"Violation: {violation.description}")
        print(f"  State: {violation.state}")
        print(f"  Remediation: {violation.remediation}")

    if violation_count == 0:
        print("No compliance violations found - environment is compliant")
    else:
        print(f"Found {violation_count} violations requiring attention")
```

Assured Workloads takes a lot of the manual effort out of EU data sovereignty compliance. Instead of configuring dozens of individual policies and hoping nothing slips through, you get a managed environment with built-in guardrails. The key is to put all your EU-regulated workloads inside the Assured Workloads folder and use the provided encryption keys consistently across all your resources.
