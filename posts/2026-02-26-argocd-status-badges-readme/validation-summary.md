# Validation Summary: How to Embed ArgoCD Status Badges in README Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD status badges
- Argo CD CLI
- Kubernetes ConfigMaps
- NGINX Ingress annotations
- GitHub README badges and Camo image proxy
- GitHub Actions workflow status badges
- GitLab project badges and asset proxy
- Bitbucket Markdown README rendering
- Flask
- Shields.io endpoint and static badges
- Bash, curl, jq

## Sources Consulted
- Argo CD Status Badge documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/status-badge/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- GitHub Docs, Adding a workflow status badge: https://docs.github.com/en/actions/how-tos/monitor-workflows/add-a-status-badge
- GitHub Docs, About anonymized URLs: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls
- GitLab Docs, Badges: https://docs.gitlab.com/user/project/badges/
- GitLab Docs, Proxying assets: https://docs.gitlab.com/security/asset_proxy/
- Atlassian Bitbucket Markdown syntax guide: https://confluence.atlassian.com/bitbucketserver/markdown-syntax-guide-776639995.html
- Ingress-NGINX Configuration Snippets documentation: https://kubernetes.github.io/ingress-nginx/examples/customization/configuration-snippets/
- Shields.io Endpoint Badge documentation: https://shields.io/badges/endpoint-badge
- MDN, Use cross-origin images in a canvas: https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image

## Issues Found
- GitHub cache refresh guidance incorrectly said there is no reliable way to force a refresh. GitHub documents Camo cache purging, but it should be used sparingly, so the post now recommends not relying on manual refresh for routine badge updates and instead configuring short cache headers.
- The GitHub cache section introduced an unchanged badge snippet as a workaround. Reworded it as a reminder about reviewing badge changes.
- The GitLab section stated that GitLab always proxies external images and generally refreshes them faster than GitHub. GitLab documents asset proxying as configurable, so the wording now says behavior depends on instance configuration.
- The Bitbucket and troubleshooting sections suggested CORS headers for normal README image rendering. Cross-origin image embedding generally does not require CORS unless the image is used in a canvas, so the post now focuses on reachability, image content type, and CSP.
- The Flask badge proxy example imported an unused `redirect` symbol and referenced `ARGOCD_TOKEN` without defining it. Updated the snippet to read the token from the environment, use `Response`, add a timeout, and raise on upstream HTTP errors.
- The Shields.io endpoint example implied Shields could query the Argo CD SVG badge directly. Shields endpoint badges require a JSON endpoint, so the text and URL were corrected.
- The CI-generated static badge snippet fetched `HEALTH` but never used it. Removed the unused command.

## Review Notes
The Argo CD badge endpoint, `statusbadge.enabled` ConfigMap key, `revision=true` query parameter, `argocd app list -p ... -o name`, `argocd app get ... -o json`, GitHub Actions badge URLs, GitLab badge URLs, and Bitbucket Markdown image syntax were verified against official documentation and are technically valid.
