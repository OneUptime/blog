# How to Set Up Custom Prometheus Alerts for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Prometheus, Alerting, Alertmanager, Kubernetes, Monitoring

Description: A practical guide to creating custom Prometheus alerting rules and configuring Alertmanager for Talos Linux Kubernetes clusters.

---

When you are running Kubernetes on Talos Linux, you need alerts that tell you about problems before your users notice them. Prometheus is the standard tool for metrics collection in Kubernetes, and its companion Alertmanager handles routing notifications to the right people at the right time. In this post, we will go through setting up custom alerting rules specific to Talos Linux clusters and configuring Alertmanager to deliver those alerts via Slack, email, and PagerDuty.

## Why Custom Alerts for Talos Linux

The kube-prometheus-stack ships with a solid set of default alerting rules covering common Kubernetes failure modes. However, Talos Linux has unique characteristics that need their own alerting logic. Since Talos is immutable and has no SSH access, certain failure modes manifest differently. You also want alerts tailored to your specific workloads and SLOs rather than relying solely on generic rules.

## Prerequisites

Before you start, make sure you have:

- A running Talos Linux cluster with Prometheus and Alertmanager deployed (via kube-prometheus-stack or similar)
- `kubectl` configured to access your cluster
- Helm 3 installed if you want to manage configuration through Helm values

## Understanding PrometheusRule Resources

In the kube-prometheus-stack, alerting rules are defined as Kubernetes custom resources of kind `PrometheusRule`. Prometheus Operator watches for these resources and automatically loads them into Prometheus.

Here is the basic structure:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: talos-custom-alerts
  namespace: monitoring
  labels:
    # This label must match what Prometheus Operator is watching
    release: prometheus-stack
spec:
  groups:
    - name: talos-node-alerts
      rules:
        - alert: AlertName
          expr: <PromQL expression>
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Short description"
            description: "Detailed description with {{ $labels.instance }}"
```

## Step 1: Create Node-Level Alerts

These alerts monitor the health of your Talos Linux nodes. Since you cannot SSH in to investigate, early detection is critical.

```yaml
# talos-node-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: talos-node-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: talos-node-health
      rules:
        # Alert when a node is not ready for more than 5 minutes
        - alert: TalosNodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Talos node {{ $labels.node }} is not ready"
            description: "Node {{ $labels.node }} has been in NotReady state for more than 5 minutes. Since Talos has no SSH, check talosctl for diagnostics."

        # Alert when node CPU usage is consistently high
        - alert: TalosNodeHighCPU
          expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[10m])) * 100) > 85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage on {{ $labels.instance }}"
            description: "CPU usage on {{ $labels.instance }} has been above 85% for 15 minutes. Current value: {{ $value }}%"

        # Alert when memory usage is high
        - alert: TalosNodeHighMemory
          expr: (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 90
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "High memory usage on {{ $labels.instance }}"
            description: "Memory usage on {{ $labels.instance }} is {{ $value }}%. This may lead to OOM kills."

        # Alert when disk space is running low
        - alert: TalosNodeDiskPressure
          expr: (1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 > 80
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Disk space running low on {{ $labels.instance }}"
            description: "Root filesystem on {{ $labels.instance }} is {{ $value }}% full."

        # Alert when node is unreachable
        - alert: TalosNodeUnreachable
          expr: up{job="node-exporter"} == 0
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "Talos node exporter down on {{ $labels.instance }}"
            description: "Node exporter on {{ $labels.instance }} is unreachable. The node may be down or network connectivity is broken."
```

Apply the rules:

```bash
kubectl apply -f talos-node-alerts.yaml
```

## Step 2: Create Kubernetes Workload Alerts

These alerts cover common workload issues that affect applications running on your Talos cluster:

```yaml
# talos-workload-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: talos-workload-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: talos-workload-health
      rules:
        # Alert when pods are crash-looping
        - alert: PodCrashLooping
          expr: increase(kube_pod_container_status_restarts_total[1h]) > 5
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash-looping"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has restarted {{ $value }} times in the last hour."

        # Alert when deployments have unavailable replicas
        - alert: DeploymentReplicasMismatch
          expr: kube_deployment_status_replicas_available != kube_deployment_spec_replicas
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Deployment {{ $labels.namespace }}/{{ $labels.deployment }} replica mismatch"
            description: "Deployment {{ $labels.deployment }} has {{ $value }} available replicas but expects {{ $labels.replicas }}."

        # Alert when pods are stuck in pending state
        - alert: PodStuckPending
          expr: kube_pod_status_phase{phase="Pending"} == 1
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} stuck in Pending"
            description: "Pod {{ $labels.pod }} has been in Pending state for over 15 minutes. Check resource availability and scheduling constraints."

        # Alert on high container CPU throttling
        - alert: ContainerCPUThrottling
          expr: rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0.25
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Container {{ $labels.container }} in {{ $labels.namespace }}/{{ $labels.pod }} is being CPU throttled"
            description: "Container is experiencing significant CPU throttling. Consider increasing CPU limits."
```

## Step 3: Configure Alertmanager

Now that you have alerting rules, configure Alertmanager to route notifications appropriately.

```yaml
# alertmanager-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-prometheus-stack-kube-prometheus-alertmanager
  namespace: monitoring
stringData:
  alertmanager.yaml: |
    global:
      # Default SMTP settings for email alerts
      smtp_smarthost: 'smtp.example.com:587'
      smtp_from: 'alerts@example.com'
      smtp_auth_username: 'alerts@example.com'
      smtp_auth_password: 'your-smtp-password'
      smtp_require_tls: true
      # Slack webhook URL
      slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

    route:
      # Default receiver
      receiver: 'slack-notifications'
      # Group alerts by these labels
      group_by: ['alertname', 'namespace', 'severity']
      # Wait before sending the first notification for a new group
      group_wait: 30s
      # Wait before sending updates for an existing group
      group_interval: 5m
      # Wait before resending a notification
      repeat_interval: 4h

      routes:
        # Critical alerts go to PagerDuty and Slack
        - match:
            severity: critical
          receiver: 'pagerduty-critical'
          continue: true
        - match:
            severity: critical
          receiver: 'slack-critical'

    receivers:
      - name: 'slack-notifications'
        slack_configs:
          - channel: '#kubernetes-alerts'
            title: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
            text: '{{ range .Alerts }}*{{ .Annotations.summary }}*\n{{ .Annotations.description }}\n{{ end }}'
            send_resolved: true

      - name: 'slack-critical'
        slack_configs:
          - channel: '#critical-alerts'
            title: 'CRITICAL: {{ .CommonLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
            send_resolved: true

      - name: 'pagerduty-critical'
        pagerduty_configs:
          - service_key: 'your-pagerduty-service-key'
            severity: 'critical'
```

Apply the configuration:

```bash
kubectl apply -f alertmanager-config.yaml
```

## Step 4: Test Your Alerts

You can test alerts by creating conditions that trigger them. Here is a quick way to test the PodCrashLooping alert:

```bash
# Deploy a pod that will crash-loop
kubectl run crash-test --image=busybox --restart=Always -- /bin/sh -c "exit 1"

# Watch for the alert to fire (check after about 10 minutes)
kubectl port-forward -n monitoring svc/prometheus-stack-kube-prometheus-prometheus 9090:9090
# Visit http://localhost:9090/alerts

# Clean up
kubectl delete pod crash-test
```

## Step 5: Silence and Inhibit Alerts

Sometimes you need to silence alerts during maintenance windows. Alertmanager supports both silences and inhibition rules.

```yaml
# Add inhibition rules to your alertmanager config
inhibit_rules:
  # If a node is down, suppress all pod alerts on that node
  - source_match:
      alertname: TalosNodeNotReady
    target_match_re:
      alertname: Pod.*
    equal: ['node']
  # Warning alerts are suppressed if a critical alert exists for the same thing
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['alertname', 'instance']
```

To create a silence via the Alertmanager API:

```bash
# Create a 2-hour silence for a specific alert
amtool silence add --alertmanager.url=http://localhost:9093 \
  alertname="TalosNodeHighCPU" \
  --comment="Planned maintenance window" \
  --duration=2h
```

## Best Practices for Alerting on Talos Linux

1. **Set appropriate thresholds**: Do not alert on every minor fluctuation. Use `for` durations to avoid flapping alerts.
2. **Layer your alerts**: Use warning for early signals and critical only for things that need immediate action.
3. **Include runbook links**: Add annotation fields with links to runbooks so on-call engineers know what to do.
4. **Test regularly**: Fire test alerts periodically to make sure the notification pipeline is working end to end.
5. **Keep alert count manageable**: Too many alerts leads to alert fatigue, which is worse than no alerts at all.

## Conclusion

Custom Prometheus alerts are essential for running Talos Linux clusters in production. Since you cannot SSH into Talos nodes to poke around, your monitoring and alerting pipeline is your primary troubleshooting interface. Start with the node-level and workload-level alerts shown here, then iterate based on what you learn from incidents. Pair them with a well-configured Alertmanager that routes critical issues to PagerDuty and informational alerts to Slack, and you will have a solid foundation for reliable operations.
