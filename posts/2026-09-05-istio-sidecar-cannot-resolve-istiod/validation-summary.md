# Validation Summary: Istio Sidecar Cannot Resolve istiod: Trace Pod DNS, Bootstrap Configuration, and xDS Cluster Health

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands and Istio configuration inspection examples.

## Technologies Covered
- Istio 1.31, Istiod, pilot-agent, and istioctl
- Envoy bootstrap, Unix-domain sockets, and xDS (CDS, LDS, EDS, RDS)
- Kubernetes Pods, native sidecars, ephemeral containers, Services, EndpointSlices, and NetworkPolicy
- DNS, CoreDNS, NodeLocal DNSCache, IPv4, and IPv6
- TCP, TLS, gRPC, service-account tokens, OpenSSL, nslookup, and netcat
- Bash and jq

## Sources Consulted
- [Istio: Debugging Envoy and Istiod](https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/)
- [Istio: Global Mesh Options](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/)
- [Istio: Understanding DNS](https://istio.io/latest/docs/ops/configuration/traffic-management/dns/)
- [Istio: DNS Proxying](https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/)
- [Istio: Application Requirements and Ports](https://istio.io/latest/docs/ops/deployment/application-requirements/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Debugging DNS Resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Istio source: agent xDS proxy](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/xds_proxy.go)
- [Istio source: Envoy bootstrap template](https://github.com/istio/istio/blob/release-1.31/tools/packaging/common/envoy_bootstrap.json)
- [Istio resource annotations](https://istio.io/latest/docs/reference/config/annotations/)
- [Istio CLI reference](https://istio.io/latest/docs/reference/commands/istioctl/)
- [pilot-agent CLI reference](https://istio.io/latest/docs/reference/commands/pilot-agent/)
- [Istio sidecar injection troubleshooting](https://istio.io/latest/docs/ops/common-problems/injection/)
- [Istio 1.31 agent configuration merging](https://github.com/istio/istio/blob/release-1.31/pilot/cmd/pilot-agent/config/config.go)
- [Istio 1.31 agent certificate selection](https://github.com/istio/istio/blob/release-1.31/pkg/istio-agent/agent.go)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [kubectl debug reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes ephemeral containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes native sidecars](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes image tags and digests](https://kubernetes.io/docs/concepts/containers/images/)
- [OpenSSL s_client reference](https://docs.openssl.org/3.5/man1/openssl-s_client/)
- [OpenBSD nc reference](https://man.openbsd.org/nc)
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/)

## Issues Found
1. **Bootstrap configuration was described as proof of connection health.** Changed this to evidence of the configured local target. A static Unix-socket cluster definition does not establish that its connection works.
2. **The environment query missed native sidecars.** Included both `spec.containers` and `spec.initContainers` so it also locates a restartable init-container proxy.
3. **Pod annotations were incorrectly described as fixed.** Clarified that annotations are mutable, while injected container environment cannot be changed in place and proxy configuration is not dynamically reloaded. Retained the controller update and Pod recreation workflow.
4. **A deprecated discovery-address override was not identified as deprecated.** Retained inspection of the legacy annotation because Istio 1.31 still applies it, and identified `proxy.istio.io/config` as the choice for new overrides.
5. **The purported digest-pinned image used a version tag.** Corrected the description and explicitly instructed readers to replace the example with an approved image digest. No unverified digest was invented.
6. **Exact-name testing used a hard-coded example without explicit substitution guidance.** Clarified that DNS and subsequent TCP/TLS commands must use the observed upstream hostname and that the cluster domain is installation-specific.
7. **CoreDNS log collection silently limited the diagnostic window.** Added `--tail=-1`: with a label selector, kubectl otherwise defaults to ten lines per Pod even when `--since` is specified.
8. **Headless DNS answers were described as directly indicating readiness.** Added the `publishNotReadyAddresses` exception and clarified address-family filtering.
9. **xDS convergence could be read as requiring every resource type to be sent.** Clarified that `NOT SENT` can be normal for an unneeded resource type.
10. **Stability required reconnect counters to stop increasing despite controlled disruptions.** Changed the criterion to cessation of DNS and unexpected connection errors after disruptions; rollouts and connection rotation can legitimately reconnect.

## Review Notes
- Confirmed the central Istio 1.31 architecture against release-branch source: Envoy's static `xds-grpc` cluster uses the local XDS socket, while pilot-agent logs and connects to the effective remote discovery address.
- Reviewed configuration merge precedence, legacy annotation handling, upstream TLS options, per-RPC token credentials, and provisioned/file-mounted client certificate exceptions in Istio source. The GitHub browser fetch failed for source files; raw GitHub source was successfully retrieved directly for inspection.
- Confirmed namespace DNS search behavior, host-network injection exclusion, optional sidecar DNS capture, ambient DNS capture defaults, Service/endpoint distinctions, NetworkPolicy caveats, and ephemeral-container lifecycle restrictions against official documentation.
- Reviewed CLI arguments against official references. All Bash fenced examples passed `bash -n`. Commands were not executed against a Kubernetes cluster; runtime DNS, CNI behavior, certificates, endpoint readiness, and xDS synchronization require the reader's environment.
- The example application name, namespace, Service, resolver IP, cluster domain, and image approval remain deployment-specific. The OpenSSL probe displays the server chain; it does not authenticate an xDS request or establish the agent's certificate validation result. Netcat flags assume an implementation supporting the documented OpenBSD-style options.
- Official documentation links were checked for relevance. Istio's latest documentation identified 1.31 as current during review; implementation-specific claims were checked against the release-1.31 source rather than inferred from old diagnostic examples.
- Changes were limited to technical corrections; the original section structure was preserved.
