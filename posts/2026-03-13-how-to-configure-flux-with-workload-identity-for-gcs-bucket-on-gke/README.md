# How to Configure Flux with Workload Identity for GCS Bucket on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GCP, GKE, Workload Identity, GCS, Cloud Storage, Bucket

Description: Learn how to configure Flux to use a Google Cloud Storage bucket as a source for Kubernetes manifests using GKE Workload Identity for keyless authentication.

---

Flux supports Google Cloud Storage buckets as a source for Kubernetes manifests and Kustomize overlays. Instead of creating static credentials and storing them as Kubernetes secrets, you can use GKE Workload Identity to let the Flux source-controller authenticate to GCS automatically. This guide covers the end-to-end configuration.

## Prerequisites

Before you begin, ensure you have the following:

- A GKE cluster with Workload Identity enabled
- Flux installed on the cluster (v2.0 or later)
- Google Cloud CLI (`gcloud`) configured with appropriate permissions
- A GCS bucket containing your Kubernetes manifests
- `kubectl` configured to access your GKE cluster

## Step 1: Create a GCS Bucket for Manifests

Create a bucket to store your Kubernetes manifests:

```bash
gcloud storage buckets create gs://my-flux-manifests \
  --location=us-central1 \
  --uniform-bucket-level-access
```

Upload your manifests to the bucket:

```bash
gsutil cp -r ./manifests/* gs://my-flux-manifests/
```

## Step 2: Create a Google Cloud Service Account

Create a service account that Flux will use to read from the bucket:

```bash
gcloud iam service-accounts create flux-gcs-reader \
  --display-name="Flux GCS Bucket Reader"
```

Grant the service account read access to the bucket:

```bash
gcloud storage buckets add-iam-policy-binding gs://my-flux-manifests \
  --member="serviceAccount:flux-gcs-reader@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

## Step 3: Bind the Kubernetes Service Account to the GCP Service Account

Create the Workload Identity binding so the Flux source-controller can impersonate the GCP service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  flux-gcs-reader@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[flux-system/source-controller]"
```

## Step 4: Annotate the Flux Kubernetes Service Account

Add the Workload Identity annotation to the source-controller service account:

```bash
kubectl annotate serviceaccount source-controller \
  --namespace=flux-system \
  iam.gke.io/gcp-service-account=flux-gcs-reader@my-project.iam.gserviceaccount.com
```

Restart the source-controller to pick up the new identity:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
```

## Step 5: Define the Bucket Source

Create a `Bucket` resource that points to your GCS bucket. Set the provider to `gcp` to use Workload Identity:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: Bucket
metadata:
  name: my-manifests
  namespace: flux-system
spec:
  interval: 5m
  provider: gcp
  bucketName: my-flux-manifests
  region: us-central1
```

The `provider: gcp` field tells the source-controller to use GCP metadata-based authentication rather than looking for a secret reference.

## Step 6: Create a Kustomization That Uses the Bucket

Create a `Kustomization` resource to deploy the manifests from the bucket:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: Bucket
    name: my-manifests
  path: ./app
  prune: true
  targetNamespace: default
```

## Step 7: Organize Your Bucket Contents

Structure your manifests in the bucket so Flux can apply them with Kustomize. A typical layout:

```bash
gs://my-flux-manifests/
  app/
    kustomization.yaml
    deployment.yaml
    service.yaml
  monitoring/
    kustomization.yaml
    prometheus.yaml
```

Each directory should contain a `kustomization.yaml` file:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

## Step 8: Apply and Verify

Apply the Flux resources:

```bash
kubectl apply -f bucket.yaml
kubectl apply -f kustomization.yaml
```

Check the Bucket source status:

```bash
kubectl get bucket my-manifests -n flux-system
```

You should see `READY: True` and an artifact revision. Check the Kustomization status:

```bash
kubectl get kustomization my-app -n flux-system
```

If the Bucket is not becoming ready, check the source-controller logs:

```bash
kubectl logs deployment/source-controller -n flux-system | grep -i "bucket\|gcs\|error"
```

## Step 9: Update Manifests via CI/CD

You can integrate bucket updates into your CI/CD pipeline. When manifests change, upload them to the bucket and Flux will detect the changes on the next reconciliation:

```bash
# In your CI/CD pipeline
gsutil rsync -r -d ./manifests/ gs://my-flux-manifests/
```

Flux polls the bucket at the interval specified in the Bucket resource. To trigger an immediate reconciliation:

```bash
flux reconcile source bucket my-manifests
```

## Troubleshooting

### Common Issues

**Error: storage: bucket doesn't exist**: Double-check the `bucketName` field matches the actual GCS bucket name exactly (without the `gs://` prefix).

**Error: could not get credentials**: Verify the Workload Identity binding exists and the annotation on the source-controller service account is correct:

```bash
kubectl get serviceaccount source-controller -n flux-system -o yaml | grep annotations -A 5
```

**Bucket shows ready but Kustomization fails**: Check that the `path` in the Kustomization matches a directory in the bucket that contains a valid `kustomization.yaml`.

**Stale artifacts**: If you update the bucket but Flux does not pick up changes, the content hash may not have changed. Ensure you are replacing files rather than appending, and check the reconciliation interval.

## Summary

Using GCS buckets as a Flux source provides a simple way to distribute Kubernetes manifests without requiring a Git repository. Combined with Workload Identity, this setup eliminates the need for static credentials while following GCP security best practices. This pattern works well for distributing shared configurations, generated manifests from CI/CD pipelines, or artifacts produced by other tools.
