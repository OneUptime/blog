# Validation Summary: Weaveworks to Upstream Flux CD Migration

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Weave GitOps Enterprise
- Kubernetes custom resources
- HelmRelease and HelmRepository
- Kyverno
- Capacitor Next
- GitOpsSets

## Sources Consulted
- Flux install command documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno high availability documentation: https://kyverno.io/docs/guides/high-availability/
- Weave GitOps GitOpsSet documentation: https://docs.gitops.weaveworks.org/docs/0.23.0/gitopssets/guide/
- Weave GitOps Policy Engine documentation: https://docs.gitops.weaveworks.org/docs/policy/intro/
- CNCF Flux project page: https://www.cncf.io/projects/flux/
- Capacitor Next documentation and repository: https://gimlet.io/capacitor-next/ and https://github.com/gimlet-io/capacitor

## Issues Found
- The description incorrectly framed the article as a Weaveworks Flux v1 to Flux v2 migration, while the content is about Weave GitOps Enterprise to upstream Flux CD. Updated the description to match the guide.
- The introduction and best practices made absolute compatibility claims for all core Flux resources. Updated these statements to clarify that resources can remain in place when their API versions are supported by the upstream Flux release being installed.
- The policy inventory command used `kubectl get policies`, which is too broad and may match unrelated Kubernetes policy resources. Updated it to query the Weave Policy Engine policy resource group, `policies.pac.weave.works`.
- The feature table used "Flux CDs" instead of "Flux CRs" and repeated the absolute compatibility claim. Corrected the wording.
- The Kyverno Flux example omitted the `kyverno` namespace while placing the HelmRelease in that namespace. Added a Namespace manifest.
- The Kyverno Helm values used the old top-level `replicaCount` style. Updated the example to the current per-controller replica values documented by Kyverno.
- The Capacitor example declared a HelmRelease that referenced an undefined `gimlet` HelmRepository and did not match the current documented Capacitor Next quickstart. Replaced it with the documented install script and run command.

## Review Notes
- The Flux `flux install` command and `--components-extra` usage are current according to the Flux CLI documentation.
- Flux post-build substitution using `.spec.postBuild.substitute` is current for Kustomization `kustomize.toolkit.fluxcd.io/v1`.
- The GitOpsSet example matches the Weave GitOps GitOpsSet API shape, though GitOpsSets are enterprise-only and should be treated as migration input rather than upstream Flux resources.
