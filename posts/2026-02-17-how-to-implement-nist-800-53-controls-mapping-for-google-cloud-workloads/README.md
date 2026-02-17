# How to Implement NIST 800-53 Controls Mapping for Google Cloud Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security, NIST, Compliance, Google Cloud

Description: Learn how to map NIST 800-53 security controls to Google Cloud services and implement compliance frameworks for your cloud workloads effectively.

---

If you work in a regulated industry or deal with government contracts, NIST 800-53 is probably not new to you. It is one of the most comprehensive security control frameworks out there, and mapping those controls to your Google Cloud infrastructure can feel overwhelming at first. But once you break it down systematically, it becomes a manageable engineering problem rather than a compliance nightmare.

In this post, I will walk through a practical approach to mapping NIST 800-53 controls to GCP services, automating compliance checks, and building a repeatable process your team can maintain over time.

## Understanding NIST 800-53 Control Families

NIST 800-53 organizes security controls into 20 families. Not all of them apply equally to cloud workloads, but here are the ones that matter most in GCP:

- **AC (Access Control)** - Maps to IAM, Identity-Aware Proxy, VPC Service Controls
- **AU (Audit and Accountability)** - Maps to Cloud Audit Logs, Cloud Logging
- **CM (Configuration Management)** - Maps to Security Command Center, OS Config
- **IA (Identification and Authentication)** - Maps to Cloud Identity, IAM
- **SC (System and Communications Protection)** - Maps to VPC, Cloud Armor, Certificate Manager
- **SI (System and Information Integrity)** - Maps to Binary Authorization, Web Security Scanner

## Setting Up the Controls Mapping Structure

The first step is creating a structured mapping between NIST controls and GCP configurations. I recommend using a YAML-based approach that can be version controlled and programmatically validated.

Here is a sample controls mapping file that ties NIST control IDs to specific GCP resource configurations:

```yaml
# nist-controls-mapping.yaml
# Maps NIST 800-53 controls to GCP service configurations
controls:
  AC-2:  # Account Management
    description: "Manage information system accounts"
    gcp_services:
      - service: "Cloud Identity"
        implementation: "Automated user provisioning via Directory Sync"
      - service: "IAM"
        implementation: "Role-based access with time-bound conditions"
    terraform_modules:
      - "modules/iam-account-management"
    evidence_collection:
      - "gcloud iam roles list --project=${PROJECT_ID}"
      - "gcloud identity groups memberships list --group-email=${GROUP}"

  AC-6:  # Least Privilege
    description: "Employ the principle of least privilege"
    gcp_services:
      - service: "IAM"
        implementation: "Custom roles with minimal permissions"
      - service: "VPC Service Controls"
        implementation: "Service perimeter restrictions"
    terraform_modules:
      - "modules/iam-least-privilege"
    evidence_collection:
      - "gcloud asset search-all-iam-policies --scope=organizations/${ORG_ID}"

  AU-2:  # Audit Events
    description: "Identify auditable events"
    gcp_services:
      - service: "Cloud Audit Logs"
        implementation: "Admin Activity and Data Access logs enabled"
      - service: "Cloud Logging"
        implementation: "Log sinks to centralized storage"
    terraform_modules:
      - "modules/audit-logging"
    evidence_collection:
      - "gcloud logging sinks list --project=${PROJECT_ID}"
```

## Automating Compliance Checks with SCC

Google Cloud Security Command Center (SCC) already maps many of its findings to compliance standards. You can extend this by creating custom modules that check for NIST-specific requirements.

This Python script queries SCC findings and maps them back to NIST control families:

```python
# compliance_checker.py
# Checks SCC findings and maps them to NIST 800-53 controls
from google.cloud import securitycenter_v1
import yaml
import json

def load_controls_mapping(mapping_file):
    """Load the NIST controls mapping from YAML."""
    with open(mapping_file, 'r') as f:
        return yaml.safe_load(f)

def get_scc_findings(org_id, project_id=None):
    """Retrieve active SCC findings for the organization."""
    client = securitycenter_v1.SecurityCenterClient()
    parent = f"organizations/{org_id}/sources/-"

    # Filter for active, high-severity findings
    finding_filter = 'state="ACTIVE" AND severity="HIGH"'

    if project_id:
        finding_filter += f' AND resource.project_display_name="{project_id}"'

    findings = client.list_findings(
        request={
            "parent": parent,
            "filter": finding_filter
        }
    )

    return list(findings)

def map_findings_to_nist(findings, controls_mapping):
    """Map SCC findings to NIST 800-53 control families."""
    # Mapping of SCC finding categories to NIST control families
    scc_to_nist = {
        "PUBLIC_BUCKET_ACL": ["AC-3", "AC-6"],
        "OPEN_FIREWALL": ["SC-7", "AC-4"],
        "MFA_NOT_ENFORCED": ["IA-2", "IA-5"],
        "AUDIT_LOGGING_DISABLED": ["AU-2", "AU-3", "AU-12"],
        "OVER_PRIVILEGED_ACCOUNT": ["AC-6", "AC-2"],
        "ENCRYPTION_NOT_ENABLED": ["SC-28", "SC-13"],
        "PUBLIC_IP_ADDRESS": ["SC-7", "AC-4"],
    }

    nist_violations = {}

    for finding_result in findings:
        finding = finding_result.finding
        category = finding.category

        if category in scc_to_nist:
            for control_id in scc_to_nist[category]:
                if control_id not in nist_violations:
                    nist_violations[control_id] = []
                nist_violations[control_id].append({
                    "finding": category,
                    "resource": finding.resource_name,
                    "severity": str(finding.severity),
                })

    return nist_violations

def generate_compliance_report(nist_violations, controls_mapping):
    """Generate a compliance report with remediation steps."""
    report = {
        "timestamp": "2026-02-17T00:00:00Z",
        "total_controls_assessed": len(controls_mapping.get("controls", {})),
        "controls_with_violations": len(nist_violations),
        "violations": nist_violations,
    }
    return report

if __name__ == "__main__":
    org_id = "YOUR_ORG_ID"
    mapping = load_controls_mapping("nist-controls-mapping.yaml")
    findings = get_scc_findings(org_id)
    violations = map_findings_to_nist(findings, mapping)
    report = generate_compliance_report(violations, mapping)
    print(json.dumps(report, indent=2))
```

## Implementing Controls with Terraform

For repeatable compliance, define your NIST controls as Terraform modules. This ensures every new project starts with the right baseline.

This Terraform configuration implements the AC-2 and AU-2 control families:

```hcl
# main.tf
# NIST 800-53 baseline configuration for GCP projects

# AC-2: Account Management - Enforce MFA and session controls
resource "google_organization_policy" "require_mfa" {
  org_id     = var.org_id
  constraint = "iam.allowedPolicyMemberDomains"

  list_policy {
    allow {
      values = [var.allowed_domain]
    }
  }
}

# AU-2: Audit Events - Enable comprehensive audit logging
resource "google_project_iam_audit_config" "all_services" {
  project = var.project_id
  service = "allServices"

  # Log all admin activity
  audit_log_config {
    log_type = "ADMIN_READ"
  }

  # Log data reads and writes for sensitive services
  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# AU-6: Audit Review - Send logs to centralized SIEM
resource "google_logging_organization_sink" "audit_sink" {
  name             = "nist-audit-sink"
  org_id           = var.org_id
  destination      = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.audit_logs.dataset_id}"
  include_children = true

  filter = "logName:\"logs/cloudaudit.googleapis.com\""
}

# SC-28: Protection of Information at Rest
resource "google_kms_key_ring" "nist_keyring" {
  name     = "nist-compliance-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "encryption_key" {
  name     = "data-encryption-key"
  key_ring = google_kms_key_ring.nist_keyring.id

  # Rotate keys every 90 days per NIST SC-12
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}
```

## Building a Continuous Compliance Pipeline

A one-time mapping is not enough. You need continuous monitoring. Here is how to set up a Cloud Build pipeline that runs compliance checks on every infrastructure change:

```yaml
# cloudbuild-compliance.yaml
# Runs NIST compliance checks as part of CI/CD
steps:
  # Step 1: Validate Terraform against NIST policies
  - name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        terraform init
        terraform plan -out=tfplan
        terraform show -json tfplan > plan.json

  # Step 2: Run OPA policy checks against the plan
  - name: 'openpolicyagent/opa:latest'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        opa eval --data policies/nist/ \
          --input plan.json \
          "data.nist.violations" > opa_results.json

  # Step 3: Run the Python compliance checker
  - name: 'python:3.11'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        pip install google-cloud-securitycenter pyyaml
        python compliance_checker.py > compliance_report.json

  # Step 4: Upload results to BigQuery for tracking
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        bq load --source_format=NEWLINE_DELIMITED_JSON \
          ${PROJECT_ID}:compliance.nist_reports \
          compliance_report.json
```

## Tracking Compliance Over Time

Store your compliance results in BigQuery so you can track trends and prove improvement to auditors. This query shows compliance posture over time:

```sql
-- Query to track NIST compliance trends over time
SELECT
  DATE(timestamp) as assessment_date,
  total_controls_assessed,
  controls_with_violations,
  ROUND(
    (total_controls_assessed - controls_with_violations)
    / total_controls_assessed * 100, 2
  ) as compliance_percentage
FROM `project.compliance.nist_reports`
ORDER BY assessment_date DESC
LIMIT 30;
```

## Practical Tips from Experience

After going through this process across multiple organizations, here are some things I have learned:

First, start with the controls that your auditor cares about most. You do not need to map all 1000+ controls on day one. Focus on the high-impact families like AC, AU, IA, and SC.

Second, use Google's own compliance documentation as a starting point. GCP publishes detailed mappings between their services and NIST controls. Build on top of that rather than starting from scratch.

Third, automate evidence collection from the very beginning. When audit time comes, the difference between having automated evidence collection and manual screenshots is the difference between a two-day audit and a two-week audit.

Fourth, keep your controls mapping in version control alongside your infrastructure code. When a control changes or a new service is added, the mapping should be updated in the same pull request.

Finally, remember that compliance is not the same as security. A fully mapped NIST framework with green checkmarks everywhere does not mean you are secure. Use the framework as a baseline, but keep investing in threat modeling and real security testing beyond what the checkboxes require.

## Wrapping Up

Mapping NIST 800-53 to Google Cloud is a significant effort, but breaking it into structured YAML mappings, Terraform modules, automated checks, and continuous pipelines makes it sustainable. The key is treating compliance as code - version it, test it, and automate it just like any other engineering artifact in your stack.
