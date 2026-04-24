# Validation Summary: How to Deploy Stacks from a Git Repository in Portainer - From

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Git
- GitHub
- GitLab
- Bitbucket Cloud
- Azure DevOps
- Portainer API

## Sources Consulted
- Portainer docs: Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer docs: Inspect or edit a stack: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer docs: How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer docs: What scopes are required for GitHub, GitLab and Bitbucket tokens?: https://docs.portainer.io/faqs/getting-started/what-scopes-are-required-for-github-gitlab-and-bitbucket-tokens
- Portainer docs: Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Portainer source: stack Git redeploy handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update_git_redeploy.go
- Portainer source: Git reference field help text: https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/RefField/RefField.tsx
- Portainer source: Git auth options in the UI: https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/AuthFieldset/CredentialsSection.tsx
- Portainer source: Git-managed stack details card: https://github.com/portainer/portainer/blob/develop/app/react/portainer/gitops/GitReferenceCard.tsx

## Issues Found
- The post showed an SSH repository URL and a full SSH private-key workflow for Git stack deployments. Current Portainer stack Git auth is documented and implemented around Basic/Token Git credentials, not SSH-key auth for this flow, so the SSH example and SSH authentication section were removed.
- The post said Portainer could deploy from a branch, tag, or specific commit. Current Portainer docs and source show the repository reference as a Git ref such as `refs/heads/<branch>` or `refs/tags/<tag>`, so the unsupported raw commit-hash example was removed and the explanation was corrected.
- The private-repository auth section used outdated GitHub token guidance (`repo` scope only). It was updated to reflect current Portainer guidance, including provider-specific read scopes and the note that GitHub/GitLab/Bitbucket Cloud use Basic authorization in Portainer when that field is shown.
- The deployment description said Portainer clones the repository to a temporary location. Current Portainer documentation states it clones the entire repository as part of deployment, so that wording was corrected.
- The API example used the older `pullImage` request field. Portainer's current stack redeploy handler uses `repullImageAndRedeploy` as the current field, so the example was updated.
- The branch-switching instructions referenced generic "Git settings" and a save flow that no longer matches current UI wording. This was updated to `Edit Git settings`, with the current `Redeploy` option and `Save settings` action.
- The stack-details section said the UI shows a Git "last updated time" in that view. Current UI shows Git-managed repository, ref, file path, and commit information there, so the description was corrected.

## Review Notes
- Portainer's current docs note that Git-based stack deployment does not support Git submodules.
- Portainer's FAQ also notes that building images directly from files inside a Git-deployed stack is not fully implemented; this post does not cover image-build workflows, so no content change was required.
