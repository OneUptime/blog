# How to Build Custom Cloud Asset Inventory Queries for Security Compliance Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Asset Inventory, Security, Compliance Automation, Google Cloud Governance

Description: Learn how to build custom Cloud Asset Inventory queries on Google Cloud to automate security compliance checks across your entire organization.

---

Cloud Asset Inventory is one of the most underused tools in Google Cloud. It provides a complete inventory of every resource across your organization - VMs, storage buckets, firewall rules, IAM policies, and hundreds of other resource types. More importantly, it lets you query this inventory using SQL-like syntax to find misconfigurations, compliance violations, and security gaps at scale.

Instead of writing custom scripts that iterate through each project and each resource type, you can run a single query against Cloud Asset Inventory and get answers in seconds. This guide shows you how to build and automate these queries for security compliance.

## Enabling Cloud Asset Inventory

```bash
# Enable the Cloud Asset API
gcloud services enable cloudasset.googleapis.com

# Export assets to BigQuery for advanced querying
gcloud asset export \
    --organization=123456789 \
    --content-type=resource \
    --output-bigquery-dataset=projects/my-project/datasets/asset_inventory \
    --output-bigquery-table=resources \
    --per-asset-type
```

The export creates tables in BigQuery for each asset type, making it easy to run SQL queries across your entire organization.

## Method 1: Search APIs for Quick Queries

Cloud Asset Inventory provides search APIs that do not require BigQuery:

### Finding Resources

```bash
# Find all public Cloud Storage buckets across the organization
gcloud asset search-all-resources \
    --scope=organizations/123456789 \
    --asset-types="storage.googleapis.com/Bucket" \
    --query="additionalAttributes.publicAccessPrevention:inherited" \
    --format="table(name, project, location)"

# Find all VMs with external IP addresses
gcloud asset search-all-resources \
    --scope=organizations/123456789 \
    --asset-types="compute.googleapis.com/Instance" \
    --query="additionalAttributes.networkInterfaces.accessConfigs:*" \
    --format="table(name, project, location)"

# Find all Cloud SQL instances without SSL enforcement
gcloud asset search-all-resources \
    --scope=organizations/123456789 \
    --asset-types="sqladmin.googleapis.com/Instance" \
    --format="table(name, project, additionalAttributes.settings.ipConfiguration)"

# Find all resources without required labels
gcloud asset search-all-resources \
    --scope=projects/my-project \
    --query="NOT labels:environment" \
    --format="table(assetType, name)"
```

### Searching IAM Policies

```bash
# Find all IAM bindings that grant Owner role
gcloud asset search-all-iam-policies \
    --scope=organizations/123456789 \
    --query="policy:roles/owner" \
    --format="table(resource, policy.bindings.role, policy.bindings.members)"

# Find IAM bindings for a specific user
gcloud asset search-all-iam-policies \
    --scope=organizations/123456789 \
    --query="policy:user:john@company.com" \
    --format="table(resource, policy.bindings.role)"

# Find all service accounts with the Editor role
gcloud asset search-all-iam-policies \
    --scope=organizations/123456789 \
    --query="policy:roles/editor AND policy:serviceAccount" \
    --format="table(resource, policy.bindings.members)"

# Find IAM bindings that use allUsers or allAuthenticatedUsers
gcloud asset search-all-iam-policies \
    --scope=organizations/123456789 \
    --query="policy:allUsers OR policy:allAuthenticatedUsers" \
    --format="table(resource, policy.bindings.role, policy.bindings.members)"
```

## Method 2: BigQuery Queries for Deep Analysis

After exporting assets to BigQuery, you can run complex analytical queries:

### Setting Up the Export

```bash
# Create a BigQuery dataset for asset inventory
bq mk --dataset \
    --location=US \
    --description="Cloud Asset Inventory data" \
    my-project:asset_inventory

# Export all resource types to BigQuery
gcloud asset export \
    --organization=123456789 \
    --content-type=resource \
    --output-bigquery-dataset=projects/my-project/datasets/asset_inventory \
    --output-bigquery-table=all_resources \
    --per-asset-type

# Export IAM policies
gcloud asset export \
    --organization=123456789 \
    --content-type=iam-policy \
    --output-bigquery-dataset=projects/my-project/datasets/asset_inventory \
    --output-bigquery-table=iam_policies
```

### Security Compliance Queries

Here are practical queries that catch common compliance issues.

**Find unencrypted Cloud Storage buckets:**

```sql
-- Find storage buckets not using customer-managed encryption keys
-- This violates most compliance frameworks that require CMEK
SELECT
    name,
    resource.data.location AS location,
    resource.parent AS project,
    resource.data.encryption.defaultKmsKeyName AS kms_key
FROM
    `asset_inventory.storage_googleapis_com_Bucket`
WHERE
    resource.data.encryption.defaultKmsKeyName IS NULL
    OR resource.data.encryption.defaultKmsKeyName = ''
ORDER BY project
```

**Find VMs without OS Login enabled:**

```sql
-- Find Compute instances that do not have OS Login enabled
-- OS Login provides centralized SSH key management
SELECT
    name,
    resource.parent AS project,
    resource.data.zone AS zone,
    resource.data.metadata AS metadata
FROM
    `asset_inventory.compute_googleapis_com_Instance`
WHERE
    NOT EXISTS (
        SELECT 1
        FROM UNNEST(resource.data.metadata.items) AS item
        WHERE item.key = 'enable-oslogin' AND item.value = 'TRUE'
    )
```

**Find overly permissive firewall rules:**

```sql
-- Find firewall rules that allow access from 0.0.0.0/0 to sensitive ports
SELECT
    name,
    resource.parent AS project,
    resource.data.direction AS direction,
    resource.data.sourceRanges AS source_ranges,
    resource.data.allowed AS allowed_rules
FROM
    `asset_inventory.compute_googleapis_com_Firewall`
WHERE
    '0.0.0.0/0' IN UNNEST(resource.data.sourceRanges)
    AND resource.data.direction = 'INGRESS'
    AND EXISTS (
        SELECT 1
        FROM UNNEST(resource.data.allowed) AS rule,
             UNNEST(rule.ports) AS port
        WHERE port IN ('22', '3389', '3306', '5432', '27017')
    )
```

**Find service accounts with user-managed keys:**

```sql
-- Find service accounts that have user-managed keys
-- SA keys are a security risk and should be avoided
SELECT
    name,
    resource.parent AS project,
    resource.data.email AS sa_email
FROM
    `asset_inventory.iam_googleapis_com_ServiceAccount`
WHERE
    EXISTS (
        SELECT 1
        FROM `asset_inventory.iam_googleapis_com_ServiceAccountKey` AS keys
        WHERE keys.resource.data.serviceAccountId = resource.data.uniqueId
        AND keys.resource.data.keyType = 'USER_MANAGED'
    )
```

**Audit IAM privilege escalation paths:**

```sql
-- Find principals with dangerous permission combinations
-- These could lead to privilege escalation
SELECT
    resource AS target_resource,
    binding.role AS role,
    member
FROM
    `asset_inventory.iam_policies`,
    UNNEST(iam_policy.bindings) AS binding,
    UNNEST(binding.members) AS member
WHERE
    binding.role IN (
        'roles/owner',
        'roles/iam.securityAdmin',
        'roles/iam.serviceAccountAdmin',
        'roles/iam.serviceAccountKeyAdmin',
        'roles/resourcemanager.organizationAdmin'
    )
ORDER BY role, member
```

## Method 3: Custom Compliance Checker Function

Build a Cloud Function that runs your compliance queries on a schedule:

```python
# compliance_scanner.py
# Runs a suite of compliance queries against Cloud Asset Inventory
# Reports violations via Pub/Sub for alerting and dashboarding

import functions_framework
from google.cloud import bigquery
from google.cloud import pubsub_v1
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)
bq_client = bigquery.Client()
publisher = pubsub_v1.PublisherClient()

PROJECT_ID = "my-project"
FINDINGS_TOPIC = f"projects/{PROJECT_ID}/topics/compliance-findings"

# Define compliance checks as SQL queries
COMPLIANCE_CHECKS = {
    'unencrypted_buckets': {
        'name': 'Unencrypted Storage Buckets',
        'severity': 'HIGH',
        'framework': 'SOC 2, HIPAA',
        'query': """
            SELECT name, resource.parent AS project,
                   resource.data.location AS location
            FROM `asset_inventory.storage_googleapis_com_Bucket`
            WHERE resource.data.encryption.defaultKmsKeyName IS NULL
        """
    },
    'public_buckets': {
        'name': 'Publicly Accessible Buckets',
        'severity': 'CRITICAL',
        'framework': 'SOC 2, PCI DSS',
        'query': """
            SELECT resource AS bucket_name, member, binding.role
            FROM `asset_inventory.iam_policies`,
                 UNNEST(iam_policy.bindings) AS binding,
                 UNNEST(binding.members) AS member
            WHERE resource LIKE '%storage.googleapis.com/Bucket%'
              AND (member = 'allUsers' OR member = 'allAuthenticatedUsers')
        """
    },
    'permissive_firewall': {
        'name': 'Overly Permissive Firewall Rules',
        'severity': 'HIGH',
        'framework': 'SOC 2, PCI DSS',
        'query': """
            SELECT name, resource.parent AS project
            FROM `asset_inventory.compute_googleapis_com_Firewall`
            WHERE '0.0.0.0/0' IN UNNEST(resource.data.sourceRanges)
              AND resource.data.direction = 'INGRESS'
        """
    },
    'sa_keys_exist': {
        'name': 'Service Accounts with User-Managed Keys',
        'severity': 'MEDIUM',
        'framework': 'SOC 2',
        'query': """
            SELECT name, resource.data.email
            FROM `asset_inventory.iam_googleapis_com_ServiceAccount`
            WHERE resource.data.email NOT LIKE '%gserviceaccount.com'
        """
    },
    'owner_role_usage': {
        'name': 'Principals with Owner Role',
        'severity': 'HIGH',
        'framework': 'SOC 2, HIPAA',
        'query': """
            SELECT resource, member
            FROM `asset_inventory.iam_policies`,
                 UNNEST(iam_policy.bindings) AS binding,
                 UNNEST(binding.members) AS member
            WHERE binding.role = 'roles/owner'
              AND member NOT LIKE 'serviceAccount:%'
        """
    }
}


@functions_framework.http
def run_compliance_scan(request):
    """Run all compliance checks and report findings."""

    scan_id = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    total_findings = 0
    results = {}

    for check_id, check in COMPLIANCE_CHECKS.items():
        try:
            query_job = bq_client.query(check['query'])
            rows = list(query_job.result())

            finding_count = len(rows)
            total_findings += finding_count

            results[check_id] = {
                'name': check['name'],
                'severity': check['severity'],
                'framework': check['framework'],
                'findings': finding_count,
                'status': 'PASS' if finding_count == 0 else 'FAIL'
            }

            # Publish each finding to Pub/Sub
            if finding_count > 0:
                for row in rows:
                    finding = {
                        'scan_id': scan_id,
                        'check_id': check_id,
                        'check_name': check['name'],
                        'severity': check['severity'],
                        'framework': check['framework'],
                        'resource': dict(row),
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    publisher.publish(
                        FINDINGS_TOPIC,
                        json.dumps(finding).encode('utf-8')
                    )

            logger.info(f"Check {check_id}: {finding_count} findings")

        except Exception as e:
            logger.error(f"Check {check_id} failed: {e}")
            results[check_id] = {
                'name': check['name'],
                'status': 'ERROR',
                'error': str(e)
            }

    return json.dumps({
        'scan_id': scan_id,
        'total_findings': total_findings,
        'checks': results
    })
```

Deploy and schedule the scanner:

```bash
# Deploy the compliance scanner
gcloud functions deploy compliance-scanner \
    --runtime=python311 \
    --trigger-http \
    --entry-point=run_compliance_scan \
    --region=us-central1 \
    --service-account=compliance-scanner@my-project.iam.gserviceaccount.com \
    --memory=512MB \
    --timeout=300s \
    --no-allow-unauthenticated

# Schedule daily scans
gcloud scheduler jobs create http daily-compliance-scan \
    --schedule="0 6 * * *" \
    --uri="https://us-central1-my-project.cloudfunctions.net/compliance-scanner" \
    --http-method=GET \
    --oidc-service-account-email=compliance-scanner@my-project.iam.gserviceaccount.com
```

## Keeping the Asset Inventory Fresh

The one-time export gives you a snapshot. For continuous monitoring, set up scheduled exports:

```bash
# Schedule a daily asset export to BigQuery
gcloud scheduler jobs create http daily-asset-export \
    --schedule="0 1 * * *" \
    --uri="https://us-central1-my-project.cloudfunctions.net/export-assets" \
    --http-method=POST \
    --oidc-service-account-email=asset-manager@my-project.iam.gserviceaccount.com
```

```python
# export_assets.py
# Cloud Function that triggers a fresh asset export to BigQuery

import functions_framework
from google.cloud import asset_v1
import json

@functions_framework.http
def export_assets(request):
    """Export current asset inventory to BigQuery."""

    client = asset_v1.AssetServiceClient()

    # Export resources
    output_config = asset_v1.OutputConfig(
        bigquery_destination=asset_v1.BigQueryDestination(
            dataset=f"projects/my-project/datasets/asset_inventory",
            table="all_resources",
            force=True,
            partition_spec=asset_v1.PartitionSpec(
                partition_key=asset_v1.PartitionSpec.PartitionKey.REQUEST_TIME
            ),
            separate_tables_per_asset_type=True,
        )
    )

    request = asset_v1.ExportAssetsRequest(
        parent="organizations/123456789",
        content_type=asset_v1.ContentType.RESOURCE,
        output_config=output_config,
    )

    operation = client.export_assets(request=request)
    response = operation.result(timeout=600)

    return json.dumps({'status': 'success', 'output': str(response.output_config)})
```

## Visualizing Compliance Status

Create a dashboard query for an overview of your compliance posture:

```sql
-- Compliance dashboard summary query
-- Shows violation counts by severity and category
SELECT
    'Unencrypted Buckets' AS check_name,
    'HIGH' AS severity,
    COUNT(*) AS violations
FROM `asset_inventory.storage_googleapis_com_Bucket`
WHERE resource.data.encryption.defaultKmsKeyName IS NULL

UNION ALL

SELECT
    'Public IAM Bindings' AS check_name,
    'CRITICAL' AS severity,
    COUNT(*)
FROM `asset_inventory.iam_policies`,
     UNNEST(iam_policy.bindings) AS binding,
     UNNEST(binding.members) AS member
WHERE member IN ('allUsers', 'allAuthenticatedUsers')

UNION ALL

SELECT
    'Open Firewall Rules' AS check_name,
    'HIGH' AS severity,
    COUNT(*)
FROM `asset_inventory.compute_googleapis_com_Firewall`
WHERE '0.0.0.0/0' IN UNNEST(resource.data.sourceRanges)

ORDER BY severity, violations DESC
```

## Best Practices

**Export regularly.** Asset Inventory search APIs query real-time data, but BigQuery exports are snapshots. Schedule daily exports to keep your compliance queries current.

**Start with the high-impact queries.** Public buckets, overly permissive firewall rules, and Owner role assignments are the highest-risk findings. Build these first.

**Version control your queries.** Treat compliance queries like code. Store them in Git, review changes, and track which frameworks each query supports.

**Combine with real-time feeds.** Use Cloud Asset Inventory feeds (Pub/Sub) for real-time violation detection, and BigQuery queries for periodic compliance reporting. The combination gives you both immediate alerting and comprehensive auditing.

Cloud Asset Inventory queries give you organization-wide security visibility with minimal effort. A handful of well-crafted queries can replace hours of manual security review and catch issues that manual processes consistently miss.
