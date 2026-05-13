# Validation Summary: How to Deploy Dex OIDC Provider with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Dex
- OpenID Connect (OIDC)
- OAuth2
- GitHub OAuth connector
- Kubernetes
- Kubernetes Secrets and RBAC
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Helm
- Grafana Generic OAuth

## Sources Consulted
- Dex Getting Started and Helm chart reference: https://dexidp.io/docs/getting-started/
- CNCF Dex project page: https://www.cncf.io/projects/dex/
- Dex sample configuration: https://github.com/dexidp/dex/blob/master/config.yaml.dist
- Dex GitHub connector documentation: https://dexidp.io/docs/connectors/github/
- Dex storage documentation: https://dexidp.io/docs/configuration/storage/
- Dex Helm chart values and templates: https://github.com/dexidp/helm-charts/tree/master/charts/dex
- Dex Helm chart repository index: https://charts.dexidp.io/index.yaml
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Grafana Generic OAuth documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana configuration variable expansion documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Kubernetes Secret environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/

## Issues Found
- The Grafana client Secret used the key `grafana-client-secret`, but Dex's `secretEnv: GRAFANA_CLIENT_SECRET` requires an environment variable with that exact name. Changed the `kubectl create secret` command to create `GRAFANA_CLIENT_SECRET`.
- The Dex HelmRelease pinned the chart to `>=0.17.0 <0.18.0`, while the current official chart index is on the 0.24.x series. Updated the example to `>=0.24.0 <0.25.0`.
- `web.http` was set to the integer `5556`, but Dex configuration expects an address string. Changed it to `0.0.0.0:5556`.
- The GitHub group role example checked for `my-github-org:admins` but did not specify team name formatting. Added `teamNameField: slug` so the group claim aligns with a slug-style team name.
- The static password hash did not validate against the documented password `AdminPassword123!`. Replaced it with a bcrypt hash that matches that password and corrected the generation command.
- The Grafana example used `${GRAFANA_CLIENT_SECRET}`. Grafana supports this shorthand, but changed it to the documented `$__env{GRAFANA_CLIENT_SECRET}` form for clarity.
- The best-practice note said updating a Kubernetes Secret would make Flux roll Dex pods. Kubernetes environment variables from Secrets are not updated in running containers, so the note now says to restart Dex pods after rotating environment-based secrets.
- The best-practice note said to add the `groups` scope to connectors. Clarified that downstream clients request the `groups` scope and connectors must be configured to provide group claims.
- The introduction described a "static password connector"; Dex documents this as the built-in password database. Updated the wording.
- The introduction said Dex was developed by CNCF. Updated the wording to describe Dex as a CNCF Sandbox project, matching CNCF's project page.

## Review Notes
The tutorial still uses manually created Kubernetes Secrets for brevity. For a stricter GitOps workflow, those Secrets should be managed with a sealed/encrypted secret workflow such as SOPS, Sealed Secrets, or External Secrets.
