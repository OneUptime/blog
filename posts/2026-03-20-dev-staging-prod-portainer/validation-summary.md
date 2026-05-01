# Validation Summary: How to Set Up Separate Dev/Staging/Prod Environments in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Docker Swarm
- Portainer API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer docs, Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer docs, Install Portainer Agent on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/agent
- Portainer docs, Secrets: https://docs.portainer.io/user/docker/secrets
- Portainer docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer docs, How Relative Path Support works in Portainer: https://docs.portainer.io/advanced/relative-paths
- Portainer docs, Manage access to environments: https://docs.portainer.io/admin/environments/access
- Portainer docs, User-related / Teams and Roles: https://docs.portainer.io/admin/user
- Portainer docs, Roles: https://docs.portainer.io/admin/user/roles
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer CE OpenAPI spec 2.39.1: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Docs, Define services in Docker Compose: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/

## Issues Found
- The environment URL example used `tcp://dev-server:9001`, but Portainer’s agent connection docs say not to include a protocol. I changed the instructions to use bare `host:9001` values.
- The original instructions added all three environments as Docker Standalone even though later steps relied on Swarm-only features such as secrets, `deploy.replicas`, and rolling updates. I corrected the setup guidance to treat Production as Docker Swarm when those features are needed.
- The Compose examples used a YAML anchor from a separate file (`<<: *api_defaults`), which would not work as shown. I removed the broken shared-anchor pattern and made each environment-specific Compose example self-contained.
- The staging Compose example declared a named volume (`staging_db_data`) without defining it at the top level. I added the missing `volumes` declaration.
- The staging Compose example used `deploy.resources` even though the article’s staging environment was being added as Docker Standalone. I replaced that with `mem_limit`, which is a service-level Compose setting for container memory limits.
- The deployment script used the Portainer stack update API with the wrong JSON field names (`env`, `pullImage`) and omitted the required stack file content. I rewrote it to send the current field names (`Env`, `RepullImageAndRedeploy`, `StackFileContent`) supported by the published Portainer OpenAPI spec for file-based stack updates.
- The secrets section implied that Portainer secrets are available on any Docker environment. Portainer’s docs state that the Secrets menu is only available for Docker Swarm environments, so I scoped that step to Swarm and added the standalone `.env` / stack-variable alternative.
- The dev Compose example used a relative bind mount (`./src:/app/src`) for hot reload. Portainer’s relative-path support docs describe this as a Business Edition Git-based workflow, not a generic standalone stack behavior, so I changed the example to an explicit host path.
- The access-control instructions pointed to an outdated navigation path and implied granular read-only/full roles were universally available. I updated the navigation to current Portainer sections and clarified that granular RBAC roles require Portainer Business Edition.
- The environment-status script always queried container endpoints, which would under-report a Swarm environment. I updated it to detect Swarm managers and list services for Swarm environments instead of container counts.

## Review Notes
- The examples retain `version: "3.8"` in the Compose snippets for compatibility with Portainer and Swarm-style stack examples, although modern Docker Compose treats the top-level `version` field as legacy metadata.
- This review was documentation-based. A live Portainer or Docker deployment was not available in this environment for end-to-end execution.
