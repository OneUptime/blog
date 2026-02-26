# ArgoCD Best Practices for Security Hardening

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, DevSecOps

Description: Comprehensive security hardening guide for ArgoCD covering network policies, RBAC lockdown, secret protection, TLS configuration, pod security, and audit logging best practices.

---

ArgoCD has cluster-admin level access to your Kubernetes clusters. If an attacker compromises ArgoCD, they effectively own your entire infrastructure. Security hardening is not optional - it is the single most important thing you can do after getting ArgoCD running.

This guide covers every security hardening step you should implement, ordered by impact and urgency.

## Disable the default admin account

The built-in admin account uses a password stored in a Kubernetes Secret. Disable it after configuring SSO:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Disable the admin user
  admin.enabled: "false"

  # Configure OIDC for authentication
  oidc.config: |
    name: Okta
    issuer: https://myorg.okta.com/oauth2/default
    clientID: $oidc.clientID
    clientSecret: $oidc.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
```

If you must keep the admin account for emergency access, change the password immediately:

```bash
# Change the default admin password
argocd account update-password \
  --account admin \
  --current-password <initial-password> \
  --new-password <strong-password>
```

## Implement strict RBAC

Default ArgoCD RBAC is too permissive. Lock it down:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  # Default policy: deny everything
  policy.default: ""

  policy.csv: |
    # Explicit permissions only
    # Platform admins
    p, role:platform-admin, applications, *, */*, allow
    p, role:platform-admin, clusters, *, *, allow
    p, role:platform-admin, repositories, *, *, allow
    p, role:platform-admin, projects, *, *, allow
    p, role:platform-admin, accounts, *, *, allow

    # Developers - read and sync only, no delete
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, applications, action/*, */*, allow
    p, role:developer, logs, get, */*, allow
    p, role:developer, repositories, get, *, allow
    p, role:developer, projects, get, *, allow

    # CI service account - sync only
    p, role:ci-deployer, applications, sync, */*, allow
    p, role:ci-deployer, applications, get, */*, allow

    # Map SSO groups
    g, platform-engineering, role:platform-admin
    g, developers, role:developer

  scopes: '[groups]'
```

## Configure network policies

Restrict network access to ArgoCD components:

```yaml
# Deny all ingress by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-default-deny
  namespace: argocd
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
# Allow API server to receive traffic from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-ingress
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
        - port: 8083

---
# Allow controller to reach managed clusters and repo server
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-controller
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-application-controller
  policyTypes:
    - Egress
  egress:
    # Allow reaching Kubernetes API servers
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
        - port: 6443
    # Allow reaching repo server
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: argocd-repo-server
      ports:
        - port: 8081
    # Allow reaching Redis
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: argocd-redis
      ports:
        - port: 6379
    # Allow DNS
    - to: []
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP

---
# Allow internal communication between ArgoCD components
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-internal
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/part-of: argocd
```

## Enforce TLS everywhere

Configure TLS for all ArgoCD endpoints:

```yaml
# Use cert-manager for automatic certificate management
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-server-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - argocd.myorg.com
```

Configure ArgoCD to use TLS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable TLS on the server
  server.insecure: "false"

  # Redis TLS
  redis.tls.enabled: "true"

  # Repo server TLS
  reposerver.tls.enabled: "true"
```

## Set Pod Security Standards

Run ArgoCD pods with minimal privileges:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: argocd-server
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 999
    fsGroup: 999
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: argocd-server
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
```

Apply PodSecurity labels to the ArgoCD namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: argocd
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Protect Git credentials

Git repository credentials are a prime target. Protect them:

```yaml
# Use GitHub App credentials instead of SSH keys or tokens
# GitHub Apps have scoped permissions and automatic token rotation
apiVersion: v1
kind: Secret
metadata:
  name: my-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

Never store Git credentials in ArgoCD ConfigMaps. Always use Kubernetes Secrets with external secrets management:

```yaml
# Use External Secrets Operator to manage ArgoCD repo credentials
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: argocd-repo-creds
  namespace: argocd
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault
    kind: ClusterSecretStore
  target:
    name: my-repo-creds
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repo-creds
  data:
    - secretKey: githubAppPrivateKey
      remoteRef:
        key: argocd/github-app-key
```

## Restrict cluster-level permissions

By default, ArgoCD service accounts get cluster-admin. Reduce this:

```yaml
# Custom ClusterRole with minimal permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-application-controller-restricted
rules:
  # Read access to discover resources
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Write access only to specific resource types
  - apiGroups: ["apps"]
    resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
    verbs: ["create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["services", "configmaps", "secrets", "serviceaccounts", "persistentvolumeclaims"]
    verbs: ["create", "update", "patch", "delete"]
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses", "networkpolicies"]
    verbs: ["create", "update", "patch", "delete"]
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["create", "update", "patch", "delete"]
  # Block dangerous resources
  # No access to: ClusterRole, ClusterRoleBinding, CustomResourceDefinition
```

## Enable audit logging

Log every action taken through ArgoCD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  server.audit.enabled: "true"
```

Set up log forwarding to a SIEM:

```bash
# ArgoCD logs include user, action, and resource details
# Example log entry:
# {"level":"info","user":"john@myorg.com","action":"sync",
#  "application":"prod-web","project":"team-alpha","time":"2026-02-26T10:30:00Z"}
```

## Scan ArgoCD images for vulnerabilities

Use a regular vulnerability scanning pipeline:

```yaml
# Trivy scan as part of ArgoCD upgrade process
apiVersion: batch/v1
kind: Job
metadata:
  name: scan-argocd-images
spec:
  template:
    spec:
      containers:
        - name: trivy
          image: aquasec/trivy:latest
          command:
            - trivy
            - image
            - --severity
            - HIGH,CRITICAL
            - --exit-code
            - "1"
            - argoproj/argocd:v2.13.0
      restartPolicy: Never
```

## Configure resource limits to prevent DoS

Prevent resource exhaustion attacks:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: argocd-quota
  namespace: argocd
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
```

## Security hardening checklist

Run through this checklist for every ArgoCD installation:

- Disable admin account after SSO configuration
- Set RBAC default policy to deny
- Configure network policies for all ArgoCD components
- Enable TLS for server, repo server, and Redis
- Use GitHub App or SSH key authentication (not personal tokens)
- Store credentials in external secret managers
- Apply restricted Pod Security Standards
- Enable audit logging
- Restrict ArgoCD service account permissions
- Scan ArgoCD images for vulnerabilities
- Set resource quotas and limits
- Configure rate limiting on the API server
- Disable web-based terminal if not needed
- Review and rotate credentials regularly

## Summary

Security hardening ArgoCD requires defense at every layer: disable default accounts, enforce strict RBAC with deny-by-default, lock down network access with policies, enforce TLS everywhere, protect credentials with external secret managers, run pods with minimal privileges, and log everything for audit. ArgoCD has access to your most critical infrastructure - treat its security with the same rigor you would apply to any system with cluster-admin privileges.
