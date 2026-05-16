# Validation Summary: How to Set Up Vault by HashiCorp on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- HashiCorp Vault
- Vault Helm chart
- Kubernetes
- Helm
- Vault Raft integrated storage
- Vault Kubernetes auth method
- Vault Agent Injector
- Vault auto-unseal with AWS KMS
- Prometheus ServiceMonitor

## Sources Consulted
- HashiCorp Vault Helm chart HA with Raft documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/ha-with-raft
- HashiCorp Vault Helm chart Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/kubernetes-auth
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Helm chart configuration reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/configuration
- HashiCorp Vault Agent Injector annotation reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault telemetry configuration documentation: https://developer.hashicorp.com/vault/docs/configuration/telemetry
- HashiCorp Vault TCP listener configuration documentation: https://developer.hashicorp.com/vault/docs/configuration/listener/tcp
- HashiCorp Vault audit enable CLI documentation: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- Sidero Labs Talos Linux Kubernetes reference architecture: https://www.siderolabs.com/kubernetes-cluster-reference-architecture-with-talos-linux/

## Issues Found
- The post said Helm v3 was sufficient. The current Vault Helm chart documentation requires Helm 3.6 or later, so the prerequisite was updated.
- The commands use `jq`, but `jq` was not listed as a prerequisite. Added it to the prerequisite list.
- The Talos security claims were too absolute. Updated the introduction and conclusion to describe Talos as reducing host-level attack surface and configuration drift rather than making hosts impossible to compromise.
- The Kubernetes auth configuration used a hard-coded Kubernetes API service address. Updated it to use `$KUBERNETES_SERVICE_HOST` and `$KUBERNETES_SERVICE_PORT`, matching HashiCorp's in-pod Kubernetes auth example.
- The example pod used `source` under `sh -c`. `source` is not POSIX `sh`, so it was changed to `. /vault/secrets/config`.
- The monitoring section used `vault write sys/config/auditing/enable-raw-body true`, which configures audit behavior and does not enable Prometheus telemetry. Replaced it with the required Vault `telemetry` stanza, listener telemetry configuration for unauthenticated metrics, and Helm chart `serverTelemetry.serviceMonitor` settings.
- The sample `storageClass: local-path` was presented as fixed Talos-specific configuration. Added a note to replace it with the StorageClass available in the reader's cluster.

## Review Notes
The tutorial still uses `tls_disable = 1` in example Vault listener snippets. This can be acceptable for a simplified internal lab example, but production deployments should configure TLS, restrict network access, and avoid using the root token for ongoing administration.
