# How to Migrate from Istio Operator to Helm-Based Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Helm, Service Mesh, Migration, Operator

Description: Step-by-step guide to migrating an existing Istio installation from the IstioOperator-based approach to a Helm chart-based installation.

---

The Istio Operator was deprecated starting with Istio 1.23. If you have been using the IstioOperator resource and the `istioctl operator init` workflow, it is time to migrate to Helm. Helm is now the officially recommended installation method, and it gives you more control, better integration with existing Kubernetes tooling, and a clearer upgrade path.

Migrating a running Istio installation from operator-based to Helm-based without downtime takes some planning, but the process is well-defined. Here is how to do it.

## Why Migrate Away from the Operator

The Istio Operator was convenient - you defined an IstioOperator resource and the operator controller reconciled the state. But it had several drawbacks:

- The operator itself needed to be kept up to date
- Debugging operator reconciliation issues was difficult
- It added another moving part to the control plane
- The community decided to focus on Helm as the primary installation method

Helm charts are simpler to reason about, integrate with standard Kubernetes deployment workflows, and give you explicit control over when and how components are updated.

## Step 1: Document Your Current Configuration

Before migrating, capture exactly how Istio is currently configured:

```bash
# Export the IstioOperator resource
kubectl get istiooperator -n istio-system -o yaml > istio-operator-config.yaml

# List installed components
kubectl get pods -n istio-system

# Record the current version
istioctl version

# Export mesh configuration
kubectl get configmap istio -n istio-system -o yaml > istio-mesh-config.yaml
```

Also export all Istio custom resources as a safety net:

```bash
kubectl get vs,dr,gw,se,pa,ra,ef,sidecar --all-namespaces -o yaml > istio-resources-backup.yaml
```

## Step 2: Map IstioOperator Values to Helm Values

The IstioOperator configuration format is different from Helm values. You need to translate your settings. Here is a mapping of common fields:

**IstioOperator format:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      tracing:
        zipkin:
          address: zipkin.observability:9411
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
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

**Equivalent Helm values for istiod chart:**

```yaml
# istiod-values.yaml
meshConfig:
  accessLogFile: /dev/stdout
  defaultConfig:
    holdApplicationUntilProxyStarts: true
    tracing:
      zipkin:
        address: zipkin.observability:9411
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
  autoscaleMin: 2
  autoscaleMax: 5
```

**Equivalent Helm values for gateway chart:**

```yaml
# gateway-values.yaml
service:
  type: LoadBalancer
```

Key differences to watch for:

- `components.pilot.k8s.resources` maps to `pilot.resources`
- `components.pilot.k8s.hpaSpec` maps to `pilot.autoscaleMin` / `pilot.autoscaleMax`
- Gateway configuration is a separate chart entirely
- Global settings under `meshConfig` map directly

## Step 3: Add the Istio Helm Repository

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

Verify the charts are available:

```bash
helm search repo istio --version <your-current-istio-version>
```

## Step 4: Install Helm Charts Alongside the Operator

The migration strategy is to install Helm-managed components as a new revision alongside the operator-managed installation, then migrate workloads over.

Install the base chart (CRDs):

```bash
helm install istio-base istio/base -n istio-system \
  --version <your-current-istio-version>
```

Since the CRDs already exist from the operator installation, Helm will adopt them. If Helm complains about existing resources, use:

```bash
helm install istio-base istio/base -n istio-system \
  --version <your-current-istio-version> \
  --set defaultRevision=default
```

Install istiod as a new revision:

```bash
helm install istiod-helm istio/istiod -n istio-system \
  --version <your-current-istio-version> \
  --set revision=helm \
  -f istiod-values.yaml
```

This creates a new `istiod-helm` deployment alongside the operator-managed `istiod`.

Install the gateway:

```bash
helm install istio-ingressgateway-helm istio/gateway -n istio-system \
  --version <your-current-istio-version> \
  -f gateway-values.yaml
```

Verify both control planes are running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

## Step 5: Migrate Workloads to the Helm-Managed Revision

Move namespaces from the default (operator-managed) revision to the Helm-managed revision:

```bash
# Remove old injection label
kubectl label namespace my-app istio-injection-

# Add new revision label
kubectl label namespace my-app istio.io/rev=helm

# Restart pods
kubectl rollout restart deployment -n my-app
```

Verify proxies connect to the new control plane:

```bash
istioctl proxy-status | grep my-app
```

The ISTIOD column should show `istiod-helm`.

Migrate namespaces one by one, validating each one before moving to the next.

## Step 6: Remove the Operator

Once all workloads are migrated to the Helm-managed control plane:

Remove the operator controller:

```bash
istioctl operator remove
```

Remove the IstioOperator resource:

```bash
kubectl delete istiooperator installed-state -n istio-system
```

Remove the old operator-managed istiod:

```bash
kubectl delete deployment istiod -n istio-system
kubectl delete service istiod -n istio-system
```

Clean up the old gateway if it was operator-managed:

```bash
kubectl delete deployment istio-ingressgateway -n istio-system
kubectl delete service istio-ingressgateway -n istio-system
```

Be careful here - make sure you are only deleting the old components, not the new Helm-managed ones.

Verify only Helm-managed components remain:

```bash
kubectl get pods -n istio-system
helm list -n istio-system
```

## Step 7: Adopt Existing Resources with Helm

If you want Helm to manage resources that the operator originally created (like Services, ConfigMaps), you need to label them for Helm ownership:

```bash
kubectl label configmap istio -n istio-system app.kubernetes.io/managed-by=Helm
kubectl annotate configmap istio -n istio-system meta.helm.sh/release-name=istiod-helm meta.helm.sh/release-namespace=istio-system
```

This tells Helm that it now owns these resources and should manage them during future upgrades.

## Step 8: Validate the Migration

Run a thorough validation:

```bash
# Check all components
istioctl version
istioctl proxy-status
istioctl analyze --all-namespaces

# Verify Helm releases
helm list -n istio-system

# Check application traffic
kubectl logs -n my-app -l app=my-service -c istio-proxy --tail=20
```

Test traffic routing, mTLS, gateway ingress, and any other Istio features you use.

## Moving Forward with Helm

After migration, your future upgrades follow the standard Helm upgrade process:

```bash
helm upgrade istio-base istio/base -n istio-system --version <new-version>
helm upgrade istiod-helm istio/istiod -n istio-system --version <new-version> -f istiod-values.yaml --wait
helm upgrade istio-ingressgateway-helm istio/gateway -n istio-system --version <new-version> -f gateway-values.yaml --wait
```

Store your values files in version control. Use Helm diff to preview changes:

```bash
helm diff upgrade istiod-helm istio/istiod -n istio-system --version <new-version> -f istiod-values.yaml
```

## Common Migration Pitfalls

**Forgetting to translate all operator settings.** Go through your IstioOperator YAML line by line and make sure every setting is accounted for in the Helm values.

**Deleting the wrong components.** When removing operator-managed resources, double-check you are not removing Helm-managed ones. Labels and annotations help distinguish them.

**Not testing the migration in staging.** As with any Istio change, do this in a non-production environment first.

**Skipping the revision-based approach.** Trying to do an in-place swap from operator to Helm is risky. Using revisions lets you migrate gradually.

## Summary

Migrating from the Istio Operator to Helm involves translating your IstioOperator configuration to Helm values, installing Helm-managed components as a new revision, migrating workloads over, and then removing the operator. The revision-based approach ensures zero downtime during the migration. Once on Helm, your Istio management integrates with standard Kubernetes tooling and follows a simpler upgrade path going forward.
