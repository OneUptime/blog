# How to Deploy the Crossplane GCP Provider with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, GCP, Google Cloud, GitOps, Kubernetes, Provider

Description: Deploy the Crossplane GCP provider using Flux CD GitOps to manage Google Cloud resources directly from Kubernetes manifests.

---

## Introduction

The Crossplane GCP provider transforms your Kubernetes cluster into a Google Cloud control plane. Once deployed, you can create Cloud SQL instances, GCS buckets, GKE clusters, and VPCs by applying YAML manifests—the same way you deploy applications. Flux CD manages the provider lifecycle, ensuring the desired state is always reconciled against the live state of your cluster.

Google Cloud Platform offers robust workload identity features that eliminate the need to manage service account key files. When running Crossplane on GKE, you can configure the provider to use Workload Identity, which binds a Kubernetes service account to a GCP service account automatically. This guide covers both approaches: service account key files for non-GKE environments and Workload Identity for GKE.

## Prerequisites

- Crossplane installed and running on the cluster
- Flux CD bootstrapped
- A GCP project with billing enabled
- `gcloud` CLI, `kubectl`, and `flux` CLIs installed
- Owner or Editor role in the GCP project (for setup; narrow this down for the provider)

## Step 1: Create a GCP Service Account

```bash
# Set your project ID
export PROJECT_ID="my-gcp-project"

# Create a dedicated service account for Crossplane
gcloud iam service-accounts create crossplane-provider \
  --display-name="Crossplane Provider" \
  --project="${PROJECT_ID}"

# Grant the necessary roles (adjust per your needs)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:crossplane-provider@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create and download a key file
gcloud iam service-accounts keys create /tmp/gcp-credentials.json \
  --iam-account="crossplane-provider@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Step 2: Store Credentials as a Kubernetes Secret

```bash
# Create the secret in the crossplane-system namespace
kubectl create secret generic gcp-provider-credentials \
  --from-file=credentials=/tmp/gcp-credentials.json \
  --namespace crossplane-system

# Remove the local key file immediately after creating the secret
rm /tmp/gcp-credentials.json
```

## Step 3: Install the GCP Provider Family

```yaml
# infrastructure/crossplane/providers/gcp/provider.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-family-gcp
spec:
  # Upbound's GCP provider family package
  package: xpkg.upbound.io/upbound/provider-family-gcp:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 3
```

## Step 4: Install GCP Sub-Providers

```yaml
# infrastructure/crossplane/providers/gcp/provider-sql.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-sql
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-sql:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic

---
# infrastructure/crossplane/providers/gcp/provider-storage.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-storage
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-storage:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic

---
# infrastructure/crossplane/providers/gcp/provider-container.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-gcp-container
spec:
  package: xpkg.upbound.io/upbound/provider-gcp-container:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic
```

## Step 5: Configure the GCP ProviderConfig

```yaml
# infrastructure/crossplane/providers/gcp/providerconfig.yaml
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  # Your GCP project ID
  projectID: my-gcp-project
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-provider-credentials
      key: credentials
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/crossplane-providers-gcp.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-providers-gcp
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane/providers/gcp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane
  healthChecks:
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      name: provider-family-gcp
```

## Step 7: Verify the Provider

```bash
# Check provider installation status
kubectl get providers

# Wait for the provider to become healthy
kubectl wait provider/provider-family-gcp \
  --for=condition=Healthy \
  --timeout=5m

# Confirm GCP CRDs are registered
kubectl get crds | grep gcp.upbound.io | wc -l

# Verify the ProviderConfig
kubectl get providerconfig.gcp.upbound.io/default
```

## Best Practices

- Use Workload Identity when running Crossplane on GKE to avoid managing service account key files entirely. Annotate the Crossplane service account with `iam.gke.io/gcp-service-account` to enable automatic credential injection.
- Apply the principle of least privilege: grant only the specific GCP roles needed for the resources you plan to provision. Use custom IAM roles for fine-grained control.
- Rotate service account keys every 90 days and store them using SOPS or External Secrets Operator rather than committing them to Git.
- Enable GCP audit logging for the service account to track all API calls made by Crossplane.
- Use `dependsOn` in the Flux Kustomization to enforce ordering: GCP providers depend on Crossplane being ready first.

## Conclusion

The Crossplane GCP provider is now running and managed through Flux CD. You can provision Google Cloud resources by applying YAML manifests to your cluster. Flux continuously reconciles the provider state, so any drift from the desired configuration is automatically corrected. With the provider in place, the next step is to define Crossplane Compositions that expose GCP resources as higher-level abstractions for your platform teams.
