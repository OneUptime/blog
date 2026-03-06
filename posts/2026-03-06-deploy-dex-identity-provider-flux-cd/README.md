# How to Deploy Dex Identity Provider with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, dex, identity provider, oidc, kubernetes, authentication, security, gitops

Description: A practical guide to deploying Dex as an OpenID Connect identity provider on Kubernetes using Flux CD for centralized authentication.

---

## Introduction

Dex is an OpenID Connect (OIDC) identity provider that acts as a portal to other identity providers. It supports connectors for LDAP, SAML, GitHub, GitLab, Google, and many more backends. By deploying Dex with Flux CD, you can manage your Kubernetes authentication infrastructure through GitOps, enabling centralized SSO for tools like Kubernetes API server, ArgoCD, Grafana, and custom applications.

This guide walks through deploying Dex, configuring identity connectors, and integrating it with Kubernetes OIDC authentication.

## Prerequisites

- A Kubernetes cluster (v1.25+)
- Flux CD installed and bootstrapped
- A domain name with TLS certificates (or cert-manager)
- kubectl and flux CLI tools installed

## Repository Structure

```
clusters/
  my-cluster/
    dex/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      ingress.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/dex/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dex
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Add the Dex Helm Repository

```yaml
# clusters/my-cluster/dex/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: dex
  namespace: dex
spec:
  interval: 1h
  # Official Dex Helm chart repository
  url: https://charts.dexidp.io
```

## Step 3: Deploy Dex with HelmRelease

```yaml
# clusters/my-cluster/dex/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: dex
  namespace: dex
spec:
  interval: 30m
  chart:
    spec:
      chart: dex
      version: "0.19.x"
      sourceRef:
        kind: HelmRepository
        name: dex
        namespace: dex
      interval: 12h
  values:
    # Replica count for high availability
    replicas: 2

    # Resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi

    # Dex configuration
    config:
      # The issuer URL must match the public URL of Dex
      issuer: https://dex.example.com

      # Storage backend for tokens and keys
      storage:
        type: kubernetes
        config:
          inCluster: true

      # Web server configuration
      web:
        http: 0.0.0.0:5556

      # gRPC API for programmatic access
      grpc:
        addr: 0.0.0.0:5557

      # Telemetry endpoint for Prometheus metrics
      telemetry:
        http: 0.0.0.0:5558

      # Token expiry configuration
      expiry:
        # How long ID tokens are valid
        idTokens: "24h"
        # How long signing keys are valid
        signingKeys: "6h"
        # Refresh token settings
        refreshTokens:
          reuseInterval: "3s"
          validIfNotUsedFor: "168h"
          absoluteLifetime: "720h"

      # OAuth2 settings
      oauth2:
        # Return response in URL parameters
        responseTypes: ["code"]
        # Skip the approval screen
        skipApprovalScreen: true

      # Identity provider connectors
      connectors:
        # GitHub connector for developer authentication
        - type: github
          id: github
          name: GitHub
          config:
            clientID: $GITHUB_CLIENT_ID
            clientSecret: $GITHUB_CLIENT_SECRET
            redirectURI: https://dex.example.com/callback
            # Restrict to specific organization
            orgs:
              - name: my-organization
                teams:
                  - platform-team
                  - developers

        # LDAP connector for enterprise directory
        - type: ldap
          id: ldap
          name: Corporate LDAP
          config:
            host: ldap.example.com:636
            # Enable TLS for LDAP connection
            insecureNoSSL: false
            insecureSkipVerify: false
            rootCA: /etc/dex/ldap-ca/ca.crt
            # Bind credentials for LDAP search
            bindDN: cn=serviceaccount,dc=example,dc=com
            bindPW: $LDAP_BIND_PASSWORD
            # User search configuration
            userSearch:
              baseDN: ou=users,dc=example,dc=com
              filter: "(objectClass=person)"
              username: uid
              idAttr: uid
              emailAttr: mail
              nameAttr: cn
            # Group search configuration
            groupSearch:
              baseDN: ou=groups,dc=example,dc=com
              filter: "(objectClass=groupOfNames)"
              userMatchers:
                - userAttr: DN
                  groupAttr: member
              nameAttr: cn

        # Google connector for GSuite users
        - type: google
          id: google
          name: Google
          config:
            clientID: $GOOGLE_CLIENT_ID
            clientSecret: $GOOGLE_CLIENT_SECRET
            redirectURI: https://dex.example.com/callback
            # Restrict to hosted domain
            hostedDomains:
              - example.com

      # Static clients (applications that use Dex for auth)
      staticClients:
        # Kubernetes OIDC authentication
        - id: kubernetes
          name: Kubernetes
          secret: $KUBERNETES_CLIENT_SECRET
          redirectURIs:
            - http://localhost:8000
            - http://localhost:18000

        # Grafana SSO
        - id: grafana
          name: Grafana
          secret: $GRAFANA_CLIENT_SECRET
          redirectURIs:
            - https://grafana.example.com/login/generic_oauth

        # Custom application
        - id: my-app
          name: My Application
          secret: $MY_APP_CLIENT_SECRET
          redirectURIs:
            - https://app.example.com/auth/callback

    # Environment variables from secrets
    envVars:
      - name: GITHUB_CLIENT_ID
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: github-client-id
      - name: GITHUB_CLIENT_SECRET
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: github-client-secret
      - name: GOOGLE_CLIENT_ID
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: google-client-id
      - name: GOOGLE_CLIENT_SECRET
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: google-client-secret
      - name: LDAP_BIND_PASSWORD
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: ldap-bind-password
      - name: KUBERNETES_CLIENT_SECRET
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: kubernetes-client-secret
      - name: GRAFANA_CLIENT_SECRET
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: grafana-client-secret
      - name: MY_APP_CLIENT_SECRET
        valueFrom:
          secretKeyRef:
            name: dex-secrets
            key: my-app-client-secret

    # Service configuration
    service:
      type: ClusterIP
      ports:
        http:
          port: 5556
        grpc:
          port: 5557
        telemetry:
          port: 5558

    # Service monitor for Prometheus
    serviceMonitor:
      enabled: true
```

## Step 4: Create an Ingress

```yaml
# clusters/my-cluster/dex/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dex
  namespace: dex
  annotations:
    # Use cert-manager for TLS certificate
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - dex.example.com
      secretName: dex-tls
  rules:
    - host: dex.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dex
                port:
                  number: 5556
```

## Step 5: Create Secrets with SOPS

Create an encrypted secrets file for Dex credentials.

```yaml
# clusters/my-cluster/dex/dex-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: dex-secrets
  namespace: dex
type: Opaque
stringData:
  github-client-id: ENC[AES256_GCM,data:...,type:str]
  github-client-secret: ENC[AES256_GCM,data:...,type:str]
  google-client-id: ENC[AES256_GCM,data:...,type:str]
  google-client-secret: ENC[AES256_GCM,data:...,type:str]
  ldap-bind-password: ENC[AES256_GCM,data:...,type:str]
  kubernetes-client-secret: ENC[AES256_GCM,data:...,type:str]
  grafana-client-secret: ENC[AES256_GCM,data:...,type:str]
  my-app-client-secret: ENC[AES256_GCM,data:...,type:str]
# Encrypted with SOPS - these values are placeholders
```

## Step 6: Configure Kubernetes API Server for OIDC

To use Dex for Kubernetes authentication, configure the API server flags:

```bash
# Add these flags to your Kubernetes API server configuration
# (e.g., in kubeadm config, EKS OIDC, or cloud provider settings)

# The issuer URL of Dex
--oidc-issuer-url=https://dex.example.com

# The client ID for Kubernetes
--oidc-client-id=kubernetes

# The claim to use as the username
--oidc-username-claim=email

# The claim to use for group membership
--oidc-groups-claim=groups

# Prefix for OIDC usernames to avoid conflicts
--oidc-username-prefix="oidc:"

# Prefix for OIDC groups
--oidc-groups-prefix="oidc:"
```

## Step 7: Create RBAC for OIDC Users

```yaml
# clusters/my-cluster/dex/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-platform-admins
subjects:
  - kind: Group
    # Group name matches the connector group with prefix
    name: "oidc:platform-team"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: oidc-developers
subjects:
  - kind: Group
    name: "oidc:developers"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  # Developers get read-only access
  name: view
  apiGroup: rbac.authorization.k8s.io
```

## Step 8: Flux Kustomization

```yaml
# clusters/my-cluster/dex/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: dex
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/dex
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Enable SOPS decryption for secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: dex
      namespace: dex
```

## Verifying the Deployment

```bash
# Check Dex pods are running
kubectl get pods -n dex

# Verify the Dex service is available
kubectl get svc -n dex

# Check Dex discovery endpoint
kubectl run curl-test --rm -it --image=curlimages/curl -- \
  curl -s https://dex.example.com/.well-known/openid-configuration | jq .

# Test authentication flow using kubelogin
kubectl oidc-login setup \
  --oidc-issuer-url=https://dex.example.com \
  --oidc-client-id=kubernetes \
  --oidc-client-secret=<your-secret>

# Verify Flux reconciliation
flux get helmrelease -n dex
```

## Troubleshooting

```bash
# Check Dex logs for connector errors
kubectl logs -n dex -l app.kubernetes.io/name=dex --tail=50

# Verify the issuer URL is accessible
kubectl exec -n dex deploy/dex -- wget -qO- http://localhost:5556/.well-known/openid-configuration

# Check connector status in Dex logs
kubectl logs -n dex -l app.kubernetes.io/name=dex | grep -i "connector"

# Verify secrets are mounted correctly
kubectl describe pod -n dex -l app.kubernetes.io/name=dex

# Check ingress is properly configured
kubectl describe ingress -n dex dex
```

## Security Best Practices

- Always use TLS for the Dex endpoint and enforce HTTPS redirects
- Encrypt sensitive connector credentials using SOPS or Sealed Secrets
- Use short-lived ID tokens and configure appropriate refresh token lifetimes
- Restrict GitHub connectors to specific organizations and teams
- Enable audit logging to track authentication events
- Use RBAC to map OIDC groups to appropriate Kubernetes roles
- Rotate client secrets regularly and use Flux to deploy updated secrets

## Conclusion

Deploying Dex with Flux CD provides a GitOps-managed identity provider that centralizes authentication for your Kubernetes ecosystem. By using connectors to external identity providers like GitHub, LDAP, and Google, you can leverage existing user directories while providing a unified OIDC interface. Flux CD ensures your Dex configuration is version-controlled, auditable, and consistently deployed, making it easy to manage authentication across multiple clusters.
