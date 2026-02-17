# How to Configure Key Access Justifications for Transparency in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Key Access Justifications, Cloud KMS, Security, Compliance

Description: Learn how to configure Key Access Justifications in Google Cloud to gain visibility and control over when and why your encryption keys are accessed by Google personnel.

---

When you store data in Google Cloud, it is encrypted at rest using encryption keys. But who has access to those keys, and under what circumstances? Key Access Justifications (KAJ) answers this question by giving you visibility into every time Google personnel access your encryption keys, along with the reason for that access. You can even configure policies to automatically deny access requests that do not meet your criteria.

This is a feature that matters a lot for organizations in regulated industries - financial services, healthcare, government - where you need to demonstrate full control over your cryptographic keys.

## What Key Access Justifications Actually Does

KAJ works on top of Cloud External Key Manager (Cloud EKM). When you use Cloud EKM, your encryption keys are stored in an external key management system that you control, rather than in Google's infrastructure. Every time Google needs to use one of those keys to decrypt your data, the access request passes through your external key manager, which receives a justification code explaining why the access is needed.

The justification codes fall into several categories. CUSTOMER_INITIATED_ACCESS means a user or service account in your organization triggered the operation. GOOGLE_INITIATED_SERVICE means Google needs to access the data for a service operation like running an optimization or performing maintenance. GOOGLE_INITIATED_SYSTEM_OPERATION is for automated system operations. THIRD_PARTY_DATA_REQUEST covers legal or regulatory requests from external parties.

## Prerequisites

Before setting up KAJ, you need an external key manager that supports the Cloud EKM protocol - Fortanix, Thales CipherTrust, or another compatible provider. You also need Cloud EKM enabled in your project and the Cloud KMS Admin role.

```bash
# Enable the required APIs
gcloud services enable cloudkms.googleapis.com
gcloud services enable ekms.googleapis.com

# Verify your organization has the KAJ feature available
# This requires Assured Workloads or a specific support level
gcloud assured workloads list --organization=YOUR_ORG_ID
```

## Step 1: Set Up Your External Key Manager

The external key manager is where your keys physically reside. I will use Fortanix DSM as an example, but the process is similar for other providers.

First, configure your external key manager to accept connections from Google Cloud's EKM service. This typically involves creating an API key or service account in your EKM, whitelisting Google's EKM service IP ranges, and configuring a key that maps to the Cloud EKM key URI format.

```bash
# Create a Cloud EKM connection to your external key manager
gcloud kms ekm-connections create my-ekm-connection \
  --location=us-central1 \
  --service-directory-service="projects/PROJECT_ID/locations/us-central1/namespaces/ekm-ns/services/ekm-service" \
  --hostname="ekm.example.com" \
  --server-certificates-pem-file=server-cert.pem
```

## Step 2: Create a Key Ring and EKM-Backed Key

With the connection established, create a key ring and a crypto key that uses your external key manager.

```bash
# Create a key ring for EKM keys
gcloud kms keyrings create ekm-keyring \
  --location=us-central1

# Create an EKM-backed crypto key
gcloud kms keys create kaj-protected-key \
  --keyring=ekm-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --protection-level=external \
  --default-algorithm=external-symmetric-encryption \
  --skip-initial-version-creation

# Create the initial key version pointing to your external key
gcloud kms keys versions create \
  --key=kaj-protected-key \
  --keyring=ekm-keyring \
  --location=us-central1 \
  --external-key-uri="https://ekm.example.com/v1/keys/my-key-id"
```

## Step 3: Configure Key Access Justification Policies

This is where you define which justification codes are acceptable. Your external key manager evaluates these policies and either allows or denies the access request.

```json
{
  "policy": {
    "allowed_justifications": [
      "CUSTOMER_INITIATED_ACCESS",
      "GOOGLE_INITIATED_SYSTEM_OPERATION"
    ],
    "denied_justifications": [
      "THIRD_PARTY_DATA_REQUEST",
      "GOOGLE_INITIATED_SERVICE"
    ],
    "default_action": "DENY"
  }
}
```

The policy above allows access when your own users and applications need to use the key, and when Google's automated systems need to perform operations. It denies access for third-party data requests and Google-initiated service operations.

Configure this policy in your external key manager's console. The exact steps depend on your provider, but the concept is the same - you are creating rules that evaluate the justification code attached to each key access request.

## Step 4: Apply the Key to Your Resources

Now use your KAJ-protected key to encrypt your Google Cloud resources. Here is how to apply it to some common services:

```bash
# Encrypt a BigQuery dataset with the KAJ-protected key
bq mk --dataset \
  --default_kms_key="projects/PROJECT_ID/locations/us-central1/keyRings/ekm-keyring/cryptoKeys/kaj-protected-key" \
  PROJECT_ID:sensitive_dataset

# Encrypt Cloud Storage bucket contents
gsutil kms authorize -p PROJECT_ID \
  -k "projects/PROJECT_ID/locations/us-central1/keyRings/ekm-keyring/cryptoKeys/kaj-protected-key"

gcloud storage buckets update gs://my-sensitive-bucket \
  --default-encryption-key="projects/PROJECT_ID/locations/us-central1/keyRings/ekm-keyring/cryptoKeys/kaj-protected-key"

# Encrypt Compute Engine disks
gcloud compute disks create encrypted-disk \
  --zone=us-central1-a \
  --kms-key="projects/PROJECT_ID/locations/us-central1/keyRings/ekm-keyring/cryptoKeys/kaj-protected-key"
```

## Step 5: Monitor Key Access Events

Set up monitoring to track all key access events and their justifications. This gives you an audit trail for compliance purposes.

```bash
# Query Cloud Audit Logs for key access events
gcloud logging read '
  resource.type="cloudkms_cryptokey"
  AND protoPayload.methodName="Decrypt"
  AND protoPayload.serviceData.keyAccessJustification!=""
' --limit=100 --format=json

# Create a log-based metric for denied key access attempts
gcloud logging metrics create kaj_denied_access \
  --description="Key access requests denied by justification policy" \
  --filter='resource.type="cloudkms_cryptokey" AND protoPayload.status.code!=0 AND protoPayload.serviceData.keyAccessJustification!=""'
```

You can also export these logs to BigQuery for long-term analysis:

```python
# Python script to analyze KAJ events from BigQuery
from google.cloud import bigquery

client = bigquery.Client()

# Query to summarize key access by justification type
query = """
SELECT
    protopayload_auditlog.servicedata_v1_cloudkms.keyAccessJustification AS justification,
    protopayload_auditlog.status.code AS status_code,
    COUNT(*) AS access_count,
    MIN(timestamp) AS first_access,
    MAX(timestamp) AS last_access
FROM `project.dataset.cloudaudit_googleapis_com_data_access`
WHERE resource.type = 'cloudkms_cryptokey'
GROUP BY justification, status_code
ORDER BY access_count DESC
"""

results = client.query(query)
for row in results:
    status = "ALLOWED" if row.status_code == 0 else "DENIED"
    print(f"{row.justification}: {row.access_count} requests ({status})")
```

## Step 6: Set Up Alerts for Unusual Access Patterns

Configure alerts so you know immediately when something unexpected happens.

```bash
# Alert when a key access is denied
gcloud alpha monitoring policies create \
  --display-name="KAJ Access Denied Alert" \
  --condition-display-name="Key access denied by justification policy" \
  --condition-filter='metric.type="logging.googleapis.com/user/kaj_denied_access"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
```

## Operational Considerations

There are some trade-offs to be aware of. First, latency increases slightly because every key access request has to round-trip to your external key manager. For latency-sensitive applications, measure the impact before rolling out broadly. Second, availability depends on your external key manager being reachable. If your EKM goes down, Google cannot decrypt your data, and any services that depend on that data will experience outages. This is actually a feature, not a bug - it means you have true control over key access.

Third, think carefully before denying GOOGLE_INITIATED_SYSTEM_OPERATION. Some background maintenance tasks genuinely need key access, and blocking them could affect service reliability.

Key Access Justifications give you something that few cloud providers offer: genuine, auditable, enforceable control over who accesses your encryption keys and why. For organizations that need to prove this level of control to regulators or auditors, KAJ combined with Cloud EKM is a powerful combination.
