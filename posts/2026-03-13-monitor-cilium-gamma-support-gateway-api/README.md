# How to Monitor Cilium GAMMA Support in the Cilium Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, GAMMA, Gateway API, Monitoring

Description: Set up comprehensive monitoring for Cilium GAMMA support in the Gateway API controller using Prometheus metrics and Hubble observability.

---

## Introduction

Monitoring Cilium GAMMA support in the Gateway API controller ensures the controller continues to operate correctly as the cluster scales and routes change. Key signals include controller reconciliation success rates, HTTPRoute acceptance status, and Cilium/Envoy datapath health.

Unlike monitoring specific routes, controller-level monitoring tracks the health of the GAMMA system itself. This includes watching for reconciliation backlogs, controller restart rates, and API server connectivity.

## Prerequisites

- Cilium Gateway API enabled with GAMMA prerequisites in place
- Cilium operator Prometheus metrics enabled
- Grafana connected to Prometheus
- Hubble relay deployed for flow inspection

## Operator Health Metrics

```promql
# Controller reconciliation rate

rate(controller_runtime_reconcile_total{controller="gammaService",result="success"}[5m])

# Controller reconciliation errors
rate(controller_runtime_reconcile_errors_total{controller="gammaService"}[5m])
```

## Architecture

```mermaid
flowchart LR
    A[Cilium Operator] -->|reconcile| B[GAMMA Controller]
    A -->|/metrics| C[Prometheus]
    C --> D[Grafana]
    B -->|status updates| E[HTTPRoute objects]
    E --> F[kube-state-metrics]
    F --> C
```

## Monitor HTTPRoute Status via kube-state-metrics

If kube-state-metrics is configured with custom resource support and emits a metric named `httproute_status_condition` with `name`, `namespace`, `condition`, and `status` labels:

```promql
sum by (name, namespace) (
  kube_customresource_httproute_status_condition{
    customresource_group="gateway.networking.k8s.io",
    customresource_kind="HTTPRoute",
    condition="Accepted",
    status="False"
  }
)
```

## Hubble Flow Inspection

Monitor flows affected by GAMMA routes:

```bash
hubble observe --protocol http --to-service default/my-service --follow
```

## Alert on Controller Errors

```yaml
groups:
  - name: gamma-controller
    rules:
      - alert: GammaControllerReconcileErrors
        expr: |
          rate(controller_runtime_reconcile_errors_total{
            controller="gammaService"
          }[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "GAMMA controller reconciliation error rate elevated"
```

## Conclusion

Monitoring Cilium GAMMA support at the controller level provides early warning of reconciliation failures before they affect traffic. Combining operator Prometheus metrics with kube-state-metrics for route status gives a complete picture of GAMMA controller health.
