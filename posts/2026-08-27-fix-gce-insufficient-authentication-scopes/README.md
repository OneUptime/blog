# How to Fix `Request Had Insufficient Authentication Scopes` on a GCE VM with Correct IAM Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Compute Engine, IAM, OAuth, Service Accounts

Description: Fix OAuth scope denials on Compute Engine by using cloud-platform scope while keeping authorization least-privilege with IAM roles.

---

A Compute Engine VM can have the correct IAM role and still receive this response:

```text
Request had insufficient authentication scopes
```

For OAuth-based calls made with the VM's attached service account, authorization has two controls:

1. IAM roles granted to the attached service account.
2. Legacy OAuth access scopes configured on the VM.

Both controls must allow the operation. An IAM role cannot widen a token minted with a narrow VM access scope, and an access scope cannot grant an IAM permission the service account does not have.

## Inspect the attached identity and scopes

From an administrative workstation, describe the VM:

```bash
PROJECT_ID='example-compute-project'
ZONE='us-central1-a'
VM='automation-runner-1'

gcloud compute instances describe "${VM}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --format='yaml(serviceAccounts)'
```

The output shows the attached service account email and its VM access scopes. Look for this scope:

```text
https://www.googleapis.com/auth/cloud-platform
```

Inside the VM, the metadata server exposes the same information without exposing an access token:

```bash
METADATA_BASE='http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default'

curl --fail --silent --show-error \
  --header 'Metadata-Flavor: Google' \
  "${METADATA_BASE}/email"

curl --fail --silent --show-error \
  --header 'Metadata-Flavor: Google' \
  "${METADATA_BASE}/scopes"
```

Service account emails and scope names are not bearer credentials, but still avoid publishing infrastructure details unnecessarily. Never print `${METADATA_BASE}/token` into logs.

## Confirm which credentials the application uses

The VM's scopes matter when the request uses credentials from its attached service account. Application Default Credentials checks `GOOGLE_APPLICATION_CREDENTIALS` before the metadata server. A gcloud CLI installation can also have a separately logged-in user account.

Check for overrides without printing credential content:

```bash
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]; then
  echo 'GOOGLE_APPLICATION_CREDENTIALS is set'
fi

gcloud auth list
```

If the application uses a credential file or an interactive gcloud user, diagnose that credential source separately. Do not change VM scopes when the failing token did not come from the VM's metadata server.

## Why the IAM role is not enough

Suppose the service account has `roles/storage.objectAdmin`, but the VM has only the read-only Cloud Storage scope:

```text
https://www.googleapis.com/auth/devstorage.read_only
```

OAuth requests from gcloud and many client libraries can read objects but cannot write them. The IAM role allows writes, while the token scope narrows the request to read-only.

Compute Engine recommends setting the VM's `cloud-platform` scope and enforcing least privilege with IAM. The `cloud-platform` scope lets the token request Google Cloud APIs, but it does not bypass IAM. The service account can still perform only actions allowed by its IAM policies, deny policies, principal access boundary policies, and service-specific controls.

Access scopes apply to default OAuth scopes for gcloud and client-library requests. Compute Engine documents that they do not apply to gRPC calls, which can explain protocol-dependent behavior. IAM applies regardless.

## Change an existing VM safely

Changing a VM's attached service account or access scopes requires stopping the VM. Plan a maintenance window and review the workload's shutdown, availability, storage, and restart behavior first.

Capture and verify the current service account before the stop:

```bash
VM_SERVICE_ACCOUNT="$(
  gcloud compute instances describe "${VM}" \
    --project="${PROJECT_ID}" \
    --zone="${ZONE}" \
    --format='value(serviceAccounts[0].email)'
)"

test -n "${VM_SERVICE_ACCOUNT}"
printf '%s\n' "${VM_SERVICE_ACCOUNT}"
```

Then stop, update, and restart the instance:

```bash
gcloud compute instances stop "${VM}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}"

gcloud compute instances set-service-account "${VM}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --service-account="${VM_SERVICE_ACCOUNT}" \
  --scopes=cloud-platform

gcloud compute instances start "${VM}" \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}"
```

The operator needs `compute.instances.stop`, `compute.instances.setServiceAccount`, and `compute.instances.start`. Attaching a service account also requires permission to act as that service account, commonly through `roles/iam.serviceAccountUser`. Use a change process that preserves the existing service account unless an identity change is explicitly intended.

## Keep IAM least-privilege

After widening the OAuth scope, verify the attached service account's IAM grants on the actual target resource. Remove unrelated broad roles and grant only the permissions the workload needs.

For example, a workload that reads objects from one bucket should normally receive a read role scoped to that bucket, not project Editor. `cloud-platform` does not make this least-privilege IAM review optional.

Also confirm that the required API is enabled. API enablement, OAuth scope, and IAM permission are three separate checks.

Do not create a service account key as a workaround. The metadata server already supplies short-lived credentials tied to the VM's attached identity without placing a private key on disk.

## Update managed instance groups through the template

If the VM belongs to a managed instance group, changing one instance creates configuration drift and a later repair or recreation can remove the fix. Update or replace the group's instance template with the intended user-managed service account and `cloud-platform` scope, then roll out replacement instances with the group's documented update controls.

Test the new template on a controlled subset, respect surge and unavailable limits, and verify scopes on a replacement instance before completing the rollout.

For new standalone VMs, specify both identity and scope at creation:

```bash
gcloud compute instances create NEW_VM_NAME \
  --project="${PROJECT_ID}" \
  --zone="${ZONE}" \
  --service-account='workload@example-compute-project.iam.gserviceaccount.com' \
  --scopes=cloud-platform
```

Grant the service account's IAM roles separately on the resources it must access.

## Validate both authorization layers

After restart, confirm the metadata scope list contains `cloud-platform`. Then repeat a low-risk form of the failing API operation and check its audit log identity.

Interpret the next result carefully:

- If the insufficient-scope error is gone but a permission-denied error remains, fix the specific IAM permission on the target resource.
- If the error persists, verify that the application actually uses the metadata-server credential and that a proxy or delegated credential flow is not involved.
- If the call succeeds only through gRPC, remember that Compute Engine documents different access-scope behavior for gRPC and OAuth-based calls.

This staged validation avoids compensating for a scope error with an overly broad IAM role.

## Official Documentation

- [Compute Engine service accounts and access scopes](https://cloud.google.com/compute/docs/access/service-accounts#accesscopesiam)
- [Change a VM service account and access scopes](https://cloud.google.com/compute/docs/instances/change-service-account)
- [Create a VM with a user-managed service account](https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances)
- [gcloud compute instances set-service-account](https://cloud.google.com/sdk/gcloud/reference/compute/instances/set-service-account)
- [Troubleshoot insufficient scopes for GKE access](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/kubectl#insufficient_authentication_scopes)
- [Roll out updates to managed instance groups](https://cloud.google.com/compute/docs/instance-groups/rolling-out-updates-to-managed-instance-groups)

## Conclusion

On a Compute Engine VM, correct IAM roles can still be narrowed by legacy OAuth scopes. Verify that the failing credential comes from the attached service account, set the recommended `cloud-platform` scope during a controlled stop and restart, and keep authorization narrow with IAM. For managed groups, make the change in the instance template so it survives replacement.
