# How to Set Up Splunk SOAR with Google Cloud Security Command Center Findings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Splunk SOAR, Security Command Center, Security Automation, Google Cloud, SIEM

Description: Configure Splunk SOAR to automatically ingest and respond to Google Cloud Security Command Center findings for automated security incident response.

---

Security teams are drowning in alerts. Google Cloud Security Command Center (SCC) generates findings for vulnerabilities, misconfigurations, and threats across your GCP environment, but without automation, those findings sit in a queue waiting for someone to manually triage each one. Splunk SOAR (formerly Phantom) changes this by letting you build automated playbooks that respond to security findings in seconds rather than hours.

This guide covers integrating Splunk SOAR with Google Cloud SCC so that findings automatically trigger investigation and response workflows.

## What Security Command Center Provides

Google Cloud SCC aggregates security findings from multiple sources: Security Health Analytics for misconfigurations, Web Security Scanner for web vulnerabilities, Event Threat Detection for runtime threats, and Container Threat Detection for GKE-specific issues.

Each finding includes a severity level, the affected resource, a description of the issue, and recommended remediation steps. The integration with Splunk SOAR lets you automate the triage and response for these findings based on your security policies.

## Architecture

The integration works through a pipeline. SCC generates findings and publishes notifications to a Pub/Sub topic. The Google SCC Add-on for Splunk reads the Pub/Sub subscription into Splunk, and Splunk App for SOAR Export forwards the resulting notable events or alerts to Splunk SOAR as containers. Playbooks then run automatically based on the finding type and severity.

```mermaid
graph LR
    A[Security Command Center] -->|Notifications| B[Pub/Sub Topic]
    B --> C[Pub/Sub Subscription]
    C --> D[Splunk Platform]
    D --> E[Splunk SOAR]
    E --> F[Automated Playbooks]
    F --> G[Response Actions]
    G -->|Remediate| H[GCP Resources]
```

## GCP-Side Configuration

### Enable SCC Notifications

First, set up SCC to publish finding notifications to Pub/Sub.

```bash
# Create a Pub/Sub topic for SCC notifications

gcloud pubsub topics create scc-findings-topic \
  --project=my-project

# Create a notification config that sends all high and critical findings to the topic
gcloud scc notifications create scc-to-splunk-soar \
  --organization=123456789 \
  --location=global \
  --pubsub-topic=projects/my-project/topics/scc-findings-topic \
  --filter='severity="HIGH" OR severity="CRITICAL"'

# Create a subscription for Splunk to pull from
gcloud pubsub subscriptions create scc-soar-subscription \
  --topic=scc-findings-topic \
  --ack-deadline=120 \
  --message-retention-duration=7d \
  --project=my-project
```

### Create a Service Account for Splunk and SOAR

Splunk needs a service account with permissions to read SCC findings, and Splunk SOAR action assets need permissions for any remediation actions that your playbooks perform.

```bash
# Create the service account
gcloud iam service-accounts create splunk-soar-scc \
  --display-name="Splunk SOAR SCC Integration" \
  --project=my-project

# Grant Security Center findings viewer at org level
gcloud organizations add-iam-policy-binding 123456789 \
  --member="serviceAccount:splunk-soar-scc@my-project.iam.gserviceaccount.com" \
  --role="roles/securitycenter.findingsViewer"

# Grant Pub/Sub subscriber for pulling notifications
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:splunk-soar-scc@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"

# Grant permissions needed for common remediation actions
# Adjust these based on what your playbooks need to do
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:splunk-soar-scc@my-project.iam.gserviceaccount.com" \
  --role="roles/compute.securityAdmin"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:splunk-soar-scc@my-project.iam.gserviceaccount.com" \
  --role="roles/iam.securityReviewer"

# Generate the key file
gcloud iam service-accounts keys create soar-scc-key.json \
  --iam-account=splunk-soar-scc@my-project.iam.gserviceaccount.com
```

## Configuring Splunk and SOAR Apps

In Splunk, install the Google SCC Add-on for Splunk and the Google SCC App for Splunk. In Splunk SOAR, install the Google Cloud Compute Engine and Google Cloud IAM apps for response actions, and configure Splunk App for SOAR Export to send selected SCC events into SOAR.

### Splunk Configuration

Create a Google SCC account in the Splunk add-on with the following settings:

- Configuration:
  - Service Account JSON: Upload the key file, or use workload identity federation if your deployment supports it
  - Organization: Your GCP organization ID

Create a findings input with the following settings:

- Input name: `gcp_scc_findings`
- Interval: `60`
- Index: The Splunk index that should store SCC findings
- Findings Subscription Id: `scc-soar-subscription`
- Maximum Fetching: `50`

### Ingestion Settings

Configure a Splunk saved search or notable event rule to send high-priority SCC findings to SOAR with Splunk App for SOAR Export. Map the SCC fields you need into CEF fields on the SOAR artifact.

```json
{
  "container_label": "gcp_security",
  "severity_mapping": {
    "CRITICAL": "high",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low"
  },
  "artifact_fields": [
    "finding.category",
    "finding.resourceName",
    "finding.sourceProperties",
    "finding.severity",
    "finding.state"
  ]
}
```

## Building Automated Playbooks

The real value of SOAR comes from playbooks that automate your response procedures. Here are examples for common SCC findings.

### Playbook: Escalate Public Firewall Rules

When SCC detects a firewall rule that allows unrestricted access (0.0.0.0/0), this playbook can raise the case severity and create a remediation ticket.

```python
# playbook_escalate_public_firewall.py
# Escalates overly permissive firewall rules detected by SCC

import phantom.rules as phantom

def escalate_firewall_rule(action=None, success=None, container=None, results=None, handle=None, filtered_artifacts=None, filtered_results=None, custom_function=None, **kwargs):
    """Main playbook function for firewall rule escalation."""

    # Get the finding details from the container artifacts
    artifacts = phantom.collect2(
        container=container,
        datapath=["artifact:*.cef.resourceName", "artifact:*.cef.category"]
    )

    for artifact_data in artifacts:
        resource_name = artifact_data[0]
        category = artifact_data[1]

        if category != "FIREWALL_RULE_OPEN_TO_PUBLIC":
            continue

        # Extract project and rule name from the resource path.
        # Format: //compute.googleapis.com/projects/PROJECT/global/firewalls/RULE_NAME
        parts = resource_name.split("/")
        project = parts[4]
        rule_name = parts[-1]

        phantom.set_severity(container=container, severity="high")
        phantom.comment(
            container=container,
            comment=f"SCC reported public firewall rule {rule_name} in project {project}."
        )

        phantom.act(
            "create ticket",
            parameters=[{
                "summary": f"SCC Finding: Public firewall rule - {rule_name}",
                "description": f"Restrict source ranges for {resource_name}.",
                "priority": "High",
                "project_key": "SEC"
            }],
            assets=["jira"],
            callback=post_remediation_notify
        )

def post_remediation_notify(action=None, success=None, container=None, results=None, **kwargs):
    """Send notification after escalation."""
    if success:
        phantom.comment(container=container, comment="Remediation ticket created for public firewall rule.")
    else:
        phantom.set_severity(container=container, severity="high")
        phantom.comment(container=container, comment="Ticket creation failed. Manual intervention required.")
```

### Playbook: Investigate Service Account Key Findings

When SCC detects an old or leaked service account key, this playbook gathers context and creates a ticket.

```python
# playbook_investigate_sa_key.py
# Investigates service account key findings and creates investigation tickets

import phantom.rules as phantom

def investigate_sa_key(action=None, success=None, container=None, results=None, **kwargs):
    """Gather context about a service account key finding."""

    artifacts = phantom.collect2(
        container=container,
        datapath=["artifact:*.cef.resourceName", "artifact:*.cef.sourceProperties"]
    )

    for artifact_data in artifacts:
        resource_name = artifact_data[0]
        source_props = artifact_data[1]
        account = source_props.get("serviceAccountEmail") if isinstance(source_props, dict) else None

        if not account and "/serviceAccounts/" in resource_name:
            account = resource_name.split("/serviceAccounts/", 1)[1].split("/", 1)[0]

        if not account:
            phantom.comment(container=container, comment=f"Could not extract service account email from {resource_name}.")
            continue

        # Get the service account details
        phantom.act(
            "get serviceaccount",
            parameters=[{"account": account}],
            assets=["gcp_iam"],
            callback=enrich_with_iam_info
        )

def enrich_with_iam_info(action=None, success=None, container=None, results=None, **kwargs):
    """Add IAM policy information and create a Jira ticket."""
    if success:
        sa_info = results[0]["data"][0]
        # Create investigation ticket with all gathered context
        phantom.act(
            "create ticket",
            parameters=[{
                "summary": f"SCC Finding: Service Account Key Investigation - {sa_info['email']}",
                "description": f"Security Command Center detected an issue with SA: {sa_info['email']}",
                "priority": "High",
                "project_key": "SEC"
            }],
            assets=["jira"]
        )
```

## Testing the Integration

Generate a test finding in SCC and verify it flows through to SOAR.

```bash
# Create a test finding in Security Command Center
gcloud scc findings create test-finding-001 \
  --organization=123456789 \
  --location=global \
  --source=SOURCE_ID \
  --state=ACTIVE \
  --category="TEST_FINDING" \
  --event-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --resource-name="//compute.googleapis.com/projects/my-project/global/firewalls/test-rule"
```

Check Splunk SOAR to see if a new container was created for the finding. Verify that the playbook triggered and the expected actions ran.

## Operational Considerations

Keep your playbook permissions scoped tightly. The service account should only have the permissions needed for the specific remediation actions your playbooks perform. Avoid granting broad admin roles.

Monitor the Pub/Sub subscription lag. If the Splunk input falls behind, findings pile up and your response time degrades. Set up an alert in Cloud Monitoring for the subscription backlog.

```bash
# Create an alert for Pub/Sub subscription backlog
gcloud monitoring policies create \
  --display-name="SOAR Subscription Backlog" \
  --condition-display-name="High unacked messages" \
  --condition-filter='resource.type="pubsub_subscription" AND resource.labels.subscription_id="scc-soar-subscription" AND metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages"' \
  --duration=300s \
  --if='> 100'
```

Start with low-risk playbooks that gather information and create tickets. Once you trust the automation, gradually add remediation actions. The combination of SCC's detection capabilities and SOAR's automation gives you a security operations workflow that scales without scaling your team linearly.
