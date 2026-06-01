# Validation Summary: How to Set Up ACR Tasks for Automated Container Image Builds on Git Commit

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Registry
- ACR Tasks
- Azure CLI
- Docker and Dockerfile syntax
- GitHub and Azure DevOps repository triggers
- YAML multi-step task definitions
- Azure managed identities

## Sources Consulted
- Azure CLI reference for `az acr build`: https://learn.microsoft.com/en-us/cli/azure/acr
- Azure CLI reference for `az acr task create`, `list-runs`, and `logs`: https://learn.microsoft.com/en-us/cli/azure/acr/task
- ACR Tasks overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview
- ACR Tasks YAML reference: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-reference-yaml
- ACR Tasks scheduled tasks documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-scheduled
- ACR Tasks base image updates documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-base-images
- Azure Container Registry image tag best practices: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-tag-version

## Issues Found
- The `az acr task create` examples used `--branch`, which is not a current option in the official Azure CLI reference. I changed the examples to specify the branch in the Git context URL with `#main` or `#develop`.
- The "Tag Images with Git SHA" example described Git SHA tagging but still used `{{.Run.ID}}`. I changed the image tag to `{{.Run.Commit}}`, which is the documented ACR Tasks run variable for Git commit-triggered tasks.
- The multi-step YAML pushed `my-app:latest` without building or tagging that image first. I added the `latest` tag to the build step so both pushed tags exist.
- The build argument and secret example passed `NPM_TOKEN` as both a normal `--arg` and a `--secret-arg`, which would expose the token through the non-secret argument. I changed the normal build argument to a non-sensitive build version and kept the token only as `--secret-arg`.
- The managed identity example used `--assign-identity` without a value. I changed it to `--assign-identity '[system]'`, matching the Azure CLI documentation for assigning a system-managed identity.
- The troubleshooting note suggested `--cache-from`, which is not an `az acr task create` option, and incorrectly stated that ACR Tasks do not cache layers by default. I updated the note to reference the documented `--no-cache` behavior and recommend Dockerfile and multi-stage build optimization.

## Review Notes
The Azure CLI was not installed in the local workspace, so command verification was performed against the official Microsoft Learn Azure CLI reference and ACR Tasks documentation rather than local `az --help` output.
