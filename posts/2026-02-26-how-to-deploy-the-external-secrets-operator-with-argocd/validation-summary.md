# Validation Summary: How to Deploy the External Secrets Operator with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Applications, sync waves, diff customization, and custom health checks
- External Secrets Operator
- Kubernetes CustomResourceDefinitions, Secrets, ServiceAccounts, and RBAC
- Helm chart configuration
- AWS Secrets Manager with IRSA
- HashiCorp Vault Kubernetes authentication
- Google Secret Manager with Workload Identity
- Kustomize overlays

## Sources Consulted
- External Secrets Operator Helm chart repository index: https://charts.external-secrets.io/index.yaml
- External Secrets Operator latest Helm chart values and CRD schemas: https://github.com/external-secrets/external-secrets/releases/download/helm-chart-2.5.0/external-secrets-2.5.0.tgz
- External Secrets Operator getting started documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator Google Secret Manager provider documentation: https://external-secrets.io/latest/provider/google-secrets-manager/
- External Secrets Operator stability and support documentation: https://external-secrets.io/v1.0.0/introduction/stability-support/
- Argo CD custom resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD compare options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/

## Issues Found
- The post pinned External Secrets Operator chart version `0.9.11`, which is no longer a current supported ESO release. Updated the Helm `targetRevision` values to `2.5.0` and the Git tag example to `v2.5.0`.
- The manifests used `external-secrets.io/v1beta1`. The current chart marks v1beta1 serving as deprecated/backward-compatible only, so the examples were updated to `external-secrets.io/v1`.
- The CRD-only Helm example claimed to install only CRDs but did not disable the operator deployment or controller RBAC. Added `createOperator: false` and `rbac.create: false` while keeping webhook, cert controller, and service account creation disabled.
- The Argo CD diff section implied ESO-created Secrets are always managed by Argo CD and will always appear OutOfSync. Reworded it to clarify that Argo CD should normally manage the ExternalSecret, and narrowed the `ignoreDifferences` example to a specific Secret and namespace for cases where a Secret is also declared in Git.

## Review Notes
The ESO template example is syntactically valid, but teams should restrict who can create or edit templated ExternalSecret resources because templates execute in the controller context and can become a sensitive policy boundary.
