# How to Monitor Dapr Control Plane Health Continuously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Control Plane, Kubernetes, Observability

Description: Set up continuous health monitoring for the Dapr control plane components including the operator, sidecar injector, placement, and sentry services.

---

The Dapr control plane consists of four core components: the Dapr Operator, Sidecar Injector, Placement Service, and Sentry (certificate authority). If any of these degrade, new sidecar deployments fail, actor placement breaks, or mTLS ceases to function. Continuous monitoring catches these issues before they affect production services.

## Dapr Control Plane Components Overview

| Component | Pod Name | Purpose |
|-----------|----------|---------|
| dapr-operator | dapr-operator | Manages Dapr CRDs and components |
| dapr-sidecar-injector | dapr-sidecar-injector | Injects sidecars into pods |
| dapr-placement-server | dapr-placement-server | Actor placement |
| dapr-sentry | dapr-sentry | mTLS certificate authority |

Check control plane status with the Dapr CLI:

```bash
dapr status -k
```

## Setting Up Continuous Health Monitoring

Use Kubernetes liveness and readiness probes combined with Prometheus metrics. First, verify the control plane exposes metrics:

```bash
kubectl get pods -n dapr-system -o wide
kubectl port-forward svc/dapr-operator 9090:9090 -n dapr-system
curl http://localhost:9090/ | grep dapr_operator
```

Create a ServiceMonitor for each control plane component:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dapr-control-plane
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - dapr-system
  selector:
    matchLabels:
      app.kubernetes.io/part-of: dapr
  endpoints:
    - port: metrics
      interval: 15s
      path: /
```

## Alerting Rules for Control Plane Health

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-control-plane-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.controlplane
      rules:
        - alert: DaprOperatorDown
          expr: |
            absent(up{job="dapr-operator"} == 1)
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr Operator is down"
            description: "The Dapr Operator has been unavailable for more than 1 minute."

        - alert: DaprSidecarInjectorDown
          expr: |
            absent(up{job="dapr-sidecar-injector"} == 1)
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr Sidecar Injector is down"
            description: "New pod deployments will fail to receive Dapr sidecars."

        - alert: DaprPlacementDown
          expr: |
            absent(up{job="dapr-placement-server"} == 1)
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr Placement Service is down"
            description: "Actor placement is unavailable. Actor-based services will fail."

        - alert: DaprSentryDown
          expr: |
            absent(up{job="dapr-sentry"} == 1)
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr Sentry (CA) is down"
            description: "mTLS certificate issuance is unavailable. New sidecars cannot authenticate."
```

## Kubernetes-Native Health Checks

Supplement Prometheus with Kubernetes health checks using a periodic job:

```bash
#!/bin/bash
# control-plane-health-check.sh
NAMESPACE="dapr-system"
DEPLOYMENTS=("dapr-operator" "dapr-sidecar-injector" "dapr-sentry")
STATEFULSETS=("dapr-placement-server")

for component in "${DEPLOYMENTS[@]}"; do
  READY=$(kubectl get deployment "$component" -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
  DESIRED=$(kubectl get deployment "$component" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null)

  if [[ "$READY" != "$DESIRED" ]]; then
    echo "ALERT: $component not fully ready ($READY/$DESIRED replicas)"
  else
    echo "OK: $component ($READY/$DESIRED replicas)"
  fi
done

for component in "${STATEFULSETS[@]}"; do
  READY=$(kubectl get statefulset "$component" -n "$NAMESPACE" \
    -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
  DESIRED=$(kubectl get statefulset "$component" -n "$NAMESPACE" \
    -o jsonpath='{.spec.replicas}' 2>/dev/null)

  if [[ "$READY" != "$DESIRED" ]]; then
    echo "ALERT: $component not fully ready ($READY/$DESIRED replicas)"
  else
    echo "OK: $component ($READY/$DESIRED replicas)"
  fi
done
```

Run this as a CronJob every 5 minutes for lightweight continuous checks.

## Summary

Continuous Dapr control plane health monitoring combines Prometheus ServiceMonitors, alerting rules, and Kubernetes health checks to detect failures in the operator, injector, placement, and sentry services. Catching control plane degradation early prevents cascading failures across all sidecar-based services in the cluster.
