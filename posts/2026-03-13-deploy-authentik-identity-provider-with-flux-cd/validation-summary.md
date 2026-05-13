# Validation Summary: How to Deploy Authentik Identity Provider with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Authentik
- Flux CD
- Kubernetes
- Helm and HelmRelease
- PostgreSQL
- Redis
- Grafana Generic OAuth / OIDC

## Sources Consulted
- Authentik Kubernetes installation documentation: https://docs.goauthentik.io/docs/install-config/install/kubernetes/
- Authentik automated install documentation: https://docs.goauthentik.io/install-config/automated-install/
- Authentik configuration documentation: https://docs.goauthentik.io/install-config/configuration/
- Authentik Grafana integration documentation: https://docs.goauthentik.io/integrations/services/grafana/
- Authentik Helm chart source and values: https://github.com/goauthentik/helm
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/tree/main/bitnami/postgresql
- Bitnami Redis Helm chart values: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/generic-oauth/

## Issues Found
- The Authentik HelmRelease used `authentik.existingSecret` and `existingSecretKey`, which are not valid values for the pinned 2024.x Authentik chart range. Replaced this with Flux `valuesFrom` entries targeting `authentik.secret_key` and the bootstrap settings.
- The Authentik application would not receive the bundled PostgreSQL and Redis passwords. Added `valuesFrom` mappings for `authentik.postgresql.password` and `authentik.redis.password` so Authentik can connect to the chart-managed backends.
- The Authentik server ingress values used a host object with nested paths, but the 2024.x Authentik chart expects `server.ingress.hosts` as a list of host strings and `paths` / `pathType` as separate fields. Updated the snippet to match the chart.
- The Flux Kustomization example was named `clusters/my-cluster/authentik/kustomization.yaml`, which can collide with kustomize's own `kustomization.yaml` file in the rendered path. Changed the example path to `clusters/my-cluster/authentik-kustomization.yaml`.
- The setup step said Authentik would prompt for initial setup even though bootstrap credentials were configured. Updated the text to log in as `akadmin` with the bootstrap password, while preserving the initial setup URL for deployments that omit bootstrap values.
- The Grafana OAuth authorization URL incorrectly included the application slug. Updated it to Authentik's documented global authorization endpoint and added the required Grafana redirect URI.

## Review Notes
- The post intentionally pins the Authentik Helm chart to the 2024.x series. The corrected values are accurate for that version range, but future updates to a 2025.x or 2026.x chart should re-check the chart values because the Authentik Helm chart has changed across releases.
- Local `helm`, `kubectl`, and `flux` binaries were not installed in the review environment, so CLI validation was performed against official documentation and upstream source rather than local `--help` output.
