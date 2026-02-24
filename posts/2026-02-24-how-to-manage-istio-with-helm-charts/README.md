# How to Manage Istio with Helm Charts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Kubernetes, Installation, Service Mesh

Description: A complete guide to installing, configuring, and managing Istio using Helm charts, covering the base, istiod, and gateway charts with practical examples.

---

Helm has become the standard way to manage Istio installations for teams that want fine-grained control over their deployment. While `istioctl install` is great for getting started quickly, Helm gives you the full power of Helm's templating, release management, and integration with CI/CD pipelines.

Istio's Helm charts are split into three separate charts, each handling a different part of the installation. Understanding this separation is key to managing Istio effectively with Helm.

## The Three Istio Helm Charts

**istio/base**: Installs Istio CRDs and cluster-wide resources. This needs to be installed first and is a prerequisite for everything else.

**istio/istiod**: Installs the Istiod control plane. This is the main chart that deploys the discovery service, certificate authority, and configuration distribution.

**istio/gateway**: Installs ingress and egress gateways. These are optional and can be installed in any namespace.

## Adding the Istio Helm Repository

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

Check available versions:

```bash
helm search repo istio --versions | head -20
```

## Installing Istio with Helm

The installation must be done in order because of dependencies between the charts.

**Step 1: Install the base chart (CRDs)**

```bash
kubectl create namespace istio-system

helm install istio-base istio/base \
  -n istio-system \
  --version 1.24.0
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep istio.io | wc -l
```

**Step 2: Install Istiod**

```bash
helm install istiod istio/istiod \
  -n istio-system \
  --version 1.24.0 \
  --wait
```

The `--wait` flag tells Helm to wait until all pods are ready before returning. Check that Istiod is running:

```bash
kubectl get pods -n istio-system
```

**Step 3: Install the Ingress Gateway (optional)**

```bash
kubectl create namespace istio-ingress

helm install istio-ingress istio/gateway \
  -n istio-ingress \
  --version 1.24.0
```

## Viewing Default Values

Before customizing, check the default values for each chart:

```bash
# View istiod defaults
helm show values istio/istiod > istiod-default-values.yaml

# View gateway defaults
helm show values istio/gateway > gateway-default-values.yaml

# View base defaults
helm show values istio/base > base-default-values.yaml
```

## Basic Configuration

Create a values file for Istiod:

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 1Gi
  replicaCount: 2
  autoscaleEnabled: true
  autoscaleMin: 2
  autoscaleMax: 5

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableTracing: true
  defaultConfig:
    holdApplicationUntilProxyStarts: true

global:
  proxy:
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

Install with the custom values:

```bash
helm install istiod istio/istiod \
  -n istio-system \
  -f istiod-values.yaml \
  --version 1.24.0
```

## Managing Releases

Helm gives you release management out of the box:

```bash
# List Istio releases
helm list -n istio-system
helm list -n istio-ingress

# Check release status
helm status istiod -n istio-system

# Get release history
helm history istiod -n istio-system

# Get the values used for a release
helm get values istiod -n istio-system
```

## Updating Configuration

When you need to change configuration, update your values file and run helm upgrade:

```bash
# Update a single value
helm upgrade istiod istio/istiod \
  -n istio-system \
  --set pilot.replicaCount=3 \
  --reuse-values

# Or use the full values file
helm upgrade istiod istio/istiod \
  -n istio-system \
  -f istiod-values.yaml \
  --version 1.24.0
```

The `--reuse-values` flag keeps all previously set values and only changes what you specify. Without it, Helm resets everything to defaults plus what you provide.

## Multiple Gateways

You can install multiple gateway instances by using different release names:

```bash
# Public-facing gateway
helm install istio-ingress-public istio/gateway \
  -n istio-ingress \
  -f public-gateway-values.yaml

# Internal gateway
helm install istio-ingress-internal istio/gateway \
  -n istio-ingress \
  -f internal-gateway-values.yaml
```

Gateway values for a public gateway:

```yaml
# public-gateway-values.yaml
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
  ports:
    - name: http2
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

## Using Helm with GitOps

Store your Helm values in Git and use a GitOps tool to manage the releases:

```yaml
# Argo CD Application for Istiod
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istiod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://istio-release.storage.googleapis.com/charts
    chart: istiod
    targetRevision: 1.24.0
    helm:
      valueFiles:
        - $values/helm/istiod-values.yaml
  sources:
    - repoURL: https://github.com/myorg/istio-config.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: istio-system
```

## Checking What Helm Will Do

Before upgrading, preview the changes:

```bash
# Dry run
helm upgrade istiod istio/istiod \
  -n istio-system \
  -f istiod-values.yaml \
  --dry-run

# Diff (requires helm-diff plugin)
helm diff upgrade istiod istio/istiod \
  -n istio-system \
  -f istiod-values.yaml
```

The `helm-diff` plugin is extremely useful. Install it with:

```bash
helm plugin install https://github.com/databus23/helm-diff
```

## Uninstalling Istio with Helm

When you need to remove Istio, uninstall in reverse order:

```bash
# Remove gateways first
helm uninstall istio-ingress -n istio-ingress

# Remove Istiod
helm uninstall istiod -n istio-system

# Remove base (CRDs)
helm uninstall istio-base -n istio-system
```

Note that uninstalling the base chart does NOT remove the CRDs. This is by design to prevent accidental data loss. To fully remove CRDs:

```bash
kubectl get crd | grep istio.io | awk '{print $1}' | xargs kubectl delete crd
```

## Helm vs istioctl

A quick comparison to help you decide:

Helm is better when you want: CI/CD integration, release history, value overrides, multiple environments, GitOps workflows, or multiple gateway instances.

istioctl is better when you want: quick setup, built-in profiles, the analyze command, proxy debugging tools, or simpler operations.

Many teams use both. Helm for installation and lifecycle management, istioctl for day-to-day operations and debugging.

Managing Istio with Helm gives you a mature, well-understood deployment pattern that integrates with existing Kubernetes workflows. The three-chart architecture provides clean separation of concerns, and Helm's release management makes upgrades and rollbacks predictable.
