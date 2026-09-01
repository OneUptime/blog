# Validation Summary: How to Import and Customize a Helm Chart as a KubeVela Application

## Status

validated

## Post Type

Technical tutorial and deployment guide

## Technologies Covered

- KubeVela v1.10 and v1.11
- Open Application Model (OAM) Applications
- Kubernetes resources, Secrets, namespaces, CRDs, and multi-cluster delivery
- Helm charts, Helm CLI, Helm Go SDK, OCI registries, values, hooks, and release lifecycle
- FluxCD source-controller and helm-controller
- KubeVela topology and override policies and deploy workflow steps

## Sources Consulted

- [KubeVela v1.11 built-in component reference](https://kubevela.io/docs/end-user/components/references/#helmchart)
- [KubeVela v1.11.0 `helmchart` ComponentDefinition](https://github.com/kubevela/kubevela/blob/v1.11.0/vela-templates/definitions/internal/component/helmchart.cue)
- [KubeVela v1.11.0 native Helm authentication implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/cue/cuex/providers/helm/auth.go)
- [KubeVela v1.11.0 native Helm values implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/cue/cuex/providers/helm/values.go)
- [KubeVela v1.11.0 native Helm provider render path](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/cue/cuex/providers/helm/helm.go)
- [KubeVela v1.11.0 application dry-run implementation](https://github.com/kubevela/kubevela/blob/v1.11.0/pkg/appfile/dryrun/dryrun.go)
- [KubeVela native Helm design document](https://github.com/kubevela/kubevela/blob/v1.11.0/design/vela-core/helm-component.md)
- [KubeVela v1.10 Helm chart tutorial](https://kubevela.io/docs/v1.10/tutorials/helm/)
- [KubeVela FluxCD addon reference](https://kubevela.io/docs/reference/addons/fluxcd/)
- [KubeVela FluxCD `helm` ComponentDefinition source](https://github.com/kubevela/catalog/blob/20804aca4ad94a94b0364a5f3ab595da9ed1e6e2/addons/fluxcd/definitions/helm-release-def.cue)
- [KubeVela built-in workflow-step reference](https://kubevela.io/docs/end-user/workflow/built-in-workflow-defs/)
- [KubeVela built-in policy reference](https://kubevela.io/docs/end-user/policies/references/)
- [KubeVela dry-run CLI reference](https://kubevela.io/docs/cli/vela_dry-run/)
- [KubeVela up CLI reference](https://kubevela.io/docs/cli/vela_up/)
- [KubeVela status CLI reference](https://kubevela.io/docs/cli/vela_status/)
- [KubeVela addon status CLI reference](https://kubevela.io/docs/cli/vela_addon_status/)
- [Helm template command](https://helm.sh/docs/helm/helm_template/)
- [Helm show CRDs command](https://helm.sh/docs/helm/helm_show_crds/)
- [Helm values files](https://helm.sh/docs/chart_template_guide/values_files/)
- [Helm chart hooks](https://helm.sh/docs/topics/charts_hooks/)
- [Flux HelmRelease install configuration](https://fluxcd.io/flux/components/helm/helmreleases/#install-configuration)

## Issues Found

- The local `helm template` command claimed to support CRD review but omitted `--include-crds`, so files from a chart's `crds/` directory would not appear in the rendered output. Added `--include-crds`.
- The native chart-source description said "direct archives," which was broader than the implemented source contract. Changed it to direct `.tgz` URLs.
- The Flux-backed example targeted `observability` without stating that the namespace must already exist. Added the prerequisite because the addon-provided `helm` definition does not expose Flux's `spec.install.createNamespace` field. Also clarified that addon enablement installs controllers and CRDs, while applying the component creates the source object and `HelmRelease`.
- The generic `vela dry-run` recommendation was not a safe non-mutating preview for native `helmchart` in v1.11. The CLI's local render path does not propagate the provider's client-only dry-run marker, so native evaluation can enter the real Helm install/upgrade path. Restricted `vela dry-run` to previewing Flux-backed custom resources and made `helm template` the native chart preflight.
- The post described `deploy` as a policy. Corrected it to a workflow step used with `topology` and `override` policies.
- The multi-cluster prerequisite list was unconditional and omitted the Flux controllers required by the Flux-backed path. Scoped prerequisites to what the chart needs and added the per-destination Flux controller and CRD requirement.
- The ownership warning implied that identically named cluster-scoped resources conflict across distinct clusters. Scoped the warning to repeated chart deployments into the same destination cluster and clarified inspection of the generated Flux source kind.

## Review Notes

- The KubeVela v1.11 design document classifies native `helmchart` support as alpha/experimental. The installed schema should remain the final authority for v1.11 deployments.
- The generated KubeVela reference currently contains conflicting authentication prose: one example names `vela-system`, while the shipped v1.11 schema and implementation accept only the Application or release namespace. The post correctly follows the shipped schema and implementation.
- `app.oam.dev/publishVersion` is a hard pin in the native example. It suppresses automatic `valuesFrom` content-fingerprint upgrades until the publish version changes.
- The `example.com` and `ghcr.io/example` chart locations are intentionally illustrative rather than live artifacts.
- `kubectl get all` is only a quick namespace view and does not enumerate every Kubernetes resource type; the KubeVela resource tree and controller-specific objects remain necessary for complete inspection.
