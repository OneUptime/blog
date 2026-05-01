# Validation Summary: How to Deploy Prometheus with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Helm provider
- HashiCorp Kubernetes provider
- Kubernetes
- Helm
- Prometheus
- Alertmanager
- Prometheus Operator / `kube-prometheus-stack`
- Grafana
- Slack
- PagerDuty

## Sources Consulted
- HashiCorp Helm provider registry: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- HashiCorp Helm provider source docs (`v3.1.1`): https://github.com/hashicorp/terraform-provider-helm/tree/v3.1.1/docs
- HashiCorp Kubernetes provider registry: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Kubernetes provider changelog (`v3.1.0`): https://github.com/hashicorp/terraform-provider-kubernetes/blob/v3.1.0/CHANGELOG.md
- Prometheus Community Helm chart index: https://prometheus-community.github.io/helm-charts/index.yaml
- `kube-prometheus-stack` chart source (`84.4.0`): https://github.com/prometheus-community/helm-charts/tree/kube-prometheus-stack-84.4.0/charts/kube-prometheus-stack
- Prometheus Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator storage guide (`v0.90.1`): https://github.com/prometheus-operator/prometheus-operator/blob/v0.90.1/Documentation/platform/storage.md

## Issues Found
- The post pinned outdated provider versions (`hashicorp/helm ~> 2.12` and `hashicorp/kubernetes ~> 2.24`). I updated both to `~> 3.1`, changed the Helm provider example to the current `kubernetes = { ... }` syntax, and switched deprecated `kubernetes_namespace` / `kubernetes_secret` resources to `kubernetes_namespace_v1` / `kubernetes_secret_v1` to match current provider guidance.
- The post pinned `kube-prometheus-stack` chart version `55.5.0`, which is outdated for a 2026 guide. I updated it to `84.4.0` and corrected the prerequisite to Kubernetes `1.25+`, which is the minimum Kubernetes version declared by that chart release.
- The Alertmanager example created a Kubernetes secret but did not configure `kube-prometheus-stack` to consume it. I added `useExistingSecret = true` and `configSecret = kubernetes_secret_v1.alertmanager_config.metadata[0].name`, and used an explicit custom secret name to avoid colliding with the chart-managed default secret.
- The Alertmanager route used classic `match` syntax. I changed it to `matchers = ["severity = \"critical\""]` to align with the current Alertmanager configuration format and UTF-8 strict mode direction.

## Review Notes
- `service_key` is still valid for PagerDuty’s Prometheus integration type; environments using PagerDuty Events API v2 would typically use `routing_key` instead.
- `kubernetes_secret_v1` stores secret values in OpenTofu/Terraform state as plaintext. The example is technically valid, but production users should secure remote state appropriately.
- The local review environment did not have `tofu` or `helm` installed, so I could not run a local `tofu init` / `tofu validate` or `helm`-based check. Verification was done against the official provider registries, upstream chart sources, and official Alertmanager documentation.
