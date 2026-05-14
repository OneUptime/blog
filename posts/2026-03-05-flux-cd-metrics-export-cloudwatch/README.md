# How to Configure Flux CD Metrics Export to CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, AWS, CloudWatch, Metric

Description: Learn how to export Flux CD reconciliation metrics to AWS CloudWatch for monitoring GitOps pipelines in AWS environments.

---

Organizations running Kubernetes on AWS often use CloudWatch as their primary monitoring service. By exporting Flux CD metrics to CloudWatch, you can integrate GitOps monitoring into your existing AWS observability workflows, create CloudWatch dashboards, and set up alarms that notify your team through SNS topics.

This guide covers how to collect Flux CD Prometheus metrics and ship them to CloudWatch using the CloudWatch Agent or the AWS Distro for OpenTelemetry (ADOT) Collector.

## Prerequisites

- An EKS cluster (or self-managed Kubernetes on AWS) with Flux CD installed
- AWS IAM permissions to write CloudWatch metrics
- `kubectl` and `aws` CLI access
- `eksctl` installed if you plan to use IRSA
- kube-state-metrics configured for Flux custom resource metrics if you want Ready-state dashboards or alarms

## Architecture Overview

Flux CD controllers expose metrics in Prometheus format. CloudWatch does not natively scrape Prometheus endpoints, so you need a collector that bridges the two. Flux readiness state is usually exported through kube-state-metrics custom resource metrics such as `gotk_resource_info`. There are two common approaches:

1. **CloudWatch Agent with Prometheus support**: The containerized CloudWatch Agent can scrape Prometheus endpoints and publish supported Prometheus metric types to CloudWatch. The CloudWatch Agent drops Prometheus histograms, so use ADOT if you need Flux reconciliation duration histograms.
2. **AWS Distro for OpenTelemetry (ADOT)**: The ADOT Collector can scrape Prometheus metrics and export them to CloudWatch via the AWS EMF exporter

This guide demonstrates both approaches.

## Step 1: Set Up IAM Permissions

Create an IAM policy that allows writing CloudWatch metrics:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach this policy to the node IAM role or use IRSA (IAM Roles for Service Accounts) for fine-grained access:

```bash
eksctl create iamserviceaccount \
  --name cwagent-prometheus \
  --namespace amazon-cloudwatch \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy \
  --override-existing-serviceaccounts \
  --approve
```

## Step 2: Deploy the CloudWatch Agent (Option A)

Create a ConfigMap for the CloudWatch Agent that defines Prometheus scraping for Flux controllers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: amazon-cloudwatch
data:
  prometheus.yaml: |
    global:
      scrape_interval: 60s
    scrape_configs:
      - job_name: "flux-controllers"
        metrics_path: /metrics
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - flux-system
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_phase]
            action: keep
            regex: Running
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: (source-controller|kustomize-controller|helm-controller|notification-controller|image-automation-controller|image-reflector-controller)
          - source_labels: [__meta_kubernetes_pod_container_port_number]
            action: keep
            regex: "8080"
---
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
              "metric_namespace": "FluxCD",
              "metric_declaration": [
                {
                  "source_labels": ["controller"],
                  "label_matcher": ".*",
                  "dimensions": [["controller", "result"]],
                  "metric_selectors": [
                    "^controller_runtime_reconcile_total$"
                  ]
                },
                {
                  "source_labels": ["ready"],
                  "label_matcher": ".*",
                  "dimensions": [["ready"], ["customresource_kind", "exported_namespace", "name", "ready"]],
                  "metric_selectors": [
                    "^gotk_resource_info$"
                  ]
                }
              ]
            }
          }
        }
      }
    }
```

Deploy the CloudWatch Agent with Prometheus support. Download the AWS sample manifest, replace its `prometheus-config` and `prometheus-cwagentconfig` ConfigMaps with the Flux scrape and CloudWatch Agent config above, then apply it:

```bash
curl -O https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/service/cwagent-prometheus/prometheus-eks.yaml
kubectl apply -f prometheus-eks.yaml
```

## Step 3: Deploy the ADOT Collector (Option B)

If you prefer OpenTelemetry, deploy the ADOT Collector with a Prometheus receiver and CloudWatch EMF exporter:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adot-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
          scrape_configs:
            - job_name: "flux-controllers"
              scrape_interval: 30s
              static_configs:
                - targets:
                    - "source-controller.flux-system.svc:8080"
                    - "kustomize-controller.flux-system.svc:8080"
                    - "helm-controller.flux-system.svc:8080"
                    - "notification-controller.flux-system.svc:8080"
    exporters:
      awsemf:
        namespace: FluxCD
        region: us-east-1
        dimension_rollup_option: NoDimensionRollup
        metric_declarations:
          - dimensions:
              - [kind, name, namespace]
            metric_name_selectors:
              - "^gotk_reconcile_duration_seconds.*$"
          - dimensions:
              - [controller, result]
            metric_name_selectors:
              - "^controller_runtime_reconcile_total$"
          - dimensions:
              - [ready]
              - [customresource_kind, exported_namespace, name, ready]
            metric_name_selectors:
              - "^gotk_resource_info$"
    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          exporters: [awsemf]
```

Deploy the ADOT Collector:

```bash
kubectl apply -f adot-collector-config.yaml
kubectl apply -f adot-collector-deployment.yaml
```

## Step 4: Verify Metrics in CloudWatch

Navigate to the CloudWatch console and open **Metrics > All Metrics**. Look for the `FluxCD` custom namespace. You should see metrics organized by the dimensions you defined (kind, name, namespace).

Verify with the AWS CLI:

```bash
aws cloudwatch list-metrics --namespace FluxCD
```

With the CloudWatch Agent, you should see supported metrics like `controller_runtime_reconcile_total` with appropriate dimensions. With ADOT, you should also see histogram components such as `gotk_reconcile_duration_seconds_bucket`, `gotk_reconcile_duration_seconds_sum`, and `gotk_reconcile_duration_seconds_count`. If you also export Flux custom resource metrics from kube-state-metrics, you should see `gotk_resource_info`.

## Step 5: Create CloudWatch Dashboards

In the CloudWatch console, create a dashboard with widgets that display Flux metrics:

**Widget 1 - Reconciliation Status**: A number widget showing the count of resources with Ready=False. This requires kube-state-metrics Flux custom resource metrics:

- Metric: `FluxCD > gotk_resource_info`
- Filter: `ready=False`
- Statistic: Sum

**Widget 2 - Reconciliation Duration**: A line chart showing average reconciliation duration over time. Use this with ADOT-exported histogram components:

- Metric math: `gotk_reconcile_duration_seconds_sum / gotk_reconcile_duration_seconds_count`
- Group by: kind
- Statistic: Average

**Widget 3 - Source Health**: A status widget showing whether sources are healthy across all resource types.

## Step 6: Set Up CloudWatch Alarms

Create CloudWatch alarms that trigger when Flux reconciliation fails:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "FluxReconciliationFailed" \
  --metric-name "gotk_resource_info" \
  --namespace "FluxCD" \
  --dimensions Name=ready,Value=False \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:flux-alerts \
  --treat-missing-data notBreaching
```

This alarm requires kube-state-metrics Flux custom resource metrics. It fires when any Flux resource remains in a non-ready state for three consecutive 5-minute periods and sends a notification to an SNS topic.

## Step 7: Integrate with AWS Services

CloudWatch metrics from Flux CD can integrate with other AWS services:

- **SNS**: Send alert notifications to email, SMS, or Lambda functions
- **EventBridge**: Trigger automated remediation workflows when alarms fire
- **Systems Manager**: Create OpsItems for Flux failures that require investigation
- **AWS Chatbot**: Forward alarms to Slack or Microsoft Teams through AWS Chatbot

## Summary

Exporting Flux CD metrics to CloudWatch integrates your GitOps monitoring into the AWS ecosystem. Whether you use the CloudWatch Agent or the ADOT Collector, both approaches scrape Prometheus metrics from Flux controllers and publish supported metrics as custom CloudWatch metrics. Once in CloudWatch, you can build dashboards, set up alarms, and leverage the full suite of AWS monitoring and notification services to keep your team informed about the health of your Flux CD deployment pipeline.
