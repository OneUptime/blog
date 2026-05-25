# Validation Summary: How to Build a GitOps Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Amazon EKS
- Kubernetes
- Argo CD
- Argo CD Helm chart
- GitHub Terraform provider
- Sealed Secrets
- AWS Secrets Manager
- Prometheus Operator / kube-prometheus-stack
- Argo CD Notifications

## Sources Consulted
- Terraform AWS EKS module documentation and v21.0.0 source: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest, https://github.com/terraform-aws-modules/terraform-aws-eks
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Amazon EKS managed node group taints: https://docs.aws.amazon.com/eks/latest/userguide/node-taints-managed-node-groups.html
- Argo CD Helm chart v5.51.0 values and README: https://github.com/argoproj/argo-helm/tree/argo-cd-5.51.0/charts/argo-cd
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD Notifications catalog/config examples: https://github.com/argoproj/argo-cd/tree/v2.9.3/notifications_catalog
- GitHub Terraform provider branch protection resource: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection
- Sealed Secrets Helm chart v2.13.0 values: https://github.com/bitnami-labs/sealed-secrets/tree/helm-v2.13.0/helm/sealed-secrets
- kube-prometheus-stack Helm chart values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found
- The EKS example used Kubernetes `1.28`, which is no longer a supported EKS version by the 2026-05-25 review date. Updated it to `1.33`, which is in standard support.
- The EKS module was pinned to the older `~> 19.0` line while showing a modern setup. Updated it to `~> 21.0` and changed managed node group taints from a list to the current map shape.
- The EKS snippet included `manage_aws_auth_configmap` with a comment claiming it allowed Argo CD to manage all namespaces. That setting manages EKS authentication, not Kubernetes namespace scope, and is not part of the current module pattern. Removed it.
- The Argo CD Helm values placed `accounts.ci` and `resource.exclusions` under `server.config`, which is not a valid chart values path for chart `5.51.0`. Moved those settings under `configs.cm`.
- The GitHub repositories are private, but Argo CD had no repository credentials, so the root application would not be able to read them. Added repository credential entries through the Argo CD Helm chart's `configs.repositories` values.
- The ALB ingress example terminated TLS at the load balancer but did not configure Argo CD server to run without its own TLS. Added `configs.params.server.insecure = true`, matching Argo CD ingress guidance for TLS termination before Argo CD.
- The Argo CD HA example set the application controller to two replicas and omitted repo-server and ApplicationSet replicas. Updated the HA values to match the chart's documented static HA shape more closely.
- The Sealed Secrets AWS Secrets Manager comment claimed the key was backed up, but the Terraform resource only creates the destination secret. Reworded the comment to avoid overstating behavior.
- The Sealed Secrets chart was pinned to the tainted system node group without the matching toleration. Replaced the single `set` value with chart values that include both `nodeSelector` and the required toleration.
- The notification trigger used sync status alone. Updated it to the official Argo CD Notifications success condition based on `operationState.phase`.
- The Slack notifier referenced `$slack-token` without defining the Kubernetes Secret key. Added a Secret manifest using `var.slack_token`.
- The monitoring example installed the plain `prometheus` chart with unsupported `serviceMonitors` values. Replaced it with `kube-prometheus-stack` and Prometheus Operator ServiceMonitor selectors that can discover the Argo CD ServiceMonitors.
- The Argo CD chart enables ServiceMonitor resources, so the Prometheus Operator CRDs must exist before that Helm release is applied. Added a Terraform dependency from Argo CD to the monitoring release.

## Review Notes
The snippets are still illustrative and assume supporting providers, variables, VPC resources, AWS Load Balancer Controller, and repository templates exist elsewhere. Argo CD chart `5.51.0` is valid for the shown values, but future maintenance should consider updating the chart version alongside current Argo CD releases. The GitHub token example is functional, but teams should handle Terraform state as sensitive or replace it with an external secret workflow.
