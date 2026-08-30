# Validation Summary: How to Deploy Grafana Beyla as a Kubernetes DaemonSet

## Status

validated

## Post Type

Tutorial / Deployment Guide

## Technologies Covered

- Grafana Beyla
- eBPF application auto-instrumentation
- Kubernetes DaemonSets, ConfigMaps, ServiceAccounts, RBAC, Pod security contexts, DNS, and NetworkPolicy
- OpenTelemetry Protocol (OTLP/HTTP and OTLP/gRPC)
- Grafana Alloy
- OpenTelemetry metrics and traces

## Sources Consulted

- [Beyla and Kubernetes quickstart](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/) - DaemonSet deployment, Kubernetes discovery, RBAC, configuration mounting, and privileged baseline.
- [Deploy Beyla manually in Kubernetes](https://grafana.com/docs/beyla/latest/setup/kubernetes/) - `hostPID`, metadata decoration, capability-based deployment, and external configuration.
- [Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/) - selector names, selector combination behavior, and default exclusions.
- [Beyla routes decorator](https://grafana.com/docs/beyla/latest/configure/routes-decorator/) - `routes.unmatched`, heuristic behavior, patterns, and cardinality guidance.
- [Beyla metrics and traces attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/) - Kubernetes decorator configuration and emitted Kubernetes attributes.
- [Beyla telemetry export](https://grafana.com/docs/beyla/latest/configure/export-data/) - shared OTLP endpoint behavior, automatic signal paths, supported protocols, and port-based protocol inference.
- [Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/) - capability requirements, `perf_event_paranoid`, pre-5.11 `SYS_RESOURCE`, and `BEYLA_ENFORCE_SYS_CAPS`.
- [Distributed traces with Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/) and [Beyla network metrics quickstart](https://grafana.com/docs/beyla/latest/network/quickstart/) - cases requiring `hostNetwork`, host mounts, and additional capabilities.
- [Beyla requirements](https://grafana.com/docs/beyla/latest/) - supported Linux kernel and BTF requirements.
- [Kubernetes DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) and [DaemonSet API](https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/) - current API, selector requirements, eligible nodes, and taint/toleration behavior.
- [kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/), [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), and [kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/) - command syntax and workload log-selection behavior.
- [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) - namespace-qualified Service names and `ClusterFirstWithHostNet`.
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/) - CNI enforcement prerequisites, egress semantics, and undefined behavior for host-network Pods.
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) and [Linux kernel security constraints for Pods and containers](https://kubernetes.io/docs/concepts/security/linux-kernel-security-constraints/) - restrictions affecting privileged containers, host PID namespaces, AppArmor, and seccomp.

## Issues Found

1. **Kubernetes API access was described as metadata-only and optional whenever decoration is disabled.** Kubernetes `list` and `watch` permissions are read-only but return resource objects rather than only metadata fields. More importantly, the post's `k8s_namespace` and `k8s_deployment_name` selectors also require Kubernetes discovery. Renamed the section, clarified that the permissions support both discovery and decoration, and made omission conditional on also replacing Kubernetes selectors with `open_ports`, `exe_path`, or another non-Kubernetes selector.
2. **The Linux-only requirement was not enforced by the DaemonSet.** On a mixed-OS cluster, the Pod could be assigned to a Windows node and fail. Added `nodeSelector: { kubernetes.io/os: linux }` in expanded YAML form under `spec.template.spec`.
3. **The OTLP Service hostname assumed the default `cluster.local` cluster domain.** Kubernetes allows a different cluster domain. Replaced the hard-coded FQDN with the portable namespace-qualified Service name `grafana-alloy.monitoring`.
4. **The server-side dry-run command lacked an input.** `kubectl apply --dry-run=server` alone fails because `apply` requires `-f` or `-k`. Changed it to `kubectl apply --dry-run=server -f beyla.yaml`.
5. **The local-secret claim was too broad.** An in-cluster receiver can still require authentication. Scoped the statement to the unauthenticated endpoint shown in the example.
6. **The OTLP protocol explanation implied standard port 4317 needs explicit protocol configuration.** Beyla automatically infers `http/protobuf` for ports ending in 4318 and `grpc` for ports ending in 4317. Documented that behavior and reserved explicit protocol variables for other ports or overrides.
7. **The DaemonSet log command read only one selected Pod.** Added `--all-pods=true` so the verification command actually retrieves logs from every Beyla Pod in the DaemonSet.
8. **The NetworkPolicy recommendation pointed at collector egress instead of Beyla egress and omitted required dependencies.** Corrected it to restrict Beyla's outbound traffic while allowing the OTLP collector, DNS, and Kubernetes API. Added the CNI-enforcement prerequisite and a separate host-network caveat because standard NetworkPolicy behavior for `hostNetwork` Pods is undefined.
9. **The denial troubleshooting step did not distinguish the privileged baseline from the capability-based deployment.** Privileged containers are not constrained by normal AppArmor and seccomp profiles in the same way. Scoped the capability, AppArmor, seccomp, and `perf_event_paranoid` check to capability-based deployments.

## Review Notes

- All three YAML blocks parse successfully. Strict Kubernetes schema validation found six resources, all valid with no skipped resources.
- The effective Beyla configuration was loaded successfully by the current `grafana/beyla:latest` image (`v3.32.0`, image digest `sha256:3ff0f7cf2bbf77db7c1c380f7d5cd018bacce7a40c2a4a596b8ce176af84adeb`). Execution then stopped at the expected capability check because the validation container was intentionally not privileged.
- A live `kubectl apply --dry-run=server` was not executed because it requires an authenticated Kubernetes API server. The manifests were instead checked locally against Kubernetes schemas, and the corrected server-side command is suitable for the reader's target cluster.
- `routes.unmatched: heuristic` is valid and currently the default, so keeping it explicit is harmless. Explicit route patterns remain preferable for known APIs because heuristics cannot classify every identifier shape reliably.
- The `kubectl auth can-i` example is valid but checks only Pod-list permission; a complete RBAC audit should also check the other resources and verbs. The caller must itself be authorized to impersonate the ServiceAccount.
- The mutable `latest` image remains in the example because it mirrors Grafana's quickstart. The post correctly warns readers to pin a version or digest for reproducible production deployments.
