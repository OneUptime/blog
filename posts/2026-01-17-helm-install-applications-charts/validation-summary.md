# Validation Summary: How to Install Applications Using Helm Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- ingress-nginx Helm chart
- cert-manager and ACME HTTP-01 issuers
- Prometheus Community kube-prometheus-stack
- Grafana and Alertmanager
- Bitnami nginx and PostgreSQL Helm charts
- Kubernetes Services, Ingress, PVCs, and StorageClasses

## Sources Consulted
- Helm `helm install` command documentation: https://helm.sh/docs/helm/helm_install/
- Helm chart values documentation: https://helm.sh/docs/topics/charts/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- ingress-nginx chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Bitnami nginx chart values: https://github.com/bitnami/charts/blob/main/bitnami/nginx/values.yaml
- Bitnami PostgreSQL chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml

## Issues Found
- The cert-manager install example used `--version v1.14.0`, which is outdated relative to current cert-manager releases. Updated it to `v1.20.2`.
- The cert-manager install example used `--set installCRDs=true`, which the current chart marks as deprecated. Updated it to `--set crds.enabled=true` and updated the nearby comment.
- The cert-manager HTTP-01 solver example used `class: nginx`. Current cert-manager documentation recommends `ingressClassName` for most ingress controllers, so the example now uses `ingressClassName: nginx`.
- The Bitnami nginx `--set` array example used `ingress.hosts[0].name`, which is not a current Bitnami nginx chart value. Updated it to use `ingress.extraHosts[0].name` and `ingress.extraHosts[0].path`.
- The Helm install options table and production example used `--atomic`, which current Helm documentation no longer lists and replaces with `--rollback-on-failure`. Updated both references.
- The PostgreSQL production section said the values file included backup configuration, but the snippet configures resources, persistence, PostgreSQL settings, and metrics only. Reworded the sentence to match the actual configuration.

## Review Notes
The examples remain mostly educational and do not pin every chart version. For stronger production reproducibility, future revisions could pin versions for ingress-nginx, kube-prometheus-stack, Bitnami nginx, and Bitnami PostgreSQL, and could avoid showing plaintext database or Grafana passwords in command examples except as short-lived demo placeholders.
