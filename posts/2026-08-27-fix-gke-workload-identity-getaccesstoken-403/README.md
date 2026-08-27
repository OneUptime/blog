# How to Fix `iam.serviceAccounts.getAccessToken` 403 in GKE Workload Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, GKE, Workload Identity Federation, IAM, Kubernetes

Description: Repair a linked Kubernetes-to-IAM service account configuration by matching the namespace, KSA annotation, and Workload Identity User binding.

---

Google's current name for the feature is Workload Identity Federation for GKE. It lets Pods use Google Cloud APIs without storing service account keys in Kubernetes Secrets.

In the automatic GKE metadata-server flow, this error points to the linked-service-account form of the feature:

```text
Permission 'iam.serviceAccounts.getAccessToken' denied on resource
```

In that form, a Kubernetes ServiceAccount (KSA) impersonates an IAM service account (GSA). The link requires both a KSA annotation and an IAM binding on the GSA. A typo in the namespace, KSA, project, or GSA email breaks the link.

## Record the complete identity mapping

Use explicit values:

```bash
CLUSTER_PROJECT_ID='example-cluster-project'
CLUSTER='production-cluster'
LOCATION='us-central1'
NAMESPACE='payments'
KSA='processor'
GSA_PROJECT_ID='example-identities-project'
GSA='payments-processor@example-identities-project.iam.gserviceaccount.com'
```

The workload-pool project in the IAM member is the cluster project's identity-pool project, not necessarily the project containing the GSA.

Confirm that Workload Identity Federation is enabled:

```bash
gcloud container clusters describe "${CLUSTER}" \
  --project="${CLUSTER_PROJECT_ID}" \
  --region="${LOCATION}" \
  --format='value(workloadIdentityConfig.workloadPool)'
```

Expected output follows this pattern:

```text
example-cluster-project.svc.id.goog
```

For a zonal cluster, use `--zone` instead of `--region`.

Autopilot has Workload Identity Federation enabled. For Standard clusters, first identify the node pool where the affected Pod runs, then verify that the pool uses the GKE metadata server:

```bash
NODE_POOL='application-pool'

gcloud container node-pools describe "${NODE_POOL}" \
  --cluster="${CLUSTER}" \
  --project="${CLUSTER_PROJECT_ID}" \
  --region="${LOCATION}" \
  --format='value(config.workloadMetadataConfig.mode)'
```

## Verify the Pod's Kubernetes ServiceAccount

Check the workload and its ServiceAccount:

```bash
kubectl get pod POD_NAME \
  --namespace="${NAMESPACE}" \
  --output=jsonpath='{.spec.serviceAccountName}{"\n"}'

kubectl get serviceaccount "${KSA}" \
  --namespace="${NAMESPACE}" \
  --output=yaml
```

The Pod must use the intended KSA, not the namespace's `default` ServiceAccount unless that is a deliberate design.

For GSA impersonation, annotate the KSA with the exact GSA email:

```bash
kubectl annotate serviceaccount "${KSA}" \
  --namespace="${NAMESPACE}" \
  "iam.gke.io/gcp-service-account=${GSA}" \
  --overwrite
```

A minimal workload fragment looks like this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: processor
  namespace: payments
spec:
  selector:
    matchLabels:
      app: processor
  template:
    metadata:
      labels:
        app: processor
    spec:
      serviceAccountName: processor
      containers:
        - name: app
          image: us-central1-docker.pkg.dev/example-cluster-project/apps/processor:2026-08-27
```

Changing a Deployment template creates replacement Pods. Existing Pods do not change their service account in place.

## Grant Workload Identity User on the GSA

Construct the KSA member exactly, including namespace and KSA name:

```bash
KSA_MEMBER="serviceAccount:${CLUSTER_PROJECT_ID}.svc.id.goog[${NAMESPACE}/${KSA}]"

gcloud iam service-accounts add-iam-policy-binding "${GSA}" \
  --project="${GSA_PROJECT_ID}" \
  --member="${KSA_MEMBER}" \
  --role='roles/iam.workloadIdentityUser'
```

`roles/iam.workloadIdentityUser` contains `iam.serviceAccounts.getAccessToken`. Grant it on the GSA resource to the intended namespace/KSA identity in the cluster project's workload identity pool. IAM treats KSAs with the same namespace and name in clusters that share this pool as the same identity, so use separate cluster projects or distinct namespace/KSA names when those clusters must not share access. Do not replace it with Owner or broadly grant Service Account Token Creator to every workload.

Inspect the resulting policy:

```bash
gcloud iam service-accounts get-iam-policy "${GSA}" \
  --project="${GSA_PROJECT_ID}" \
  --format=yaml
```

The annotation and binding are directional counterparts. The annotation says which GSA the KSA requests. The binding says that this namespace/KSA identity in the workload identity pool may impersonate that GSA.

## Enable the required API and allow propagation

The IAM Service Account Credentials API must be enabled in the project containing the GKE cluster:

```bash
gcloud services enable iamcredentials.googleapis.com \
  --project="${CLUSTER_PROJECT_ID}"
```

IAM role grants normally propagate in about two minutes but can take seven minutes or longer. Google's GKE troubleshooting guide specifically identifies propagation as a cause of this exact `GenerateAccessToken` 403. In an automated rollout, wait and retry with bounded exponential backoff after creating the binding.

Test from a replacement Pod and discard the token response:

```bash
kubectl exec POD_NAME \
  --namespace="${NAMESPACE}" \
  -- sh -c "curl --fail --silent --show-error \
    --header 'Metadata-Flavor: Google' \
    --output /dev/null \
    --write-out '%{http_code}\\n' \
    'http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token'"
```

Never print the access token into CI output or a support ticket.

## Grant resource access to the GSA separately

The Workload Identity User binding authorizes impersonation. It does not grant access to Cloud Storage, Pub/Sub, Secret Manager, or another target service. Grant the GSA the minimum resource-specific role on the target resource.

If token generation succeeds but an API call returns another `403`, inspect the denied API permission and the GSA's target-resource policy. Do not keep changing the KSA-to-GSA link after impersonation works.

## Distinguish direct access from GSA impersonation

Google recommends granting supported resource roles directly to the federated Kubernetes principal when possible. Direct resource access uses a `principal://` identifier and does not require the GSA annotation or a `GenerateAccessToken` call.

Use GSA impersonation when an API has limitations with federated principal identifiers or when the workload must present an IAM service account identity. Do not mix half of the direct-access configuration with half of the impersonation configuration.

Timeouts and metadata connection errors are also different from the explicit IAM 403. Network policies must allow the documented GKE metadata server address, and the metadata server must reach `sts.googleapis.com`. Diagnose those paths when the error is a timeout rather than `getAccessToken` denied.

## Official Documentation

- [Authenticate to Google Cloud APIs from GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Troubleshoot GKE authentication](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/authentication#iam-service-account-access-denied)
- [About Workload Identity Federation for GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity)
- [IAM Workload Identity User role](https://cloud.google.com/iam/docs/roles-permissions/iam#iam.workloadIdentityUser)
- [IAM access change propagation](https://cloud.google.com/iam/docs/access-change-propagation)

## Conclusion

For the GSA impersonation form of Workload Identity Federation for GKE, match the Pod's KSA, its GSA annotation, and the exact `roles/iam.workloadIdentityUser` member on the GSA. Enable the IAM Credentials API and account for policy propagation. Once token creation works, troubleshoot target-service IAM as a separate authorization layer.
