# How to implement ArgoCD with OCI registries for Helm chart deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Helm, OCI, Container Registry, GitOps

Description: Master deploying Helm charts from OCI registries with ArgoCD, including authentication, chart versioning, and best practices for managing Helm artifacts alongside container images.

---

OCI (Open Container Initiative) registries have become the standard for storing not just container images but also Helm charts. By storing Helm charts in OCI registries, you can use the same infrastructure for both your application images and deployment manifests, simplifying artifact management and leveraging existing registry features like vulnerability scanning and access control.

ArgoCD supports deploying Helm charts directly from OCI registries, enabling a streamlined GitOps workflow where charts are versioned, stored, and deployed alongside your container images. This guide shows you how to implement this powerful combination.

## Understanding OCI registry support for Helm

Since Helm 3, charts can be stored in OCI-compliant registries like:
- Docker Hub
- Amazon ECR
- Google Artifact Registry
- Azure Container Registry
- Harbor
- GitHub Container Registry (ghcr.io)
- GitLab Container Registry

Benefits of OCI registries for Helm charts:
- Unified artifact storage with container images
- Leverage existing registry authentication
- Built-in versioning with tags
- Registry features like scanning and replication
- Better performance than traditional Helm repositories

## Configuring ArgoCD for OCI registry access

First, configure registry credentials in ArgoCD:

```yaml
# argocd-oci-registry-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: oci-registry-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: my-oci-registry
  url: oci://registry.example.com
  username: myuser
  password: mypassword
  enableOCI: "true"
```

Apply the secret:

```bash
kubectl apply -f argocd-oci-registry-secret.yaml

# Verify the repository is registered
argocd repo list
```

For different registries, adjust the URL format:
- Docker Hub: `oci://registry-1.docker.io`
- GitHub: `oci://ghcr.io`
- ECR: `oci://123456789.dkr.ecr.us-east-1.amazonaws.com`
- Harbor: `oci://harbor.example.com`

## Creating an Application with OCI Helm charts

Define an Application that deploys from an OCI registry:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-oci-helm-app
  namespace: argocd
spec:
  project: default
  source:
    chart: my-application
    repoURL: oci://registry.example.com/helm-charts
    targetRevision: 1.2.3
    helm:
      values: |
        replicaCount: 3
        image:
          repository: registry.example.com/my-app
          tag: v1.2.3
        service:
          type: LoadBalancer
          port: 80
        ingress:
          enabled: true
          hosts:
            - host: app.example.com
              paths:
                - path: /
                  pathType: Prefix
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Key differences from traditional Helm repos:
- `repoURL` uses `oci://` protocol
- `chart` specifies the chart name (repository path)
- `targetRevision` is the chart version (OCI tag)

## Using AWS ECR for Helm charts

For AWS ECR, authentication requires special handling:

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | \
  argocd repo add oci://123456789.dkr.ecr.us-east-1.amazonaws.com \
  --type helm \
  --name aws-ecr \
  --username AWS \
  --password-stdin \
  --enable-oci
```

For automated token refresh, use IRSA (IAM Roles for Service Accounts):

```yaml
# argocd-repo-server-service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-repo-server
  namespace: argocd
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/argocd-ecr-access
---
# Patch argocd-repo-server deployment to use this SA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      serviceAccountName: argocd-repo-server
```

Create the IAM role with ECR permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:DescribeRepositories",
        "ecr:ListImages"
      ],
      "Resource": "*"
    }
  ]
}
```

## Deploying from Google Artifact Registry

Configure GCR/Artifact Registry access:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gar-helm-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: google-artifact-registry
  url: oci://us-central1-docker.pkg.dev
  username: _json_key
  password: |
    {
      "type": "service_account",
      "project_id": "my-project",
      "private_key_id": "key-id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "argocd@my-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
    }
  enableOCI: "true"
```

Application definition for GAR:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: gar-helm-app
  namespace: argocd
spec:
  source:
    chart: my-app
    repoURL: oci://us-central1-docker.pkg.dev/my-project/helm-charts
    targetRevision: 2.1.0
    helm:
      valueFiles:
        - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Using GitHub Container Registry for Helm

GitHub Container Registry (ghcr.io) provides free Helm chart hosting:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-helm-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: github-registry
  url: oci://ghcr.io
  username: github-username
  password: ghp_YourGitHubPersonalAccessToken
  enableOCI: "true"
```

Application using GHCR:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ghcr-app
  namespace: argocd
spec:
  source:
    chart: myapp
    repoURL: oci://ghcr.io/myorg/charts
    targetRevision: 1.0.5
    helm:
      parameters:
        - name: image.tag
          value: "v1.0.5"
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

## Publishing Helm charts to OCI registries

Before ArgoCD can deploy charts, publish them to your OCI registry:

```bash
# Login to the registry
helm registry login registry.example.com -u username -p password

# Package the chart
helm package ./my-chart

# Push to OCI registry
helm push my-chart-1.2.3.tgz oci://registry.example.com/helm-charts

# Verify the chart is available
helm show chart oci://registry.example.com/helm-charts/my-chart --version 1.2.3
```

Automate chart publishing in CI/CD:

```yaml
# GitHub Actions example
name: Publish Helm Chart
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: '3.12.0'

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
          helm registry login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Package and Push Chart
        run: |
          helm package ./charts/my-app
          helm push my-app-*.tgz oci://ghcr.io/${{ github.repository_owner }}/charts
```

## Managing chart versions and updates

Use semantic versioning for chart versions:

```yaml
# Chart.yaml
apiVersion: v2
name: my-application
version: 1.2.3  # Chart version
appVersion: "v1.2.3"  # Application version
description: My application Helm chart
type: application
```

Configure ArgoCD to track specific version patterns:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: version-tracking-app
  namespace: argocd
spec:
  source:
    chart: my-app
    repoURL: oci://registry.example.com/helm-charts
    # Use specific version
    targetRevision: 1.2.3
    # Or use version constraint (requires additional tooling)
    # targetRevision: ">=1.2.0 <2.0.0"
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

To auto-update to latest versions, use ArgoCD Image Updater:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: auto-update-app
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=registry.example.com/my-app
    argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
    argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
spec:
  source:
    chart: my-app
    repoURL: oci://registry.example.com/helm-charts
    targetRevision: 1.2.3
```

## Using multiple OCI registries

Manage charts across different registries:

```yaml
# Register multiple OCI registries
---
apiVersion: v1
kind: Secret
metadata:
  name: docker-hub-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  url: oci://registry-1.docker.io
  username: dockerhub-user
  password: dockerhub-token
  enableOCI: "true"
---
apiVersion: v1
kind: Secret
metadata:
  name: harbor-helm
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  url: oci://harbor.company.com
  username: harbor-user
  password: harbor-password
  enableOCI: "true"
```

Create Applications using different registries:

```yaml
# App from Docker Hub
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-from-dockerhub
spec:
  source:
    chart: public-chart
    repoURL: oci://registry-1.docker.io/charts
    targetRevision: 1.0.0
---
# App from Harbor
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-from-harbor
spec:
  source:
    chart: private-chart
    repoURL: oci://harbor.company.com/library/charts
    targetRevision: 2.3.1
```

## Combining OCI Helm charts with multi-source applications

Use OCI Helm charts with additional Git sources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: multi-source-oci-app
  namespace: argocd
spec:
  project: default
  sources:
    # Helm chart from OCI registry
    - chart: my-app
      repoURL: oci://registry.example.com/helm-charts
      targetRevision: 1.2.3
      helm:
        valueFiles:
          - $values/environments/production/values.yaml
    # Values from Git repository
    - repoURL: https://github.com/myorg/helm-values.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

This pattern separates chart definitions (in OCI) from environment-specific values (in Git).

## Implementing chart mirroring and caching

For reliability, mirror external OCI charts to internal registries:

```bash
# Pull chart from external registry
helm pull oci://external-registry.com/charts/app --version 1.2.3

# Push to internal registry
helm push app-1.2.3.tgz oci://internal-registry.company.com/mirror
```

Automate mirroring with a scheduled job:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: helm-chart-mirror
  namespace: argocd
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: mirror
              image: alpine/helm:3.12.0
              command:
                - /bin/sh
                - -c
                - |
                  helm registry login external-registry.com -u $EXT_USER -p $EXT_PASS
                  helm registry login internal-registry.com -u $INT_USER -p $INT_PASS

                  for chart in app-a app-b app-c; do
                    helm pull oci://external-registry.com/charts/$chart --version latest
                    helm push $chart-*.tgz oci://internal-registry.com/mirror
                  done
              envFrom:
                - secretRef:
                    name: registry-credentials
          restartPolicy: OnFailure
```

## Troubleshooting OCI Helm chart issues

Common issues and solutions:

**Authentication failures:**

```bash
# Test registry authentication
helm registry login oci://registry.example.com -u username -p password

# Verify ArgoCD has credentials
argocd repo list | grep oci://

# Check repo server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server
```

**Chart not found errors:**

```bash
# Verify chart exists in registry
helm show chart oci://registry.example.com/helm-charts/my-app --version 1.2.3

# List available versions
# (requires direct registry API access)
curl -u username:password \
  https://registry.example.com/v2/helm-charts/my-app/tags/list
```

**Slow chart fetches:**

Configure a pull-through cache or increase ArgoCD timeouts:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: 300s
  helm.oci.timeout: 180s
```

## Best practices for OCI Helm charts

1. **Version charts semantically:** Use semantic versioning for predictable updates
2. **Separate chart and app versions:** Track them independently in Chart.yaml
3. **Use immutable tags:** Never overwrite existing chart versions
4. **Implement chart scanning:** Scan charts for vulnerabilities like container images
5. **Mirror critical charts:** Don't depend solely on external registries
6. **Document registry URLs:** Maintain clear inventory of chart locations
7. **Automate chart publishing:** Integrate chart releases into CI/CD pipelines
8. **Test chart deployments:** Validate charts in staging before production

## Conclusion

OCI registries provide a modern, unified approach to storing both container images and Helm charts. By implementing ArgoCD with OCI-hosted Helm charts, you leverage existing registry infrastructure, simplify artifact management, and create a more streamlined GitOps workflow. The combination of ArgoCD's GitOps capabilities with OCI registries' standardized artifact storage creates a powerful foundation for scalable Kubernetes application delivery.
