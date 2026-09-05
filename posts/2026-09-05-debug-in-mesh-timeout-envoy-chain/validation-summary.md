# Validation Summary: Traffic Works Outside the Mesh but Times Out Inside: Walk Envoy's Listener-to-Cluster-to-Endpoint Chain

## Status

validated

## Post Type

Technical troubleshooting guide with diagnostic CLI examples.

## Technologies Covered

- Istio sidecar traffic capture, istioctl, VirtualService, DestinationRule, Sidecar configuration, and PeerAuthentication.
- Envoy listeners, HTTP routes, clusters, endpoint discovery, access logs, response flags, and timeouts.
- Kubernetes Services, DNS, EndpointSlices, Pods, kubectl, CNI networking, and NetworkPolicy.
- HTTP/1.1, HTTP/2, gRPC, TCP, TLS, and mutual TLS.
- curl and Linux name-service diagnostics.

## Sources Consulted

- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: istioctl command reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [Istio: Understanding Traffic Routing](https://istio.io/latest/docs/ops/configuration/traffic-management/traffic-routing/)
- [Istio: Protocol Selection](https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/)
- [Istio: Understanding TLS Configuration](https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/)
- [Istio: Configuration Scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/)
- [Istio: VirtualService reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio: DestinationRule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Istio: PeerAuthentication reference](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [Istio: Application Requirements](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Istio: Envoy Access Logs](https://istio.io/latest/docs/tasks/observability/logs/access-log/)
- [Envoy: Substitution Formatter and Response Flags](https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html)
- [Envoy: Access logging lifecycle](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/access_logging.html)
- [Envoy: How to Configure Timeouts](https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: kubectl exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [Kubernetes: kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [curl: Command-line manual](https://curl.se/docs/manpage.html)
- [Linux man-pages: getent(1)](https://man7.org/linux/man-pages/man1/getent.1.html)

## Issues Found

1. **Source Pod correlation was not guaranteed.** Separate `kubectl exec deploy/test-client` and `kubectl logs deploy/test-client` calls select a Pod from a Deployment; they do not pin a shared Pod across commands or rollouts. Changed the source commands to `pod/test-client-POD` and instructed readers to substitute the same actual Pod throughout. This also aligns the request with the existing istioctl examples.
2. **Missing access logs could be misinterpreted.** Added the possibility that an HTTP stream or TCP connection has not ended and therefore has not emitted its default access log. At the destination, required connection counters or packet evidence before concluding that traffic never arrived; missing access logs alone cannot rule out handshake failures or open connections. Envoy documents end-of-stream/connection logging as the default when logging is enabled.
3. **The DNS statement covered all Services too broadly.** Qualified the ClusterIP/headless behavior, allowed multiple Service IPs for dual stack, and distinguished ExternalName Services, which return a CNAME.
4. **Application forwarding and port mapping were conflated.** Clarified that endpoint selection uses the resolved Service `targetPort`, whereas destination forwarding follows the inbound proxy configuration. Replaced the external container-port-mapping explanation with comparison of the actual outside Service target or backend. A Kubernetes `containerPort` declaration does not create a mapping or make an application listen on that port.
5. **The timer inspection locations were incomplete.** Added the listener's HTTP connection manager and TCP proxy filter to the route/cluster inspection advice. Stream and connection timers can reside in those filters rather than in a route or cluster.
6. **The outside-path diagram omitted the destination sidecar.** Included destination Envoy after endpoint A, consistent with normal inbound capture for an injected backend. Arrival through an ingress gateway does not itself bypass that sidecar.

## Review Notes

- Reviewed all shell examples against the applicable CLI references. The istioctl plural subcommands, typed Pod arguments, namespace suffixes, JSON output, listener port filter, cluster FQDN filter, and endpoint cluster filter are supported. `istioctl x describe pod` remains an experimental command; it is not a deprecated command.
- Confirmed protocol classification and `appProtocol` precedence, ordered HTTP matching, gateway versus mesh applicability, short-name namespace resolution, configuration scoping, auto-mTLS, endpoint subsets and outlier handling, response-flag meanings, and the Service-port/workload-port distinction in the two TLS policy APIs.
- The ingress and sidecar protocol/TLS difference is a possible configuration difference, not a default guarantee. Gateways also support auto-mTLS; the existing conditional wording is appropriate.
- The guide assumes sidecar mode and captured application traffic. Ambient mode uses a different data path. Names, ports, container names, labels, and the `cluster.local` DNS suffix are examples that must match the deployment.
- EndpointSlice readiness is subject to `publishNotReadyAddresses` and terminating/serving conditions; advertised readiness does not establish reachability from every caller. Envoy health and outlier state must also be inspected.
- `getent ahosts` checks the container's name-service resolver and may be unavailable in minimal images. It does not guarantee identical results to an application's custom resolver. The curl flags are valid; verbose output alone does not report all requested timing metrics numerically. curl's write-out timing variables can support that data collection.
- All eight official documentation links in the post resolved to the intended resources. The author profile also resolved. The `/latest/` documentation is moving documentation, and Envoy's latest pages can describe development builds; use the installed Istio/Envoy release when checking defaults or generated configuration details.
- Validation was documentation-based with shell syntax checking, not execution against a Kubernetes cluster. No live request, packet capture, TLS handshake, endpoint-health, rollout, or recovery result is claimed.
- Only technical corrections were made to the README; its sections and overall organization were preserved.
