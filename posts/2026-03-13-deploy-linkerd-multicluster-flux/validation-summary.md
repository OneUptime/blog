# Validation Summary: How to Deploy Linkerd Multicluster with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd multicluster
- Linkerd CLI
- Linkerd Helm charts
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes Services and Deployments
- Linkerd HTTPRoute traffic shifting

## Sources Consulted
- Linkerd Installing Multi-cluster Components: https://linkerd.io/2.19/tasks/installing-multicluster/
- Linkerd multicluster CLI reference: https://linkerd.io/2.18/reference/cli/multicluster/
- Linkerd Multi-cluster communication reference: https://linkerd.io/2-edge/reference/multicluster/
- Linkerd HTTPRoute reference: https://linkerd.io/2/reference/httproute/
- Linkerd Traffic Shifting guide: https://linkerd.io/2/tasks/traffic-shifting/
- Linkerd Helm chart values and Link CRD source: https://github.com/linkerd/linkerd2/tree/main/multicluster/charts/linkerd-multicluster
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The HelmRelease placed the release object in `linkerd-multicluster` without creating that namespace. Moved the HelmRelease to `flux-system`, set `targetNamespace: linkerd-multicluster`, and enabled `install.createNamespace`.
- The multicluster Helm values did not configure a service-mirror controller for the target Link, which is required by the newer GitOps-compatible Linkerd multicluster model. Added a `controllers` entry referencing the `east` Link.
- The link generation command used `linkerd multicluster link`, which is the older workflow that emits controller resources as part of the link. Changed it to `linkerd --context=east multicluster link-gen --cluster-name east` for the current GitOps-compatible flow.
- The sample Link used `remoteDiscoverySelector` for normal gateway-mode service mirroring. Changed it to `selector`, which is the field Linkerd uses for hierarchical mirroring of services labeled `mirror.linkerd.io/exported=true`, and added `targetClusterLinkerdNamespace`.
- The sample Deployment was not valid `apps/v1` Kubernetes because it lacked `spec.selector` and matching pod template labels. Added the required selector and labels.
- The HTTPRoute example used `policy.linkerd.io/v1beta3`, which is not the documented Linkerd HTTPRoute API version, and used an empty Service parent group. Changed it to `policy.linkerd.io/v1beta2`, `group: core`, and added the Service parent port.
- The validation command `kubectl get gateway -n linkerd-multicluster` used the wrong resource for Linkerd multicluster gateway status. Changed it to `linkerd multicluster gateways`.
- The chart version pin used `30.12.*`, which was not present in the official stable Helm index. Changed it to the current stable `30.11.*` line.
- Updated the best-practice note to refer to committing both the generated Link and credential Secret output from `link-gen`.

## Review Notes
- YAML snippets were parsed successfully after the edits.
- The post assumes the `linkerd` HelmRepository points at the stable Linkerd Helm repository. If the repository is configured for edge releases, the chart version should use the edge calendar-versioned line instead of `30.11.*`.
