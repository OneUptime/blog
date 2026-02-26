# How to Secure the GitOps Pipeline with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Pipeline

Description: Learn how to secure every stage of the GitOps pipeline with ArgoCD from Git repository protection to cluster deployment, covering authentication, authorization, and secrets management.

---

A GitOps pipeline with ArgoCD creates a direct path from your Git repository to your Kubernetes cluster. Every commit can trigger a deployment. That power comes with a significant security responsibility - if someone compromises your Git repo or ArgoCD instance, they can deploy anything to your clusters. This guide walks through securing every link in the chain.

## The Attack Surface

Before we secure the pipeline, let us understand what can go wrong:

```mermaid
graph LR
    A[Git Repository] -->|1. Source tampering| B[ArgoCD Repo Server]
    B -->|2. Manifest injection| C[ArgoCD Controller]
    C -->|3. Unauthorized deployment| D[Kubernetes Cluster]
    E[ArgoCD UI/API] -->|4. Unauthorized access| C
    F[Container Registry] -->|5. Malicious images| D
```

1. **Source tampering** - An attacker modifies manifests in Git
2. **Manifest injection** - Malicious content in Helm charts or Kustomize bases
3. **Unauthorized deployment** - Deploying to namespaces or clusters without permission
4. **ArgoCD access compromise** - Gaining admin access to ArgoCD itself
5. **Supply chain attacks** - Pulling compromised container images

## Securing the Git Repository

### Enable Commit Signing

Require signed commits so ArgoCD can verify that manifests come from trusted contributors:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Enable GPG signature verification
  gpg.verification.enabled: "true"
```

Add trusted GPG keys:

```bash
# Import a trusted key
argocd gpg add --from /path/to/public-key.asc

# List trusted keys
argocd gpg list

# Configure per-project signature requirements
```

Configure the AppProject to require signatures:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  signatureKeys:
    - keyID: "ABC123DEF456"
    - keyID: "789GHI012JKL"
```

### Repository Access Controls

Use deploy keys or GitHub Apps instead of personal access tokens:

```yaml
# Use deploy keys with read-only access
apiVersion: v1
kind: Secret
metadata:
  name: repo-creds-myrepo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  url: https://github.com/org/config-repo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...read-only deploy key...
    -----END OPENSSH PRIVATE KEY-----
  type: git
```

For GitHub Apps (preferred for organizations):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-creds-github-app
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  url: https://github.com/org/
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
  type: git
```

## ArgoCD Authentication

### Configure SSO with OIDC

Never rely solely on the built-in admin account. Set up SSO:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.example.com
  oidc.config: |
    name: Okta
    issuer: https://org.okta.com
    clientID: 0oa1234567890
    clientSecret: $oidc.client-secret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
```

Disable the admin account after SSO is configured:

```yaml
# argocd-cm ConfigMap
data:
  admin.enabled: "false"
```

### RBAC Configuration

Implement least-privilege access:

```yaml
# argocd-rbac-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Default policy: deny all
  policy.default: role:none

  policy.csv: |
    # Platform admins: full access
    p, role:platform-admin, applications, *, */*, allow
    p, role:platform-admin, clusters, *, *, allow
    p, role:platform-admin, repositories, *, *, allow
    p, role:platform-admin, projects, *, *, allow

    # Team developers: can view and sync their own apps
    p, role:team-a-dev, applications, get, team-a/*, allow
    p, role:team-a-dev, applications, sync, team-a/*, allow
    p, role:team-a-dev, applications, action/*, team-a/*, allow

    # Team leads: can also create and delete apps in their project
    p, role:team-a-lead, applications, *, team-a/*, allow

    # Read-only for everyone
    p, role:readonly, applications, get, */*, allow
    p, role:readonly, projects, get, *, allow

    # Map OIDC groups to roles
    g, platform-engineers, role:platform-admin
    g, team-a-developers, role:team-a-dev
    g, team-a-leads, role:team-a-lead
    g, all-engineers, role:readonly
```

## AppProject Security Boundaries

Use AppProjects to enforce what each team can do:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  description: Team A project
  # Restrict which repos can be used as sources
  sourceRepos:
    - https://github.com/org/team-a-config.git
    - https://github.com/org/app-catalog.git

  # Restrict deployment targets
  destinations:
    - namespace: team-a
      server: https://kubernetes.default.svc
    - namespace: team-a-*
      server: https://kubernetes.default.svc

  # Deny cluster-scoped resources
  clusterResourceBlacklist:
    - group: '*'
      kind: '*'

  # Only allow specific namespace-scoped resources
  namespaceResourceWhitelist:
    - group: apps
      kind: Deployment
    - group: ""
      kind: Service
    - group: ""
      kind: ConfigMap
    - group: ""
      kind: Secret
    - group: networking.k8s.io
      kind: Ingress

  # Deny dangerous resources
  namespaceResourceBlacklist:
    - group: ""
      kind: ResourceQuota
    - group: rbac.authorization.k8s.io
      kind: '*'
```

## Secrets Management

Never store secrets in Git. Use one of these approaches:

### Sealed Secrets

```bash
# Encrypt secrets before committing to Git
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

### External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: team-a
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: team-a/database
        property: url
```

### ArgoCD Vault Plugin

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    plugin:
      name: argocd-vault-plugin
      env:
        - name: AVP_TYPE
          value: vault
        - name: AVP_AUTH_TYPE
          value: k8s
```

## Network Security

### Restrict ArgoCD API Access

```yaml
# Network policy for ArgoCD server
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-policy
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
  ingress:
    # Only allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
    # Allow from ArgoCD CLI (internal network only)
    - from:
        - ipBlock:
            cidr: 10.0.0.0/8
      ports:
        - port: 8080
```

### TLS Everywhere

```yaml
# Enable TLS between ArgoCD components
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable TLS for repo server
  reposerver.tls.enabled: "true"
  # Enable TLS for Redis
  redis.tls.enabled: "true"
```

## Container Image Security

### Restrict Image Sources

Use Kyverno or OPA policies to enforce trusted registries:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: enforce
  rules:
    - name: validate-registries
      match:
        resources:
          kinds:
            - Pod
      validate:
        message: "Images must come from approved registries"
        pattern:
          spec:
            containers:
              - image: "org/*.io/*"
```

## Audit and Compliance

Enable comprehensive logging:

```yaml
# argocd-cm ConfigMap
data:
  # Enable audit logging
  server.audit.enabled: "true"
```

Monitor ArgoCD events:

```bash
# View recent sync operations
argocd app list -o json | jq '.[] | {name: .metadata.name, lastSync: .status.operationState.finishedAt, syncBy: .status.operationState.operation.initiatedBy}'

# Check RBAC denials in server logs
kubectl logs -n argocd deployment/argocd-server | grep "rbac"
```

## Security Checklist

Use this checklist to verify your pipeline security:

- [ ] SSO configured, admin account disabled
- [ ] RBAC with default deny policy
- [ ] AppProjects with restricted source repos and destinations
- [ ] GPG commit verification enabled
- [ ] Deploy keys or GitHub Apps for repo access (not PATs)
- [ ] Secrets managed outside Git (Sealed Secrets, ESO, or Vault)
- [ ] Network policies restricting ArgoCD API access
- [ ] TLS enabled between all components
- [ ] Container image registry restrictions
- [ ] Audit logging enabled
- [ ] Sync windows for production
- [ ] Cluster-scoped resources blocked for team projects

For more on ArgoCD SSO configuration, see our guide on [ArgoCD SSO with OIDC](https://oneuptime.com/blog/post/2026-01-25-sso-oidc-argocd/view) and [ArgoCD secrets management](https://oneuptime.com/blog/post/2026-02-02-argocd-secrets/view).
