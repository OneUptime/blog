# How to Monitor Flux CD Kustomization Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Kustomization, Prometheus, Grafana

Description: Learn how to monitor Flux CD Kustomization reconciliation status using Prometheus metrics, CLI commands, and Grafana dashboards to keep your GitOps deployments healthy.

---

Flux CD Kustomizations are the primary mechanism for applying Kubernetes manifests from Git repositories to your cluster. Each Kustomization resource defines a path within a source, optional patches, variable substitution, and health checks. Monitoring their status is essential because a failed Kustomization means your desired cluster state is not being applied. This guide covers how to monitor Kustomization health end-to-end.

## Key Metrics

The kustomize-controller exposes the same Flux toolkit metrics as other controllers:

- `gotk_reconcile_condition{kind="Kustomization"}` -- Current condition (Ready, Stalled).
- `gotk_reconcile_duration_seconds{kind="Kustomization"}` -- How long reconciliations take.
- `gotk_suspend_status{kind="Kustomization"}` -- Whether the Kustomization is suspended.

## Checking Kustomization Status with CLI

Start by using the Flux CLI for a quick status overview:

```bash
flux get kustomizations --all-namespaces
```

Get detailed status for a specific Kustomization:

```bash
flux get kustomization infrastructure -n flux-system
```

View events for a Kustomization:

```bash
flux events --for Kustomization/infrastructure -n flux-system
```

Trace the dependency chain of a Kustomization:

```bash
flux trace kustomization infrastructure -n flux-system
```

The `flux trace` command is particularly useful because it shows the full dependency chain from source to Kustomization, helping you identify whether a failure originates from the source or the Kustomization itself.

## PromQL Queries for Kustomization Health

### Count Kustomizations by Status

```promql
sum by (status) (gotk_reconcile_condition{kind="Kustomization", type="Ready"})
```

### List Failing Kustomizations

```promql
gotk_reconcile_condition{kind="Kustomization", type="Ready", status="False"} == 1
```

### Average Reconciliation Duration

```promql
avg by (name, namespace) (
  rate(gotk_reconcile_duration_seconds_sum{kind="Kustomization"}[5m])
  / rate(gotk_reconcile_duration_seconds_count{kind="Kustomization"}[5m])
)
```

### P95 Reconciliation Duration

```promql
histogram_quantile(0.95,
  sum by (le, name, namespace) (
    rate(gotk_reconcile_duration_seconds_bucket{kind="Kustomization"}[5m])
  )
)
```

## Grafana Dashboard

Create a Grafana dashboard with panels for Kustomization monitoring:

```json
{
  "panels": [
    {
      "title": "Kustomization Health",
      "type": "piechart",
      "targets": [
        {
          "expr": "count(gotk_reconcile_condition{kind=\"Kustomization\", type=\"Ready\", status=\"True\"} == 1)",
          "legendFormat": "Ready"
        },
        {
          "expr": "count(gotk_reconcile_condition{kind=\"Kustomization\", type=\"Ready\", status=\"False\"} == 1)",
          "legendFormat": "Not Ready"
        }
      ]
    },
    {
      "title": "Kustomization Reconciliation Duration (P95)",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(gotk_reconcile_duration_seconds_bucket{kind=\"Kustomization\"}[5m])) by (le, name, namespace))",
          "legendFormat": "{{ namespace }}/{{ name }}"
        }
      ]
    },
    {
      "title": "Suspended Kustomizations",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(gotk_suspend_status{kind=\"Kustomization\"})",
          "legendFormat": "Suspended"
        }
      ]
    }
  ]
}
```

## Alerting Rules for Kustomization Failures

Create PrometheusRules for Kustomization failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-kustomization-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-kustomizations
      rules:
        - alert: FluxKustomizationNotReady
          expr: |
            gotk_reconcile_condition{kind="Kustomization", type="Ready", status="False"} == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Kustomization {{ $labels.name }} is not ready"
            description: >
              Kustomization {{ $labels.namespace }}/{{ $labels.name }}
              has been failing for more than 10 minutes. Check the
              kustomize-controller logs for details.

        - alert: FluxKustomizationStalled
          expr: |
            gotk_reconcile_condition{kind="Kustomization", type="Stalled", status="True"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kustomization {{ $labels.name }} is stalled"
            description: >
              Kustomization {{ $labels.namespace }}/{{ $labels.name }}
              is stalled and will not be retried automatically.

        - alert: FluxKustomizationFailureRate
          expr: |
            (
              sum(gotk_reconcile_condition{kind="Kustomization", type="Ready", status="False"})
              /
              count(gotk_reconcile_condition{kind="Kustomization", type="Ready"})
            ) > 0.1
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "More than 10% of Kustomizations are failing"
            description: >
              {{ $value | humanizePercentage }} of all Kustomizations
              are currently in a failed state.
```

Apply the rules:

```bash
kubectl apply -f kustomization-alerts.yaml
```

## Monitoring Kustomization Dependencies

Kustomizations can depend on each other via `spec.dependsOn`. When a dependency fails, downstream Kustomizations will not reconcile. Monitor the dependency chain:

```bash
flux trace kustomization apps -n flux-system
```

You can also create recording rules to track failing Kustomization counts over time:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-kustomization-recording
  namespace: flux-system
spec:
  groups:
    - name: flux-kustomization-recording
      rules:
        - record: flux:kustomization_not_ready:count
          expr: |
            count(gotk_reconcile_condition{kind="Kustomization", type="Ready", status="False"} == 1)
        - record: flux:kustomization_ready:count
          expr: |
            count(gotk_reconcile_condition{kind="Kustomization", type="Ready", status="True"} == 1)
```

## Investigating Kustomization Failures

When a Kustomization fails, use these commands to investigate:

```bash
flux logs --kind=Kustomization --name=my-app --namespace=flux-system
```

Check the Kustomization conditions using kubectl:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.conditions}' | jq .
```

Force a reconciliation to see immediate results:

```bash
flux reconcile kustomization my-app -n flux-system --with-source
```

Common causes of Kustomization failures include:

1. Invalid YAML in the source repository.
2. Missing required resources referenced by patches.
3. Namespace not existing for the target resources.
4. Health check timeouts for deployed resources.
5. Source dependency not ready.

## Summary

Monitoring Flux CD Kustomization status is critical for ensuring your GitOps pipeline delivers changes reliably. Use `gotk_reconcile_condition{kind="Kustomization"}` to track readiness, `gotk_reconcile_duration_seconds` for performance, and `gotk_suspend_status` for suspended resources. The `flux trace` command helps debug dependency chains, while `flux events` and `flux logs` provide detailed error information. Combine these signals with Prometheus alerts and Grafana dashboards for complete visibility across all your Kustomization resources.
