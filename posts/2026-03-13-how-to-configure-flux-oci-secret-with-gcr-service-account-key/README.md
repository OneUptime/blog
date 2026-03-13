# How to Configure Flux OCI Secret with GCR Service Account Key

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, OCI, GCR, Google Cloud, Container Registry

Description: A step-by-step guide to configuring Flux CD to authenticate with Google Container Registry using a GCP service account key for OCI artifact pulls.

---

## Introduction

Flux CD supports pulling Helm charts and other OCI artifacts directly from container registries. When working with Google Container Registry (GCR) or Google Artifact Registry, you need to provide Flux with valid credentials so the source controller can fetch your OCI artifacts. This guide walks through creating and configuring a Kubernetes secret that allows Flux to authenticate with GCR using a GCP service account key.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- `kubectl` configured to access your cluster
- A GCP service account with appropriate permissions (e.g., `roles/artifactregistry.reader` or `roles/storage.objectViewer` for legacy GCR)
- A JSON key file for the service account
- The `flux` CLI installed

## Step 1: Create the GCP Service Account

If you do not already have a service account, create one with the required permissions.

```bash
# Create the service account
gcloud iam service-accounts create flux-gcr-reader \
  --display-name="Flux GCR Reader"

# Grant read access to Artifact Registry
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:flux-gcr-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Generate the JSON key file
gcloud iam service-accounts keys create gcr-key.json \
  --iam-account=flux-gcr-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Step 2: Create the Kubernetes Secret

Flux expects OCI registry credentials in a dockerconfigjson format. You can create this secret using `kubectl`.

```bash
kubectl create secret docker-registry flux-gcr-secret \
  --namespace=flux-system \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  --docker-email=flux@example.com
```

For Google Artifact Registry, replace the server accordingly:

```bash
kubectl create secret docker-registry flux-gar-secret \
  --namespace=flux-system \
  --docker-server=us-docker.pkg.dev \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  --docker-email=flux@example.com
```

## Step 3: Alternatively Create the Secret from a YAML Manifest

If you prefer a declarative approach, first encode the docker config JSON:

```bash
# Build the dockerconfigjson payload
SA_KEY=$(cat gcr-key.json | base64 -w 0)
AUTH=$(echo -n "_json_key:$(cat gcr-key.json)" | base64 -w 0)

cat <<EOF > flux-gcr-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: flux-gcr-secret
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $(echo -n '{"auths":{"gcr.io":{"username":"_json_key","password":"'"$(cat gcr-key.json | tr -d '\n')"'","auth":"'"${AUTH}"'"}}}' | base64 -w 0)
EOF
```

Apply the manifest:

```bash
kubectl apply -f flux-gcr-secret.yaml
```

## Step 4: Reference the Secret in an OCIRepository

Create an `OCIRepository` resource that references the secret for authentication.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: my-app-charts
  namespace: flux-system
spec:
  interval: 10m
  url: oci://gcr.io/YOUR_PROJECT_ID/charts/my-app
  ref:
    tag: "1.0.0"
  secretRef:
    name: flux-gcr-secret
```

Apply the resource:

```bash
kubectl apply -f oci-repository.yaml
```

## Step 5: Reference the Secret in a HelmRepository (OCI)

If you are using Helm charts stored in an OCI-compatible registry, configure a `HelmRepository` with type `oci`.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-gcr-helm-repo
  namespace: flux-system
spec:
  type: oci
  interval: 10m
  url: oci://gcr.io/YOUR_PROJECT_ID/charts
  secretRef:
    name: flux-gcr-secret
```

## Step 6: Verify the Configuration

Check that Flux can successfully pull from the registry.

```bash
# Check the OCIRepository status
kubectl get ocirepository -n flux-system my-app-charts

# Describe the resource for detailed status
kubectl describe ocirepository -n flux-system my-app-charts

# Check for events
kubectl events -n flux-system --for ocirepository/my-app-charts
```

A successful configuration shows a `Ready` condition with status `True`.

```bash
# Force a reconciliation to test immediately
flux reconcile source oci my-app-charts
```

## Troubleshooting

### Authentication Errors

If you see `401 Unauthorized` errors, verify the secret contents:

```bash
kubectl get secret flux-gcr-secret -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | jq .
```

Confirm the username is `_json_key` and the password is the full JSON key content.

### Wrong Registry Hostname

Make sure the server in the secret matches the registry URL:

- Legacy GCR: `gcr.io`, `us.gcr.io`, `eu.gcr.io`, `asia.gcr.io`
- Artifact Registry: `us-docker.pkg.dev`, `europe-docker.pkg.dev`, `asia-docker.pkg.dev`

### Permission Issues

Verify the service account has the correct IAM role:

```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:flux-gcr-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

## Security Best Practices

- Use a dedicated service account with minimal read-only permissions.
- Rotate the service account key periodically and update the Kubernetes secret.
- Consider using Workload Identity instead of long-lived JSON keys when running on GKE.
- Store the service account key securely and delete the local copy after creating the secret.
- Use a tool like Sealed Secrets or External Secrets Operator to manage the secret declaratively in Git.

## Conclusion

Configuring Flux to authenticate with GCR using a service account key involves creating a `dockerconfigjson` secret and referencing it from your `OCIRepository` or `HelmRepository` resources. This approach gives Flux the credentials it needs to pull OCI artifacts from private Google registries while keeping your GitOps workflow intact.
