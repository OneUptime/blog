# How to Use VirtualService with Kubernetes Service Short Names

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, Kubernetes, Service Discovery, DNS

Description: Understand how Kubernetes service short names, FQDNs, and DNS resolution work with Istio VirtualService host references.

---

When you reference a service in an Istio VirtualService, you have several naming options - from short names like `my-service` to fully qualified domain names like `my-service.default.svc.cluster.local`. Choosing the right format matters because it affects how Istio resolves the host and which traffic the VirtualService intercepts.

## Kubernetes Service Name Formats

Kubernetes services can be referenced in several ways:

1. **Short name**: `my-service`
2. **Namespace-qualified**: `my-service.production`
3. **Partial FQDN**: `my-service.production.svc`
4. **Full FQDN**: `my-service.production.svc.cluster.local`

Within Kubernetes pods, DNS resolution expands short names based on the pod's namespace search path. A pod in the `default` namespace resolves `my-service` to `my-service.default.svc.cluster.local`.

## Short Names in VirtualService Hosts

When you use a short name in the VirtualService `hosts` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 80
```

Istio interprets the short name relative to the VirtualService's namespace. Since this VirtualService is in the `default` namespace, `my-service` resolves to `my-service.default.svc.cluster.local`.

This means the VirtualService only affects traffic to `my-service` within the `default` namespace. If there is another `my-service` in the `production` namespace, this VirtualService does not touch it.

## Cross-Namespace References

To route to a service in a different namespace, use the FQDN or namespace-qualified name:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cross-namespace
  namespace: default
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
            port:
              number: 80
```

Or the shorter namespace-qualified form:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cross-namespace
  namespace: default
spec:
  hosts:
    - my-service.production
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
            port:
              number: 80
```

For destination hosts, it is generally safest to use the full FQDN to avoid ambiguity.

## Host Resolution in Destination

The `destination.host` field follows the same resolution rules. Short names are resolved relative to the VirtualService namespace:

```yaml
# These are equivalent when the VirtualService is in the default namespace:
route:
  - destination:
      host: my-service

route:
  - destination:
      host: my-service.default.svc.cluster.local
```

But when routing to a different namespace, you must use at least the namespace-qualified name:

```yaml
route:
  - destination:
      host: my-service.production.svc.cluster.local
      port:
        number: 80
```

## VirtualService in a Different Namespace Than the Service

You can create a VirtualService in one namespace that targets a service in another:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: cross-ns-routing
  namespace: istio-config
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
            port:
              number: 80
```

This works, but be aware that exportTo settings on the target namespace might restrict visibility. By default, VirtualServices are visible across all namespaces unless `exportTo` limits them.

## The exportTo Field

You can control which namespaces can see a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  exportTo:
    - "."           # Only this namespace
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 80
```

Options for `exportTo`:
- `"."` - Only the VirtualService's own namespace
- `"*"` - All namespaces (default)
- `"namespace-name"` - A specific namespace

## Multiple Services with the Same Short Name

If you have services with the same name in different namespaces, short names can cause confusion:

```yaml
# This VirtualService is in the default namespace
# It only affects my-service.default, not my-service.production
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            port:
              number: 80
      timeout: 5s
```

If you want to apply rules to both, create separate VirtualServices or use FQDNs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-default
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
            port:
              number: 80
      timeout: 5s
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-production
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.production.svc.cluster.local
            port:
              number: 80
      timeout: 10s
```

## Short Names with Gateways

When binding to a Gateway, the host field usually contains an external hostname, not a Kubernetes service name:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - "app.example.com"     # External hostname for gateway traffic
    - my-app                # Short name for mesh traffic
  gateways:
    - my-gateway
    - mesh
  http:
    - route:
        - destination:
            host: my-app      # Short name resolves to my-app.default.svc.cluster.local
            port:
              number: 80
```

The `hosts` field can mix external hostnames and internal service names. The external hostname applies to gateway traffic, and the short name applies to mesh traffic.

## Debugging Name Resolution

When things are not routing as expected, check how Istio resolved the names:

```bash
# Check which services Istio knows about
istioctl proxy-config clusters deploy/my-client -o json | grep "my-service"

# Check endpoints for a specific service
istioctl proxy-config endpoints deploy/my-client --cluster "outbound|80||my-service.default.svc.cluster.local"

# Validate configuration
istioctl analyze -n default

# Check for conflicts
istioctl analyze --all-namespaces
```

You might see errors like:
- "host not found" - The service does not exist or the FQDN is wrong
- "no healthy upstream" - The service exists but has no running pods
- "conflicting VirtualService" - Multiple VirtualServices for the same host

## Best Practices

1. **Use short names for same-namespace services** - It is concise and unambiguous within a namespace.
2. **Use FQDNs for cross-namespace references** - Always use the full `service.namespace.svc.cluster.local` to avoid confusion.
3. **Use FQDNs in DestinationRules** - Especially when the DestinationRule is in a different namespace than the service.
4. **Be explicit about namespace** - When in doubt, use the FQDN. It is longer but always unambiguous.
5. **Check with istioctl analyze** - It catches name resolution issues before they become runtime problems.

Understanding how short names resolve in Istio prevents a whole class of routing bugs. When things work in one namespace but not another, or when VirtualServices seem to be ignored, name resolution is often the culprit.
