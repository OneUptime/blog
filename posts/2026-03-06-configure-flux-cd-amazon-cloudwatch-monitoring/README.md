# How to Configure Flux CD with Amazon CloudWatch for Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Amazon CloudWatch, Container Insights, Monitoring, Metric, Kubernetes, AWS, Observability

Description: Set up Amazon CloudWatch monitoring for Flux CD controllers including Container Insights, custom metrics, and alerting dashboards.

---

## Introduction

Monitoring Flux CD controllers is essential for ensuring your GitOps pipeline is healthy and reconciliations are happening on schedule. Amazon CloudWatch, combined with Container Insights, provides a native AWS solution for collecting metrics, logs, and traces from your EKS cluster and Flux CD components.

This guide covers deploying the CloudWatch agent via Flux CD, exporting Flux metrics to CloudWatch, and building dashboards for GitOps observability.

## Prerequisites

Before starting, ensure you have:

- An Amazon EKS cluster running Kubernetes 1.25 or later
- Flux CD installed and bootstrapped
- AWS CLI configured with appropriate permissions
- The EKS Pod Identity Agent installed on your cluster
- kubectl access to the cluster

## Step 1: Create IAM Role for CloudWatch Agent

The CloudWatch agent needs permissions to push metrics and logs.

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create trust policy

cat > cw-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name EKSCloudWatchAgentRole \
  --assume-role-policy-document file://cw-trust-policy.json

# Attach the CloudWatch agent policy
aws iam attach-role-policy \
  --role-name EKSCloudWatchAgentRole \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

# Associate the role with the CloudWatch agent service account
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace amazon-cloudwatch \
  --service-account cloudwatch-agent \
  --role-arn arn:aws:iam::${ACCOUNT_ID}:role/EKSCloudWatchAgentRole
```

## Step 2: Deploy the CloudWatch Agent via Flux

Create a HelmRelease to deploy the Amazon CloudWatch Observability Helm chart.

```yaml
# infrastructure/monitoring/cloudwatch-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: amazon-cloudwatch
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# infrastructure/monitoring/cloudwatch-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aws-observability
  namespace: flux-system
spec:
  interval: 1h
  url: https://aws-observability.github.io/helm-charts
```

```yaml
# infrastructure/monitoring/cloudwatch-agent.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: amazon-cloudwatch-observability
  namespace: amazon-cloudwatch
spec:
  interval: 15m
  chart:
    spec:
      chart: amazon-cloudwatch-observability
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: aws-observability
        namespace: flux-system
  values:
    # Cluster name for CloudWatch metrics
    clusterName: my-cluster
    region: us-east-1
    # Enable Fluent Bit container log collection
    containerLogs:
      enabled: true
    # CloudWatch agent configuration
    agent:
      serviceAccount:
        name: cloudwatch-agent
      # Keep enhanced Container Insights enabled and add Flux Prometheus metrics
      config:
        logs:
          metrics_collected:
            kubernetes:
              enhanced_container_insights: true
            application_signals: {}
            prometheus:
              cluster_name: my-cluster
              log_group_name: /aws/containerinsights/my-cluster/prometheus
              prometheus_config_path: env:PROMETHEUS_CONFIG_CONTENT
              emf_processor:
                metric_declaration:
                  - source_labels: ["job"]
                    label_matcher: "^flux-.*"
                    dimensions:
                      - ["ClusterName"]
                      - ["ClusterName", "job"]
                      - ["ClusterName", "job", "kind", "name", "namespace"]
                    metric_selectors:
                      - "^gotk_reconcile_duration_seconds.*"
                      - "^gotk_reconcile_condition.*"
                      - "^gotk_suspend_status$"
                      - "^controller_runtime_reconcile_total$"
                      - "^controller_runtime_reconcile_errors_total$"
        traces:
          traces_collected:
            application_signals: {}
      prometheus:
        config:
          global:
            scrape_interval: 1m
            scrape_timeout: 10s
          scrape_configs:
            - job_name: flux-source-controller
              metrics_path: /metrics
              static_configs:
                - targets:
                    - source-controller.flux-system.svc.cluster.local:8080
            - job_name: flux-kustomize-controller
              metrics_path: /metrics
              static_configs:
                - targets:
                    - kustomize-controller.flux-system.svc.cluster.local:8080
            - job_name: flux-helm-controller
              metrics_path: /metrics
              static_configs:
                - targets:
                    - helm-controller.flux-system.svc.cluster.local:8080
            - job_name: flux-notification-controller
              metrics_path: /metrics
              static_configs:
                - targets:
                    - notification-controller.flux-system.svc.cluster.local:8080
      resources:
        requests:
          cpu: 200m
          memory: 200Mi
        limits:
          cpu: 400m
          memory: 400Mi
```

## Step 3: Configure Prometheus Scraping for Flux Metrics

Flux CD exposes Prometheus metrics by default. The CloudWatch agent uses the Prometheus scrape configuration in the HelmRelease to scrape Flux controller metrics directly.

```yaml
agent:
  prometheus:
    config:
      global:
        scrape_interval: 1m
        scrape_timeout: 10s
      scrape_configs:
        - job_name: flux-source-controller
          metrics_path: /metrics
          static_configs:
            - targets:
                - source-controller.flux-system.svc.cluster.local:8080
        - job_name: flux-kustomize-controller
          metrics_path: /metrics
          static_configs:
            - targets:
                - kustomize-controller.flux-system.svc.cluster.local:8080
        - job_name: flux-helm-controller
          metrics_path: /metrics
          static_configs:
            - targets:
                - helm-controller.flux-system.svc.cluster.local:8080
        - job_name: flux-notification-controller
          metrics_path: /metrics
          static_configs:
            - targets:
                - notification-controller.flux-system.svc.cluster.local:8080
```

## Step 4: Configure CloudWatch Agent for Prometheus Metrics

Configure the CloudWatch agent to convert the scraped Flux metrics into CloudWatch embedded metric format events.

```yaml
agent:
  config:
    logs:
      metrics_collected:
        prometheus:
          cluster_name: my-cluster
          log_group_name: /aws/containerinsights/my-cluster/prometheus
          prometheus_config_path: env:PROMETHEUS_CONFIG_CONTENT
          emf_processor:
            metric_declaration:
              - source_labels: ["job"]
                label_matcher: "^flux-.*"
                dimensions:
                  - ["ClusterName"]
                  - ["ClusterName", "job"]
                  - ["ClusterName", "job", "kind", "name", "namespace"]
                metric_selectors:
                  - "^gotk_reconcile_duration_seconds.*"
                  - "^gotk_reconcile_condition.*"
                  - "^gotk_suspend_status$"
                  - "^controller_runtime_reconcile_total$"
                  - "^controller_runtime_reconcile_errors_total$"
```

## Step 5: Create CloudWatch Dashboard for Flux CD

Create a CloudWatch dashboard to visualize Flux metrics.

```bash
# Create the CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "FluxCD-GitOps-Dashboard" \
  --dashboard-body file://flux-dashboard.json
```

```json
{
  "widgets": [
    {
      "type": "metric",
      "x": 0,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Flux Reconciliation Duration",
        "metrics": [
          ["ContainerInsights/Prometheus", "gotk_reconcile_duration_seconds_bucket", "ClusterName", "my-cluster", "job", "flux-kustomize-controller"],
          ["...", "job", "flux-helm-controller"],
          ["...", "job", "flux-source-controller"]
        ],
        "region": "us-east-1",
        "period": 300,
        "stat": "Average",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 0,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Flux Reconciliation Errors",
        "metrics": [
          ["ContainerInsights/Prometheus", "controller_runtime_reconcile_errors_total", "ClusterName", "my-cluster", "job", "flux-kustomize-controller"],
          ["...", "job", "flux-helm-controller"],
          ["...", "job", "flux-source-controller"]
        ],
        "region": "us-east-1",
        "period": 300,
        "stat": "Sum",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 0,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Flux Controller CPU Usage",
        "metrics": [
          ["ContainerInsights", "pod_cpu_utilization", "ClusterName", "my-cluster", "Namespace", "flux-system", "Service", "source-controller"],
          ["...", "Service", "kustomize-controller"],
          ["...", "Service", "helm-controller"],
          ["...", "Service", "notification-controller"]
        ],
        "region": "us-east-1",
        "period": 300,
        "stat": "Average",
        "view": "timeSeries"
      }
    },
    {
      "type": "metric",
      "x": 12,
      "y": 6,
      "width": 12,
      "height": 6,
      "properties": {
        "title": "Flux Controller Memory Usage",
        "metrics": [
          ["ContainerInsights", "pod_memory_utilization", "ClusterName", "my-cluster", "Namespace", "flux-system", "Service", "source-controller"],
          ["...", "Service", "kustomize-controller"],
          ["...", "Service", "helm-controller"],
          ["...", "Service", "notification-controller"]
        ],
        "region": "us-east-1",
        "period": 300,
        "stat": "Average",
        "view": "timeSeries"
      }
    }
  ]
}
```

## Step 6: Create CloudWatch Alarms for Flux

Set up alarms to detect Flux reconciliation failures.

```yaml
# infrastructure/monitoring/flux-alarms.yaml
# Deploy alarms via CloudFormation through Flux
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-cloudwatch-alarms
  namespace: amazon-cloudwatch
data:
  create-alarms.sh: |
    #!/bin/bash
    # Alarm for high reconciliation error rate
    aws cloudwatch put-metric-alarm \
      --alarm-name "FluxCD-ReconciliationErrors" \
      --alarm-description "Flux CD reconciliation errors exceeded threshold" \
      --metric-name "controller_runtime_reconcile_errors_total" \
      --namespace "ContainerInsights/Prometheus" \
      --statistic Sum \
      --period 300 \
      --threshold 5 \
      --comparison-operator GreaterThanThreshold \
      --evaluation-periods 2 \
      --alarm-actions arn:aws:sns:us-east-1:123456789012:flux-alerts \
      --dimensions Name=ClusterName,Value=my-cluster

    # Alarm for suspended resources
    aws cloudwatch put-metric-alarm \
      --alarm-name "FluxCD-SuspendedResources" \
      --alarm-description "Flux CD resources are suspended" \
      --metric-name "gotk_suspend_status" \
      --namespace "ContainerInsights/Prometheus" \
      --statistic Maximum \
      --period 300 \
      --threshold 0 \
      --comparison-operator GreaterThanThreshold \
      --evaluation-periods 1 \
      --alarm-actions arn:aws:sns:us-east-1:123456789012:flux-alerts \
      --dimensions Name=ClusterName,Value=my-cluster
```

## Step 7: Configure Log Insights Queries

Create saved queries in CloudWatch Logs Insights for Flux troubleshooting.

```bash
# Query: Find all reconciliation failures in the last hour
# Use in CloudWatch Logs Insights with log group: /aws/containerinsights/my-cluster/application
```

```text
# CloudWatch Logs Insights query for Flux errors
fields @timestamp, @message, kubernetes.pod_name
| filter kubernetes.namespace_name = "flux-system"
| filter @message like /error|fail|Error|Fail/
| sort @timestamp desc
| limit 50
```

```text
# CloudWatch Logs Insights query for reconciliation events
fields @timestamp, @message, kubernetes.pod_name
| filter kubernetes.namespace_name = "flux-system"
| filter @message like /Reconciliation finished/
| stats count() as reconcile_count by kubernetes.pod_name, bin(1h)
```

## Step 8: Set Up SNS Notifications

Create an SNS topic for CloudWatch alarm notifications.

```bash
# Create SNS topic for Flux alerts
aws sns create-topic --name flux-alerts

# Subscribe an email endpoint
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:flux-alerts \
  --protocol email \
  --notification-endpoint ops-team@example.com
```

## Step 9: Deploy the Monitoring Stack via Flux Kustomization

```yaml
# infrastructure/monitoring/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - cloudwatch-namespace.yaml
  - cloudwatch-repo.yaml
  - cloudwatch-agent.yaml
```

```yaml
# clusters/my-cluster/monitoring.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/monitoring
  prune: true
  wait: true
  timeout: 10m
```

## Step 10: Verify Monitoring Setup

```bash
# Check CloudWatch agent is running
kubectl get pods -n amazon-cloudwatch

# Verify Flux metrics are being scraped
kubectl port-forward -n flux-system svc/source-controller 8080:8080
# Visit http://localhost:8080/metrics in a browser

# Check Container Insights data in CloudWatch
aws cloudwatch list-metrics \
  --namespace ContainerInsights \
  --dimensions Name=ClusterName,Value=my-cluster \
  --query 'Metrics[*].MetricName' \
  --output table

# Verify log groups were created
aws logs describe-log-groups \
  --log-group-name-prefix /aws/containerinsights/my-cluster

# Check dashboard exists
aws cloudwatch list-dashboards \
  --dashboard-name-prefix FluxCD
```

## Troubleshooting

```bash
# Issue: No metrics appearing in CloudWatch
# Check CloudWatch agent logs
kubectl logs -n amazon-cloudwatch daemonset/cloudwatch-agent --tail=50

# Issue: Flux metrics not being scraped
# Verify the metrics endpoints are accessible
kubectl get svc -n flux-system

# Issue: Container Insights not showing data
# Verify the EKS Pod Identity association exists
aws eks list-pod-identity-associations \
  --cluster-name my-cluster \
  --namespace amazon-cloudwatch \
  --service-account cloudwatch-agent

# Issue: High CloudWatch costs
# Review metric filters and reduce cardinality
aws cloudwatch list-metrics --namespace ContainerInsights --dimensions Name=ClusterName,Value=my-cluster | wc -l
```

## Conclusion

Amazon CloudWatch provides a comprehensive monitoring solution for Flux CD on EKS. By combining Container Insights for infrastructure metrics, Prometheus scraping for Flux-specific metrics, and CloudWatch Logs Insights for log analysis, you get full observability into your GitOps pipeline. The CloudWatch alarms ensure you are notified promptly when reconciliation issues arise, and the dashboards give you an at-a-glance view of your Flux CD health.
