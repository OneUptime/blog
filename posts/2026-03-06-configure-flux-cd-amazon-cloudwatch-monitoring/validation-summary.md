# Validation Summary: How to Configure Flux CD with Amazon CloudWatch for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Amazon EKS
- Amazon CloudWatch
- CloudWatch Container Insights
- Amazon CloudWatch Observability Helm chart
- CloudWatch agent Prometheus metric collection
- EKS Pod Identity
- Kubernetes
- AWS CLI
- CloudWatch dashboards, alarms, Logs Insights, and SNS

## Sources Consulted
- AWS CloudWatch documentation: Install the CloudWatch agent with the Amazon CloudWatch Observability EKS add-on or Helm chart: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Observability-EKS-addon.html
- AWS CloudWatch documentation: Scraping additional Prometheus sources and importing metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights-Prometheus-Setup-configure.html
- AWS CloudWatch documentation: Amazon EKS and Kubernetes Container Insights enhanced metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-enhanced-EKS.html
- AWS CLI documentation: eks create-pod-identity-association: https://docs.aws.amazon.com/cli/latest/reference/eks/create-pod-identity-association.html
- Flux documentation: Prometheus metrics: https://fluxcd.io/flux/monitoring/metrics/
- AWS Observability Helm chart README and values: https://github.com/aws-observability/helm-charts/tree/main/charts/amazon-cloudwatch-observability
- Prometheus Community Helm chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus

## Issues Found
- The post used the old EKS charts repository URL for `amazon-cloudwatch-observability`. Updated the Flux `HelmRepository` to the current AWS Observability Helm repository, `https://aws-observability.github.io/helm-charts`.
- The Helm chart values used non-current keys such as top-level `serviceAccount`, `containerInsights`, and `fluentBit`. Updated the example to use current chart values including `containerLogs.enabled`, `agent.serviceAccount.name`, `agent.config`, and `agent.prometheus.config`.
- The IAM setup used IRSA annotations, but the chart-based AWS documentation now recommends EKS Pod Identity or worker-node permissions for the Helm chart path. Replaced the OIDC trust policy and service account annotation flow with an EKS Pod Identity role trust policy and `aws eks create-pod-identity-association`.
- The post deployed a separate Prometheus server and configured `remoteWrite` to `http://cloudwatch-agent.amazon-cloudwatch:4315/v1/metrics`. The CloudWatch agent is not documented as a Prometheus remote-write receiver for this use case. Reworked the example so the CloudWatch agent scrapes Flux metrics directly and emits selected metrics through embedded metric format.
- The Prometheus metric declaration dimensions did not include `ClusterName`, but later dashboard and alarm examples queried by `ClusterName`. Added `ClusterName` dimension sets to the EMF metric declaration.
- The Container Insights dashboard examples used `PodName` values such as `source-controller`, which are service/deployment names rather than stable pod names. Updated those dashboard metrics to use the documented `Service`, `Namespace`, and `ClusterName` dimensions.
- The Flux Kustomization resource list included Prometheus and CloudWatch-agent ConfigMap files that were no longer correct after moving the scrape and EMF configuration into the HelmRelease. Removed those resources.
- Troubleshooting still referenced IRSA annotations and a likely incorrect CloudWatch agent pod label. Updated troubleshooting to check the EKS Pod Identity association and to fetch logs from the `cloudwatch-agent` daemonset.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI flag verification was performed against AWS CLI command reference documentation rather than local `aws --help` output. The revised post keeps a chart-based install path; teams that cannot use EKS Pod Identity can still use worker-node IAM permissions, but that alternate path is not shown in the tutorial.
