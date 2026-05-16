# Validation Summary: How to Set Up Kustomize on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- kubectl
- Kustomize
- Kubernetes Deployments, Services, ConfigMaps, Secrets, and NetworkPolicies
- Flux
- Argo CD
- kubeconform

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kustomize upstream README and kubectl integration notes: https://github.com/kubernetes-sigs/kustomize
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/kustomize/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Talos Linux configuration reference: https://www.talos.dev/latest/reference/configuration/
- Talos Linux getting started documentation: https://www.talos.dev/v1.9/introduction/getting-started/
- kubeval repository maintenance notice: https://github.com/instrumenta/kubeval
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/

## Issues Found
- Replaced deprecated Kustomize `commonLabels` examples with the current `labels` field using `pairs` and `includeSelectors: true`. Current Kustomize versions warn that `commonLabels` is deprecated, while Kubernetes documentation shows the newer `labels` form.
- Added a compatibility note that current Kustomize fields such as `labels` require a supported kubectl release or the standalone Kustomize binary, even though kubectl has included Kustomize since Kubernetes 1.14.
- Narrowed the ConfigMap and Secret hash-suffix explanation. The original text implied generated name changes always ensure pods pick up updates; this only triggers a rollout when workloads reference the generated names in pod specs and Kustomize updates those references.
- Renamed the Talos-specific resource section and wording. StorageClasses and NetworkPolicies are Kubernetes resources used on Talos-hosted clusters, not Talos-specific resources.
- Updated the NetworkPolicy namespace selectors to use the immutable `kubernetes.io/metadata.name` namespace label. Kubernetes documentation notes that NetworkPolicy cannot directly target namespaces by name, but can select this standard namespace label.
- Replaced `kubeval` with `kubeconform -strict -summary -` for local schema validation. `kubeval` is no longer maintained, and kubeconform is the maintained successor-style validator documented for stdin validation.
- Added `project: default` to the Argo CD Application example. Argo CD's Application specification includes `spec.project`, and official minimal examples set it explicitly.

## Review Notes
The Kubernetes, Kustomize, kubectl, Flux, Argo CD, and Talos concepts are otherwise technically sound. The guide remains workstation-focused; Talos does not change how Kustomize renders or applies standard Kubernetes workload manifests.
