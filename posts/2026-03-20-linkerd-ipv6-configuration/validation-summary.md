# Validation Summary: How to Configure Linkerd with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linkerd
- Kubernetes dual-stack networking
- IPv6 and dual-stack Pods and Services
- Gateway API HTTPRoute
- Linkerd authorization policy
- Linkerd Viz

## Sources Consulted
- Linkerd IPv6 Support: https://linkerd.io/2-edge/features/ipv6/
- Linkerd Gateway API support: https://linkerd.io/2-edge/features/gateway-api/
- Linkerd install CLI reference: https://linkerd.io/2/reference/cli/install/
- Linkerd viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Linkerd HTTPRoute reference: https://linkerd.io/2/reference/httproute/
- Linkerd Authorization Policy feature docs: https://linkerd.io/2.19/features/server-policy/
- Linkerd Authorization Policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Linkerd Configuring Per-Route Authorization Policy: https://linkerd.io/2.19/tasks/configuring-per-route-policy/
- Linkerd CNI Plugin: https://linkerd.io/2.19/features/cni/
- Linkerd Using the Debug Sidecar: https://linkerd.io/2/tasks/using-the-debug-container/
- Kubernetes dual-stack networking: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service docs: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Gateway API HTTPRoute spec: https://gateway-api.sigs.k8s.io/api-types/httproute/

## Issues Found
- The post claimed Linkerd `2.12+` supports dual-stack IPv6 and that no Linkerd-specific IPv6 configuration is required. Current official Linkerd docs say full IPv6 support arrived in `2.16` and is disabled by default. I updated the introduction, install command, and conclusion to require `disableIPv6=false`.
- The installation section described `linkerd check --pre` as if it validates dual-stack behavior. The CLI documentation describes it as a pre-installation check, so I corrected that wording.
- The control-plane verification section checked `linkerd-dst` for dual-stack `clusterIPs`. Kubernetes Services default to `SingleStack` unless explicitly configured otherwise, so that is not a reliable IPv6 validation method. I replaced it with EndpointSlice inspection and config verification.
- The workload example referenced a Service later in the post but never defined one. I added a matching `Service` object so the examples are internally consistent.
- The proxy verification used `ss` inside the `linkerd-proxy` container. That is not a safe assumption for Linkerd’s proxy image, and Linkerd documents the debug sidecar for this kind of low-level inspection. I replaced the check with meshed pod dual-stack verification.
- The HTTPRoute example used `policy.linkerd.io/v1beta2` while labeling it as Gateway API and used a `group: core` parent reference. I converted it to the current Gateway API form with `gateway.networking.k8s.io/v1` and a Service parent.
- The mTLS policy example used outdated or incorrect API versions (`Server` and `ServerAuthorization` in `v1beta2`). I updated it to current Linkerd policy resources: `Server` `v1beta3`, `MeshTLSAuthentication`, and `AuthorizationPolicy`.
- The observability section used `linkerd viz tap --from-ip`, which is not a documented flag in the current CLI reference. I replaced it with `tap -o wide | grep ...`, which matches documented tap output.
- The troubleshooting section used the deprecated `Endpoints` API and commands that assume `ss` or `ip6tables` exist in ordinary containers. I replaced those with EndpointSlice inspection, proxy log inspection, and proxy-init/CNI checks.

## Review Notes
- The post is now technically correct for current Linkerd behavior, but readers still need a Gateway API release compatible with their Linkerd version before using `gateway.networking.k8s.io/v1` `HTTPRoute` resources.
- On dual-stack clusters with IPv6 enabled, current Linkerd behavior is to use IPv6 destination endpoints rather than mixing IPv4 and IPv6 backends.
