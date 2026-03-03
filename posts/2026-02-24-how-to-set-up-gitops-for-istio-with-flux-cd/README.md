# How to Set Up GitOps for Istio with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Flux CD, GitOps, Kubernetes, Continuous Delivery

Description: Configure Flux CD to manage Istio service mesh installation and configuration through GitOps with automated reconciliation.

---

Flux CD takes a slightly different approach to GitOps compared to Argo CD. Where Argo CD is application-centric with a UI, Flux operates more like a set of Kubernetes controllers that watch Git repositories and reconcile resources. For Istio management, Flux is lightweight, highly composable, and fits naturally into the Kubernetes ecosystem.

This guide shows how to bootstrap Flux and configure it to manage your complete Istio setup.

## Bootstrapping Flux

Install the Flux CLI:

```bash
brew install fluxcd/tap/flux
```

Bootstrap Flux into your cluster. This command creates the Flux components and sets up the Git repository connection:

```bash
flux bootstrap github \
  --owner=your-org \
  --repository=istio-gitops \
  --branch=main \
  --path=clusters/production \
  --personal
```

This creates the repository if it does not exist, installs Flux controllers, and configures them to watch the specified path.

Verify Flux is running:

```bash
flux check
```

## Repository Structure

Flux works with a directory-based structure:

```text
istio-gitops/
  clusters/
    production/
      istio-system/
        namespace.yaml
        helmrepository.yaml
        istio-base.yaml
        istiod.yaml
      istio-ingress/
        namespace.yaml
        istio-gateway.yaml
      production/
        kustomization.yaml
  istio-config/
    base/
      gateway.yaml
      peer-authentication.yaml
      kustomization.yaml
    services/
      api-gateway/
        virtualservice.yaml
        destinationrule.yaml
        kustomization.yaml
      user-service/
        virtualservice.yaml
        destinationrule.yaml
        kustomization.yaml
    overlays/
      production/
        kustomization.yaml
```

## Defining the Helm Repository Source

First, tell Flux where to find Istio charts:

```yaml
# clusters/production/istio-system/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: istio
  namespace: istio-system
spec:
  interval: 1h
  url: https://istio-release.storage.googleapis.com/charts
```

## Creating Namespaces

```yaml
# clusters/production/istio-system/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: istio-system
  labels:
    istio-injection: disabled
---
apiVersion: v1
kind: Namespace
metadata:
  name: istio-ingress
  labels:
    istio-injection: enabled
```

## Installing Istio Base with HelmRelease

```yaml
# clusters/production/istio-system/istio-base.yaml
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
      version: "1.22.0"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: istio-system
  values:
    defaultRevision: default
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
```

## Installing Istiod

```yaml
# clusters/production/istio-system/istiod.yaml
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
      version: "1.22.0"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: istio-system
  values:
    pilot:
      autoscaleEnabled: true
      autoscaleMin: 2
      autoscaleMax: 5
      resources:
        requests:
          cpu: 500m
          memory: 2Gi
        limits:
          cpu: 1000m
          memory: 4Gi
    meshConfig:
      accessLogFile: /dev/stdout
      enableAutoMtls: true
      defaultConfig:
        holdApplicationUntilProxyStarts: true
      outboundTrafficPolicy:
        mode: REGISTRY_ONLY
```

The `dependsOn` field tells Flux to wait for istio-base to be successfully reconciled before attempting to install istiod.

## Installing the Ingress Gateway

```yaml
# clusters/production/istio-ingress/istio-gateway.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: istio-ingress
  namespace: istio-ingress
spec:
  interval: 30m
  dependsOn:
    - name: istiod
      namespace: istio-system
  chart:
    spec:
      chart: gateway
      version: "1.22.0"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: istio-system
  values:
    service:
      type: LoadBalancer
      annotations:
        service.beta.kubernetes.io/aws-load-balancer-type: nlb
    autoscaling:
      enabled: true
      minReplicas: 2
      maxReplicas: 10
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
```

## Managing Istio Configuration Resources

Use a Flux Kustomization to manage your Istio custom resources:

```yaml
# clusters/production/production/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./istio-config/overlays/production
  prune: true
  dependsOn:
    - name: istiod
      namespace: istio-system
  healthChecks:
    - apiVersion: networking.istio.io/v1
      kind: VirtualService
      name: api-gateway
      namespace: production
```

## The Istio Configuration Files

Define your Istio resources with Kustomize:

```yaml
# istio-config/base/gateway.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-ingress
spec:
  selector:
    istio: ingress
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      hosts:
        - "*.example.com"
      tls:
        mode: SIMPLE
        credentialName: wildcard-tls
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
      tls:
        httpsRedirect: true
```

```yaml
# istio-config/services/api-gateway/virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-gateway
  namespace: production
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-ingress/main-gateway
  http:
    - route:
        - destination:
            host: api-gateway.production.svc.cluster.local
            port:
              number: 8080
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: 5xx,reset,connect-failure
```

```yaml
# istio-config/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - ../../services/api-gateway
  - ../../services/user-service
```

## Monitoring Reconciliation

Check the status of Flux resources:

```bash
flux get helmreleases -n istio-system
flux get kustomizations
```

See detailed reconciliation events:

```bash
flux events --for HelmRelease/istiod -n istio-system
```

If something fails, check the conditions:

```bash
kubectl describe helmrelease istiod -n istio-system
```

## Suspending and Resuming Reconciliation

If you need to make temporary manual changes (for incident response, for example), suspend Flux reconciliation:

```bash
flux suspend kustomization istio-config
```

Resume when you are done:

```bash
flux resume kustomization istio-config
```

## Handling Notifications

Configure Flux to send alerts when Istio resources change:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: istio-alerts
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
    - kind: HelmRelease
      name: "*"
      namespace: istio-system
    - kind: Kustomization
      name: istio-config
```

## Upgrading Istio Through Flux

To upgrade Istio, update the chart version in your HelmRelease files and push to Git:

```yaml
spec:
  chart:
    spec:
      version: "1.23.0"  # Changed from 1.22.0
```

Flux detects the change during its next reconciliation interval and performs the upgrade. The `dependsOn` chain ensures components upgrade in the correct order.

## Reconciliation Intervals

Choose your intervals carefully:

- HelmRelease interval: 30m (how often to check if the Helm release matches desired state)
- Kustomization interval: 10m (how often to check if raw Kubernetes resources match)
- HelmRepository interval: 1h (how often to check for new chart versions)

Shorter intervals mean faster convergence but more API calls. For Istio, 10-30 minute intervals are usually fine since mesh configuration does not change constantly.

Flux CD provides a clean, Kubernetes-native way to manage Istio through GitOps. The dependency management between HelmRelease resources handles installation ordering, and Kustomizations manage the day-to-day Istio configuration. With automated reconciliation and pruning, your cluster always matches what is in Git, and any manual drift gets corrected automatically.
