# Validation Summary: Native vs Legacy Kubernetes Sidecars: When to Use Native Sidecars

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered

- Kubernetes Pods and multi-container workloads
- Native sidecar containers and legacy sidecar patterns
- Init containers and container-level restart policies
- Kubernetes Jobs and Deployments
- Startup, readiness, and liveness probes
- Pod startup, restart, and termination lifecycle
- Kubernetes feature gates and version skew
- `kubectl` server-side dry runs, schema inspection, logs, and status inspection
- YAML Pod configuration and JSONPath

## Sources Consulted

- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Adopting Sidecar Containers](https://kubernetes.io/docs/tutorials/configuration/pod-sidecar-containers/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes: Feature Gates](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [Kubernetes API: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes CLI: kubectl apply](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/)
- [Kubernetes CLI: kubectl explain](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/)
- [Kubernetes: Debug Init Containers](https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)

## Issues Found

- The version-skew guidance named admission, the scheduler, and kubelets but omitted the kube-controller-manager and did not distinguish admission tooling that can strip unknown fields. The text now identifies the Kubernetes components covered by the `SidecarContainers` feature gate and separately calls out Pod-rewriting admission tooling.
- The post listed Kubernetes 1.28 support without noting that its alpha sidecar termination behavior differed from later releases. The version section now warns readers not to rely on the documented shutdown semantics on 1.28.
- The `RestartAllContainers` paragraph mentioned only Kubernetes 1.36 and did not state the feature's graduation history, current default, or dependent gates. It now records its alpha, disabled-by-default introduction in 1.35, its beta, enabled-by-default state in 1.36, and the required `ContainerRestartRules` and `NodeDeclaredFeatures` dependencies.
- The shutdown section stated reverse-order sidecar termination as an unconditional guarantee. It now explains that the ordering is bounded by the Pod's termination grace period and may not complete gracefully if main containers consume that period.

## Review Notes

The remaining technical claims, configuration snippets, JSONPath expression, and `kubectl` commands are consistent with the Kubernetes 1.36 documentation reviewed on 2026-08-01. The `registry.example.com` image names are illustrative placeholders and must be replaced with real images before applying the examples.
