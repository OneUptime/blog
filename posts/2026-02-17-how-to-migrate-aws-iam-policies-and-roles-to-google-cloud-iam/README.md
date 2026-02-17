# How to Migrate AWS IAM Policies and Roles to Google Cloud IAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud IAM, AWS IAM, Security, Access Control, Cloud Migration

Description: A thorough guide to translating AWS IAM policies, roles, and permission structures to Google Cloud IAM, covering role mapping, service accounts, and organizational policies.

---

IAM is the foundation of cloud security, and it is one of the areas where AWS and GCP differ most significantly. AWS uses a policy-based model where you write JSON policy documents and attach them to users, groups, or roles. GCP uses a resource-based model where you bind members to roles on specific resources.

This is not a simple find-and-replace migration. You need to rethink your permission structure in GCP terms. This guide helps you make that translation.

## Fundamental Differences

Before mapping specific permissions, understand the structural differences:

**AWS Model**: Policies (JSON documents) define permissions. Policies are attached to IAM users, groups, or roles. Policies can be inline or managed.

**GCP Model**: Roles (collections of permissions) are bound to members on resources. Members can be users, groups, service accounts, or domains. Bindings happen at the organization, folder, project, or resource level.

| AWS Concept | GCP Equivalent |
|------------|----------------|
| IAM User | Google account or Cloud Identity user |
| IAM Group | Google Group |
| IAM Role (for services) | Service account |
| IAM Role (for federation) | Workload Identity Federation |
| Managed Policy | Predefined role |
| Inline Policy | Custom role |
| Policy document | IAM policy binding |
| Resource-based policy | IAM policy on the resource |
| Permission boundary | Organization Policy + IAM Deny policies |
| SCP (Organizations) | Organization Policy constraints |

## Step 1: Inventory Your AWS IAM Setup

Export your IAM configuration for analysis.

```bash
# List all IAM users
aws iam list-users \
  --query 'Users[*].{Name:UserName,Created:CreateDate,LastLogin:PasswordLastUsed}' \
  --output table

# List all IAM roles
aws iam list-roles \
  --query 'Roles[*].{Name:RoleName,Type:AssumeRolePolicyDocument.Statement[0].Principal}' \
  --output table

# Export all policies attached to a role
aws iam list-attached-role-policies \
  --role-name my-app-role \
  --output table

# Get a specific policy document
aws iam get-policy-version \
  --policy-arn arn:aws:iam::123456:policy/my-custom-policy \
  --version-id v1 \
  --query 'PolicyVersion.Document'
```

## Step 2: Map AWS Managed Policies to GCP Predefined Roles

AWS managed policies have GCP predefined role equivalents. Here are common mappings:

| AWS Managed Policy | GCP Predefined Role |
|-------------------|---------------------|
| AdministratorAccess | roles/owner |
| ReadOnlyAccess | roles/viewer |
| PowerUserAccess | roles/editor |
| AmazonS3FullAccess | roles/storage.admin |
| AmazonS3ReadOnlyAccess | roles/storage.objectViewer |
| AmazonEC2FullAccess | roles/compute.admin |
| AmazonRDSFullAccess | roles/cloudsql.admin |
| AmazonVPCFullAccess | roles/compute.networkAdmin |
| CloudWatchFullAccess | roles/monitoring.admin |
| AWSLambdaFullAccess | roles/cloudfunctions.admin |

GCP recommends using the principle of least privilege more aggressively than what many AWS setups practice. Instead of granting broad roles, use specific ones:

```bash
# Instead of roles/editor (too broad), grant specific roles
gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@example.com" \
  --role="roles/cloudfunctions.developer"

gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@example.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding my-project \
  --member="user:developer@example.com" \
  --role="roles/cloudsql.client"
```

## Step 3: Convert Custom Policies to Custom Roles

AWS custom policies translate to GCP custom roles. Here is an example:

```json
// AWS custom policy - allows specific S3 and DynamoDB actions
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456:table/my-table"
    }
  ]
}
```

The GCP custom role equivalent:

```bash
# Create a custom role with equivalent permissions
gcloud iam roles create appDataAccess \
  --project=my-project \
  --title="App Data Access" \
  --description="Read/write access to app storage and database" \
  --permissions=storage.objects.get,storage.objects.create,storage.objects.list,\
datastore.entities.get,datastore.entities.create,datastore.entities.list

# Bind the custom role to a member on the project
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app@my-project.iam.gserviceaccount.com" \
  --role="projects/my-project/roles/appDataAccess"
```

Note that GCP does not support "Deny" in custom role definitions the way AWS policies do. For deny scenarios, use IAM Deny policies (a newer feature) or Organization Policy constraints.

## Step 4: Convert IAM Roles (Service Roles) to Service Accounts

AWS IAM roles that are assumed by services (EC2 instance profiles, Lambda execution roles, ECS task roles) become GCP service accounts.

```bash
# Create a service account (equivalent to an IAM role for a service)
gcloud iam service-accounts create my-app-sa \
  --display-name="My Application Service Account" \
  --description="Used by the web application to access Cloud Storage and Cloud SQL"

# Grant permissions to the service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Attach the service account to a Compute Engine instance
gcloud compute instances create my-vm \
  --service-account=my-app-sa@my-project.iam.gserviceaccount.com \
  --scopes=cloud-platform \
  --zone=us-central1-a
```

## Step 5: Convert Cross-Account Roles to Workload Identity

AWS cross-account roles and federation use AssumeRole. GCP uses Workload Identity Federation.

```bash
# Create a workload identity pool (for external identity providers)
gcloud iam workload-identity-pools create aws-pool \
  --location=global \
  --display-name="AWS Workload Pool"

# Create a provider for AWS
gcloud iam workload-identity-pools providers create-aws aws-provider \
  --location=global \
  --workload-identity-pool=aws-pool \
  --account-id=123456789012

# Allow the AWS identity to impersonate a GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  my-app-sa@my-project.iam.gserviceaccount.com \
  --member="principalSet://iam.googleapis.com/projects/my-project-num/locations/global/workloadIdentityPools/aws-pool/attribute.aws_role/arn:aws:sts::123456789012:assumed-role/my-role" \
  --role="roles/iam.workloadIdentityUser"
```

## Step 6: Convert Resource-Based Policies

AWS S3 bucket policies and similar resource-based policies become IAM bindings on the specific resource.

```bash
# AWS S3 bucket policy grants cross-account access
# GCP equivalent: grant access on the specific bucket
gsutil iam ch \
  serviceAccount:external-sa@other-project.iam.gserviceaccount.com:objectViewer \
  gs://my-shared-bucket

# Grant conditional access (equivalent to policy conditions)
gcloud storage buckets add-iam-policy-binding gs://my-shared-bucket \
  --member="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer" \
  --condition='expression=request.time < timestamp("2026-12-31T00:00:00Z"),title=temporary-access'
```

## Step 7: Convert SCPs to Organization Policies

AWS Service Control Policies (SCPs) restrict what actions can be performed in member accounts. GCP Organization Policy constraints serve a similar purpose.

```bash
# Restrict VM creation to specific regions (like SCP restricting EC2 to specific regions)
gcloud resource-manager org-policies set-policy \
  --organization=123456789 \
  policy.yaml
```

Create the policy file:

```yaml
# Restrict compute instances to US regions only
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:us-locations
```

```bash
# Disable service account key creation (security best practice)
gcloud resource-manager org-policies enable-enforce \
  constraints/iam.disableServiceAccountKeyCreation \
  --organization=123456789

# Restrict public access to Cloud Storage
gcloud resource-manager org-policies enable-enforce \
  constraints/storage.publicAccessPrevention \
  --organization=123456789
```

## Step 8: Validate Permissions

After setting up IAM, validate that the permissions work as expected.

```bash
# Test if a service account has a specific permission
gcloud asset check-iam-policy \
  --scope=projects/my-project \
  --identity="serviceAccount:my-app-sa@my-project.iam.gserviceaccount.com" \
  --resource="//storage.googleapis.com/my-bucket" \
  --permission="storage.objects.get"

# List all IAM bindings for a project
gcloud projects get-iam-policy my-project \
  --format='table(bindings.role, bindings.members)'

# Use IAM Policy Troubleshooter to debug access issues
gcloud policy-troubleshoot iam \
  //storage.googleapis.com/projects/_/buckets/my-bucket \
  --permission=storage.objects.get \
  --principal-email=my-app-sa@my-project.iam.gserviceaccount.com
```

## Common Pitfalls

1. GCP does not have IAM users the same way AWS does. Users come from Google Workspace or Cloud Identity.
2. Service account keys are discouraged in GCP. Use workload identity, metadata server, or impersonation instead.
3. GCP IAM changes can take up to 60 seconds to propagate.
4. The roles/owner role cannot be granted via gcloud for security reasons on organization resources.

## Summary

The IAM migration is fundamentally about shifting from a policy-centric model to a role-binding model. AWS says "here is what this entity can do" (policy attached to entity). GCP says "here is who can do what on this resource" (role bound to member on resource). Take the time to right-size your permissions during migration rather than just mapping broad AWS policies to broad GCP roles. Use the IAM Recommender to identify overly permissive bindings after the initial setup.
