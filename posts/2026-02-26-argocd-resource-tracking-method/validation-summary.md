# Validation Summary: How to Configure Resource Tracking Method in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Argo CD CLI
- Helm

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD v2.14 to v3.0 upgrade notes: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.14-3.0/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The post described label-based tracking as the current default. Argo CD 3.0 and later default to annotation-based tracking, so the wording was updated to say label tracking was the default before Argo CD 3.0 and that an empty `application.resourceTrackingMethod` means `annotation` in Argo CD 3.0 and later.
- The community Helm chart example used `server.config`, which is not the current values path for `argocd-cm` data. It was changed to `configs.cm`.
- The post said annotation+label tracking is recommended by the Argo CD team for new installations. Current official documentation lists `annotation` as the default and `annotation+label` as the compatibility option, so the recommendation was corrected.
- The selection table recommended `annotation+label` for new installations and omitted the `installationID` requirement for multiple Argo CD instances. The table now recommends `annotation` for new installations and notes that multiple instances should also use a unique `installationID`.
- The label tracking limitations overstated that label tracking cannot distinguish resources with the same name in different groups or namespaces. This was changed to the more accurate limitation that the label does not encode full resource identity.
- A YAML metadata example was marked as `bash`; the code fence was corrected to `yaml`.

## Review Notes
The commands and tracking annotation format were consistent with the official Argo CD documentation. The `argocd app get my-app --hard-refresh` command is valid in the Argo CD CLI.
