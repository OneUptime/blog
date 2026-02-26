# How to Configure ArgoCD Image Updater with GCR

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Google Cloud, Image Updater

Description: Learn how to configure ArgoCD Image Updater with Google Container Registry and Artifact Registry for automatic image updates using Workload Identity and service account authentication.

---

Google Cloud offers two container registries: the older Google Container Registry (GCR) and the newer Artifact Registry. Both work with ArgoCD Image Updater, but require Google Cloud authentication. This guide covers configuration for both registries, with a focus on Workload Identity for GKE clusters - the recommended authentication approach.

## GCR vs Artifact Registry

Google recommends Artifact Registry over GCR for new projects. The key differences:

- **GCR**: `gcr.io/project-id/image` - legacy, uses Cloud Storage buckets
- **Artifact Registry**: `us-docker.pkg.dev/project-id/repo-name/image` - newer, more features

Both use the same authentication mechanisms, so the Image Updater setup is similar.

## Authentication Options

### Option 1: Workload Identity (Recommended for GKE)

Workload Identity lets Kubernetes service accounts act as Google Cloud service accounts without managing keys.

#### Step 1: Create a Google Cloud Service Account

```bash
# Create the service account
gcloud iam service-accounts create argocd-image-updater \
  --display-name="ArgoCD Image Updater" \
  --project=my-project

# Grant Artifact Registry Reader role
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:argocd-image-updater@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# For GCR, grant Storage Object Viewer instead
# gcloud projects add-iam-policy-binding my-project \
#   --member="serviceAccount:argocd-image-updater@my-project.iam.gserviceaccount.com" \
#   --role="roles/storage.objectViewer"
```

#### Step 2: Bind Workload Identity

```bash
# Allow the Kubernetes SA to impersonate the Google Cloud SA
gcloud iam service-accounts add-iam-policy-binding \
  argocd-image-updater@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[argocd/argocd-image-updater]"
```

#### Step 3: Annotate the Kubernetes Service Account

```yaml
# argocd-image-updater-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-image-updater
  namespace: argocd
  annotations:
    iam.gke.io/gcp-service-account: argocd-image-updater@my-project.iam.gserviceaccount.com
```

```bash
kubectl apply -f argocd-image-updater-sa.yaml
kubectl rollout restart deployment argocd-image-updater -n argocd
```

### Option 2: Service Account Key (Non-GKE Clusters)

For clusters not running on GKE, use a service account key:

```bash
# Create a key for the service account
gcloud iam service-accounts keys create key.json \
  --iam-account=argocd-image-updater@my-project.iam.gserviceaccount.com

# Create a Kubernetes secret from the key
kubectl create secret generic gcr-credentials \
  -n argocd \
  --from-file=credentials=key.json
```

## Registry Configuration

### For Artifact Registry

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Google Artifact Registry
        api_url: https://us-docker.pkg.dev
        prefix: us-docker.pkg.dev
        credentials: pullsecret:argocd/gcr-credentials
        default: false
```

When using Workload Identity, you may not need explicit credentials in the config. The Image Updater pod will use the Workload Identity token automatically:

```yaml
data:
  registries.conf: |
    registries:
      - name: Google Artifact Registry
        api_url: https://us-docker.pkg.dev
        prefix: us-docker.pkg.dev
        default: false
```

### For Google Container Registry

```yaml
data:
  registries.conf: |
    registries:
      - name: GCR
        api_url: https://gcr.io
        prefix: gcr.io
        credentials: pullsecret:argocd/gcr-credentials
        default: false
```

## Configuring Applications for GCR/Artifact Registry

### Artifact Registry Example

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Track image in Artifact Registry
    argocd-image-updater.argoproj.io/image-list: myapp=us-docker.pkg.dev/my-project/my-repo/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ">=1.0.0"
    # Write back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### GCR Example

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=gcr.io/my-project/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: latest
  argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^main-[a-f0-9]{7}$"
```

### Helm-Based Application

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=us-docker.pkg.dev/my-project/my-repo/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: semver
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/write-back-target: "helmvalues:values-production.yaml"
  argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
  argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
```

## Multi-Region Artifact Registry

Google Artifact Registry supports regional and multi-regional endpoints:

```yaml
data:
  registries.conf: |
    registries:
      - name: AR US
        api_url: https://us-docker.pkg.dev
        prefix: us-docker.pkg.dev
      - name: AR EU
        api_url: https://europe-docker.pkg.dev
        prefix: europe-docker.pkg.dev
      - name: AR Asia
        api_url: https://asia-docker.pkg.dev
        prefix: asia-docker.pkg.dev
```

## Cross-Project Access

If your images are in a different Google Cloud project:

```bash
# Grant the Image Updater service account access to the other project's registry
gcloud projects add-iam-policy-binding source-project \
  --member="serviceAccount:argocd-image-updater@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

## Complete Working Example

Here is a full setup for a production application on GKE using Artifact Registry:

```yaml
# 1. Service Account with Workload Identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-image-updater
  namespace: argocd
  annotations:
    iam.gke.io/gcp-service-account: argocd-image-updater@my-project.iam.gserviceaccount.com
---
# 2. Image Updater Config
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Google Artifact Registry
        api_url: https://us-docker.pkg.dev
        prefix: us-docker.pkg.dev
  log.level: info
---
# 3. ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp-production
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: webapp=us-docker.pkg.dev/my-project/production/webapp
    argocd-image-updater.argoproj.io/webapp.update-strategy: semver
    argocd-image-updater.argoproj.io/webapp.semver-constraint: ">=1.0.0"
    argocd-image-updater.argoproj.io/webapp.allow-tags: "regexp:^[0-9]+\\.[0-9]+\\.[0-9]+$"
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Troubleshooting

**Permission denied errors** - Verify the Workload Identity binding:

```bash
gcloud iam service-accounts get-iam-policy \
  argocd-image-updater@my-project.iam.gserviceaccount.com
```

**Image Updater cannot list tags** - Check that the Artifact Registry Reader role is granted:

```bash
gcloud projects get-iam-policy my-project \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:argocd-image-updater@my-project.iam.gserviceaccount.com"
```

**Workload Identity not working** - Verify the node pool has the Workload Identity metadata server enabled and the pod can access the GKE metadata service.

For monitoring Image Updater operations on GCP, check out the [ArgoCD monitoring guide](https://oneuptime.com/blog/post/2026-02-26-argocd-prometheus-metrics/view) to track update frequency and detect failures.
