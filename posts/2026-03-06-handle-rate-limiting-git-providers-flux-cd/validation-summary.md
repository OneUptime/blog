# Validation Summary: How to Handle Rate Limiting from Git Providers in Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD source-controller
- Flux CD notification-controller Receivers
- Flux CD Kustomization resources
- Kubernetes Secrets, Jobs, Ingress, and Events
- Prometheus Operator PrometheusRule
- GitHub, GitLab.com, and Bitbucket Cloud rate limits

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux archived monitoring metrics reference: https://v2-0.docs.fluxcd.io/flux/guides/monitoring/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- GitHub REST API rate limit documentation: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitLab.com settings and rate limits: https://docs.gitlab.com/user/gitlab_com/
- GitLab user and IP rate limits: https://docs.gitlab.com/administration/settings/user_and_ip_rate_limits/
- Bitbucket Cloud rate limits: https://confluence.atlassian.com/bitbucket/ract-lims-668173227.html

## Issues Found
- The post described Flux Git reconciliation as always making Git provider API calls and said every poll consumes API quota. Updated this to distinguish Git/network requests from REST API quota, because Flux GitRepository checks may count against different provider limits depending on protocol and authentication.
- The Git provider rate-limit list included inaccurate or overly broad values for GitLab and Bitbucket. Updated it to use GitHub REST API limits, GitLab.com authenticated API and raw endpoint limits, and Bitbucket Cloud repository data and Git HTTPS limits.
- The GitRepository interval comment said the default interval is 1 minute. Flux requires `.spec.interval`, so the comment now describes increasing an example interval from 1 minute to 5 minutes.
- The `.spec.ignore` example was described as `.sourceignore`. Updated the comment to clarify that either `.spec.ignore` or a `.sourceignore` file can be used.
- The GitHub App secret comments implied a flat higher rate limit. Updated them to describe the separate installation rate limit and to note that GitRepository must use `spec.provider: github`.
- The webhook section claimed webhooks replace polling and eliminate unnecessary API calls. Updated it to clarify that webhooks trigger immediate reconciliation while periodic polling remains a safety net.
- The webhook Ingress targeted `notification-controller`; current Flux docs expose receiver traffic through the `webhook-receiver` service on port 80. Updated the service name.
- The Prometheus alert used `rate()` on the `gotk_reconcile_condition` gauge and referenced `gotk_reconcile_duration_seconds` as if it were a direct gauge. Updated the failure alert to test the Ready=False gauge directly and the slow-reconcile alert to query the histogram bucket metric.
- The retry section used `retryInterval` under `GitRepository`, but `GitRepository` has no such field. Removed the invalid field and revised the section to describe source-controller retry settings and temporary suspension for persistent rate limits.
- Best-practice and conclusion wording was updated from "API calls" to "provider requests" where the original phrasing was too narrow.

## Review Notes
The example Job uses a service account named `flux-rate-checker`; readers will need matching RBAC for that service account in a real cluster. The Prometheus alerts depend on collecting Flux custom metrics such as `gotk_reconcile_condition` and `gotk_reconcile_duration_seconds_bucket`.
