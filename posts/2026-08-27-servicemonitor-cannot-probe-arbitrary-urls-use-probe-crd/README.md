# Why a ServiceMonitor Cannot Probe Multiple Arbitrary URLs - and When to Use the Probe CRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Prometheus Operator, Kubernetes, ServiceMonitor, Probe, Blackbox Exporter

Description: Separate Service-backed metrics scraping from black-box URL probing, then configure the Probe CRD for multiple static targets.

---

A `ServiceMonitor` is not a generic URL-check configuration. It selects Kubernetes Services by labels, discovers their backing Endpoints or EndpointSlices, and tells Prometheus how to scrape metrics from those endpoints. Its `spec.endpoints` list describes ports and paths on that selected Service topology. It does not accept a list such as `https://one.example/health` and `https://two.example/health`.

When the desired result is reachability, status, latency, DNS, TLS, TCP, or ICMP telemetry for arbitrary destinations, use the Prometheus Operator `Probe` custom resource together with a prober such as Prometheus Blackbox Exporter.

## ServiceMonitor and Probe Measure Different Things

The two resources produce different request paths:

```text
ServiceMonitor: Prometheus -> application /metrics -> Prometheus samples
Probe:          Prometheus -> prober /probe?target=... -> probe result samples
```

With a Probe, Prometheus scrapes the prober. The prober contacts the target and converts the result into metrics such as probe success and duration. The target does not need to expose Prometheus metrics.

This distinction also prevents a common modeling error. Pointing a ServiceMonitor at Blackbox Exporter's own `/metrics` path collects exporter process metrics. It does not ask Blackbox Exporter to test each URL.

## Define a Probe with Static Targets

Assume Blackbox Exporter is reachable inside the cluster at `blackbox-exporter.monitoring.svc.cluster.local:9115` and its configuration defines a module named `http_2xx`. A Probe can pass several static URLs to that module:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: Probe
metadata:
  name: customer-http-endpoints
  namespace: monitoring
  labels:
    monitoring: platform
spec:
  jobName: customer-http-endpoints
  prober:
    url: blackbox-exporter.monitoring.svc.cluster.local:9115
    scheme: http
    path: /probe
  module: http_2xx
  interval: 30s
  scrapeTimeout: 10s
  targets:
    staticConfig:
      static:
        - https://api.example.com/health
        - https://checkout.example.net/ready
        - https://status.example.org/
      labels:
        probe_group: customer-facing
```

The `prober.url` value is an `address:port` without a scheme. Put `http` or `https` in `prober.scheme`. The prober path defaults to `/probe`, so it may be omitted when the exporter uses that default. The module name must exist in the prober's own configuration; the Probe CRD does not define the module.

As with ServiceMonitor, a Prometheus or PrometheusAgent resource must select the Probe. Check both its object selector and namespace selector:

```yaml
spec:
  probeSelector:
    matchLabels:
      monitoring: platform
  probeNamespaceSelector:
    matchLabels:
      observability: enabled
```

An empty `probeNamespaceSelector: {}` matches all namespaces. A null namespace selector matches only the Prometheus resource's own namespace. Apply the same deliberate scoping used for ServiceMonitors.

## Use Ingress Discovery When Targets Are Kubernetes Ingresses

The Probe CRD supports either `targets.staticConfig` or `targets.ingress`. Ingress discovery creates probe targets from selected Ingress host and path combinations. Static configuration takes precedence if both are set, so define only the mode you intend.

Use static targets for an explicit curated list. Use Ingress discovery when the probe inventory should follow labeled Ingress objects. In both cases, the Probe still routes requests through the configured prober.

## Use ScrapeConfig for Direct External Metrics

Not every external target needs a black-box probe. If `metrics.example.com:9100` already exposes Prometheus-format metrics and Prometheus should scrape those samples directly, `ScrapeConfig` is the lower-level Operator resource:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: ScrapeConfig
metadata:
  name: external-node-exporters
  namespace: monitoring
  labels:
    monitoring: platform
spec:
  staticConfigs:
    - targets:
        - metrics-a.example.com:9100
        - metrics-b.example.com:9100
      labels:
        environment: production
```

`ScrapeConfig` has its own CRD version and its own `scrapeConfigSelector` fields on Prometheus. Confirm the version served by the installed CRD instead of copying a manifest from a different Operator release.

Choose by intent:

| Intent | Resource |
| --- | --- |
| Scrape metrics from pods behind labeled Kubernetes Services | `ServiceMonitor` |
| Test arbitrary targets through a black-box prober | `Probe` |
| Directly scrape external metrics or use lower-level service discovery | `ScrapeConfig` |

## Validate the Probe Path

Check the three independently managed objects: the Probe, the Prometheus selector, and the prober itself.

```bash
kubectl get probe customer-http-endpoints -n monitoring -o yaml
kubectl get prometheus -n monitoring -o yaml
kubectl get service blackbox-exporter -n monitoring -o wide
```

Inspect Operator rejection events if a Probe change is not reconciled:

```bash
kubectl get events -n monitoring \
  --field-selector involvedObject.kind=Probe,involvedObject.name=customer-http-endpoints \
  --sort-by=.lastTimestamp
```

In Prometheus, inspect Service Discovery and Targets. A successful scrape of the prober only proves that Prometheus reached the prober. Query the probe result metric and inspect per-target labels to confirm that the remote target test succeeded.

## Official Documentation

- [Prometheus Operator API reference for Probe](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Probe)
- [Prometheus Operator design: ServiceMonitor, Probe, and ScrapeConfig](https://prometheus-operator.dev/docs/getting-started/design/#config-based-resources)
- [Prometheus Operator ScrapeConfig guide](https://prometheus-operator.dev/docs/developer/scrapeconfig/)
- [Prometheus Blackbox Exporter configuration](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)

## Conclusion

A ServiceMonitor discovers metrics endpoints through Kubernetes Services; it does not probe arbitrary URLs. Use Probe when a prober should test multiple destinations, and use ScrapeConfig when Prometheus should directly scrape external metrics targets.
