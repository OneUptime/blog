# Validation Summary: How to Set Up Azure Pipelines Container Jobs to Run Builds

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines container jobs
- Azure Pipelines service containers
- Azure Pipelines Cache@2 task
- Azure Pipelines Docker@2 task
- Docker and Dockerfiles
- Azure Container Registry service connections
- Node.js build containers

## Sources Consulted
- Microsoft Learn: Container jobs in YAML pipelines, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/container-phases?view=azure-devops
- Microsoft Learn: Service containers, https://learn.microsoft.com/en-us/azure/devops/pipelines/process/service-containers?view=azure-devops
- Microsoft Learn: resources.containers.container YAML schema, https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/resources-containers-container?view=azure-pipelines
- Microsoft Learn: Pipeline caching, https://learn.microsoft.com/en-us/azure/devops/pipelines/release/caching?view=azure-devops
- Microsoft Learn: Docker@2 task reference, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines
- Docker Docs: docker build / buildx build reference, https://docs.docker.com/engine/reference/commandline/build/

## Issues Found
- The custom Dockerfile switched to a non-root `USER vsts`. Azure Pipelines Linux container jobs require the configured user to have access to `groupadd` and other privileged commands without `sudo`, so this could break container job initialization. I changed the example to keep the default root user and explain the Azure Pipelines requirement.
- The Docker-in-Docker example used `docker:24-dind` with `--privileged`. Azure Pipelines container jobs require Linux job containers with no `ENTRYPOINT`, and the agent must run directly on the host rather than inside nested containers. I replaced the DinD guidance with the supported host Docker socket pattern and ensured the custom image installs a Docker CLI.
- The alternate Docker socket example used an image that was not guaranteed to include the Docker CLI or satisfy Azure Pipelines Linux container requirements. I changed it to reference a custom Docker CLI builder image that must meet Azure's container job requirements.
- The file-permissions section recommended matching UID `1001` as a common agent UID. This is not an Azure Pipelines container job requirement and can be misleading. I replaced it with guidance to keep Azure's required root initialization behavior while creating writable directories for build tools.
- The caching example comment said it cached `node_modules`, but the configured path caches npm's shared package cache. I corrected the comment.

## Review Notes
The remaining Azure Pipelines YAML snippets use valid container, service container, resource container, Cache@2, and Docker@2 task syntax based on the current Microsoft Learn documentation. Service container hostnames are correct for jobs running inside a container. The post intentionally uses placeholder registry and service connection names, so those must be replaced in a real pipeline.
