# Validation Summary: How to Request Features for Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Istio GitHub issue workflow
- Istio enhancement process
- Istio DestinationRule retry budgets
- GitHub CLI
- Envoy retry budgets

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio feature request issue template: https://raw.githubusercontent.com/istio/istio/master/.github/ISSUE_TEMPLATE/feature_request.md
- Istio repository labels via GitHub API: https://api.github.com/repos/istio/istio/labels
- Istio enhancements README: https://raw.githubusercontent.com/istio/enhancements/master/README.md
- Istio contributing guide: https://raw.githubusercontent.com/istio/community/master/CONTRIBUTING.md
- Istio working groups: https://raw.githubusercontent.com/istio/community/master/WORKING-GROUPS.md
- Envoy circuit breaking and retry budget documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_circuit_breakers
- GitHub CLI issue list help: `gh issue list --help`

## Issues Found
- The GitHub CLI examples used `kind/feature`, but current Istio issue labels use `kind/enhancement` for feature/enhancement requests. Updated the commands to use `kind/enhancement`.
- The post linked to `https://github.com/istio/istio/blob/master/ROADMAP.md`, which no longer exists. Removed that roadmap reference and kept the current `istio/enhancements` backlog check.
- The retry budget example placed `retryBudget` under `trafficPolicy.connectionPool.http` with Envoy-style field names. Current Istio `DestinationRule` places `retryBudget` directly under `trafficPolicy` and uses `percent` and `minRetryConcurrency`. Updated the snippet.
- The enhancement proposal section implied that contributors should start by creating an issue in `istio/enhancements`. Current Istio guidance says an enhancement may be filed after the idea has been circulated and there is consensus in at least one working group. Updated the process steps.
- The working group names were slightly outdated or incomplete. Updated `Environment` to `Environments`, `Extensions` to `Extensions and Telemetry`, and added `User Experience` as a relevant current working group.

## Review Notes
The retry budget feature used as the article's example already exists in current Istio, so it is best read as an illustrative example of how to frame a request rather than as a currently missing feature.
