# Validation Summary: How to Capture a Data-Plane Packet Trace in a Distroless Envoy Pod with Ephemeral Containers

## Status
validated

## Post Type
Technical tutorial / incident diagnostics guide.

## Technologies Covered
- Kubernetes Pods, ephemeral containers, kubectl, RBAC, and Pod Security admission
- Envoy and Istio sidecar networking and access logs
- Linux namespaces, capabilities, seccomp, and non-root container execution
- tcpdump, pcap, TCP, TLS, and mTLS
- Bash redirection, file permissions, and checksums

## Sources Consulted
- Kubernetes ephemeral containers: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes debugging and custom profiles: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes 1.32 release: https://kubernetes.io/blog/2024/12/11/kubernetes-v1-32-release/
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- kubectl authorization checks: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes JSONPath: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes RBAC: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Linux security constraints: https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/
- Container security context: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Process namespace sharing: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes Service port mapping: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl v1.32 implementation (patch operation and static profiles): https://raw.githubusercontent.com/kubernetes/kubectl/v0.32.0/pkg/cmd/debug/debug.go and https://raw.githubusercontent.com/kubernetes/kubectl/v0.32.0/pkg/cmd/debug/profiles.go
- Kubelet non-root verification: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.32.0/pkg/kubelet/kuberuntime/security_context_others.go
- Istio hardened images: https://istio.io/latest/docs/ops/configuration/security/harden-docker-images/
- Istio proxy diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- istioctl reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio access logging: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Envoy access logging: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html
- tcpdump upstream manual and TCP printer: https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/tcpdump.1.in and https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/print-tcp.c
- Linux capabilities: https://man7.org/linux/man-pages/man7/capabilities.7.html
- ip command: https://man7.org/linux/man-pages/man8/ip.8.html
- TCP specification: https://www.rfc-editor.org/rfc/rfc9293.html
- TLS 1.3 specification: https://www.rfc-editor.org/rfc/rfc8446.html
- Installed Bash builtin documentation: `bash -c 'help set'` (confirmed `noclobber` / `-C`; the GNU web manual request timed out).

## Issues Found
1. **Incorrect authorization-check syntax.** `can-i` interprets `TYPE/NAME` as a resource and name, not a subresource. Replaced the slash forms with explicit `--subresource=ephemeralcontainers` and `--subresource=exec`; added the log-read check needed by the earlier command.
2. **Response flags overstated packet evidence.** `UF` means upstream connection failure; neither flag alone establishes that a TCP RST was observed. Rephrased the question to ask whether a related reset occurred before attributing it.
3. **Incomplete image prerequisites and non-root explanation.** Added `ip` to the required tools. Separated numeric non-root identity verification from the separate requirement that the runtime preserve the capture capability for exec-launched tcpdump. Missing capabilities cause capture failure, not rejection by `runAsNonRoot` itself.
4. **Capture command portability.** Moved `-w -` before the filter so options follow the documented command layout, without relying on option permutation after a positional expression.
5. **Local file protection was conditional.** `umask` does not restrict an existing file on truncation. Added Bash `noclobber` and instructions to select a new filename.
6. **Snapshot length was treated too much like payload exclusion.** Explicitly stated that 192 bytes can include secrets. Corrected `-s 0` to mean the default snapshot length rather than an unlimited length.
7. **Client timeout was not a remote termination guarantee.** Clarified that stopping the local session requires checking remote termination and retaining the container lifetime bound.
8. **Outbound filter could use the wrong port.** Changed Service port to endpoint port and explained the `targetPort` distinction.
9. **Initial inspection could decode application fields.** Added `-q` for the example TCP readability check and explained that detailed decoding can reveal application fields without raw ASCII or hexadecimal dump flags.
10. **Encryption scope was too broad.** Clarified that application-to-sidecar traffic may be plaintext in an `any` capture and that TLS 1.3 encrypts alerts after key establishment. Qualified the TLS-alert diagnostic observation accordingly.
11. **Conclusion inaccurately described the example filter.** Replaced “five-tuple” with endpoint and protocol filtering; the example does not constrain both addresses and both ports.

## Review Notes
- Confirmed the Kubernetes 1.25 ephemeral-container and 1.32 custom-profile stability milestones. The YAML fields and explicit baseline/custom combination are supported; the source confirms strategic merge patching and the difference between baseline, general, and netadmin capabilities.
- Confirmed lifecycle restrictions, shared network visibility, optional process targeting, and the warning against assuming PID 1 identifies the debug container.
- The baseline debug profile name does not exempt the custom NET_RAW addition from admission. Baseline Pod Security disallows adding NET_RAW, and Restricted permits adding only NET_BIND_SERVICE. The post appropriately requires an approved access path rather than weakening policy.
- Envoy request evidence requires access logging to be configured with the needed fields. Endpoint configuration lists possible endpoints; it does not prove which endpoint handled a particular request.
- The sample is specifically for a Linux Istio sidecar deployment. Interface visibility, interception, non-root capabilities, and runtime cleanup remain environment-dependent. A packet-count bound alone is not a time bound; the example also retains a 900-second container lifetime.
- All nine documentation links in the original post resolved to the intended official resources. The tcpdump website manual was unavailable through the browser, so its upstream source was consulted instead. Versionless documentation may change; version-specific behavior was cross-checked with the v1.32 source.
- Validation was a documentation and source review, with Bash syntax checks of every shell block and JSON parsing of the deliverable. No live Kubernetes cluster, approved image digest, packet capture, or production workload was used, so runtime execution is not claimed.
