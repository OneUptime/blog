# How to Automate Evidence Collection for Compliance Audits on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compliance, Audit, Automation, Security Command Center

Description: Learn how to automate the collection of compliance evidence on Google Cloud, reducing audit preparation time from weeks to hours with scripted evidence gathering.

---

Audit season is the worst. Your compliance team sends you a spreadsheet with 200 evidence requests, and you spend the next three weeks pulling screenshots, exporting configurations, and writing explanations. Then the auditor asks follow-up questions, and you start over.

It does not have to be this way. By automating evidence collection on Google Cloud, you can reduce audit preparation from weeks to hours. This guide shows you how to build an automated evidence collection pipeline that continuously gathers the artifacts auditors typically request.

## Common Audit Evidence Categories

Auditors across different frameworks (SOC 2, ISO 27001, PCI DSS, HIPAA) generally ask for evidence in these categories: access controls and IAM policies, encryption configuration, network security controls, logging and monitoring configuration, change management records, and vulnerability management.

Each of these maps to specific GCP APIs that you can query programmatically.

## Step 1: Build the Evidence Collection Framework

Start with a framework that organizes evidence by control category and can be run on demand or on a schedule.

```python
import json
import datetime
from google.cloud import storage
from dataclasses import dataclass, asdict
from typing import List, Callable

@dataclass
class EvidenceItem:
    """Represents a single piece of audit evidence."""
    control_id: str
    control_description: str
    evidence_type: str
    collected_at: str
    data: dict
    source: str

class EvidenceCollector:
    """Framework for automated evidence collection."""

    def __init__(self, project_id, output_bucket):
        self.project_id = project_id
        self.output_bucket = output_bucket
        self.collectors: List[Callable] = []
        self.evidence: List[EvidenceItem] = []

    def register(self, collector_fn):
        """Register an evidence collection function."""
        self.collectors.append(collector_fn)
        return collector_fn

    def collect_all(self):
        """Run all registered collectors and gather evidence."""
        for collector in self.collectors:
            try:
                items = collector(self.project_id)
                self.evidence.extend(items)
                print(f"Collected {len(items)} items from {collector.__name__}")
            except Exception as e:
                print(f"Error in {collector.__name__}: {e}")

    def export_to_gcs(self):
        """Export all evidence to Cloud Storage."""
        client = storage.Client()
        bucket = client.bucket(self.output_bucket)

        timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d-%H%M%S")
        blob_name = f"audit-evidence/{timestamp}/evidence.json"

        evidence_data = [asdict(item) for item in self.evidence]
        blob = bucket.blob(blob_name)
        blob.upload_from_string(
            json.dumps(evidence_data, indent=2, default=str),
            content_type="application/json",
        )
        print(f"Evidence exported to gs://{self.output_bucket}/{blob_name}")
```

## Step 2: Collect IAM Evidence

IAM policies are always on the auditor's list. Collect current policies, role assignments, and service account configurations.

```python
from google.cloud import resourcemanager_v3
from google.cloud import iam_admin_v1

def collect_iam_evidence(project_id):
    """Collect IAM-related evidence for audit."""
    evidence = []

    # Collect project IAM policy
    rm_client = resourcemanager_v3.ProjectsClient()
    policy = rm_client.get_iam_policy(
        request={"resource": f"projects/{project_id}"}
    )

    bindings_data = []
    for binding in policy.bindings:
        bindings_data.append({
            "role": binding.role,
            "members": list(binding.members),
            "condition": str(binding.condition) if binding.condition else None,
        })

    evidence.append(EvidenceItem(
        control_id="AC-2",
        control_description="Account Management - IAM Role Assignments",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"bindings": bindings_data},
        source=f"projects/{project_id}/iamPolicy",
    ))

    # Collect service account details
    iam_client = iam_admin_v1.IAMClient()
    service_accounts = iam_client.list_service_accounts(
        request={"name": f"projects/{project_id}"}
    )

    sa_data = []
    for sa in service_accounts:
        # Check for key age
        keys = iam_client.list_service_account_keys(
            request={"name": sa.name}
        )
        sa_data.append({
            "email": sa.email,
            "display_name": sa.display_name,
            "disabled": sa.disabled,
            "key_count": len(list(keys)),
        })

    evidence.append(EvidenceItem(
        control_id="AC-2(1)",
        control_description="Account Management - Service Account Inventory",
        evidence_type="inventory",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"service_accounts": sa_data},
        source=f"projects/{project_id}/serviceAccounts",
    ))

    return evidence
```

## Step 3: Collect Encryption Evidence

Prove that data is encrypted at rest and in transit with the required key management controls.

```python
from google.cloud import kms
from google.cloud import bigquery
from google.cloud import storage as gcs

def collect_encryption_evidence(project_id):
    """Collect encryption-related audit evidence."""
    evidence = []

    # Collect KMS key configurations
    kms_client = kms.KeyManagementServiceClient()
    key_data = []

    # List all key rings in common locations
    for location in ["global", "us-central1", "europe-west1"]:
        parent = f"projects/{project_id}/locations/{location}"
        try:
            for key_ring in kms_client.list_key_rings(request={"parent": parent}):
                for key in kms_client.list_crypto_keys(
                    request={"parent": key_ring.name}
                ):
                    key_data.append({
                        "name": key.name,
                        "purpose": str(key.purpose),
                        "rotation_period": str(key.rotation_period),
                        "next_rotation_time": str(key.next_rotation_time),
                        "primary_version_state": str(
                            key.primary.state if key.primary else "N/A"
                        ),
                    })
        except Exception:
            pass  # location may not have key rings

    evidence.append(EvidenceItem(
        control_id="SC-12",
        control_description="Cryptographic Key Establishment and Management",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"encryption_keys": key_data},
        source=f"projects/{project_id}/kms",
    ))

    # Collect BigQuery dataset encryption settings
    bq_client = bigquery.Client(project=project_id)
    dataset_encryption = []
    for dataset in bq_client.list_datasets():
        ds = bq_client.get_dataset(dataset.reference)
        dataset_encryption.append({
            "dataset_id": ds.dataset_id,
            "default_encryption": str(ds.default_encryption_configuration)
                if ds.default_encryption_configuration else "Google-managed",
            "location": ds.location,
        })

    evidence.append(EvidenceItem(
        control_id="SC-28",
        control_description="Protection of Information at Rest - BigQuery",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"datasets": dataset_encryption},
        source=f"projects/{project_id}/bigquery/datasets",
    ))

    return evidence
```

## Step 4: Collect Network Security Evidence

Document firewall rules, VPC configurations, and network segmentation.

```python
from google.cloud import compute_v1

def collect_network_evidence(project_id):
    """Collect network security evidence for audit."""
    evidence = []

    # Collect firewall rules
    fw_client = compute_v1.FirewallsClient()
    firewall_rules = []
    for rule in fw_client.list(project=project_id):
        firewall_rules.append({
            "name": rule.name,
            "direction": rule.direction,
            "priority": rule.priority,
            "source_ranges": list(rule.source_ranges) if rule.source_ranges else [],
            "allowed": [
                {"protocol": a.I_p_protocol, "ports": list(a.ports) if a.ports else []}
                for a in rule.allowed
            ] if rule.allowed else [],
            "denied": [
                {"protocol": d.I_p_protocol, "ports": list(d.ports) if d.ports else []}
                for d in rule.denied
            ] if rule.denied else [],
            "disabled": rule.disabled,
            "network": rule.network,
        })

    evidence.append(EvidenceItem(
        control_id="SC-7",
        control_description="Boundary Protection - Firewall Rules",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"firewall_rules": firewall_rules},
        source=f"projects/{project_id}/firewalls",
    ))

    # Collect VPC configurations
    network_client = compute_v1.NetworksClient()
    networks = []
    for network in network_client.list(project=project_id):
        subnets = []
        for subnet_url in network.subnetworks or []:
            subnets.append(subnet_url.split("/")[-1])
        networks.append({
            "name": network.name,
            "auto_create_subnetworks": network.auto_create_subnetworks,
            "subnets": subnets,
        })

    evidence.append(EvidenceItem(
        control_id="SC-7(5)",
        control_description="Boundary Protection - Network Segmentation",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"networks": networks},
        source=f"projects/{project_id}/networks",
    ))

    return evidence
```

## Step 5: Collect Logging and Monitoring Evidence

Auditors want proof that you have comprehensive logging and active monitoring.

```python
from google.cloud import logging_v2
from google.cloud import monitoring_v3

def collect_logging_evidence(project_id):
    """Collect logging and monitoring evidence."""
    evidence = []

    # Collect log sink configurations
    logging_client = logging_v2.Client(project=project_id)
    sinks = []
    for sink in logging_client.list_sinks():
        sinks.append({
            "name": sink.name,
            "destination": sink.destination,
            "filter": sink.filter_,
        })

    evidence.append(EvidenceItem(
        control_id="AU-4",
        control_description="Audit Log Storage Capacity - Log Sinks",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"log_sinks": sinks},
        source=f"projects/{project_id}/logSinks",
    ))

    # Collect alert policy configurations
    mon_client = monitoring_v3.AlertPolicyServiceClient()
    alerts = []
    for policy in mon_client.list_alert_policies(
        name=f"projects/{project_id}"
    ):
        alerts.append({
            "name": policy.display_name,
            "enabled": policy.enabled,
            "conditions": len(policy.conditions),
            "notification_channels": len(policy.notification_channels),
        })

    evidence.append(EvidenceItem(
        control_id="SI-4",
        control_description="System Monitoring - Alert Policies",
        evidence_type="configuration",
        collected_at=datetime.datetime.utcnow().isoformat(),
        data={"alert_policies": alerts},
        source=f"projects/{project_id}/alertPolicies",
    ))

    return evidence
```

## Step 6: Schedule Automated Collection

Run evidence collection on a regular schedule so you always have fresh data for auditors.

```bash
# Deploy the evidence collector as a Cloud Function
gcloud functions deploy collect-audit-evidence \
  --runtime=python311 \
  --trigger-topic=collect-evidence \
  --entry-point=main \
  --timeout=540 \
  --memory=512MB \
  --region=us-central1

# Schedule daily evidence collection
gcloud scheduler jobs create pubsub daily-evidence-collection \
  --schedule="0 3 * * *" \
  --topic=collect-evidence \
  --message-body='{"scope": "full"}' \
  --location=us-central1
```

Automating evidence collection transforms audit season from a dreaded scramble into a routine process. Instead of spending weeks pulling data manually, you point the auditor at a structured, timestamped collection of evidence that was gathered automatically. The initial investment in building the collectors pays for itself after the first audit cycle.
