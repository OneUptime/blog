# Validation Summary: How to Configure Network Chaos Experiments with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Chaos Mesh
- NetworkChaos
- Schedule
- kubectl

## Sources Consulted
- Chaos Mesh documentation: Simulate Network Faults - https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh documentation: Define Scheduling Rules - https://chaos-mesh.org/docs/define-scheduling-rules/
- Chaos Mesh documentation: Configure namespace for Chaos experiments - https://chaos-mesh.org/docs/next/configure-enabled-namespace/
- Chaos Mesh documentation: Simulate DNS Faults - https://chaos-mesh.org/docs/simulate-dns-chaos-on-kubernetes/
- Chaos Mesh v1alpha1 API reference - https://chaos-mesh.dev/godoc/v2.1.5/pkg/github.com/chaos-mesh/chaos-mesh/api/v1alpha1/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The introduction said `NetworkChaos` can inject DNS faults. Chaos Mesh handles DNS faults with the separate `DNSChaos` kind, so the `NetworkChaos` capability list was narrowed to latency, packet loss, bandwidth limits, and network partitions.
- The prerequisites implied `chaos-mesh.org/inject: enabled` is always required. The annotation is only required when Chaos Mesh `FilterNamespace` is enabled, and the correct annotation form is `chaos-mesh.org/inject=enabled`.
- The latency example described `correlation` as using a normal distribution. Chaos Mesh documents it as correlation with previous values, so the comment was corrected.
- The bandwidth example included `direction: to`, but Chaos Mesh documents `direction` as applying to netem and partition targeting rather than bandwidth. The field was removed from that example.
- The scheduled latency example included `direction: to` without a target. Since `direction` is useful with a target or external targets, the field was removed from the schedule example.
- The Flux example path named the Flux `Kustomization` manifest as `chaos-experiments/kustomization.yaml`. Since Flux builds `.spec.path` using Kustomize, a file named `kustomization.yaml` in that directory is treated as Kustomize configuration rather than as a plain Kubernetes manifest. The example filename was changed to place the Flux Kustomization outside the managed directory.
- The prerequisite for Chaos Mesh deployment was clarified because Flux `dependsOn` references other Flux `Kustomization` objects, not a `HelmRelease` directly.

## Review Notes
The remaining Chaos Mesh CRD examples use the current `chaos-mesh.org/v1alpha1` API and field names documented by Chaos Mesh. The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields. The validation commands are valid `kubectl` usage, though `kubectl top pods` requires Metrics Server or another metrics API provider to be installed.
