# How to Organize Cert-Manager Before Ingress in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Cert-Manager, Ingress, TLS, Repository Structure

Description: Learn how to structure your Flux repository to ensure cert-manager is fully deployed and ready before ingress resources that depend on TLS certificates are created.

---

## Why Ordering Matters

Cert-manager must be fully installed and operational before any Ingress resource with TLS annotations is created. If an Ingress resource references a cert-manager ClusterIssuer or Issuer that does not yet exist, the TLS certificate will not be provisioned, and the Ingress will serve traffic without encryption or fail entirely.

## Repository Structure

Organize your Flux repository into distinct layers with explicit dependencies:

```text
flux-repo/
├── clusters/
│   └── production/
│       ├── infrastructure.yaml
│       ├── issuers.yaml
│       └── apps.yaml
├── infrastructure/
│   └── cert-manager/
│       ├── kustomization.yaml
│       ├── namespace.yaml
│       └── helmrelease.yaml
├── issuers/
│   └── production/
│       ├── kustomization.yaml
│       └── letsencrypt-issuer.yaml
└── apps/
    └── production/
        ├── kustomization.yaml
        └── web-app/
            ├── deployment.yaml
            ├── service.yaml
            └── ingress.yaml
```

## Layer 1: Install Cert-Manager

Define a Kustomization that installs cert-manager using a HelmRelease:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/cert-manager
  prune: true
  wait: true
```

The cert-manager HelmRelease:

```yaml
# infrastructure/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 1h
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    installCRDs: true
    prometheus:
      enabled: true
```

Add the Jetstack Helm repository:

```yaml
# infrastructure/cert-manager/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

```yaml
# infrastructure/cert-manager/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
```

## Layer 2: Create Issuers

The issuers layer depends on the infrastructure layer being fully ready:

```yaml
# clusters/production/issuers.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: issuers
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./issuers/production
  prune: true
  wait: true
```

Define the ClusterIssuer for Let's Encrypt:

```yaml
# issuers/production/letsencrypt-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Layer 3: Deploy Applications with Ingress

Applications that use TLS ingress depend on both infrastructure and issuers:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
    - name: issuers
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
```

The Ingress resource can now safely reference the ClusterIssuer:

```yaml
# apps/production/web-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: default
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: web-app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

## Adding Health Checks

Add health checks to the infrastructure Kustomization to verify cert-manager is fully operational:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/cert-manager
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-webhook
      namespace: cert-manager
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-cainjector
      namespace: cert-manager
```

## Verifying the Setup

Check that the dependency chain is being respected:

```bash
# Verify all kustomizations are reconciled in order
flux get kustomizations

# Check cert-manager is running
kubectl get pods -n cert-manager

# Verify the ClusterIssuer is ready
kubectl get clusterissuers

# Check that certificates are being issued
kubectl get certificates --all-namespaces
```

## Troubleshooting

If ingress TLS is not working, check the dependency chain:

```bash
# Check if issuers kustomization is waiting on infrastructure
flux get kustomization issuers

# Check cert-manager logs for errors
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate request status
kubectl describe certificaterequest -n default
```

## Conclusion

Structuring your Flux repository with cert-manager as an explicit dependency of ingress resources prevents TLS provisioning failures. The three-layer approach of infrastructure (cert-manager installation), issuers (ClusterIssuer/Issuer creation), and apps (Ingress with TLS) provides a reliable deployment pipeline. Using `dependsOn` and `wait: true` ensures each layer is fully operational before the next begins.
