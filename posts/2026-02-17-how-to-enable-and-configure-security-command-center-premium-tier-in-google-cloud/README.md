# How to Enable and Configure Security Command Center Premium Tier in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security Command Center, Security, Compliance, Cloud Security

Description: A step-by-step guide to enabling and configuring Security Command Center Premium tier in Google Cloud for comprehensive security posture management and threat detection.

---

Security Command Center (SCC) is Google Cloud's built-in security and risk management platform. It gives you visibility into your cloud assets, identifies misconfigurations, detects threats, and helps you maintain compliance. While the Standard tier offers basic security features at no cost, the Premium tier unlocks advanced capabilities like continuous vulnerability scanning, threat detection with Event Threat Detection and Container Threat Detection, and compliance reporting against standards like CIS Benchmarks and PCI DSS.

In this post, I will walk through enabling and configuring SCC Premium, including the initial setup, enabling detectors, configuring notifications, and setting up the features that make Premium worth the investment.

## Standard vs. Premium Tier

Before you enable Premium, understand what you get beyond Standard.

| Feature | Standard | Premium |
|---------|----------|---------|
| Security Health Analytics | Basic findings | Full set of findings |
| Event Threat Detection | Not available | Available |
| Container Threat Detection | Not available | Available |
| Virtual Machine Threat Detection | Not available | Available |
| Web Security Scanner | Basic scans | Managed and custom scans |
| Compliance reporting | Not available | CIS, PCI DSS, NIST, ISO 27001 |
| Continuous exports | Limited | Full Pub/Sub and BigQuery exports |
| Mute rules | Basic | Advanced with custom filters |

## Prerequisites

You need:
- Organization-level access (SCC operates at the organization level)
- The `securitycenter.admin` role or the `roles/owner` role on the organization
- Billing enabled on the project

## Enabling Security Command Center Premium

### Via the Console

1. Navigate to Security Command Center in the Google Cloud Console
2. If this is your first time, you will see the setup wizard
3. Select "Premium" tier
4. Choose the activation scope (organization-wide or specific projects)
5. Review and accept the pricing
6. Click "Activate"

### Via gcloud CLI

```bash
# Enable the Security Command Center API
gcloud services enable securitycenter.googleapis.com

# Enable SCC Premium at the organization level
gcloud scc settings update \
  --organization=YOUR_ORG_ID \
  --enable-asset-discovery
```

For programmatic setup, you can also use the API.

```bash
# Get your organization ID
gcloud organizations list

# Enable SCC using the API
curl -X PATCH \
  "https://securitycenter.googleapis.com/v1/organizations/YOUR_ORG_ID/organizationSettings" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "enableAssetDiscovery": true
  }'
```

## Configuring Security Health Analytics

Security Health Analytics (SHA) continuously scans your Google Cloud resources for misconfigurations. In Premium, you get the full detector set.

### Viewing Available Detectors

```bash
# List all Security Health Analytics findings
gcloud scc findings list YOUR_ORG_ID \
  --source=organizations/YOUR_ORG_ID/sources/SHA_SOURCE_ID \
  --filter="state=\"ACTIVE\"" \
  --format="table(finding.category, finding.severity, finding.resourceName)" \
  --limit=20
```

### Key Detectors to Watch

Here are the most important SHA findings to pay attention to:

**Critical severity:**
- `PUBLIC_BUCKET_ACL` - Cloud Storage bucket is publicly accessible
- `PUBLIC_DATASET` - BigQuery dataset is publicly accessible
- `OPEN_FIREWALL` - Firewall rule allows traffic from 0.0.0.0/0
- `SERVICE_ACCOUNT_KEY_NOT_ROTATED` - SA key has not been rotated in 90 days

**High severity:**
- `MFA_NOT_ENFORCED` - Multi-factor authentication not enforced for users
- `OVER_PRIVILEGED_SERVICE_ACCOUNT` - SA has excessive permissions
- `SQL_PUBLIC_IP` - Cloud SQL instance has a public IP
- `DEFAULT_SERVICE_ACCOUNT_USED` - Workloads using the default compute SA

## Enabling Event Threat Detection

Event Threat Detection (ETD) analyzes Cloud Audit Logs in real time to detect threats like credential theft, cryptocurrency mining, and data exfiltration.

```bash
# Check ETD status
gcloud scc settings describe \
  --organization=YOUR_ORG_ID

# View ETD findings
gcloud scc findings list YOUR_ORG_ID \
  --source=organizations/YOUR_ORG_ID/sources/ETD_SOURCE_ID \
  --filter="state=\"ACTIVE\"" \
  --format="table(finding.category, finding.severity, finding.eventTime)"
```

ETD detectors include:
- **Credential access**: Detects compromised credentials being used from unusual locations
- **Cryptocurrency mining**: Identifies compute resources used for mining
- **Data exfiltration**: Detects unusual data transfers
- **Malware**: Identifies known malware signatures
- **Brute force**: Detects authentication attack patterns
- **Privilege escalation**: Identifies suspicious IAM changes

## Enabling Container Threat Detection

If you run GKE clusters, Container Threat Detection monitors your containers for runtime threats.

```bash
# Enable Container Threat Detection on a GKE cluster
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --security-posture=standard \
  --workload-vulnerability-scanning=standard
```

Container Threat Detection monitors for:
- Reverse shells
- Unexpected binary execution
- Cryptocurrency mining in containers
- Malicious scripts
- Library loading anomalies

## Configuring Notifications

Set up real-time notifications for new findings using Pub/Sub.

```bash
# Create a Pub/Sub topic for SCC notifications
gcloud pubsub topics create scc-findings-notifications

# Create a notification config that sends all critical and high findings
gcloud scc notifications create critical-findings \
  --organization=YOUR_ORG_ID \
  --pubsub-topic=projects/YOUR_PROJECT/topics/scc-findings-notifications \
  --filter='severity="CRITICAL" OR severity="HIGH"' \
  --description="Notifications for critical and high severity findings"
```

Create a Cloud Function to process the notifications.

```javascript
// scc-notification-handler/index.js
// Processes Security Command Center findings and sends alerts
const functions = require("@google-cloud/functions-framework");

functions.cloudEvent("processSccFinding", async (cloudEvent) => {
  const message = cloudEvent.data.message;
  const findingData = JSON.parse(
    Buffer.from(message.data, "base64").toString("utf-8")
  );

  const finding = findingData.finding;
  const category = finding.category;
  const severity = finding.severity;
  const resource = finding.resourceName;
  const description = finding.description;
  const eventTime = finding.eventTime;

  console.log(`SCC Finding: [${severity}] ${category}`);
  console.log(`Resource: ${resource}`);
  console.log(`Description: ${description}`);

  // Alert based on severity
  if (severity === "CRITICAL") {
    await sendPagerDutyAlert(finding);
  } else if (severity === "HIGH") {
    await sendSlackAlert(finding);
  }
});

async function sendSlackAlert(finding) {
  const webhookUrl = process.env.SLACK_WEBHOOK;
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `Security Finding [${finding.severity}]: ${finding.category}\nResource: ${finding.resourceName}\n${finding.description}`,
    }),
  });
}

async function sendPagerDutyAlert(finding) {
  // Integration with PagerDuty for critical findings
  console.log(`CRITICAL alert for PagerDuty: ${finding.category}`);
}
```

Deploy the notification handler.

```bash
# Deploy the Cloud Function for SCC notifications
gcloud functions deploy scc-finding-handler \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --trigger-topic=scc-findings-notifications \
  --entry-point=processSccFinding \
  --set-env-vars="SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK"
```

## Setting Up Continuous Exports to BigQuery

Export findings to BigQuery for historical analysis and dashboards.

```bash
# Create a BigQuery dataset for SCC data
bq mk --dataset YOUR_PROJECT:scc_findings

# Create a continuous export to BigQuery
gcloud scc bqexports create scc-to-bigquery \
  --organization=YOUR_ORG_ID \
  --dataset=projects/YOUR_PROJECT/datasets/scc_findings \
  --filter='severity="CRITICAL" OR severity="HIGH" OR severity="MEDIUM"' \
  --description="Export all significant findings to BigQuery"
```

Query your findings in BigQuery.

```sql
-- Query to find the most common finding categories in the last 30 days
SELECT
  finding.category,
  finding.severity,
  COUNT(*) as finding_count
FROM `YOUR_PROJECT.scc_findings.findings`
WHERE event_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND finding.state = 'ACTIVE'
GROUP BY finding.category, finding.severity
ORDER BY finding_count DESC
LIMIT 20;
```

## Compliance Monitoring

Premium tier includes compliance reporting against major frameworks.

```bash
# View compliance findings for CIS benchmarks
gcloud scc findings list YOUR_ORG_ID \
  --filter='finding.compliance.standard="cis" AND state="ACTIVE"' \
  --format="table(finding.category, finding.compliance.version, finding.resourceName)" \
  --limit=30
```

Access compliance reports in the Console under Security Command Center > Compliance. You will see dashboards for:
- CIS Google Cloud Foundation Benchmark
- PCI DSS v3.2.1
- NIST 800-53
- ISO 27001

## Granting Team Access

Set up appropriate access for your security team.

```bash
# Grant security analyst view access
gcloud organizations add-iam-policy-binding YOUR_ORG_ID \
  --member="group:security-analysts@your-domain.com" \
  --role="roles/securitycenter.findingsViewer"

# Grant security admin full access
gcloud organizations add-iam-policy-binding YOUR_ORG_ID \
  --member="group:security-admins@your-domain.com" \
  --role="roles/securitycenter.admin"

# Grant findings editor for muting and state changes
gcloud organizations add-iam-policy-binding YOUR_ORG_ID \
  --member="group:security-ops@your-domain.com" \
  --role="roles/securitycenter.findingsEditor"
```

## Wrapping Up

Enabling SCC Premium is one of the highest-value security investments you can make on GCP. The combination of continuous misconfiguration detection (Security Health Analytics), real-time threat detection (Event Threat Detection), container runtime protection (Container Threat Detection), and compliance reporting gives you comprehensive security visibility. Start by enabling the service, review the initial findings to address the most critical issues, set up notifications so you are alerted to new threats, and configure BigQuery exports for long-term analysis. The initial findings review alone often reveals security gaps that justify the investment.
