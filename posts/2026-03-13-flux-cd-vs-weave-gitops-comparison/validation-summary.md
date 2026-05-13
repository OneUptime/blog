# Validation Summary: Flux CD vs Weave GitOps: Comparison

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Flux CD
- Weave GitOps and Weave GitOps Enterprise
- Kubernetes custom resources
- Flux Kustomization and source-controller APIs
- Flux HelmRelease
- Flux post-build variable substitution
- SOPS
- OPA/Rego policy enforcement
- External Secrets Operator
- Capacitor, Flamingo, and Grafana dashboards

## Sources Consulted
- Flux documentation: https://fluxcd.io/flux/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux secrets management documentation: https://fluxcd.io/flux/security/secrets-management/
- CNCF Flux project page: https://www.cncf.io/projects/flux/
- Weave GitOps documentation: https://docs.gitops.weaveworks.org/
- Weave GitOps Policy documentation: https://docs.gitops.weaveworks.org/docs/policy/
- Weave GitOps Policy introduction: https://docs.gitops.weaveworks.org/docs/policy/intro/
- Weave GitOps GitOpsSets guide: https://docs.gitops.weaveworks.org/docs/0.23.0/gitopssets/guide/
- Weave GitOps GitOpsSets API reference: https://docs.gitops.weaveworks.org/docs/next/gitopssets/gitopssets-api-reference/
- Weave GitOps Secrets documentation: https://docs.gitops.weaveworks.org/docs/secrets/intro/
- Capacitor repository: https://github.com/gimlet-io/capacitor
- Flamingo documentation: https://flux-subsystem-argo.github.io/website/

## Issues Found
- The introduction described Weave GitOps as "now Flux Enterprise" and referred to an acquisition. I changed this to state that Weave GitOps was offered by Weaveworks before the company wound down commercial operations, avoiding an unsupported rename/acquisition claim.
- The Weave GitOps feature list described all listed items as Weave GitOps Enterprise features, but the Flux UI existed as part of Weave GitOps while other capabilities were Enterprise features. I changed the lead-in to "Weave GitOps and Weave GitOps Enterprise" to make the scope accurate.
- The GitOpsSet example generated Flux `Kustomization` resources without `spec.prune`. Flux documents `spec.prune` as a required boolean field, so I added `prune: true`.
- The upstream Flux variable substitution example was an incomplete `Kustomization` and also implied that substitution replaces GitOpsSet-style generation. I added the required reconciliation fields and changed the wording to clarify that substitution customizes existing resources but does not generate multiple resources like GitOpsSet.

## Review Notes
The comparison remains high level. Future updates could name specific commercial Flux distributions and clarify which UI alternatives are intended for production use versus experimentation.
