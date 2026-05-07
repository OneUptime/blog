# How to Troubleshoot Monitoring Issues in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, Grafana, Alertmanager

Description: A troubleshooting guide for common monitoring issues in Rancher including Prometheus, Grafana, and Alertmanager problems.

When monitoring is not working correctly in Rancher, it can leave your team blind to critical issues in your cluster. This guide covers systematic troubleshooting approaches for the most common monitoring problems, from installation failures to missing metrics and broken alerts.

## Prerequisites

- Rancher v2.6 or later.
- kubectl access to the affected cluster.
- Cluster admin permissions.

## Step 1: Check Monitoring Pod Status

Start by verifying all monitoring components are running:

```bash
kubectl get pods -n cattle-monitoring-system
```

All pods should be in `Running` state with all containers ready. Common problem indicators:

- **CrashLoopBackOff**: Container is starting and crashing repeatedly.
- **Pending**: Pod cannot be scheduled (resource constraints or node affinity issues).
- **ImagePullBackOff**: Container image cannot be pulled.
- **Init:Error**: Init container failed.

For pods not in Running state, check the events:

```bash
kubectl describe pod <pod-name> -n cattle-monitoring-system
```

## Step 2: Troubleshoot Installation Failures

If the monitoring chart fails to install:

```bash
# Check Helm release status

helm status rancher-monitoring -n cattle-monitoring-system

# Check Helm release history
helm history rancher-monitoring -n cattle-monitoring-system

# View installation logs
kubectl logs -n cattle-monitoring-system -l app=rancher-monitoring-operator
```

Common installation issues:

**Insufficient resources**: Monitoring requires significant CPU and memory. Check available resources:

```bash
kubectl describe nodes | grep -A 5 "Allocated resources"
```

**CRD conflicts**: If you previously installed Prometheus Operator or another monitoring stack, CRDs may conflict:

```bash
kubectl get crds | grep monitoring.coreos.com
```

Remove stale CRDs before reinstalling if necessary.

**StorageClass issues**: If persistent storage is configured but no default StorageClass exists:

```bash
kubectl get storageclass
kubectl get pvc -n cattle-monitoring-system
```

## Step 3: Troubleshoot Prometheus Issues

### Prometheus Not Starting

Check Prometheus pod logs:

```bash
kubectl logs -n cattle-monitoring-system prometheus-rancher-monitoring-prometheus-0 -c prometheus
```

Common errors:
- **Out of memory**: Increase Prometheus memory limits.
- **WAL corruption**: Delete the WAL directory and restart.
- **Configuration errors**: Check the Prometheus Operator logs.

### Targets Not Being Scraped

Open the Prometheus UI and check **Status > Targets**:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
```

If targets show errors:
- **Connection refused**: The target pod is not running or the port is wrong.
- **403 Forbidden**: RBAC issue. Check ServiceAccount permissions.
- **Certificate errors**: TLS configuration mismatch.

Check ServiceMonitor and PodMonitor resources:

```bash
kubectl get servicemonitors --all-namespaces
kubectl get podmonitors --all-namespaces
```

Verify the labels match what Prometheus expects:

```bash
# Check Prometheus serviceMonitorSelector and podMonitorSelector
kubectl get prometheus rancher-monitoring-prometheus -n cattle-monitoring-system -o yaml | grep -A 20 -E "serviceMonitorSelector|podMonitorSelector|serviceMonitorNamespaceSelector|podMonitorNamespaceSelector"
```

### Missing Metrics

If specific metrics are missing:

1. Verify the metric exists at the source by curling the metrics endpoint directly.
2. Check if metric relabeling is dropping the metric.
3. Verify the scrape interval and timeout are appropriate.

```bash
# Check if metric exists in Prometheus
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
# Query: {__name__=~"your_metric.*"}
```

### Prometheus Storage Issues

If Prometheus is running out of disk space:

```bash
# Check PVC usage
kubectl exec -n cattle-monitoring-system prometheus-rancher-monitoring-prometheus-0 -c prometheus -- df -h /prometheus

# Check current retention settings
kubectl get prometheus rancher-monitoring-prometheus -n cattle-monitoring-system -o jsonpath='{.spec.retention}'
```

Reduce retention or increase storage:

```yaml
prometheus:
  prometheusSpec:
    retention: 7d
    retentionSize: "40GB"
```

## Step 4: Troubleshoot Grafana Issues

### Grafana Not Loading

Check Grafana pod logs:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=grafana -c grafana
```

### Dashboards Missing

Check the dashboard sidecar:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=grafana -c grafana-sc-dashboard
```

Verify ConfigMaps with the dashboard label exist:

```bash
kubectl get configmaps -n cattle-monitoring-system -l grafana_dashboard=1
```

### Data Source Connection Errors

If Grafana shows "No data" or data source errors:

1. In Grafana, go to **Configuration > Data Sources**.
2. Click on the Prometheus data source.
3. Click **Save & test** to verify connectivity.

Check the data source URL resolves correctly:

```bash
kubectl exec -n cattle-monitoring-system deployment/rancher-monitoring-grafana -c grafana -- \
  curl -s 'http://rancher-monitoring-prometheus.cattle-monitoring-system.svc:9090/api/v1/query?query=up'
```

### Grafana Authentication Issues

If you cannot log in to Grafana:

```bash
# Check Grafana admin credentials
kubectl get secret -n cattle-monitoring-system rancher-monitoring-grafana -o jsonpath='{.data.admin-user}' | base64 -d
kubectl get secret -n cattle-monitoring-system rancher-monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 -d
```

## Step 5: Troubleshoot Alertmanager Issues

### Alerts Not Firing

Check alert rules in Prometheus:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-prometheus 9090:9090
```

Navigate to **Status > Rules** and verify:
- Rules are loaded without errors.
- Alert state is correct (inactive/pending/firing).
- The PromQL expression returns expected results.

### Notifications Not Sending

Check Alertmanager logs:

```bash
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=alertmanager -c alertmanager
```

Common notification failures:
- **SMTP errors**: Wrong credentials, blocked port, or TLS issues.
- **Webhook timeouts**: Target endpoint is unreachable.
- **Slack 404**: Webhook URL is invalid or revoked.

Verify the Alertmanager configuration is correct:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093
```

Open `http://localhost:9093/#/status` to view the active configuration.

### Silences Blocking Alerts

Check for active silences that may be blocking alerts:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093
```

Open `http://localhost:9093/#/silences` and review active silences.

## Step 6: Troubleshoot Node Exporter Issues

If node-level metrics are missing:

```bash
# Check node-exporter pods
kubectl get pods -n cattle-monitoring-system -l app.kubernetes.io/name=prometheus-node-exporter

# Check node-exporter logs
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=prometheus-node-exporter -c node-exporter
```

Node exporter runs as a DaemonSet, so there should be one pod per node:

```bash
kubectl get ds -n cattle-monitoring-system -l app.kubernetes.io/name=prometheus-node-exporter
```

## Step 7: Troubleshoot kube-state-metrics Issues

If Kubernetes state metrics are missing:

```bash
kubectl get pods -n cattle-monitoring-system -l app.kubernetes.io/name=kube-state-metrics
kubectl logs -n cattle-monitoring-system -l app.kubernetes.io/name=kube-state-metrics -c kube-state-metrics
```

Common issues:
- **RBAC errors**: kube-state-metrics needs cluster-wide read access.
- **Memory issues**: Large clusters may need increased memory limits for kube-state-metrics.

## Step 8: Restart Monitoring Components

If troubleshooting does not resolve the issue, restart components:

```bash
# Restart Prometheus
kubectl rollout restart statefulset/prometheus-rancher-monitoring-prometheus -n cattle-monitoring-system

# Restart Grafana
kubectl rollout restart deployment/rancher-monitoring-grafana -n cattle-monitoring-system

# Restart Alertmanager
kubectl rollout restart statefulset/alertmanager-rancher-monitoring-alertmanager -n cattle-monitoring-system

# Restart the operator
kubectl rollout restart deployment/rancher-monitoring-operator -n cattle-monitoring-system
```

## Step 9: Collect Diagnostic Information

When escalating an issue, collect this information:

```bash
# Monitoring pod status
kubectl get pods -n cattle-monitoring-system -o wide

# Events in the monitoring namespace
kubectl get events -n cattle-monitoring-system --sort-by='.metadata.creationTimestamp'

# Prometheus configuration
kubectl get prometheus rancher-monitoring-prometheus -n cattle-monitoring-system -o yaml

# Alertmanager configuration
kubectl get alertmanager rancher-monitoring-alertmanager -n cattle-monitoring-system -o yaml

# Helm release values
helm get values rancher-monitoring -n cattle-monitoring-system

# Resource usage
kubectl top pods -n cattle-monitoring-system
```

## Summary

Troubleshooting monitoring in Rancher follows a systematic approach: check pod status, examine logs, verify configurations, and test connectivity. Most issues stem from resource constraints, label mismatches, network connectivity, or configuration errors. Use the Prometheus and Alertmanager UIs to verify targets, rules, and routing. When all else fails, restart the affected components and check the Prometheus Operator logs for detailed error messages.
