# Validation Summary: How to Deploy Goldilocks for Resource Recommendations with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRelease and Kustomization
- Kubernetes namespaces, Ingress, and kubectl
- Fairwinds Goldilocks
- Kubernetes Vertical Pod Autoscaler (VPA)
- Fairwinds Helm charts

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Goldilocks installation documentation: https://goldilocks.docs.fairwinds.com/installation/
- Goldilocks advanced usage documentation: https://goldilocks.docs.fairwinds.com/advanced/
- Fairwinds Goldilocks Helm chart values and README: https://github.com/FairwindsOps/charts/tree/master/stable/goldilocks
- Fairwinds VPA Helm chart values and Chart.yaml: https://github.com/FairwindsOps/charts/tree/master/stable/vpa
- Goldilocks chart package metadata on Artifact Hub: https://artifacthub.io/packages/helm/fairwinds-stable/goldilocks
- Fairwinds VPA chart package metadata on Artifact Hub: https://artifacthub.io/packages/helm/fairwinds-stable/vpa

## Issues Found
- The HelmRelease examples placed the Flux custom resources in `vpa` and `goldilocks` namespaces without creating those namespaces first. I moved both HelmRelease resources to `flux-system` and added `targetNamespace` plus `install.createNamespace: true`, matching Flux's supported namespace creation behavior for Helm install actions.
- The Goldilocks chart version range was pinned to chart major v8 while the current Fairwinds Goldilocks chart major is v10. I updated the range to `>=10.0.0 <11.0.0`.
- The prerequisites did not mention the Kubernetes version required by the current Fairwinds VPA chart major. I updated the prerequisite to Kubernetes 1.24+.
- The namespace-labeling text described the example as a Flux patch, but the snippet is a Flux Kustomization applying namespace manifests with pruning disabled. I corrected the wording.
- The best-practice guidance said to set `updateMode: "Off"` on all Goldilocks-created VPA objects. Goldilocks already creates VPAs in recommendation-only `Off` mode by default, and its documented override mechanism is the `goldilocks.fairwinds.com/vpa-update-mode` label. I corrected the recommendation.

## Review Notes
- The YAML examples use current Flux API versions (`source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, and `kustomize.toolkit.fluxcd.io/v1`).
- The Goldilocks namespace enablement label, dashboard service name, ingress values shape, and VPA recommendation-only behavior match the Fairwinds documentation and chart source.
- Local `helm`, `kubectl`, and Ruby YAML tooling were not installed in the workspace, so validation was performed against official/current documentation and upstream chart source rather than by rendering the chart locally.
