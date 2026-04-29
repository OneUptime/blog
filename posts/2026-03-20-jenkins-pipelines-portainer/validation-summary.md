# Validation Summary: How to Set Up Jenkins Pipelines That Deploy to Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Jenkins
- Jenkins Declarative Pipeline
- Jenkins Job DSL
- Docker
- Docker Compose
- Portainer API
- Groovy
- Traefik

## Sources Consulted
- Jenkins Docker installation guide: https://www.jenkins.io/doc/book/installing/docker/
- Jenkins Docker Pipeline guide: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Pipeline basic steps reference: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Job DSL migration guide: https://raw.githubusercontent.com/jenkinsci/job-dsl-plugin/master/docs/Migration.md
- Portainer API documentation hub: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer API access token guide: https://docs.portainer.io/2.21/api/access
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` element reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Jenkins plugin installation example used an `init.groovy.d` bootstrap script. I replaced it with a Dockerfile that uses `jenkins-plugin-cli`, which matches Jenkins' current Docker installation guidance and makes the required plugins explicit.
- The plugin list was incomplete for the examples shown. I added the missing `github-branch-source`, `job-dsl`, and `junit` plugins and removed reliance on the unrelated Docker cloud plugin.
- The pipeline used a `docker:24-dind` top-level agent and raw `docker run -v "$PWD:/app"` commands. That is unreliable when Jenkins itself runs in Docker against the host socket, so I switched the test containers to `docker.image(...).inside {}` and ran the pipeline on the customized Jenkins image instead.
- The deployment parameter default effectively sent builds to staging by default. I changed the parameter choices to start with `auto` so `develop` and `main` continue to drive the default deployment flow, while manual staging or production deployments remain explicit.
- The unit-test example wrote JUnit XML into `test-results/unit.xml` without creating the directory first. I added `mkdir -p test-results` so the report path exists before `pytest` runs.
- The Portainer deployment helper used incorrect request field names and broken shell quoting. I rewrote it to generate the JSON payload with Python and to use the current `StackFileContent`, `Env`, `Prune`, and `RepullImageAndRedeploy` fields from the Portainer API spec.
- The Portainer request hard-coded `endpointId=1` even though the post discussed multiple environments. I changed the example to pass environment-specific endpoint IDs into the helper.
- The post implied the Portainer stack update helper was generally applicable. I clarified that `PUT /api/stacks/{id}` applies to file-based stacks and that the stack file must reference `${IMAGE_TAG}` for the environment-variable update to affect the image tag.
- The Portainer access-token instructions were outdated. I updated them to the current `My account` and `Access tokens` flow documented by Portainer.
- The multibranch Job DSL example used `gitHub {}` and `periodic(5)`. I corrected those to `github {}` and `periodicFolderTrigger { interval('5m') }` to match current Job DSL guidance.
- The pipeline used `cleanWs()` without installing the Workspace Cleanup plugin. I replaced it with the built-in `deleteDir()` step.
- The Compose example included the obsolete top-level `version` field. I removed it to match current Docker Compose documentation.
- The conclusion described Portainer deployments as atomic. I changed that wording to avoid overstating what this deployment pattern guarantees.

## Review Notes
- The integration-test stage assumes the built application image can execute `python -m pytest`. That is reasonable for the Python-oriented example shown, but teams using distroless or non-Python runtime images would need a separate test runner image.
- Portainer also supports Git-based stack redeploys and stack webhooks, but the corrected post now accurately describes a file-based stack update flow through the Portainer API.
- Running builds on the Jenkins controller is acceptable for a small self-hosted setup, but dedicated agents are a better long-term pattern for larger installations.
