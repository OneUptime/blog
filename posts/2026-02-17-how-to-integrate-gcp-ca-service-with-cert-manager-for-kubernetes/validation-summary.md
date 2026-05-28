# Validation Summary: How to Integrate GCP CA Service with cert-manager for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Certificate Authority Service
- google-cas-issuer
- cert-manager
- Kubernetes
- GKE Workload Identity
- Helm
- Google Cloud CLI
- Kubernetes Ingress and TLS Secrets
- Prometheus Operator ServiceMonitor

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Certificate API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress annotation documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager/google-cas-issuer README: https://github.com/cert-manager/google-cas-issuer
- cert-manager-google-cas-issuer Helm chart index and templates: https://charts.jetstack.io/index.yaml
- Google Cloud CA Service IAM documentation: https://cloud.google.com/certificate-authority-service/docs/configuring-iam
- Google Cloud IAM roles for CA Service: https://cloud.google.com/iam/docs/roles-permissions/privateca
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity

## Issues Found
- The cert-manager Helm install command used the older Jetstack HTTP repository, cert-manager v1.14.0, and `installCRDs=true`. Updated it to the current OCI chart pattern, cert-manager v1.20.2, and `crds.enabled=true` based on the current cert-manager installation documentation.
- The google-cas-issuer Helm command used an incorrect chart reference, `jetstack/google-cas-issuer`, and an older v0.8.0 version. Updated it to `oci://quay.io/jetstack/charts/cert-manager-google-cas-issuer` with v0.11.0.
- The static manifest URL used the old `jetstack/google-cas-issuer` repository path. Updated it to the current `cert-manager/google-cas-issuer` repository path and clarified that static manifests are available for releases that publish them.
- The Workload Identity binding and service account annotation referenced `ksa-google-cas-issuer`, but the current Helm chart creates the service account as `cert-manager-google-cas-issuer` by default. Updated both commands and added `--overwrite` to make the annotation command repeatable.
- The Ingress example used `cert-manager.io/cluster-issuer` for an out-of-tree external issuer. cert-manager documents that this shortcut is only for `cert-manager.io` `ClusterIssuer` resources, so the example now uses `cert-manager.io/issuer`, `cert-manager.io/issuer-kind`, and `cert-manager.io/issuer-group`.
- The troubleshooting log selector used the old `app=google-cas-issuer` label. Updated it to the label used by the current Helm chart, `app.kubernetes.io/name=cert-manager-google-cas-issuer`.

## Review Notes
The google-cas-issuer project is currently in maintenance mode according to its README, but it remains technically relevant and usable for the workflow described. The post now uses current recommended install commands while keeping the author's tutorial structure intact.
