# How to Add JFrog Artifactory as Helm Repository in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, JFrog Artifactory

Description: Learn how to configure JFrog Artifactory as a Helm chart repository in ArgoCD for enterprise-grade artifact management and GitOps deployments.

---

JFrog Artifactory is one of the most widely adopted artifact management platforms in enterprise environments. When you combine it with ArgoCD for GitOps-driven Kubernetes deployments, you get a powerful pipeline where Helm charts are stored, versioned, and served through Artifactory while ArgoCD handles the declarative deployment lifecycle.

This guide walks you through every step of connecting JFrog Artifactory to ArgoCD as a Helm repository source.

## Why Use JFrog Artifactory with ArgoCD

Artifactory offers features that go well beyond what a basic Helm repository provides:

- Universal artifact management across Docker images, Helm charts, npm packages, and more
- Fine-grained access control with tokens, API keys, and LDAP/SSO integration
- Virtual repositories that aggregate multiple remote and local repositories behind a single URL
- Replication for multi-site deployments
- Built-in vulnerability scanning with JFrog Xray

When paired with ArgoCD, you get a workflow where chart publishing goes through Artifactory's pipelines, and ArgoCD pulls the latest charts based on your tracking strategy.

## Prerequisites

Before configuring ArgoCD, make sure you have:

- A running ArgoCD instance (v2.0+)
- JFrog Artifactory with at least one Helm repository configured
- An Artifactory user or access token with read permissions on the Helm repository
- `argocd` CLI installed and logged in

## Setting Up the Helm Repository in Artifactory

If you do not already have a Helm repository in Artifactory, create one through the Artifactory UI.

1. Navigate to **Administration > Repositories > Local**
2. Click **New Local Repository**
3. Select **Helm** as the package type
4. Name it something like `helm-local`
5. Click **Create**

You can also create a virtual repository that aggregates your local Helm repo with remote Helm repos (like Bitnami or ingress-nginx):

1. Navigate to **Administration > Repositories > Virtual**
2. Click **New Virtual Repository**
3. Select **Helm** as the package type
4. Name it `helm-virtual`
5. Add your local and remote Helm repositories to the resolution list
6. Click **Create**

The repository URL typically follows this pattern:

```text
https://artifactory.example.com/artifactory/helm-virtual
```

## Adding Artifactory as a Helm Repository in ArgoCD

### Method 1: Using the ArgoCD CLI

The simplest approach is adding the repository through the CLI with username and password or API key authentication:

```bash
# Add with username and password
argocd repo add https://artifactory.example.com/artifactory/helm-virtual \
  --type helm \
  --name artifactory-helm \
  --username admin \
  --password '<your-password>'
```

For API key authentication:

```bash
# Add with API key (use the API key as the password)
argocd repo add https://artifactory.example.com/artifactory/helm-virtual \
  --type helm \
  --name artifactory-helm \
  --username admin \
  --password '<your-api-key>'
```

For access token authentication, which is the recommended approach in modern Artifactory versions:

```bash
# Add with access token
argocd repo add https://artifactory.example.com/artifactory/helm-virtual \
  --type helm \
  --name artifactory-helm \
  --username access-token \
  --password '<your-access-token>'
```

### Method 2: Declarative Configuration with Kubernetes Secret

For a GitOps-friendly approach, you can define the repository as a Kubernetes Secret:

```yaml
# artifactory-helm-repo.yaml
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
  name: artifactory-helm
  url: https://artifactory.example.com/artifactory/helm-virtual
  username: admin
  password: <your-access-token>
```

Apply it to your cluster:

```bash
kubectl apply -f artifactory-helm-repo.yaml
```

### Method 3: Using Repository Credential Templates

If you have multiple Artifactory Helm repositories that share the same credentials, use a credential template to avoid repetition:

```yaml
# artifactory-cred-template.yaml
apiVersion: v1
kind: Secret
metadata:
  name: artifactory-cred-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: helm
  url: https://artifactory.example.com/artifactory/
  username: argocd-service
  password: <your-access-token>
```

Now any Helm repository you add with a URL matching `https://artifactory.example.com/artifactory/` will automatically inherit these credentials.

## Deploying a Helm Chart from Artifactory

Once the repository is connected, create an ArgoCD Application that references a chart from Artifactory:

```yaml
# my-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-application
  namespace: argocd
spec:
  project: default
  source:
    # Reference the Helm repository by its URL
    repoURL: https://artifactory.example.com/artifactory/helm-virtual
    chart: my-chart
    targetRevision: 1.2.3
    helm:
      values: |
        replicaCount: 3
        image:
          tag: latest
        service:
          type: ClusterIP
  destination:
    server: https://kubernetes.default.svc
    namespace: my-namespace
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Apply this with:

```bash
kubectl apply -f my-app.yaml
```

Or use the CLI:

```bash
argocd app create my-application \
  --repo https://artifactory.example.com/artifactory/helm-virtual \
  --helm-chart my-chart \
  --revision 1.2.3 \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-namespace \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

## Using Artifactory OCI Registry with ArgoCD

Modern versions of Artifactory support OCI-based Helm chart storage. If your charts are stored in an OCI registry within Artifactory, configure it differently:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: artifactory-oci-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: artifactory-oci
  url: artifactory.example.com/artifactory/helm-oci
  enableOCI: "true"
  username: admin
  password: <your-access-token>
```

## Configuring TLS for Artifactory

If your Artifactory instance uses a self-signed certificate or a private CA, you need to provide the CA certificate to ArgoCD:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: artifactory-helm-repo-tls
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: artifactory-helm
  url: https://artifactory.example.com/artifactory/helm-virtual
  username: admin
  password: <your-access-token>
  tlsClientCertData: |
    <base64-encoded-client-cert>
  tlsClientCertKey: |
    <base64-encoded-client-key>
```

You can also add the CA certificate to ArgoCD's trust store by editing the `argocd-tls-certs-cm` ConfigMap:

```bash
kubectl -n argocd create configmap argocd-tls-certs-cm \
  --from-file=artifactory.example.com=/path/to/ca-cert.pem
```

## Troubleshooting Common Issues

### Repository Not Found

If ArgoCD cannot find your Helm repository, verify the URL. Artifactory Helm repository URLs must include the full path:

```bash
# Correct
https://artifactory.example.com/artifactory/helm-virtual

# Incorrect - missing /artifactory/ prefix
https://artifactory.example.com/helm-virtual
```

### Authentication Failures

Test your credentials directly against the Artifactory API:

```bash
# Test with curl
curl -u admin:<token> \
  https://artifactory.example.com/artifactory/api/helm/helm-virtual/index.yaml
```

If that returns a valid YAML response, the credentials are working and the issue is likely in how ArgoCD stores them.

### Chart Not Found in Repository

If the chart exists in Artifactory but ArgoCD cannot find it, force a repository refresh:

```bash
# Refresh the repository cache
argocd repo list
argocd app get my-application --refresh
```

Artifactory generates the Helm index lazily for virtual repositories. You may need to trigger an index recalculation in Artifactory under **Administration > Artifactory > Helm > Recalculate Index**.

## Best Practices

1. **Use access tokens instead of passwords** - Access tokens can be scoped, rotated, and revoked independently
2. **Use virtual repositories** - They aggregate multiple sources behind a single URL and simplify ArgoCD configuration
3. **Enable Xray scanning** - Catch vulnerabilities in Helm charts before they reach your clusters
4. **Set up replication** - If you have multi-region deployments, replicate Helm charts to Artifactory instances closer to your clusters
5. **Use credential templates** - Avoid duplicating credentials across multiple repository configurations

## Summary

JFrog Artifactory integrates smoothly with ArgoCD as a Helm chart source. Whether you use basic authentication, access tokens, or OCI registries, the setup process is straightforward. The combination gives you enterprise-grade artifact management with declarative GitOps deployments, which is exactly what production Kubernetes environments need.

For related guides, check out [How to Use ArgoCD with Helm](https://oneuptime.com/blog/post/2026-02-02-argocd-helm/view) and [How to Use ArgoCD with Private Git Repos](https://oneuptime.com/blog/post/2026-02-02-argocd-private-repos/view).
