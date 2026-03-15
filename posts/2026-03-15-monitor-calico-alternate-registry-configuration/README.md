# How to Monitor Calico Alternate Registry Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Monitoring, Container Registry, Kubernetes, Observability, DevOps

Description: Set up monitoring and alerting for Calico alternate registry configurations to detect image pull failures and configuration drift.

---

## Introduction

When running Calico with an alternate container registry, ongoing monitoring is essential to ensure that image pulls continue to succeed and that the registry configuration remains correct. Registry credentials can expire, certificates can rotate, and network connectivity to internal registries can fail silently.

Without proper monitoring, a registry misconfiguration may only surface during a node scaling event or pod restart, potentially causing an outage at the worst possible time. Proactive monitoring of image pull status, credential validity, and configuration consistency helps prevent these scenarios.

This guide covers how to set up monitoring and alerting for Calico alternate registry configurations using Kubernetes-native tools, Prometheus metrics, and custom health checks.

## Prerequisites

- Kubernetes cluster with Calico installed using an alternate registry
- `kubectl` with cluster-admin access
- Prometheus and Alertmanager (optional but recommended)
- Familiarity with Kubernetes events and pod status

## Monitoring Image Pull Status

### Watching for Image Pull Failures

Create a script that checks for image pull errors in the Calico namespace:

```bash
#!/bin/bash
# check-calico-image-pulls.sh

NAMESPACE="calico-system"

# Check for ImagePullBackOff or ErrImagePull
FAILING_PODS=$(kubectl get pods -n "$NAMESPACE" \
  --field-selector=status.phase!=Running \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[*].state.waiting.reason}{"\n"}{end}' \
  | grep -E "ImagePullBackOff|ErrImagePull")

if [ -n "$FAILING_PODS" ]; then
  echo "ALERT: Calico image pull failures detected:"
  echo "$FAILING_PODS"
  exit 1
fi

echo "OK: All Calico pods have pulled images successfully"
exit 0
```

### Kubernetes Event Monitoring

Query events for registry-related issues:

```bash
kubectl get events -n calico-system \
  --field-selector reason=Failed \
  --sort-by='.lastTimestamp' \
  | grep -i -E "pull|registry|auth"
```

## Prometheus Alerting Rules

### Alert on Image Pull Failures

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-registry-alerts
  namespace: monitoring
spec:
  groups:
    - name: calico-registry
      rules:
        - alert: CalicoImagePullFailure
          expr: |
            kube_pod_container_status_waiting_reason{
              namespace="calico-system",
              reason=~"ImagePullBackOff|ErrImagePull"
            } > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Calico pod failing to pull image"
            description: "Pod {{ $labels.pod }} in calico-system has been unable to pull its image for more than 5 minutes."
        - alert: CalicoPodsNotReady
          expr: |
            kube_pod_status_ready{
              namespace="calico-system",
              condition="true"
            } == 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Calico pod not ready"
            description: "Pod {{ $labels.pod }} in calico-system has been not ready for more than 10 minutes."
```

## Configuration Drift Detection

### Monitoring the Installation Resource

Create a CronJob that checks the Installation resource for unexpected changes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-config-check
  namespace: calico-system
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calico-config-monitor
          containers:
            - name: checker
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  REGISTRY=$(kubectl get installation default -o jsonpath='{.spec.registry}')
                  EXPECTED="registry.internal.example.com"
                  if [ "$REGISTRY" != "$EXPECTED" ]; then
                    echo "DRIFT DETECTED: registry is $REGISTRY, expected $EXPECTED"
                    exit 1
                  fi
                  echo "OK: registry configuration matches expected value"
          restartPolicy: OnFailure
```

## Credential Expiry Monitoring

Check the age of image pull secrets to detect credentials nearing expiry:

```bash
#!/bin/bash
# check-secret-age.sh

SECRET_NAME="calico-registry-secret"
NAMESPACE="calico-system"
MAX_AGE_DAYS=90

CREATED=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" \
  -o jsonpath='{.metadata.creationTimestamp}')
CREATED_EPOCH=$(date -d "$CREATED" +%s 2>/dev/null || date -jf "%Y-%m-%dT%H:%M:%SZ" "$CREATED" +%s)
NOW_EPOCH=$(date +%s)
AGE_DAYS=$(( (NOW_EPOCH - CREATED_EPOCH) / 86400 ))

if [ "$AGE_DAYS" -gt "$MAX_AGE_DAYS" ]; then
  echo "WARNING: Secret $SECRET_NAME is $AGE_DAYS days old (threshold: $MAX_AGE_DAYS)"
  exit 1
fi

echo "OK: Secret $SECRET_NAME is $AGE_DAYS days old"
```

## Verification

Confirm your monitoring setup is working:

```bash
# Verify PrometheusRule is loaded
kubectl get prometheusrule calico-registry-alerts -n monitoring

# Check CronJob schedule
kubectl get cronjob calico-config-check -n calico-system

# Verify Calico status
kubectl get tigerastatus
```

## Troubleshooting

- **Alerts not firing**: Verify that Prometheus is scraping kube-state-metrics and that the PrometheusRule is in a namespace monitored by Prometheus.
- **CronJob failures**: Check the Job logs with `kubectl logs -n calico-system job/<job-name>`. Ensure the service account has permissions to read Installation resources.
- **False positives on pod readiness**: Some brief not-ready states during rolling updates are normal. Adjust the `for` duration in alert rules to avoid noise.
- **Event monitoring gaps**: Kubernetes events have a default TTL of one hour. For longer retention, use an event exporter to send events to a logging system.

## Conclusion

Monitoring your Calico alternate registry configuration proactively prevents silent failures that can cascade into cluster-wide networking issues. By combining Kubernetes event monitoring, Prometheus alerts for image pull failures, configuration drift detection, and credential expiry checks, you can maintain high confidence that your Calico deployment will continue to function correctly even as infrastructure changes around it.
