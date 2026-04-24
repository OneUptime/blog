# Validation Summary: Portainer vs Yacht: Lightweight Docker GUI Comparison - Docker Gui

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- Yacht
- Docker
- Docker Compose
- Docker Swarm
- Kubernetes

## Sources Consulted
- Portainer documentation home: https://docs.portainer.io/
- Portainer environments documentation: https://docs.portainer.io/admin/environments/add
- Portainer groups documentation: https://docs.portainer.io/admin/environments/groups
- Portainer access control documentation: https://docs.portainer.io/advanced/access-control
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer stack webhooks documentation: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer app templates documentation: https://docs.portainer.io/advanced/app-templates
- Yacht documentation home: https://dev.yacht.sh/docs/
- Yacht install documentation: https://dev.yacht.sh/docs/Installation/Install/
- Yacht projects documentation: https://dev.yacht.sh/docs/Projects/Projects
- Yacht user settings documentation: https://dev.yacht.sh/docs/Pages/User_Settings/
- Yacht official GitHub repository README: https://github.com/SelfhostedPro/Yacht
- Docker Compose file reference for `version`: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
1. **The comparison table overstated Yacht's current maintenance state and understated its Compose support.** The official Yacht repository README says the current application "has not been updated in a while" and points readers to an in-progress rewrite, while Yacht's docs still describe Docker Compose compatibility and project management. I updated the table from a generic "Moderate" / "Limited" description to wording that reflects the current documented state more accurately.
2. **User-management claims were inaccurate for both products.** The original post said Portainer had "Full RBAC" and Yacht had "Basic" user management. Current Portainer docs distinguish between basic users/groups in Community Edition and RBAC in Business Edition. Current Yacht docs expose login and user settings for the default user, but still list "User Management" as a future feature. I corrected the table and the Portainer capability bullets to match that split.
3. **Portainer webhook and RBAC claims needed edition scoping.** Portainer's official docs mark stack webhooks and RBAC as Business Edition features. The post previously presented them as unqualified Portainer features. I updated those references in both the capability list and the recommendation section.
4. **The Yacht Compose snippet used an obsolete Compose field.** Docker's current Compose documentation marks the top-level `version` field as obsolete and only retained for backward compatibility. I removed the `version` line from the YAML example and aligned the image reference with Yacht's documented Docker/Compose install instructions.
5. **The RAM figures were not backed by official documentation.** I did not find official Portainer or Yacht documentation that publishes canonical `~100MB` and `~50MB` RAM footprints for this comparison. I replaced those exact numbers, and the related "Lower resource usage" wording, with wording grounded in documented scope and features instead of unsupported memory estimates.

## Review Notes
- Portainer documentation currently shows active support for Docker, Docker Swarm, Kubernetes, multiple environments, and the API, with some access-control and automation features varying by edition.
- Yacht's current official docs still document `selfhostedpro/yacht` for Docker/Compose installation, while its Podman docs use a `ghcr.io` image path. The post now matches the Docker/Compose install path used in Yacht's install docs.
- Yacht's official repository README explicitly warns that the current application has not been updated in a while and that a rewrite is underway. That maintenance caveat is worth keeping in mind if the post is revisited later.
