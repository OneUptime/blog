# Validation Summary: How to Remove Containers in Portainer

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Engine API
- Shell scripting (`bash`)
- `curl`

## Sources Consulted
- Docker CLI reference for `docker container rm`: https://docs.docker.com/reference/cli/docker/container/rm/
- Docker CLI reference for `docker container stop`: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker CLI reference for `docker container prune`: https://docs.docker.com/reference/cli/docker/container/prune/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Engine API reference (container delete semantics): https://docs.docker.com/reference/api/engine/version/v1.24/
- Portainer documentation for removing containers: https://docs.portainer.io/user/docker/containers/remove
- Portainer documentation for viewing container actions: https://docs.portainer.io/user/docker/containers/view
- Portainer documentation for removing stacks: https://docs.portainer.io/user/docker/stacks/remove
- Portainer documentation for Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer documentation for accessing the API: https://docs.portainer.io/api/access
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer official API docs / Swagger spec: https://api-docs.portainer.io/
- Portainer host details documentation: https://docs.portainer.io/user/docker/host/details

## Issues Found
1. **Force removal was described incorrectly**: The post said force remove was equivalent to stop + remove. Docker documents `docker rm --force` as sending `SIGKILL` and then removing the container. I updated the section to use the documented Portainer flow of stopping the container before removal, and clarified the exact Docker CLI behavior.
2. **Bulk removal steps referenced an undocumented UI toggle**: The post told readers to enable **Show stopped containers**. Current Portainer container-removal docs document checkbox selection and **Remove**, but not that toggle in the removal workflow. I simplified the steps to the documented bulk-removal flow.
3. **Portainer volume-removal wording was inaccurate**: The post referred to a **Remove associated volumes** option in the container removal dialog. Current Portainer docs describe automatically removing **non-persistent volumes**. I updated the wording to match the official documentation and the actual behavior.
4. **The prune workflow referenced a host exec console that Portainer does not document**: The post said `docker container prune` could be run via Portainer's **Exec** console on the Docker host. Portainer documents console access for containers, while host docs cover host details and optional file browsing, not a host shell. I corrected this to say the prune command should be run directly on the Docker host.
5. **The stack-removal section overstated current Portainer behavior**: The post claimed stack-defined networks are removed and instructed readers to use a **Remove associated volumes** checkbox when deleting a stack. Current Portainer stack-removal docs do not document that checkbox. I rewrote the section to keep the accurate part that named volumes are not removed automatically, and directed cleanup of unused volumes through the documented **Volumes** workflow.
6. **The RBAC note omitted an edition requirement**: Portainer documents RBAC as a Business Edition feature. I updated the post to say **Portainer Business Edition's RBAC**.
7. **The API example used Portainer's legacy HTTP port**: Portainer's API access docs document HTTPS on port `9443` as the current default, with `9000` called legacy HTTP. I updated the example to use `https://...:9443`, while keeping the documented `/api/endpoints/{id}/docker/...` Docker-proxy pattern and using `force=1` for the delete request.

## Review Notes
- The post is technically relevant and contains executable Docker CLI and API examples, so `validated` is the correct status after correction.
- The container-protection label example is technically valid as a custom automation pattern, but it is not a native Portainer protection feature.
- The Portainer API docs explicitly note that Docker resource-management calls are proxied through `/api/endpoints/{id}/docker/...` and are not individually documented in Swagger, so Docker's API reference remains the authoritative source for the delete-container query parameters.
