# Validation Summary: How to Debug Services with Linkerd

## Status
validated

## Post Type
Technical guide / debugging tutorial

## Technologies Covered
- Linkerd service mesh
- Linkerd Viz extension
- Kubernetes
- Linkerd ServiceProfile resources
- Linkerd SMI TrafficSplit resources
- Gateway API migration considerations
- kubectl
- jq

## Sources Consulted
- Linkerd CLI `check` reference: https://linkerd.io/2-edge/reference/cli/check/
- Linkerd CLI `viz` reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd CLI `diagnostics` reference: https://linkerd.io/2-edge/reference/cli/diagnostics/
- Linkerd CLI `identity` reference: https://linkerd.io/2-edge/reference/cli/identity/
- Linkerd CLI `profile` reference: https://linkerd.io/2-edge/reference/cli/profile/
- Linkerd Service Profiles reference: https://linkerd.io/2-edge/reference/service-profiles/
- Linkerd retries documentation: https://linkerd.io/2.10/tasks/configuring-retries/
- Linkerd Traffic Shifting documentation: https://linkerd.io/2-edge/tasks/traffic-shifting/
- Linkerd SMI extension documentation: https://linkerd.io/2-edge/tasks/linkerd-smi/
- Linkerd tap JSON implementation discussion: https://github.com/linkerd/linkerd2/issues/3390

## Issues Found
- Replaced `linkerd stat deploy` with `linkerd viz stat deploy`, because current Linkerd metrics commands are under the Viz extension.
- Clarified `linkerd check --proxy` as data plane proxy checks instead of saying it additionally runs all checks.
- Corrected `linkerd viz tap --path` examples and text. Linkerd documents `--path` as a path-prefix filter, not a regex filter.
- Removed `--path=".*"` from 5xx tap examples because it would be interpreted as a literal prefix, not "all paths".
- Replaced an unsupported `linkerd viz tap --from` example with a supported namespace tap plus `--to` and `--to-namespace`.
- Corrected tap JSON `jq` paths from camelCase fields to the snake_case JSON structure under `.http`.
- Adjusted the slow-request tap JSON example so it only reads fields available on response-end events.
- Added a Linkerd 2.16+ caveat that ServiceProfiles are supported for backward compatibility but Gateway API resources are preferred for new route metrics, retry, and timeout configuration.
- Updated the TrafficSplit snippet from `split.smi-spec.io/v1alpha1` to `split.smi-spec.io/v1alpha2` and noted that the Linkerd SMI extension is deprecated.
- Replaced proxy-container certificate inspection commands with `linkerd identity`, since the proxy container should not be assumed to include shell utilities such as `cat` or `openssl`.
- Changed the connectivity test to execute from a client application container instead of the Linkerd proxy container, which should not be assumed to include `wget`.

## Review Notes
The post remains accurate as a practical Linkerd debugging guide after these fixes. Future updates should consider replacing legacy ServiceProfile and SMI TrafficSplit examples with Gateway API `HTTPRoute` / `GRPCRoute` examples for new Linkerd deployments.
