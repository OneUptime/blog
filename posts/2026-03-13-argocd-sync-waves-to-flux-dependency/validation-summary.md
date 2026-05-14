# Validation Summary: How to Map ArgoCD Sync Waves to Flux Dependency Ordering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD sync waves
- Flux CD Kustomization
- Flux `dependsOn`
- Flux health checks and wait behavior
- Kubernetes custom resources and CRDs
- GitOps deployment ordering

## Sources Consulted
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The introduction said Argo CD waits for each lower wave to become healthy before proceeding. Argo CD's documented behavior is that it orders resources by phase, wave, kind, and name, then repeatedly applies the first wave containing out-of-sync or unhealthy resources until all phases and waves are in-sync and healthy. Updated the wording to match the official behavior.
- The Flux example used `targetNamespace: myapp`, but the directory structure did not explicitly include the namespace manifest. Flux does not create `targetNamespace` automatically; it must already exist or be included in the Kustomization. Added `namespace.yaml` to the CRD/namespace layer and clarified the comment.
- The CRD wait comment said Flux waits for all resources to be ready. Flux documents `wait: true` as health checking all reconciled resources, and it ignores `healthChecks` when enabled. Updated the comment to use Flux's health-check terminology.
- The complex dependency section said "Both dependencies" while the example listed three dependencies. Changed it to "All dependencies."
- The post implied `healthChecks` can define readiness for any custom resource. Flux health checks support custom resources that are compatible with kstatus, and custom health logic can be supplied with `healthCheckExprs`. Added that caveat to the best-practices section.
- The conclusion implied `dependsOn` always waits for health. Flux waits for dependency Kustomizations to be Ready, and health gating requires `wait`, `healthChecks`, or `healthCheckExprs` on the dependency. Updated the wording to make that condition explicit.

## Review Notes
The Flux `kustomize.toolkit.fluxcd.io/v1` API version, `dependsOn`, `wait`, `healthChecks`, `healthCheckExprs`, `timeout`, `targetNamespace`, and `sourceRef` fields are current in the official Flux documentation. The YAML snippets are illustrative and omit full Kubernetes workload and CRD specs, which is acceptable for a migration-ordering guide but should not be copied as complete deployable manifests without adding the required resource specs.
