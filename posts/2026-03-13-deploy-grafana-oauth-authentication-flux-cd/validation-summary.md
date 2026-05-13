# Validation Summary: Deploy Grafana with OAuth Authentication Using Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets
- SOPS
- Grafana Helm chart
- Grafana OAuth / OIDC authentication
- GitHub OAuth
- Generic OAuth / OIDC providers such as Okta and Keycloak

## Sources Consulted
- Grafana GitHub OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/github/
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana configuration and environment variable expansion documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana Helm chart values and templates: https://github.com/grafana/helm-charts/tree/main/charts/grafana
- Flux HelmRelease valuesFrom documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- GitHub OAuth app creation documentation: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app

## Issues Found
- The main HelmRelease example injected `auth.github.client_secret` directly into `grafana.ini` through `valuesFrom`. Current Grafana Helm chart versions, including chart 7.x, enable `assertNoLeakedSecrets` by default and fail rendering when sensitive keys such as `auth.github.client_secret` are set explicitly. I changed the example to inject the client ID with `valuesFrom`, expose the encrypted Secret through `envFromSecret`, and set `client_secret` to `$__env{GF_AUTH_GITHUB_CLIENT_SECRET}`.
- The generic OIDC example used `${GF_AUTH_GITHUB_CLIENT_ID}` and `${GF_AUTH_GITHUB_CLIENT_SECRET}` inside `grafana.ini` without defining those environment variables in the Helm chart values. I updated the example to use generic OAuth secret key names, Flux `valuesFrom` for the client ID, `envFromSecret`, and Grafana environment variable expansion for the client secret.
- The introduction said OAuth replaces Grafana's local user database. Grafana still maintains users internally while delegating authentication to OAuth/OIDC providers. I changed the wording to say OAuth/OIDC is used instead of local username/password login.

## Review Notes
- The GitHub callback URL `/login/github`, Generic OAuth callback pattern `/login/generic_oauth`, GitHub team-based `role_attribute_path` syntax, `allowed_organizations`, and Flux `HelmRelease` API version and `valuesFrom` fields were consistent with current official documentation.
- The local environment did not have `helm` or `kubectl` installed, so CLI-based template rendering was not run. The Helm chart behavior was verified against the upstream chart values and templates.
