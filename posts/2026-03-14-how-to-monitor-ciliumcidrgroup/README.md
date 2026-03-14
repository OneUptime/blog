# Monitoring CiliumCIDRGroup Resources in Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Monitoring, CIDRGroup

Description: A practical guide to monitoring CiliumCIDRGroup custom resources for tracking CIDR-based network policies and ensuring reliable IP-based access control in Cilium-managed clusters.

---

## Introduction

CiliumCIDRGroup is a custom resource that lets you define reusable groups of CIDR ranges for network policies. Instead of duplicating IP blocks across multiple CiliumNetworkPolicy resources, you define them once in a CiliumCIDRGroup and reference them by name. This keeps policies clean and reduces configuration drift.

Monitoring these resources matters because stale or misconfigured CIDR groups can silently break connectivity. If an external service changes its IP range and your CiliumCIDRGroup is not updated, traffic may be blocked without any obvious error.

This guide covers setting up effective monitoring for CiliumCIDRGroup resources, including health checks, metrics collection, and alerting strategies that work in production.

## Prerequisites

- Kubernetes cluster (v1.25+) with Cilium installed (v1.14+)
- kubectl configured with cluster access
- Prometheus and Grafana for metrics (recommended)
- Cilium CLI installed

## Understanding CiliumCIDRGroup Structure

A CiliumCIDRGroup defines reusable CIDR blocks:

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumCIDRGroup
metadata:
  name: external-api-cidrs
spec:
  externalCIDRs:
    - "203.0.113.0/24"
    - "198.51.100.0/24"
```

To list all CiliumCIDRGroup resources:

```bash
# List all CiliumCIDRGroup resources
kubectl get ciliumcidrgroups

# View the full spec of a specific CIDRGroup
kubectl get ciliumcidrgroup external-api-cidrs -o yaml
```

## Setting Up Automated Monitoring

### Monitoring with kubectl and Scripts

```bash
#!/bin/bash
# monitor-cidrgroups.sh - Monitor CiliumCIDRGroup resources

echo "=== CiliumCIDRGroup Health Check ==="

CIDRGROUPS=$(kubectl get ciliumcidrgroups -o jsonpath='{.items[*].metadata.name}')

if [ -z "$CIDRGROUPS" ]; then
  echo "WARNING: No CiliumCIDRGroup resources found"
  exit 1
fi

for group in $CIDRGROUPS; do
  CIDR_COUNT=$(kubectl get ciliumcidrgroup "$group" \
    -o jsonpath='{.spec.externalCIDRs}' | jq length)
  if [ "$CIDR_COUNT" -eq 0 ]; then
    echo "CRITICAL: CIDRGroup $group has no CIDR entries"
  else
    echo "OK: CIDRGroup $group has $CIDR_COUNT CIDR entries"
  fi
  CREATION=$(kubectl get ciliumcidrgroup "$group" \
    -o jsonpath='{.metadata.creationTimestamp}')
  echo "  Created: $CREATION"
done
```

### Monitoring with Prometheus and Hubble

Enable Hubble metrics to observe traffic patterns related to CIDR-based policies:

```yaml
# cilium-values.yaml for Helm
hubble:
  enabled: true
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - icmp
      - "policy:sourceContext=app;destinationContext=app"
prometheus:
  enabled: true
  serviceMonitor:
    enabled: true
```

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-values.yaml
```

### Prometheus Queries for CIDR Policy Monitoring

```promql
# Track drops by reason related to policy denial
rate(hubble_drop_total{reason="POLICY_DENIED"}[5m])

# Monitor flow counts for dropped traffic
rate(hubble_flows_processed_total{verdict="DROPPED"}[5m])
```

```mermaid
graph LR
    A[CiliumCIDRGroup] --> B[CiliumNetworkPolicy]
    B --> C[Cilium Agent]
    C --> D[Hubble]
    D --> E[Prometheus]
    E --> F[Grafana Dashboard]
    F --> G[Alerts]
```

## Setting Up Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-cidrgroup-alerts
  namespace: monitoring
spec:
  groups:
    - name: cilium-cidrgroup
      rules:
        - alert: HighPolicyDropRate
          expr: rate(hubble_drop_total{reason="POLICY_DENIED"}[5m]) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High policy drop rate detected"
            description: "More than 10 drops/sec for 5 min. Check CiliumCIDRGroup config."
```

## Verification

```bash
# Check that Hubble is running and collecting metrics
cilium hubble port-forward &
hubble observe --verdict DROPPED --last 10

# Confirm CIDRGroup resources are healthy
kubectl get ciliumcidrgroups -o json | \
  jq '.items[] | {name: .metadata.name, cidrs: (.spec.externalCIDRs | length)}'
```

## Troubleshooting

- **No CiliumCIDRGroup resources found**: Verify Cilium version supports CiliumCIDRGroup (v1.14+). Check the CRD with `kubectl get crd ciliumcidrgroups.cilium.io`.
- **Metrics not appearing in Prometheus**: Ensure Hubble is enabled and ServiceMonitor is configured. Check `cilium status`.
- **High drop rate alerts firing unexpectedly**: Review flows with `hubble observe --verdict DROPPED`. Drops may be legitimate policy enforcement.
- **Stale CIDR entries**: Implement a reconciliation process that validates entries against current external service IP ranges.

## Conclusion

Monitoring CiliumCIDRGroup resources is essential for maintaining reliable CIDR-based network policies. By combining kubectl health checks, Hubble flow observation, and Prometheus metrics with alerting, you catch misconfigurations before they affect production traffic. Monitor not just the resources themselves but also the traffic patterns that depend on them.