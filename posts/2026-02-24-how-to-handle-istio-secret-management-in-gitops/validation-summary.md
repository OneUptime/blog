# Validation Summary: How to Handle Istio Secret Management in GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway TLS configuration
- Kubernetes Secrets
- Bitnami Sealed Secrets and kubeseal
- SOPS with age
- Flux CD Kustomization decryption
- Argo CD config management plugins
- External Secrets Operator
- AWS Secrets Manager
- cert-manager

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Istio secure ingress gateway documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- SOPS documentation: https://github.com/age-sops/sops
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Argo CD config management plugin documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The Argo CD SOPS example used the deprecated and removed `argocd-cm` `configManagementPlugins` configuration style. Updated it to show a current sidecar `ConfigManagementPlugin` configuration file mounted at `/home/argocd/cmp-server/config/plugin.yaml`.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated `SecretStore` and `ExternalSecret` examples to the current `external-secrets.io/v1` API version used in the latest official documentation.
- The Sealed Secrets rotation section used `kubeseal --re-encrypt` as if it rotated the TLS certificate material. Updated the section to create a new TLS Secret manifest and seal it, because official Sealed Secrets documentation states re-encryption is not a substitute for rotating actual secret values.
- The cert-manager rotation statement said renewals happen with no manual intervention. Tightened the wording to "under normal conditions" and clarified that cert-manager avoids manually committing new certificate material.
- Replaced "Mozilla SOPS" with "SOPS" because the current upstream project is maintained under the age-sops organization.

## Review Notes
The snippets are intentionally minimal. Production deployments still need environment-specific details such as service account annotations for AWS IRSA, Argo CD repo-server sidecar wiring, cert-manager issuer configuration, and namespace/RBAC alignment for Istio gateway secret access.
