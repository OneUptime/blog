# Validation Summary: Does Envoy Pull or Does Istiod Push? Trace the Long-Lived xDS Stream from Bootstrap to ACK and NACK

## Status

validated

## Post Type

Technical explanation and troubleshooting guide with shell commands.

## Technologies Covered

- Istio 1.31, Istiod, pilot-agent, and istioctl
- Envoy bootstrap, ADS, state-of-the-world and delta xDS
- CDS, EDS, LDS, RDS, ECDS, and remote WebAssembly conversion
- Kubernetes Pods, Services, EndpointSlices, revisions, and NetworkPolicy
- gRPC, HTTP/2, TLS, TCP, and Unix-domain sockets
- Bash, kubectl, jq, and grep

## Sources Consulted

- [Envoy xDS protocol](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol.html): subscriptions, transport variants, versions, nonces, ACK/NACK semantics, and resource grouping.
- [Envoy configuration sources](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/config_source.proto.html): ADS and alternative delivery mechanisms.
- [Envoy initialization](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/init): initialization and dependency warming.
- [Istio proxy diagnostics](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/): synchronization states and configuration inspection.
- [istioctl command reference](https://istio.io/latest/docs/reference/commands/istioctl/): proxy-config subcommands, resource syntax, output flags, proxy-status selectors, and analyze options.
- [Istio architecture](https://istio.io/latest/docs/ops/deployment/architecture/): control-plane and data-plane responsibilities.
- [Istio application requirements](https://istio.io/latest/docs/ops/deployment/application-requirements/): control-plane ports.
- [Istio resource annotations](https://istio.io/latest/docs/reference/config/annotations/): actual revision annotation, proxy configuration annotation, and deprecated discovery-address annotation.
- [Istio configuration scoping](https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/): visibility and discovery scope.
- [pilot-discovery command reference](https://istio.io/latest/docs/reference/commands/pilot-discovery/): graceful connection lifetime configuration.
- [Istio 1.31 xDS proxy source](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go): upstream initiation, forwarding, internal handlers, logs, and ECDS conversion failures.
- [Istio 1.31 delta proxy source](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy_delta.go): delta connection logs, reconnect behavior, and delta acknowledgements.
- [Istio 1.31 bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json): static xds-grpc cluster, UDS address, and ADS configuration.
- [Istio 1.31 constants](https://github.com/istio/istio/blob/release-1.31/pkg/config/constants/constants.go) and [mesh defaults](https://github.com/istio/istio/blob/release-1.31/pkg/config/mesh/mesh.go): default configuration directory.
- [Istio 1.31 injection template](https://github.com/istio/istio/blob/release-1.31/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml): revision annotation and PROXY_CONFIG injection.
- [Istio 1.31 proxy-config implementation](https://github.com/istio/istio/blob/release-1.31/istioctl/pkg/proxyconfig/proxyconfig.go) and [config dump writer](https://github.com/istio/istio/blob/release-1.31/istioctl/pkg/writer/envoy/configdump/configdump.go): command syntax and bootstrap JSON output structure.
- [Istio 1.31 keepalive options](https://github.com/istio/istio/blob/release-1.31/pkg/keepalive/options.go): configurable graceful connection aging.
- [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/): flags, selectors, output formats, previous-container logs, and server dry-run.
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/): endpoint readiness conditions.
- [jq manual](https://jqlang.org/manual/): object construction, selection, regular expressions, and array traversal.
- [RFC 9293](https://datatracker.ietf.org/doc/html/rfc9293): TCP headers, connection establishment, and keepalives.
- [gRPC keepalive guide](https://grpc.io/docs/guides/keepalive/): HTTP/2 PING keepalives and connection age settings.

## Issues Found

1. **Transport scope was too broad.** Changed the introductory claim from generic xDS to streaming gRPC xDS because xDS also supports filesystem and REST delivery. Labeled the diagram's message names as state-of-the-world examples.
2. **The connection-log filter omitted delta streams.** Added an optional `delta ` segment to match the actual successful connection message in the Istio 1.31 delta proxy implementation.
3. **Discovery-address and retained-log guidance needed qualifications.** Identified the discovery-address annotation as deprecated and described it as a legacy clue. Clarified that `kubectl logs --previous` retrieves a previous container instance, not rotated files from the current container.
4. **The endpoint command did not expose readiness.** Changed EndpointSlice output from wide to YAML and directed readers to `conditions.ready`. Added the necessary Service-name substitution for revisioned installations.
5. **Reconnects were presented as necessarily problematic.** Included configured graceful connection aging as a possible cause and named the delta RPC alongside the state-of-the-world RPC.
6. **The delta comparison overgeneralized complete-state responses.** Clarified that the state-of-the-world requirement applies to LDS and CDS, while other types may return resource subsets. Named delta request and response messages explicitly.
7. **Response and acknowledgement details lacked transport scope.** Scoped DiscoveryResponse and request-level version rules to state-of-the-world exchanges, described delta acknowledgement fields, and clarified per-resource-type nonce tracking within ADS.
8. **The push definition required an underlying configuration change.** Included initial subscriptions, subscription changes, and resynchronization as reasons for delivery without an underlying configuration edit.
9. **Packet-capture claims exceeded available evidence.** Required the handshake to establish connection initiation and log or socket correlation to identify pilot-agent. Distinguished observable TCP keepalives from encrypted HTTP/2 PINGs.

## Review Notes

- Confirmed the two connection legs, default local socket path, request forwarding, agent-owned internal acknowledgements, and possible agent-generated ECDS NACKs against the release-1.31 source.
- The bootstrap jq paths match istioctl's BootstrapConfigDump JSON structure. The xds-grpc cluster describes the local leg; bootstrap metadata may separately include discovery configuration, but does not prove remote connectivity.
- Preserved the protocol caveats that an ACK does not guarantee successful application and a NACK does not establish that every resource was discarded.
- Verified all nine Bash blocks with `bash -n`. Executed both jq filters against representative synthetic JSON and checked the revised grep expression against four startup, connection, and failure messages, including both stream variants.
- This was a documentation and source review, not a live Kubernetes integration test. Example Pod names, namespace, Service, revision selector, and candidate manifest must match the reader's environment. No cluster resources were changed.
- The referenced documentation pages resolved. GitHub page retrieval through the browser tool failed, but the relevant release-1.31 source files were retrieved successfully from GitHub's raw-content endpoint and inspected directly.
- The version-specific implementation was checked against release-1.31. The latest documentation URLs and release branch are moving references; future releases can change implementation details.
- Created validation.json with status validated and the requested date, 2026-09-05. Changes to README.md are limited to technical corrections within its existing structure.
