# How to Choose the Right Istio Installation Method

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Installation, Kubernetes, Helm, Service Mesh

Description: A comparison of Istio installation methods including istioctl, Helm, and the Istio Operator to help you pick the right one for your environment.

---

Istio gives you two main supported ways to install it: `istioctl` and Helm charts. Older Istio releases also had an in-cluster Istio Operator, but it was deprecated in Istio 1.23 and removed in Istio 1.24. Each approach has trade-offs, and picking the wrong one can make upgrades, customization, and day-2 operations more painful than they need to be.

Here is a straightforward comparison to help you decide.

## Option 1: istioctl install

This is the recommended installation method for most teams, and it is the one the Istio project itself promotes as the primary path.

```bash
# Basic installation with default profile

istioctl install --set profile=default -y

# Installation with custom configuration
istioctl install -f my-istio-config.yaml -y
```

You define your configuration in an IstioOperator resource (confusingly named, but this does not require the Operator component):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: my-istio
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: LoadBalancer
```

### When to Use istioctl

- You want the most well-tested and documented path
- You are comfortable with CLI-driven operations
- You want revision-based canary upgrades (this is where istioctl really shines)
- Your team manages Istio directly rather than through GitOps

### Revision-Based Upgrades with istioctl

This is the killer feature of istioctl. You can run two control plane versions side by side:

```bash
# Install a new revision
istioctl install --revision=1-30-0 -y
istioctl tag set stable --revision 1-30-0

# Migrate namespaces to the new revision
kubectl label namespace production istio.io/rev=stable --overwrite

# Restart pods to pick up new sidecar version
kubectl rollout restart deployment -n production

# Verify all pods are using the new version
istioctl proxy-status | grep "1-30-0"

# Once all namespaces are migrated, remove the old revision
istioctl uninstall --revision 1-29-1 -y
```

### Drawbacks

- Not GitOps-friendly out of the box (you need to wrap it in a CI/CD pipeline)
- Requires the `istioctl` binary to be available wherever you run installations
- The IstioOperator resource format can be confusing since it is used without the actual Operator

## Option 2: Helm Charts

Helm is the standard package manager for Kubernetes, and Istio has official Helm charts. This is a good choice if your organization already uses Helm for everything else.

```bash
# Add the Istio Helm repository
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update

# Install the Istio base chart (CRDs)
helm install istio-base istio/base -n istio-system --set defaultRevision=default --create-namespace

# Install istiod (control plane)
helm install istiod istio/istiod -n istio-system --wait

# Install the ingress gateway
kubectl create namespace istio-ingress
helm install istio-ingress istio/gateway -n istio-ingress --wait
```

Custom configuration goes in a values file:

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
  autoscaleMin: 2
  autoscaleMax: 5

meshConfig:
  accessLogFile: /dev/stdout
  defaultConfig:
    holdApplicationUntilProxyStarts: true

global:
  proxy:
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

```bash
helm install istiod istio/istiod -n istio-system -f istiod-values.yaml --wait
```

### When to Use Helm

- Your organization standardizes on Helm for all Kubernetes deployments
- You use GitOps tools like ArgoCD or Flux that work well with Helm
- You want to manage Istio the same way you manage other infrastructure
- You need fine-grained control over individual components

### Helm Upgrades

```bash
# Update Helm repo
helm repo update

# Upgrade the base chart first
helm upgrade istio-base istio/base -n istio-system --set defaultRevision=default

# Then upgrade istiod
helm upgrade istiod istio/istiod -n istio-system -f istiod-values.yaml --wait

# Finally upgrade the gateway
helm upgrade istio-ingress istio/gateway -n istio-ingress
```

### Drawbacks

- You must upgrade components in the correct order (base, then istiod, then gateways)
- Revision-based canary upgrades require installing istiod multiple times with different release names
- More Helm releases to manage compared to a single istioctl command

## Option 3: Istio Operator

The in-cluster Istio Operator watched an IstioOperator custom resource and reconciled the Istio installation. It was the most "Kubernetes-native" approach, but the Istio project deprecated it in Istio 1.23 and removed it in Istio 1.24.

```bash
# Check whether an existing cluster still uses the deprecated in-cluster operator
kubectl get deployment -n istio-system istio-operator
kubectl get IstioOperator -A
```

If both commands return existing resources, plan a migration to `istioctl` or Helm before upgrading to Istio 1.24 or later.

### When to Use the Operator

- You are pinned to Istio 1.23 or earlier and already run the in-cluster Operator
- You want automatic reconciliation while you plan a migration
- You are comfortable with the additional complexity of running a deprecated controller

### Drawbacks

- The Istio project deprecated the in-cluster Operator in Istio 1.23 and removed it in Istio 1.24
- The Operator itself is another component that needs to be managed and upgraded
- If the Operator has a bug, it could modify your Istio installation unexpectedly
- Less community support and documentation compared to istioctl and Helm

## Decision Matrix

| Factor | istioctl | Helm | Operator |
|--------|----------|------|----------|
| Ease of installation | High | Medium | Legacy only |
| GitOps compatibility | Low | High | Legacy only |
| Canary upgrades | Built-in | Manual | Legacy only |
| Community support | High | High | Low |
| Upgrade simplicity | High | Medium | Legacy only |
| Reconciliation | None | None | Automatic |
| Additional components | None | None | Operator pod |
| Documentation | Excellent | Good | Limited |

## My Recommendation

For most teams, start with `istioctl`. It is the most straightforward, best documented, and supports the safest upgrade path through revision-based canary deployments.

If you are a Helm shop with existing GitOps workflows, use Helm. The overhead of maintaining separate Helm releases for each Istio component is manageable, and the GitOps integration is worth it.

Avoid the in-cluster Operator for new installs. If you already use it, treat it as legacy and migrate before upgrading to Istio 1.24 or later.

Whichever method you choose, the actual Istio configuration (mesh config, sidecar settings, resource limits) works the same way. The installation method just determines how that configuration gets applied to the cluster.

```bash
# Verify your installation regardless of method
istioctl analyze
istioctl proxy-status
kubectl get pods -n istio-system
```

Pick the method that fits your team's workflow and operational model. Switching between installation methods later is possible but not trivial, so it is worth getting this right from the start.
