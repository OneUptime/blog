# How to Use ArgoCD with Google Artifact Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GCP, Artifact Registry

Description: Learn how to configure ArgoCD to pull container images and OCI Helm charts from Google Artifact Registry, including Workload Identity setup, Image Updater configuration, and multi-project access.

---

Google Artifact Registry is GCP's managed artifact service that stores container images, Helm charts, and other artifacts. Integrating it with ArgoCD requires configuring authentication through Workload Identity and setting up ArgoCD to recognize Artifact Registry as a valid source for both container images and Helm charts.

This guide covers the complete integration of ArgoCD with Google Artifact Registry.

## Understanding Artifact Registry

Artifact Registry replaces the older Google Container Registry (GCR). It supports multiple artifact formats:

- Docker container images
- Helm charts (OCI format)
- npm packages
- Maven artifacts
- Python packages

For ArgoCD, the relevant formats are Docker images and OCI Helm charts.

Registry URL format: `<REGION>-docker.pkg.dev/<PROJECT>/<REPOSITORY>/<IMAGE>`

Example: `us-central1-docker.pkg.dev/my-project/my-repo/my-app:v1.0.0`

## Prerequisites

### Enable Artifact Registry API

```bash
gcloud services enable artifactregistry.googleapis.com
```

### Create a Repository

```bash
# Create a Docker repository
gcloud artifacts repositories create my-docker-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker images for production"

# Create a Helm repository
gcloud artifacts repositories create my-helm-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Helm charts for ArgoCD"
```

## Configuring GKE Node Access

GKE nodes in the same project can pull images from Artifact Registry by default using the node service account. For cross-project access or additional permissions:

```bash
# Grant the node service account access to Artifact Registry
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:my-project.svc.id.goog[default/default]" \
  --role="roles/artifactregistry.reader"
```

For GKE Standard clusters, the default compute service account typically has Artifact Registry read access within the same project.

## Configuring ArgoCD Repo Server for Artifact Registry

### Using Workload Identity

Set up Workload Identity for the ArgoCD repo server to access OCI Helm charts:

```bash
# Create a GCP service account
gcloud iam service-accounts create argocd-repo-server \
  --display-name="ArgoCD Repo Server"

# Grant Artifact Registry reader access
gcloud artifacts repositories add-iam-policy-binding my-helm-repo \
  --location=us-central1 \
  --member="serviceAccount:argocd-repo-server@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Also grant access to Docker repos (for image updater)
gcloud artifacts repositories add-iam-policy-binding my-docker-repo \
  --location=us-central1 \
  --member="serviceAccount:argocd-repo-server@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Bind K8s service account to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  argocd-repo-server@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[argocd/argocd-repo-server]"

# Annotate the K8s service account
kubectl annotate serviceaccount argocd-repo-server \
  -n argocd \
  iam.gke.io/gcp-service-account=argocd-repo-server@my-project.iam.gserviceaccount.com
```

## Using Helm Charts from Artifact Registry

### Push a Chart to Artifact Registry

```bash
# Authenticate Helm to Artifact Registry
gcloud auth print-access-token | helm registry login \
  -u oauth2accesstoken \
  --password-stdin us-central1-docker.pkg.dev

# Push the chart
helm push my-chart-1.0.0.tgz oci://us-central1-docker.pkg.dev/my-project/my-helm-repo
```

### Reference in ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: us-central1-docker.pkg.dev/my-project/my-helm-repo
    chart: my-chart
    targetRevision: 1.0.0
    helm:
      values: |
        replicaCount: 3
        image:
          repository: us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app
          tag: v1.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Register as a Repository in ArgoCD

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: artifact-registry-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: my-helm-repo
  url: us-central1-docker.pkg.dev/my-project/my-helm-repo
  enableOCI: "true"
```

For authentication, Workload Identity on the repo server handles this automatically. If you need explicit credentials (for external clusters), use a credential template:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Credential template for Artifact Registry
  repository.credentials: |
    - url: us-central1-docker.pkg.dev
      type: helm
      enableOCI: true
```

## ArgoCD Image Updater with Artifact Registry

Install and configure ArgoCD Image Updater to watch Artifact Registry for new images:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-image-updater
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://argoproj.github.io/argo-helm
    chart: argocd-image-updater
    targetRevision: 0.9.6
    helm:
      values: |
        config:
          registries:
            - name: Google Artifact Registry
              api_url: https://us-central1-docker.pkg.dev
              prefix: us-central1-docker.pkg.dev
              credentials: ext:/scripts/gar-login.sh
              credsexpire: 30m
              default: true
        serviceAccount:
          annotations:
            iam.gke.io/gcp-service-account: argocd-image-updater@my-project.iam.gserviceaccount.com
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
```

The GAR login script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gar-login-script
  namespace: argocd
data:
  gar-login.sh: |
    #!/bin/sh
    # Use Workload Identity to get an access token
    TOKEN=$(wget -q -O- --header="Metadata-Flavor: Google" \
      "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
    echo "oauth2accesstoken:${TOKEN}"
```

### Configure Application for Image Updates

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: >-
      main=us-central1-docker.pkg.dev/my-project/my-docker-repo/my-api
    argocd-image-updater.argoproj.io/main.update-strategy: semver
    argocd-image-updater.argoproj.io/main.semver-constraint: ">=1.0.0"
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-config.git
    targetRevision: main
    path: apps/my-api/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Multi-Project Access

If you need to pull artifacts from multiple GCP projects:

```bash
# Grant the ArgoCD service account access to another project's Artifact Registry
gcloud artifacts repositories add-iam-policy-binding shared-images \
  --project=shared-project \
  --location=us-central1 \
  --member="serviceAccount:argocd-repo-server@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

In ArgoCD, reference images from multiple projects:

```yaml
# App using images from a shared project
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shared-tool
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/your-org/k8s-config.git
    path: apps/shared-tool
  destination:
    server: https://kubernetes.default.svc
    namespace: tools
```

The deployment manifest references the shared project's registry:

```yaml
spec:
  containers:
    - name: tool
      image: us-central1-docker.pkg.dev/shared-project/shared-images/tool:v2.0.0
```

## Vulnerability Scanning

Artifact Registry provides automatic vulnerability scanning. Block deployments with critical vulnerabilities using a PreSync hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: vuln-scan-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      serviceAccountName: vuln-checker-sa
      containers:
        - name: check
          image: gcr.io/google.com/cloudsdktool/google-cloud-cli:latest
          command:
            - /bin/sh
            - -c
            - |
              # Check for critical vulnerabilities
              CRITICAL=$(gcloud artifacts docker images list \
                us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app \
                --filter="version=v1.0.0" \
                --show-occurrences \
                --format="value(vulnerabilities.critical_count)")

              if [ "$CRITICAL" -gt 0 ]; then
                echo "CRITICAL vulnerabilities found: $CRITICAL"
                echo "Blocking deployment."
                exit 1
              fi

              echo "No critical vulnerabilities. Proceeding with deployment."
      restartPolicy: Never
  backoffLimit: 0
```

## Cleanup Policies

Keep your Artifact Registry clean with cleanup policies:

```bash
# Delete untagged images older than 30 days
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/my-project/my-docker-repo/my-app \
  --filter="NOT tags:*" \
  --older-than=30d \
  --quiet

# Or set up a cleanup policy
gcloud artifacts repositories set-cleanup-policies my-docker-repo \
  --location=us-central1 \
  --policy=cleanup-policy.json
```

```json
[
  {
    "name": "delete-old-untagged",
    "action": {"type": "Delete"},
    "condition": {
      "tagState": "untagged",
      "olderThan": "2592000s"
    }
  },
  {
    "name": "keep-recent-releases",
    "action": {"type": "Keep"},
    "condition": {
      "tagPrefixes": ["v"],
      "newerThan": "7776000s"
    },
    "mostRecentVersions": {
      "keepCount": 20
    }
  }
]
```

## Conclusion

Google Artifact Registry integrates smoothly with ArgoCD when you use Workload Identity for authentication. The key components are: Workload Identity on the repo server for OCI Helm chart access, node-level authentication for container image pulls, and the Image Updater with a GAR login script for automated deployments. With multi-project access configured, you can centralize your artifact storage while deploying across multiple GKE clusters and projects.

For monitoring your ArgoCD deployments and container image health, [OneUptime](https://oneuptime.com) provides unified observability across your GCP infrastructure.
