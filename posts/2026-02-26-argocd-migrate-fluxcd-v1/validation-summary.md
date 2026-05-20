# Validation Summary: How to Migrate from FluxCD v1 to ArgoCD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- FluxCD v1 / Flux Legacy
- Flux Helm Operator
- Argo CD
- Argo CD Application CRD
- Argo CD Image Updater
- Kubernetes
- Helm
- kubectl
- jq

## Sources Consulted
- Flux migration documentation: https://fluxcd.io/flux/migration/
- Flux v1 image automation migration documentation: https://fluxcd.io/flux/migration/flux-v1-automation-migration/
- Flux Helm Operator migration documentation: https://fluxcd.io/flux/migration/helm-operator-migration/
- Flux Helm Operator CRD manifest: https://raw.githubusercontent.com/fluxcd/helm-operator/master/deploy/crds.yaml
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD app sync CLI documentation: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_app_sync/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD Image Updater installation documentation: https://argocd-image-updater.readthedocs.io/en/stable/install/installation/
- Argo CD Image Updater image configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater registry configuration documentation: https://argocd-image-updater.readthedocs.io/en/stable/configuration/registries/

## Issues Found
- The Flux HelmRelease example used `apiVersion: flux.weave.works/v1beta1`, but the Flux Helm Operator `HelmRelease` API is `helm.fluxcd.io/v1`. Updated the example to use the correct API group.
- The cleanup commands referenced `helmreleases.flux.weave.works`, which is not the Flux Helm Operator HelmRelease CRD name. Updated cleanup to use `helmreleases.helm.fluxcd.io`.
- The post mapped `flux.weave.works/automated: "true"` directly to Argo CD automated sync. In Flux v1 this annotation is part of image automation, while Git reconciliation is based on Flux's watched Git path. Updated the concept mapping and examples to distinguish Git auto-sync from image automation.
- The Image Updater example used legacy annotation-style configuration and the deprecated `name` update strategy. Updated it to the current `ImageUpdater` CRD format and used `alphabetical`.
- The Argo CD Image Updater install URL used the older `stable/manifests/install.yaml` path. Updated it to the current `stable/config/install.yaml` path.
- The jq filters for Flux annotations could fail on resources without annotations. Updated them to use `(.metadata.annotations // {})`.
- The Step 7 comment said to remove HelmRelease CRDs when deleting a single HelmRelease resource. Updated the comment to say HelmRelease resources.

## Review Notes
- The guide remains intentionally high level. Real migrations should also account for Argo CD project permissions, app-of-apps or ApplicationSet choices, resource tracking labels/annotations, and whether Image Updater should write back through Git or Argo CD.
