# Validation Summary: How to Use GitRepository with Sparse Checkout in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller GitRepository API
- Flux kustomize-controller Kustomization API
- Kubernetes custom resources
- Git sparse checkout and shallow clone behavior

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The post incorrectly stated that Flux does not provide sparse checkout and only uses Kustomization path filtering plus `include`. Updated the explanation to describe the current `GitRepository.spec.sparseCheckout` field and added it to the main GitRepository example.
- The introduction implied that `include` and Kustomization path filtering let Flux fetch only selected directories. Updated the wording so sparse checkout is the fetch/artifact optimization, while path filtering selects content from the source artifact and `include` composes artifacts from other GitRepository resources.
- The clone-depth section said to use a shallow clone with tag or commit references, but the example used a branch and Flux documents shallow cloning for branch references, with commit pinning optionally combined with a branch. Updated the text to match the documented behavior.
- The monorepo-splitting section claimed the strategy was to create multiple GitRepository resources, but the example used one GitRepository with multiple Kustomizations. Updated the heading and explanation to match the actual YAML.
- The ignore-pattern section implied `.spec.ignore` reduces artifact size even though the full repo is still fetched. Clarified that ignore rules are applied while archiving after checkout, and that `sparseCheckout` is the appropriate option for avoiding checkout of unrelated directories.
- The summary repeated the outdated claim that Flux does not implement sparse checkout. Updated it to reflect the current GitRepository sparse checkout support.

## Review Notes
The YAML examples use current `source.toolkit.fluxcd.io/v1` GitRepository and `kustomize.toolkit.fluxcd.io/v1` Kustomization APIs. The verification commands are valid Flux and Kubernetes commands, though `kubectl describe kustomization` may be ambiguous on clusters that also use native Kustomize-related resources; `kubectl describe kustomization.kustomize.toolkit.fluxcd.io frontend-app -n flux-system` would be more explicit.
