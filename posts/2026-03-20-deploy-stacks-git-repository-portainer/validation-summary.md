# Validation Summary: How to Deploy Stacks from a Git Repository in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Git
- GitHub personal access tokens
- GitLab deploy tokens
- Portainer API

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, "How do automatic updates for stacks/applications work?": https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs, "Inspect or edit a stack" (STS): https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs, "API documentation": https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- GitHub Docs, "Managing your personal access tokens": https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab Docs, "Deploy tokens": https://docs.gitlab.com/user/project/deploy_tokens/

## Issues Found
- The private-repository section said Portainer stack deployments support SSH private key entry. Current Portainer Git stack deployment docs document Basic/Token authorization with username and personal access token fields, not SSH-key entry for this workflow. I removed the SSH-key guidance and aligned the auth steps with the current UI.
- The private-repository examples used older, overly specific token wording. I updated the GitHub example to a generic PAT placeholder and kept the GitLab deploy token example while clarifying that it is used over HTTPS and needs `read_repository` scope.
- The reference-formats section claimed a broader set of examples than the stack deployment docs currently document directly. I narrowed the examples to documented branch and tag refs.
- The "Viewing the Current Git State" section claimed the stack details page shows deployed ref, update time, and a change link. Current Portainer stack docs instead document GitOps reconfiguration, manual pull-and-redeploy, and environment-variable management. I rewrote the section to match documented behavior.
- The redeploy section claimed a default polling interval of 5 minutes and said Git directly triggers Portainer immediately. Current Portainer docs describe a user-configured fetch interval and a webhook URL that can trigger update checks on demand. I corrected both statements.
- The Portainer API example was out of date. The current CE 2.39.1 OpenAPI spec defines `PUT /api/stacks/{id}/git/redeploy`, accepts API access tokens via `X-API-Key`, and documents `RepullImageAndRedeploy` while `PullImage` is deprecated. I updated the command accordingly.

## Review Notes
- Portainer clones the entire repository when deploying a stack from Git, and Portainer's Git deployment functionality does not currently support Git submodules. The post is still valid without this detail, but it could be a useful future caveat.
