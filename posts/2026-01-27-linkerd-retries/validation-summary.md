# Validation Summary: How to Configure Linkerd Retries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linkerd
- Linkerd ServiceProfiles
- Linkerd Viz CLI
- Kubernetes
- Prometheus and PrometheusRule
- Service mesh retries and timeouts

## Sources Consulted
- Linkerd Service Profiles reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd Retries reference: https://linkerd.io/2-edge/reference/retries/
- Linkerd Timeouts reference: https://linkerd.io/2-edge/reference/timeouts/
- Linkerd Proxy Metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd 2.10 Configuring Retries task documentation: https://linkerd.io/2.10/tasks/configuring-retries/

## Issues Found
- The post implied that Linkerd automatically retries requests based on safe HTTP methods. Updated the explanation to state that routes must be explicitly configured as retryable, and that HTTP method alone does not enable retries.
- The post presented ServiceProfiles as the current primary retry configuration mechanism. Added a version caveat that ServiceProfiles remain supported for backwards compatibility, but have been superseded by Gateway API resources and retry annotations as of Linkerd 2.16.
- The timeout examples described ServiceProfile timeouts as per-attempt timeouts. Updated the wording and diagrams to reflect Linkerd's ServiceProfile behavior: route timeout is the maximum time for the response including retries.
- The complete production ServiceProfile placed `GET /orders/{id}` before `GET /orders/search`, causing `/orders/search` to match the single-order route first. Moved the search route before the single-order route.
- The monitoring section used `response_total{classification="retry"}`, but Linkerd response classifications are `success` and `failure`; retries are monitored by comparing effective and actual outbound route traffic. Replaced the invalid PromQL examples with a metrics note and corrected `linkerd viz routes --to ... -o wide` commands.
- The Prometheus alert examples were retry-specific and used the invalid retry classification. Reworked them into valid response failure/success rate alerts using Linkerd's documented `response_total` labels.

## Review Notes
The ServiceProfile examples remain technically valid for clusters that still use ServiceProfiles. For new Linkerd configurations on Linkerd 2.16 and later, a future post revision should consider using Gateway API HTTPRoute/GRPCRoute retry annotations instead of ServiceProfiles.
