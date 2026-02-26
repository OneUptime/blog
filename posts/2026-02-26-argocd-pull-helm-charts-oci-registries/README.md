# How to Pull Helm Charts from OCI Container Registries in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, OCI

Description: Learn how to configure ArgoCD to pull and deploy Helm charts stored in OCI-compliant container registries with step-by-step examples and troubleshooting tips.

---

Helm charts stored in OCI container registries are the modern way to distribute Kubernetes packages. Instead of maintaining a separate Helm repository with an index.yaml file, you push charts to the same container registries that hold your Docker images. ArgoCD supports pulling Helm charts from OCI registries natively, and this guide walks through the complete setup from registry configuration to deployment.

## Prerequisites

Before starting, you need:

- ArgoCD v2.4 or later (OCI support was added in v2.4)
- A Helm chart published to an OCI registry
- Registry credentials (for private registries)
- The ArgoCD CLI installed

Verify your ArgoCD version supports OCI:

```bash
argocd version --client
# Should be v2.4.0 or later
```

## Publishing a Chart to OCI

First, let us push a chart so we have something to deploy. If you already have charts in OCI, skip to the next section.

```bash
# Create a sample chart
helm create my-web-app
cd my-web-app

# Edit Chart.yaml to set the version
# version: 0.1.0

# Package the chart
cd ..
helm package my-web-app
# Creates my-web-app-0.1.0.tgz

# Login to your OCI registry
helm registry login ghcr.io -u your-username -p your-token

# Push to the registry
helm push my-web-app-0.1.0.tgz oci://ghcr.io/your-org/charts

# Verify the push worked
helm show chart oci://ghcr.io/your-org/charts/my-web-app --version 0.1.0
```

## Step 1: Register the OCI Registry with ArgoCD

ArgoCD needs to know about the registry before it can pull charts from it:

```bash
# For public registries (no authentication)
argocd repo add ghcr.io/your-org/charts \
  --type helm \
  --name ghcr-charts \
  --enable-oci

# For private registries with username/token
argocd repo add ghcr.io/your-org/charts \
  --type helm \
  --name ghcr-charts \
  --enable-oci \
  --username your-username \
  --password ghp_your_github_token
```

Or declaratively using a Kubernetes Secret:

```yaml
# oci-registry-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-oci-registry
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: ghcr-charts
  url: ghcr.io/your-org/charts
  enableOCI: "true"
  username: your-username
  password: ghp_your_github_token
```

```bash
kubectl apply -f oci-registry-secret.yaml
```

Verify the registration:

```bash
argocd repo list
# Should show the OCI registry with type "helm" and OCI enabled
```

## Step 2: Create the ArgoCD Application

```yaml
# my-web-app.yaml - Deploy Helm chart from OCI registry
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: ghcr.io/your-org/charts  # Registry URL (no oci:// prefix)
    chart: my-web-app                   # Chart name
    targetRevision: 0.1.0               # Chart version (OCI tag)
    helm:
      releaseName: my-web-app
      valuesObject:
        replicaCount: 2
        image:
          repository: ghcr.io/your-org/images/my-web-app
          tag: latest
        service:
          type: ClusterIP
          port: 80
        ingress:
          enabled: true
          hosts:
            - host: my-web-app.example.com
              paths:
                - path: /
                  pathType: Prefix
  destination:
    server: https://kubernetes.default.svc
    namespace: my-web-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```bash
kubectl apply -f my-web-app.yaml
```

Or use the CLI:

```bash
argocd app create my-web-app \
  --repo ghcr.io/your-org/charts \
  --helm-chart my-web-app \
  --revision 0.1.0 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-web-app \
  --helm-set replicaCount=2 \
  --helm-set image.tag=latest \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --sync-option CreateNamespace=true
```

## Step 3: Verify the Deployment

```bash
# Check application status
argocd app get my-web-app

# View the rendered Helm manifests
argocd app manifests my-web-app

# List deployed resources
argocd app resources my-web-app

# Check pods are running
kubectl get pods -n my-web-app
```

## Working with Common OCI Registries

### Docker Hub

```yaml
source:
  repoURL: registry-1.docker.io/your-org
  chart: my-chart
  targetRevision: 1.0.0
```

```bash
argocd repo add registry-1.docker.io/your-org \
  --type helm --enable-oci \
  --username your-dockerhub-user \
  --password your-dockerhub-token
```

### GitHub Container Registry (GHCR)

```yaml
source:
  repoURL: ghcr.io/your-org/charts
  chart: my-chart
  targetRevision: 1.0.0
```

```bash
argocd repo add ghcr.io/your-org/charts \
  --type helm --enable-oci \
  --username your-github-user \
  --password ghp_your_token
```

### AWS ECR

```yaml
source:
  repoURL: 123456789012.dkr.ecr.us-east-1.amazonaws.com
  chart: my-chart
  targetRevision: 1.0.0
```

```bash
# Get ECR login token
TOKEN=$(aws ecr get-login-password --region us-east-1)

argocd repo add 123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --type helm --enable-oci \
  --username AWS \
  --password "$TOKEN"
```

### Google Artifact Registry

```yaml
source:
  repoURL: us-central1-docker.pkg.dev/my-project/charts
  chart: my-chart
  targetRevision: 1.0.0
```

```bash
argocd repo add us-central1-docker.pkg.dev/my-project/charts \
  --type helm --enable-oci \
  --username _json_key \
  --password "$(cat service-account.json)"
```

### Azure Container Registry (ACR)

```yaml
source:
  repoURL: myregistry.azurecr.io/charts
  chart: my-chart
  targetRevision: 1.0.0
```

```bash
argocd repo add myregistry.azurecr.io/charts \
  --type helm --enable-oci \
  --username my-sp-app-id \
  --password my-sp-password
```

## Upgrading Chart Versions

To upgrade a chart, update the `targetRevision`:

```bash
# Update the chart version via CLI
argocd app set my-web-app --revision 0.2.0

# Or update the Application YAML and apply
# Change targetRevision: 0.1.0 -> targetRevision: 0.2.0
kubectl apply -f my-web-app.yaml

# Sync if auto-sync is not enabled
argocd app sync my-web-app
```

## Using Helm Parameters and Values

OCI-sourced Helm charts support the same parameter configuration as regular Helm sources:

```yaml
source:
  repoURL: ghcr.io/your-org/charts
  chart: my-web-app
  targetRevision: 0.1.0
  helm:
    releaseName: my-web-app

    # Inline values (YAML)
    valuesObject:
      global:
        environment: production

    # Individual parameter overrides
    parameters:
      - name: replicaCount
        value: "5"
      - name: image.tag
        value: v2.1.0

    # Skip CRD installation
    skipCrds: false

    # Pass --atomic to Helm
    # (not directly supported in source, but available via sync options)
```

## Troubleshooting OCI Chart Pull Issues

### Error: repository not found

```bash
# Verify the repo is registered with OCI enabled
argocd repo list | grep "your-org"

# Re-add with --enable-oci
argocd repo add ghcr.io/your-org/charts --type helm --enable-oci
```

### Error: authentication required

```bash
# Test authentication outside ArgoCD
helm registry login ghcr.io -u your-user -p your-token
helm pull oci://ghcr.io/your-org/charts/my-chart --version 0.1.0

# Update credentials in ArgoCD
argocd repo add ghcr.io/your-org/charts \
  --type helm --enable-oci \
  --username your-user --password new-token \
  --upsert  # Update existing entry
```

### Error: manifest unknown

```bash
# The chart or version does not exist in the registry
# Verify it exists
helm show chart oci://ghcr.io/your-org/charts/my-chart --version 0.1.0

# List available tags
# Using crane
crane ls ghcr.io/your-org/charts/my-chart
```

### Error: unexpected media type

```bash
# The artifact was not pushed as a Helm chart
# Ensure you used "helm push" not "docker push"
helm push my-chart-0.1.0.tgz oci://ghcr.io/your-org/charts
```

### Checking Repo Server Logs

```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server \
  --tail=100 | grep -i "oci\|helm\|error\|ghcr"
```

## Best Practices

**Always use explicit versions** - Never use floating tags like `latest` for Helm charts in production.

**Automate chart publishing** - Push charts from CI/CD pipelines, not manually.

**Use the same registry for images and charts** - This simplifies authentication and network policies.

**Monitor chart pull errors** - Set up alerts for ArgoCD application sync failures related to OCI pull errors.

**Cache OCI artifacts** - If your ArgoCD cluster is in a private network, consider using a pull-through cache or mirror.

For more on OCI with ArgoCD, see our guides on [OCI artifacts as application sources](https://oneuptime.com/blog/post/2026-02-26-argocd-oci-artifacts-application-sources/view) and [authenticating with OCI registries](https://oneuptime.com/blog/post/2026-02-26-argocd-authenticate-oci-registries/view).
