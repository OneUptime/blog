# How to Deploy the Cert-Manager Operator with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, cert-manager, TLS

Description: Learn how to deploy cert-manager with ArgoCD for automated TLS certificate management, including CRD handling, ClusterIssuers, and Let's Encrypt integration.

---

Cert-manager is the standard way to handle TLS certificates in Kubernetes. It automates certificate issuance and renewal from providers like Let's Encrypt, HashiCorp Vault, and private CAs. Deploying cert-manager with ArgoCD gives you a GitOps-managed certificate infrastructure where every issuer, certificate, and configuration change is tracked in Git.

This guide covers the full setup, from CRDs to working certificates.

## Why Cert-Manager with ArgoCD?

Managing TLS certificates manually is error-prone. Certificates expire, issuers get misconfigured, and there is no audit trail for changes. With cert-manager managed by ArgoCD, you get:

- Version-controlled certificate policies
- Automated drift detection if someone manually changes a certificate
- Easy rollback of issuer configuration changes
- Consistent certificate management across environments

## Step 1: Deploy Cert-Manager CRDs

Cert-manager CRDs are large and should be managed separately. Create a dedicated ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
spec:
  project: default
  source:
    repoURL: https://github.com/cert-manager/cert-manager.git
    targetRevision: v1.14.0
    path: deploy/crds
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - ServerSideApply=true
      - Replace=true
      # Never prune CRDs - deleting them removes all certificates
      - Prune=false
```

The `Prune=false` option is critical. If you accidentally remove CRD manifests from Git, you do not want ArgoCD to delete the CRDs and cascade-delete every Certificate in your cluster.

## Step 2: Deploy Cert-Manager

Now deploy cert-manager itself using the Helm chart:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cert-manager
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: default
  source:
    repoURL: https://charts.jetstack.io
    chart: cert-manager
    targetRevision: v1.14.0
    helm:
      # CRDs are managed separately
      skipCrds: true
      values: |
        # Enable prometheus metrics
        prometheus:
          enabled: true
          servicemonitor:
            enabled: true

        # Resource limits
        resources:
          requests:
            cpu: 50m
            memory: 128Mi
          limits:
            memory: 256Mi

        # Webhook configuration
        webhook:
          resources:
            requests:
              cpu: 25m
              memory: 64Mi
            limits:
              memory: 128Mi

        # CA injector
        cainjector:
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              memory: 256Mi

        # Install CRDs separately
        installCRDs: false

        # DNS01 solver configuration for cloud providers
        # Uncomment for AWS Route53
        # serviceAccount:
        #   annotations:
        #     eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT:role/cert-manager
  destination:
    server: https://kubernetes.default.svc
    namespace: cert-manager
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Step 3: Configure ClusterIssuers

With cert-manager running, define your certificate issuers. These should be in a separate sync wave or Application to ensure cert-manager is ready.

Here is a Let's Encrypt setup with both staging and production issuers:

```yaml
# Staging issuer for testing
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: platform-team@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
---
# Production issuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      # HTTP01 challenge solver
      - http01:
          ingress:
            class: nginx
        selector: {}
```

For DNS01 challenges with AWS Route53:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            # Uses IRSA for authentication
        selector:
          dnsZones:
            - "example.com"
```

## Step 4: Request Certificates

Now your applications can request certificates through Git. Add Certificate resources to your application manifests:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-tls
  namespace: default
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  secretName: api-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.example.com
    - api-v2.example.com
  duration: 2160h    # 90 days
  renewBefore: 720h  # Renew 30 days before expiry
```

Or use Ingress annotations to automatically generate certificates:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-secret
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
```

## Custom Health Checks

Add health checks for cert-manager resources to ArgoCD:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.cert-manager.io_Certificate: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Ready" then
            if condition.status == "True" then
              hs.status = "Healthy"
              hs.message = "Certificate is ready"
            elseif condition.status == "False" then
              hs.status = "Degraded"
              hs.message = condition.message or "Certificate is not ready"
            else
              hs.status = "Progressing"
              hs.message = "Certificate is being issued"
            end
            return hs
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for certificate status"
    return hs

  resource.customizations.health.cert-manager.io_ClusterIssuer: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.conditions ~= nil then
        for i, condition in ipairs(obj.status.conditions) do
          if condition.type == "Ready" then
            if condition.status == "True" then
              hs.status = "Healthy"
              hs.message = "ClusterIssuer is ready"
            else
              hs.status = "Degraded"
              hs.message = condition.message or "ClusterIssuer is not ready"
            end
            return hs
          end
        end
      end
    end
    hs.status = "Progressing"
    hs.message = "Waiting for issuer status"
    return hs
```

## Private CA Setup

For internal services, you can use cert-manager with a private Certificate Authority:

```yaml
# Create a self-signed issuer to bootstrap the CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
# Create the CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: Internal CA
  secretName: internal-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 8760h  # 1 year before expiry
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
  privateKey:
    algorithm: ECDSA
    size: 256
---
# Create a ClusterIssuer using the CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-secret
```

## Troubleshooting Common Issues

**Certificate stuck in "Issuing" state**: Check cert-manager logs and the Order and Challenge resources.

```bash
# Check certificate status
kubectl describe certificate api-tls -n default

# Check the order
kubectl get orders -n default

# Check challenges
kubectl get challenges -n default

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

**Webhook timeouts during sync**: Cert-manager installs a webhook that validates CRs. If the webhook is not ready, CR creation fails. Using sync waves ensures cert-manager is running before CRs are applied.

**ArgoCD shows OutOfSync for Certificate secrets**: Cert-manager creates and manages TLS Secrets. Tell ArgoCD to ignore these:

```yaml
# In argocd-cm
data:
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - Secret
      clusters:
        - "*"
```

Or more precisely, ignore only cert-manager managed secrets by adding annotations.

## Summary

Deploying cert-manager with ArgoCD gives you a fully automated, GitOps-managed certificate infrastructure. The key steps are: manage CRDs separately with `Prune=false`, deploy cert-manager with Helm, configure issuers in a separate sync wave, and add health checks. With this setup, requesting a new certificate is as simple as adding a Certificate manifest to your Git repository. For more on deploying operators generally, see our guide on [handling CRD and CR ordering with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-how-to-handle-crd-and-cr-ordering-with-argocd/view).
