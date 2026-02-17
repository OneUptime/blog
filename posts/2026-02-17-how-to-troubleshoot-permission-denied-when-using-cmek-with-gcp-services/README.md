# How to Troubleshoot Permission Denied When Using CMEK with GCP Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud KMS, CMEK, Troubleshooting, IAM, Permissions

Description: A practical troubleshooting guide for fixing permission denied errors when using Customer-Managed Encryption Keys with various GCP services like Cloud Storage, BigQuery, and GKE.

---

You have set up CMEK encryption for a GCP service, and now you are getting permission denied errors. The bucket will not accept writes, BigQuery jobs fail, or GKE cannot create nodes. This is one of the most common issues teams run into with CMEK, and the root cause is almost always the same: the service agent does not have permission to use the Cloud KMS key.

But diagnosing which service agent needs which permission on which key can be tricky, especially when different GCP services use different service accounts. This guide covers the systematic approach to finding and fixing these errors.

## The Core Problem

When a GCP service uses CMEK, it does not use your user account or your application's service account to call Cloud KMS. Instead, each GCP service has its own internal service agent - a Google-managed service account. That service agent needs the `roles/cloudkms.cryptoKeyEncrypterDecrypter` role on your specific KMS key.

If the binding is missing, you get errors like:

```
PERMISSION_DENIED: Permission 'cloudkms.cryptoKeyVersions.useToEncrypt' denied on resource
```

or

```
Request is prohibited by organization's policy. vpcServiceControlsUniqueIdentifier: ...
```

## Step 1: Identify the Correct Service Agent

Each GCP service has a different service agent email format. Here is how to find them.

### Cloud Storage

```bash
# Get the Cloud Storage service agent
gcloud storage service-agent --project=my-project-id
```

Output format: `service-PROJECT_NUMBER@gs-project-accounts.iam.gserviceaccount.com`

### BigQuery

```bash
# Get the BigQuery encryption service account
bq show --encryption_service_account --project_id=my-project-id
```

Output format: `bq-PROJECT_NUMBER@bigquery-encryption.iam.gserviceaccount.com`

### Compute Engine (for persistent disks)

```bash
# Get the Compute Engine service agent
gcloud projects describe my-project-id \
    --format="value(projectNumber)"
```

The service agent is: `service-PROJECT_NUMBER@compute-system.iam.gserviceaccount.com`

### Google Kubernetes Engine

GKE uses the Compute Engine service agent for node disks, plus its own service agent.

The GKE service agent is: `service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com`

### Cloud SQL

```bash
# Get the Cloud SQL service account email
gcloud sql instances describe my-instance \
    --format="value(serviceAccountEmailAddress)" \
    --project=my-project-id
```

### Pub/Sub

The service agent is: `service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com`

### Artifact Registry

The service agent is: `service-PROJECT_NUMBER@gcp-sa-artifactregistry.iam.gserviceaccount.com`

## Step 2: Check the Current IAM Policy on the Key

Once you know which service agent should have access, check whether the binding exists.

```bash
# List all IAM bindings on a specific key
gcloud kms keys get-iam-policy my-encryption-key \
    --location=us-central1 \
    --keyring=my-keyring \
    --project=my-project-id
```

Look through the output for a binding that includes your service agent email with the `roles/cloudkms.cryptoKeyEncrypterDecrypter` role. If it is missing, that is your problem.

## Step 3: Grant the Missing Permission

Add the IAM binding for the correct service agent.

```bash
# Grant the service agent encrypt/decrypt access to the key
gcloud kms keys add-iam-policy-binding my-encryption-key \
    --location=us-central1 \
    --keyring=my-keyring \
    --member="serviceAccount:service-123456789@gs-project-accounts.iam.gserviceaccount.com" \
    --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
    --project=my-project-id
```

Replace the service account email with the correct one for your service.

## Step 4: Verify the Fix

After adding the binding, retry the operation that was failing. IAM changes in GCP typically propagate within a few minutes, but in some cases can take up to 7 minutes.

```bash
# Test by uploading a file to a CMEK-encrypted bucket
echo "test" | gcloud storage cp - gs://my-cmek-bucket/test.txt
```

## Common Scenarios and Fixes

### Scenario 1: Cross-Project CMEK

When the KMS key is in a different project than the service using it, you need to make sure the service agent from the resource project has access to the key in the KMS project.

```bash
# The Cloud Storage service agent from project-A needs access to a key in project-B
gcloud kms keys add-iam-policy-binding shared-encryption-key \
    --location=us-central1 \
    --keyring=shared-keyring \
    --member="serviceAccount:service-111111111@gs-project-accounts.iam.gserviceaccount.com" \
    --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
    --project=kms-project-id
```

This is a very common source of errors in organizations that centralize their KMS keys in a dedicated project.

### Scenario 2: VPC Service Controls Blocking KMS Access

If you are using VPC Service Controls, the KMS project and the resource project both need to be in the same service perimeter, or you need an ingress/egress rule.

```bash
# Check if your project is in a VPC Service Controls perimeter
gcloud access-context-manager perimeters list \
    --policy=POLICY_ID
```

If the projects are in different perimeters, you need to add an egress rule allowing KMS calls.

### Scenario 3: Organization Policy Blocking CMEK

Some organizations have policies that restrict which keys can be used.

```bash
# Check for org policies related to CMEK
gcloud resource-manager org-policies describe \
    constraints/gcp.restrictNonCmekServices \
    --project=my-project-id

gcloud resource-manager org-policies describe \
    constraints/gcp.restrictCmekCryptoKeyProjects \
    --project=my-project-id
```

The `restrictCmekCryptoKeyProjects` constraint limits which projects can host CMEK keys. If your KMS project is not in the allowed list, CMEK operations fail.

### Scenario 4: Key Ring Location Mismatch

This is not technically a permission error, but it presents similarly. If your key ring is in `us-central1` and you try to use it with a Cloud Storage bucket in `us-east1`, it will not work.

```bash
# Verify the key location
gcloud kms keys describe my-encryption-key \
    --location=us-central1 \
    --keyring=my-keyring \
    --project=my-project-id \
    --format="value(name)"

# Verify the bucket location
gcloud storage buckets describe gs://my-bucket \
    --format="value(location)"
```

These must be compatible. Regional keys work with regional buckets in the same region. Multi-regional keys work with multi-regional buckets.

### Scenario 5: Key is Disabled or Destroyed

If the key version used for encryption has been disabled or scheduled for destruction, all operations against encrypted resources will fail.

```bash
# Check the state of key versions
gcloud kms keys versions list \
    --key=my-encryption-key \
    --keyring=my-keyring \
    --location=us-central1 \
    --project=my-project-id
```

Look for the `state` column. Active key versions should show `ENABLED`. If a version shows `DISABLED` or `DESTROY_SCHEDULED`, that is your issue.

```bash
# Re-enable a disabled key version
gcloud kms keys versions enable 1 \
    --key=my-encryption-key \
    --keyring=my-keyring \
    --location=us-central1 \
    --project=my-project-id
```

## Debugging with Audit Logs

When the error message is not clear enough, check the Cloud Audit Logs for more details.

```bash
# Look for permission denied errors in KMS audit logs
gcloud logging read \
    'resource.type="cloudkms_cryptokey" AND severity="ERROR"' \
    --limit=20 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.status.message, protoPayload.authenticationInfo.principalEmail)"
```

This shows which principal was denied access and often includes the specific permission that was missing.

## Quick Reference: Service Agent Formats

Here is a cheat sheet of service agent email formats, where `N` is your project number:

| Service | Service Agent Email |
|---------|-------------------|
| Cloud Storage | `service-N@gs-project-accounts.iam.gserviceaccount.com` |
| BigQuery | `bq-N@bigquery-encryption.iam.gserviceaccount.com` |
| Compute Engine | `service-N@compute-system.iam.gserviceaccount.com` |
| GKE | `service-N@container-engine-robot.iam.gserviceaccount.com` |
| Cloud SQL | varies per instance |
| Pub/Sub | `service-N@gcp-sa-pubsub.iam.gserviceaccount.com` |
| Dataflow | `service-N@dataflow-service-producer-prod.iam.gserviceaccount.com` |
| Artifact Registry | `service-N@gcp-sa-artifactregistry.iam.gserviceaccount.com` |

## Summary

CMEK permission errors come down to one thing: the GCP service agent does not have the `cryptoKeyEncrypterDecrypter` role on your KMS key. The tricky part is figuring out which service agent to grant it to, since every GCP service uses a different one. Identify the correct service agent, check the IAM policy on your key, add the missing binding, and wait a few minutes for propagation. For cross-project setups and VPC Service Controls, there are extra considerations, but the fundamental fix is always the same - make sure the right service account has the right role on the right key.
