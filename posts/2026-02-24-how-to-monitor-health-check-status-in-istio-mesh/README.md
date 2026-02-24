# How to Monitor Health Check Status in Istio Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Checks, Monitoring, Prometheus, Kubernetes

Description: Monitor the health check status of services in your Istio mesh using Prometheus metrics, Envoy stats, and Kubernetes events for proactive issue detection.

---

Knowing that health checks exist is not enough. You need to monitor them. A health check that silently fails means pods are getting restarted without anyone noticing, or worse, traffic is being sent to unhealthy endpoints. In an Istio mesh, health check monitoring happens at multiple levels: Kubernetes probes, Envoy outlier detection, and the Istio agent.

## Kubernetes-Level Monitoring

The first layer of monitoring comes from Kubernetes itself. Track pod restarts, which are often caused by liveness probe failures:

```promql
# Pods with high restart counts
kube_pod_container_status_restarts_total{namespace="default"} > 5

# Rate of restarts (restarts per hour)
rate(kube_pod_container_status_restarts_total{namespace="default"}[1h]) * 3600
```

These metrics come from kube-state-metrics, which you should have running in your cluster. If you do not have it:

```bash
helm install kube-state-metrics prometheus-community/kube-state-metrics -n monitoring
```

Track readiness status:

```promql
# Pods that are not ready
kube_pod_status_ready{condition="false", namespace="default"}

# Percentage of ready pods per deployment
sum(kube_pod_status_ready{condition="true", namespace="default"}) by (pod)
/
count(kube_pod_status_ready{namespace="default"}) by (pod)
* 100
```

## Envoy Outlier Detection Metrics

Envoy tracks outlier detection events, which tell you about endpoint health from the traffic perspective:

```bash
# Check ejection stats from a specific pod
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET stats | grep outlier_detection
```

The key metrics:

- `outlier_detection.ejections_active` - number of currently ejected endpoints
- `outlier_detection.ejections_total` - total ejections since proxy start
- `outlier_detection.ejections_consecutive_5xx` - ejections due to consecutive 5xx errors
- `outlier_detection.ejections_enforced_total` - ejections that were actually enforced (not limited by maxEjectionPercent)

In Prometheus:

```promql
# Active ejections per cluster
envoy_cluster_outlier_detection_ejections_active

# Rate of new ejections
rate(envoy_cluster_outlier_detection_ejections_total[5m])

# Ejections by cluster (service)
sum(rate(envoy_cluster_outlier_detection_ejections_total[5m])) by (cluster_name)
```

## Envoy Endpoint Health

Check the health status of endpoints that Envoy knows about:

```bash
# List endpoints and their health
istioctl proxy-config endpoints <pod-name> --cluster "outbound|8080||backend.default.svc.cluster.local"
```

The output shows each endpoint with its health status: HEALTHY, UNHEALTHY, DRAINING, or TIMEOUT.

You can also get this from the Envoy admin API:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET clusters?format=json | python3 -m json.tool | grep -A5 "health_status"
```

## Sidecar Agent Health Metrics

The Istio sidecar agent (pilot-agent) on port 15020 exposes Prometheus metrics about probe handling:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -s http://localhost:15020/metrics | grep -i health
```

## Setting Up a Health Monitoring Dashboard

Create a Grafana dashboard that shows health status across your mesh. Here are the key panels:

**Panel 1: Pod Restart Rate**
```promql
topk(10, rate(kube_pod_container_status_restarts_total{namespace="default"}[1h]) * 3600)
```

**Panel 2: Not-Ready Pods**
```promql
count(kube_pod_status_ready{condition="false", namespace="default"}) by (pod)
```

**Panel 3: Active Outlier Ejections**
```promql
sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name) > 0
```

**Panel 4: Error Rate by Service**
```promql
sum(rate(istio_requests_total{response_code=~"5.*", destination_service_namespace="default"}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{destination_service_namespace="default"}[5m])) by (destination_service_name)
```

**Panel 5: Request Latency P99**
```promql
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service_namespace="default"}[5m])) by (le, destination_service_name))
```

## Alerting on Health Check Issues

Set up alerts to catch health problems early:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: health-check-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-health
      rules:
        - alert: PodRestartingFrequently
          expr: |
            rate(kube_pod_container_status_restarts_total[1h]) * 3600 > 3
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.pod }} is restarting frequently"
            description: "Pod {{ $labels.pod }} has restarted more than 3 times in the last hour"

        - alert: HighOutlierEjectionRate
          expr: |
            rate(envoy_cluster_outlier_detection_ejections_total[5m]) > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High outlier ejection rate for {{ $labels.cluster_name }}"
            description: "Endpoints are being ejected frequently, indicating upstream health issues"

        - alert: ManyPodsNotReady
          expr: |
            count(kube_pod_status_ready{condition="false", namespace="default"})
            /
            count(kube_pod_status_ready{namespace="default"})
            > 0.2
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "More than 20% of pods are not ready in default namespace"

        - alert: AllEndpointsEjected
          expr: |
            envoy_cluster_outlier_detection_ejections_active
            ==
            envoy_cluster_membership_total
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "All endpoints ejected for {{ $labels.cluster_name }}"
```

## Using kubectl for Quick Health Checks

For quick command-line monitoring:

```bash
# Overview of all pods and their readiness
kubectl get pods -n default -o wide

# Pods that are not fully ready
kubectl get pods -n default | grep -v "Running" && kubectl get pods -n default | grep "0/"

# Recent health check events
kubectl get events -n default --sort-by='.lastTimestamp' | grep -i "unhealthy\|probe\|restart"

# Endpoint health for a specific service
kubectl get endpoints my-service -o yaml | grep -c "ip:"
```

## Monitoring Health During Rollouts

Deployments are when health check issues are most likely to surface. Monitor rollout health:

```bash
# Watch rollout status
kubectl rollout status deployment/my-service -n default

# Watch pods during rollout
kubectl get pods -l app=my-service -n default -w
```

Track readiness during rollouts in Prometheus:

```promql
# Ready replicas vs desired replicas
kube_deployment_status_replicas_ready{deployment="my-service"}
/
kube_deployment_spec_replicas{deployment="my-service"}
```

If this ratio drops below 1 during a rollout and stays there, the new pods are failing health checks.

## Periodic Health Audits

Run periodic checks to ensure health configurations are correct across your mesh:

```bash
#!/bin/bash
# Check all deployments have readiness probes
for deploy in $(kubectl get deployments -n default -o name); do
  has_readiness=$(kubectl get $deploy -n default -o jsonpath='{.spec.template.spec.containers[0].readinessProbe}')
  if [ -z "$has_readiness" ]; then
    echo "WARNING: $deploy has no readiness probe"
  fi
done

# Check all services have healthy endpoints
for svc in $(kubectl get svc -n default -o name); do
  ep_count=$(kubectl get endpoints ${svc#*/} -n default -o jsonpath='{.subsets[0].addresses}' 2>/dev/null | grep -c "ip")
  if [ "$ep_count" -eq 0 ]; then
    echo "WARNING: $svc has no healthy endpoints"
  fi
done
```

## Integration with OneUptime

For end-to-end health monitoring, integrate your Istio mesh health data with a monitoring platform like OneUptime. You can forward Prometheus alerts and create status pages that reflect the real-time health of services in your mesh.

Configure Prometheus to send alerts via webhook:

```yaml
alertmanager:
  config:
    receivers:
      - name: oneuptime
        webhook_configs:
          - url: "https://your-instance.oneuptime.com/api/alerts/webhook"
            send_resolved: true
```

This way, health check failures in your Istio mesh automatically trigger incident workflows.

Monitoring health check status in an Istio mesh is about layering visibility from Kubernetes pod status, Envoy stats, and application metrics. The Prometheus metrics are already there, you just need the right queries and alerts. Focus your dashboards on restart rates, outlier ejections, and endpoint readiness. These three metrics will catch most health issues before they become user-facing incidents.
