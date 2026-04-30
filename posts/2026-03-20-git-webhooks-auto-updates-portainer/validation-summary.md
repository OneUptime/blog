# Validation Summary: How to Configure Git Webhooks for Auto-Updates in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- GitOps
- GitHub Webhooks
- GitLab Webhooks
- Nginx
- Docker Compose / Portainer stacks

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs: How do automatic updates for stacks/applications work? - https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- Portainer Docs: Stack webhooks - https://docs.portainer.io/user/docker/stacks/webhooks
- GitHub Docs: Creating webhooks - https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub Docs: Validating webhook deliveries - https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub Docs: About GitHub's IP addresses - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses
- GitHub Docs: REST API endpoints for meta data - https://docs.github.com/en/rest/meta/meta
- GitHub Meta API (current ranges checked on 2026-04-30) - https://api.github.com/meta
- GitLab Docs: Webhooks - https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab Docs: GitLab.com settings (IP range) - https://docs.gitlab.com/user/gitlab_com/

## Issues Found
- The post implied that setting a GitHub or GitLab webhook secret was directly beneficial when targeting Portainer. I changed both provider setup sections to clarify that Portainer relies on the token embedded in the webhook URL, and provider-side secrets only help if an intermediate service validates them.
- The webhook test section claimed a specific `204 No Content` response without authoritative documentation for that exact status in this GitOps flow. I changed the example to `curl -i` and updated the expectation to a generic successful HTTP response.
- The reverse-proxy allowlist example used brittle hardcoded GitHub CIDRs without noting GitHub's own guidance that IP ranges change over time, and it omitted currently published GitHub webhook ranges. I updated the text to reference the GitHub Meta API, refreshed the GitHub ranges used in the example, added the current GitHub IPv6 webhook ranges, and kept GitLab.com's documented webhook source ranges.
- The reverse-proxy example used `http://portainer:9000`, which is not the default current Portainer HTTPS listener. I updated the example to `https://portainer:9443`.
- The webhook event flow said Portainer "Fetch[es] latest Compose file", which is not how Portainer documents GitOps updates. I corrected the diagram to reflect the documented behavior: Portainer checks the latest Git commit hash, pulls the repository when the commit changed, and then redeploys the stack.
- The verification section referenced Portainer UI elements that are not consistently documented across editions. I replaced that guidance with a version-agnostic verification step based on the deployed configuration and Portainer server logs.
- The introduction and conclusion slightly overstated webhook behavior as immediate deployments. I revised them to say webhooks trigger near-instant update checks, with redeployment occurring when Portainer detects a new commit.

## Review Notes
- GitHub explicitly says its published IP ranges can change and does not recommend relying on IP allowlisting alone. If this post is revisited later, re-check the GitHub Meta API before trusting any embedded CIDRs.
- GitLab now documents signing tokens as the stronger option compared with plain secret tokens, but Portainer itself is still being used here as the direct receiver, so provider-side signing only helps when another component validates it.
