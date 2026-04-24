# Validation Summary: How to Set Up CI/CD with Portainer and Jenkins - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Jenkins
- Jenkins Declarative Pipeline and Jenkins Shared Libraries
- Portainer stack webhooks and Portainer API
- Docker CLI and container registries
- Groovy-based `Jenkinsfile` examples

## Sources Consulted
- Portainer Documentation, "Webhooks": https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Documentation, "API documentation": https://docs.portainer.io/api/docs
- Portainer API OpenAPI spec (BE 2.39.1): https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Jenkins Documentation, "Pipeline Syntax": https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Documentation, "Using Docker with Pipeline": https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Documentation, "Extending with Shared Libraries": https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Jenkins Documentation, "Managing Plugins": https://www.jenkins.io/doc/book/managing/plugins/
- Jenkins Git plugin documentation: https://plugins.jenkins.io/git/
- Docker Docs, "`docker login`": https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The post implied the webhook deployment path was generally available with Portainer CE or BE. I corrected the prerequisites, credential description, and Step 3 heading to note that Portainer stack webhooks are a Portainer Business Edition feature.
- The Docker registry login examples passed secrets on the command line. I changed them to use `docker login --password-stdin`, which is Docker's documented non-interactive login method.
- The advanced Portainer API example used outdated/lowercase request fields (`stackFileContent`, `env`, `pullImage`) and did not fail the pipeline on unsuccessful stack updates. I updated the payload to the current stack update shape (`StackFileContent`, `Env`, `RepullImageAndRedeploy`), switched the update call to `curl -sf`, and added explicit missing-stack checks.
- The advanced API flow did not state that Portainer's stack update endpoint is for file-based stacks. I clarified that scope in Step 4, the shared-library section, and the conclusion.
- The advanced Jenkinsfile derived `IMAGE_TAG` from `GIT_COMMIT` in the top-level `environment` block. I moved that assignment into the setup stage so it is computed during the build after Jenkins has populated SCM-related variables.
- The shared-library usage snippet omitted `steps {}` for declarative syntax. I corrected the stage snippet so it is valid in a declarative `Jenkinsfile`.

## Review Notes
- The webhook example assumes the Portainer stack is set up to redeploy the image tag referenced by the stack, commonly `latest`, unless webhook query parameters or environment-variable substitution are used.
- The file-based API update flow assumes the stack file already references `IMAGE_TAG` as a deployment variable; updating the Portainer `Env` payload alone does not rewrite image references inside the compose content.
