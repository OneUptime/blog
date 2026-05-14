# Validation Summary: How to Deploy Kubewarden with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubewarden
- Kubernetes
- Helm
- Kustomize
- Prometheus Operator ServiceMonitor
- WebAssembly policy modules

## Sources Consulted
- Kubewarden Quick Start: https://docs.kubewarden.io/quick-start
- Kubewarden CRD Reference: https://docs.kubewarden.io/reference/CRDs
- Kubewarden Helm chart repository index: https://charts.kubewarden.io/
- Kubewarden production deployment documentation: https://docs.kubewarden.io/howtos/production-deployments
- Kubewarden metrics quickstart: https://docs.kubewarden.io/howtos/telemetry/metrics-qs
- Kubewarden container-resources policy README: https://github.com/kubewarden/container-resources-policy
- Kubewarden trusted-repos policy README: https://github.com/kubewarden/trusted-repos-policy
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The post omitted the `kubewarden-crds` Helm chart, which Kubewarden documents as required before installing `kubewarden-controller` and `kubewarden-defaults`. Added a `HelmRelease` for `kubewarden-crds` and made the controller release depend on it.
- The Kubewarden chart version ranges were outdated for current chart releases. Updated the controller chart range to `>=5.0.0 <6.0.0` and the defaults chart range to `>=3.0.0 <4.0.0`; added a CRD chart range of `>=1.0.0 <2.0.0`.
- The controller telemetry values used the old/incorrect `telemetry.enabled` shape. Updated them to the current `telemetry.mode`, `telemetry.metrics`, and `telemetry.sidecar.metrics.port` fields.
- The controller resource values were nested incorrectly. Updated them to `resources.controller.limits` and `resources.controller.requests`.
- The defaults chart values used `policyServer.replicas` and nested `policyServer.resources`, which do not match the current chart. Updated them to `policyServer.replicaCount`, `policyServer.limits`, and `policyServer.requests`.
- The custom `PolicyServer` used nested `spec.resources`, but the Kubewarden CRD uses `spec.limits` and `spec.requests`. Updated the manifest accordingly and refreshed the policy-server image tag.
- The anti-affinity label selector used a non-current label. Updated it to the Kubewarden `kubewarden/policy-server` label.
- The trusted registries policy settings used a flat `registries` list with repository paths. Updated the settings to `registries.allow` with registry hostnames, matching the policy's documented schema.
- The container resources policy settings used unsupported `requireRequests`, `requireLimits`, and `defaultRequests` fields, and marked the policy non-mutating while configuring defaults. Updated it to the documented `cpu.defaultRequest` and `memory.defaultRequest` schema, added `UPDATE`, and set `mutating: true`.
- The Flux Kustomization example was shown as `clusters/my-cluster/kubewarden/kustomization.yaml`, which would be confused with the directory's Kustomize file. Updated the comment to place the Flux Kustomization under `clusters/my-cluster/flux-system/kubewarden-kustomization.yaml`.
- The Flux Kustomization example combined `wait: true` with explicit `healthChecks`, but Flux ignores `healthChecks` when `wait` is true. Removed the ignored health check block.
- The ServiceMonitor selector did not match Kubewarden's documented policy server service label pattern. Updated it to select the production policy server service.
- The `kubectl get policyservers` verification command omitted the namespace used by the example. Updated it to `kubectl get policyservers -n kubewarden`.
- The post stated that the defaults chart installs recommended policies. Updated the wording because the defaults chart can install recommended policies, but they are not enabled by default.

## Review Notes
YAML snippets were parsed successfully after edits. The local environment did not have `flux`, `kubectl`, or `helm` installed, so CLI behavior was verified against official documentation and chart source files rather than by running the commands against a cluster.
