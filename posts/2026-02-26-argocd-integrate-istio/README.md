# How to Integrate ArgoCD with Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Istio, Service Mesh

Description: Learn how to integrate ArgoCD with Istio service mesh for GitOps-managed traffic routing, canary deployments, mutual TLS configuration, and service mesh observability.

---

Istio service mesh adds powerful networking capabilities to Kubernetes - traffic routing, mutual TLS, observability, and policy enforcement. Managing Istio configuration through GitOps with ArgoCD ensures that your mesh configuration is version-controlled, auditable, and reproducible. But the integration is not straightforward. Istio injects sidecar containers, manages CRDs with their own lifecycle, and introduces resources that ArgoCD does not understand out of the box. This guide covers how to make ArgoCD and Istio work together smoothly.

## The Integration Challenges

Before diving into solutions, understand what makes Istio and ArgoCD tricky together:

1. **Sidecar injection** - Istio's mutating webhook injects the envoy proxy container, making live Deployments differ from Git manifests
2. **CRD health** - ArgoCD does not know how to assess the health of Istio custom resources
3. **Resource ordering** - Istio CRDs must exist before you can create VirtualServices and DestinationRules
4. **Status fields** - Istio controllers update status fields that trigger false OutOfSync reports

## Managing Istio Installation with ArgoCD

First, deploy Istio itself through ArgoCD. Using the Istio operator or Helm charts:

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
    targetRevision: 1.20.0
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
    targetRevision: 1.20.0
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
    targetRevision: 1.20.0
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

The biggest source of diff noise is Istio's sidecar injection. Configure ArgoCD to ignore injected fields:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore Istio sidecar injection differences
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jqPathExpressions:
      - .spec.template.metadata.annotations["sidecar.istio.io/status"]
      - .spec.template.metadata.annotations["prometheus.io/path"]
      - .spec.template.metadata.annotations["prometheus.io/port"]
      - .spec.template.metadata.annotations["prometheus.io/scrape"]
      - .spec.template.metadata.labels["security.istio.io/tlsMode"]
      - .spec.template.metadata.labels["service.istio.io/canonical-name"]
      - .spec.template.metadata.labels["service.istio.io/canonical-revision"]
    managedFieldsManagers:
      - istio-sidecar-injector

  resource.customizations.ignoreDifferences.apps_StatefulSet: |
    jqPathExpressions:
      - .spec.template.metadata.annotations["sidecar.istio.io/status"]
    managedFieldsManagers:
      - istio-sidecar-injector
```

Alternatively, enable server-side diff which handles sidecar injection automatically:

```yaml
data:
  controller.diff.server.side: "true"
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
        if msg.type == "ERROR" then
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
apiVersion: networking.istio.io/v1beta1
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
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-app-canary
            port:
              number: 80
    - route:
        - destination:
            host: my-app-stable
            port:
              number: 80
          weight: 90
        - destination:
            host: my-app-canary
            port:
              number: 80
          weight: 10

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: my-app
spec:
  host: my-app
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
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "4"
```

## Best Practices

1. **Use server-side diff** to handle sidecar injection differences cleanly.
2. **Separate Istio infrastructure from application mesh config** into different ArgoCD applications.
3. **Use sync waves** to ensure proper resource ordering.
4. **Add health checks** for all Istio CRDs you use.
5. **Version pin Istio charts** to avoid unexpected upgrades.
6. **Test mesh changes in staging** before promoting to production via Git.

The combination of ArgoCD and Istio gives you version-controlled, auditable service mesh management. For more on ArgoCD comparison configuration needed for Istio, see [How to Ignore Server-Side Fields in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-ignore-server-side-fields/view).
