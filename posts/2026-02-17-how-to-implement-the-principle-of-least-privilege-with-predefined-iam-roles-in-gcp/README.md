# How to Implement the Principle of Least Privilege with Predefined IAM Roles in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Least Privilege, Security, Predefined Roles, Access Control

Description: A practical guide to implementing least-privilege access control in Google Cloud using predefined IAM roles, with strategies for right-sizing permissions.

---

The principle of least privilege says that every user, service account, and application should have only the minimum permissions needed to do its job. It sounds simple, but in practice, most GCP projects end up with over-permissioned identities because granting broad roles is quick and easy while figuring out the right narrow role takes effort.

This post is a practical guide to implementing least privilege using GCP's predefined IAM roles. I will cover how to identify the right roles, common patterns, and tools that help you get there.

## Why Least Privilege Matters

Over-permissioned accounts are a common cause of security incidents:

- A compromised service account with `roles/editor` can delete any resource in the project
- A developer with `roles/owner` can exfiltrate data from any bucket
- A CI/CD pipeline with broad permissions becomes a high-value attack target

Least privilege limits the blast radius. If a credential is compromised, the attacker can only do what that credential was allowed to do. With a tightly scoped role, that might be "read objects from one bucket" instead of "do anything in the project."

## Understanding the Role Hierarchy

GCP IAM roles fall into three categories:

### Basic Roles (Avoid These)

```
roles/viewer    - Read access to all resources
roles/editor    - Read + write access to all resources
roles/owner     - Full access + IAM management
```

These are the roles you want to replace. They grant permissions across every service in the project. In almost every case, there is a narrower predefined role that does what you actually need.

### Predefined Roles (Use These)

Google maintains hundreds of predefined roles scoped to specific services and actions:

```
roles/storage.objectViewer     - Read objects in Cloud Storage
roles/compute.instanceAdmin.v1 - Manage Compute Engine instances
roles/cloudsql.editor          - Manage Cloud SQL instances
roles/run.developer            - Deploy to Cloud Run
```

### Custom Roles (When Predefined Is Not Enough)

For cases where even predefined roles are too broad, you can create custom roles with exactly the permissions you need.

## Step 1: Audit Current Permissions

Start by understanding what roles are currently granted:

```bash
# List all IAM bindings in a project
gcloud projects get-iam-policy my-project \
    --format="table(bindings.role, bindings.members.flatten())"
```

Look for these red flags:

```bash
# Find all uses of basic roles (viewer, editor, owner)
gcloud projects get-iam-policy my-project --format=json | \
    python3 -c "
import json, sys
policy = json.load(sys.stdin)
basic_roles = ['roles/viewer', 'roles/editor', 'roles/owner']
for binding in policy.get('bindings', []):
    if binding['role'] in basic_roles:
        print(f\"WARNING: {binding['role']} granted to:\")
        for member in binding['members']:
            print(f\"  {member}\")
"
```

## Step 2: Use IAM Recommender

GCP has a built-in tool that analyzes actual permission usage and recommends tighter roles. This is the easiest way to right-size permissions:

```bash
# List IAM recommendations for your project
gcloud recommender recommendations list \
    --project=my-project \
    --location=global \
    --recommender=google.iam.policy.Recommender \
    --format="table(name, content.overview.member, content.overview.removedRole, content.overview.addedRoles)"
```

The recommender looks at what permissions were actually used over the past 90 days and suggests narrower roles. For example, if someone has `roles/editor` but only ever used `compute.instances.get` and `compute.instances.list`, it will recommend `roles/compute.viewer`.

Apply a recommendation:

```bash
# Apply a specific recommendation
gcloud recommender recommendations mark-claimed \
    RECOMMENDATION_ID \
    --project=my-project \
    --location=global \
    --recommender=google.iam.policy.Recommender \
    --etag=ETAG
```

## Step 3: Map Job Functions to Roles

Instead of granting roles ad-hoc, define standard role sets for each job function in your organization.

### Application Developer

Needs to deploy code and view logs, but should not manage infrastructure:

```bash
# Typical developer role set
gcloud projects add-iam-policy-binding my-project \
    --member="group:developers@example.com" \
    --role="roles/run.developer"

gcloud projects add-iam-policy-binding my-project \
    --member="group:developers@example.com" \
    --role="roles/logging.viewer"

gcloud projects add-iam-policy-binding my-project \
    --member="group:developers@example.com" \
    --role="roles/monitoring.viewer"

gcloud projects add-iam-policy-binding my-project \
    --member="group:developers@example.com" \
    --role="roles/errorreporting.viewer"
```

### Database Administrator

Needs to manage Cloud SQL but not other infrastructure:

```bash
# DBA role set
gcloud projects add-iam-policy-binding my-project \
    --member="group:dba-team@example.com" \
    --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding my-project \
    --member="group:dba-team@example.com" \
    --role="roles/monitoring.viewer"

gcloud projects add-iam-policy-binding my-project \
    --member="group:dba-team@example.com" \
    --role="roles/logging.viewer"
```

### DevOps / SRE

Needs broader infrastructure access but still scoped:

```bash
# SRE role set
gcloud projects add-iam-policy-binding my-project \
    --member="group:sre-team@example.com" \
    --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding my-project \
    --member="group:sre-team@example.com" \
    --role="roles/container.admin"

gcloud projects add-iam-policy-binding my-project \
    --member="group:sre-team@example.com" \
    --role="roles/monitoring.admin"

gcloud projects add-iam-policy-binding my-project \
    --member="group:sre-team@example.com" \
    --role="roles/logging.admin"
```

### Read-Only Auditor

```bash
# Auditor role set
gcloud projects add-iam-policy-binding my-project \
    --member="group:auditors@example.com" \
    --role="roles/iam.securityReviewer"

gcloud projects add-iam-policy-binding my-project \
    --member="group:auditors@example.com" \
    --role="roles/logging.viewer"

gcloud projects add-iam-policy-binding my-project \
    --member="group:auditors@example.com" \
    --role="roles/monitoring.viewer"
```

## Step 4: Right-Size Service Accounts

Service accounts are where least privilege matters most, because they are used by automated processes and are prime targets for credential theft.

### One Service Account Per Application

Do not share service accounts across applications:

```bash
# Create dedicated service accounts for each app
gcloud iam service-accounts create app-frontend-sa \
    --display-name="Frontend Application"

gcloud iam service-accounts create app-backend-sa \
    --display-name="Backend Application"

gcloud iam service-accounts create app-worker-sa \
    --display-name="Background Worker"
```

### Grant Only What Each App Needs

```bash
# Frontend only needs to read from storage and write logs
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:app-frontend-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# Backend needs database and cache access
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:app-backend-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:app-backend-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/redis.editor"

# Worker needs Pub/Sub and Storage access
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:app-worker-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/pubsub.subscriber"

gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:app-worker-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

## Step 5: Use Resource-Level Bindings

Instead of granting roles at the project level, grant them on specific resources when possible:

```bash
# Grant access to a specific bucket instead of all buckets
gsutil iam ch \
    serviceAccount:app-frontend-sa@my-project.iam.gserviceaccount.com:objectViewer \
    gs://my-specific-bucket

# Grant access to a specific Pub/Sub topic
gcloud pubsub topics add-iam-policy-binding my-topic \
    --member="serviceAccount:app-worker-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/pubsub.publisher"
```

This is more granular than project-level bindings and limits access to only the specific resources the identity needs.

## Step 6: Regular Reviews

Least privilege is not a one-time setup. Permissions drift over time as people change roles and projects evolve.

### Run Recommender Regularly

```bash
# Script to check recommendations monthly
gcloud recommender recommendations list \
    --project=my-project \
    --location=global \
    --recommender=google.iam.policy.Recommender \
    --format="csv(content.overview.member, content.overview.removedRole, content.overview.addedRoles, priority)" \
    > /tmp/iam-recommendations-$(date +%Y%m).csv
```

### Check for Unused Service Accounts

```bash
# List service accounts and their last authentication time
gcloud iam service-accounts list \
    --project=my-project \
    --format="table(email, displayName, disabled)"
```

Use the Policy Analyzer to find service accounts that have not been used in 90+ days:

```bash
# Analyze IAM policy for unused bindings
gcloud policy-intelligence query-activity \
    --project=my-project \
    --activity-type=serviceAccountKeyLastAuthentication
```

## Common Mistakes to Avoid

1. **Granting roles/editor to service accounts**: This is the most common over-permission. Use specific roles instead.
2. **Using a single service account for everything**: Each application should have its own service account.
3. **Granting project-level roles when resource-level works**: Scope to the specific bucket, topic, or dataset.
4. **Not reviewing permissions after team changes**: When someone changes teams, their old permissions should be revoked.
5. **Ignoring IAM Recommender suggestions**: The tool is free and highly accurate. Use it.

## Wrapping Up

Implementing least privilege with predefined IAM roles is a process, not a single action. Start by auditing current permissions and identifying over-permissioned identities. Use IAM Recommender to get data-driven suggestions. Map job functions to standard role sets and grant at the most specific resource level possible. Create separate service accounts for each application. And review regularly - permissions that were right six months ago may be too broad today. The effort pays off in reduced risk and easier compliance audits.
