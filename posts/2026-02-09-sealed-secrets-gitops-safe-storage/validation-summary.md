# Validation Summary: How to Use Sealed Secrets for GitOps-Safe Secret Storage in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Bitnami Sealed Secrets
- kubeseal CLI
- Helm
- Argo CD
- Flux
- GitOps workflows

## Sources Consulted
- Bitnami Sealed Secrets official README: https://github.com/bitnami-labs/sealed-secrets
- Bitnami Sealed Secrets latest release page: https://github.com/bitnami-labs/sealed-secrets/releases/latest
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/auto_sync/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The post pinned Sealed Secrets controller and kubeseal installation commands to v0.24.0. Updated them to v0.36.6, the latest release available during validation, because the official project states only the latest version is supported for production environments.
- The Helm install command used the chart default controller name, while later kubeseal examples referenced `sealed-secrets-controller`. Added `--set-string fullnameOverride=sealed-secrets-controller` so the Helm install matches kubeseal's default controller name.
- The controller log check used a label selector that is not reliable across the static manifest and Helm chart install paths. Replaced it with `kubectl logs -n kube-system deployment/sealed-secrets-controller`.
- The post described key handling as "rotation" in places where the official documentation now distinguishes automatic sealing key renewal from user secret rotation. Updated the wording to "key renewal" where appropriate.
- The backup and restore commands filtered only `sealedsecrets.bitnami.com/sealed-secrets-key=active`. Updated them to select all Sealed Secrets key secrets with `sealedsecrets.bitnami.com/sealed-secrets-key`, matching the official backup guidance.
- The re-encryption script attempted to pipe a SealedSecret through `kubectl create --dry-run=client` and then into `kubeseal`, which would not correctly re-encrypt an existing SealedSecret. Replaced it with the official `kubeseal --re-encrypt` workflow.
- The text said the private key never leaves the cluster, but the post later instructs users to back up keys outside the cluster. Changed this to say the private key stays in the cluster by default.

## Review Notes
- The Argo CD and Flux examples are structurally valid for the shown use case. For Flux, `targetNamespace: production` is compatible with the example only because the sealed secrets are also sealed for the `production` namespace; changing namespaces after sealing with strict scope would break decryption.
- The generated encrypted values in the SealedSecret example are illustrative placeholders, which is acceptable for a tutorial.
