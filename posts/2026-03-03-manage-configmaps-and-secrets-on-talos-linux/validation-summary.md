# Validation Summary: How to Manage ConfigMaps and Secrets on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (ConfigMaps, Secrets)
- kubectl CLI
- talosctl CLI
- Sealed Secrets (Bitnami)
- kubeseal CLI
- External Secrets Operator
- HashiCorp Vault (as a backend example)
- Helm

## Sources Consulted
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl create configmap reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-configmap-em-
- kubectl create secret reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-secret-em-
- Talos Linux v1alpha1 configuration reference (cluster.secretboxEncryptionSecret): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- talosctl gen secrets / talosctl apply-config: https://www.talos.dev/latest/reference/cli/
- Sealed Secrets Helm chart: https://github.com/bitnami-labs/sealed-secrets/tree/main/helm/sealed-secrets
- kubeseal CLI install docs: https://github.com/bitnami-labs/sealed-secrets#installation
- External Secrets Operator documentation: https://external-secrets.io/
- External Secrets Operator API reference (v1 GA): https://external-secrets.io/latest/api/

## Issues Found
- The External Secrets Operator manifests (ClusterSecretStore and ExternalSecret) used `apiVersion: external-secrets.io/v1beta1`. The v1 API graduated to GA in early 2025 and v1beta1 is deprecated. Updated both manifests to `apiVersion: external-secrets.io/v1` so readers using current ESO releases get the supported, non-deprecated API.

## Review Notes
- The `secretboxEncryptionSecret` field is correctly placed under `cluster:` in the Talos machine config and is the documented mechanism for enabling Kubernetes etcd secret encryption on Talos. The `talosctl gen secrets` command does generate a secrets bundle (containing this key) used as input to cluster config generation; the post's flow is plausible though brief.
- The Sealed Secrets controller helm chart, repo URL (`https://bitnami-labs.github.io/sealed-secrets`), and the default `kube-system` install namespace are all current.
- The kubectl create commands (configmap, secret generic, secret tls, secret docker-registry) and their flags match current kubectl documentation.
- The Secret YAML example correctly notes that `data` values must be base64-encoded and presents `stringData` as the cleaner alternative.
- The claim that mounted ConfigMap/Secret volumes update automatically (with a short delay) while env-var consumers do not is accurate per upstream Kubernetes documentation.
