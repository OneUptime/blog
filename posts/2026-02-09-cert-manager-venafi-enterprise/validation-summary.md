# Validation Summary: How to Configure cert-manager with Venafi as an Enterprise Certificate Issuer

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- cert-manager
- cert-manager Issuer, ClusterIssuer, and Certificate resources
- Venafi Trust Protection Platform / CyberArk Certificate Manager Self-Hosted
- Venafi as a Service / CyberArk Certificate Manager SaaS
- kubectl

## Sources Consulted
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Venafi configuration documentation: https://cert-manager.io/v1.0-docs/configuration/venafi/
- cert-manager annotations reference: https://cert-manager.io/docs/reference/annotations
- cert-manager Venafi Cloud upgrade notes for zone syntax: https://cert-manager.io/docs/releases/upgrading/upgrading-1.2-1.3
- CyberArk/Venafi Kubernetes integration documentation: https://docs.venafi.cloud/integrations/kubernetes/t-Kubernetes-configuring/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The TPP credentials secret was created only in the `cert-manager` namespace, but a namespaced `Issuer` resolves referenced secrets in its own namespace. Added a `production` namespace secret command for the `Issuer` example and kept the `cert-manager` namespace command for `ClusterIssuer`.
- The TPP username example used an email-style username. Updated examples to use the documented identity-provider format, `local:tpp-user`.
- The VaaS zone example described the zone as only an application name. Updated it to the current application and issuing-template format, `Kubernetes Production\\Default`.
- The VaaS API URL used `https://api.venafi.cloud/v1`. Updated it to the current documented base URL, `https://api.venafi.cloud/`.
- The custom fields example used unsupported arbitrary `venafi.io/*` annotations. Replaced them with the documented `venafi.cert-manager.io/custom-fields` JSON array annotation.
- The credential rotation command omitted the namespace, which could update the wrong secret. Added `-n cert-manager` to match the ClusterIssuer examples.
- Troubleshooting examples used the old VaaS URL and email-style TPP username. Updated both for consistency with current documentation.

## Review Notes
The in-tree Venafi issuer remains available in cert-manager, although current documentation increasingly uses CyberArk Certificate Manager names for the same product family. The post is technically valid after the corrections above, but future revisions could mention `caBundleSecretRef` and access-token based TPP authentication, which are supported by newer cert-manager APIs.
