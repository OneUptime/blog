# Validation Summary: How to Configure the OpenTelemetry Collector for K8s Clusters Provisioned by

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Helm chart
- Terraform
- Terraform AWS EKS module
- Terraform Helm provider
- Terraform Kubernetes provider
- AWS EKS
- AWS IAM Roles for Service Accounts (IRSA)
- Kubernetes RBAC

## Sources Consulted
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Helm chart v0.80.0 Chart.yaml and values.yaml: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/opentelemetry-collector-0.80.0/charts/opentelemetry-collector
- OpenTelemetry Kubernetes attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0/processor/k8sattributesprocessor
- OpenTelemetry resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0/processor/resourcedetectionprocessor
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks get-token` documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Terraform AWS EKS module v20 documentation: https://github.com/terraform-aws-modules/terraform-aws-eks/tree/v20.0.0
- Terraform AWS IAM module IRSA documentation: https://github.com/terraform-aws-modules/terraform-aws-iam/tree/v5.0.0/modules/iam-role-for-service-accounts-eks
- Terraform Helm provider documentation: https://github.com/hashicorp/terraform-provider-helm
- Terraform Kubernetes provider documentation: https://github.com/hashicorp/terraform-provider-kubernetes

## Issues Found
- The EKS example used Kubernetes `1.29`, which is past Amazon EKS extended support as of March 23, 2026. Updated the example to Kubernetes `1.34`, which is in standard support on the validation date.
- The Helm provider snippet used the older nested block form for the current provider documentation. Updated the Helm provider configuration to the current object-style `kubernetes = { ... }` and `exec = { ... }` form.
- The Helm values template referenced `${otel_iam_role_arn}`, but the Terraform `templatefile` call did not pass that variable. Added `otel_iam_role_arn = module.otel_collector_irsa.iam_role_arn`.
- The `k8sattributes` processor only associated pods by `k8s.pod.ip`. Added a `connection` fallback so metadata enrichment still works for direct pod-to-collector traffic when `k8s.pod.ip` is not already present.
- The configured EKS resource detector can require `ec2:DescribeInstances` to determine EKS resource metadata. Added an inline IAM policy granting `ec2:DescribeInstances` to the Collector IRSA role.
- The closing text claimed the full flow works in a single Terraform apply. Updated it to note that production deployments may need separate apply stages because Terraform Kubernetes and Helm providers can require the cluster API to be reachable before managing in-cluster resources.

## Review Notes
The chart version `0.80.0` defaults to app version `0.93.0`; the post intentionally overrides the Collector image tag to `0.96.0`, which is valid but should be tested when chart and image versions are not kept in lockstep. The AWS CLI `eks get-token` examples still return `client.authentication.k8s.io/v1beta1`, so the exec API version was left unchanged.
