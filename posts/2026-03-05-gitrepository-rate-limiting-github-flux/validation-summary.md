# Validation Summary: How to Handle GitRepository Rate Limiting from GitHub in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux source-controller GitRepository resources
- Flux notification-controller Receiver resources
- Kubernetes Secrets and events
- GitHub REST API rate limits
- GitHub personal access tokens
- GitHub App authentication
- Git over HTTPS and SSH

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux `flux create secret githubapp` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- GitHub REST API rate limit documentation: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitHub App installation authentication documentation: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- GitHub personal access token authentication documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The post treated GitHub REST API rate limits and Git clone/fetch throttling as the same quota. Updated the wording to distinguish API rate limits from possible throttling of excessive Git operations.
- The GitHub App rate limit description said installations receive 5,000 to 15,000 requests per hour depending on repository count. Updated it to match GitHub's documented limits: 5,000 by default, up to 12,500 for larger non-Enterprise installations, or 15,000 for GitHub Enterprise Cloud organizations.
- The post said each Flux Git operation counts against the listed REST API limits. Updated this to say GitRepository reconciliation triggers Git operations, while GitHub App authentication may also use the GitHub API.
- The post described a 1-minute GitRepository interval as a default. Flux requires `.spec.interval`; updated the wording to describe 1 minute as an aggressive interval rather than a default.
- The request-budget examples counted "requests" for every GitRepository interval. Updated the wording to count scheduled Git fetches instead.
- The GitHub App authentication secret was shown as a static `username`/`password` installation token. Replaced it with Flux's supported GitHub App secret keys and added a GitRepository example using `provider: github`.
- The post said an external process or controller is required to refresh GitHub App installation tokens. Updated it to explain that Flux source-controller obtains fresh installation tokens when configured with GitHub App credentials.
- The webhook section said webhooks eliminate unnecessary Git fetch operations. Updated the wording to say they reduce unnecessary scheduled fetches because polling still remains as a fallback interval.
- The SSH section implied SSH avoids all relevant limits. Updated it to clarify that SSH avoids GitHub REST API rate limits but excessive Git traffic may still be throttled by GitHub.

## Review Notes
The examples use current Flux `source.toolkit.fluxcd.io/v1` and `notification.toolkit.fluxcd.io/v1` APIs. The `flux create secret githubapp` command is documented by Flux as preview and may change in future Flux releases.
