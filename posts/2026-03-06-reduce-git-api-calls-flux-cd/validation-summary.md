# Validation Summary: How to Reduce Git API Calls from Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes Custom Resources
- GitRepository, Receiver, Kustomization, and ImageUpdateAutomation APIs
- GitHub, GitLab, and Bitbucket rate limits
- PrometheusRule monitoring

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux Provider commit status documentation: https://fluxcd.io/flux/components/notification/providers/#git-commit-status-updates
- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GitLab.com rate limits: https://docs.gitlab.com/user/gitlab_com/#rate-limits-on-gitlabcom
- Bitbucket Cloud rate limits: https://confluence.atlassian.com/bitbucket/ract-lims-668173227.html

## Issues Found
- The post described GitRepository polling as provider API calls and stated each cycle calls `git ls-remote`. Flux documentation describes GitRepository reconciliation as checking/fetching the Git repository on `.spec.interval`; this is Git transport traffic, not necessarily provider REST API usage. Updated the language to distinguish scheduled Git checks from provider API calls.
- The post said webhook signature validation involves API calls. Flux Receiver documentation shows GitHub HMAC validation and GitLab token validation are performed locally by notification-controller. Updated the wording.
- The Bitbucket Receiver example used a Bitbucket Cloud-style event with `type: bitbucket`. Flux documents `type: bitbucket` for Bitbucket Server/Data Center and notes Bitbucket Cloud should use a generic Receiver. Updated the event to `repo:refs_changed` and added a Bitbucket Cloud caveat.
- The Bitbucket Cloud rate-limit table only listed the repository data API limit. Added the documented Git HTTPS request limit to avoid applying the REST API data limit to Git fetch traffic.
- The Git cache proxy example referenced an unverified image and environment variables. Replaced it with a documented Git cache image usage pattern and corrected the proxy URL format.
- The monitoring example labeled reconciliation-count metrics as exact Git API call monitoring. Flux documents `gotk_reconcile_duration_seconds_count` as a reconciliation metric, so the text now describes it as an estimate of scheduled Git checks.

## Review Notes
The Flux API versions used in the examples are current: `source.toolkit.fluxcd.io/v1`, `notification.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, and `image.toolkit.fluxcd.io/v1`. The Prometheus metric names used in the monitoring example match Flux's documented controller metrics. All fenced YAML snippets parse successfully.
