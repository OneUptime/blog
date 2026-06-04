# Validation Summary: How to Configure Linkerd Service Profiles for Per-Route Retry Budgets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd ServiceProfiles
- Linkerd Viz CLI
- Kubernetes Deployments and Services
- Prometheus metrics and PromQL
- Linkerd SMI TrafficSplit
- Gateway API HTTPRoute and GRPCRoute

## Sources Consulted
- Linkerd ServiceProfiles reference: https://linkerd.io/docs/reference/service-profiles/
- Linkerd configuring retries task: https://linkerd.io/2.11/tasks/configuring-retries/
- Linkerd Viz CLI reference: https://linkerd.io/docs/reference/cli/viz/
- Linkerd proxy metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd retries and timeouts feature docs: https://linkerd.io/2/features/retries-and-timeouts/
- Linkerd traffic shifting task: https://linkerd.io/docs/tasks/traffic-shifting/

## Issues Found
- The post described "per-route retry budgets", but ServiceProfile retry budgets are configured at the service profile level while retryability is configured per route. Updated the title, description, introduction, and explanations to distinguish per-route retry policies from service-level retry budgets.
- The post claimed Linkerd treats all traffic as opaque TCP without a ServiceProfile. Updated this to clarify that Linkerd can still proxy detected HTTP traffic, but ServiceProfiles provide the route metadata needed for ServiceProfile-based per-route metrics, retries, and timeouts.
- The post did not mention that ServiceProfiles have been supplanted by Gateway API types as of Linkerd 2.16. Added a concise backwards-compatibility caveat.
- Several CLI commands used old top-level Linkerd Viz commands (`linkerd profile`, `linkerd stat`, `linkerd routes`, and `linkerd tap`). Updated them to current `linkerd viz profile`, `linkerd viz routes`, and `linkerd viz tap` forms.
- The retry budget behavior example ignored `minRetriesPerSecond`. Updated the calculation to include the additional retry allowance.
- The Prometheus example referenced `retry_budget_limited_total`, which was not present in the official Linkerd proxy metrics reference. Removed that metric and replaced the guidance with documented route metrics and `linkerd viz routes ... -o wide`.
- The debugging section said unmatched routes show `"default"` in tap output. Updated this to state that `rt_route` is absent when requests are not associated with a ServiceProfile route.
- The traffic splitting section used SMI TrafficSplit without noting that current Linkerd releases prefer Gateway API HTTPRoute/GRPCRoute for new traffic splitting. Added a concise caveat while keeping the existing example.

## Review Notes
ServiceProfiles remain supported for backwards compatibility, but new Linkerd deployments should consider Gateway API resources for retries, timeouts, route metrics, and traffic splitting. The sample application images are placeholders and require real images with matching HTTP endpoints before the walkthrough can be run end to end.
