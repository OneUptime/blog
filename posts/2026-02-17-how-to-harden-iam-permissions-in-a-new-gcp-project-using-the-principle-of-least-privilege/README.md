# How to Harden IAM Permissions in a New GCP Project Using the Principle of Least Privilege

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Security, Least Privilege, Access Control, Service Accounts

Description: Implement the principle of least privilege in a new GCP project by configuring granular IAM roles, managing service accounts properly, and auditing permissions regularly.

---

Every new GCP project starts with a blank slate for IAM - and how you configure it in the first few days sets the security posture for months or years. The most common mistake is giving everyone broad access to get things moving quickly, with the intention of tightening it later. That later never comes, and you end up with developers who have Owner access to production projects and service accounts with Editor roles that they barely use.

Here is how to set up IAM properly from the start, following the principle of least privilege.

## What Least Privilege Actually Means

Least privilege means every identity (user, service account, group) has exactly the permissions it needs to do its job and nothing more. Not "close enough" permissions - exactly the right ones.

In practice, this means:

- Use predefined roles instead of basic roles (Viewer, Editor, Owner)
- Prefer narrow, service-specific roles over broad ones
- Grant roles at the lowest possible level in the resource hierarchy
- Use service accounts for applications, not personal accounts
- Review and revoke unused permissions regularly

## Step 1: Remove Default Overprivileged Access

New GCP projects come with some default access that you should clean up:

```bash
# Check the current IAM policy
gcloud projects get-iam-policy my-project --format=yaml

# Remove the default Compute Engine service account's Editor role
# This is often overprivileged
gcloud projects remove-iam-policy-binding my-project \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/editor"

# Remove the default App Engine service account's Editor role
gcloud projects remove-iam-policy-binding my-project \
  --member="serviceAccount:my-project@appspot.gserviceaccount.com" \
  --role="roles/editor"
```

The default Compute Engine service account gets the Editor role automatically. This means any VM that uses it (which is the default) has read-write access to almost every service in the project. Fix this by either creating dedicated service accounts or by removing the Editor role and granting specific roles.

## Step 2: Map Roles to Job Functions

Before granting any access, map out what each team member or service actually needs:

```
Developer:
  - View and deploy to Cloud Run (roles/run.developer)
  - Read logs (roles/logging.viewer)
  - Access Cloud SQL as client (roles/cloudsql.client)
  - View monitoring dashboards (roles/monitoring.viewer)

SRE/Platform Engineer:
  - Manage Compute Engine instances (roles/compute.instanceAdmin)
  - Manage GKE clusters (roles/container.admin)
  - Configure monitoring and alerting (roles/monitoring.editor)
  - Manage Cloud SQL (roles/cloudsql.admin)

Data Analyst:
  - Query BigQuery tables (roles/bigquery.dataViewer, roles/bigquery.jobUser)
  - View Cloud Storage objects (roles/storage.objectViewer)

CI/CD Pipeline (service account):
  - Build containers (roles/cloudbuild.builds.builder)
  - Push to Artifact Registry (roles/artifactregistry.writer)
  - Deploy to Cloud Run (roles/run.admin)
  - Deploy to GKE (roles/container.developer)
```

## Step 3: Use Google Groups for Access

Never grant roles to individual users. Use Google Groups instead. This makes access management much simpler:

```bash
# Create the group-based IAM bindings
# Developers group
gcloud projects add-iam-policy-binding my-project \
  --member="group:developers@company.com" \
  --role="roles/run.developer"

gcloud projects add-iam-policy-binding my-project \
  --member="group:developers@company.com" \
  --role="roles/logging.viewer"

gcloud projects add-iam-policy-binding my-project \
  --member="group:developers@company.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding my-project \
  --member="group:developers@company.com" \
  --role="roles/monitoring.viewer"

# SRE group
gcloud projects add-iam-policy-binding my-project \
  --member="group:sre-team@company.com" \
  --role="roles/compute.instanceAdmin.v1"

gcloud projects add-iam-policy-binding my-project \
  --member="group:sre-team@company.com" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding my-project \
  --member="group:sre-team@company.com" \
  --role="roles/monitoring.editor"
```

When someone joins the team, add them to the appropriate Google Group. When they leave, remove them from the group. No IAM policy changes needed.

## Step 4: Create Dedicated Service Accounts

Each application or workload should have its own service account with only the permissions it needs:

```bash
# Create a service account for the web application
gcloud iam service-accounts create webapp-sa \
  --display-name="Web Application Service Account" \
  --description="Used by the production web application"

# Grant only the specific roles it needs
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:webapp-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:webapp-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Create a service account for the background worker
gcloud iam service-accounts create worker-sa \
  --display-name="Background Worker Service Account"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:worker-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:worker-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectCreator"
```

### Attach Service Accounts to Workloads

```bash
# Attach to a Compute Engine instance
gcloud compute instances create web-server \
  --service-account=webapp-sa@my-project.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --zone=us-central1-a

# Deploy Cloud Run with a specific service account
gcloud run deploy web-app \
  --image=us-central1-docker.pkg.dev/my-project/apps/webapp:latest \
  --service-account=webapp-sa@my-project.iam.gserviceaccount.com \
  --region=us-central1
```

For GKE, use Workload Identity to link Kubernetes service accounts to GCP service accounts:

```bash
# Enable Workload Identity on the cluster
gcloud container clusters update my-cluster \
  --workload-pool=my-project.svc.id.goog \
  --zone=us-central1-a

# Create the IAM binding between Kubernetes SA and GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  webapp-sa@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[default/webapp-ksa]"
```

## Step 5: Use IAM Conditions for Fine-Grained Access

IAM Conditions let you add context-based restrictions to role bindings:

```bash
# Grant access only during business hours
gcloud projects add-iam-policy-binding my-project \
  --member="group:contractors@company.com" \
  --role="roles/compute.viewer" \
  --condition='expression=request.time.getHours("America/New_York") >= 9 && request.time.getHours("America/New_York") <= 17,title=Business hours only'

# Grant access to specific Cloud Storage buckets only
gcloud projects add-iam-policy-binding my-project \
  --member="group:data-team@company.com" \
  --role="roles/storage.objectViewer" \
  --condition='expression=resource.name.startsWith("projects/_/buckets/analytics-"),title=Analytics buckets only'

# Grant temporary access that expires
gcloud projects add-iam-policy-binding my-project \
  --member="user:contractor@external.com" \
  --role="roles/viewer" \
  --condition='expression=request.time < timestamp("2026-04-01T00:00:00Z"),title=Temporary access until April 2026'
```

## Step 6: Create Custom Roles When Needed

Sometimes predefined roles grant more than needed. Create custom roles for specific use cases:

```bash
# Create a custom role for developers who only need to view and restart VMs
gcloud iam roles create vmOperator \
  --project=my-project \
  --title="VM Operator" \
  --description="Can view and restart VMs but not create or delete them" \
  --permissions="compute.instances.get,compute.instances.list,compute.instances.start,compute.instances.stop,compute.instances.reset" \
  --stage=GA

# Use the custom role
gcloud projects add-iam-policy-binding my-project \
  --member="group:on-call-team@company.com" \
  --role="projects/my-project/roles/vmOperator"
```

## Step 7: Audit and Monitor Permissions

### Use IAM Recommender

IAM Recommender analyzes actual permission usage and suggests removing unused permissions:

```bash
# List IAM recommendations for the project
gcloud recommender recommendations list \
  --project=my-project \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --format="table(name, description, primaryImpact.category)"
```

### Use Policy Analyzer

Policy Analyzer tells you who can access what:

```bash
# Find who can access a specific Cloud Storage bucket
gcloud asset analyze-iam-policy \
  --organization=ORGANIZATION_ID \
  --full-resource-name="//storage.googleapis.com/projects/_/buckets/sensitive-data" \
  --permissions="storage.objects.get"
```

### Set Up Alerting for IAM Changes

```bash
# Alert on IAM policy changes
gcloud logging metrics create iam-policy-changes \
  --description="Track IAM policy modifications" \
  --log-filter='protoPayload.methodName="SetIamPolicy" OR protoPayload.methodName="google.iam.admin.v1.CreateRole"'
```

## Step 8: Implement Regular Access Reviews

Schedule quarterly access reviews:

1. Export the current IAM policy:
```bash
gcloud projects get-iam-policy my-project --format=json > current-policy.json
```

2. Review each binding:
   - Is this role still needed?
   - Could a more restrictive role work instead?
   - Are all group members still appropriate?

3. Check IAM Recommender for suggestions on unused permissions.

4. Remove any access that is no longer justified.

## Common Mistakes to Avoid

**Granting Owner to developers**: Owner includes IAM management and billing permissions. Almost no developer needs this. Use Editor (or better, specific predefined roles) instead.

**Using allUsers or allAuthenticatedUsers**: These grant access to the entire internet or every Google account. Only use them for intentionally public resources like a public website bucket.

**Not cleaning up service account keys**: If you must use keys (try not to), rotate them every 90 days and delete unused ones.

**Granting project-level access when resource-level works**: If a user only needs access to one BigQuery dataset, grant the role on the dataset, not the project.

```bash
# Grant access at the dataset level, not the project level
bq update --set_label="team:analytics" my_dataset

# Dataset-level IAM
bq add-iam-policy-binding my_dataset \
  --member="group:analytics@company.com" \
  --role="roles/bigquery.dataViewer"
```

## Wrapping Up

Hardening IAM in a new GCP project is about establishing the right patterns from the start. Remove default overprivileged access, use groups instead of individual users, create dedicated service accounts for each workload, prefer narrow predefined roles over broad ones, and use IAM Conditions for fine-grained control. Set up regular auditing with IAM Recommender and Policy Analyzer to catch permission drift over time. The initial investment in getting IAM right prevents the security debt that accumulates when broad access is granted for convenience and never tightened.
