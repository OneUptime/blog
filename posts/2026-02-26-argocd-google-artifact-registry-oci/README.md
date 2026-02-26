# How to Use Google Artifact Registry with ArgoCD OCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Google Cloud, OCI

Description: Learn how to configure Google Artifact Registry as an OCI source for ArgoCD Helm chart deployments, including Workload Identity, service account authentication, and cross-project access.

---

Google Artifact Registry is Google Cloud's recommended container and artifact registry. It supports OCI artifacts natively, making it a great choice for storing Helm charts alongside your container images. This guide covers how to set up Artifact Registry as an OCI source for ArgoCD, with authentication options ranging from service account keys to GKE Workload Identity.

## Setting Up Artifact Registry for Helm Charts

First, create an Artifact Registry repository in Docker format (OCI artifacts use the Docker format):

```bash
# Create a Docker-format repository for Helm charts
gcloud artifacts repositories create helm-charts \
  --repository-format=docker \
  --location=us-central1 \
  --description="Helm charts for ArgoCD deployments"

# Verify the repository was created
gcloud artifacts repositories list --location=us-central1
```

The repository URL follows this pattern:
```
LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY_NAME
```

For example: `us-central1-docker.pkg.dev/my-project/helm-charts`

## Pushing Charts to Artifact Registry

```bash
# Authenticate Helm with Artifact Registry
gcloud auth print-access-token | \
  helm registry login -u oauth2accesstoken --password-stdin \
  us-central1-docker.pkg.dev

# Package your chart
helm package ./my-app
# Creates my-app-1.0.0.tgz

# Push to Artifact Registry
helm push my-app-1.0.0.tgz \
  oci://us-central1-docker.pkg.dev/my-project/helm-charts

# Verify the chart was pushed
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/helm-charts/my-app \
  --include-tags
```

## Authentication Method 1: Service Account Key (Simple)

Create a service account with Artifact Registry Reader access:

```bash
# Create service account
gcloud iam service-accounts create argocd-gar-reader \
  --display-name="ArgoCD Artifact Registry Reader"

# Grant read access to the specific repository
gcloud artifacts repositories add-iam-policy-binding helm-charts \
  --location=us-central1 \
  --member="serviceAccount:argocd-gar-reader@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Create and download a key
gcloud iam service-accounts keys create gar-key.json \
  --iam-account=argocd-gar-reader@my-project.iam.gserviceaccount.com
```

Register the credentials with ArgoCD:

```bash
# Register using the CLI
argocd repo add us-central1-docker.pkg.dev/my-project/helm-charts \
  --type helm \
  --enable-oci \
  --username _json_key \
  --password "$(cat gar-key.json)"
```

Or create a Kubernetes Secret:

```yaml
# gar-oci-creds.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gar-oci-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: gar-helm-charts
  url: us-central1-docker.pkg.dev/my-project/helm-charts
  enableOCI: "true"
  username: _json_key
  password: |
    {
      "type": "service_account",
      "project_id": "my-project",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "argocd-gar-reader@my-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
```

```bash
kubectl apply -f gar-oci-creds.yaml
```

## Authentication Method 2: Workload Identity (Recommended for GKE)

Workload Identity is the recommended approach for GKE clusters. It eliminates the need for service account keys by linking Kubernetes ServiceAccounts to Google Cloud service accounts.

Step 1: Enable Workload Identity on your GKE cluster (if not already enabled):

```bash
gcloud container clusters update my-cluster \
  --workload-pool=my-project.svc.id.goog \
  --zone=us-central1-a
```

Step 2: Create and configure the Google Cloud service account:

```bash
# Create the service account
gcloud iam service-accounts create argocd-repo-server \
  --display-name="ArgoCD Repo Server"

# Grant Artifact Registry Reader role
gcloud artifacts repositories add-iam-policy-binding helm-charts \
  --location=us-central1 \
  --member="serviceAccount:argocd-repo-server@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Allow the Kubernetes ServiceAccount to impersonate the Google Cloud SA
gcloud iam service-accounts add-iam-policy-binding \
  argocd-repo-server@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[argocd/argocd-repo-server]"
```

Step 3: Annotate the ArgoCD repo server's Kubernetes ServiceAccount:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-repo-server
  namespace: argocd
  annotations:
    iam.gke.io/gcp-service-account: argocd-repo-server@my-project.iam.gserviceaccount.com
```

```bash
kubectl annotate serviceaccount argocd-repo-server -n argocd \
  iam.gke.io/gcp-service-account=argocd-repo-server@my-project.iam.gserviceaccount.com
```

Step 4: Even with Workload Identity, ArgoCD still needs a repository secret to know about the OCI registry. Use an access token refresher or register with a placeholder:

```yaml
# Token refresher CronJob for Workload Identity
apiVersion: batch/v1
kind: CronJob
metadata:
  name: gar-token-refresher
  namespace: argocd
spec:
  schedule: "0 */1 * * *"  # Every hour (tokens expire after 1 hour)
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-repo-server
          containers:
            - name: refresher
              image: google/cloud-sdk:slim
              command:
                - /bin/bash
                - -c
                - |
                  set -euo pipefail

                  TOKEN=$(gcloud auth print-access-token)
                  REGISTRY="us-central1-docker.pkg.dev/my-project/helm-charts"

                  cat <<EOSECRET | kubectl apply -f -
                  apiVersion: v1
                  kind: Secret
                  metadata:
                    name: gar-oci-token
                    namespace: argocd
                    labels:
                      argocd.argoproj.io/secret-type: repository
                  type: Opaque
                  stringData:
                    type: helm
                    name: gar-helm-charts
                    url: "${REGISTRY}"
                    enableOCI: "true"
                    username: oauth2accesstoken
                    password: "${TOKEN}"
                  EOSECRET
          restartPolicy: OnFailure
```

## Creating the ArgoCD Application

With authentication configured, create your application:

```yaml
# my-app-gar.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: us-central1-docker.pkg.dev/my-project/helm-charts
    chart: my-app
    targetRevision: 1.0.0
    helm:
      releaseName: my-app
      valuesObject:
        replicaCount: 3
        image:
          repository: us-central1-docker.pkg.dev/my-project/images/my-app
          tag: v2.1.0
        service:
          type: ClusterIP
          port: 8080
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Multi-Source with GAR

Combine GAR-hosted Helm charts with values from Cloud Source Repositories or GitHub:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  sources:
    # Helm chart from Artifact Registry
    - repoURL: us-central1-docker.pkg.dev/my-project/helm-charts
      chart: my-app
      targetRevision: 1.0.0
      helm:
        releaseName: my-app
        valueFiles:
          - $config/apps/my-app/production-values.yaml

    # Values from a Git repository
    - repoURL: https://github.com/your-org/helm-values.git
      targetRevision: main
      ref: config

  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Cross-Project Access

To allow ArgoCD in one project to pull charts from another project's Artifact Registry:

```bash
# Grant cross-project read access
gcloud artifacts repositories add-iam-policy-binding helm-charts \
  --project=source-project \
  --location=us-central1 \
  --member="serviceAccount:argocd-repo-server@consumer-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

## Multi-Region Configuration

Artifact Registry supports multi-region repositories. Use a region close to your GKE cluster:

```bash
# Create in multiple regions
gcloud artifacts repositories create helm-charts \
  --repository-format=docker \
  --location=us \
  --description="Multi-region Helm charts"
```

The URL format for multi-region is:
```
us-docker.pkg.dev/my-project/helm-charts
```

## CI/CD Pipeline for GAR Publishing

```yaml
# cloudbuild.yaml - Cloud Build pipeline
steps:
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        gcloud auth print-access-token | \
        helm registry login -u oauth2accesstoken --password-stdin \
        us-central1-docker.pkg.dev

  - name: 'alpine/helm:latest'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        VERSION=$(cat VERSION)
        helm package charts/my-app --version $VERSION
        helm push my-app-${VERSION}.tgz \
          oci://us-central1-docker.pkg.dev/${PROJECT_ID}/helm-charts
```

## Troubleshooting

```bash
# Test chart pull manually
gcloud auth print-access-token | \
  helm registry login -u oauth2accesstoken --password-stdin \
  us-central1-docker.pkg.dev

helm pull oci://us-central1-docker.pkg.dev/my-project/helm-charts/my-app \
  --version 1.0.0

# List chart versions in the repository
gcloud artifacts docker tags list \
  us-central1-docker.pkg.dev/my-project/helm-charts/my-app

# Check ArgoCD repo server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server \
  --tail=100 | grep -i "gar\|artifact\|401\|403"

# Verify the repository secret
kubectl get secret gar-oci-creds -n argocd -o yaml

# Test Workload Identity
kubectl run test-wi --rm -it --restart=Never \
  --serviceaccount=argocd-repo-server -n argocd \
  --image=google/cloud-sdk:slim -- \
  gcloud auth print-access-token
```

Common issues:
- **Permission denied** - Check that the service account has `roles/artifactregistry.reader`
- **Repository not found** - Verify the URL format: `LOCATION-docker.pkg.dev/PROJECT/REPO`
- **Token expired** - Ensure the token refresher CronJob is running
- **Workload Identity not working** - Verify the GKE nodepool has Workload Identity enabled

For more on OCI registries with ArgoCD, see [authenticating with OCI registries](https://oneuptime.com/blog/post/2026-02-26-argocd-authenticate-oci-registries/view) and [pulling Helm charts from OCI registries](https://oneuptime.com/blog/post/2026-02-26-argocd-pull-helm-charts-oci-registries/view).
