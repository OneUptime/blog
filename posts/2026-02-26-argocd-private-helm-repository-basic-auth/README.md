# How to Add a Private Helm Repository with Basic Auth in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Authentication

Description: Learn how to configure ArgoCD to access private Helm chart repositories using basic authentication for deploying proprietary and internal Helm charts.

---

Many organizations host their own Helm chart repositories for proprietary applications and internal tools. These private repositories require authentication, and the most common method is HTTP basic authentication (username and password). This guide covers how to configure ArgoCD to pull charts from private Helm repositories using basic auth.

## Why Private Helm Repositories

Organizations use private Helm repositories for several reasons:

- Hosting proprietary application charts that cannot be public
- Maintaining curated and approved chart versions
- Storing charts with company-specific default configurations
- Compliance requirements that prohibit using external chart sources
- Internal charts that wrap public charts with organizational policies

Common private Helm repository solutions include ChartMuseum, Harbor, JFrog Artifactory, Sonatype Nexus, and cloud provider registries.

## Adding a Private Helm Repository via CLI

```bash
# Add with basic auth credentials
argocd repo add https://charts.company.com \
  --type helm \
  --name internal-charts \
  --username helm-reader \
  --password your-password-here
```

Verify the repository was added:

```bash
argocd repo list

# Expected output:
# TYPE  NAME             REPO                           INSECURE  OCI    LFS    CREDS  STATUS      MESSAGE
# helm  internal-charts  https://charts.company.com     false     false  false  true   Successful
```

## Adding a Private Helm Repository Declaratively

For production environments, use a Kubernetes Secret:

```yaml
# private-helm-repo.yaml
apiVersion: v1
kind: Secret
metadata:
  name: internal-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: internal-charts
  url: https://charts.company.com
  username: helm-reader
  password: your-password-here
```

```bash
kubectl apply -f private-helm-repo.yaml
```

## Using a Credential Template for Multiple Helm Repos

If you have multiple Helm repositories on the same domain:

```yaml
# helm-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: helm-repo-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: helm
  url: https://charts.company.com
  username: helm-reader
  password: your-password-here
```

This template will be used for any Helm repository URL that starts with `https://charts.company.com`.

## Deploying Charts from a Private Repository

Once the repository is registered, create applications that reference charts from it:

```yaml
# internal-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: internal-api-gateway
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.company.com
    chart: api-gateway
    targetRevision: 2.1.0
    helm:
      releaseName: api-gateway
      values: |
        replicaCount: 3
        image:
          repository: registry.company.com/api-gateway
          tag: v1.5.2
        service:
          type: ClusterIP
          port: 8080
        ingress:
          enabled: true
          className: nginx
          hosts:
            - host: api.company.com
              paths:
                - path: /
                  pathType: Prefix
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: api-gateway
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Multiple Private Repositories

Organizations often have separate repositories for different teams or purposes:

```yaml
# platform-charts.yaml
apiVersion: v1
kind: Secret
metadata:
  name: platform-charts-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: platform-charts
  url: https://charts.company.com/platform
  username: platform-reader
  password: platform-token
---
# application-charts.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-charts-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: app-charts
  url: https://charts.company.com/applications
  username: app-reader
  password: app-token
---
# shared-charts.yaml
apiVersion: v1
kind: Secret
metadata:
  name: shared-charts-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: shared-charts
  url: https://charts.company.com/shared
  username: shared-reader
  password: shared-token
```

## Securing Credentials

Storing passwords in plain-text YAML is not ideal. Use one of these approaches:

### External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: helm-repo-creds
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: internal-helm-repo
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repository
      data:
        type: helm
        name: internal-charts
        url: https://charts.company.com
        username: "{{ .username }}"
        password: "{{ .password }}"
  data:
    - secretKey: username
      remoteRef:
        key: secret/argocd/helm-repo
        property: username
    - secretKey: password
      remoteRef:
        key: secret/argocd/helm-repo
        property: password
```

### SealedSecrets

```bash
kubectl create secret generic internal-helm-repo \
  --namespace argocd \
  --from-literal=type=helm \
  --from-literal=name=internal-charts \
  --from-literal=url=https://charts.company.com \
  --from-literal=username=helm-reader \
  --from-literal=password=your-password \
  --dry-run=client -o yaml | \
  kubectl label --local -f - argocd.argoproj.io/secret-type=repository --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-helm-repo.yaml
```

## Handling Self-Signed TLS Certificates

If your private Helm repository uses a self-signed certificate:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  charts.company.com: |
    -----BEGIN CERTIFICATE-----
    MIIFjTCCA3WgAwIBAgIUK...
    -----END CERTIFICATE-----
```

Or mark the repository as insecure for testing:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: internal-helm-repo-insecure
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: internal-charts
  url: https://charts.company.com
  username: helm-reader
  password: your-password
  insecure: "true"
```

## Using Token-Based Auth Instead of Username/Password

Some Helm repositories support API tokens or bearer tokens. The configuration is the same - put the token in the password field:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: token-based-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: helm
  name: internal-charts
  url: https://charts.company.com
  username: _token  # Some repos use a placeholder username
  password: your-api-token
```

For JFrog Artifactory specifically:

```yaml
stringData:
  type: helm
  name: artifactory-charts
  url: https://artifactory.company.com/artifactory/helm-local
  username: argocd-reader
  password: artifactory-api-key
```

## Troubleshooting

### "401 Unauthorized"

```bash
# Test credentials directly
curl -u helm-reader:your-password https://charts.company.com/index.yaml | head -20

# If this fails, the credentials are wrong
```

### "404 Not Found"

The repository URL might be wrong. Helm repos need to serve an `index.yaml` file:

```bash
# Check if index.yaml is accessible
curl -u helm-reader:your-password https://charts.company.com/index.yaml -o /dev/null -w "%{http_code}"
```

### Chart Not Found Despite Repo Working

```bash
# List available charts
curl -u helm-reader:your-password https://charts.company.com/index.yaml | grep "name:"

# The chart name in your Application must match exactly
```

### Slow Index Downloads

Private repos with many charts can have large index files. Monitor the repo-server for timeouts:

```bash
kubectl logs -n argocd deployment/argocd-repo-server --tail=50 | grep -i "timeout\|helm"
```

For a broader guide on deploying Helm charts with ArgoCD, see the [Helm deployment guide](https://oneuptime.com/blog/post/2026-01-25-deploy-helm-charts-argocd/view).
