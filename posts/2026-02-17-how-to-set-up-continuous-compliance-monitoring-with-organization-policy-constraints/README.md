# How to Set Up Continuous Compliance Monitoring with Organization Policy Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Organization Policies, Compliance Monitoring, Cloud Governance, Security

Description: A practical guide to setting up continuous compliance monitoring on Google Cloud using organization policy constraints, Security Command Center, and automated remediation.

---

Passing an audit once is one thing. Staying compliant continuously is a completely different challenge. Resources get created without proper configurations, someone disables a security control during debugging and forgets to turn it back on, or a new team member does not know about the compliance requirements. Continuous compliance monitoring catches these drift scenarios automatically.

Google Cloud's organization policy constraints are the foundation for this. They let you define guardrails that prevent non-compliant resources from being created in the first place, and when combined with Security Command Center and automated remediation, you get a system that maintains compliance without constant manual oversight.

## Understanding Organization Policy Constraints

Organization policy constraints are rules that apply to your entire GCP organization, specific folders, or individual projects. They come in two flavors: boolean constraints that enable or disable a behavior, and list constraints that allow or deny specific values.

Google provides dozens of built-in constraints. You can also create custom constraints for organization-specific requirements.

## Step 1: Audit Your Current Policies

Before adding new constraints, understand what is already in place.

```bash
# List all organization policies currently applied
gcloud resource-manager org-policies list \
  --organization=ORG_ID

# Get details on a specific policy
gcloud resource-manager org-policies describe \
  constraints/compute.requireShieldedVm \
  --organization=ORG_ID

# Check effective policies for a specific project (includes inherited)
gcloud resource-manager org-policies describe \
  constraints/compute.requireShieldedVm \
  --project=PROJECT_ID --effective
```

## Step 2: Implement Essential Security Constraints

Here are the organization policies that should be in place for most compliance frameworks.

```bash
# Require shielded VMs for all compute instances
gcloud resource-manager org-policies enable-enforce \
  constraints/compute.requireShieldedVm \
  --organization=ORG_ID

# Disable external IP addresses on VMs (force private networking)
gcloud resource-manager org-policies enable-enforce \
  constraints/compute.vmExternalIpAccess \
  --organization=ORG_ID

# Require OS Login for SSH access (enforces IAM-based access)
gcloud resource-manager org-policies enable-enforce \
  constraints/compute.requireOsLogin \
  --organization=ORG_ID

# Disable service account key creation (use workload identity instead)
gcloud resource-manager org-policies enable-enforce \
  constraints/iam.disableServiceAccountKeyCreation \
  --organization=ORG_ID

# Restrict resource locations to approved regions
gcloud resource-manager org-policies set-policy \
  --organization=ORG_ID \
  location-policy.yaml

# Disable public access to Cloud Storage buckets
gcloud resource-manager org-policies enable-enforce \
  constraints/storage.uniformBucketLevelAccess \
  --organization=ORG_ID
```

The location policy file restricts where resources can be created:

```yaml
# location-policy.yaml
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - "in:us-locations"
    - "in:eu-locations"
```

## Step 3: Create Custom Organization Policy Constraints

When built-in constraints do not cover your requirements, create custom ones.

```yaml
# custom-constraint-require-labels.yaml
# Require all Cloud Storage buckets to have a data-classification label
name: organizations/ORG_ID/customConstraints/custom.storage.requireClassificationLabel
resourceTypes:
  - storage.googleapis.com/Bucket
methodTypes:
  - CREATE
  - UPDATE
condition: "resource.labels.exists(l, l == 'data-classification')"
actionType: ALLOW
displayName: "Require data classification label"
description: "All Cloud Storage buckets must have a data-classification label"
```

```yaml
# custom-constraint-require-cmek.yaml
# Require customer-managed encryption keys for BigQuery datasets
name: organizations/ORG_ID/customConstraints/custom.bigquery.requireCMEK
resourceTypes:
  - bigquery.googleapis.com/Dataset
methodTypes:
  - CREATE
condition: "resource.defaultEncryptionConfiguration.kmsKeyName.size() > 0"
actionType: ALLOW
displayName: "Require CMEK for BigQuery"
description: "All BigQuery datasets must use customer-managed encryption keys"
```

```bash
# Create and enforce the custom constraints
gcloud org-policies set-custom-constraint custom-constraint-require-labels.yaml
gcloud org-policies set-custom-constraint custom-constraint-require-cmek.yaml

# Apply enforcement policies for the custom constraints
gcloud resource-manager org-policies enable-enforce \
  custom.storage.requireClassificationLabel \
  --organization=ORG_ID

gcloud resource-manager org-policies enable-enforce \
  custom.bigquery.requireCMEK \
  --organization=ORG_ID
```

## Step 4: Set Up Security Command Center for Drift Detection

Security Command Center continuously scans your environment for compliance violations and misconfigurations.

```bash
# Enable Security Command Center Premium (required for compliance features)
gcloud scc settings update \
  --organization=ORG_ID \
  --enable-modules=SECURITY_HEALTH_ANALYTICS

# List current findings (misconfigurations and violations)
gcloud scc findings list ORG_ID \
  --source="-" \
  --filter='category="PUBLIC_BUCKET_ACL" OR category="OPEN_FIREWALL" OR category="MFA_NOT_ENFORCED"' \
  --format="table(finding.category,finding.resourceName,finding.state,finding.severity)"
```

## Step 5: Build Automated Remediation

When a compliance violation is detected, trigger automatic remediation through Cloud Functions.

```python
import json
from google.cloud import compute_v1
from google.cloud import storage

def remediate_scc_finding(event, context):
    """Auto-remediate Security Command Center findings."""
    # Parse the SCC notification
    finding = json.loads(event["data"])
    category = finding.get("finding", {}).get("category", "")
    resource_name = finding.get("finding", {}).get("resourceName", "")

    remediation_map = {
        "PUBLIC_BUCKET_ACL": remediate_public_bucket,
        "OPEN_FIREWALL": remediate_open_firewall,
        "OPEN_SSH_PORT": remediate_open_ssh,
    }

    handler = remediation_map.get(category)
    if handler:
        handler(resource_name, finding)
        print(f"Remediated {category} for {resource_name}")
    else:
        print(f"No auto-remediation for {category}")

def remediate_public_bucket(resource_name, finding):
    """Remove public access from a Cloud Storage bucket."""
    client = storage.Client()

    # Extract bucket name from the resource name
    bucket_name = resource_name.split("/")[-1]
    bucket = client.bucket(bucket_name)

    # Remove allUsers and allAuthenticatedUsers bindings
    policy = bucket.get_iam_policy()
    new_bindings = []
    for binding in policy.bindings:
        members = [
            m for m in binding["members"]
            if m not in ("allUsers", "allAuthenticatedUsers")
        ]
        if members:
            binding["members"] = members
            new_bindings.append(binding)

    policy.bindings = new_bindings
    bucket.set_iam_policy(policy)
    print(f"Removed public access from bucket: {bucket_name}")

def remediate_open_firewall(resource_name, finding):
    """Disable overly permissive firewall rules."""
    client = compute_v1.FirewallsClient()

    # Parse the resource name to get project and firewall name
    parts = resource_name.split("/")
    project = parts[parts.index("projects") + 1]
    firewall_name = parts[-1]

    # Disable the rule instead of deleting it
    firewall = client.get(project=project, firewall=firewall_name)
    firewall.disabled = True

    operation = client.patch(
        project=project,
        firewall=firewall_name,
        firewall_resource=firewall,
    )
    print(f"Disabled firewall rule: {firewall_name}")
```

## Step 6: Create a Compliance Dashboard

Build a dashboard that shows real-time compliance status across your organization.

```python
from google.cloud import securitycenter
from google.cloud import bigquery

def generate_compliance_dashboard_data(org_id):
    """Generate compliance status data for dashboard."""
    scc_client = securitycenter.SecurityCenterClient()
    org_name = f"organizations/{org_id}"

    # Count findings by category and severity
    findings_summary = {}

    request = securitycenter.ListFindingsRequest(
        parent=f"{org_name}/sources/-",
        filter='state="ACTIVE"',
    )

    for finding_result in scc_client.list_findings(request=request):
        finding = finding_result.finding
        category = finding.category
        severity = str(finding.severity)

        if category not in findings_summary:
            findings_summary[category] = {
                "count": 0,
                "severity": severity,
                "resources": [],
            }
        findings_summary[category]["count"] += 1
        findings_summary[category]["resources"].append(
            finding.resource_name
        )

    return findings_summary

def write_dashboard_data(project_id, summary):
    """Write compliance data to BigQuery for dashboard visualization."""
    client = bigquery.Client(project=project_id)

    rows = []
    for category, data in summary.items():
        rows.append({
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "category": category,
            "finding_count": data["count"],
            "severity": data["severity"],
            "resource_count": len(set(data["resources"])),
        })

    table_id = f"{project_id}.compliance.dashboard_data"
    errors = client.insert_rows_json(table_id, rows)
    if errors:
        print(f"Errors writing dashboard data: {errors}")
    else:
        print(f"Wrote {len(rows)} compliance status records")
```

## Step 7: Schedule Compliance Reports

Generate regular compliance reports that document your continuous monitoring.

```bash
# Schedule a weekly compliance report
gcloud scheduler jobs create pubsub weekly-compliance-report \
  --schedule="0 8 * * 1" \
  --topic=generate-compliance-report \
  --message-body='{"report_type": "weekly_summary"}' \
  --location=us-central1
```

Continuous compliance monitoring transforms compliance from a periodic scramble into an ongoing automated process. Organization policies prevent non-compliant resources from being created, Security Command Center detects drift, and automated remediation fixes issues before they become audit findings. The combination of prevention, detection, and response keeps your GCP environment compliant without constant manual intervention.
