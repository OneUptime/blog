# How to Monitor Service Registry in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Registry, Monitoring, Observability, Kubernetes

Description: Monitor Istio's internal service registry to track registered services, endpoints, and configuration sync status across your mesh.

---

Istio's service registry is the backbone of service discovery in the mesh. It keeps track of every service, every endpoint, and every piece of configuration that proxies need to route traffic correctly. When something goes wrong with the registry, services can't find each other, traffic gets misrouted, and debugging gets painful. Monitoring the registry proactively helps you catch problems before they affect your users.

## What Lives in the Service Registry

Istio's service registry is maintained by istiod and contains:

- **Services**: All Kubernetes services plus any ServiceEntry resources you've created
- **Endpoints**: The IP addresses and ports of pods (and VMs) that back those services
- **Configuration**: VirtualServices, DestinationRules, AuthorizationPolicies, and other Istio resources that affect routing

Istiod watches the Kubernetes API server for changes and updates the registry in real time. When something changes, istiod pushes updated configuration to the affected sidecar proxies via the xDS API.

## Checking Registry Contents

The simplest way to see what's in the registry is through istiod's debug endpoints:

```bash
# All registered services
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/registryz
```

This returns a JSON array of all services. Each entry includes the hostname, ports, and metadata.

For a more readable output, pipe it through a JSON formatter:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/registryz | python3 -m json.tool | head -100
```

To check endpoints for a specific service:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/endpointz
```

## Monitoring Proxy Sync Status

One of the most important things to monitor is whether all proxies are in sync with istiod. A proxy that's out of sync has stale configuration and might route traffic incorrectly.

```bash
istioctl proxy-status
```

This shows every proxy and its sync status for each xDS type:

- **CDS** (Cluster Discovery Service): Service clusters
- **LDS** (Listener Discovery Service): Listeners for incoming connections
- **EDS** (Endpoint Discovery Service): Endpoint addresses
- **RDS** (Route Discovery Service): Routing rules

Each should say `SYNCED`. If you see `STALE`, the proxy hasn't acknowledged the latest configuration push.

## Istiod Metrics for Registry Health

Istiod exposes Prometheus metrics that tell you about registry operations:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/metrics | grep pilot
```

Key metrics to monitor:

**pilot_services**: The total number of services in the registry.

```text
pilot_services
```

Track this over time. A sudden drop could mean a namespace was accidentally deleted or istiod lost connectivity to the Kubernetes API.

**pilot_virt_services**: The number of virtual services.

```text
pilot_virt_services
```

**pilot_xds_pushes**: The total number of xDS config pushes to proxies.

```text
sum(rate(pilot_xds_pushes[5m])) by (type)
```

A high push rate might indicate frequent config changes (which is normal during deployments) or oscillating configuration (which is a problem).

**pilot_xds_push_time**: How long config pushes take.

```text
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le))
```

If push times are increasing, istiod might be struggling under load.

**pilot_proxy_convergence_time**: How long it takes for proxy configurations to converge after a change.

```text
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

**pilot_conflict_inbound_listener** and **pilot_conflict_outbound_listener_tcp_over_current_tcp**: Configuration conflicts that can cause routing issues.

```text
pilot_conflict_inbound_listener
pilot_conflict_outbound_listener_tcp_over_current_tcp
```

These should be zero. Any non-zero value indicates conflicting configurations that need investigation.

## Setting Up Prometheus Alerts

Create alerts for registry health issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-registry-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-registry
    rules:
    - alert: IstioPilotServicesDropped
      expr: delta(pilot_services[10m]) < -5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio service registry lost services"
        description: "{{ $value }} services disappeared from the registry in the last 10 minutes"

    - alert: IstioPilotPushErrors
      expr: sum(rate(pilot_xds_pushes{type="cds_senderr"}[5m])) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Istio xDS push errors detected"

    - alert: IstioProxyStale
      expr: count(pilot_proxy_convergence_time_bucket) by (le) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Stale proxies detected in the mesh"

    - alert: IstioPilotHighPushLatency
      expr: histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le)) > 30
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio config push latency is above 30 seconds"
```

## Monitoring with Kiali

Kiali provides a graphical view of the service registry. It shows:

- All services in the mesh and their relationships
- Services with configuration issues (highlighted in red/yellow)
- Traffic flow between services
- Health status of services and workloads

Access it:

```bash
istioctl dashboard kiali
```

Look at the "Services" page for a list of all registered services and their configurations. The "Istio Config" page shows all Istio resources and validates them for correctness.

## Tracking Registry Changes Over Time

For compliance and debugging, it's useful to track changes to the service registry. You can do this by monitoring the Kubernetes events related to Istio resources:

```bash
kubectl get events -A --field-selector reason=Updated --sort-by='.lastTimestamp' | grep -E "virtualservice|destinationrule|serviceentry|authorizationpolicy"
```

For a more comprehensive approach, use a GitOps tool like ArgoCD or Flux to manage your Istio configurations. Every change goes through a Git commit, giving you a full audit trail.

## Monitoring xDS Configuration Size

Large configurations can slow down proxy startup and increase memory usage. Monitor the size of configurations being pushed:

```bash
istioctl proxy-config cluster deploy/my-service -n backend | wc -l
```

If a proxy has thousands of clusters, it's probably receiving configuration for services it doesn't need. Use Sidecar resources to limit the scope:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: backend
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "database/*"
```

Monitor the pilot_xds metric to see configuration sizes across the mesh:

```text
pilot_xds{type="cds"}
```

## Health Checking Istiod Itself

Monitor istiod's health directly:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/healthz/ready
```

Set up a liveness check in your monitoring system that hits this endpoint. If istiod goes down, the registry stops updating (though existing proxies continue to work with their last known configuration).

Monitor istiod resource usage:

```text
container_memory_working_set_bytes{container="discovery", namespace="istio-system"}
container_cpu_usage_seconds_total{container="discovery", namespace="istio-system"}
```

If istiod is running out of memory or CPU, the registry updates will slow down or stop.

## Building a Registry Dashboard

Create a Grafana dashboard that combines the key registry metrics:

- Total services in the registry (pilot_services)
- xDS push rate and errors (pilot_xds_pushes)
- Push latency (pilot_xds_push_time)
- Proxy sync status (number of SYNCED vs STALE proxies)
- Configuration conflicts (pilot_conflict_*)
- Istiod CPU and memory usage

This dashboard becomes your go-to for understanding the health of service discovery in your mesh. Review it regularly and investigate any anomalies before they become incidents.

A healthy service registry is something you want to verify continuously, not just when things break. By monitoring the registry, proxy sync status, and istiod health, you'll catch problems early and keep your service mesh running smoothly.
