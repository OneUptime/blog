# Validation Summary: How to Rotate TLS Certificates Managed by cert-manager Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- Let's Encrypt ACME HTTP-01
- ingress-nginx
- Kubernetes Secrets and projected volumes
- Go TLS certificate loading
- fsnotify
- Prometheus alerting rules
- Helm
- cmctl
- Velero

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager API reference for Certificate fields, renewal timing, and private key rotation: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Ingress annotations documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager cmctl renew documentation: https://cert-manager.io/v1.11-docs/reference/cmctl/
- Kubernetes projected volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Secret volume documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- ingress-nginx TLS and controller behavior documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/ and https://kubernetes.github.io/ingress-nginx/how-it-works/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.55/configuration/alerting_rules/
- Velero basic installation and AWS plugin documentation: https://velero.io/docs/v1.18/basic-install/ and https://github.com/velero-io/velero-plugin-for-aws

## Issues Found
- The cert-manager Helm install command used `--set installCRDs=true`, which is a legacy/deprecated chart value. Updated it to `--set crds.enabled=true` to match current cert-manager Helm documentation.
- The ACME HTTP-01 solver used `ingress.class: nginx`. Updated it to `ingress.ingressClassName: nginx`, which is the current field for modern Kubernetes ingress classes.
- The cert-manager metrics Helm example enabled `prometheus.servicemonitor.enabled`. Current cert-manager docs show `prometheus.podmonitor.enabled` for scraping all cert-manager component metrics, so the example was updated.
- The PromQL expression for days until expiration had an unmatched closing parenthesis. Fixed the expression and split the alert rule into a separate YAML code block using current Prometheus alerting rule syntax.
- The Go fsnotify example watched only the certificate and key file paths and only handled write events. Kubernetes Secret/projected volume updates are symlink-based, so the example was changed to watch the parent directories and react to create, write, rename, and remove events.
- The Secret projection section incorrectly recommended “subPath projections” for updates. Kubernetes documents that `subPath` volume mounts do not receive updates, so the text now explicitly says to avoid `subPath` and use a directory-mounted Secret or projected volume.
- The manual renewal section recommended deleting the TLS Secret as a forced renewal path. That can create an avoidable gap where the Secret is absent, so the section now uses `cmctl renew`, which cert-manager documents as the manual renewal mechanism.
- The ingress-nginx description said it reloads when TLS Secrets change. Updated the wording to say it picks up updated TLS Secrets, which better matches ingress-nginx dynamic certificate behavior.
- The Velero install command omitted required provider-specific plugin and location configuration. Expanded the AWS example to include the AWS plugin, backup and snapshot location region configuration, and credentials file.
- The Velero schedule example backed up cert-manager resources but omitted Secrets and used unqualified resource names. Updated the resource list to include cert-manager resource groups and `secrets`.

## Review Notes
The article is technically relevant and valid after the corrections. The examples still assume a Prometheus Operator installation for PodMonitor support, working DNS and ingress routing for HTTP-01 validation, and a properly prepared Velero credentials file and S3 bucket.
