# Validation Summary: Why Drone Starts the Same Build Twice-and How to Find Duplicate Webhooks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Drone CI
- YAML pipeline configuration
- GitHub webhooks
- GitLab webhooks
- Gitea webhooks
- Docker and the Docker Official Node.js image
- npm

## Sources Consulted
- [Drone pipeline triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/)
- [Drone pipeline configuration and multiple pipelines](https://docs.drone.io/pipeline/configuration/)
- [Drone Docker pipeline quickstart and repository enablement](https://docs.drone.io/quickstart/docker/)
- [Drone `repo repair` CLI reference](https://docs.drone.io/cli/repo/drone-repo-repair/)
- [Gitea webhook documentation](https://docs.gitea.com/usage/repository/webhooks)
- [GitLab webhook documentation](https://docs.gitlab.com/user/project/integrations/webhooks/)
- [GitHub webhook redelivery documentation](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks)
- [npm `ci` documentation](https://docs.npmjs.com/cli/commands/npm-ci/)
- [Docker Official Image for Node.js](https://hub.docker.com/_/node)

## Issues Found
No technical issues found.

## Review Notes
The Drone YAML is syntactically consistent with the documented Docker pipeline format. For pull-request events, Drone's `branch` trigger evaluates the target branch, so `branch: [main]` implements the policy described. The `node:24` image tag is currently available, although it is a moving major-version tag rather than an immutable image reference. The example correctly states its `npm ci` assumptions. Provider webhook capabilities and delivery behavior vary by provider and version, which the post appropriately acknowledges.
