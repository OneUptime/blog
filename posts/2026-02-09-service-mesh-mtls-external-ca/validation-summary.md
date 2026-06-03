# Validation Summary: Set Up Service Mesh mTLS with External Certificate Authority Using cert-manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- cert-manager
- cert-manager istio-csr
- Istio
- Linkerd
- HashiCorp Vault PKI
- Prometheus / PrometheusRule
- Helm
- kubectl
- istioctl

## Sources Consulted
- cert-manager supported releases: https://cert-manager.io/docs/releases/
- cert-manager Vault issuer documentation: https://cert-manager.io/v1.14-docs/configuration/vault/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager istio-csr documentation: https://cert-manager.io/docs/usage/istio-csr/
- cert-manager istio-csr installation guide: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.16-docs/devops-tips/prometheus-metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Linkerd automatic control plane TLS rotation guide: https://linkerd.io/2.12/tasks/automatically-rotating-control-plane-tls-credentials/
- HashiCorp Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes

## Issues Found
- The post pinned cert-manager v1.13.0, which is end-of-life. Updated the install URL to v1.20.2, a supported release as of the review date.
- The explanation said both Istio and Linkerd control planes request workload certificates via cert-manager. Updated it to distinguish Istio's istio-csr workload signing path from Linkerd's cert-manager-managed identity issuer rotation.
- The istio-csr Helm command used the older chart repository form and omitted current recommended install flags. Updated it to use the OCI chart, `helm upgrade --install`, `--wait`, and an explicit issuer group.
- The IstioOperator example used incorrect fields for configuring istio-csr. Replaced it with the documented pattern: disable istiod's built-in CA server with `ENABLE_CA_SERVER=false` and set `values.global.caAddress` to the istio-csr service.
- The Linkerd flow installed the control plane before creating the `linkerd-identity-issuer` Secret and included orphaned RBAC objects for a non-existent controller. Reordered the flow, added namespace creation, added `privateKey.rotationPolicy: Always`, and removed the unused RBAC resources.
- The Vault PKI role did not allow Istio SPIFFE URI SANs. Added `allowed_uri_sans="spiffe://cluster.local/*"` so Istio workload CSRs can be signed.
- The monitoring section referenced `certmanager_certificate_renewal_errors_total`, which is not a current cert-manager certificate metric. Replaced it with `certmanager_certificate_renewal_timestamp_seconds` and changed the alert to use `certmanager_certificate_ready_status`.
- The Istio validation command attempted to use TLS against Envoy's admin port. Replaced it with a service connection example and an `istioctl proxy-config secret` command to inspect the workload certificate issuer.
- The rotation event command used multiple values for the same field selector in one command. Split the examples into valid `kubectl get events` commands.

## Review Notes
The examples remain environment-dependent: Vault auth setup, trust anchor sourcing, and service DNS names must be adapted to the target cluster. The corrected snippets now match the documented integration patterns and current API fields.
