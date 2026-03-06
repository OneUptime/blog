# How to Configure Flux CD with Amazon CloudWatch for Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, amazon cloudwatch, container insights, monitoring, metrics, kubernetes, aws, observability

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
- An OIDC provider associated with your EKS cluster
- kubectl access to the cluster

## Step 1: Create IAM Role for CloudWatch Agent

The CloudWatch agent needs permissions to push metrics and logs.

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

# Create trust policy
cat > cw-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:amazon-cloudwatch:cloudwatch-agent",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
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
```

## Step 2: Deploy the CloudWatch Agent via Flux

Create a HelmRelease to deploy the Amazon CloudWatch Observability add-on.

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
  name: aws-cloudwatch
  namespace: flux-system
spec:
  interval: 1h
  url: https://aws.github.io/eks-charts
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
      version: "1.5.x"
      sourceRef:
        kind: HelmRepository
        name: aws-cloudwatch
        namespace: flux-system
  values:
    # Cluster name for CloudWatch metrics
    clusterName: my-cluster
    region: us-east-1
    # Service account with IRSA
    serviceAccount:
      create: true
      name: cloudwatch-agent
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/EKSCloudWatchAgentRole
    # Enable Container Insights
    containerInsights:
      enabled: true
      # Enhanced observability with detailed metrics
      enhanced: true
    # CloudWatch agent configuration
    agent:
      resources:
        requests:
          cpu: 200m
          memory: 200Mi
        limits:
          cpu: 400m
          memory: 400Mi
    # Fluent Bit for log collection
    fluentBit:
      enabled: true
      resources:
        requests:
          cpu: 100m
          memory: 100Mi
        limits:
          cpu: 200m
          memory: 200Mi
```

## Step 3: Deploy Prometheus for Flux Metrics

Flux CD exposes Prometheus metrics by default. Deploy Prometheus to scrape and forward them.

```yaml
# infrastructure/monitoring/prometheus-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: prometheus-community
  namespace: flux-system
spec:
  interval: 1h
  url: https://prometheus-community.github.io/helm-charts
```

```yaml
# infrastructure/monitoring/prometheus.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: prometheus
  namespace: amazon-cloudwatch
spec:
  interval: 15m
  chart:
    spec:
      chart: prometheus
      version: "25.x"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    # Disable components we do not need
    alertmanager:
      enabled: false
    pushgateway:
      enabled: false
    nodeExporter:
      enabled: false
    # Configure Prometheus server
    server:
      retention: 2h
      resources:
        requests:
          cpu: 200m
          memory: 512Mi
        limits:
          cpu: 500m
          memory: 1Gi
      # Remote write to CloudWatch via the agent
      remoteWrite:
        - url: "http://cloudwatch-agent.amazon-cloudwatch:4315/v1/metrics"
    # Scrape Flux CD controller metrics
    serverFiles:
      prometheus.yml:
        scrape_configs:
          # Scrape Flux source controller
          - job_name: flux-source-controller
            metrics_path: /metrics
            static_configs:
              - targets:
                  - source-controller.flux-system:8080
          # Scrape Flux kustomize controller
          - job_name: flux-kustomize-controller
            metrics_path: /metrics
            static_configs:
              - targets:
                  - kustomize-controller.flux-system:8080
          # Scrape Flux helm controller
          - job_name: flux-helm-controller
            metrics_path: /metrics
            static_configs:
              - targets:
                  - helm-controller.flux-system:8080
          # Scrape Flux notification controller
          - job_name: flux-notification-controller
            metrics_path: /metrics
            static_configs:
              - targets:
                  - notification-controller.flux-system:8080
```

## Step 4: Configure CloudWatch Agent for Prometheus Metrics

Configure the CloudWatch agent to collect Prometheus metrics from Flux controllers.

```yaml
# infrastructure/monitoring/cwagent-prometheus-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-cwagentconfig
  namespace: amazon-cloudwatch
data:
  cwagentconfig.json: |
    {
      "logs": {
        "metrics_collected": {
          "prometheus": {
            "cluster_name": "my-cluster",
            "log_group_name": "/aws/containerinsights/my-cluster/prometheus",
            "prometheus_config_path": "/etc/prometheusconfig/prometheus.yaml",
            "emf_processor": {
              "metric_declaration": [
                {
                  "source_labels": ["job"],
                  "label_matcher": "^flux-.*",
                  "dimensions": [["job", "kind", "name", "namespace"]],
                  "metric_selectors": [
                    "^gotk_reconcile_duration_seconds.*",
                    "^gotk_reconcile_condition.*",
                    "^gotk_suspend_status$",
                    "^controller_runtime_reconcile_total$",
                    "^controller_runtime_reconcile_errors_total$"
                  ]
                }
              ]
            }
          }
        }
      }
    }
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
          ["ContainerInsights", "pod_cpu_utilization", "ClusterName", "my-cluster", "Namespace", "flux-system", "PodName", "source-controller"],
          ["...", "PodName", "kustomize-controller"],
          ["...", "PodName", "helm-controller"],
          ["...", "PodName", "notification-controller"]
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
          ["ContainerInsights", "pod_memory_utilization", "ClusterName", "my-cluster", "Namespace", "flux-system", "PodName", "source-controller"],
          ["...", "PodName", "kustomize-controller"],
          ["...", "PodName", "helm-controller"],
          ["...", "PodName", "notification-controller"]
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

```
# CloudWatch Logs Insights query for Flux errors
fields @timestamp, @message, kubernetes.pod_name
| filter kubernetes.namespace_name = "flux-system"
| filter @message like /error|fail|Error|Fail/
| sort @timestamp desc
| limit 50
```

```
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
  - prometheus-repo.yaml
  - prometheus.yaml
  - cwagent-prometheus-config.yaml
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
kubectl logs -n amazon-cloudwatch -l app=cloudwatch-agent --tail=50

# Issue: Flux metrics not being scraped
# Verify the metrics endpoints are accessible
kubectl get svc -n flux-system

# Issue: Container Insights not showing data
# Verify IRSA is configured correctly
kubectl describe sa cloudwatch-agent -n amazon-cloudwatch | grep eks.amazonaws.com

# Issue: High CloudWatch costs
# Review metric filters and reduce cardinality
aws cloudwatch list-metrics --namespace ContainerInsights --dimensions Name=ClusterName,Value=my-cluster | wc -l
```

## Conclusion

Amazon CloudWatch provides a comprehensive monitoring solution for Flux CD on EKS. By combining Container Insights for infrastructure metrics, Prometheus scraping for Flux-specific metrics, and CloudWatch Logs Insights for log analysis, you get full observability into your GitOps pipeline. The CloudWatch alarms ensure you are notified promptly when reconciliation issues arise, and the dashboards give you an at-a-glance view of your Flux CD health.
