# Validation Summary: How to Deploy Keycloak on Kubernetes for SSO

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Keycloak
- Kubernetes Deployments, StatefulSets, Services, Ingress, Secrets, and probes
- PostgreSQL
- OpenID Connect and SAML SSO concepts
- Flask
- Authlib
- Prometheus metrics
- OneUptime monitoring

## Sources Consulted
- Keycloak 26.6.2 release announcement: https://www.keycloak.org/2026/05/keycloak-2662-released
- Keycloak server configuration reference: https://www.keycloak.org/server/all-config
- Keycloak reverse proxy documentation: https://www.keycloak.org/server/reverseproxy
- Keycloak health checks documentation: https://www.keycloak.org/observability/health
- Keycloak distributed cache documentation: https://www.keycloak.org/server/caching
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- PostgreSQL Docker official image documentation: https://hub.docker.com/_/postgres
- Authlib Flask OpenID Connect client documentation: https://docs.authlib.org/en/latest/oauth2/client/web/flask.html

## Issues Found
- The Keycloak image tag was outdated for a 2026 post. Updated `quay.io/keycloak/keycloak:24.0` to `quay.io/keycloak/keycloak:26.6.2`, matching the current official release checked during validation.
- The deployment used the legacy `KEYCLOAK_ADMIN` and `KEYCLOAK_ADMIN_PASSWORD` variables. Replaced them with `KC_BOOTSTRAP_ADMIN_USERNAME` and `KC_BOOTSTRAP_ADMIN_PASSWORD`, which the current Keycloak documentation recommends for bootstrapping the initial admin user.
- The deployment used deprecated proxy configuration (`KC_PROXY=edge`) and did not enable HTTP behind a TLS-terminating ingress. Replaced it with `KC_HTTP_ENABLED=true` and `KC_PROXY_HEADERS=xforwarded`, and set `KC_HOSTNAME` to the public HTTPS URL.
- The readiness and liveness probes targeted port 8080. Current Keycloak exposes health endpoints on the management port 9000 by default, so the manifest now declares a `management` container port and points probes at that port.
- The high-availability section recommended the deprecated `kubernetes` cache stack with DNS_PING. Updated it to use the supported `jdbc-ping` stack, which uses the configured database for cluster discovery.
- The monitoring section implied `/metrics` and health checks were on the public Keycloak HTTP path. Updated it to clarify that metrics and health endpoints are on the management port and should be monitored internally.
- The PostgreSQL StatefulSet mounted the PVC directly at the default data directory without setting `PGDATA`. Added `PGDATA=/var/lib/postgresql/data/pgdata` so database files are stored in a subdirectory of the mounted volume.
- The prerequisites listed Helm 3 even though the guide does not use Helm. Removed Helm from the prerequisite list.

## Review Notes
- The Kubernetes examples are valid as tutorial manifests, but a production deployment should also consider PodDisruptionBudgets, NetworkPolicies, backup and restore for PostgreSQL, secret rotation, resource tuning, and whether to use the Keycloak Operator.
- The Flask/Authlib example is syntactically consistent with Authlib's Flask OIDC client pattern, but it intentionally remains minimal and does not include production session hardening.
