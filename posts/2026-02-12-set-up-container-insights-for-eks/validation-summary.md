# Validation Summary: How to Set Up Container Insights for EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon CloudWatch Container Insights
- Amazon CloudWatch Observability EKS add-on
- CloudWatch agent
- Fluent Bit
- eksctl
- AWS CLI
- Helm
- Kubernetes
- CloudWatch Logs Insights

## Sources Consulted
- Amazon CloudWatch: Quick start with the Amazon CloudWatch Observability EKS add-on: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-EKS-addon.html
- Amazon CloudWatch: Install the CloudWatch agent with the Amazon CloudWatch Observability EKS add-on or the Helm chart: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html
- Amazon CloudWatch: Setting up Container Insights on Amazon EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html
- Amazon CloudWatch: Setting up the CloudWatch agent to collect cluster metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-metrics.html
- Amazon CloudWatch: Amazon EKS and Kubernetes Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-EKS.html
- Amazon CloudWatch: Viewing Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-view-metrics.html
- Amazon CloudWatch: Container Insights with enhanced observability for Amazon EKS: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/container-insights-detailed-metrics.html
- Amazon EKS User Guide: Amazon EKS add-ons: https://docs.aws.amazon.com/eks/latest/userguide/workloads-add-ons-available-eks.html

## Issues Found
- The EKS add-on IRSA example created service accounts directly and did not pass the IAM role to `aws eks create-addon`. Updated it to the documented IRSA flow: create or verify the OIDC provider, create the `cloudwatch-agent` IAM service account role with `--role-only`, and pass `--service-account-role-arn` when creating the add-on.
- The add-on command pinned `v1.5.0-eksbuild.1`, which is not a good current default. Removed the pinned version so EKS can select an available compatible add-on version unless the reader intentionally pins one.
- The "Manual Installation with Helm" section did not use Helm and showed a partial raw DaemonSet manifest that omitted required resources such as the service account/RBAC and Fluent Bit deployment. Replaced it with the official CloudWatch Observability Helm chart install commands.
- The pod restart CloudWatch alarm used only the `ClusterName` dimension, but `pod_number_of_container_restarts` is a pod-level metric with `ClusterName`, `Namespace`, and `PodName` dimensions. Updated the alarm example to include all required dimensions.
- The first CloudWatch Logs Insights query filtered `Type` after aggregation. Moved the filter before `stats` so the query operates on pod performance events before aggregating.
- The cost section described current setup costs only as custom metrics and CloudWatch Logs ingestion/storage. Updated it to distinguish enhanced Container Insights for EKS, which AWS documents as observation-based billing, from older custom-metrics-based setups.

## Review Notes
- The article now aligns with AWS's recommended EKS add-on path and the official Helm chart path. For production use, teams should still decide whether to use EKS Pod Identity, IRSA, or node IAM permissions based on their cluster standards and AWS account controls.
