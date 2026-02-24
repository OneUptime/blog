# How to Configure Discovery Selectors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Discovery Selectors, Performance, Kubernetes, MeshConfig

Description: Learn how to use Istio discovery selectors to reduce control plane resource usage by limiting which namespaces Istiod watches and processes.

---

In a large Kubernetes cluster, not every namespace belongs in the service mesh. You might have hundreds of namespaces for CI/CD pipelines, batch jobs, monitoring tools, and other infrastructure that does not need Istio. By default, Istiod watches all namespaces and processes all services it finds. Discovery selectors let you change that by telling Istiod to only pay attention to specific namespaces.

This is not about sidecar injection - that is controlled separately with labels. Discovery selectors control what Istiod knows about. If a namespace is not matched by a discovery selector, Istiod will not process its services, endpoints, or configuration resources. It is as if those namespaces do not exist from the mesh's perspective.

## Why Discovery Selectors Matter

The impact on large clusters is significant. Without discovery selectors, Istiod processes every Service, Endpoint, and Pod in every namespace. In a cluster with 500 namespaces and 5000 services, Istiod is doing a lot of unnecessary work if only 50 of those namespaces are part of the mesh.

The consequences of watching too many namespaces:

- Higher CPU usage on Istiod
- More memory consumption
- Slower configuration push to sidecars (because there is more data to process and distribute)
- Longer reconciliation times after config changes

## Configuring Discovery Selectors

Discovery selectors are set in MeshConfig and use Kubernetes label selectors:

### Using Label Matching

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchLabels:
          istio-discovery: enabled
```

Then label the namespaces you want Istiod to watch:

```bash
kubectl label namespace frontend istio-discovery=enabled
kubectl label namespace backend istio-discovery=enabled
kubectl label namespace shared-services istio-discovery=enabled
```

Only these namespaces will be visible to Istiod.

### Using Expression Matching

For more flexible selection, use `matchExpressions`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchExpressions:
          - key: environment
            operator: In
            values:
              - production
              - staging
```

This selects all namespaces with the `environment` label set to either `production` or `staging`.

### Combining Multiple Selectors

You can specify multiple selectors. They are OR-ed together, meaning a namespace matching any selector is included:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchLabels:
          istio-discovery: enabled
      - matchLabels:
          app.kubernetes.io/part-of: my-platform
```

A namespace matching either label is included in discovery.

## Applying Discovery Selectors

### During Installation

```bash
istioctl install -f istio-with-selectors.yaml
```

### On an Existing Mesh

Edit the ConfigMap:

```bash
kubectl edit configmap istio -n istio-system
```

Add the discovery selectors under the mesh configuration:

```yaml
discoverySelectors:
  - matchLabels:
      istio-discovery: enabled
```

Istiod picks up the change within seconds. Namespaces that no longer match are dropped from the service registry.

## Important: istio-system Is Always Included

Regardless of your discovery selectors, the `istio-system` namespace is always included. You do not need to label it. This ensures that mesh-wide resources like Gateways in `istio-system` continue to work.

## What Happens to Excluded Namespaces

When a namespace is excluded by discovery selectors:

1. Services in that namespace disappear from the Istio service registry
2. Sidecars in other namespaces will not have routes to those services
3. Istio configuration resources (VirtualService, DestinationRule, etc.) in that namespace are ignored
4. If there are sidecars running in the excluded namespace, they will lose their configuration (which can cause service disruption)

This last point is important. Do not exclude a namespace that has active sidecars unless you intend to remove those workloads from the mesh.

## Discovery Selectors vs. Sidecar Resources

These two features are complementary but different:

**Discovery selectors** control what Istiod watches. They reduce control plane resource usage.

**Sidecar resources** control what individual proxies see. They reduce data plane resource usage.

For the best results, use both:

```yaml
# MeshConfig: Istiod only watches mesh namespaces
meshConfig:
  discoverySelectors:
    - matchLabels:
        istio-discovery: enabled
```

```yaml
# Sidecar: Each namespace only sees what it needs
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "backend/*"
```

## Verifying Discovery Selectors

Check which namespaces Istiod is currently watching:

```bash
# Look at Istiod logs after applying selectors
kubectl logs -l app=istiod -n istio-system | grep "namespace"
```

Verify that a specific service is (or is not) in the registry:

```bash
# This should show the service if its namespace is in discovery
istioctl proxy-config clusters deploy/sleep -n sample | grep my-service

# Or use the debug endpoint
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/debug/registryz | grep my-service
```

## Migration Strategy

If you are adding discovery selectors to an existing mesh, follow this process:

1. Identify all namespaces currently in the mesh:

```bash
kubectl get namespaces -l istio-injection=enabled
```

2. Label all mesh namespaces with the discovery label:

```bash
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl label namespace "${ns}" istio-discovery=enabled
done
```

3. Also label any namespaces that have Istio resources (VirtualService, DestinationRule, etc.) even if they do not have sidecars:

```bash
kubectl label namespace istio-ingress istio-discovery=enabled
```

4. Apply the discovery selector configuration
5. Verify that all services are still discoverable

## Performance Impact

The performance improvement from discovery selectors depends on how many namespaces you exclude. Here are some rough numbers from real deployments:

- Cluster with 200 namespaces, 50 in mesh: ~60% reduction in Istiod memory usage
- Cluster with 500 namespaces, 100 in mesh: ~75% reduction in Istiod memory usage
- Configuration push times improve proportionally

These numbers vary based on the number of services and endpoints in each namespace, but the trend is clear: the more you exclude, the better Istiod performs.

Discovery selectors are one of those features that every large Istio deployment should use. The setup is simple - add a label to your mesh namespaces and configure the selector - and the performance benefits are immediate.
