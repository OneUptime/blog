# Validation Summary: How to Deploy Keycloak on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Keycloak (Identity and Access Management)
- Rancher (Kubernetes management platform)
- Bitnami Keycloak Helm chart
- PostgreSQL (Bitnami subchart)
- NGINX Ingress Controller
- cert-manager (Let's Encrypt)
- Longhorn (storage)
- OIDC / OAuth2 / SAML
- Keycloak Admin REST API

## Sources Consulted
- Keycloak Upgrading Guide: https://www.keycloak.org/docs/latest/upgrading/index.html
- Keycloak Reverse Proxy Guide: https://www.keycloak.org/server/reverseproxy
- Keycloak All Configuration: https://www.keycloak.org/server/all-config
- Bitnami Keycloak chart values: https://github.com/bitnami/charts/blob/main/bitnami/keycloak/values.yaml
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Authentication Provider docs (Keycloak OIDC)

## Issues Found
1. **Deprecated/removed `KC_PROXY` env var** — The post used `KC_PROXY=edge`, which was deprecated in Keycloak 24 and removed in Keycloak 26 (replacement: `KC_PROXY_HEADERS`). Since the Bitnami chart now ships Keycloak 26+, this would cause startup failure. Fixed by replacing with `KC_PROXY_HEADERS=xforwarded` (correct value for X-Forwarded-* headers from nginx ingress).

2. **Non-existent Rancher role `cluster-operator`** — The post mapped a Keycloak group to a Rancher role called `cluster-operator`, which is not a built-in Rancher cluster role. Rancher's default cluster roles are `cluster-owner` and `cluster-member`. Fixed by changing `cluster-admins` → `cluster-owner` (the appropriate full-control role) and `ops-team` → `cluster-member`.

## Review Notes
- The Bitnami chart values (`auth.adminUser`, `postgresql.auth.*`, `ingress.ingressClassName`, `ingress.hostname`, `extraEnvVars`, `replicaCount`) are all correct per the current chart `values.yaml`.
- The Keycloak 17+ (Quarkus) URL paths are correct: admin console at `/admin` and issuer URL at `/realms/<realm>` (the legacy `/auth/` prefix was dropped).
- The nginx-ingress annotation `nginx.ingress.kubernetes.io/proxy-buffer-size: "128k"` is appropriate for Keycloak's large auth headers.
- Storing `adminPassword` and PostgreSQL password as plain values in a Helm values file is fine for a tutorial but should be flagged as a security concern in production — readers should use Sealed Secrets, External Secrets Operator, or an existing secret reference (`auth.existingSecret`) instead.
- The "Generic OIDC" / "OIDC (OpenID Connect)" provider in Rancher is correct; Rancher also offers a "Keycloak (OIDC)" specific provider which can be used interchangeably for this use case.
- `cluster-admin`, `view`, and `edit` referenced in the role mapping are upstream Kubernetes ClusterRoles, not Rancher-specific roles. They are still valid bind targets via Rancher project/cluster bindings.
