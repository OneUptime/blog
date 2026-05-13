# How to Monitor GAMMA in the Cilium Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, GAMMA, Gateway API, Monitoring

Description: Monitor GAMMA service mesh routes in the Cilium Gateway API using Prometheus and Hubble to track east-west traffic health and routing fidelity.

---

## Introduction

Monitoring GAMMA routes in the Cilium Gateway API provides ongoing visibility into whether service mesh routing rules remain active and effective. Because Cilium handles GAMMA traffic through its eBPF datapath and per-node Envoy L7 proxy without sidecar proxies, monitoring requires using Cilium's own observability stack rather than sidecar-proxy metrics.

Hubble is the primary monitoring tool for GAMMA traffic. It exposes per-flow data showing which backend each request was routed to, the verdict (FORWARDED or DROPPED), and the applicable policy. Prometheus metrics from the Cilium agent provide aggregate throughput and drop rate data.

## Prerequisites

- Cilium with Prometheus and Hubble enabled
- GAMMA HTTPRoutes deployed
- HTTPRoute status conditions exported by kube-state-metrics custom-resource-state metrics
- Grafana connected to Prometheus

## Monitor Route Status Continuously

Watch for HTTPRoute condition changes:

```bash
kubectl get httproute -A -w
```

## Architecture

```mermaid
flowchart LR
    A[Service-to-Service Traffic] --> B[Cilium eBPF + Envoy GAMMA]
    B -->|flows| C[Hubble Agent]
    C --> D[Hubble Relay]
    D --> E[Hubble CLI/UI]
    B -->|metrics| F[Prometheus]
    F --> G[Grafana]
```

## Key Hubble Commands

Monitor active flows between mesh services:

```bash
hubble observe --namespace <namespace> --protocol http --follow
```

Filter by verdict to find anomalies:

```bash
hubble observe --verdict DROPPED --namespace <namespace> --since 5m
```

## Prometheus Queries for GAMMA Health

Track L7 policy activity by proxy type:

```promql
sum by (proxy_type) (rate(cilium_policy_l7_total[5m]))
```

Monitor forwarded packets by direction:

```promql
sum by (direction) (rate(cilium_forward_count_total[1m]))
```

## Alerting on GAMMA Route Failure

When HTTPRoute conditions are exposed through kube-state-metrics custom-resource-state metrics, alert on an `Accepted` condition that resolves to `0`:

```yaml
groups:
  - name: gamma-monitoring
    rules:
      - alert: GammaRouteAcceptedFalse
        expr: kube_customresource_httproute_status{customresource_group="gateway.networking.k8s.io",customresource_kind="HTTPRoute",type="Accepted"} == 0
        for: 3m
        labels:
          severity: critical
```

## Conclusion

Monitoring GAMMA in Cilium uses Hubble for real-time flow data and Prometheus for aggregate metrics. Combined with alerting on route conditions, this approach ensures your service mesh routing remains reliable and observable.
