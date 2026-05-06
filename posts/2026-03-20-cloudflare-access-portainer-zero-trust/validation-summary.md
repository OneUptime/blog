# Validation Summary: How to Configure Cloudflare Access with Portainer for Zero Trust

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Access
- Cloudflare Zero Trust
- Cloudflare Tunnel
- Cloudflare App Launcher
- Cloudflare WARP
- Portainer
- Portainer HTTP API
- `curl`

## Sources Consulted
- Cloudflare Identity providers: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/
- Cloudflare Create an Access application: https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/
- Cloudflare Access policies: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
- Cloudflare Common Access policies: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/
- Cloudflare Application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- Cloudflare App Launcher: https://developers.cloudflare.com/learning-paths/clientless-access/customize-ux/app-launcher/
- Cloudflare Service tokens: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- Cloudflare Client sessions / device authentication identity: https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/warp/configure-warp/warp-sessions/
- Cloudflare Require WARP posture check: https://developers.cloudflare.com/cloudflare-one/reusable-components/posture-checks/client-checks/require-warp/
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access tokens: https://docs.portainer.io/2.21/api/access
- Portainer stack webhooks: https://docs.portainer.io/user/docker/stacks/webhooks
- Portainer service webhooks: https://docs.portainer.io/user/docker/services/webhooks

## Issues Found
- The Cloudflare dashboard navigation paths in the draft were outdated. I updated the Identity Provider, Access Application, Service Token, and App Launcher paths to match current Cloudflare documentation.
- The App Launcher section said the application would appear automatically after enabling the launcher. I corrected this to include the required App Launcher policy and the per-application `Show application in App Launcher` setting.
- The service-token section was incomplete. Cloudflare service tokens require an Access policy with `Decision: Service Auth`; otherwise Access will still prompt for IdP login. I added that requirement.
- The Portainer API example used `Authorization: Bearer ${PORTAINER_TOKEN}` without explaining JWT issuance, while Portainer's documented API access-token flow uses `X-API-Key`. I changed the example to `X-API-Key: ${PORTAINER_API_KEY}` to match Portainer's documented access-token method.
- The bypass example was technically incorrect. Cloudflare does not scope a Bypass rule to a path by putting `Path` inside the policy body; instead, you create a separate Access application for the specific path and attach a Bypass policy to that application. I corrected the example accordingly.
- The WARP section mixed together different Cloudflare concepts by saying `Require WARP device enrolled`. I corrected this to distinguish WARP enrollment, device authentication identity, and Gateway posture checks for enrolled-device-only access.
- The policy examples used older or imprecise selector wording (`Email domain`, `Email (list)`) and described a country restriction as a group requirement. I updated the selector names and wording to match current Access policy behavior.

## Review Notes
Cloudflare dashboard labels and navigation can change over time; the corrected paths and behavior were verified against official documentation current on 2026-05-06. Portainer webhook URLs vary by resource type, so readers should use the exact webhook path Portainer generates for their stack, service, or container.
