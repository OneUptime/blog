# How to Enforce Service Account Key Creation Restrictions with Organization Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, Organization Policy, Service Account Keys, Security, IAM

Description: Learn how to enforce restrictions on service account key creation using Google Cloud Organization Policies to improve security across your organization.

---

Service account keys are one of the most common security weaknesses in Google Cloud environments. They are long-lived credentials that can be copied, shared, and stored insecurely. If a key gets leaked - through a git commit, a log file, or a compromised developer laptop - an attacker has persistent access to your cloud resources. The best security practice is to avoid creating service account keys entirely and use alternatives like workload identity, service account impersonation, or attached service accounts instead.

Google Cloud Organization Policies let you enforce this at the organizational level, preventing anyone from creating service account keys regardless of their IAM permissions. This is not a recommendation or a guideline - it is a hard technical control.

## Why Service Account Keys Are Risky

Before diving into the how, let me lay out why this matters:

- Keys do not expire by default (they have a 10-year validity)
- Keys cannot be protected by MFA
- Keys can be copied to any machine without detection
- Key theft is the most common GCP credential compromise vector
- Each service account can have up to 10 keys, making tracking difficult

The alternatives - Workload Identity Federation, attached service accounts, and service account impersonation - all provide the same access without the risks of persistent, portable credentials.

## Step 1: Understand the Organization Policy Constraint

The relevant constraint is `iam.disableServiceAccountKeyCreation`. When enforced, it prevents anyone from creating new service account keys through the API, gcloud CLI, or Cloud Console.

```bash
# Check if the constraint is already enforced
gcloud resource-manager org-policies describe iam.disableServiceAccountKeyCreation \
    --organization=ORG_ID
```

## Step 2: Audit Existing Service Account Keys

Before blocking key creation, understand your current state. Find all existing keys so you can plan their replacement:

```bash
#!/bin/bash
# audit-sa-keys.sh
# Find all user-managed service account keys across the organization

ORG_ID="123456789"
OUTPUT_FILE="sa_keys_audit.csv"

echo "Project,ServiceAccount,KeyID,CreatedAt,ExpiresAt" > ${OUTPUT_FILE}

# Get all projects
PROJECTS=$(gcloud projects list \
    --filter="parent.id=${ORG_ID}" \
    --format="value(projectId)")

for PROJECT in ${PROJECTS}; do
    # List service accounts in this project
    SA_LIST=$(gcloud iam service-accounts list \
        --project=${PROJECT} \
        --format="value(email)" 2>/dev/null)

    for SA in ${SA_LIST}; do
        # Check for user-managed keys
        KEYS=$(gcloud iam service-accounts keys list \
            --iam-account=${SA} \
            --managed-by=user \
            --format="csv[no-heading](name.basename(),validAfterTime,validBeforeTime)" 2>/dev/null)

        if [ -n "${KEYS}" ]; then
            while IFS= read -r key; do
                echo "${PROJECT},${SA},${key}" >> ${OUTPUT_FILE}
            done <<< "${KEYS}"
        fi
    done
done

echo "Audit complete. Results in ${OUTPUT_FILE}"

# Count total keys found
TOTAL=$(tail -n +2 ${OUTPUT_FILE} | wc -l)
echo "Total user-managed keys found: ${TOTAL}"
```

## Step 3: Plan Key Migration

For each existing key, identify what is using it and plan the migration to a keyless alternative:

```
Common migration paths:

1. Application on GCE/GKE -> Use attached service account / Workload Identity
2. CI/CD pipeline -> Use Workload Identity Federation with OIDC
3. External application -> Use Workload Identity Federation
4. Local development -> Use user credentials (gcloud auth application-default login)
5. On-premises server -> Use Workload Identity Federation with SAML/OIDC
```

Here is an example of migrating from a key to Workload Identity Federation for a GitHub Actions pipeline:

```bash
# Create a Workload Identity Pool for GitHub Actions
gcloud iam workload-identity-pools create github-pool \
    --project=my-project \
    --location=global \
    --display-name="GitHub Actions Pool"

# Create a provider for GitHub OIDC
gcloud iam workload-identity-pools providers create-oidc github-provider \
    --project=my-project \
    --location=global \
    --workload-identity-pool=github-pool \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='my-org/my-repo'"

# Allow the GitHub identity to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
    deploy-sa@my-project.iam.gserviceaccount.com \
    --project=my-project \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/my-org/my-repo"
```

## Step 4: Enforce the Organization Policy

Once you have migrated existing keys, enforce the constraint:

```bash
# Enforce the constraint at the organization level
# This prevents ALL new service account key creation
gcloud resource-manager org-policies enable-enforce \
    iam.disableServiceAccountKeyCreation \
    --organization=ORG_ID
```

To apply it more gradually, start at the folder level:

```bash
# Enforce on the production folder first
gcloud resource-manager org-policies enable-enforce \
    iam.disableServiceAccountKeyCreation \
    --folder=PROD_FOLDER_ID

# Then expand to staging
gcloud resource-manager org-policies enable-enforce \
    iam.disableServiceAccountKeyCreation \
    --folder=STAGING_FOLDER_ID
```

## Step 5: Allow Exceptions for Specific Projects

Some projects might legitimately need service account keys (for example, interfacing with legacy systems). Use policy overrides for exceptions:

```bash
# Allow an exception for a specific project that still needs keys
# The project-level policy overrides the org-level policy
gcloud resource-manager org-policies disable-enforce \
    iam.disableServiceAccountKeyCreation \
    --project=legacy-integration-project
```

Keep track of exceptions and review them regularly:

```bash
# List all projects that have exceptions to the key creation policy
gcloud resource-manager org-policies list \
    --organization=ORG_ID \
    --filter="constraint:iam.disableServiceAccountKeyCreation" \
    --format="table(constraint,listPolicy,booleanPolicy)"
```

## Step 6: Also Restrict Key Upload

Blocking key creation is not enough if users can upload externally generated keys. Block that too:

```bash
# Also disable service account key upload
gcloud resource-manager org-policies enable-enforce \
    iam.disableServiceAccountKeyUpload \
    --organization=ORG_ID
```

## Step 7: Set Up Monitoring

Monitor for any attempts to create keys (which will fail) and for any existing keys that should be rotated or removed:

```bash
# Alert on failed key creation attempts
# This helps identify teams that need to migrate to keyless authentication
gcloud logging read \
    'protoPayload.methodName="google.iam.admin.v1.CreateServiceAccountKey" AND protoPayload.status.code!=0' \
    --organization=ORG_ID \
    --freshness=7d \
    --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,resource.labels.project_id)"
```

Create a recurring job to find projects that still have existing keys to clean up:

```bash
#!/bin/bash
# check-remaining-keys.sh
# Periodic check for remaining service account keys that need cleanup

ORG_ID="123456789"
TOTAL_KEYS=0

PROJECTS=$(gcloud projects list \
    --filter="parent.id=${ORG_ID}" \
    --format="value(projectId)")

for PROJECT in ${PROJECTS}; do
    SA_LIST=$(gcloud iam service-accounts list \
        --project=${PROJECT} \
        --format="value(email)" 2>/dev/null)

    for SA in ${SA_LIST}; do
        KEY_COUNT=$(gcloud iam service-accounts keys list \
            --iam-account=${SA} \
            --managed-by=user \
            --format="value(name)" 2>/dev/null | wc -l)

        if [ "${KEY_COUNT}" -gt "0" ]; then
            echo "WARNING: ${SA} in ${PROJECT} still has ${KEY_COUNT} user-managed keys"
            TOTAL_KEYS=$((TOTAL_KEYS + KEY_COUNT))
        fi
    done
done

echo ""
echo "Total remaining user-managed keys: ${TOTAL_KEYS}"
if [ "${TOTAL_KEYS}" -eq "0" ]; then
    echo "All service account keys have been cleaned up!"
fi
```

## Step 8: Enforce Key Expiration for Exceptions

For the few projects that legitimately need keys, enforce a maximum key lifetime:

```bash
# Set maximum key lifetime to 24 hours for projects that need keys
# This ensures keys rotate frequently
gcloud resource-manager org-policies set-policy policy.yaml \
    --project=legacy-integration-project
```

The policy file:

```yaml
# policy.yaml
# Enforce 24-hour maximum key lifetime
constraint: constraints/iam.serviceAccountKeyExpiryHours
listPolicy:
  allowedValues:
    - "24"
```

## Summary

Enforcing service account key creation restrictions through Organization Policies is one of the most effective security controls you can implement in Google Cloud. The approach is: audit existing keys, migrate to keyless alternatives (Workload Identity Federation, attached service accounts, impersonation), enforce the organization policy, and monitor for compliance. Allow narrow exceptions where absolutely necessary, but review them regularly. The goal is to eliminate long-lived, portable credentials from your environment entirely, removing one of the most common attack vectors in cloud environments.
