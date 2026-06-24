# How to Monitor Kubewarden Policy Decisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Monitoring, Policy Decisions, Prometheus, Grafana, Kubernetes, SUSE Rancher

Description: Learn how to monitor Kubewarden policy admission decisions using Prometheus metrics, Grafana dashboards, and audit logs to track policy violations and cluster security posture.

---

Monitoring Kubewarden policy decisions helps you understand what is being allowed or denied in your cluster, detect misconfigured policies, and track your security posture over time.

---

## Kubewarden Metrics Overview

Kubewarden exports Prometheus metrics from each Policy Server. Key metrics:

| Metric | Description |
|---|---|
| `kubewarden_policy_evaluations_total` | Total policy evaluations by labels such as `policy_name`, `accepted`, `mutated`, and `request_origin` |
| `kubewarden_policy_evaluation_latency_milliseconds` | Policy evaluation latency histogram in milliseconds |

---

## Step 1: Enable Prometheus Metrics

Kubewarden does not expose Prometheus metrics until telemetry is enabled. After enabling telemetry in the `kubewarden-controller` Helm chart (`telemetry.mode: sidecar`, `telemetry.metrics: true`, and `telemetry.sidecar.metrics.port: 8080`), create a ServiceMonitor for the default Policy Server:

```yaml
# kubewarden-servicemonitor.yaml

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubewarden-policy-server
  namespace: kubewarden
  labels:
    release: prometheus   # Must match your Prometheus operator selector
spec:
  selector:
    matchLabels:
      app: kubewarden-policy-server-default
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
  namespaceSelector:
    matchNames:
      - kubewarden
```

```bash
kubectl apply -f kubewarden-servicemonitor.yaml
```

---

## Step 2: Create Alerting Rules

```yaml
# kubewarden-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kubewarden-alerts
  namespace: kubewarden
  labels:
    release: prometheus
spec:
  groups:
    - name: kubewarden.policies
      rules:
        - alert: KubewardenHighRejectionRate
          expr: |
            (
              sum by (policy_name) (
                rate(kubewarden_policy_evaluations_total{accepted="false",request_origin="validate"}[5m])
              )
              /
              sum by (policy_name) (
                rate(kubewarden_policy_evaluations_total{request_origin="validate"}[5m])
              )
            ) > 0.10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Kubewarden policy '{{ $labels.policy_name }}' has >10% rejection rate"
            description: "A high rejection rate may indicate a misconfigured policy or unexpected workload changes"

        - alert: KubewardenPolicyErrorCode
          expr: |
            sum by (policy_name, error_code) (
              rate(kubewarden_policy_evaluations_total{accepted="false",request_origin="validate",error_code!=""}[5m])
            ) > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Kubewarden policy '{{ $labels.policy_name }}' is rejecting requests with error code '{{ $labels.error_code }}'"
```

---

## Step 3: Grafana Dashboard Queries

Create a Grafana dashboard with these queries:

```promql
# Policy evaluation rate by accept/reject outcome
sum by (policy_name, accepted) (
  rate(kubewarden_policy_evaluations_total{request_origin="validate"}[5m])
)

# Top 5 most active policies
topk(5, sum by (policy_name) (
  rate(kubewarden_policy_evaluations_total{request_origin="validate"}[5m])
))

# Policy evaluation latency (p95)
histogram_quantile(0.95,
  sum by (policy_name, le) (
    rate(kubewarden_policy_evaluation_latency_milliseconds_bucket{request_origin="validate"}[5m])
  )
)

# Rejection rate per policy
100 *
sum by (policy_name) (
  rate(kubewarden_policy_evaluations_total{accepted="false",request_origin="validate"}[1h])
)
/
sum by (policy_name) (
  rate(kubewarden_policy_evaluations_total{request_origin="validate"}[1h])
)
```

---

## Step 4: Run Audit Scanner

Kubewarden's Audit Scanner runs periodic checks on existing resources to detect policy violations that were admitted before a policy was added:

```bash
# Check if audit scanner is installed
kubectl get cronjob audit-scanner -n kubewarden

# Trigger a manual audit scan
kubectl create job \
  --namespace kubewarden \
  --from cronjob/audit-scanner \
  audit-scanner-manual-$(date +%Y-%m-%d-%H-%M-%S)

# View audit scan results
kubectl get report -A -o wide
kubectl get clusterreport -o wide
```

---

## Step 5: View Audit Reports

Kubewarden's Audit Scanner stores results in OpenReports CRDs (`Report` and `ClusterReport`) by default. If you explicitly enabled the deprecated PolicyReport CRDs, use `policyreport` and `clusterpolicyreport` instead:

```bash
# List all namespaced reports
kubectl get report -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,FAIL:.summary.fail,PASS:.summary.pass'

# List all cluster-scoped reports
kubectl get clusterreport \
  -o custom-columns='NAME:.metadata.name,FAIL:.summary.fail,PASS:.summary.pass'

# Get details of a specific report
kubectl get report -n default <report-name> -o yaml
kubectl get clusterreport <clusterreport-name> -o yaml
```

---

## Best Practices

- Alert on rejected admission requests and inspect the `error_code` label when a policy returns one.
- Monitor for sudden spikes in rejection rate - this could indicate a new policy blocking legitimate workloads.
- Use the Audit Scanner to identify existing resources that violate newly added policies before enforcing them.
