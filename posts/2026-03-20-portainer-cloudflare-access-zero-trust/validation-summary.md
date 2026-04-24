# Validation Summary: How to Configure Cloudflare Access with Portainer for Zero Trust (2)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Cloudflare Zero Trust
- Cloudflare Access
- Cloudflare Tunnel
- Portainer
- Portainer Edge Agent
- OAuth identity providers (Google and GitHub)
- `curl`

## Sources Consulted
- Cloudflare One docs, Identity providers: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/
- Cloudflare One docs, Google identity provider: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/google/
- Cloudflare One docs, GitHub identity provider: https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/github/
- Cloudflare One docs, Publish a self-hosted application to the Internet: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- Cloudflare One docs, Application paths: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/
- Cloudflare One docs, Access policies: https://developers.cloudflare.com/cloudflare-one/access-controls/policies/
- Cloudflare One docs, Service tokens: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/
- Cloudflare One docs, Authorization cookie and cookie settings: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/
- Cloudflare One docs, CORS: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/cors/
- Cloudflare One docs, Enable automatic cloudflared authentication: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/non-http/cloudflared-authentication/automatic-cloudflared-authentication/
- Cloudflare One docs, Access authentication logs: https://developers.cloudflare.com/cloudflare-one/insights/logs/audit-logs/
- Portainer docs, The Portainer Edge Agent: https://docs.portainer.io/advanced/edge-agent
- Portainer docs, Install Edge Agent Standard on Docker Swarm: https://docs.portainer.io/admin/environments/add/swarm/edge
- Portainer docs, API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer docs, API documentation: https://docs.portainer.io/api/docs
- Portainer GitHub repository, agent Edge polling path reference: https://github.com/portainer/agent

## Issues Found
- Cloudflare dashboard navigation was outdated. I changed the identity-provider path from `Settings -> Authentication -> Login methods` to `Integrations -> Identity providers`, the application path to `Access controls -> Applications`, the service-token path to `Access controls -> Service credentials -> Service Tokens`, and the logs path to `Insights -> Logs -> Access authentication logs` to match current Cloudflare documentation.
- The Google example was labeled `Google Workspace`, but the snippet only matched Cloudflare's standard Google IdP flow. I corrected it to `Google` and added the documented Google OAuth requirement for the team-domain JavaScript origin.
- The GitHub setup was incomplete. I added the documented GitHub OAuth Homepage URL and the required Cloudflare `Finish setup` authorization step.
- The self-hosted application path guidance was incorrect. `Path: /` does not represent whole-site coverage in current Cloudflare Access documentation; I changed it to leaving the path empty to protect the entire app.
- The advanced settings section mixed documented settings with incorrect ones. I replaced the inaccurate `Enable automatic cloudflared authentication: ON (for service tokens)` and removed the non-configurable `Secure: ON`, then aligned the section with documented CORS fields, cookie settings, and the real `401 Response for Service Auth policies` option.
- The Edge Agent bypass guidance was too broad and modeled the path as a policy field instead of an application path. I corrected it to a separate, more specific Access application for `/api/endpoints/*/status` and noted Portainer's documented requirement that the Edge tunnel port `8000` must also remain reachable.
- The authenticated `curl -I` test previously claimed a guaranteed `200` response. I changed that expectation to the technically correct behavior: the request should reach Portainer rather than being redirected back to the Cloudflare Access login page.

## Review Notes
- Portainer's `/api/auth` example is still valid, but Portainer's current API docs also support long-lived per-user access tokens via `X-API-Key`, which may be a better fit for some automation workflows.
- Cloudflare warns that Bypass policies disable Access enforcement and logging for matching requests, so any Edge Agent exception should stay as narrow as possible.
