# How to Add Nexus as Helm Repository in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Nexus Repository

Description: Step-by-step guide to configuring Sonatype Nexus Repository Manager as a Helm chart source in ArgoCD for GitOps deployments.

---

Sonatype Nexus Repository Manager is a popular open-source artifact repository that many organizations use to host Helm charts alongside Docker images, Maven artifacts, and npm packages. Connecting Nexus to ArgoCD allows you to deploy Helm charts stored in Nexus through a GitOps workflow without changing your existing artifact management setup.

This guide covers everything you need to configure Nexus as a Helm repository in ArgoCD, including authentication, TLS, and common troubleshooting scenarios.

## Why Nexus with ArgoCD

Nexus Repository Manager (both OSS and Pro editions) has been a staple in software delivery for years. Many teams already use it for container images and other artifacts. Adding Helm chart hosting to Nexus means you keep all your artifacts in one place rather than spinning up a separate ChartMuseum or Artifactory instance.

Key advantages of using Nexus for Helm charts:

- Consolidation of all artifact types in a single platform
- Built-in proxy repositories for caching upstream Helm charts (Bitnami, ingress-nginx, etc.)
- Group repositories that combine hosted and proxy repos under one URL
- Role-based access control for Helm chart publishing and consumption
- Free OSS edition supports Helm repositories

## Prerequisites

- ArgoCD v2.0+ running in your Kubernetes cluster
- Nexus Repository Manager 3.x with a Helm hosted repository configured
- A Nexus user account with at least read access to the Helm repository
- `argocd` CLI installed and authenticated

## Setting Up Helm Repositories in Nexus

If you have not set up Helm repositories in Nexus yet, here is how to do it.

### Create a Hosted Helm Repository

1. Log into Nexus as an admin
2. Navigate to **Settings (gear icon) > Repository > Repositories**
3. Click **Create Repository**
4. Select **helm (hosted)**
5. Configure the repository:
   - Name: `helm-hosted`
   - Deployment policy: Choose based on your needs (Allow redeploy, Disable redeploy, etc.)
6. Click **Create Repository**

### Create a Proxy Helm Repository

To cache charts from upstream sources like Bitnami:

1. Click **Create Repository** and select **helm (proxy)**
2. Configure:
   - Name: `helm-bitnami-proxy`
   - Remote storage: `https://charts.bitnami.com/bitnami`
3. Click **Create Repository**

### Create a Group Helm Repository

To aggregate your hosted and proxy repos behind a single URL:

1. Click **Create Repository** and select **helm (group)** (Nexus Pro only)
2. Configure:
   - Name: `helm-group`
   - Member repositories: Add `helm-hosted` and `helm-bitnami-proxy`
3. Click **Create Repository**

The repository URL follows this pattern:

```text
https://nexus.example.com/repository/helm-hosted/
```

## Adding Nexus as a Helm Repository in ArgoCD

### Method 1: ArgoCD CLI

```bash
# Add Nexus Helm repository with basic authentication
argocd repo add https://nexus.example.com/repository/helm-hosted/ \
  --type helm \
  --name nexus-helm \
  --username argocd-reader \
  --password '<nexus-password>'
```

Verify the repository was added successfully:

```bash
argocd repo list
```

You should see output similar to:

```text
TYPE  NAME        REPO                                                    INSECURE  OCI    LFS    CREDS  STATUS
helm  nexus-helm  https://nexus.example.com/repository/helm-hosted/       false     false  false  false  Successful
```

### Method 2: Declarative Kubernetes Secret

```yaml
# nexus-helm-repo.yaml
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
  name: nexus-helm
  url: https://nexus.example.com/repository/helm-hosted/
  username: argocd-reader
  password: your-nexus-password
```

Apply to your cluster:

```bash
kubectl apply -f nexus-helm-repo.yaml
```

### Method 3: Credential Templates for Multiple Nexus Repos

If you have several Helm repositories in Nexus (hosted, proxy, group), use credential templates so you only define credentials once:

```yaml
# nexus-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nexus-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: helm
  url: https://nexus.example.com/repository/
  username: argocd-reader
  password: your-nexus-password
```

Now any Helm repository you add with a URL starting with `https://nexus.example.com/repository/` will automatically use these credentials.

## Deploying a Chart from Nexus

Create an ArgoCD Application that pulls a chart from your Nexus repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-nexus-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://nexus.example.com/repository/helm-hosted/
    chart: my-application
    targetRevision: 2.1.0
    helm:
      values: |
        replicaCount: 2
        image:
          repository: nexus.example.com/docker/my-app
          tag: v2.1.0
        ingress:
          enabled: true
          hosts:
            - host: my-app.example.com
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

## Handling Nexus Behind a Reverse Proxy

Many organizations run Nexus behind an Nginx or Apache reverse proxy. Make sure the proxy forwards the correct headers:

```nginx
# Nginx configuration for Nexus
location /repository/ {
    proxy_pass http://nexus:8081/repository/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

The ArgoCD repository URL should point to the external proxy URL, not the internal Nexus URL.

## Self-Signed Certificates

If Nexus uses a self-signed certificate, add the CA certificate to ArgoCD's trust store:

```bash
# Add the CA certificate to ArgoCD's ConfigMap
kubectl -n argocd create configmap argocd-tls-certs-cm \
  --from-file=nexus.example.com=/path/to/nexus-ca.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

Alternatively, if you need to skip TLS verification (not recommended for production):

```bash
argocd repo add https://nexus.example.com/repository/helm-hosted/ \
  --type helm \
  --name nexus-helm \
  --username argocd-reader \
  --password '<nexus-password>' \
  --insecure-skip-server-verification
```

## Nexus Anonymous Access for Public Charts

If your Nexus repository allows anonymous read access, you can add it without credentials:

```bash
argocd repo add https://nexus.example.com/repository/helm-public/ \
  --type helm \
  --name nexus-public
```

## Troubleshooting

### "401 Unauthorized" Errors

Nexus returns 401 when credentials are wrong or the user lacks permissions. Verify by testing directly:

```bash
curl -u argocd-reader:password \
  https://nexus.example.com/repository/helm-hosted/index.yaml
```

If this works but ArgoCD fails, check that the Secret is in the `argocd` namespace and has the correct label.

### "404 Not Found" for Charts

Nexus Helm repositories require charts to be uploaded in the correct format. Make sure charts were pushed correctly:

```bash
# Push a chart to Nexus
curl -u admin:password \
  https://nexus.example.com/repository/helm-hosted/ \
  --upload-file my-chart-1.0.0.tgz
```

Then verify the index:

```bash
curl -u argocd-reader:password \
  https://nexus.example.com/repository/helm-hosted/index.yaml | head -50
```

### Slow Index Updates

Nexus rebuilds the Helm index when charts are uploaded. If you have many charts, this can take time. ArgoCD caches the index and refreshes it periodically. Force a refresh with:

```bash
argocd app get my-nexus-app --refresh
```

### Connection Timeouts

If Nexus is behind a corporate proxy or VPN, make sure the ArgoCD repo-server pod can reach the Nexus URL. Test connectivity from within the pod:

```bash
kubectl -n argocd exec -it deploy/argocd-repo-server -- \
  curl -v https://nexus.example.com/repository/helm-hosted/index.yaml
```

## Best Practices

1. **Use a dedicated Nexus user for ArgoCD** - Create a service account with read-only access to Helm repositories
2. **Use group repositories** - Aggregate hosted and proxy repos behind a single URL to simplify ArgoCD configuration
3. **Enable Nexus cleanup policies** - Automatically remove old chart versions to keep the index manageable
4. **Monitor repository health** - Set up Nexus health checks and alerts for repository availability
5. **Version pin your charts** - Use specific chart versions in ArgoCD Applications rather than relying on `*` or `latest`

## Summary

Nexus Repository Manager works well as a Helm chart source for ArgoCD. The setup is straightforward - add the repository URL with credentials using either the CLI, a Kubernetes Secret, or credential templates. Whether you use the free OSS edition or Nexus Pro with group repositories, the integration gives you centralized artifact management combined with GitOps deployment automation.

For more on Helm and ArgoCD, see [How to Use ArgoCD with Helm](https://oneuptime.com/blog/post/2026-02-02-argocd-helm/view).
