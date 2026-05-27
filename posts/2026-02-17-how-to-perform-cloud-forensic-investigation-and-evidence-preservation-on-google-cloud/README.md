# How to Perform Cloud Forensic Investigation and Evidence Preservation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Forensics, Incident Response, Evidence Preservation, Security

Description: A practical guide to performing forensic investigations on Google Cloud, covering evidence collection, disk imaging, log preservation, and chain of custody procedures.

---

When a security incident happens in the cloud, the clock starts ticking. You need to figure out what happened, how it happened, and what was affected - all while preserving evidence that might be needed for legal proceedings or regulatory reporting. Cloud forensics is different from traditional forensics because the infrastructure is ephemeral, shared, and controlled by a third party.

This guide covers the practical steps for conducting a forensic investigation on Google Cloud, from initial response through evidence preservation and analysis.

## The Cloud Forensics Challenge

Traditional forensics involves physically seizing hardware and imaging drives. In the cloud, you cannot do that. Instead, you work with disk snapshots, audit logs, network flow logs, and API access records. The good news is that cloud environments generate more telemetry than physical infrastructure. The bad news is that evidence can disappear quickly if VMs get deleted or logs expire.

## Step 1: Initial Response - Isolate and Preserve

When you suspect a compromise, the first priority is to isolate the affected resources without destroying evidence.

```bash
# Step 1a: Snapshot the boot and data disks of the affected VM

# Do this BEFORE any other action to capture the current state
gcloud compute disks snapshot compromised-vm-boot \
  --project=PROJECT_ID \
  --zone=us-central1-a \
  --snapshot-names=forensic-boot-$(date +%Y%m%d-%H%M%S) \
  --description="Forensic snapshot - incident INC-2026-001"

gcloud compute disks snapshot compromised-vm-data \
  --project=PROJECT_ID \
  --zone=us-central1-a \
  --snapshot-names=forensic-data-$(date +%Y%m%d-%H%M%S) \
  --description="Forensic snapshot - incident INC-2026-001"

# Step 1b: Isolate the VM by replacing its network tags
gcloud compute instances remove-tags compromised-vm \
  --zone=us-central1-a \
  --all

# Add the isolation tag to the VM
gcloud compute instances add-tags compromised-vm \
  --zone=us-central1-a \
  --tags=forensic-isolated

# Create isolated firewall rules that block ingress and egress
gcloud compute firewall-rules create forensic-isolate-ingress \
  --network=default \
  --action=DENY \
  --direction=INGRESS \
  --rules=all \
  --target-tags=forensic-isolated \
  --priority=0

gcloud compute firewall-rules create forensic-isolate-egress \
  --network=default \
  --action=DENY \
  --direction=EGRESS \
  --rules=all \
  --target-tags=forensic-isolated \
  --priority=0
```

## Step 2: Preserve Cloud Audit Logs

Audit logs are your most important evidence source in the cloud. Export them immediately before any retention period expires.

```bash
# Export available audit logs for the affected project
# Data Access logs must already be enabled for most services
gcloud logging read '
  (log_id("cloudaudit.googleapis.com/activity") OR
   log_id("cloudaudit.googleapis.com/data_access") OR
   log_id("cloudaudit.googleapis.com/system_event") OR
   log_id("cloudaudit.googleapis.com/policy"))
  AND timestamp>="2026-02-10T00:00:00Z"
  AND timestamp<="2026-02-17T23:59:59Z"
' --project=PROJECT_ID \
  --format=json \
  --order=asc \
  > forensic-audit-logs-$(date +%Y%m%d).json

# Export VPC Flow Logs for network analysis
gcloud logging read '
  resource.type="gce_subnetwork"
  AND log_id("compute.googleapis.com/vpc_flows")
  AND timestamp>="2026-02-10T00:00:00Z"
' --project=PROJECT_ID \
  --format=json \
  > forensic-vpc-flows-$(date +%Y%m%d).json

# Create a long-term log sink to prevent future log loss
gcloud logging sinks create forensic-preservation \
  storage.googleapis.com/forensic-evidence-bucket \
  --project=PROJECT_ID \
  --log-filter='log_id("cloudaudit.googleapis.com/activity") OR log_id("cloudaudit.googleapis.com/data_access") OR log_id("cloudaudit.googleapis.com/system_event") OR log_id("cloudaudit.googleapis.com/policy")'
```

## Step 3: Create a Forensic Analysis Environment

Set up a dedicated project for forensic analysis, completely separate from the compromised environment.

```bash
# Create a forensic analysis project
gcloud projects create forensic-analysis-$(date +%Y%m%d) \
  --name="Forensic Analysis - INC-2026-001" \
  --folder=SECURITY_FOLDER_ID

# Enable required APIs
gcloud services enable compute.googleapis.com \
  --project=forensic-analysis-20260217

# Create a disk from the snapshot in the forensic project
gcloud compute disks create analysis-disk \
  --source-snapshot=projects/PROJECT_ID/global/snapshots/forensic-boot-20260217-143022 \
  --zone=us-central1-a \
  --project=forensic-analysis-20260217

# Create an analysis VM and attach the forensic disk as secondary
gcloud compute instances create forensic-workstation \
  --zone=us-central1-a \
  --project=forensic-analysis-20260217 \
  --machine-type=n2-standard-4 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --disk="name=analysis-disk,device-name=evidence,mode=ro,auto-delete=no"
```

## Step 4: Automated Evidence Collection

Build a script that collects all relevant evidence systematically.

```python
import json
import hashlib
import datetime
from google.cloud import compute_v1
from google.cloud import logging_v2
from google.cloud import storage
from google.protobuf.json_format import MessageToDict

class ForensicCollector:
    """Automated forensic evidence collection for GCP incidents."""

    def __init__(self, project_id, incident_id, evidence_bucket):
        self.project_id = project_id
        self.incident_id = incident_id
        self.evidence_bucket = evidence_bucket
        self.storage_client = storage.Client()
        self.evidence_log = []

    def collect_all(self, start_time, end_time):
        """Run all evidence collection procedures."""
        self.collect_iam_snapshot()
        self.collect_audit_logs(start_time, end_time)
        self.collect_instance_metadata()
        self.collect_network_config()
        self.collect_service_account_activity(start_time, end_time)
        self.save_evidence_manifest()

    def collect_iam_snapshot(self):
        """Capture current IAM policy state."""
        from google.cloud import resourcemanager_v3
        client = resourcemanager_v3.ProjectsClient()

        policy = client.get_iam_policy(
            request={"resource": f"projects/{self.project_id}"}
        )

        # Serialize the IAM policy
        policy_data = {
            "bindings": [
                {
                    "role": b.role,
                    "members": list(b.members),
                    "condition": str(b.condition) if b.condition else None,
                }
                for b in policy.bindings
            ],
            "etag": policy.etag.decode() if isinstance(policy.etag, bytes) else policy.etag,
        }

        self._save_evidence("iam_policy.json", policy_data)

    def collect_audit_logs(self, start_time, end_time):
        """Collect all audit logs for the incident window."""
        client = logging_v2.Client(project=self.project_id)

        filter_str = (
            f'timestamp>="{start_time}" AND timestamp<="{end_time}" AND '
            f'(log_id("cloudaudit.googleapis.com/activity") OR '
            f'log_id("cloudaudit.googleapis.com/data_access") OR '
            f'log_id("cloudaudit.googleapis.com/system_event") OR '
            f'log_id("cloudaudit.googleapis.com/policy"))'
        )

        entries = []
        for entry in client.list_entries(filter_=filter_str, order_by="timestamp asc"):
            entries.append({
                "timestamp": str(entry.timestamp),
                "severity": entry.severity,
                "log_name": entry.log_name,
                "payload": self._payload_to_dict(entry.payload),
            })

        self._save_evidence("audit_logs.json", entries)

    def collect_instance_metadata(self):
        """Capture metadata for all compute instances."""
        client = compute_v1.InstancesClient()
        instances = []

        for zone in self._list_zones():
            try:
                for instance in client.list(
                    project=self.project_id, zone=zone
                ):
                    instances.append({
                        "name": instance.name,
                        "zone": zone,
                        "status": instance.status,
                        "creation_timestamp": instance.creation_timestamp,
                        "machine_type": instance.machine_type,
                        "network_interfaces": [
                            {
                                "network": ni.network,
                                "internal_ip": ni.network_i_p,
                                "external_ip": (
                                    ni.access_configs[0].nat_i_p
                                    if ni.access_configs else None
                                ),
                            }
                            for ni in instance.network_interfaces
                        ],
                        "service_accounts": [
                            sa.email for sa in instance.service_accounts
                        ] if instance.service_accounts else [],
                        "labels": dict(instance.labels) if instance.labels else {},
                        "metadata": self._extract_metadata(instance.metadata),
                    })
            except Exception:
                pass

        self._save_evidence("compute_instances.json", instances)

    def collect_network_config(self):
        """Capture VPC network and firewall rule configuration."""
        networks_client = compute_v1.NetworksClient()
        firewalls_client = compute_v1.FirewallsClient()

        networks = [
            {
                "name": network.name,
                "self_link": network.self_link,
                "auto_create_subnetworks": network.auto_create_subnetworks,
                "routing_mode": network.routing_config.routing_mode
                    if network.routing_config else None,
            }
            for network in networks_client.list(project=self.project_id)
        ]

        firewall_rules = [
            {
                "name": rule.name,
                "network": rule.network,
                "direction": rule.direction,
                "priority": rule.priority,
                "disabled": rule.disabled,
                "source_ranges": list(rule.source_ranges),
                "destination_ranges": list(rule.destination_ranges),
                "target_tags": list(rule.target_tags),
                "allowed": [
                    {"protocol": a.I_p_protocol, "ports": list(a.ports)}
                    for a in rule.allowed
                ],
                "denied": [
                    {"protocol": d.I_p_protocol, "ports": list(d.ports)}
                    for d in rule.denied
                ],
            }
            for rule in firewalls_client.list(project=self.project_id)
        ]

        self._save_evidence("network_config.json", {
            "networks": networks,
            "firewall_rules": firewall_rules,
        })

    def collect_service_account_activity(self, start_time, end_time):
        """Collect activity for all service accounts in the project."""
        client = logging_v2.Client(project=self.project_id)

        filter_str = (
            f'timestamp>="{start_time}" AND timestamp<="{end_time}" AND '
            f'protoPayload.authenticationInfo.principalEmail:"gserviceaccount.com"'
        )

        activities = []
        for entry in client.list_entries(filter_=filter_str, order_by="timestamp asc"):
            payload = self._payload_to_dict(entry.payload)
            activities.append({
                "timestamp": str(entry.timestamp),
                "principal": payload.get("authenticationInfo", {}).get(
                    "principalEmail", "unknown"
                ),
                "method": payload.get("methodName", "unknown"),
                "resource": payload.get("resourceName", "unknown"),
            })

        self._save_evidence("service_account_activity.json", activities)

    def _list_zones(self):
        """List zone names in the project."""
        client = compute_v1.ZonesClient()
        return [zone.name for zone in client.list(project=self.project_id)]

    def _extract_metadata(self, metadata):
        """Convert instance metadata items into a dictionary."""
        if not metadata or not metadata.items:
            return {}

        return {item.key: item.value for item in metadata.items}

    def _payload_to_dict(self, payload):
        """Convert Cloud Logging payloads to JSON-serializable dictionaries."""
        if isinstance(payload, dict):
            return payload

        if hasattr(payload, "DESCRIPTOR"):
            return MessageToDict(payload, preserving_proto_field_name=True)

        return {"text": str(payload)}

    def _save_evidence(self, filename, data):
        """Save evidence to GCS with integrity hash."""
        content = json.dumps(data, indent=2, default=str)
        content_hash = hashlib.sha256(content.encode()).hexdigest()

        bucket = self.storage_client.bucket(self.evidence_bucket)
        blob_name = f"{self.incident_id}/{filename}"
        blob = bucket.blob(blob_name)
        blob.upload_from_string(content, content_type="application/json")

        self.evidence_log.append({
            "filename": filename,
            "sha256": content_hash,
            "collected_at": datetime.datetime.now(
                datetime.timezone.utc
            ).isoformat(),
            "gcs_path": f"gs://{self.evidence_bucket}/{blob_name}",
        })

    def save_evidence_manifest(self):
        """Save the evidence manifest with all hashes."""
        self._save_evidence("MANIFEST.json", self.evidence_log)
```

## Step 5: Timeline Analysis

Build a timeline of events to understand the attack sequence.

```python
def build_incident_timeline(audit_logs):
    """Build a chronological timeline from audit log entries."""
    timeline = []

    for entry in sorted(audit_logs, key=lambda x: x["timestamp"]):
        payload = entry.get("payload", {})

        event = {
            "time": entry["timestamp"],
            "actor": payload.get("authenticationInfo", {}).get(
                "principalEmail", "unknown"
            ),
            "action": payload.get("methodName", "unknown"),
            "resource": payload.get("resourceName", "unknown"),
            "source_ip": payload.get("requestMetadata", {}).get(
                "callerIp", "unknown"
            ),
            "status": "success" if not payload.get("status") else "failed",
        }

        timeline.append(event)

    return timeline
```

## Chain of Custody

Every piece of evidence needs a documented chain of custody. The SHA-256 hashes in the evidence manifest help verify that evidence has not been tampered with after collection. Store the manifest separately from the evidence, ideally in a bucket with a locked retention policy.

```bash
# Create a write-once evidence bucket
gcloud storage buckets create gs://forensic-evidence-INC-2026-001 \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --retention-period=31536000 \
  --default-storage-class=ARCHIVE

# Locking a retention policy is irreversible
gcloud storage buckets update gs://forensic-evidence-INC-2026-001 \
  --lock-retention-period
```

Cloud forensics requires speed, thoroughness, and meticulous documentation. The automated collection scripts save time during the critical early hours of an incident, while the integrity hashes and evidence manifests ensure that what you collected can stand up to legal scrutiny. Build these tools before you need them - during an active incident is the worst time to be writing scripts.
