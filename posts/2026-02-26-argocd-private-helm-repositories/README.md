# How to Use Helm Charts from Private Helm Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Security

Description: Learn how to configure ArgoCD to pull Helm charts from private Helm repositories including authentication setup and credential management.

---

Most production Helm charts live in private repositories that require authentication. Whether you host your own ChartMuseum, use a cloud-managed registry like AWS ECR, Google Artifact Registry, or Azure Container Registry, or run a private Nexus or Artifactory instance, ArgoCD needs credentials to access these charts.

This guide covers how to add private Helm repositories to ArgoCD, configure authentication, and deploy charts from them.

## Adding a Private Helm Repository

There are three ways to add a private Helm repository to ArgoCD: the CLI, the UI, or a declarative Secret.

### Method 1: ArgoCD CLI

```bash
# Add a private Helm repository with basic auth
argocd repo add https://charts.myorg.com \
  --type helm \
  --name myorg-charts \
  --username admin \
  --password 's3cret-p@ssword'

# Add with TLS client certificate
argocd repo add https://charts.myorg.com \
  --type helm \
  --name myorg-charts \
  --tls-client-cert-path /path/to/cert.pem \
  --tls-client-cert-key-path /path/to/key.pem

# Add a repository that uses a custom CA certificate
argocd repo add https://charts.internal.myorg.com \
  --type helm \
  --name internal-charts \
  --username admin \
  --password 's3cret' \
  --ca-cert-path /path/to/ca.crt
```

### Method 2: Declarative Secret

The GitOps-friendly approach is to create a Kubernetes Secret in the ArgoCD namespace:

```yaml
# helm-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: myorg-helm-repo
  namespace: argocd
  labels:
    # This label tells ArgoCD to treat this Secret as a repository config
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  # Repository type
  type: helm
  # Human-readable name
  name: myorg-charts
  # Repository URL
  url: https://charts.myorg.com
  # Authentication credentials
  username: admin
  password: s3cret-p@ssword
```

Apply it:

```bash
kubectl apply -f helm-repo-secret.yaml
```

### Method 3: ArgoCD UI

1. Navigate to Settings > Repositories
2. Click "Connect Repo"
3. Choose "Via HTTPS"
4. Select type "Helm"
5. Enter the URL, username, and password
6. Click "Connect"

## Using a Private Repository in an Application

Once the repository is registered, reference it in your Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    # Chart name from the private repository
    chart: my-app
    # URL must match the registered repository URL
    repoURL: https://charts.myorg.com
    targetRevision: 1.5.2
    helm:
      releaseName: my-app
      values: |
        replicaCount: 3
        image:
          tag: v2.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Authentication Methods

### Basic Authentication (Username/Password)

The most common method for traditional Helm repositories:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-basic
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: my-charts
  url: https://charts.myorg.com
  username: deploy-user
  password: deploy-token-123
```

### Token-Based Authentication

Some providers use bearer tokens:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-token
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: my-charts
  url: https://charts.myorg.com
  username: ""
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### AWS ECR (Elastic Container Registry)

For AWS ECR hosting OCI Helm charts:

```bash
# ECR requires token refresh - use the ArgoCD ECR credential helper
# First, add the ECR repository
argocd repo add xxxxxxxxxxxx.dkr.ecr.us-east-1.amazonaws.com \
  --type helm \
  --name ecr-charts \
  --enable-oci \
  --username AWS \
  --password "$(aws ecr get-login-password --region us-east-1)"
```

For automated credential refresh, use an ECR credential helper or External Secrets Operator to keep the password updated.

### Google Artifact Registry

```bash
argocd repo add https://us-central1-docker.pkg.dev/my-project/my-repo \
  --type helm \
  --name gar-charts \
  --enable-oci \
  --username _json_key \
  --password "$(cat service-account-key.json)"
```

### Azure Container Registry

```bash
argocd repo add myregistry.azurecr.io \
  --type helm \
  --name acr-charts \
  --enable-oci \
  --username myregistry \
  --password "$(az acr credential show -n myregistry --query 'passwords[0].value' -o tsv)"
```

## ChartMuseum Private Repository

ChartMuseum is a popular self-hosted Helm chart repository:

```yaml
# Deploy ChartMuseum
apiVersion: v1
kind: Secret
metadata:
  name: chartmuseum-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: chartmuseum
  url: https://chartmuseum.internal.myorg.com
  username: admin
  password: chartmuseum-secret
```

## Nexus Repository Manager

For Sonatype Nexus:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: nexus-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: nexus-charts
  url: https://nexus.myorg.com/repository/helm-hosted/
  username: helm-deployer
  password: nexus-deploy-token
```

## JFrog Artifactory

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: artifactory-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: artifactory-charts
  url: https://myorg.jfrog.io/artifactory/helm-local
  username: deploy-bot
  password: artifactory-api-key
```

## Managing Credentials Securely

Storing credentials in plain Kubernetes Secrets is a starting point, but for production you should use a secrets management solution:

### Using Sealed Secrets

```bash
# Seal the repository secret
kubeseal --format yaml < helm-repo-secret.yaml > sealed-helm-repo-secret.yaml

# Apply the sealed secret
kubectl apply -f sealed-helm-repo-secret.yaml
```

### Using External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: helm-repo-creds
  namespace: argocd
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: myorg-helm-repo
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: helm
        name: myorg-charts
        url: https://charts.myorg.com
        username: "{{ .username }}"
        password: "{{ .password }}"
  data:
    - secretKey: username
      remoteRef:
        key: argocd/helm-repo
        property: username
    - secretKey: password
      remoteRef:
        key: argocd/helm-repo
        property: password
```

## Verifying Repository Access

```bash
# List all configured repositories
argocd repo list

# Check repository connection status
argocd repo get https://charts.myorg.com

# If there are issues, check ArgoCD server logs
kubectl logs -n argocd deployment/argocd-repo-server | grep "charts.myorg.com"
```

## Troubleshooting

1. **401 Unauthorized**: Verify credentials are correct. Check if the password has expired.
2. **Certificate errors**: Add the CA certificate using the `--ca-cert` option or include it in the Secret.
3. **Chart not found**: Ensure the chart name and version exist in the repository. Try `helm search repo` locally.
4. **Stale cache**: ArgoCD caches chart index files. Force a refresh with `argocd app get my-app --hard-refresh`.

## Summary

Configuring private Helm repositories in ArgoCD requires creating a repository Secret with the appropriate credentials. Whether you use basic auth, tokens, or cloud provider credentials, the process is the same: register the repository with its URL and credentials, then reference it in your Application specs. For production deployments, use Sealed Secrets or External Secrets Operator to manage credentials securely. For passing custom parameters to your Helm charts, see our guide on [Helm parameters in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-helm-parameters/view).
