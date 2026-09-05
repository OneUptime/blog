# Validation Summary: Envoy Has an Endpoint but Still Returns 503: Check Outlier Ejection, Health Flags, and Circuit-Breaker State

## Status

validated

## Post Type

Technical troubleshooting guide with shell commands and an Istio configuration example.

## Technologies Covered

- Envoy: access logs, EDS, host health, outlier detection, priority load balancing, panic mode, circuit breakers, and admin statistics.
- Istio: sidecars, gateways, waypoints, DestinationRule, istioctl, pilot-agent, and telemetry configuration.
- Kubernetes: Pods, Services, EndpointSlices, readiness, and kubectl.
- Bash, YAML, and JSON.

## Sources Consulted

- [Istio: DestinationRule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: Circuit breaking task](https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/)
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Envoy: Response flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html#config-access-log-format-response-flags)
- [Envoy: Outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier)
- [Envoy: Health checking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking)
- [Envoy: Panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold)
- [Envoy: Circuit breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking)
- [Envoy: Administration interface](https://www.envoyproxy.io/docs/envoy/latest/operations/admin)
- [Istio: istioctl command reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [Istio: pilot-agent command reference](https://istio.io/latest/docs/reference/commands/pilot-agent/)
- [Istio: Envoy statistics and proxyStatsMatcher](https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/)
- [Istio: Envoy access logs](https://istio.io/latest/docs/tasks/observability/logs/access-log/)
- [Istio: Health checking of services](https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/)
- [Envoy: Response code details](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/response_code_details)
- [Envoy: Admin cluster and host status schema](https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto)
- [Envoy: Outlier detection schema](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto)
- [Envoy: Circuit-breaker schema](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto)
- [Envoy: Cluster statistics](https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: kubectl exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Issues Found

1. **Route output omitted the destination details needed by the procedure.** Added `-o json` to the route query so readers can inspect the actual route action and destination cluster rather than only the default summary.
2. **Failover priority was described as a route destination alongside subset and port.** Clarified that failover priorities are handled by the cluster load balancer and are not separate destination cluster names.
3. **Endpoint summary output did not expose all requested fields.** Added `-o json` to the cluster-filtered endpoint query so locality, weight, and detailed host health are available.
4. **The outlier-policy inspection mixed Istio fields with generated Envoy fields.** Changed the DestinationRule listing to YAML so its policy values are visible, identified the listed names as DestinationRule fields, and supplied the corresponding Envoy JSON names for the three consecutive-failure thresholds.
5. **Membership statistics were described as counters, and missing statistics were insufficiently qualified.** Identified membership totals as gauges and explained that Istio's statistics matcher can omit metrics; missing output is not evidence of zero failures.
6. **The capacity inspection called overflow statistics gauges and assumed remaining-capacity gauges were available.** Distinguished overflow counters from active gauges and identified `track_remaining` as the prerequisite for the remaining-capacity gauges.
7. **Request budgets were described as protocol-specific.** Corrected the explanation to state that both `http1MaxPendingRequests` and `http2MaxRequests` apply to HTTP/1.1 and HTTP/2, despite their names.

## Review Notes

- Verified the response-flag meanings, local versus upstream-generated 503 distinction, and the warning that response-code-detail strings are not a stable API.
- Verified passive ejection, enforcement limits, repeated-ejection backoff, and interaction with active health checks. The distinction between endpoint membership, runtime health, and per-proxy observations is sound.
- Verified Envoy's default 50 percent panic threshold, fail-open/fail-closed behavior, and priority interaction. Generated Istio configuration and runtime settings remain the authority for an installed proxy.
- Verified the kubectl and Istio CLI forms and flags against their official references. All eight Bash blocks passed `bash -n`; the YAML snippet parsed successfully; validation.json parsed and matched the required status and date.
- The YAML example is a trafficPolicy fragment to place under a DestinationRule spec, not a complete standalone Kubernetes manifest. Its field names, numeric values, and duration strings are valid.
- This was a documentation and syntax review. No live mesh was provisioned or queried, and the example Pod/service names were not runtime-tested. Actual metric availability, endpoint state, routing, and overflow behavior require the operator's cluster.
- The post does not pin an Istio or Envoy release. The linked latest documentation changes over time, and Envoy's latest documentation may describe development behavior. Operators should consult documentation matching the Envoy version bundled with their Istio release.
- All nine official-documentation links resolved to the intended resources. The author link also resolved to the matching GitHub profile.
- Changes were limited to technical corrections within the existing structure; no sections were added to the post.
