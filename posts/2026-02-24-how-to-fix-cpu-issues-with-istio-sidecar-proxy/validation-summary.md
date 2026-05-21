# Validation Summary: How to Fix CPU Issues with Istio Sidecar Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio sidecar proxy
- Envoy
- Kubernetes
- Prometheus
- Prometheus Operator alerting rules

## Sources Consulted
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Telemetry API access log task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio in-mesh certificate management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/manage-mesh-certificates/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Envoy command line options reference: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Envoy admin interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy server_info admin API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/server_info.proto

## Issues Found
- The post said Istio sidecar concurrency defaults to the number of CPU cores available to the container. Current Istio ProxyConfig documentation says unset concurrency is automatically determined from CPU limits, while `concurrency: 0` uses all cores. Updated the explanation and example wording.
- The mTLS disabling example implied same-node communication is a reason to disable mTLS and omitted the server-side policy caveat. Updated it to say plaintext must be explicitly allowed by policy, used a fully qualified service host, and noted that STRICT PeerAuthentication will reject plaintext.
- The ECDSA optimization example used `ISTIO_META_CERT_SIGNER` and `PILOT_CERT_PROVIDER`, which configure certificate signing/provider behavior, not workload ECDSA certificates. Replaced it with the documented `ECC_SIGNATURE_ALGORITHM: "ECDSA"` proxy metadata setting.
- The statistics section said Envoy collects many stats by default and showed matchers that would add extra stats such as `cluster.outbound`. Istio documents that it configures a minimal default stats set. Updated the wording and matcher examples to use the documented minimal prefixes.
- The networking API snippets used `networking.istio.io/v1beta1`. Updated the DestinationRule and Sidecar examples to the current `networking.istio.io/v1` API version.
- The Envoy CPU profiler commands used GET requests. Envoy documents `/cpuprofiler` as a POST admin endpoint. Updated the curl commands to use `-X POST`.
- The quick checklist labeled a container status query as finding throttled containers, but it only reports proxy restart counts. Updated the comment to match the command.

## Review Notes
- The Prometheus container CPU and CFS throttling metrics are commonly provided by cAdvisor/Kubernetes monitoring stacks, but label names can vary by setup.
- The access log CEL filter is valid, but for connection failures there may be no `response.code`; Istio documents `!has(response.code) || response.code >= 500` for filters that should include those cases.
