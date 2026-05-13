# Validation Summary: How to Configure IO Chaos Experiments with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Chaos Mesh
- IOChaos
- Kubernetes Schedule custom resources
- kubectl
- PostgreSQL

## Sources Consulted
- Chaos Mesh official documentation: Simulate File I/O Faults: https://chaos-mesh.org/docs/2.7.3/simulate-io-chaos-on-kubernetes/
- Chaos Mesh API reference: IOChaosSpec: https://chaos-mesh.dev/reference/master/
- Chaos Mesh v2.8.2 IOChaos CRD source: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.8.2/config/crd/bases/chaos-mesh.org_iochaos.yaml
- Chaos Mesh v2.8.2 API source: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.8.2/api/v1alpha1/iochaos_types.go
- Chaos Mesh v2.8.2 PodIOChaos API source for IO method and attr types: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.8.2/api/v1alpha1/podiochaos_types.go
- Flux official documentation: Kustomization: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux official API reference: Kustomization v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes official kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- PostgreSQL official documentation: pg_stat_activity: https://www.postgresql.org/docs/current/monitoring-stats.html

## Issues Found
- The IOChaos examples set `volumePath` but omitted `path`. Chaos Mesh uses `volumePath` for the injected volume mount path and `path` to select files for injection. Added glob `path` values under each target directory.
- The latency comment said it injected latency on all IO operations while the manifest limited `methods` to `read` and `write`. Updated the comment to match the configured method scope.
- The IO fault comment said it returned EIO for IO operations generally while the manifest limited `methods` to `write`. Updated the comment to say write operations.
- The best-practice note said write failures are generally safer to simulate first. Reworded it to say `methods: [write]` is a narrower fault scope than `methods: [read, write]`, which is the defensible technical reason.

## Review Notes
The examples use current Chaos Mesh `chaos-mesh.org/v1alpha1` fields for Chaos Mesh 2.x, including `IOChaos`, `Schedule.spec.ioChaos`, `containerNames`, `methods`, `attr`, `percent`, and `duration`. The Flux Kustomization example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `sourceRef`, `path`, `prune`, and `dependsOn` fields.
