# Validation Summary: How to Use Kustomization with Helm Post-Renderers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Helm post-renderers
- Kustomize patches and image overrides
- Kubernetes manifests
- Flux CLI
- Helm CLI
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Helm advanced techniques / post-rendering documentation: https://helm.sh/docs/v3/topics/advanced/
- Kubernetes `kubectl kustomize` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The basic post-renderer example claimed to add labels to all resources, but the snippet only contained empty `patches`, `patchesStrategicMerge`, and `images` fields. Current Flux HelmRelease documentation lists `kustomize.patches` and `kustomize.images` for `spec.postRenderers`, while common metadata is handled separately by `spec.commonMetadata`. I changed the example to use `kustomize.patches` to add a label to rendered Deployments.
- The labels and annotations example described labels and annotations, but only added annotations. I added a label to the same metadata patch so the snippet matches the text.
- The sidecar example mounted a `logs` volume without defining that volume in the Pod spec. I added an `emptyDir` volume named `logs` so the rendered Deployment is valid Kubernetes.
- The multiple post-renderers example described network policy labels but applied the label to the Deployment object metadata. NetworkPolicy selectors normally match Pods, so I changed the patch to add the label under `spec.template.metadata.labels`.

## Review Notes
- The Flux `flux events --for HelmRelease/my-app --namespace production`, `flux get hr`, `helm template`, and `kubectl kustomize` commands are consistent with current official command references.
- Current Flux HelmRelease post-renderers are applied in order and are persisted to the Helm release manifest, as stated in the post. Flux also documents that Helm post-renderers are not applied to chart hooks; the post does not cover this caveat.
