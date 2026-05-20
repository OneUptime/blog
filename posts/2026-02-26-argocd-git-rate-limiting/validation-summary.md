# Validation Summary: How to Handle Git Rate Limiting Issues in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- ApplicationSet
- Kubernetes
- Git
- GitHub
- GitLab
- Bitbucket Cloud
- Azure DevOps
- Prometheus

## Sources Consulted
- Argo CD FAQ for Git polling, `timeout.reconciliation`, and `timeout.reconciliation.jitter`: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD `argocd-cm` example for reconciliation interval and jitter: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD command parameters for `reposerver.repo.cache.expiration`: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD repo-server metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD private repository and GitHub App credential documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/private-repositories/
- Argo CD declarative repository credentials documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- GitHub REST API rate limit documentation: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitLab Git HTTP rate limit documentation: https://docs.gitlab.com/administration/settings/git_http_rate_limits/
- GitLab.com rate limit documentation: https://docs.gitlab.com/user/gitlab_com/#gitlabcom-specific-rate-limits
- Bitbucket Cloud rate limit documentation: https://support.atlassian.com/bitbucket-cloud/docs/api-request-limits/
- Azure DevOps rate and usage limits documentation: https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/rate-limits

## Issues Found
- The provider rate limit table mixed API limits with Git clone/fetch limits and included an inaccurate Azure DevOps "200 requests/min" value. I updated the table to distinguish API limits from Git transport limits and corrected Azure DevOps to its documented TSTU-based model.
- The post implied Argo CD Git polling maps directly to GitHub REST API rate limits. I narrowed the wording to describe Git requests and provider-specific Git transport or abuse-detection limits.
- The `argocd_git_request_total.*error` examples used an undocumented error label pattern. I changed error checks and the Prometheus alert to use the documented `argocd_git_fetch_fail_total` metric.
- The `timeout.reconciliation` examples used unitless numeric strings. I changed them to documented duration strings such as `10m` and `30m`.
- The GitHub App rate limit description was inaccurate. I updated it to describe GitHub App installation limits: 5,000 requests/hour minimum, scaling up to 12,500 requests/hour, or 15,000 requests/hour for Enterprise Cloud installations.
- The ApplicationSet example used outdated template variables and omitted required Application fields. I updated it to use `goTemplate`, `{{.path.basename}}`, `{{.path.path}}`, `project`, and `destination`.
- The SSH section overstated that SSH avoids provider API rate limits generally. I clarified that SSH avoids REST API requests for normal clone/fetch operations, while Git transport and abuse-detection limits can still apply.
- The reconciliation jitter example used the wrong key and ConfigMap. I changed it from `controller.reconciliation.jitter` in `argocd-cmd-params-cm` to `timeout.reconciliation.jitter` in `argocd-cm`.
- The emergency restart command only restarted the application controller Deployment. I updated it to restart the standard application-controller StatefulSet and repo-server Deployment, matching Argo CD's restart guidance for reconciliation setting changes.

## Review Notes
The guide is technically valid after these corrections. Provider rate limits can still vary by account type, enterprise plan, Git transport, and abuse-detection behavior, so future updates should re-check the provider documentation before publishing.
