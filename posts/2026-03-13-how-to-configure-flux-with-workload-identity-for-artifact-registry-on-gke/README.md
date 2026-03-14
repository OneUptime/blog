# How to Configure Flux with Workload Identity for Artifact Registry on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GCP, GKE, Workload Identity, Artifact Registry, OCI, Helm

Description: Learn how to configure Flux to pull OCI artifacts and Helm charts from Google Artifact Registry using GKE Workload Identity Federation for a keyless, secure setup.

---

When running Flux on Google Kubernetes Engine, you often need to pull Helm charts or OCI artifacts from Google Artifact Registry. Rather than managing static JSON key credentials, you can use GKE Workload Identity Federation to let Flux authenticate to Artifact Registry without any stored secrets. This guide walks through the full setup.

## Prerequisites

Before you begin, ensure you have the following:

- A GKE cluster with Workload Identity enabled
- Flux installed on the cluster (v2.0 or later)
- Google Cloud CLI (`gcloud`) configured with appropriate permissions
- An Artifact Registry repository (Docker or Helm format)
- `kubectl` configured to access your GKE cluster

## Step 1: Enable Workload Identity on Your GKE Cluster

If your cluster does not already have Workload Identity enabled, update it:

```bash
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --workload-pool=my-project.svc.id.goog
```

For existing node pools, update them to use GKE metadata server:

```bash
gcloud container node-pools update default-pool \
  --cluster=my-cluster \
  --region=us-central1 \
  --workload-metadata=GKE_METADATA
```

## Step 2: Create a Google Cloud Service Account

Create a dedicated service account for Flux to use when accessing Artifact Registry:

```bash
gcloud iam service-accounts create flux-artifact-reader \
  --display-name="Flux Artifact Registry Reader"
```

Grant the service account permission to read from Artifact Registry:

```bash
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:flux-artifact-reader@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

## Step 3: Bind the Kubernetes Service Account to the GCP Service Account

Allow the Flux Kubernetes service account in the `flux-system` namespace to impersonate the GCP service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  flux-artifact-reader@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[flux-system/source-controller]"
```

## Step 4: Annotate the Flux Kubernetes Service Account

Annotate the `source-controller` service account so that GKE knows which GCP service account it should impersonate:

```bash
kubectl annotate serviceaccount source-controller \
  --namespace=flux-system \
  iam.gke.io/gcp-service-account=flux-artifact-reader@my-project.iam.gserviceaccount.com
```

After annotating, restart the source-controller so it picks up the new identity:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
```

## Step 5: Create an Artifact Registry Repository

If you do not already have a repository, create one:

```bash
gcloud artifacts repositories create helm-charts \
  --repository-format=docker \
  --location=us-central1 \
  --description="Helm charts for Flux"
```

## Step 6: Define a HelmRepository Using OCI

Create a `HelmRepository` resource that points to your Artifact Registry. With Workload Identity configured, you set the provider to `gcp` so Flux authenticates automatically:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  interval: 5m
  url: oci://us-central1-docker.pkg.dev/my-project/helm-charts
  provider: gcp
```

The `provider: gcp` field tells Flux to use the GCP metadata service for authentication, which integrates with Workload Identity.

## Step 7: Define an OCIRepository Source

If you are pulling generic OCI artifacts rather than Helm charts, use an `OCIRepository` resource:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app
  provider: gcp
  ref:
    tag: latest
```

## Step 8: Create a HelmRelease

With the repository configured, create a `HelmRelease` to deploy a chart from Artifact Registry:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    replicaCount: 2
```

## Step 9: Verify the Setup

Apply the resources and check that Flux can pull from Artifact Registry:

```bash
kubectl apply -f helmrepository.yaml
kubectl apply -f helmrelease.yaml
```

Check the status of the HelmRepository:

```bash
kubectl get helmrepository my-charts -n flux-system
```

You should see `READY: True` if authentication is working. If it shows `False`, inspect the events:

```bash
kubectl describe helmrepository my-charts -n flux-system
```

Check the source-controller logs for any authentication errors:

```bash
kubectl logs deployment/source-controller -n flux-system | grep -i "artifact\|auth\|error"
```

## Troubleshooting

### Common Issues

**Error: failed to get credentials**: Ensure the Workload Identity binding is correct and the service account annotation matches. Verify with:

```bash
gcloud iam service-accounts get-iam-policy \
  flux-artifact-reader@my-project.iam.gserviceaccount.com
```

**Error: permission denied on Artifact Registry**: Confirm the GCP service account has the `roles/artifactregistry.reader` role:

```bash
gcloud projects get-iam-policy my-project \
  --flatten="bindings[].members" \
  --filter="bindings.members:flux-artifact-reader@my-project.iam.gserviceaccount.com"
```

**Pod not picking up Workload Identity**: After annotating the service account, the source-controller pod must be restarted. Also confirm Workload Identity is enabled on the node pool where the pod runs.

## Summary

By combining GKE Workload Identity with Flux's built-in GCP provider support, you can securely pull Helm charts and OCI artifacts from Artifact Registry without managing static credentials. This approach follows GCP security best practices and simplifies credential rotation since there are no keys to rotate.
