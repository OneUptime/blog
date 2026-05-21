# Validation Summary: How to Understand Ambient Mode's HBONE Protocol

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- HBONE
- ztunnel
- HTTP/2 CONNECT
- mTLS and SPIFFE workload identities
- Kubernetes NetworkPolicy
- kubectl, istioctl, tcpdump, and AWS CLI

## Sources Consulted
- Istio ambient HBONE architecture: https://preliminary.istio.io/latest/docs/ambient/architecture/hbone/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ztunnel traffic redirection: https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio ambient Layer 4 security policy: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio ambient and Kubernetes NetworkPolicy: https://istio.io/latest/docs/ambient/usage/networkpolicy/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio verify mutual TLS in ambient mode: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio ztunnel metrics documentation: https://github.com/istio/ztunnel
- HTTP/2 RFC 9113: https://www.rfc-editor.org/rfc/rfc9113.html
- Istio ambient performance benchmark post: https://istio.io/latest/blog/2025/ambient-performance/

## Issues Found
- The post said HBONE transport mTLS between ztunnels uses the ztunnel's own identity. Istio's current data plane documentation says ztunnel manages workload certificates and ztunnel's own identity is not used for workload mTLS connections, so the transport identity explanation was corrected.
- The HTTP/2 CONNECT example mixed an HTTP/1.1-style request line with HTTP/2 pseudo-headers. RFC 9113 defines CONNECT over HTTP/2 using pseudo-headers, so the example was changed to `:method: CONNECT` and `:authority`.
- The Kubernetes `NetworkPolicy` example selected ztunnel pods in `istio-system`. Istio's NetworkPolicy guidance says ambient workloads receiving HBONE traffic need port 15008 allowed, so the example was changed to target an application workload and include port 15008 alongside the application port.
- The traffic flow described source-side L4 AuthorizationPolicy checks. Istio documents ztunnel L4 policy enforcement at the receiving/server-side ztunnel, so the source-side policy check was removed.
- The same-node traffic section implied a direct in-process forwarding optimization and certificate validation wording that is not how the official docs describe it. The section was revised to state that traffic still traverses local ztunnel and retains the same L4 policy and telemetry behavior.
- The debugging snippets used undocumented or incorrect ztunnel endpoints for HBONE status and stats. They were replaced with `istioctl ztunnel-config workloads` and the documented ztunnel metrics endpoint on port 15020.
- The performance section made an unsupported precise claim about HBONE being within a few percent of direct mTLS and plaintext. It was softened to match Istio's published ambient benchmark claims without over-specific numbers.

## Review Notes
The post is technically relevant and useful after the corrections. Some details of Istio ambient continue to evolve across releases, especially ztunnel implementation details and performance characteristics, so future refreshes should re-check the Istio version current at publication time.
