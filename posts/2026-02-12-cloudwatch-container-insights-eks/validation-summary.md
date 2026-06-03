# Validation Summary: How to Set Up CloudWatch Container Insights for EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Container Insights
- Amazon EKS
- Kubernetes
- CloudWatch Observability EKS add-on
- Amazon CloudWatch Observability Helm chart
- AWS IAM, IRSA, and EKS Pod Identity
- CloudWatch Logs Insights
- EKS control plane logging
- AWS Distro for OpenTelemetry (ADOT) on EKS Fargate
- Prometheus metrics scraping

## Sources Consulted
- AWS CloudWatch documentation: Install the CloudWatch agent with the Amazon CloudWatch Observability EKS add-on or the Helm chart: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html
- AWS CloudWatch documentation: Amazon EKS and Kubernetes Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-EKS.html
- AWS CloudWatch documentation: Container Insights performance log events for Amazon EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-reference-performance-logs-EKS.html
- AWS CloudWatch documentation: Relevant fields in performance log events for Amazon EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-reference-performance-entries-EKS.html
- AWS CloudWatch Logs documentation: CloudWatch Logs Insights query syntax and comments: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- AWS CloudWatch documentation: CloudWatch agent Prometheus metrics collection on EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-install-EKS.html
- AWS CloudWatch documentation: Scraping additional Prometheus sources and importing those metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-Setup-configure.html
- Amazon EKS documentation: Send control plane logs to CloudWatch Logs: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html
- AWS Distro for OpenTelemetry documentation: Container Insights EKS Fargate: https://aws-otel.github.io/docs/getting-started/container-insights/eks-fargate/

## Issues Found
- The prerequisites stated that an OIDC provider for IRSA was mandatory. Updated this to reflect the current supported permission options: EKS Pod Identity, worker node IAM roles, or IRSA.
- The Helm install example used an undocumented `containerInsights.enabled=true` value and a less-current chart command. Updated it to match AWS's documented Helm install pattern, including `helm repo update aws-observability`, `--wait`, and the chart release name.
- The EKS add-on install example pinned `v1.5.0-eksbuild.1`. Removed the pinned version so the command uses AWS's selected compatible add-on version unless the reader intentionally chooses one.
- The IAM trust policy code block contained a JavaScript-style comment, which made the JSON invalid. Removed the comment and added the standard `aud: sts.amazonaws.com` condition used for IRSA trust policies.
- The CloudWatch Logs Insights examples used `--` comments, which are not valid in Logs Insights QL. Changed them to `#` comments.
- The memory-limit query was described as checking memory requests, but it used `pod_memory_utilization_over_pod_limit`. Changed the description to memory limit.
- The pod restart alarm used `pod_number_of_container_restarts` without the required `PodName` dimension. Added `PodName` and made the alarm name specific to the example pod.
- The EKS Fargate section said AWS automatically collects Fargate pod metrics. Updated it to describe the ADOT Collector setup required for EKS Fargate Container Insights metrics and changed the service account example accordingly.

## Review Notes
The Prometheus snippet is a partial scrape configuration, not a full CloudWatch agent configuration. It is technically plausible as an illustrative scrape config, but a production walkthrough should include the surrounding CloudWatch agent `metrics_collected.prometheus` configuration or link directly to the AWS sample manifest.
