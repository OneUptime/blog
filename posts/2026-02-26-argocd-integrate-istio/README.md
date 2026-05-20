# How to Integrate ArgoCD with Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Istio, Service Mesh

Description: Learn how to integrate ArgoCD with Istio service mesh for GitOps-managed traffic routing, canary deployments, mutual TLS configuration, and service mesh observability.

---

Istio service mesh adds powerful networking capabilities to Kubernetes - traffic routing, mutual TLS, observability, and policy enforcement. Managing Istio configuration through GitOps with ArgoCD ensures that your mesh configuration is version-controlled, auditable, and reproducible. But the integration is not straightforward. Istio injects sidecar containers, manages CRDs with their own lifecycle, and introduces resources that ArgoCD does not understand out of the box. This guide covers how to make ArgoCD and Istio work together smoothly.

## The Integration Challenges

Before diving into solutions, understand what makes Istio and ArgoCD tricky together:

1. **Sidecar injection** - Istio's mutating webhook injects the Envoy proxy container into Pods at creation time. Automatic injection does not patch the Deployment itself, but directly managed Pod manifests and other admission-mutated resources can still produce diff noise.
2. **CRD health** - ArgoCD does not know how to assess the health of Istio custom resources
3. **Resource ordering** - Istio CRDs must exist before you can create VirtualServices and DestinationRules
4. **Status fields** - If Istio configuration status is enabled, Istio controllers update status fields that can trigger false OutOfSync reports

## Managing Istio Installation with ArgoCD

First, deploy Istio itself through ArgoCD using the Istio Helm charts:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-base
  namespace: argocd
spec:
  project: infrastructure
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: base
    targetRevision: 1.30.0
    helm:
      values: |
        defaultRevision: default
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
    managedNamespaceMetadata:
      labels:
        istio-injection: disabled

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istiod
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  project: infrastructure
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: istiod
    targetRevision: 1.30.0
    helm:
      values: |
        meshConfig:
          accessLogFile: /dev/stdout
          enableAutoMtls: true
        pilot:
          autoscaleMin: 2
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
  syncPolicy:
    automated:
      prune: true

---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-ingress
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  project: infrastructure
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: gateway
    targetRevision: 1.30.0
    helm:
      values: |
        service:
          type: LoadBalancer
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-ingress
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - CreateNamespace=true
```

## Handling Sidecar Injection Differences

Istio's automatic sidecar injection happens at the Pod level, so ArgoCD will not see injected containers in the Deployment object itself. If you manage Pod manifests directly or compare other admission-mutated resources, configure ArgoCD to ignore injected fields:

```yaml
# argocd-cm ConfigMap

apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore Istio sidecar injection differences
  resource.customizations.ignoreDifferences._Pod: |
    jqPathExpressions:
      - .metadata.annotations["sidecar.istio.io/status"]
      - .metadata.annotations["prometheus.io/path"]
      - .metadata.annotations["prometheus.io/port"]
      - .metadata.annotations["prometheus.io/scrape"]
      - .metadata.labels["security.istio.io/tlsMode"]
      - .metadata.labels["service.istio.io/canonical-name"]
      - .metadata.labels["service.istio.io/canonical-revision"]
      - .spec.initContainers[]? | select(.name == "istio-init")
      - .spec.containers[]? | select(.name == "istio-proxy")
      - .spec.volumes[]? | select(.name == "istio-envoy" or .name == "istio-data" or .name == "istio-podinfo" or .name == "istio-token" or .name == "istiod-ca-cert")
    managedFieldsManagers:
      - istio-sidecar-injector
```

Alternatively, enable server-side diff in the argocd-cmd-params-cm ConfigMap and add the compare option on applications that need mutating webhook output included in diff calculation:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd.argoproj.io/compare-options: IncludeMutationWebhook=true
```

## Custom Health Checks for Istio Resources

ArgoCD does not know how to check the health of Istio CRDs. Add custom health checks:

```yaml
# argocd-cm ConfigMap
data:
  # VirtualService health check
  resource.customizations.health.networking.istio.io_VirtualService: |
    hs = {}
    if obj.status ~= nil and obj.status.validationMessages ~= nil then
      for _, msg in ipairs(obj.status.validationMessages) do
        if msg.level == "Error" then
          hs.status = "Degraded"
          hs.message = msg.message
          return hs
        end
      end
    end
    hs.status = "Healthy"
    hs.message = "VirtualService is valid"
    return hs

  # DestinationRule health check
  resource.customizations.health.networking.istio.io_DestinationRule: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "DestinationRule configured"
    return hs

  # Gateway health check
  resource.customizations.health.networking.istio.io_Gateway: |
    hs = {}
    hs.status = "Healthy"
    hs.message = "Gateway configured"
    return hs

  # PeerAuthentication health check
  resource.customizations.health.security.istio.io_PeerAuthentication: |
    hs = {}
    hs.status = "Healthy"
    return hs
```

## Managing Traffic Routing with ArgoCD

Store Istio traffic configuration in Git and manage it through ArgoCD:

```yaml
# Git repository: istio-config/my-app/virtual-service.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  namespace: my-app
spec:
  hosts:
    - my-app.mycompany.com
  gateways:
    - istio-ingress/main-gateway
  http:
    - name: canary-header
      match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-app
            subset: canary
            port:
              number: 80
    - name: primary
      route:
        - destination:
            host: my-app
            subset: stable
            port:
              number: 80
          weight: 90
        - destination:
            host: my-app
            subset: canary
            port:
              number: 80
          weight: 10

---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app
  namespace: my-app
spec:
  host: my-app
  subsets:
    - name: stable
      labels:
        app: my-app
    - name: canary
      labels:
        app: my-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Canary Deployments with ArgoCD and Istio

Combine ArgoCD with Argo Rollouts for Istio-native canary deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 5
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-org/my-app:v2.0.0
          ports:
            - containerPort: 8080
  strategy:
    canary:
      # Use Istio for traffic shifting
      trafficRouting:
        istio:
          virtualService:
            name: my-app
            routes:
              - primary
          destinationRule:
            name: my-app
            canarySubsetName: canary
            stableSubsetName: stable
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - setWeight: 30
        - pause: {duration: 5m}
        - setWeight: 60
        - pause: {duration: 5m}
        - setWeight: 100
```

## Ignoring Istio CRD Status Fields

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.ignoreDifferences.networking.istio.io_VirtualService: |
    jsonPointers:
      - /status
    jqPathExpressions:
      - .metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]

  resource.customizations.ignoreDifferences.networking.istio.io_DestinationRule: |
    jsonPointers:
      - /status

  resource.customizations.ignoreDifferences.networking.istio.io_Gateway: |
    jsonPointers:
      - /status

  resource.customizations.ignoreDifferences.security.istio.io_PeerAuthentication: |
    jsonPointers:
      - /status

  resource.customizations.ignoreDifferences.security.istio.io_AuthorizationPolicy: |
    jsonPointers:
      - /status
```

## Sync Ordering for Istio Resources

Use sync waves to ensure Istio CRDs and control plane are ready before deploying application mesh configuration:

```yaml
# Wave 0: Istio CRDs and base
# Wave 1: Istiod control plane
# Wave 2: Istio gateways
# Wave 3: Application deployments
# Wave 4: VirtualServices and DestinationRules

# In your VirtualService manifest
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "4"
```

## Best Practices

1. **Use server-side diff with mutation webhook comparison** to handle admission-mutated resources cleanly.
2. **Separate Istio infrastructure from application mesh config** into different ArgoCD applications.
3. **Use sync waves** to ensure proper resource ordering.
4. **Add health checks** for all Istio CRDs you use.
5. **Version pin Istio charts** to avoid unexpected upgrades.
6. **Test mesh changes in staging** before promoting to production via Git.

The combination of ArgoCD and Istio gives you version-controlled, auditable service mesh management. For more on ArgoCD comparison configuration needed for Istio, see [How to Ignore Server-Side Fields in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-ignore-server-side-fields/view).
