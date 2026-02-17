# How to Map ISO 27001 Controls to Google Cloud Security Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, ISO 27001, Compliance, Information Security, ISMS, Cloud Security

Description: A practical mapping of ISO 27001 Annex A controls to specific Google Cloud services and configurations for building a compliant information security management system.

---

ISO 27001 is the international standard for information security management systems (ISMS). Unlike prescriptive standards like PCI DSS that tell you exactly what technical controls to implement, ISO 27001 is risk-based - it defines what security objectives to achieve and gives you flexibility in how you achieve them. This makes it both more adaptable and more confusing when mapping to cloud services.

This guide provides a concrete mapping between ISO 27001 Annex A controls (from the 2022 revision) and specific Google Cloud services, so you know exactly which Google Cloud features to configure for each control area.

## ISO 27001:2022 Structure

The 2022 revision reorganizes controls into four themes:

1. **Organizational controls** (37 controls) - policies, roles, threat intelligence
2. **People controls** (8 controls) - screening, training, remote work
3. **Physical controls** (14 controls) - mostly Google's responsibility
4. **Technological controls** (34 controls) - access, encryption, logging, development

For cloud infrastructure, organizational and technological controls are where most of your Google Cloud configuration happens.

## Organizational Controls Mapping

### A.5.1 - Policies for Information Security

Document your security policies and store them where they are accessible and version-controlled.

```bash
# Use a dedicated GCS bucket for security policy documents
gcloud storage buckets create gs://company-security-policies \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --project=security-admin-project

# Enable versioning to track policy changes
gcloud storage buckets update gs://company-security-policies \
  --versioning
```

### A.5.7 - Threat Intelligence

Use Security Command Center to consume and act on threat intelligence.

```bash
# Enable Security Command Center Premium for threat intelligence
gcloud scc settings services enable \
  --organization=123456789 \
  --service=SECURITY_HEALTH_ANALYTICS

gcloud scc settings services enable \
  --organization=123456789 \
  --service=EVENT_THREAT_DETECTION

gcloud scc settings services enable \
  --organization=123456789 \
  --service=CONTAINER_THREAT_DETECTION
```

### A.5.23 - Information Security for Cloud Services

This control specifically addresses cloud service security. Configure organization policies to enforce security baselines.

```bash
# Enforce organization-wide security policies
# Restrict public access to resources
gcloud resource-manager org-policies enable-enforce \
  compute.restrictPublicIp \
  --organization=123456789

# Require OS Login for SSH access
gcloud resource-manager org-policies enable-enforce \
  compute.requireOsLogin \
  --organization=123456789

# Restrict service account key creation
gcloud resource-manager org-policies enable-enforce \
  iam.disableServiceAccountKeyCreation \
  --organization=123456789
```

## Technological Controls Mapping

### A.8.1 - User Endpoint Devices

For users accessing Google Cloud from endpoints, enforce device policies through Access Context Manager.

```bash
# Create an access level requiring managed and encrypted devices
gcloud access-context-manager levels create managed-devices \
  --policy=POLICY_ID \
  --title="Managed Devices Only" \
  --basic-level-spec=managed-device-level.yaml
```

```yaml
# managed-device-level.yaml
conditions:
  - devicePolicy:
      requireScreenlock: true
      allowedEncryptionStatuses:
        - ENCRYPTED
      osConstraints:
        - osType: DESKTOP_CHROME_OS
          minimumVersion: "100.0"
        - osType: DESKTOP_MAC
          minimumVersion: "12.0"
        - osType: DESKTOP_WINDOWS
          minimumVersion: "10.0"
```

### A.8.2 - Privileged Access Rights

Map to Google Cloud's privileged access management.

```bash
# Create custom roles with minimal permissions
gcloud iam roles create minimalDeveloper \
  --organization=123456789 \
  --title="Minimal Developer Role" \
  --description="Developer access with minimal privileges" \
  --permissions="compute.instances.list,compute.instances.get,container.pods.list,container.pods.get,logging.logEntries.list" \
  --stage=GA

# Implement just-in-time access using IAM Conditions
gcloud projects add-iam-policy-binding my-project \
  --member="user:admin@company.com" \
  --role="roles/owner" \
  --condition="expression=request.time < timestamp('2026-02-18T00:00:00Z'),title=temporary-admin,description=Temporary admin access for maintenance"
```

### A.8.3 - Information Access Restriction

Use VPC Service Controls and IAM to restrict information access.

```bash
# Create VPC Service Controls perimeter for sensitive data
gcloud access-context-manager perimeters create sensitive-data \
  --policy=POLICY_ID \
  --title="Sensitive Data Perimeter" \
  --resources="projects/$(gcloud projects describe sensitive-project --format='value(projectNumber)')" \
  --restricted-services="bigquery.googleapis.com,storage.googleapis.com" \
  --access-levels="accessPolicies/POLICY_ID/accessLevels/managed-devices"
```

### A.8.5 - Secure Authentication

Configure strong authentication across the organization.

```bash
# Enforce 2-step verification via Google Admin Console
# Programmatic check via Directory API

# Configure workforce identity with MFA requirements
gcloud iam workforce-pools providers update-oidc my-provider \
  --workforce-pool=my-pool \
  --location=global \
  --attribute-condition="assertion.amr.exists(x, x == 'mfa')"
```

### A.8.9 - Configuration Management

Track and enforce configuration standards using Organization Policies and Config Controller.

```bash
# List all active organization policies
gcloud resource-manager org-policies list --organization=123456789 \
  --format="table(constraint, listPolicy, booleanPolicy)" > evidence/org-policies-status.txt

# Use Config Connector to enforce desired state
# Example: Kubernetes manifest ensuring a firewall rule exists
```

```yaml
# config-connector-firewall.yaml
# Config Connector resource ensuring firewall exists as specified
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeFirewall
metadata:
  name: deny-all-ingress
  namespace: config-control
spec:
  projectRef:
    external: my-project
  network:
    name: default
  priority: 65534
  direction: INGRESS
  denied:
    - protocol: all
  sourceRanges:
    - "0.0.0.0/0"
```

### A.8.12 - Data Leakage Prevention

Use Cloud DLP and VPC Service Controls to prevent data leakage.

```bash
# Create a DLP inspection template for sensitive data
gcloud dlp inspect-templates create \
  --project=my-project \
  --display-name="Sensitive Data Scanner" \
  --inspect-config='{"infoTypes":[{"name":"CREDIT_CARD_NUMBER"},{"name":"US_SOCIAL_SECURITY_NUMBER"},{"name":"EMAIL_ADDRESS"},{"name":"PHONE_NUMBER"}],"minLikelihood":"LIKELY"}'
```

### A.8.15 - Logging

Comprehensive logging is central to ISO 27001 compliance.

```bash
# Enable Data Access audit logs for all services
gcloud projects get-iam-policy my-project --format=json | \
  jq '.auditConfigs = [{"service":"allServices","auditLogConfigs":[{"logType":"ADMIN_READ"},{"logType":"DATA_READ"},{"logType":"DATA_WRITE"}]}]' | \
  gcloud projects set-iam-policy my-project /dev/stdin

# Create centralized log sink for long-term storage
gcloud logging sinks create iso27001-audit-sink \
  bigquery.googleapis.com/projects/audit-project/datasets/iso27001_logs \
  --organization=123456789 \
  --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'
```

### A.8.16 - Monitoring Activities

Set up comprehensive monitoring using Cloud Monitoring and SCC.

```bash
# Create monitoring dashboard for security metrics
gcloud monitoring dashboards create --config-from-file=security-dashboard.json

# Set up alerting for security-relevant events
gcloud monitoring policies create \
  --display-name="Unauthorized API Calls" \
  --condition-display-name="Permission denied events" \
  --condition-filter='metric.type="logging.googleapis.com/user/permission-denied-count"' \
  --condition-threshold-value=10 \
  --condition-threshold-duration=300s \
  --notification-channels=projects/my-project/notificationChannels/CHANNEL_ID
```

### A.8.24 - Use of Cryptography

Document and enforce encryption standards.

```bash
# Enforce CMEK for specific services
gcloud resource-manager org-policies set-policy \
  --organization=123456789 \
  cmek-enforcement.yaml
```

```yaml
# cmek-enforcement.yaml
constraint: constraints/gcp.restrictNonCmekServices
listPolicy:
  deniedValues:
    - storage.googleapis.com
    - bigquery.googleapis.com
    - sqladmin.googleapis.com
```

### A.8.25 - Secure Development

Integrate security into the development lifecycle.

```bash
# Enable Binary Authorization for deployment control
gcloud container binauthz policy export > current-policy.yaml

# Enable Artifact Analysis for vulnerability scanning
gcloud services enable containeranalysis.googleapis.com --project=my-project
gcloud services enable ondemandscanning.googleapis.com --project=my-project
```

## Complete Control Mapping Table

Here is a summary mapping of the most relevant ISO 27001:2022 controls to Google Cloud services:

| ISO 27001 Control | Google Cloud Service |
|-------------------|---------------------|
| A.5.1 Policies | GCS for document storage, org policies |
| A.5.7 Threat Intelligence | SCC, Event Threat Detection |
| A.5.23 Cloud Security | Organization Policies, VPC SC |
| A.8.1 Endpoint Devices | Access Context Manager |
| A.8.2 Privileged Access | IAM, custom roles, conditions |
| A.8.3 Access Restriction | VPC SC, IAM |
| A.8.5 Authentication | MFA, Workforce Identity Federation |
| A.8.9 Config Management | Config Connector, Org Policies |
| A.8.12 DLP | Cloud DLP, VPC SC |
| A.8.15 Logging | Cloud Audit Logs, Cloud Logging |
| A.8.16 Monitoring | Cloud Monitoring, SCC |
| A.8.20 Network Security | VPC, Firewall, Cloud Armor |
| A.8.24 Cryptography | Cloud KMS, CMEK |
| A.8.25 Secure Development | Binary Authorization, Artifact Analysis |
| A.8.28 Secure Coding | Cloud Build, Security Scanning |

## Evidence Generation for Certification Audit

During your ISO 27001 certification audit, you will need to provide evidence for each applicable control. Here is a Terraform configuration that automates evidence export.

```hcl
# Scheduled Cloud Function to export compliance evidence monthly
resource "google_cloud_scheduler_job" "evidence_export" {
  name     = "iso27001-evidence-export"
  schedule = "0 2 1 * *"  # First day of each month at 2 AM
  project  = "security-admin-project"
  region   = "us-central1"

  http_target {
    uri         = google_cloudfunctions_function.evidence_exporter.https_trigger_url
    http_method = "POST"
    body        = base64encode("{\"export_type\": \"iso27001\"}")
  }
}
```

## Continuous Improvement

ISO 27001 requires continuous improvement of the ISMS. Use Google Cloud tools to track security metrics over time.

```sql
-- Track security posture improvement over time using SCC data
SELECT
  DATE(create_time) AS finding_date,
  category,
  severity,
  COUNT(*) AS finding_count
FROM `audit-project.scc_findings.active_findings`
WHERE create_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
GROUP BY finding_date, category, severity
ORDER BY finding_date DESC;
```

ISO 27001 on Google Cloud is achievable with a methodical approach to mapping controls to services. The standard's flexibility means you can leverage Google Cloud's native security features rather than deploying third-party tools for most controls. Focus on the technological controls where your configuration decisions matter most, document your risk-based decisions, and maintain continuous monitoring to demonstrate ongoing compliance.
