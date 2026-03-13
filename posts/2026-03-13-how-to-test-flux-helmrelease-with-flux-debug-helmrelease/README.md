# How to Test Flux HelmRelease with flux debug helmrelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Helm, HelmRelease, Testing, Debugging

Description: Learn how to use flux debug helmrelease to inspect, test, and troubleshoot HelmRelease resources in your Flux GitOps workflow.

---

Helm releases managed by Flux can sometimes fail to reconcile due to misconfigured values, chart version mismatches, or dependency issues. The `flux debug helmrelease` command gives you visibility into what Flux is doing with your HelmRelease resources, helping you identify and fix problems before they impact your cluster.

This guide covers how to use `flux debug helmrelease` effectively for testing and troubleshooting.

## Understanding HelmRelease in Flux

A typical HelmRelease resource looks like this:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: podinfo
      version: "6.5.x"
      sourceRef:
        kind: HelmRepository
        name: podinfo
        namespace: flux-system
  values:
    replicaCount: 2
    ingress:
      enabled: true
      hosts:
        - host: podinfo.example.com
```

Flux reconciles this by pulling the chart from the specified HelmRepository and applying it with the provided values.

## Basic Debugging

To inspect the current state of a HelmRelease, use:

```bash
flux debug helmrelease podinfo -n default
```

This command shows the status conditions, the last applied revision, and any error messages associated with the release.

## Checking HelmRelease Status

Get a detailed view of the HelmRelease status:

```bash
flux get helmrelease podinfo -n default
```

This shows the ready status, revision, and any status messages. For more detail:

```bash
flux get helmrelease podinfo -n default -o yaml
```

The YAML output includes the full status block with conditions, observed generation, and last attempted values.

## Inspecting Rendered Values

One of the most common issues with HelmRelease resources is incorrect values merging. To see the final merged values that Flux will pass to Helm:

```bash
flux debug helmrelease podinfo -n default --show-values
```

This reveals the complete values after merging inline values, valuesFrom references, and any default values from the chart.

## Testing Values from ConfigMaps and Secrets

When your HelmRelease uses `valuesFrom` to pull values from ConfigMaps or Secrets, debugging becomes more complex:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  valuesFrom:
    - kind: ConfigMap
      name: my-app-values
      valuesKey: values.yaml
    - kind: Secret
      name: my-app-secrets
      valuesKey: values.yaml
  values:
    replicaCount: 3
```

Check that the referenced ConfigMap and Secret exist and contain valid YAML:

```bash
kubectl get configmap my-app-values -n default -o jsonpath='{.data.values\.yaml}'
kubectl get secret my-app-secrets -n default -o jsonpath='{.data.values\.yaml}' | base64 -d
```

Then use `flux debug` to verify the merged result:

```bash
flux debug helmrelease my-app -n default --show-values
```

## Dry Run Helm Template

To see exactly what Kubernetes resources the HelmRelease would create, use Helm directly with the merged values:

```bash
flux debug helmrelease podinfo -n default --show-values > /tmp/values.yaml

helm template podinfo podinfo/podinfo \
  --version 6.5.0 \
  --values /tmp/values.yaml \
  --namespace default
```

This lets you inspect every resource that will be created or updated.

## Troubleshooting Common Issues

### Chart Not Found

If the HelmRelease reports a chart not found error:

```bash
flux get source helm podinfo -n flux-system
```

Verify the HelmRepository is reconciled and the chart name and version are correct.

### Version Constraint Failures

When using semver constraints like `6.5.x`, verify available versions:

```bash
flux debug helmrelease podinfo -n default
```

Look for messages about version resolution failures. You can also check the HelmRepository index:

```bash
flux get source helm podinfo -n flux-system -o yaml
```

### Values Merge Conflicts

If values are not being applied as expected, the merge order matters. Values are merged in this order: chart defaults, then `valuesFrom` entries in order, then inline `values`. Later entries override earlier ones.

```bash
flux debug helmrelease my-app -n default --show-values 2>&1 | head -50
```

### Dependency Failures

If a HelmRelease depends on another resource:

```yaml
spec:
  dependsOn:
    - name: cert-manager
      namespace: cert-manager
```

Check the dependency status:

```bash
flux get helmrelease cert-manager -n cert-manager
```

## Watching Reconciliation

Monitor a HelmRelease reconciliation in real time:

```bash
flux get helmrelease podinfo -n default --watch
```

This streams status updates as Flux processes the release, which is useful for observing the reconciliation cycle.

## Forcing Reconciliation

If you want to trigger an immediate reconciliation to test changes:

```bash
flux reconcile helmrelease podinfo -n default
```

Combine with debug to see the result:

```bash
flux reconcile helmrelease podinfo -n default && \
  flux debug helmrelease podinfo -n default
```

## Exporting HelmRelease for Local Testing

Export the current HelmRelease definition from the cluster for local editing and testing:

```bash
flux export helmrelease podinfo -n default > helmrelease-podinfo.yaml
```

Edit the exported file, then validate it locally before applying changes to your repository.

## Conclusion

The `flux debug helmrelease` command is your primary tool for understanding what Flux is doing with your Helm releases. By inspecting rendered values, checking dependency status, and combining debug output with Helm template rendering, you can identify and fix issues quickly. Making these debugging techniques part of your regular workflow reduces the time spent troubleshooting failed reconciliations and keeps your deployments running smoothly.
