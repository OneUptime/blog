# Validation Summary: How to Manage Linkerd Configuration with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Linkerd
- Argo CD
- Kubernetes
- Gateway API HTTPRoute
- ServiceProfile
- Linkerd authorization policy resources
- SMI TrafficSplit
- Kustomize
- PrometheusRule

## Sources Consulted
- Linkerd Service Profiles reference: https://linkerd.io/docs/reference/service-profiles/
- Linkerd Retries and Timeouts feature documentation: https://linkerd.io/docs/features/retries-and-timeouts/
- Linkerd Retries reference: https://linkerd.io/2-edge/reference/retries/
- Linkerd Timeouts reference: https://linkerd.io/2-edge/reference/timeouts/
- Linkerd HTTPRoute reference: https://linkerd.io/docs/reference/httproute/
- Linkerd Authorization Policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Linkerd Traffic Split documentation: https://linkerd.io/docs/features/traffic-split/
- Linkerd CLI viz reference: https://linkerd.io/docs/reference/cli/viz/
- Linkerd Proxy Metrics reference: https://linkerd.io/2.15/reference/proxy-metrics/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/

## Issues Found
- The description claimed the post covered multi-cluster mesh management, but the content does not include multi-cluster configuration. Updated the description to reference authorization policies instead.
- The post described ServiceProfiles as the primary per-route configuration mechanism. Linkerd documentation says ServiceProfiles are still supported but have been supplanted by Gateway API resources as of Linkerd 2.16. Updated the wording while keeping the ServiceProfile examples as backwards-compatible configuration.
- The default-deny example used a `Server` and described it as namespace-wide default deny. A `Server` only applies to selected pods and ports; namespace default policy is configured with the `config.linkerd.io/default-inbound-policy: deny` annotation. Replaced the example with a namespace annotation.
- The `Server` and `ServerAuthorization` examples used `policy.linkerd.io/v1beta2`, but Linkerd's stable authorization policy reference uses `policy.linkerd.io/v1beta1` for those resources. Updated the examples to `v1beta1`.
- The TrafficSplit section did not mention that Linkerd TrafficSplit and the Linkerd SMI extension are deprecated. Added the deprecation caveat and recommended HTTPRoute-based dynamic request routing for new deployments.
- The HTTPRoute example used the older Linkerd-specific `policy.linkerd.io/v1beta2` HTTPRoute API. Linkerd now encourages the canonical Gateway API HTTPRoute resource where possible. Updated the example to `gateway.networking.k8s.io/v1`.
- The timeout/retry section implied ServiceProfiles should be used for per-route configuration generally. Updated it to explain that current Linkerd versions use HTTPRoute or GRPCRoute annotations, and that ServiceProfiles take precedence when present.
- The Prometheus alert for retries used `classification="retry"`, but Linkerd `response_total` classification labels are success/failure, not retry. Replaced it with a high failure-rate alert using `classification="failure"`.

## Review Notes
The remaining ServiceProfile and ServerAuthorization examples are still valid for supported backwards-compatible configurations, but new Linkerd deployments should prefer Gateway API resources and AuthorizationPolicy where applicable. The Argo CD multi-source Application and diff customization examples match official Argo CD documentation patterns.
