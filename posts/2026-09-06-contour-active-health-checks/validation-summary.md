# Validation Summary: Configure Contour Active Health Checks Safely

## Status
validated

## Post Type
Technical configuration guide.

## Technologies Covered
- Project Contour 1.33 and the projectcontour.io/v1 HTTPProxy API
- Envoy HTTP and TCP active health checks
- Kubernetes Services, EndpointSlices, NetworkPolicy, and container probes
- kubectl, JSONPath, and YAML
- TLS passthrough, SNI, and PostgreSQL connection negotiation

## Sources Consulted
- [Contour 1.33 upstream health checks](https://projectcontour.io/docs/1.33/config/health-checks/)
- [Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Contour 1.33 common proxy errors](https://projectcontour.io/docs/1.33/troubleshooting/common-proxy-errors/)
- [Contour 1.33 TLS session proxying and passthrough](https://projectcontour.io/docs/1.33/config/tls-termination/)
- [Contour 1.33 Envoy administration access](https://projectcontour.io/docs/1.33/troubleshooting/envoy-admin-interface/)
- [Contour v1.33.0 health-check generation](https://github.com/projectcontour/contour/blob/v1.33.0/internal/envoy/v3/healthcheck.go)
- [Contour v1.33.0 cluster generation](https://github.com/projectcontour/contour/blob/v1.33.0/internal/envoy/v3/cluster.go)
- [Contour v1.33.0 HTTPProxy processing](https://github.com/projectcontour/contour/blob/v1.33.0/internal/dag/httpproxy_processor.go)
- [Contour v1.33.0 EndpointSlice translation](https://github.com/projectcontour/contour/blob/v1.33.0/internal/xdscache/v3/endpointslicetranslator.go)
- [Envoy upstream health checking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking)
- [Envoy health-check API](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto)
- [Kubernetes probe concepts](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes probe configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [PostgreSQL connection parameters: sslnegotiation and sslsni](https://www.postgresql.org/docs/current/libpq-connect.html)

## Issues Found
1. **HTTP failure thresholds were underspecified.** The post highlighted immediate failure for 503 but described other failures generically. Envoy immediately rejects statuses outside the expected and retriable ranges, and Contour 1.33 does not configure retriable ranges. Clarified that unexpected HTTP responses bypass the threshold and that the timing estimate concerns connection failures; timeouts can add delay.
2. **The ten-second cadence omitted initial no-traffic behavior.** Contour leaves Envoy's no-traffic interval unset. Reworded the example introduction and timing paragraph to account for Envoy's sixty-second interval before a cluster has received traffic.
3. **The TCP passthrough example omitted a protocol prerequisite.** Added the requirement for an initial TLS handshake with matching SNI and a compatible backend. Port 5432 suggests PostgreSQL, whose default SSLRequest negotiation is incompatible with generic SNI routing; clarified the need for direct TLS support.
4. **The readiness statement omitted a Service exception.** Qualified endpoint readiness removal for Services with publishNotReadyAddresses enabled, which publish EndpointSlice ready conditions as true despite Pod readiness.

## Review Notes
- Confirmed the HTTPProxy fields, nesting, defaults listed in the post, status ranges, Host header, startup success behavior, and TCP connect-only policy against the API reference and implementation.
- Confirmed that healthPort selects a Service port for both HTTP and TCP policies; EndpointSlice translation resolves the separate endpoint port by Service port name. The provided two-port Service is consistent with that behavior.
- The named target ports require matching Pod container port declarations and actual listeners. The readiness example belongs inside a container specification; the TCP example is an HTTPProxy spec fragment, not a standalone resource.
- Contour 1.33 explicitly disables Envoy's healthy panic threshold. Therefore, the all-endpoints-unhealthy test and UH monitoring advice are appropriate for the generated configuration.
- Checked kubectl namespace, output, selector, and JSONPath syntax against official references. The HTTPProxy status fields remain present in the 1.33 API.
- All six documentation links resolve to the intended resources; the older Kubernetes probe URL redirects to the current probe concepts page.
- Review targets the explicitly stated Contour 1.33 version. Envoy latest and Kubernetes documentation are moving references; Contour source was pinned to v1.33.0 for generated behavior. PostgreSQL direct TLS negotiation was introduced in version 17.
- Validation is based on documentation, source inspection, and local syntax checks. No Kubernetes cluster deployment, live traffic test, or fault-injection test was performed.
