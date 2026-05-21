# Validation Summary: How to Configure Istio for Weave GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Weave GitOps
- Flux
- Flagger
- Kubernetes
- Helm
- Kustomize

## Sources Consulted
- Flux bootstrap command documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux get kustomizations CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux getting started guide: https://fluxcd.io/flux/get-started/
- Weave GitOps CLI bcrypt hash documentation: https://docs.gitops.weaveworks.org/docs/references/cli-reference/gitops_get_bcrypt-hash/
- Weave GitOps Helm chart reference: https://docs.gitops.weaveworks.org/docs/0.23.0/references/helm-reference/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Flagger Istio progressive delivery guide: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies

## Issues Found
- The Flux setup used `flux install`, but the later examples assume a `GitRepository` source named `flux-system`. Changed the setup command to `flux bootstrap github`, which installs Flux and creates the GitOps source expected by the Kustomization examples.
- The Istio Flux Kustomization health check referenced an application VirtualService that would not be created until the dependent apps Kustomization ran. Changed the health check to the `istiod` Deployment so the dependency waits for the Istio control plane instead of an app resource.
- The explanation of `dependsOn` said VirtualServices and DestinationRules would exist before application pods. Since the app Kustomization applies those app resources together, revised the text to say it ensures Istio CRDs and the control plane are ready first.
- The VirtualService routed to `v1` and `v2` subsets without showing the corresponding DestinationRule. Added a minimal DestinationRule defining those subsets, matching Istio's requirement that named subsets be declared in a DestinationRule.
- The drift section said drift correction is controlled by `prune`. Revised it to explain that reconciliation corrects drift, while `prune` garbage-collects resources removed from Git. Clarified `force: false` as avoiding forced replacement for immutable field changes.

## Review Notes
- Weave GitOps documentation and Helm chart references are still available, but the project should be checked for maintenance status before using it for a new production platform.
- The sample assumes GitHub for Flux bootstrap. Other Flux bootstrap providers can be substituted if the GitOps repository is hosted elsewhere.
