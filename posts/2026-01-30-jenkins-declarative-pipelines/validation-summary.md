# Validation Summary: How to Create Jenkins Declarative Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Jenkins Declarative Pipeline
- Jenkins Scripted Pipeline
- Jenkins Pipeline agents, stages, post actions, options, triggers, and conditions
- Jenkins credentials and environment variables
- Jenkins Shared Libraries
- Docker and Docker Compose in CI pipelines
- Kubernetes deployment commands with kubectl
- Node.js/npm build and test commands

## Sources Consulted
- Jenkins Pipeline Syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/
- Jenkins Using a Jenkinsfile documentation: https://www.jenkins.io/doc/book/pipeline/jenkinsfile/
- Jenkins Using Docker with Pipeline documentation: https://www.jenkins.io/doc/book/pipeline/docker/
- Jenkins Shared Libraries documentation: https://www.jenkins.io/doc/book/pipeline/shared-libraries/
- Jenkins Pipeline Basic Steps reference: https://www.jenkins.io/doc/pipeline/steps/workflow-basic-steps/
- Jenkins Core Pipeline Steps reference: https://www.jenkins.io/doc/pipeline/steps/core/
- Jenkins JUnit Plugin Pipeline Steps reference: https://www.jenkins.io/doc/pipeline/steps/junit/
- Jenkins HTML Publisher Plugin Pipeline Steps reference: https://www.jenkins.io/doc/pipeline/steps/htmlpublisher/
- Jenkins Workspace Cleanup Plugin Pipeline Steps reference: https://www.jenkins.io/doc/pipeline/steps/ws-cleanup/
- Docker CLI login reference: https://docs.docker.com/reference/cli/docker/login/
- Docker Compose up reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose down reference: https://docs.docker.com/reference/cli/docker/compose/down/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Deployment rollout status documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The stage-specific environment variable example used `env.GIT_COMMIT[0..7]` inside the Declarative `environment` directive. That is fragile because `GIT_COMMIT` is not guaranteed to exist for every Pipeline configuration and the substring expression can fail when it is unset. Changed the example to use `env.BUILD_NUMBER`, which is a documented Jenkins environment variable available during Pipeline builds.
- The parallel integration-test example ran npm commands inside the `docker/compose:latest` agent image. That image is not a Node.js build image, so `npm run test:integration` would not reliably work there. Removed the Docker Compose-specific agent override so the commands run on the normal Jenkins agent, and moved `docker compose down` into a stage-level `post { always { ... } }` block so Compose services are cleaned up even if tests fail.
- The `publishHTML` example passed report fields directly to `publishHTML([ ... ])`. The current HTML Publisher Pipeline step documents those fields under the `target` nested object. Changed it to `publishHTML(target: [ ... ])`.

## Review Notes
Several examples rely on Jenkins plugins being installed and configured, including Docker Pipeline, Workspace Cleanup, JUnit, HTML Publisher, Slack, and Mail-related steps. The post's Jenkins Pipeline syntax and command examples are otherwise consistent with the official documentation consulted.
