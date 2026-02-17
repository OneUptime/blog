# How to Set Up Event Threat Detection in Security Command Center

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security Command Center, Event Threat Detection, Cloud Security, Threat Detection

Description: Learn how to enable and configure Event Threat Detection in Security Command Center to automatically detect threats like cryptomining, malware, and unauthorized access in GCP.

---

Security Health Analytics catches misconfigurations, but what about active threats? That is where Event Threat Detection (ETD) comes in. ETD is a Security Command Center Premium feature that analyzes your Cloud Audit Logs, VPC Flow Logs, and Cloud DNS logs in real time to detect suspicious activity.

Think of it this way: Security Health Analytics tells you your door is unlocked, while Event Threat Detection tells you someone just walked through it.

ETD can detect threats like cryptocurrency mining, malware communication, brute force attacks, data exfiltration, and suspicious IAM activity. It runs automatically once enabled and requires no agents or custom rules.

## What Event Threat Detection Catches

ETD uses Google's threat intelligence and behavioral analysis to detect:

- **Cryptomining** - Detects known mining pool connections and suspicious compute patterns
- **Malware** - Identifies communication with known command-and-control servers
- **Data exfiltration** - Spots unusually large data transfers to external destinations
- **Brute force SSH** - Detects repeated failed SSH login attempts
- **IAM anomalies** - Flags unusual permission grants, service account key creation patterns
- **Suspicious API usage** - Identifies API calls that match known attack patterns
- **DNS exfiltration** - Catches data being tunneled out via DNS queries

## Prerequisites

- Security Command Center Premium tier (ETD is not available in Standard)
- Cloud Audit Logging enabled for Admin Activity and Data Access logs
- VPC Flow Logs enabled on subnets you want to monitor
- Cloud DNS logging enabled

## Step 1: Enable Event Threat Detection

ETD should be enabled by default with SCC Premium, but verify it.

```bash
# Check ETD service status
gcloud scc settings services describe etd \
  --organization=ORGANIZATION_ID
```

If it is not enabled, enable it through the Console: Security Command Center > Settings > Services > Event Threat Detection > Enable.

## Step 2: Ensure Log Sources Are Configured

ETD needs logs to analyze. Make sure the right log types are enabled.

Enable Cloud Audit Logs for all services:

```bash
# Get the current project IAM policy
gcloud projects get-iam-policy my-project-id --format=json > policy.json
```

Make sure the audit config includes Data Access logs:

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

```bash
# Apply the policy
gcloud projects set-iam-policy my-project-id policy.json
```

Enable VPC Flow Logs:

```bash
# Enable flow logs on your subnets
gcloud compute networks subnets update my-subnet \
  --region=us-central1 \
  --enable-flow-logs \
  --logging-aggregation-interval=interval-5-sec \
  --logging-flow-sampling=1.0 \
  --project=my-project-id
```

Enable Cloud DNS logging:

```bash
# Enable DNS logging on your DNS policy
gcloud dns policies create dns-logging-policy \
  --networks=my-vpc \
  --enable-logging \
  --description="Enable DNS logging for ETD" \
  --project=my-project-id
```

## Step 3: View ETD Findings

Once ETD is running, findings appear in SCC alongside other finding types.

```bash
# List all ETD findings
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/ETD_SOURCE_ID \
  --filter='state="ACTIVE"' \
  --format="table(finding.category, finding.severity, finding.resourceName, finding.eventTime)"
```

To find the ETD source ID:

```bash
# List sources and look for Event Threat Detection
gcloud scc sources list ORGANIZATION_ID \
  --format="table(name, displayName)"
```

## Step 4: Understand ETD Finding Categories

Here are the key finding categories and what they mean:

**Cryptomining-related findings:**

| Category | Description |
|---|---|
| CRYPTOMINING_POOL_CONNECTION | VM is communicating with a known mining pool |
| CRYPTOMINING_RESOURCE_USAGE | Unusual CPU usage consistent with mining |

**Malware-related findings:**

| Category | Description |
|---|---|
| MALWARE_BAD_DOMAIN | DNS query to a known malicious domain |
| MALWARE_BAD_IP | Network connection to a known malicious IP |
| MALWARE_CRYPTOMINING_BAD_DOMAIN | DNS query to a known mining pool domain |

**IAM-related findings:**

| Category | Description |
|---|---|
| ANOMALOUS_IAM_GRANT | Unusual IAM role grant detected |
| EXTERNAL_MEMBER_ADDED | External user added to project |
| SERVICE_ACCOUNT_KEY_CREATED | Service account key created (potential persistence) |

**Network-related findings:**

| Category | Description |
|---|---|
| SSH_BRUTE_FORCE | Multiple failed SSH attempts |
| OUTGOING_INTRUSION_ATTEMPT | VM attempting to scan or exploit external targets |
| DNS_EXFILTRATION | Data exfiltration via DNS tunneling |

## Step 5: Set Up Notifications for Threats

Unlike misconfigurations that can wait, threat detections need immediate attention. Set up notifications that go directly to your incident response channel.

```bash
# Create a Pub/Sub topic for threat notifications
gcloud pubsub topics create etd-threat-alerts \
  --project=my-project-id

# Create a notification config for all ETD findings
gcloud scc notifications create etd-alerts \
  --organization=ORGANIZATION_ID \
  --pubsub-topic=projects/my-project-id/topics/etd-threat-alerts \
  --filter='state="ACTIVE" AND (category="CRYPTOMINING_POOL_CONNECTION" OR category="MALWARE_BAD_DOMAIN" OR category="MALWARE_BAD_IP" OR category="SSH_BRUTE_FORCE")'
```

## Step 6: Build an Automated Response

For certain threat types, you want automated responses. Here is a Cloud Function that automatically disables a compromised service account.

```python
import base64
import json
from google.cloud import iam_admin_v1

def respond_to_threat(event, context):
    """Automatically respond to certain ETD findings."""

    # Parse the Pub/Sub message
    raw = base64.b64decode(event['data']).decode('utf-8')
    message = json.loads(raw)
    finding = message.get('finding', {})

    category = finding.get('category', '')
    resource = finding.get('resourceName', '')

    # If a service account key was created suspiciously, disable the account
    if category == 'SERVICE_ACCOUNT_SELF_INVESTIGATION':
        disable_service_account(resource)

    # If cryptomining is detected, stop the VM
    if category == 'CRYPTOMINING_POOL_CONNECTION':
        stop_compromised_vm(resource)

def disable_service_account(resource_name):
    """Disable a potentially compromised service account."""
    client = iam_admin_v1.IAMClient()

    # Extract the service account email from the resource name
    sa_email = resource_name.split('/')[-1]

    request = iam_admin_v1.DisableServiceAccountRequest(
        name=f"projects/-/serviceAccounts/{sa_email}"
    )
    client.disable_service_account(request=request)
    print(f"Disabled service account: {sa_email}")

def stop_compromised_vm(resource_name):
    """Stop a VM that shows signs of compromise."""
    from google.cloud import compute_v1

    # Parse project, zone, and instance from resource name
    parts = resource_name.split('/')
    project = parts[parts.index('projects') + 1]
    zone = parts[parts.index('zones') + 1]
    instance = parts[parts.index('instances') + 1]

    # Stop the instance
    client = compute_v1.InstancesClient()
    client.stop(project=project, zone=zone, instance=instance)
    print(f"Stopped VM: {instance} in {zone}")
```

## Step 7: Investigate Findings

When ETD flags something, you need to investigate. The finding includes context to help:

```bash
# Get detailed information about a specific ETD finding
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/ETD_SOURCE_ID \
  --filter='finding.name="organizations/ORG_ID/sources/SOURCE_ID/findings/FINDING_ID"' \
  --format=json
```

The `sourceProperties` field contains investigation-relevant details like:

- IP addresses involved in the suspicious activity
- DNS domains being queried
- The specific API calls that triggered the detection
- User or service account identities involved

## Step 8: Tune False Positives

If ETD flags legitimate activity, use mute rules to suppress the noise.

```bash
# Mute findings for a specific VM that legitimately connects to crypto-related IPs
gcloud scc muteconfigs create legitimate-crypto-service \
  --organization=ORGANIZATION_ID \
  --filter='category="CRYPTOMINING_POOL_CONNECTION" AND resource.name="//compute.googleapis.com/projects/my-project/zones/us-central1-a/instances/blockchain-node"' \
  --description="This VM runs a legitimate blockchain node"
```

Be very careful with mute rules on threat detections. Only mute after thorough investigation confirms the activity is legitimate.

## Monitoring ETD Health

Make sure ETD has the log data it needs by checking log ingestion.

```bash
# Verify Cloud Audit Logs are being generated
gcloud logging read "logName:cloudaudit.googleapis.com" \
  --limit=5 \
  --format="table(timestamp, resource.type, protoPayload.methodName)" \
  --project=my-project-id
```

## Conclusion

Event Threat Detection transforms Security Command Center from a posture assessment tool into an active threat detection platform. Once enabled and properly fed with logs, it runs silently in the background analyzing billions of log events and only surfaces findings when something genuinely suspicious happens. The key is to make sure your logs are comprehensive (audit logs, flow logs, DNS logs), set up notifications for immediate alerting, and have automated response playbooks ready for the most critical threat categories.
