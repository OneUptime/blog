# How to Use Security Health Analytics to Detect GCP Misconfigurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Security Health Analytics, Cloud Security, Misconfiguration, Security Command Center

Description: Learn how to use Security Health Analytics in Google Cloud to automatically detect misconfigurations across your GCP resources and fix them before they become incidents.

---

Misconfigurations are the number one cause of cloud security incidents. A firewall rule that is too open, a storage bucket with public access, a service account with excessive permissions - these are the things that lead to breaches. Google Cloud's Security Health Analytics (SHA) is a built-in scanner that continuously checks your GCP resources against a set of known misconfiguration patterns and flags anything that looks wrong.

SHA is part of Security Command Center and runs automatically once enabled. It does not require any agents or special setup on your resources. It just reads your resource metadata and compares it against security best practices.

Let me show you how to get it working and how to make sense of the findings it produces.

## What Security Health Analytics Covers

SHA checks over 140 detector types across GCP services. Here are some of the major categories:

- Compute Engine: Open firewall rules, unencrypted disks, public IP addresses, OS login disabled
- Cloud Storage: Publicly accessible buckets, uniform bucket-level access not enabled
- IAM: Overprivileged service accounts, primitive roles assigned, key rotation issues
- Cloud SQL: Public IPs on databases, SSL not enforced, no automated backups
- GKE: Legacy ABAC enabled, dashboard exposed, node auto-upgrade disabled
- Networking: Default network in use, SSL policies with weak ciphers
- Cloud KMS: Key rotation not configured, overly permissive key access

## Prerequisites

To use SHA, you need:

- Security Command Center enabled at the organization level
- Standard tier (free) gives you a subset of detectors
- Premium tier gives you the full set of 140+ detectors
- The `roles/securitycenter.findingsViewer` role to view findings

## Step 1: Verify SHA Is Enabled

SHA should be enabled by default when you activate SCC, but let us verify.

```bash
# Check the status of Security Health Analytics
gcloud scc settings services describe sha \
  --organization=ORGANIZATION_ID
```

If it is not enabled, you can enable it through the console by going to Security Command Center > Settings > Services and toggling Security Health Analytics on.

## Step 2: List Active Findings

Let us see what SHA has found across your organization.

```bash
# List all active SHA findings
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/SHA_SOURCE_ID \
  --filter='state="ACTIVE"' \
  --format="table(finding.category, finding.severity, finding.resourceName)"
```

To find the SHA source ID:

```bash
# List all sources to find the SHA source ID
gcloud scc sources list ORGANIZATION_ID \
  --format="table(name, displayName)"
```

Look for the source with display name "Security Health Analytics".

## Step 3: Filter by Severity

In a large organization, you might have thousands of findings. Focus on the critical ones first.

```bash
# List only HIGH and CRITICAL severity findings
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/SHA_SOURCE_ID \
  --filter='state="ACTIVE" AND severity="HIGH"' \
  --format="table(finding.category, finding.resourceName, finding.createTime)" \
  --limit=50
```

## Step 4: Understand Common Finding Categories

Here are the findings you are most likely to see and what they mean:

**OPEN_FIREWALL** - A firewall rule allows traffic from 0.0.0.0/0 on unrestricted ports. This is one of the most common and most dangerous findings.

```bash
# Find all open firewall findings
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/SHA_SOURCE_ID \
  --filter='state="ACTIVE" AND category="OPEN_FIREWALL"' \
  --format="table(finding.resourceName, finding.severity)"
```

**PUBLIC_BUCKET_ACL** - A Cloud Storage bucket is accessible to the public internet. Unless you are intentionally serving public content, this should be fixed immediately.

**OVER_PRIVILEGED_SERVICE_ACCOUNT_USER** - A user or service account has roles that grant more permissions than needed. This violates the principle of least privilege.

**MFA_NOT_ENFORCED** - Multi-factor authentication is not required for users in your organization.

**SQL_PUBLIC_IP** - A Cloud SQL instance has a public IP address, making it potentially accessible from the internet.

## Step 5: Get Detailed Finding Information

For any specific finding, you can get the full details including remediation guidance.

```bash
# Get details of a specific finding
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/SHA_SOURCE_ID \
  --filter='finding.name="organizations/ORGANIZATION_ID/sources/SOURCE_ID/findings/FINDING_ID"' \
  --format=json
```

The JSON output includes `sourceProperties` which contains the specific details of the misconfiguration and often a link to the relevant resource.

## Step 6: Mute Findings You Have Accepted

Some findings might be intentional. For example, you might have a public bucket that serves your website assets. You can mute these findings so they do not clutter your view.

```bash
# Create a mute config to suppress specific finding patterns
gcloud scc muteconfigs create accepted-public-buckets \
  --organization=ORGANIZATION_ID \
  --filter='category="PUBLIC_BUCKET_ACL" AND resource.name="//storage.googleapis.com/my-public-website-bucket"' \
  --description="Website bucket is intentionally public"
```

## Step 7: Remediate Common Findings

Here are quick fixes for the most common SHA findings.

Fix an open firewall rule:

```bash
# Restrict a firewall rule to specific source ranges instead of 0.0.0.0/0
gcloud compute firewall-rules update my-open-rule \
  --source-ranges="10.0.0.0/8,172.16.0.0/12" \
  --project=my-project-id
```

Fix a public bucket:

```bash
# Remove public access from a bucket
gcloud storage buckets update gs://my-bucket \
  --no-public-access \
  --project=my-project-id
```

Fix a Cloud SQL public IP:

```bash
# Remove the public IP from a Cloud SQL instance
gcloud sql instances patch my-instance \
  --no-assign-ip \
  --project=my-project-id
```

## Step 8: Set Up Automated Monitoring

Instead of manually checking findings, set up notifications for new findings.

```bash
# Create a Pub/Sub notification for new SHA findings
gcloud scc notifications create sha-alerts \
  --organization=ORGANIZATION_ID \
  --pubsub-topic=projects/my-project-id/topics/sha-findings \
  --filter='state="ACTIVE" AND severity="HIGH" AND source_properties.source_id="SHA_SOURCE_ID"'
```

## Step 9: Track Remediation Progress

Use the SCC API to track how many findings are being resolved over time.

```bash
# Count active findings by category
gcloud scc findings list ORGANIZATION_ID \
  --source=organizations/ORGANIZATION_ID/sources/SHA_SOURCE_ID \
  --filter='state="ACTIVE"' \
  --format="value(finding.category)" | sort | uniq -c | sort -rn | head -20
```

This gives you a quick snapshot of where your biggest security gaps are.

## Standard vs Premium Tier

The Standard tier (free) includes detectors for:

- Open firewall rules
- Public buckets
- Public Cloud SQL instances
- Web UI enabled on GKE clusters
- A handful of other basic checks

The Premium tier adds detectors for:

- CIS benchmark compliance
- Detailed IAM analysis
- Cryptomining detection
- Anomaly detection
- 100+ additional misconfiguration checks

If you are serious about security, Premium tier is worth the investment. The standard tier catches the obvious issues, but the premium detectors find the subtle misconfigurations that are easy to overlook.

## Conclusion

Security Health Analytics is one of those GCP features that provides massive value with almost zero setup effort. It runs continuously, checks your entire organization, and produces actionable findings. The key is to actually act on those findings - set up notifications, assign owners to finding categories, and track your remediation progress over time.

Start by fixing all CRITICAL and HIGH severity findings, then work your way down. Mute the ones you have consciously accepted, and use the notifications pipeline to catch new issues as they appear. A clean SHA dashboard is one of the best indicators that your GCP environment is well-maintained.
