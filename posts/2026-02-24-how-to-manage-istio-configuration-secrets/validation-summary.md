# Validation Summary: How to Manage Istio Configuration Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio RequestAuthentication
- Kubernetes Secrets and RBAC
- cert-manager
- External Secrets Operator
- HashiCorp Vault
- Bitnami Sealed Secrets
- Prometheus Operator alert rules

## Sources Consulted
- Istio secure ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio RequestAuthentication API reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager ACME DNS01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator Vault provider documentation: https://external-secrets.io/v2.2.0/provider/hashicorp-vault/
- Kubernetes kubectl create secret reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Grafana cert-manager integration metrics reference: https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-cert-manager/

## Issues Found
- The post described JWT keys as signing keys. Istio `RequestAuthentication` validates JWT signatures with JWKS verification keys, so the wording was changed to "JWT verification keys."
- The cert-manager CloudDNS solver example omitted the Google Cloud DNS service account secret reference shown in cert-manager's DNS01 documentation. Added `serviceAccountSecretRef` to make the example deployable for the documented credential-based setup.
- External Secrets Operator examples used `external-secrets.io/v1beta1`. Current official examples and API documentation use `external-secrets.io/v1`, so both `ExternalSecret` and `ClusterSecretStore` snippets were updated.
- The local JWKS section suggested creating a Kubernetes Secret and then referencing it from `RequestAuthentication`. Istio's API supports `jwksUri` or inline `jwks`, not a Kubernetes Secret reference. The section now says to keep the source JWKS out of git and render it into the inline `jwks` field during deployment.
- The RBAC example referenced the removed `jwt-jwks` Secret. It now references `external-api-credentials`, which is a Secret created by the External Secrets Operator example.
- The TLS rotation script attempted to recreate a Secret by piping live Secret YAML through `sed`, which can preserve server-managed metadata and fail on create/apply. It now recreates the original Secret name directly with `kubectl create secret tls`.

## Review Notes
The Prometheus alert expression is syntactically valid, but production alerting should usually filter by certificate namespace/name and pair expiry alerts with readiness alerts such as `certmanager_certificate_ready_status`.
