# Validation Summary: How to Use GitLab CI to Deploy to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitLab CI/CD
- GitLab Container Registry
- Portainer
- Docker and Docker-in-Docker
- cURL
- jq

## Sources Consulted
- GitLab CI/CD deprecated keywords: https://docs.gitlab.com/ci/yaml/deprecated_keywords/
- GitLab Docker-in-Docker guidance: https://docs.gitlab.com/ci/docker/using_docker_build/
- GitLab registry authentication in DinD: https://docs.gitlab.com/ci/docker/authenticate_registry/
- GitLab deployments and rollback behavior: https://docs.gitlab.com/ci/environments/deployments/
- GitLab CI/CD variables: https://docs.gitlab.com/ci/variables/
- GitLab predefined variables: https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Container Registry API: https://docs.gitlab.com/api/container_registry/
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Docker `login` CLI reference: https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The pipeline used deprecated GitLab `only:` syntax. I replaced it with `rules:` so the examples match current GitLab CI guidance.
- The Docker jobs used incomplete Docker-in-Docker settings and did not authenticate in the test job. I pinned the Docker client and DinD service images, added the documented DinD variables, and added registry login plus an explicit pull in the test job so the private image can be run in a fresh job environment.
- The Portainer staging deployment called `/api/stacks/{id}/images/update`, which is not a supported stack redeploy endpoint in current Portainer API docs. I replaced it with the supported Git stack redeploy flow: authenticate, resolve the stack by name, then call `PUT /api/stacks/{id}/git/redeploy` with `RepullImageAndRedeploy`.
- The post hard-coded the staging stack name inside brittle `grep` parsing of JSON. I replaced that with `jq` parsing and a `PORTAINER_STAGING_STACK_NAME` variable.
- The rollback section used outdated GitLab navigation and implied a full pipeline rerun. I corrected it to **Operate > Environments** and clarified that GitLab creates a new deployment and reruns only the deploy job for the earlier commit.
- The cleanup example used an ad hoc `glab` loop instead of GitLab's documented bulk tag deletion API. I replaced it with the official Container Registry API using `CI_JOB_TOKEN`, `keep_n`, and `name_regex_delete`, and moved it to a dedicated `cleanup` stage.

## Review Notes
- The revised Docker example follows GitLab's documented no-TLS DinD pattern, which requires a privileged runner. GitLab's docs prefer TLS-enabled DinD where runner configuration supports it.
- The Portainer API redeploy example now accurately assumes a Git-backed stack, because the `git/redeploy` endpoint applies to stacks managed from Git.
