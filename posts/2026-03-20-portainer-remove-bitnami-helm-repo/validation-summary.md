# Validation Summary: How to Remove the Default Bitnami Helm Repository in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Kubernetes
- Helm
- `curl`
- `jq`

## Sources Consulted
- Portainer General settings documentation: https://docs.portainer.io/admin/settings/general
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer source for global settings updates: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source for user Helm repositories: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_helm_repos.go
- Portainer source for the Kubernetes settings UI: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/SettingsView/KubeSettingsPanel/KubeSettingsPanel.tsx
- Portainer source for Kubernetes settings validation: https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/SettingsView/KubeSettingsPanel/validation.ts
- Helm chart repository format documentation: https://helm.sh/docs/topics/chart_repository/

## Issues Found
- The UI instructions were incorrect. The original post described a per-environment settings flow with a gear icon, a repository list entry, and a trash-can delete action. Portainer manages the default Bitnami repository from `Settings > General > Kubernetes settings > Helm repository`, so the post was updated to use the correct global settings page and action.
- The API examples were incorrect. The original post used `/api/endpoints/{id}/kubernetes/helm/repositories`, but current Portainer manages the default global Helm repository through `GET /api/settings` and `PUT /api/settings` with the `HelmRepositoryURL` field. The examples were rewritten accordingly.
- The bulk-removal section was based on the wrong scope. The default Bitnami repository is not a per-environment object, so there is no need to iterate through Kubernetes environments. That section was rewritten to explain that the setting is global to the Portainer instance.
- The replacement example used the wrong endpoint and payload. It originally posted `url` and `name` to an environment-scoped route. It was corrected to update `HelmRepositoryURL` via `PUT /api/settings`, and the text now notes that Portainer validates the replacement URL as a real Helm chart repository.
- The policy wording overstated what this change enforces. Removing the global Bitnami repository does not prevent users from adding repositories under `My account > Helm repositories`. The post now accurately describes the change as replacing or removing the global default rather than enforcing an approved-repositories-only control.

## Review Notes
- Verified against current Portainer documentation and upstream source on 2026-04-24.
- Portainer still supports JWT authentication via `/api/auth`, but the current documentation recommends personal access tokens in the `X-API-Key` header, so the updated examples use API keys.
- Portainer validates Helm repository URLs by downloading and parsing the repository `index.yaml`, so replacement URLs must be reachable from the Portainer server.
