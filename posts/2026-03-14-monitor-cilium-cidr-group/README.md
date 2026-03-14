# Monitoring CiliumCIDRGroup in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Monitoring

Description: Set up monitoring and alerting for CiliumCIDRGroup to track dynamic CIDR-based network policies and detect misconfigurations before they disrupt cluster traffic.

---

## Introduction

CiliumCIDRGroup is a custom resource that allows you to define reusable sets of CIDR blocks and reference them across multiple CiliumNetworkPolicy resources. Instead of duplicating IP ranges in every policy, you maintain a single CiliumCIDRGroup object and update it in one place when external service IP ranges change.

Without monitoring, stale or misconfigured CiliumCIDRGroup resources can silently break connectivity to external services. Proactive monitoring with Prometheus metrics, Grafana dashboards, and alerting rules ensures your team catches issues before users are affected.

This guide covers metrics collection, dashboard creation, and alert configuration for CiliumCIDRGroup.

## Prerequisites

- A Kubernetes cluster with Cilium installed
- Prometheus deployed (e.g., via kube-prometheus-stack)
- Grafana for dashboards
- `kubectl` with cluster-admin access
- The Cilium CLI installed

## Enabling Prometheus Metrics

Ensure Cilium exposes metrics for Prometheus:

```bash
## Verify metrics are enabled
cilium config view | grep prometheus

## If not enabled, upgrade Cilium with metrics
helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  --reuse-values \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"

## Verify metrics endpoint
kubectl exec -n kube-system ds/cilium -- wget -qO- http://localhost:9962/metrics | head -20
```

## Understanding CiliumCIDRGroup Resources

Inspect your existing CiliumCIDRGroup resources:

```bash
## List all CiliumCIDRGroup resources
kubectl get ciliumcidrgroups

## View a specific CiliumCIDRGroup
kubectl get ciliumcidrgroup external-apis -o yaml

## Example CiliumCIDRGroup manifest
cat <<'EOF'
apiVersion: cilium.io/v2alpha1
kind: CiliumCIDRGroup
metadata:
  name: external-apis
spec:
  externalCIDRs:
    - 203.0.113.0/24
    - 198.51.100.0/24
EOF

## Check which network policies reference CiliumCIDRGroup
kubectl get ciliumnetworkpolicies -A -o yaml | grep -A2 "cidrGroupRef"
```

## Key Metrics for CiliumCIDRGroup

Monitor these Prometheus metrics:

```bash
## Primary metrics to track
## cilium_policy_count - total number of policies in the agent
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep "policy"

## PromQL queries for Grafana panels:

## Panel 1: Policy count per agent
cilium_policy_count

## Panel 2: Policy import errors
rate(cilium_policy_import_errors_total[5m])

## Panel 3: Policy change rate
rate(cilium_policy_change_total[5m])

## Panel 4: Endpoint regeneration triggered by policy changes
rate(cilium_endpoint_regenerations_total{reason="policy"}[5m])

## Panel 5: Drop rate for policy-denied traffic
sum(rate(cilium_drop_count_total{reason=~"POLICY_DENIED.*"}[5m])) by (direction)
```

## Configuring Alerting Rules

Create Prometheus alerts for CiliumCIDRGroup:

```yaml
## cilium-cidrgroup-alerts.yaml
## Alerting rules for CiliumCIDRGroup monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-cidrgroup-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: cilium.cidrgroup
      rules:
        - alert: CiliumPolicyImportErrors
          expr: |
            rate(cilium_policy_import_errors_total[5m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Cilium policy import errors on {{ $labels.instance }}"
            description: "Policy import is failing at {{ $value }} errors/sec. Check CiliumCIDRGroup references in network policies."
        - alert: CiliumHighPolicyDeniedDrops
          expr: |
            sum(rate(cilium_drop_count_total{reason=~"POLICY_DENIED.*"}[5m])) by (instance) > 100
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High policy-denied drop rate on {{ $labels.instance }}"
            description: "{{ $value }} packets/sec denied by policy. Verify CiliumCIDRGroup CIDRs are up to date."
        - alert: CiliumEndpointRegenerationFailures
          expr: |
            rate(cilium_endpoint_regenerations_total{outcome="fail"}[5m]) > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Endpoint regeneration failures on {{ $labels.instance }}"
            description: "Endpoints are failing to regenerate after policy changes. CiliumCIDRGroup updates may not be taking effect."
```

```bash
kubectl apply -f cilium-cidrgroup-alerts.yaml
```

## Building a Monitoring Dashboard

Create a Grafana dashboard for CiliumCIDRGroup:

```bash
## Dashboard panels (PromQL):

## Row 1: Policy Health
## - Active Policies: cilium_policy_count
## - Import Errors: rate(cilium_policy_import_errors_total[5m])
## - Policy Changes: rate(cilium_policy_change_total[5m])

## Row 2: Traffic Impact
## - Policy Denied Drops: sum(rate(cilium_drop_count_total{reason=~"POLICY_DENIED.*"}[5m])) by (direction)
## - Forward Rate: rate(cilium_forward_count_total[5m])
## - L3/L4 Policy Verdicts: rate(cilium_policy_l3l4_total[5m])

## Row 3: Endpoint Regeneration
## - Regeneration Rate: rate(cilium_endpoint_regenerations_total[5m])
## - Regeneration Failures: rate(cilium_endpoint_regenerations_total{outcome="fail"}[5m])
## - Regeneration Duration: histogram_quantile(0.99, rate(cilium_endpoint_regeneration_time_stats_seconds_bucket[5m]))
```

## Monitoring with Hubble

Use Hubble for real-time flow monitoring related to CIDR-based policies:

```bash
## Monitor dropped flows due to policy
kubectl exec -n kube-system ds/cilium -- hubble observe --verdict DROPPED --last 20

## Monitor traffic to specific CIDR ranges referenced in CiliumCIDRGroup
kubectl exec -n kube-system ds/cilium -- hubble observe --to-ip 203.0.113.0/24 --last 10

## Monitor policy verdict events
kubectl exec -n kube-system ds/cilium -- hubble observe --type policy-verdict --last 10

## Check flow logs for a specific namespace
kubectl exec -n kube-system ds/cilium -- hubble observe --namespace default --type drop --last 10
```

## Verification

Confirm monitoring is operational:

```bash
## Check Prometheus is scraping Cilium
curl -s http://localhost:9090/api/v1/targets 2>/dev/null | python3 -c "
import sys, json
try:
    for t in json.load(sys.stdin)['data']['activeTargets']:
        if 'cilium' in t.get('labels',{}).get('job',''):
            print(f'  {t[\"labels\"][\"job\"]}: {t[\"health\"]}')
except: print('  Port-forward Prometheus first')
"

## Verify alerts are loaded
kubectl get prometheusrules -n monitoring | grep cilium-cidrgroup

## Verify CiliumCIDRGroup resources are present
kubectl get ciliumcidrgroups -o custom-columns=NAME:.metadata.name,AGE:.metadata.creationTimestamp

## Check that metrics are being collected
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep policy | wc -l
```

## Troubleshooting

- **No metrics in Prometheus**: Verify `prometheus.enabled=true` in Cilium Helm values. Check that the ServiceMonitor labels match your Prometheus operator configuration.
- **CiliumCIDRGroup changes not reflected**: Cilium agents must regenerate endpoints after CIDR group updates. Check `cilium_endpoint_regenerations_total` for failures and inspect agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Dashboard shows No Data**: Confirm the Grafana data source points to the correct Prometheus instance. Test PromQL queries directly in the Prometheus expression browser.
- **Alerts not firing**: Check that PrometheusRule labels match the Prometheus operator's `ruleSelector`. Verify with `kubectl get prometheus -n monitoring -o yaml`.
- **Policy denied drops after CIDR update**: Verify the CiliumCIDRGroup resource contains the correct CIDR ranges with `kubectl get ciliumcidrgroup <name> -o yaml`. Ensure the referencing CiliumNetworkPolicy uses the correct `cidrGroupRef`.

## Conclusion

Monitoring CiliumCIDRGroup requires tracking policy import health, endpoint regeneration after CIDR changes, and policy-denied traffic drops. By enabling Prometheus metrics on Cilium components, creating dashboards that surface policy errors and traffic impact, configuring alerts for import failures and excessive drops, and using Hubble for real-time flow analysis, you ensure that CIDR-based network policies remain accurate and effective across your cluster.
