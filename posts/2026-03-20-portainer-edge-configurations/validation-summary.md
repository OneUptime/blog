# Validation Summary: How to Store Edge Configurations in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Configurations
- Portainer Edge Stacks
- Docker Compose / Compose Specification
- NGINX

## Sources Consulted
- Portainer official documentation, Edge Configurations: https://docs.portainer.io/user/edge/configurations
- Portainer official documentation, Edge Stacks: https://docs.portainer.io/user/edge/stacks
- Portainer official documentation, Why do we recommend using the Edge Agent instead of the traditional Agent?: https://docs.portainer.io/faqs/getting-started/why-do-we-recommend-using-the-edge-agent-instead-of-the-traditional-agent
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, Bind mounts: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs, Secrets in Compose: https://docs.docker.com/compose/how-tos/use-secrets/
- NGINX official documentation, Example nginx configuration: https://nginx.org/en/docs/example.html

## Issues Found
- The post originally described Edge Configurations as pasting file contents directly into Portainer. Current Portainer documentation describes uploading a ZIP package containing the configuration files, so the creation steps were corrected.
- The post originally used full file paths as the deployment target in Step 3. Current Portainer documentation describes a target directory, so the examples and explanation were corrected to show directory-based deployment.
- The update workflow originally implied editing configuration contents directly. It was changed to uploading an updated ZIP package or adjusting the configuration settings.
- The synchronization section listed specific per-endpoint statuses that were not documented on the current Edge Configurations page. It was rewritten to describe the documented rollout progress view without unsupported status names.
- The Edge Stack example used the obsolete top-level Compose `version` field. It was removed to align the example with the current Compose specification.
- The best-practices section recommended `Portainer Secrets`, which was too broad for this cross-platform edge context. It was changed to recommend the platform's native secret mechanism or another dedicated secret manager instead.
- The conclusion overclaimed that Edge Configurations eliminate the need for Ansible. It was softened to a narrower claim about reducing SSH-based distribution of application configuration files.

## Review Notes
- Edge Configurations are only available in Portainer Business Edition.
- Portainer supports both general configurations and device-specific configurations keyed by `PORTAINER_EDGE_ID`; the post now mentions both, while remaining focused on the general configuration workflow.
- The NGINX and Compose snippets are syntactically valid examples, but the host paths used in the stack file must match the target directory and filenames contained in the uploaded ZIP package.
