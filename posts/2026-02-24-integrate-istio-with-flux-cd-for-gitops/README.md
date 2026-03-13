# How to Integrate Istio with Flux CD for GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Flux CD, GitOps, Kubernetes, Deployments

Description: How to manage Istio service mesh configuration using Flux CD for GitOps-based deployment and reconciliation.

---

Flux CD is a CNCF graduated GitOps tool that keeps your Kubernetes cluster in sync with configuration stored in Git. If you prefer a more Kubernetes-native, controller-based approach to GitOps compared to Argo CD, Flux is an excellent choice. It works by running a set of controllers that watch Git repositories (and Helm repos and OCI registries) and reconcile the desired state with your cluster.

## Installing Flux CD

Install the Flux CLI:

```bash
brew install fluxcd/tap/flux
```

Bootstrap Flux into your cluster. This command creates a Git repository (or uses an existing one) and installs the Flux controllers:

```bash
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

Verify the installation:

```bash
flux check
kubectl get pods -n flux-system
```

You should see the source-controller, kustomize-controller, helm-controller, and notification-controller pods running.

## Repository Structure for Istio with Flux

A well-organized repo structure makes managing Istio configuration much easier:

```text
clusters/
├── production/
│   ├── flux-system/
│   │   └── gotk-sync.yaml
│   ├── infrastructure.yaml
│   └── apps.yaml
infrastructure/
├── istio/
│   ├── namespace.yaml
│   ├── istio-base/
│   │   └── helmrelease.yaml
│   ├── istiod/
│   │   └── helmrelease.yaml
│   ├── gateway/
│   │   └── helmrelease.yaml
│   └── mesh-config/
│       ├── kustomization.yaml
│       ├── peer-authentication.yaml
│       ├── gateway.yaml
│       └── authorization-policies/
apps/
├── frontend/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── virtual-service.yaml
│   └── destination-rule.yaml
└── backend/
    ├── kustomization.yaml
    ├── deployment.yaml
    ├── service.yaml
    ├── virtual-service.yaml
    └── destination-rule.yaml
```

## Managing Istio Installation with Flux

Install Istio using Helm through Flux's HelmRelease resources. First, add the Istio Helm repository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: istio
  namespace: flux-system
spec:
  interval: 1h
  url: https://istio-release.storage.googleapis.com/charts
```

Install istio-base (CRDs):

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: istio-base
  namespace: istio-system
spec:
  interval: 30m
  chart:
    spec:
      chart: base
      version: "1.22.x"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
```

Install istiod:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: istiod
  namespace: istio-system
spec:
  interval: 30m
  dependsOn:
  - name: istio-base
  chart:
    spec:
      chart: istiod
      version: "1.22.x"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
  values:
    meshConfig:
      accessLogFile: /dev/stdout
      enableTracing: true
      defaultConfig:
        tracing:
          sampling: 10
    pilot:
      resources:
        requests:
          cpu: 200m
          memory: 256Mi
```

Install the ingress gateway:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: istio-ingress
  namespace: istio-system
spec:
  interval: 30m
  dependsOn:
  - name: istiod
  chart:
    spec:
      chart: gateway
      version: "1.22.x"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
  values:
    service:
      type: LoadBalancer
```

The `dependsOn` field ensures resources are installed in the correct order.

## Managing Istio Config Resources with Kustomizations

Create a Flux Kustomization that points to your Istio configuration directory:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-mesh-config
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: istio-system
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/istio/mesh-config
  prune: true
  dependsOn:
  - name: istio-controller
  healthChecks:
  - apiVersion: networking.istio.io/v1
    kind: Gateway
    name: main-gateway
    namespace: istio-system
```

The `prune: true` option means Flux will delete resources from the cluster that are no longer in Git. This prevents configuration drift.

## Defining Istio Resources in Git

Now add your Istio resources to the repository. For example, a mesh-wide PeerAuthentication:

```yaml
# infrastructure/istio/mesh-config/peer-authentication.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

A shared Gateway:

```yaml
# infrastructure/istio/mesh-config/gateway.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingress
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: main-tls
    hosts:
    - "*.example.com"
```

Application-specific VirtualServices:

```yaml
# apps/frontend/virtual-service.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: frontend
spec:
  hosts:
  - frontend.example.com
  gateways:
  - istio-system/main-gateway
  http:
  - route:
    - destination:
        host: frontend
        port:
          number: 8080
    retries:
      attempts: 3
      perTryTimeout: 2s
```

## Setting Up Notifications

Flux has a built-in notification system. Configure alerts for Istio resource reconciliation events:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: flux-notifications
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: istio-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: istio-mesh-config
  - kind: HelmRelease
    name: istiod
    namespace: istio-system
  - kind: HelmRelease
    name: istio-ingress
    namespace: istio-system
```

## Handling Istio Upgrades

Upgrading Istio with Flux is as simple as changing the version in your HelmRelease. For canary upgrades, Istio supports running multiple control plane versions. Update the version in Git:

```yaml
spec:
  chart:
    spec:
      chart: istiod
      version: "1.23.x"  # Updated from 1.22.x
```

Commit, push, and Flux takes care of the rest. If the upgrade fails, Flux will report the error and you can revert the commit.

## Monitoring Reconciliation

Check the status of Flux reconciliation:

```bash
# Check all Flux resources
flux get all

# Check specific Kustomization
flux get kustomization istio-mesh-config

# Check HelmRelease status
flux get helmrelease -n istio-system

# Force a reconciliation
flux reconcile kustomization istio-mesh-config
```

If a reconciliation fails, Flux provides detailed error messages:

```bash
flux logs --kind=Kustomization --name=istio-mesh-config
```

Flux CD provides a clean and Kubernetes-native way to manage Istio configuration through GitOps. The dependency management between HelmReleases ensures Istio components install in the right order, and the continuous reconciliation loop catches any manual changes or drift. For teams already invested in the Flux ecosystem, this integration keeps Istio management consistent with how everything else in the cluster is managed.
