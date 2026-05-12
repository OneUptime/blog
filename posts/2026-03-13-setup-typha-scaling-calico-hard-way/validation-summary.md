# Validation Summary: Setting Up Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Calico (v3.27.0)
- Calico Typha
- Calico Felix
- Kubernetes (Deployment, Service, ServiceAccount, ClusterRole, ClusterRoleBinding)
- `kubectl` / `calicoctl`
- Pod anti-affinity and tolerations
- Prometheus metrics (Typha)

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration (verified default ports: 5473 server, 9098 health, 9091 metrics default; example uses 9093)
- Calico Felix configuration reference (3.27 archive): https://archive-os-3-27.netlify.app/calico/3.27/reference/felix/configuration (verified `TyphaK8sServiceName` / `typhaK8sServiceName` field name)
- Official Calico v3.27.0 manifest: https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-typha.yaml (verified probe paths `/liveness` and `/readiness` on port 9098, port 5473 with named `calico-typha` targetPort, env var names `TYPHA_LOGFILEPATH`, `TYPHA_LOGSEVERITYSCREEN`, `TYPHA_PROMETHEUSMETRICSENABLED`, `TYPHA_PROMETHEUSMETRICSPORT` with example value `9093`)
- Calico v3.27.0 GitHub release: https://github.com/projectcalico/calico/releases/tag/v3.27.0 (confirmed version exists; released Dec 15, 2023)
- Kubernetes cluster-autoscaler FAQ: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md (confirmed `cluster-autoscaler.kubernetes.io/safe-to-evict` affects only cluster-autoscaler, not kube-scheduler)

## Issues Found
1. **Incorrect annotation comment.** The Deployment annotated `cluster-autoscaler.kubernetes.io/safe-to-evict: "false"` with a comment stating it "Prevent[s] the kube-scheduler from accounting for Typha's own network policy enforcement latency during scheduling." This is wrong — that annotation is read exclusively by the cluster-autoscaler to skip the pod during node scale-down, has no effect on the kube-scheduler, and is unrelated to network policy latency. Replaced with a comment that accurately describes what the annotation does.

2. **Missing RBAC permissions Typha requires.** The custom `calico-typha` ClusterRole did not include `networking.k8s.io/networkpolicies` (Kubernetes NetworkPolicies) or `discovery.k8s.io/endpointslices`. Both are included in the upstream Calico ClusterRole that Typha is bound to in the official manifest; without them Felix cannot enforce K8s NetworkPolicies via Typha and (on newer K8s) service rule resolution would break. Added both rules with `watch`/`list` verbs.

## Review Notes
- The choice of Prometheus metrics port `9093` (instead of the upstream default `9091`) is non-standard, but it matches the example commented out in Calico's own upstream `calico-typha.yaml` (`TYPHA_PROMETHEUSMETRICSPORT: "9093"`), and the post sets the env var explicitly. Left as-is.
- The dedicated `calico-typha` ServiceAccount/ClusterRole/ClusterRoleBinding is a cleaner pattern than the upstream manifest (which binds Typha to the `calico-node` ServiceAccount). Both are valid; this post's split is fine for an educational "hard way" walkthrough.
- Toleration only covers `node-role.kubernetes.io/control-plane`. Older clusters that still use the deprecated `node-role.kubernetes.io/master` taint would not tolerate it, but that taint was removed in Kubernetes 1.25+, so omitting it is reasonable for current clusters.
- Calico v3.27.0 (December 2023) is a real release but several minor versions behind the current line (~3.32 as of 2026). The setup steps remain accurate for current Calico releases; only the image tag would need bumping. No change made since the post pins an intentional reference version.
- The `livenessProbe` and `readinessProbe` paths/ports (`/liveness` and `/readiness` on `9098`, `host: localhost`) match the upstream manifest exactly.
- The `typhaK8sServiceName` field in `FelixConfiguration` is correct.
