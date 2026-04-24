# Validation Summary: How to Restrict KubeShell to Admin Users in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- Portainer RBAC
- Portainer API
- `curl`
- `jq`
- `kubectl`
- `helm`

## Sources Consulted
- Portainer docs, General settings: https://docs.portainer.io/sts/admin/settings/general.md
- Portainer docs, `kubectl shell`: https://docs.portainer.io/user/kubernetes/kubectl.md
- Portainer docs, Kubeconfig: https://docs.portainer.io/user/kubernetes/kubeconfig.md
- Portainer docs, Roles: https://docs.portainer.io/admin/user/roles.md
- Portainer docs, Kubernetes roles and bindings: https://docs.portainer.io/advanced/kubernetes-roles-and-bindings.md
- Portainer docs, Logs: https://docs.portainer.io/sts/admin/logs.md
- Portainer docs, Activity logs: https://docs.portainer.io/sts/admin/logs/activity.md
- Portainer docs, API usage examples: https://docs.portainer.io/api/examples.md
- Portainer docs, Accessing the Portainer API: https://docs.portainer.io/api/access.md
- Portainer BE OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
- The post placed the KubeShell restriction under an environment's security settings. Current Portainer docs place it under `Settings` → `General` → `Kubernetes settings`, and changes are saved with **Apply Changes**. I corrected the navigation and save action.
- The verification example queried `/api/endpoints/1` and `.Kubernetes.Configuration.RestrictDefaultNamespace`, which is an environment setting unrelated to KubeShell. I replaced it with `/api/settings` and `.DisableKubeShell`, which is the documented global settings field in the current BE OpenAPI spec.
- The introduction and rationale overstated KubeShell as a way to bypass Portainer namespace isolation. Portainer's `kubectl shell` docs state the shell is preloaded with a `kubeconfig` for the user's context and is restricted to that user's Portainer-defined permissions. I rewrote those claims to match the documented behavior.
- The selective-access section claimed environment-level role assignment was the documented way to exempt specific non-admin users. Portainer's settings docs describe a global admin-versus-non-admin toggle and do not document a per-user or per-team allowlist for this setting, so I rewrote that section to describe the documented scope without over-claiming exemptions.
- The audit section pointed readers to `Settings` → `Authentication logs` and host-level `docker logs` greps for KubeShell activity. Portainer docs document `Logs` → `Activity` and `Logs` → `Authentication`; they do not document a dedicated KubeShell filter or those host log commands. I corrected the log navigation and removed the unsupported host log example.
- The alternative access section referred to enabling kubectl access in environment settings. Current docs document kubeconfig download controls under `Settings` → `General` → `Kubeconfig`, and users download kubeconfig from the Home page over HTTPS. I corrected the setting location and clarified that access is scoped to the user's Portainer permissions.

## Review Notes
- Portainer's public docs clearly document the KubeShell control as a global setting, but they are less explicit about how that control interacts with every built-in role combination. The revised post avoids making stronger role-specific claims than the docs support directly.
- At review time, the docs site was on `2.40 STS` while the public BE OpenAPI site marked `2.39.1` as the latest spec. The `DisableKubeShell` field is present in that spec and matches the corrected API example.
