# Validation Summary: How to Troubleshoot ArtifactGenerator Build Failures in Flux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux 2.8
- Flux ArtifactGenerator
- Flux source-watcher
- Flux source-controller sources, including GitRepository
- Flux Kustomization and HelmRelease consumers
- Kubernetes kubectl

## Sources Consulted
- Flux ArtifactGenerator documentation: https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux Source Controllers documentation: https://fluxcd.io/flux/components/source/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux v2.8 announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- source-watcher API reference: https://pkg.go.dev/github.com/fluxcd/source-watcher/api/v2/v1beta1
- source-watcher controller source: https://github.com/fluxcd/source-watcher/blob/v2.1.1/internal/controller/artifactgenerator_controller.go
- source-watcher builder source: https://github.com/fluxcd/source-watcher/blob/v2.1.1/internal/builder/builder.go
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post attributed ArtifactGenerator build diagnostics and logs to `source-controller`. Flux documentation states that the `source-watcher` component implements the ArtifactGenerator API, so the troubleshooting text, pod checks, Deployment example, and log commands were updated to use `source-watcher`.
- The prerequisites did not mention that `source-watcher` is an optional Flux component. Added that it must be enabled for ArtifactGenerator usage.
- The ArtifactGenerator YAML snippets used invalid `spec.artifacts[].path` fields. The official API requires `spec.sources` and `spec.artifacts[].copy[]` entries with `from` and `to`, so the examples were corrected.
- The source-not-ready example used `ArtifactFailed`. source-watcher marks source observation and fetch issues with `SourceFetchFailed`, so the condition example was corrected.
- The no-match and glob examples used messages and terminology that did not match source-watcher behavior. Updated them to use copy patterns and the actual build failure shape.
- The downstream impact section implied Kustomizations reference ArtifactGenerators directly. Flux consumers reference the generated ExternalArtifacts, so the wording was corrected.
- The storage-size section claimed a specific artifact size limit error. The reviewed sources support storage operation failures rather than that exact error, so the section was corrected to describe storage failures and `ReconciliationFailed`.
- The log section said the command increased verbosity, but it only filters recent logs. The wording was corrected.

## Review Notes
The local environment did not have `flux` or `kubectl` installed, so CLI behavior was validated against official documentation rather than local `--help` output. The post remains version-specific to Flux 2.8 and assumes clusters have installed the optional `source-watcher` component.
