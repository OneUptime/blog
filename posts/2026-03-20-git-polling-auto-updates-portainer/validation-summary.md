# Validation Summary: How to Configure Git Polling for Auto-Updates in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Git / GitOps
- Docker Compose stacks
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer docs: Inspect or edit a stack - https://docs.portainer.io/user/docker/stacks/edit
- Portainer docs: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer docs: API usage examples - https://docs.portainer.io/api/examples
- Portainer API spec: CE 2.39.1 / CE 2.41.0 - https://api-docs.portainer.io/?edition=ce&version=2.39.1 and https://api-docs.portainer.io/versions/ce/2.41.0/stacks.yaml
- Portainer source: `AutoUpdateFieldset.tsx` and `IntervalField.tsx` for current UI labels and minimum polling interval - https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/AutoUpdateFieldset/AutoUpdateFieldset.tsx and https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/AutoUpdateFieldset/IntervalField.tsx
- Portainer source: `GitReferenceCard.tsx`, `GitPullButton.tsx`, `EditGitSettingsButton.tsx`, and `InnerForm.tsx` for current stack-detail labels and action names - https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/GitReferenceCard.tsx and https://github.com/portainer/portainer/blob/develop/app/react/common/stacks/GitPullButton.tsx and https://github.com/portainer/portainer/blob/develop/app/react/common/stacks/EditGitSettingsButton.tsx and https://github.com/portainer/portainer/blob/develop/app/react/common/stacks/EditGitSettings/InnerForm.tsx

## Issues Found
- The post used outdated or inexact UI terms for current Portainer versions. I updated the instructions to use the current labels: `GitOps updates`, `Mechanism`, `Fetch interval`, `Edit Git settings`, and `Save settings`.
- The change-detection explanation implied Portainer compares local `HEAD` to the remote branch. I corrected this to Portainer's documented behavior: it compares the latest remote commit hash with the deployed commit hash stored in Portainer's database.
- The stack-detail section listed unsupported field names such as `GitOps status` and `Current commit`. I updated this to the current labels Portainer exposes for Git-managed stacks: `Repo`, `Ref`, `File`, `Commit`, `Auto-update`, and `Interval`.
- The API example used the wrong HTTP method and the wrong authentication header pattern for access tokens. I corrected it from `POST` with `Authorization: Bearer` to `PUT` with `X-API-Key`, and updated the JSON body to current field names (`RepullImageAndRedeploy`, `Prune`).
- The webhook comparison used the claim `Works behind NAT`, which is too absolute. I rephrased the comparison to the actual network constraint: whether Portainer can operate without inbound access.
- The conclusion described polling as `zero-configuration` and working in `any network environment`. I narrowed this to a technically accurate description that matches Portainer's documented behavior.

## Review Notes
- Portainer's fetch interval uses duration strings such as `5m`, `24h`, and `6h40m`, and the current UI enforces a minimum interval of `1m`.
- The interval recommendations in the post are editorial guidance, not Portainer defaults documented in the product docs.
- The current API still exposes deprecated `PullImage` fields in the schema, but `RepullImageAndRedeploy` is the current field and was used in the corrected example.
