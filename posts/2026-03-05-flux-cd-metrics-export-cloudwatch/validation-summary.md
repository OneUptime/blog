# Validation Summary: How to Configure Flux CD Metrics Export to CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Amazon EKS
- Amazon CloudWatch
- CloudWatch Agent Prometheus scraping
- AWS Distro for OpenTelemetry Collector
- AWS EMF exporter
- kube-state-metrics
- AWS CLI
- eksctl / IRSA

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Amazon CloudWatch Agent Prometheus setup for EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-Setup.html
- Amazon CloudWatch Agent additional Prometheus scrape configuration: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-Setup-configure.html
- Amazon CloudWatch Agent Prometheus metric type conversion: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-metrics-conversion.html
- Amazon CloudWatch Agent Prometheus configuration reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-PrometheusEC2.html
- AWS Distro for OpenTelemetry CloudWatch metrics documentation: https://aws-otel.github.io/docs/getting-started/cloudwatch-metrics/
- Amazon CloudWatch Observability Helm chart / add-on documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html
- eksctl IAM service accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS CLI `cloudwatch put-metric-alarm` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html

## Issues Found
- The post used `gotk_reconcile_condition`, which is not listed in current Flux controller metrics and is no longer a reliable current Flux metric. Replaced readiness examples with `gotk_resource_info`, and noted that it requires kube-state-metrics configured for Flux custom resource metrics.
- The CloudWatch Agent scrape relabeling depended on `prometheus.io` pod annotations and built an invalid replacement address from only the port annotation. Replaced it with Flux controller pod discovery by namespace, running phase, controller app label, and port `8080`, matching Flux's documented controller metrics endpoint.
- The CloudWatch Agent Helm install example did not use the ConfigMap shown in the post and did not match the official Prometheus-support deployment flow. Replaced it with the AWS sample `cwagent-prometheus` manifest workflow and aligned ConfigMap names, keys, and mount paths with the AWS manifest.
- The CloudWatch Agent metric declaration used one dimension set for metrics with different labels. Split declarations so controller runtime metrics use `controller` and `result`, while optional kube-state-metrics readiness metrics use `ready` and Flux resource labels.
- The CloudWatch Agent option implied that Flux reconciliation duration histograms would be exported by the agent. AWS documents that the CloudWatch Agent drops Prometheus histogram metrics, so the CloudWatch Agent example now focuses on supported metrics and the duration dashboard is scoped to ADOT-exported histogram components.
- The ADOT exporter example selected `gotk_reconcile_duration_seconds` without matching the actual histogram component names. Changed selectors to regex patterns matching `gotk_reconcile_duration_seconds_bucket`, `_sum`, and `_count`.
- The dashboard suggested a `p95` statistic for histogram components as though a single `gotk_reconcile_duration_seconds` metric were exported. Changed the guidance to use metric math for average duration from `_sum / _count`.
- The CloudWatch alarm dimensions referenced `type=Ready` and `status=False`, which did not match the corrected metrics. Updated the alarm to use the `ready=False` dimension on `gotk_resource_info`.

## Review Notes
- The ADOT deployment section still assumes the reader supplies an ADOT Collector deployment manifest or operator setup. The collector ConfigMap is technically valid, but a complete production deployment would need service account/IAM, RBAC, and a mounted collector configuration.
- `gotk_resource_info` depends on kube-state-metrics custom resource state configuration; Flux controllers themselves expose controller metrics such as reconciliation duration, not full custom resource readiness state.
