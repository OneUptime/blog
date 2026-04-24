# Validation Summary: Portainer vs Dockge: Docker Compose Manager Comparison

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- Dockge
- Docker Compose
- Docker Swarm
- Kubernetes
- Portainer API

## Sources Consulted
- Dockge README: https://github.com/louislam/dockge
- Dockge official `compose.yaml`: https://raw.githubusercontent.com/louislam/dockge/master/compose.yaml
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer overview: https://docs.portainer.io/readme.md
- Portainer environments: https://docs.portainer.io/admin/environments/add.md
- Portainer users: https://docs.portainer.io/admin/user/users.md
- Portainer roles: https://docs.portainer.io/sts/admin/user/roles.md
- Portainer stacks: https://docs.portainer.io/user/docker/stacks/add.md
- Portainer stack editing: https://docs.portainer.io/user/docker/stacks/edit.md
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks.md
- Portainer API access: https://docs.portainer.io/api/access.md
- Portainer API spec (CE 2.39.1): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer backup contents: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include.md
- Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent.md

## Issues Found
- The Dockge deployment snippet used the obsolete top-level Compose `version` field. I removed it to match current Docker Compose guidance.
- The Dockge deployment snippet omitted `DOCKGE_STACKS_DIR=/opt/stacks`, which is part of Dockge's current documented setup. I added it.
- The post said Dockge had no multi-host support. Dockge's official README now documents multiple agents support for managing stacks on different Docker hosts, so I corrected the comparison table.
- The post presented Portainer RBAC and stack webhooks as general features. Portainer's docs mark full RBAC and stack webhooks as Business Edition features, so I added those caveats where they materially affect the comparison.
- The table row claiming Portainer had no external stack file support was too broad and inaccurate given Portainer's Git-based stack deployments. I replaced it with a more precise host-filesystem-storage distinction that matches the rest of the article.
- The resource-overhead numbers were undocumented and deployment-dependent. I removed that row because it was not verifiable from official documentation.
- The file-storage explanation implied Portainer always stores stack definitions internally and requires export for version control. I corrected this to distinguish between Portainer-managed stack definitions and Git-based stack deployments.
- The "Portainer capabilities" block was labeled as `bash` even though it was not executable shell code. I changed it to `text`.
- The Portainer API example claimed to export stack definitions but only listed stack names, and it used an older auth style. I replaced it with a current example using `X-API-Key` and `/api/stacks/{id}/file` to export stored stack file contents.

## Review Notes
- Portainer Community Edition and Business Edition differ meaningfully for access control and webhook features; those edition boundaries are now called out in the post.
- Specific memory or resource-footprint figures should only be included if they are backed by reproducible measurements, since they vary by deployment and workload.
