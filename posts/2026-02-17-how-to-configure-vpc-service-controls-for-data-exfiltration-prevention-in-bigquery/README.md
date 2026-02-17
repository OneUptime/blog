# How to Configure VPC Service Controls for Data Exfiltration Prevention in BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, VPC Service Controls, BigQuery, Data Exfiltration, Security

Description: A practical guide to configuring VPC Service Controls to prevent data exfiltration from BigQuery, including perimeter setup, access levels, and ingress/egress rules.

---

Data exfiltration from BigQuery is one of those risks that keeps security teams up at night. Someone with legitimate read access to a dataset could copy it to an external project, export it to a personal Cloud Storage bucket, or query it from outside your organization. VPC Service Controls solve this problem by creating a security perimeter around your GCP resources that restricts data movement.

This guide covers the practical steps to set up VPC Service Controls specifically for protecting BigQuery data.

## Understanding the Security Perimeter Concept

VPC Service Controls work by creating an invisible boundary - called a service perimeter - around your GCP projects. Once a project is inside the perimeter, its resources can only communicate with other resources inside the same perimeter. Any attempt to access resources from outside the perimeter, or to move data out of the perimeter, gets blocked.

For BigQuery, this means a user inside the perimeter cannot export query results to a Cloud Storage bucket in a project outside the perimeter, share datasets with projects outside the perimeter, or run queries that join data from inside and outside the perimeter.

## Prerequisites

Before you start, you need an organization-level access policy, the Access Context Manager Admin role, and the Service Perimeter Admin role. VPC Service Controls operate at the organization level, so project-level permissions are not sufficient.

```bash
# Verify your organization ID
gcloud organizations list

# Check that you have the required roles
gcloud organizations get-iam-policy YOUR_ORG_ID \
  --filter="bindings.role:roles/accesscontextmanager.policyAdmin" \
  --format="table(bindings.members)"
```

## Step 1: Create an Access Policy

If your organization does not already have an access policy, create one. Most organizations only need a single access policy.

```bash
# Create an access policy for your organization
gcloud access-context-manager policies create \
  --organization=YOUR_ORG_ID \
  --title="Organization Security Policy"

# Note the policy ID from the output - you will need it for subsequent commands
# Store it in a variable for convenience
export POLICY_ID=YOUR_POLICY_ID
```

## Step 2: Define Access Levels

Access levels define the conditions under which requests are allowed to cross the perimeter. You will typically create access levels for trusted corporate networks, specific service accounts used by CI/CD pipelines, and trusted devices managed by your organization.

```yaml
# access-level-spec.yaml
# This defines an access level for your corporate network
- ipSubnetworks:
    - "203.0.113.0/24"    # Office network range
    - "198.51.100.0/24"   # VPN exit point
  regions:
    - "US"
    - "EU"
```

```bash
# Create the access level from the spec file
gcloud access-context-manager levels create corporate_network \
  --policy=$POLICY_ID \
  --title="Corporate Network Access" \
  --basic-level-spec=access-level-spec.yaml

# Create a second access level for trusted service accounts
gcloud access-context-manager levels create ci_cd_access \
  --policy=$POLICY_ID \
  --title="CI/CD Pipeline Access" \
  --basic-level-spec=ci-cd-access-level.yaml
```

## Step 3: Create a Dry-Run Perimeter First

Always start with a dry-run perimeter. A dry-run perimeter logs violations without actually blocking any requests, letting you identify what would break before enforcing the controls.

```bash
# Create a service perimeter in dry-run mode
gcloud access-context-manager perimeters dry-run create bigquery_perimeter \
  --policy=$POLICY_ID \
  --title="BigQuery Data Protection Perimeter" \
  --resources="projects/PROJECT_NUMBER_1,projects/PROJECT_NUMBER_2" \
  --restricted-services="bigquery.googleapis.com,storage.googleapis.com" \
  --access-levels="accessPolicies/$POLICY_ID/accessLevels/corporate_network"
```

Notice that we include both BigQuery and Cloud Storage in the restricted services. If you only restrict BigQuery but leave Cloud Storage open, someone could still export data to an external storage bucket through other means.

## Step 4: Review Dry-Run Logs

Let the dry-run perimeter run for at least a week in a production environment. Check the logs to understand what traffic would be blocked.

```bash
# Query audit logs for dry-run violations
gcloud logging read '
  resource.type="audited_resource"
  AND protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata"
  AND protoPayload.metadata.dryRun=true
' --limit=50 --format=json
```

Common things you will find in the logs include third-party analytics tools that query BigQuery from outside, data pipelines that cross project boundaries, and developers querying from personal machines without VPN access.

## Step 5: Configure Ingress and Egress Rules

After reviewing dry-run logs, you will likely need ingress and egress rules for legitimate cross-perimeter traffic.

```yaml
# ingress-rules.yaml
# Allow a specific external data pipeline to write to BigQuery
- ingressFrom:
    identityType: ANY_IDENTITY
    sources:
      - accessLevel: "accessPolicies/POLICY_ID/accessLevels/ci_cd_access"
  ingressTo:
    operations:
      - serviceName: "bigquery.googleapis.com"
        methodSelectors:
          - method: "google.cloud.bigquery.v2.TableDataService.InsertAll"
          - method: "google.cloud.bigquery.v2.JobService.InsertJob"
    resources:
      - "projects/PROJECT_NUMBER_1"
```

```yaml
# egress-rules.yaml
# Allow BigQuery to read from a specific external dataset (e.g., public datasets)
- egressFrom:
    identityType: ANY_IDENTITY
  egressTo:
    operations:
      - serviceName: "bigquery.googleapis.com"
        methodSelectors:
          - method: "google.cloud.bigquery.v2.JobService.InsertJob"
    resources:
      - "projects/PUBLIC_DATASET_PROJECT_NUMBER"
```

```bash
# Update the perimeter with ingress and egress rules
gcloud access-context-manager perimeters update bigquery_perimeter \
  --policy=$POLICY_ID \
  --set-ingress-policies=ingress-rules.yaml \
  --set-egress-policies=egress-rules.yaml
```

## Step 6: Enforce the Perimeter

Once you have reviewed the dry-run results and configured the necessary exceptions, convert the perimeter to enforced mode.

```bash
# Promote dry-run to enforced perimeter
gcloud access-context-manager perimeters dry-run enforce bigquery_perimeter \
  --policy=$POLICY_ID

# Verify the perimeter is active
gcloud access-context-manager perimeters describe bigquery_perimeter \
  --policy=$POLICY_ID
```

## Step 7: Set Up Monitoring and Alerts

Create alerts for perimeter violations so your security team can respond to potential exfiltration attempts.

```bash
# Create a log-based metric for VPC-SC violations
gcloud logging metrics create vpc_sc_violations \
  --description="Count of VPC Service Control violations" \
  --filter='resource.type="audited_resource" AND protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND protoPayload.metadata.violationReason!=""'

# Create an alert policy that triggers on violations
gcloud alpha monitoring policies create \
  --display-name="VPC-SC Violation Alert" \
  --condition-display-name="VPC Service Controls violation detected" \
  --condition-filter='metric.type="logging.googleapis.com/user/vpc_sc_violations"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels="projects/PROJECT_ID/notificationChannels/CHANNEL_ID"
```

## Common Pitfalls

There are several things that catch people off guard when deploying VPC Service Controls. First, BigQuery scheduled queries run as the user who created them - if that user is outside the perimeter, the queries will fail. Second, connected sheets in Google Sheets that pull from BigQuery will stop working if the Sheets access comes from outside the perimeter. Third, Looker Studio dashboards need their data source service accounts to be within the perimeter or have appropriate access levels.

Also, remember that adding or removing projects from a perimeter can take several minutes to propagate. Do not assume changes are instant.

## Testing the Configuration

After enforcement, verify that the controls work as expected by deliberately attempting operations that should be blocked.

```bash
# From outside the perimeter, try to export BigQuery data
# This should fail with a VPC Service Controls error
bq extract --destination_format=CSV \
  'project_inside:dataset.table' \
  'gs://bucket-outside-perimeter/export.csv'

# Expected error: VPC Service Controls: Request is prohibited by organization policy
```

VPC Service Controls are one of the most effective tools available on GCP for preventing data exfiltration. The combination of service perimeters, access levels, and granular ingress/egress rules gives you fine-grained control over how data moves in and out of your protected projects. The key is to start with dry-run mode, analyze your traffic patterns carefully, and then enforce with confidence.
