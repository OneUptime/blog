# Validation Summary: How to Fix 'Image Not Found' Errors When Deploying in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Hub
- Amazon ECR
- Container registries
- Docker Compose image references

## Sources Consulted
- Portainer docs, Add a new registry: https://docs.portainer.io/admin/registries/add
- Portainer docs, Add a custom registry: https://docs.portainer.io/admin/registries/add/custom
- Portainer docs, Add an AWS ECR registry: https://docs.portainer.io/admin/registries/add/ecr
- Portainer docs, Add a DockerHub account: https://docs.portainer.io/sts/admin/registries/add/dockerhub
- Docker docs, `docker search`: https://docs.docker.com/reference/cli/docker/search/
- Docker docs, `docker image tag` image reference format: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker docs, Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- Docker docs, Registry authentication: https://docs.docker.com/reference/api/registry/auth/
- Docker docs, Deprecated Docker Hub API endpoints: https://docs.docker.com/reference/api/hub/deprecated/
- AWS CLI docs, `aws ecr get-login-password`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- CNCF Distribution spec, HTTP API V2: https://distribution.github.io/distribution/spec/api/

## Issues Found
- The Docker Hub API example used an older repository-tags route. I updated it to the current documented v2 namespace-based endpoint and changed the pipeline to `jq -r '.results[].name'` so it lists tag names directly.
- The AWS ECR section implied that Portainer should be configured with a refreshed 12-hour token. I corrected this to keep the token command for direct Docker CLI testing, but instruct Portainer users to add the registry through the built-in **AWS ECR** provider with AWS credentials and region.
- The Docker Hub rate-limit figures were outdated. I updated them to the current documented limits: 100 pulls per 6 hours for unauthenticated users and 200 pulls per 6 hours for authenticated Docker Personal users, with unlimited pull rate for Pro, Team, and Business.
- The Docker Hub authentication guidance in Portainer was too generic. I corrected it to use a Docker Hub username plus personal access token, which matches Portainer's current registry setup flow.
- The final connectivity test depended on pulling `alpine` and reaching Alpine package repositories, which does not cleanly test registry reachability. I replaced it with a direct `curl -I https://registry-1.docker.io/v2/` check and noted that `401 Unauthorized` is the expected success signal for a reachable registry endpoint.

## Review Notes
- Docker Hub pull-rate limits are subscription-dependent and were validated against Docker's documentation as of April 30, 2026.
- `docker search` helps confirm repository discoverability on Docker Hub, but the tag-list API check is the more precise validation step when the problem may be an incorrect tag.
