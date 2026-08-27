# How to Scrape an External VM or FQDN with Prometheus Operator: ServiceMonitor or ScrapeConfig?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ScrapeConfig, ServiceMonitor, Kubernetes, External Targets

Description: Choose a ScrapeConfig for native external-target discovery or a selectorless Service plus EndpointSlice when Kubernetes should own fixed external IPs.

---

A ServiceMonitor discovers Kubernetes Services. It does not accept an arbitrary URL field. For a VM, appliance, or FQDN outside the cluster, the clearest Prometheus Operator resource is usually `ScrapeConfig`.

A ServiceMonitor can still represent external IP endpoints by combining a selectorless Service with manually managed EndpointSlices. That pattern is useful when Kubernetes objects should remain the source of target inventory. It is not the best default for a hostname that changes addresses dynamically.

## Prefer ScrapeConfig for Direct External Targets

Prometheus Operator introduced the `ScrapeConfig` CRD in the v0.65.x line for external targets and lower-level scrape configurations that ServiceMonitor, PodMonitor, and Probe cannot express.

This static target uses the current alpha API:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: ScrapeConfig
metadata:
  name: external-node
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  staticConfigs:
    - targets:
        - metrics.example.net:9100
      labels:
        job: external-node
        environment: production
```

Prometheus must select it explicitly:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: platform
  namespace: monitoring
spec:
  scrapeConfigSelector:
    matchLabels:
      prometheus: platform
```

With a null `scrapeConfigNamespaceSelector`, Prometheus selects ScrapeConfigs in its own namespace. An empty `scrapeConfigNamespaceSelector: {}` selects all namespaces, while a label selector can opt in specific namespaces.

Static targets can contain IP addresses or hostnames in `host:port` form. Prometheus resolves hostnames when connecting. For larger or dynamic sets, the ScrapeConfig API supports tier-1 discovery mechanisms including DNS, file, HTTP, static, and Kubernetes discovery. Pick the discovery mechanism that owns target lifecycle instead of regenerating a static list unnecessarily.

ScrapeConfig is still documented as alpha. Confirm that the installed Prometheus Operator version includes the CRD and supports every field you plan to use:

```bash
kubectl get crd scrapeconfigs.monitoring.coreos.com
kubectl explain scrapeconfig.spec
```

An installed CRD alone is not sufficient if an older Operator cannot reconcile its fields.

## Use a Selectorless Service for Kubernetes-Owned External IPs

Kubernetes supports a Service without a selector plus manually managed EndpointSlices. This is appropriate when cluster operators want targets represented as Kubernetes API objects and the target addresses are stable, routable IPs.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-node
  namespace: monitoring
  labels:
    monitoring-target: external-node
spec:
  ports:
    - name: metrics
      port: 9100
      targetPort: 9100
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: external-node-1
  namespace: monitoring
  labels:
    kubernetes.io/service-name: external-node
    endpointslice.kubernetes.io/managed-by: staff
addressType: IPv4
ports:
  - name: metrics
    protocol: TCP
    port: 9100
endpoints:
  - addresses:
      - 192.0.2.20
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: external-node
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  serviceDiscoveryRole: EndpointSlice
  selector:
    matchLabels:
      monitoring-target: external-node
  endpoints:
    - port: metrics
```

The EndpointSlice's `kubernetes.io/service-name` label links it to the Service. Its port name should match the Service port name. The address must be reachable from the Prometheus Pods; Kubernetes does not create a tunnel to an external VM.

Kubernetes restricts endpoint addresses. Do not use loopback, link-local addresses, or another Service's ClusterIP as a manual endpoint. For custom management, set an `endpointslice.kubernetes.io/managed-by` value that identifies the controller or administrator.

This pattern also requires Prometheus discovery RBAC for Services and EndpointSlices in the namespace. EndpointSlice discovery requires Prometheus 2.21 or newer. The Prometheus Operator defaults ServiceMonitor discovery to the legacy `Endpoints` role when no role is configured, so opt into `EndpointSlice` as shown or verify the Prometheus-level `serviceDiscoveryRole`.

## Why ExternalName Alone Is Not Enough

An `ExternalName` Service returns a DNS CNAME. It has no selector and the control plane does not create ordinary Pod-backed EndpointSlices for it. A ServiceMonitor expecting endpoint discovery can therefore produce no target.

For an external FQDN, a ScrapeConfig static or DNS service-discovery configuration expresses the intent directly. Do not add an ExternalName Service merely to make an arbitrary URL look like a ServiceMonitor target.

## Authentication, TLS, and Network Reachability

Both designs can configure scrape authentication and TLS through their supported API fields. Store credentials in Kubernetes Secrets and follow same-namespace reference requirements. Do not place tokens in target labels or inline them in a hostname.

Before blaming discovery, test connectivity from the Prometheus network context:

```bash
kubectl run external-metrics-test -n monitoring \
  --rm -it --restart=Never \
  --image=curlimages/curl \
  -- curl --fail --show-error --max-time 5 \
     http://metrics.example.net:9100/metrics
```

This creates a temporary diagnostic Pod and may not have the same NetworkPolicy identity as Prometheus, so it is evidence, not a complete proof. Check egress policy, routing, DNS, external firewalls, and return paths for the actual Prometheus Pods.

## Do You Want a Scrape or a Probe?

ScrapeConfig and ServiceMonitor collect Prometheus exposition-format metrics from the target. If the goal is to test an arbitrary HTTP, TCP, DNS, or ICMP endpoint through a blackbox exporter, use the Prometheus Operator `Probe` CRD. A Probe controls a prober and a set of URLs; it is not a substitute for an exporter that exposes metrics.

## Decision Guide

Choose `ScrapeConfig` when:

- the target is naturally a hostname or external discovery record;
- no Kubernetes Service should own its lifecycle;
- you need static, DNS, file, HTTP, or another supported discovery mechanism;
- the alpha API is acceptable in your platform.

Choose a selectorless Service plus EndpointSlice and ServiceMonitor when:

- Kubernetes objects intentionally own a small set of fixed external IPs;
- Service labels and namespace policy are useful platform controls;
- another controller or administrator will keep EndpointSlices current.

Do not use either pattern to probe arbitrary web URLs. Use `Probe` for blackbox monitoring.

## Official Documentation

- [Prometheus Operator ScrapeConfig guide](https://prometheus-operator.dev/docs/developer/scrapeconfig/)
- [Prometheus Operator ScrapeConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1alpha1.ScrapeConfig)
- [Prometheus Operator ServiceMonitor API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Kubernetes Services without selectors](https://kubernetes.io/docs/concepts/services-networking/service/#services-without-selectors)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Prometheus Operator Probe API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Probe)

## Conclusion

Use ScrapeConfig to model an external VM or FQDN directly. Use a selectorless Service and manual EndpointSlice only when Kubernetes should own fixed external IP inventory. In both cases, configure the matching Prometheus selector, verify discovery RBAC and network reachability, and use a Probe instead when the real goal is blackbox availability testing.
