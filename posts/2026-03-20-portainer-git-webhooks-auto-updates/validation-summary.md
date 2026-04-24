# Validation Summary: How to Configure Git Webhooks for Auto-Updates in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks and GitOps updates
- Portainer HTTP API
- GitHub repository webhooks
- GitLab project webhooks
- Gitea repository webhooks
- Shell scripting with `curl` and `jq`
- GitHub Actions

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Documentation: Inspect or edit a stack — https://docs.portainer.io/user/docker/stacks/edit
- Portainer Documentation: How do automatic updates for stacks/applications work? — https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Documentation: Accessing the Portainer API — https://docs.portainer.io/api/access
- Portainer API Documentation (CE 2.39.1 OpenAPI spec) — https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- GitHub Docs: Creating webhooks — https://docs.github.com/en/webhooks/creating-webhooks
- GitHub Docs: Webhook events and payloads — https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitLab Docs: Webhooks — https://docs.gitlab.com/ee/user/project/integrations/webhooks.html
- Gitea Documentation: Webhooks — https://docs.gitea.com/1.25/usage/repository/webhooks

## Issues Found

1. **The Portainer API example was incorrect.** The draft used `PUT /api/stacks/{id}` with `Authorization: Bearer`, `FetchInterval`, and the claim that Portainer generates the webhook token automatically. The current Portainer API documents Git settings updates on `POST /api/stacks/{id}/git`, supports API-key auth via `X-API-Key`, uses `AutoUpdate.Interval` rather than `FetchInterval`, and models `AutoUpdate.Webhook` as a client-supplied UUID. I updated the example accordingly.

2. **The webhook flow description overstated what happens on each webhook call.** Portainer documents webhook-triggered GitOps updates as an on-demand check of the configured Git reference, followed by redeploy only when the stored commit hash differs from the remote one. I corrected the explanation and removed the hard timing claim.

3. **The UI instructions did not match current Portainer workflow for Git-deployed stacks.** Current docs route users through **Edit Git settings**, then GitOps updates, then saving via **Save settings**. I updated the UI steps to match that flow.

4. **The GitHub webhook secret guidance was misleading for a direct Portainer endpoint.** GitHub secrets add signature headers, but Portainer's public stack webhook endpoint is identified by the webhook URL/token itself and the API documentation does not describe GitHub signature validation on that endpoint. I changed the guidance to leave the secret empty for a direct Portainer URL unless middleware is validating and forwarding requests.

5. **The GitLab branch filtering instructions were outdated.** Current GitLab documentation presents branch filtering as **All branches**, **Wildcard pattern**, or **Regular expression**, not a simple fixed `main` text field. I updated the instructions to reflect the current filter options.

6. **The Gitea webhook example omitted the documented POST content type.** Gitea's webhook setup example includes `application/json` as the POST content type. I added that field.

7. **The branch-filtering section implied any push would cause a redeploy.** In practice, the Git provider may POST on each push, but Portainer still checks the configured repository reference and redeploys only if that reference has a newer commit. I clarified that behavior.

8. **The testing and logging examples were too specific.** The post accepted `204` without support from Portainer's documented stack webhook response, hard-coded the Portainer container name, and included fabricated sample log lines. I changed the test to treat any `2xx` as success, generalized the container name, and removed unverifiable log samples.

9. **The “Combining Polling and Webhooks” section conflicted with current Portainer docs.** Portainer's GitOps UI documents **Polling** and **Webhook** as alternative mechanisms. I rewrote that section to present polling as the alternative when webhook delivery is impractical and corrected the API payload to use `Interval`.

## Review Notes
- Portainer's OpenAPI schema still exposes both `Webhook` and `Interval` on `AutoUpdateSettings`, but the current user documentation presents Polling and Webhook as distinct GitOps mechanisms. The post now follows the user-documentation model to avoid recommending an unsupported or undocumented combination.
- The API examples assume `jq` and `uuidgen` are available on the machine making the API request. The shell syntax is valid, but readers on minimal environments may need equivalent tooling installed.
