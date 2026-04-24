# Validation Summary: How to Set Up Stack Auto-Updates from Git in Portainer (Webhook)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Docker Swarm stack deployment
- GitOps
- GitHub Webhooks
- GitLab Webhooks
- GitHub Actions
- `curl`

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer source: stack handler route registration - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/handler.go
- Portainer source: GitOps webhook invoke handler - https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/webhook_invoke.go
- Portainer source: HTTP empty response helper - https://raw.githubusercontent.com/portainer/portainer/develop/pkg/libhttp/response/response.go
- Portainer source: stack auto-update redeploy logic - https://raw.githubusercontent.com/portainer/portainer/develop/api/stacks/deployments/deploy.go
- GitHub Docs: Creating webhooks - https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub Docs: Webhook events and payloads - https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub Docs: GITHUB_TOKEN - https://docs.github.com/actions/concepts/security/github_token
- GitHub Docs: Managing GitHub Actions settings for a repository - https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- actions/checkout README - https://github.com/actions/checkout/blob/main/README.md?plain=1
- GitLab Docs: Webhooks - https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab Docs: GitLab.com settings - https://docs.gitlab.com/user/gitlab_com/

## Issues Found
- The post described webhook auto-update as an immediate redeploy on every trigger. Portainer actually checks the latest Git commit hash first and only redeploys when the commit changed, or when Force redeployment is enabled. I corrected the introduction, the process diagram, and the conclusion.
- The webhook flow summary said Portainer compares new content directly to the deployed state and recreates changed services immediately. Portainer’s documented behavior is commit-hash based first, then it hands off to Docker/Swarm/Kubernetes, which only recreates what those tools determine changed unless force redeployment is enabled. I corrected that description.
- The GitHub and GitLab webhook setup implied that provider-side webhook secrets could simply be set on Portainer’s endpoint. Portainer’s GitOps webhook handler is a public route keyed by the webhook URL token and does not validate GitHub signature headers or `X-Gitlab-Token`. I updated the GitHub/GitLab examples and the security section to say those secrets are only useful if a reverse proxy or another component validates them before forwarding to Portainer.
- The manual test section said the webhook should return `HTTP 200 OK`. Portainer’s handler returns an empty `204 No Content` response and performs the update check asynchronously. I corrected the expected response text.
- The GitHub Actions example used a plain `curl` POST, which would not fail the job on HTTP errors, and the workflow that commits back to the repository did not declare write permissions. I changed the webhook call to `curl --fail -X POST`, added `permissions: contents: write` to the push-back workflow, and updated the commit identity to GitHub’s documented bot identity example.
- The prerequisite line made an edition/support claim that was not reliably stated in the current docs used for review. I removed the edition-specific wording and replaced it with version-neutral prerequisites that match the documented Git-backed stack workflow.

## Review Notes
Portainer’s UI/docs terminology varies by version, but the current docs use `GitOps updates` and `Webhook` as the update mechanism wording. The post now uses that terminology.
