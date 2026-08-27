# ServiceMonitor vs PodMonitor: Which One Should Scrape Your Kubernetes Workload?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, ServiceMonitor, PodMonitor, Kubernetes, Observability

Description: Choose ServiceMonitor or PodMonitor based on the workload's discovery contract, port ownership, labels, namespace policy, and lifecycle.

---

Both `ServiceMonitor` and `PodMonitor` generate Prometheus scrape configuration. The difference is the Kubernetes object used as the discovery contract:

- `ServiceMonitor` selects Services, then scrapes endpoint addresses behind those Services.
- `PodMonitor` selects Pods directly and scrapes their declared ports.

Neither choice changes the metrics exposition format. Choose the object whose labels and ports are owned and stable in your platform.

## The Practical Difference

| Question | ServiceMonitor | PodMonitor |
| --- | --- | --- |
| Required intermediate object | Kubernetes Service | None |
| `spec.selector` matches | Service labels | Pod labels |
| Endpoint port normally names | `Service.spec.ports[].name` | Pod container port name |
| Namespace field | `namespaceSelector` for Services | `namespaceSelector` for Pods |
| Selected by Prometheus with | `serviceMonitorSelector` | `podMonitorSelector` |
| Prometheus namespace selector | `serviceMonitorNamespaceSelector` | `podMonitorNamespaceSelector` |

A ServiceMonitor does not normally scrape the Service ClusterIP. Kubernetes discovery expands the Service's endpoint data and Prometheus scrapes the resulting endpoint addresses. The Service is still important because it owns the labels and named-port mapping used for discovery.

## Use a ServiceMonitor for a Service-Owned Endpoint

A ServiceMonitor fits when the application already exposes a stable Service for metrics or when the platform considers the Service the supported interface:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: orders
  labels:
    app.kubernetes.io/name: orders
spec:
  selector:
    app.kubernetes.io/name: orders
  ports:
    - name: metrics
      port: 9090
      targetPort: metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: orders
  namespace: orders
  labels:
    prometheus: platform
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: orders
  endpoints:
    - port: metrics
      path: /metrics
```

This makes Service labels and `ports[].name` the monitoring API. It is a strong choice when:

- multiple Pod revisions should remain behind one stable identity;
- a chart already owns a metrics Service;
- target labels should be copied from the Service;
- operators and application teams reason about endpoints through Services;
- selectorless Services and manually managed EndpointSlices intentionally represent non-Pod targets.

Do not create a Service only from habit. It becomes another selector and port mapping that must be maintained.

## Use a PodMonitor for a Pod-Owned Endpoint

A PodMonitor bypasses the Service:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: node-agent
  namespace: monitoring
  labels:
    prometheus: platform
spec:
  namespaceSelector:
    matchNames:
      - agents
  selector:
    matchLabels:
      app.kubernetes.io/name: node-agent
  podMetricsEndpoints:
    - port: metrics
      path: /metrics
```

The selected Pods need a declared container port with the matching name:

```yaml
ports:
  - name: metrics
    containerPort: 9100
```

PodMonitor is usually clearer when:

- a DaemonSet or sidecar exposes metrics that should not have a Service;
- Pod labels are the intended ownership contract;
- every matching Pod should be scraped regardless of Service membership;
- the Service selector intentionally represents only a subset that differs from the monitoring target set.

PodMonitor does not mean "scrape any open Pod port." It still relies on declared Pod port metadata unless a supported numeric port field is used. The current API provides `port` and `portNumber`; the older PodMonitor `targetPort` field is deprecated in favor of those fields.

## Compare the Failure Modes

A ServiceMonitor adds these possible mismatches:

```text
ServiceMonitor labels selected by Prometheus
  -> ServiceMonitor selector matches Service labels
    -> Service selector matches Pods
      -> named Service port resolves to endpoint port
```

A PodMonitor removes the Service steps:

```text
PodMonitor labels selected by Prometheus
  -> PodMonitor selector matches Pod labels
    -> podMetricsEndpoints port matches Pod port metadata
```

That shorter chain can reduce configuration errors, but it also bypasses Service ownership. If application teams intentionally publish a metrics Service and platform tooling labels it, changing to PodMonitor can make the monitor depend on internal Pod labels that are less stable.

## Selection and RBAC Remain Separate

Prometheus chooses the two resource types with separate fields:

```yaml
spec:
  serviceMonitorSelector:
    matchLabels:
      prometheus: platform
  podMonitorSelector:
    matchLabels:
      prometheus: platform
```

Enabling one does not enable the other. Namespace selectors are also independent.

Prometheus needs Kubernetes discovery permissions for the chosen role and target namespaces. PodMonitor needs access to Pods. ServiceMonitor needs Services, Pods, and Endpoints or EndpointSlices. NetworkPolicy must allow the Prometheus Pods to connect to target Pod IPs in either design.

Authentication and TLS are configured per endpoint for both resources, but references to Secrets and ConfigMaps must follow the API's namespace rules. Do not put credentials directly into labels or annotations.

## Avoid Duplicate Scrapes

If a ServiceMonitor and PodMonitor select the same Pods and ports, Prometheus can ingest duplicate series under different target identities. This increases cost and may create apparently duplicated query results.

Before migrating:

1. compare the target sets on Prometheus **Status > Targets**;
2. apply the new monitor with a distinguishing temporary label or job identity;
3. verify series labels and scrape health;
4. remove the old monitor promptly.

Do not assume Prometheus will deduplicate two ordinary scrapes. High-availability replica deduplication in a remote query layer is a different mechanism.

## A Simple Decision Rule

Use ServiceMonitor when the Service is the stable, intentional discovery boundary. Use PodMonitor when Pods themselves are the stable boundary and a Service would exist only to satisfy monitoring. Then validate that Prometheus selects that CRD type, that the right object labels match, and that the port name belongs to the selected object layer.

## Official Documentation

- [Prometheus Operator getting started](https://prometheus-operator.dev/docs/developer/getting-started/)
- [ServiceMonitor API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [PodMonitor API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PodMonitor)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Prometheus Kubernetes discovery](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)

## Conclusion

ServiceMonitor and PodMonitor differ in discovery ownership, not in metrics format. Choose ServiceMonitor for a stable Service label and port contract. Choose PodMonitor when Pod labels and declared ports are the real contract. Avoid overlapping monitors, grant the correct discovery RBAC, and remember that both ultimately need network access to the target Pod or endpoint addresses.
