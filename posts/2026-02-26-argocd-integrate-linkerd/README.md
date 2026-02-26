# How to Integrate ArgoCD with Linkerd Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Linkerd, Service Mesh

Description: Learn how to integrate ArgoCD with Linkerd service mesh for GitOps-managed mTLS, traffic splitting, service profiles, and mesh observability in your Kubernetes cluster.

---

Linkerd is a lightweight, security-first service mesh for Kubernetes. Unlike Istio's broad feature set, Linkerd focuses on simplicity - automatic mTLS, observability, and reliability features with minimal configuration. Integrating Linkerd with ArgoCD lets you manage your entire mesh configuration through Git, from the control plane installation to per-service traffic policies. This guide covers the practical steps to make the two work together.

## Why Linkerd and ArgoCD Work Well Together

Linkerd's design philosophy aligns naturally with GitOps:

- Linkerd configuration is declarative and lives in Kubernetes resources
- The mesh is lightweight and does not inject as many fields as Istio
- Linkerd uses standard Kubernetes annotations for configuration
- The control plane is straightforward to manage with Helm charts

The integration challenges are simpler than with Istio, but there are still gotchas around certificate management, proxy injection differences, and CRD health checks.

## Installing Linkerd with ArgoCD

Linkerd requires certificates for mTLS identity. Generate them before installing:

```bash
# Generate trust anchor certificate (valid for 10 years)
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure --not-after=87600h

# Generate issuer certificate (valid for 1 year)
step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
  --profile intermediate-ca --not-after=8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key
```

Store the certificates as Kubernetes secrets:

```bash
kubectl create namespace linkerd
kubectl create secret tls linkerd-trust-anchor \
  --cert=ca.crt --key=ca.key -n linkerd
```

Now deploy Linkerd through ArgoCD:

```yaml
# Linkerd CRDs
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: linkerd-crds
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://helm.linkerd.io/edge
    chart: linkerd-crds
    targetRevision: 2024.11.1
  destination:
    server: https://kubernetes.default.svc
    namespace: linkerd
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
      - Replace=true

---
# Linkerd Control Plane
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: linkerd-control-plane
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: infrastructure
  source:
    repoURL: https://helm.linkerd.io/edge
    chart: linkerd-control-plane
    targetRevision: 2024.11.1
    helm:
      values: |
        identityTrustAnchorsPEM: |
          <paste ca.crt contents here>
        identity:
          issuer:
            tls:
              crtPEM: |
                <paste issuer.crt contents here>
              keyPEM: |
                <paste issuer.key contents here>
        proxy:
          resources:
            cpu:
              request: 100m
            memory:
              request: 64Mi
              limit: 256Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: linkerd
  syncPolicy:
    automated:
      prune: true

---
# Linkerd Viz (dashboard and metrics)
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: linkerd-viz
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: infrastructure
  source:
    repoURL: https://helm.linkerd.io/edge
    chart: linkerd-viz
    targetRevision: 2024.11.1
  destination:
    server: https://kubernetes.default.svc
    namespace: linkerd-viz
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
```

## Handling Proxy Injection Differences

Linkerd injects a proxy sidecar via a mutating admission webhook, similar to Istio but less invasive. Configure ArgoCD to ignore the injected fields:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.template.metadata.annotations["linkerd.io/proxy-version"]
      - .spec.template.metadata.annotations["linkerd.io/trust-root-sha256"]
      - .spec.template.metadata.annotations["linkerd.io/proxy-injector"]
      - .spec.template.metadata.labels["linkerd.io/proxy-deployment"]
      - .spec.template.metadata.labels["linkerd.io/workload-ns"]
    managedFieldsManagers:
      - linkerd-proxy-injector

  resource.customizations.ignoreDifferences.apps_StatefulSet: |
    managedFieldsManagers:
      - linkerd-proxy-injector

  resource.customizations.ignoreDifferences.batch_CronJob: |
    managedFieldsManagers:
      - linkerd-proxy-injector
```

## Custom Health Checks for Linkerd CRDs

Add health checks for Linkerd custom resources:

```yaml
# argocd-cm ConfigMap
data:
  # ServiceProfile health
  resource.customizations.health.linkerd.io_ServiceProfile: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "ServiceProfile configured"
    return hs

  # TrafficSplit health (SMI spec)
  resource.customizations.health.split.smi-spec.io_TrafficSplit: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "TrafficSplit configured"
    return hs

  # Server health (Linkerd policy)
  resource.customizations.health.policy.linkerd.io_Server: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "Server policy configured"
    return hs

  # ServerAuthorization health
  resource.customizations.health.policy.linkerd.io_ServerAuthorization: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "ServerAuthorization configured"
    return hs
```

## Managing Service Profiles through GitOps

Service Profiles configure per-route metrics and retries in Linkerd. Manage them in Git:

```yaml
# Git: linkerd-config/my-app/service-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: my-app.my-namespace.svc.cluster.local
  namespace: my-namespace
spec:
  routes:
    - name: GET /api/health
      condition:
        method: GET
        pathRegex: /api/health
      isRetryable: true
      timeout: 5s

    - name: POST /api/orders
      condition:
        method: POST
        pathRegex: /api/orders
      isRetryable: false
      timeout: 30s

    - name: GET /api/orders/{id}
      condition:
        method: GET
        pathRegex: /api/orders/[^/]+
      isRetryable: true
      timeout: 10s
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 120s
```

## Traffic Splitting with Linkerd and ArgoCD

Linkerd supports the SMI TrafficSplit spec for canary deployments:

```yaml
# stable deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
  namespace: my-namespace
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
      version: stable
  template:
    metadata:
      labels:
        app: my-app
        version: stable
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
        - name: my-app
          image: my-org/my-app:v1.0.0

---
# canary deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
  namespace: my-namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
      version: canary
  template:
    metadata:
      labels:
        app: my-app
        version: canary
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
        - name: my-app
          image: my-org/my-app:v2.0.0

---
# Traffic split: 90% stable, 10% canary
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: my-app
  namespace: my-namespace
spec:
  service: my-app
  backends:
    - service: my-app-stable
      weight: 900
    - service: my-app-canary
      weight: 100
```

Updating the traffic split weights is a Git commit and PR, reviewed by your team before ArgoCD applies it.

## Linkerd Authorization Policies via GitOps

Manage Linkerd's authorization policies through ArgoCD:

```yaml
# Only allow traffic from specific sources
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: my-app-http
  namespace: my-namespace
spec:
  podSelector:
    matchLabels:
      app: my-app
  port: 8080
  proxyProtocol: HTTP/2

---
apiVersion: policy.linkerd.io/v1alpha1
kind: ServerAuthorization
metadata:
  name: allow-frontend
  namespace: my-namespace
spec:
  server:
    name: my-app-http
  client:
    meshTLS:
      serviceAccounts:
        - name: frontend
          namespace: frontend-namespace
```

## Certificate Rotation with ArgoCD

Linkerd certificates expire and need rotation. Automate this with cert-manager and ArgoCD:

```yaml
# Use cert-manager to manage Linkerd certificates
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: linkerd-identity-issuer
  namespace: linkerd
spec:
  secretName: linkerd-identity-issuer
  duration: 48h
  renewBefore: 25h
  issuerRef:
    name: linkerd-trust-anchor
    kind: ClusterIssuer
  commonName: identity.linkerd.cluster.local
  dnsNames:
    - identity.linkerd.cluster.local
  isCA: true
  privateKey:
    algorithm: ECDSA
  usages:
    - cert sign
    - crl sign
    - server auth
    - client auth
```

## Monitoring the Integration

Verify both Linkerd and ArgoCD are healthy:

```bash
# Check Linkerd health
linkerd check

# Check ArgoCD application status for Linkerd
argocd app get linkerd-control-plane
argocd app get linkerd-viz

# Verify proxy injection is working
kubectl get pods -n my-namespace -o json | \
  jq '.items[] | {name: .metadata.name, containers: [.spec.containers[].name]}'
```

## Best Practices

1. **Use cert-manager** for automated certificate rotation rather than manual cert management.
2. **Separate Linkerd CRDs** into their own ArgoCD application with `Replace=true` sync option.
3. **Pin chart versions** to prevent unexpected Linkerd upgrades.
4. **Use server-side diff** to cleanly handle proxy injection differences.
5. **Test upgrades in staging** - Linkerd control plane upgrades can affect running proxies.
6. **Store certificates in a secrets manager** rather than directly in Git.

Linkerd's simplicity makes it a natural fit for GitOps management with ArgoCD. For more on handling proxy injection fields, see [How to Ignore Server-Side Fields in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-ignore-server-side-fields/view).
