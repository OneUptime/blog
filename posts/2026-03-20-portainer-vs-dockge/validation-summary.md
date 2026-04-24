# Validation Summary: Portainer vs Dockge: Which Docker Stack Manager Should You Use?

## Status
validated

## Post Type
Comparison guide / tutorial

## Technologies Covered
- Portainer CE / BE
- Dockge
- Docker Engine
- Docker Compose
- Portainer API

## Sources Consulted
- Dockge README and installation/docs: https://github.com/louislam/dockge
- Dockge raw README used for feature and install verification: https://raw.githubusercontent.com/louislam/dockge/master/README.md
- Portainer CE install docs for Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer requirements and ports documentation: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer users documentation: https://docs.portainer.io/admin/user/users
- Portainer roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer authentication overview: https://docs.portainer.io/admin/settings/authentication
- Portainer LDAP authentication docs: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer add-stack docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer edit-stack docs: https://docs.portainer.io/user/docker/stacks/edit
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI spec used to verify the stack-create endpoint: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Compose `version` deprecation docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockge GitHub repo metadata: https://api.github.com/repos/louislam/dockge
- Portainer GitHub repo metadata: https://api.github.com/repos/portainer/portainer

## Issues Found
1. **Portainer CE feature rows were incorrect.** The table said multi-user access was BE-only and that LDAP/SSO was BE-only. Current Portainer docs show CE supports multiple users, LDAP, and OAuth, while RBAC is the BE-only feature. Updated the table to reflect `Multi-user access = Yes`, `RBAC = No (BE only)`, and `LDAP/SSO = Yes`.
2. **The Portainer install example was not aligned with the current official install docs.** Portainer’s current Docker install page uses `portainer/portainer-ce:sts` and documents port `8000` for Edge-agent tunnel support. Updated the command accordingly and noted that port `8000` is optional unless Edge Agents are used.
3. **Compose examples used the obsolete top-level `version` field.** Docker’s current Compose docs mark the top-level `version` property as obsolete. Removed `version: '3.8'` from the Dockge file example and the Portainer API payload example.
4. **Monitoring/resource usage sections contained overly specific claims that were not well-supported by the official docs.** The post claimed Dockge showed CPU/memory percentages and gave fixed `docker stats` memory numbers for both tools. Replaced those with technically safe guidance that tells readers to measure on their own host and avoids undocumented fixed numbers.
5. **The team-environment comparison overstated Dockge’s limitations.** Current Dockge documentation includes multiple-agent support across different Docker hosts. Updated the scenario text so it still correctly favors Portainer for governance and access control without incorrectly claiming Dockge cannot handle multiple environments at all.
6. **Community/support and migration details needed refreshes.** Updated GitHub star counts, replaced less authoritative community references with official project channels, and clarified that Git-managed Portainer stacks must be detached from Git before direct in-UI editing/copying.

## Review Notes
- Portainer’s docs currently recommend the `:sts` image tag in the CE Docker install example. The post does not discuss Portainer’s STS vs LTS lifecycle policy, so readers choosing a production deployment may want to consult the lifecycle and release-policy docs before pinning an image tag.
- Portainer external auth has an edition nuance: LDAP and OAuth are documented for general Portainer use, while Microsoft Active Directory and RBAC are explicitly documented as Business Edition features.
- Dockge remains compose-first and file-first even though it now supports multiple agents; the article’s overall framing of Dockge as the simpler, narrower tool remains accurate after the corrections above.
