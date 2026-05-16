# Validation Summary: How to Deploy Keycloak on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Talos Linux (Kubernetes distribution)
- Keycloak 23.0 (identity and access management)
- Kubernetes (Deployment, StatefulSet, Service, Ingress, Secret, Namespace)
- PostgreSQL 15 (database backend)
- NGINX Ingress Controller
- cert-manager (Let's Encrypt TLS)
- Prometheus Operator (ServiceMonitor)
- Keycloak Admin REST API (realm/client management via curl)

## Sources Consulted
- Keycloak 23 server configuration reference: https://www.keycloak.org/server/all-config
- Keycloak 23 hostname and proxy configuration: https://www.keycloak.org/server/hostname and https://www.keycloak.org/server/reverseproxy
- Keycloak 23 health and metrics endpoints: https://www.keycloak.org/server/health and https://www.keycloak.org/observability/metrics
- Keycloak 23 database configuration: https://www.keycloak.org/server/db
- Keycloak Admin REST API: https://www.keycloak.org/docs-api/23.0.7/rest-api/
- Keycloak container image on Quay: https://quay.io/repository/keycloak/keycloak
- Kubernetes Service / Ingress / StatefulSet API reference: https://kubernetes.io/docs/reference/
- Prometheus Operator ServiceMonitor reference: https://prometheus-operator.dev/docs/operator/api/#monitoring.coreos.com/v1.ServiceMonitor
- PostgreSQL official container image: https://hub.docker.com/_/postgres

## Issues Found
1. **Keycloak Service missing labels required by the ServiceMonitor selector.** The `ServiceMonitor` selects with `matchLabels: app: keycloak`, but `Service` selectors apply to Service object labels (not Pod labels). The Service `metadata` had no labels, so the ServiceMonitor would never have matched it. Added `labels: app: keycloak` to the Keycloak Service metadata so Prometheus discovery actually works.
2. **Apply step omitted the ingress manifest.** The post defined `keycloak-ingress.yaml` as a separate file but only applied the deployment and service. Added `kubectl apply -f keycloak-ingress.yaml` to the apply block so the ingress is actually created.

## Review Notes
- Keycloak version pin is 23.0. All flags used (`--hostname=<host>`, `--proxy=edge`, `--db=postgres`, `--db-url-host`, `--db-url-database`, `--health-enabled=true`, `--metrics-enabled=true`) are correct for Keycloak 23.x. Note for future readers: `--proxy=edge` was deprecated in Keycloak 24 (replaced by `--proxy-headers=xforwarded` plus `--hostname` taking a full URL), and the `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD` env vars were replaced by `KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` in Keycloak 26. Also from Keycloak 25 the management interface (with `/health/*` and `/metrics`) moved to a separate port (9000 by default). If/when the post is bumped to a newer Keycloak version, the args, env vars, probe ports, and ServiceMonitor port will need updating accordingly.
- The Helm v3 prerequisite is listed but no Helm chart is actually used in the post; left as-is since it is not a technical error, just an unused prerequisite.
- `--proxy=edge` implicitly enables the HTTP listener in Keycloak 23, so the `start` (production) command does not need `--http-enabled=true` here; this is consistent with the ingress terminating TLS.
- Health endpoints `/health/ready` and `/health/live` and metrics endpoint `/metrics` on port 8080 are correct for Keycloak 23.
- The ServiceMonitor requires the Prometheus Operator CRDs to be installed; this is implied but not called out as a prerequisite.
- The example realm body sets `registrationAllowed: true` — fine as a demo, but worth disabling for most production setups.
- PostgreSQL is deployed as a single-replica StatefulSet without backups; the post acknowledges backups are needed in the production-considerations section.
