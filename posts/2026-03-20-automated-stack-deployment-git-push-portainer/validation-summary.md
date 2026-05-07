# Validation Summary: How to Set Up Automated Stack Deployment on Git Push with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- GitOps
- GitHub Actions
- Docker Compose
- Bash
- `curl`

## Sources Consulted
- Portainer Docs: Add a new stack — https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: Inspect or edit a stack — https://docs.portainer.io/user/docker/stacks/edit
- Portainer Docs: Webhooks — https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer Docs: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer API docs index — https://docs.portainer.io/api/docs
- Portainer OpenAPI (`stacks` endpoints, BE 2.39.2) — https://api-docs.portainer.io/versions/ee/2.39.2/stacks.yaml
- Docker Docs: Compose file reference — https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Interpolation — https://docs.docker.com/reference/compose-file/interpolation/
- GitHub Docs: Workflow syntax for GitHub Actions — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Local `curl --help all` output for `--fail`, `--silent`, `--show-error`, and `-X`
- Portainer upstream source review for `stack_update_git_redeploy.go` and `stack_update.go` in https://github.com/portainer/portainer

## Issues Found
- The post described the Git deployment UI with incorrect labels and flow. I changed `Repository` to `Git Repository`, `Compose file path` to `Compose path`, and replaced `Auto update` with `GitOps updates` to match Portainer’s current documentation.
- The “Enable Git Webhook Trigger” section pointed readers to stack settings that do not match Portainer’s documented Git stack flow. I corrected it to use GitOps updates with `Webhook` as the mechanism during stack creation or from the stack details page.
- The GitHub Actions section said the webhook “triggers stack update with latest Git content,” which overstated the behavior. Portainer first checks the latest Git commit hash and only redeploys when it detects a change, so I corrected the wording.
- The API example used `PUT /api/stacks/{id}` with `StackFileContent`, which Portainer documents as the file-based stack update endpoint, not the Git redeploy endpoint. I replaced it with `PUT /api/stacks/{id}/git/redeploy`.
- The API example used deprecated `PullImage`. I updated it to `RepullImageAndRedeploy`, which Portainer marks as the replacement from 2.36 onward.
- The API example hard-coded `endpointId=1`. I replaced that with a `PORTAINER_ENDPOINT_ID` variable.
- The API example would overwrite the stack’s saved environment variables by sending only `IMAGE_TAG`. I rewrote it to fetch the existing stack definition, merge `IMAGE_TAG`, and preserve existing environment variables before redeploying.
- The Compose snippet used the top-level `version: "3.8"` field, which Docker documents as obsolete in modern Compose. I removed it.

## Review Notes
- Portainer stack webhooks are documented as a Business Edition feature and are only available on non-Edge environments.
- The API redeploy example assumes the CI pipeline has already published an image tag matching `GITHUB_SHA`.
