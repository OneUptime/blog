# How to Handle Istio CRD Versioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CRD, Kubernetes, API Versioning, Service Mesh

Description: How to manage Istio Custom Resource Definition versioning, understand API version changes, and keep your configuration compatible across Istio upgrades.

---

Istio's Custom Resource Definitions go through version changes just like any other Kubernetes API. Over time, fields get added, deprecated, or restructured. If you're running Istio in production, you need to understand how CRD versioning works so your configurations don't break during upgrades.

## Istio API Version History

Istio's networking APIs have gone through several versions:

- `v1alpha3`: The original version for many networking resources. Used for years and still works in many installations.
- `v1beta1`: Added as a more stable API version. Functionally identical to v1alpha3 for most resources.
- `v1`: The stable, generally available version. This is what you should use for new configurations.

You can check which versions a CRD supports:

```bash
kubectl get crd virtualservices.networking.istio.io -o jsonpath='{.spec.versions[*].name}'
```

This might output:

```
v1alpha3 v1beta1 v1
```

The CRD serves all three versions, meaning you can use any of them. Kubernetes handles the conversion between versions.

## Checking the Stored Version

While a CRD may serve multiple versions, only one version is the "stored" version in etcd. This is the version that objects are persisted as:

```bash
kubectl get crd virtualservices.networking.istio.io -o jsonpath='{.spec.versions[?(@.storage==true)].name}'
```

Typically the output is `v1` for current Istio installations. Even if you create a resource using `v1alpha3`, it gets stored as `v1` internally.

## Using the Right API Version

For new configurations, always use the latest stable version:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-route
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
```

Compare this to the older format:

```yaml
# Still works but use v1 instead
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: my-route
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
```

The spec is identical in most cases. The API version in the `apiVersion` field is the main difference.

## Version Compatibility During Upgrades

When upgrading Istio, CRD versions can change. The general upgrade path involves:

1. The new Istio version installs updated CRDs with new versions.
2. Old API versions are kept as served versions for backward compatibility.
3. Eventually, old versions get deprecated and removed.

Before upgrading, check the release notes for any API version changes. The Istio team typically provides a migration window of several releases before removing old API versions.

Check which API versions your current resources use:

```bash
kubectl get vs -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.apiVersion}{"\n"}{end}'
```

This lists all VirtualServices and their API versions. If any still use `v1alpha3`, you should update them.

## Updating Resources to a New API Version

To update a resource to a new API version, you can simply change the `apiVersion` field and reapply:

```bash
# Export existing resource
kubectl get vs my-route -o yaml > my-route.yaml
```

Edit the file and change `apiVersion: networking.istio.io/v1alpha3` to `apiVersion: networking.istio.io/v1`, then apply:

```bash
kubectl apply -f my-route.yaml
```

For a large number of resources, you can script this:

```bash
for vs in $(kubectl get vs -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $vs | cut -d/ -f1)
  name=$(echo $vs | cut -d/ -f2)
  kubectl get vs $name -n $ns -o yaml | \
    sed 's|networking.istio.io/v1alpha3|networking.istio.io/v1|' | \
    kubectl apply -f -
done
```

## Handling Schema Changes Between Versions

Sometimes, an API version change includes schema changes. A field might move, get renamed, or change its structure. For Istio, the networking API has been relatively stable between v1alpha3, v1beta1, and v1, but security and telemetry APIs have had more changes.

For example, the Telemetry API moved from `v1alpha1` to `v1`:

```yaml
# Old version
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: default
spec:
  tracing:
  - randomSamplingPercentage: 50.0
```

```yaml
# Current version
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: default
spec:
  tracing:
  - randomSamplingPercentage: 50.0
```

Use `istioctl analyze` to catch any incompatibilities:

```bash
istioctl analyze -A
```

This will warn you about deprecated API versions and fields.

## CRD Upgrade Strategy

When upgrading Istio, the CRDs need to be updated before the control plane. The recommended order is:

1. Update CRDs first
2. Upgrade the control plane (istiod)
3. Upgrade data plane (restart workloads)

With `istioctl upgrade`, CRDs are updated automatically:

```bash
istioctl upgrade
```

With Helm, update CRDs separately:

```bash
kubectl apply -f manifests/charts/base/crds/
helm upgrade istiod istio/istiod -n istio-system
```

Or if using the Helm CRD chart:

```bash
helm upgrade istio-base istio/base -n istio-system
helm upgrade istiod istio/istiod -n istio-system
```

## Dealing with Version Conversion Webhooks

Kubernetes uses conversion webhooks to translate between API versions. Istio registers these webhooks when the CRDs are installed. If the webhook is down or misconfigured, you might see errors when working with Istio resources.

Check the webhook configuration:

```bash
kubectl get mutatingwebhookconfigurations | grep istio
kubectl get validatingwebhookconfigurations | grep istio
```

If you see errors about webhook failures, check that istiod is running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

## Deprecation Warnings

Kubernetes 1.19+ shows deprecation warnings when you use deprecated API versions. You'll see messages like:

```
Warning: networking.istio.io/v1alpha3 VirtualService is deprecated in v1.22+, unavailable in v1.25+; use networking.istio.io/v1 VirtualService
```

These warnings appear in kubectl output and in audit logs. They're a signal that you should update your manifests.

## Best Practices

Keep your Istio resource definitions in version control. When you update API versions, commit the changes so you can track what changed and when. Run `istioctl analyze` as part of your CI/CD pipeline to catch deprecated versions before they hit production.

Pin your manifests to the stable API version (v1 for networking, v1 for security) and update them proactively rather than waiting for breakage. And when upgrading Istio, always read the release notes for API changes. The Istio project is good about documenting what's changing and giving you time to migrate.
