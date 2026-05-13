# How to Monitor Calico ImageSet Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, ImageSet, Monitoring, Observability

Description: Set up monitoring for Calico ImageSet management to detect configuration drift, image pull failures, and operator reconciliation issues in real time.

---

## Introduction

Monitoring Calico ImageSet management means watching for deviations from your intended image configuration before they cause outages. The scenarios you need to detect include: pods pulling from unexpected registries (registry bypass), image pull failures that prevent node upgrades, operator reconciliation failures that leave ImageSet changes unapplied, and version drift between what's in the ImageSet and what's running.

Unlike stateless workload monitoring, Calico component failures can silently degrade network policy enforcement across the entire cluster. A `calico-node` pod that fails to restart due to an ImagePullBackOff can leave nodes with stale policy tables for hours before anyone notices traffic anomalies.

This guide covers how to set up alerts in Prometheus/Alertmanager and implement custom monitoring for ImageSet-specific scenarios.

## Prerequisites

- Prometheus and Alertmanager installed in cluster
- kube-state-metrics installed for Kubernetes object metrics
- Calico with ImageSet configured
- Kubernetes Event Exporter or similar event monitoring
- Access to create PrometheusRule resources
- A ServiceAccount with permission to list pods in `calico-system` for the CronJob example

## Monitoring Architecture

```mermaid
flowchart LR
    A[calico-node DaemonSet] -->|metrics| B[Prometheus]
    C[Kubernetes Events] -->|events| D[Event Exporter]
    E[Tigera Operator] -->|status| F[Custom Metrics]
    B --> G[Alertmanager]
    D --> G
    F --> G
    G --> H[PagerDuty / Slack]
```

## Alert 1: Image Pull Failures

```yaml
# prometheus-rules-imageset.yaml

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-imageset-alerts
  namespace: monitoring
spec:
  groups:
    - name: calico.imageset
      rules:
        - alert: CalicoImagePullFailure
          expr: |
            kube_pod_container_status_waiting_reason{
              namespace="calico-system",
              reason=~"ImagePullBackOff|ErrImagePull|InvalidImageName"
            } > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Calico component failing to pull image"
            description: "Pod {{ $labels.pod }} in calico-system cannot pull image. Check ImageSet and registry connectivity."
```

## Alert 2: Calico Node DaemonSet Not Fully Available

```yaml
        - alert: CalicoNodeDaemonSetDegraded
          expr: |
            (kube_daemonset_status_number_available{
              namespace="calico-system",
              daemonset="calico-node"
            } / kube_daemonset_status_desired_number_scheduled{
              namespace="calico-system",
              daemonset="calico-node"
            }) < 0.9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "calico-node DaemonSet below 90% availability"
            description: "{{ $value | humanizePercentage }} of calico-node pods are available. Possible ImageSet or upgrade issue."
```

## Alert 3: Registry Bypass Detection

```bash
#!/bin/bash
# check-registry-bypass.sh - Run as a CronJob
EXPECTED_REGISTRY="${EXPECTED_REGISTRY:-registry.internal.example.com/calico}"
NAMESPACE="calico-system"

VIOLATIONS=$(kubectl get pods -n "${NAMESPACE}" \
  -o go-template='{{range .items}}{{ $pod := .metadata.name }}{{range .spec.initContainers}}{{printf "%s\t%s\n" $pod .image}}{{end}}{{range .spec.containers}}{{printf "%s\t%s\n" $pod .image}}{{end}}{{end}}' | \
  grep -v "^$" | \
  awk -v reg="${EXPECTED_REGISTRY}" 'index($2, reg "/") != 1 && index($2, reg "@") != 1 {print $0}')

if [[ -n "${VIOLATIONS}" ]]; then
  echo "REGISTRY BYPASS DETECTED:"
  echo "${VIOLATIONS}"
  # Send alert to monitoring system
  curl -X POST "${ALERTMANAGER_URL}/api/v2/alerts" \
    -H "Content-Type: application/json" \
    -d "[{\"labels\":{\"alertname\":\"CalicoRegistryBypass\",\"severity\":\"critical\"}}]"
fi
```

Deploy as a CronJob:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-registry-monitor-scripts
  namespace: calico-system
data:
  check-registry-bypass.sh: |
    #!/bin/bash
    EXPECTED_REGISTRY="${EXPECTED_REGISTRY:-registry.internal.example.com/calico}"
    NAMESPACE="calico-system"

    VIOLATIONS=$(kubectl get pods -n "${NAMESPACE}" \
      -o go-template='{{range .items}}{{ $pod := .metadata.name }}{{range .spec.initContainers}}{{printf "%s\t%s\n" $pod .image}}{{end}}{{range .spec.containers}}{{printf "%s\t%s\n" $pod .image}}{{end}}{{end}}' | \
      grep -v "^$" | \
      awk -v reg="${EXPECTED_REGISTRY}" 'index($2, reg "/") != 1 && index($2, reg "@") != 1 {print $0}')

    if [[ -n "${VIOLATIONS}" ]]; then
      echo "REGISTRY BYPASS DETECTED:"
      echo "${VIOLATIONS}"
      curl -X POST "${ALERTMANAGER_URL}/api/v2/alerts" \
        -H "Content-Type: application/json" \
        -d "[{\"labels\":{\"alertname\":\"CalicoRegistryBypass\",\"severity\":\"critical\"}}]"
    fi
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-registry-monitor
  namespace: calico-system
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-monitor-sa
          containers:
            - name: monitor
              image: registry.internal.example.com/tools/kubectl:latest
              command: ["/bin/bash", "/scripts/check-registry-bypass.sh"]
              env:
                - name: EXPECTED_REGISTRY
                  value: "registry.internal.example.com/calico"
                - name: ALERTMANAGER_URL
                  value: "http://alertmanager-operated.monitoring.svc:9093"
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
                  readOnly: true
          volumes:
            - name: scripts
              configMap:
                name: calico-registry-monitor-scripts
                defaultMode: 0755
          restartPolicy: OnFailure
```

## Alert 4: TigeraStatus Degraded

The Tigera operator records component health in `TigeraStatus` resources. Export the `status.conditions` fields with kube-state-metrics custom resource state metrics or an equivalent custom exporter before using this rule.

```yaml
        - alert: TigeraStatusDegraded
          expr: |
            tigera_status_condition{condition="Degraded",status="true"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Calico component {{ $labels.name }} is degraded"
            description: "TigeraStatus shows {{ $labels.name }} is degraded. ImageSet or operator issue."
```

## Grafana Dashboard

```bash
# Import the Calico ImageSet monitoring dashboard
# Key panels to include:
# 1. Pod readiness ratio by component (calico-node, typha, kube-controllers)
# 2. Image pull error rate over time
# 3. Registry pull source (from pod annotations)
# 4. Currently applied ImageSet from Installation status

# Check the ImageSet that the operator has successfully applied
kubectl get installation default -o jsonpath='{.status.imageSet}{"\n"}'
```

## Conclusion

Monitoring Calico ImageSet management requires alerting on both immediate failures (ImagePullBackOff) and subtle drift (registry bypass, reconciliation delays). By combining Prometheus rules for DaemonSet availability, custom scripts for registry validation, and TigeraStatus monitoring, you can detect ImageSet-related issues before they affect cluster networking. Run the registry bypass check frequently - it is your safety net against accidental or intentional image substitution.
