# Validation Summary: How to Convert Kubernetes ConfigMaps to Sealed Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Bitnami Sealed Secrets
- kubeseal CLI
- Argo CD GitOps
- PrometheusRule monitoring
- Bash and jq

## Sources Consulted
- Bitnami Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets releases: https://github.com/bitnami-labs/sealed-secrets/releases
- Bitnami Sealed Secrets controller manifest v0.37.0: https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.37.0/controller.yaml
- Bitnami Sealed Secrets Prometheus mixin and metrics source: https://github.com/bitnami-labs/sealed-secrets/tree/main/contrib/prometheus-mixin
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation for using Secrets as environment variables: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/

## Issues Found
- The installation commands pinned Sealed Secrets v0.24.0, which is outdated for this review date. Updated the controller and Linux kubeseal download commands to v0.37.0, the latest release shown in the official releases page.
- The bulk migration script converted ConfigMap entries into shell-expanded `--from-literal` arguments. That can break values containing spaces, quotes, newlines, or shell-sensitive characters. Replaced it with a jq-based Secret manifest transformation that base64-encodes `.data` values and preserves `.binaryData` values as Secret `.data`.
- The sealing key backup command only backed up a single `sealed-secrets-key` Secret. Updated it to back up all active sealing key Secrets using the official `sealedsecrets.bitnami.com/sealed-secrets-key` label selector.
- The key rotation example manually created and labeled a TLS Secret as an active key. The official documentation describes automatic 30-day key renewal and early renewal using `--key-cutoff-time` or `SEALED_SECRETS_KEY_CUTOFF_TIME`. Replaced the example with the documented early renewal environment variable approach and clarified that old keys are not automatically deleted.

## Review Notes
- The SealedSecret scope examples, `--merge-into` usage, generated Secret relationship, and Prometheus metric name were verified against the current Sealed Secrets documentation/source.
- The Argo CD Application manifest fields shown are valid, but production users may also need sync options or namespace creation settings depending on their cluster setup.
