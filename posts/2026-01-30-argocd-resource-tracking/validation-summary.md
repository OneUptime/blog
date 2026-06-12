# Validation Summary: How to Create ArgoCD Resource Tracking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource tracking
- Argo CD Applications and ApplicationSets
- Kubernetes labels, annotations, ConfigMaps, and manifests
- Argo CD CLI
- Prometheus and PrometheusRule alerts

## Sources Consulted
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD CLI `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD CLI `argocd app resources`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD Declarative Setup resource exclusions: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/latest/operator-manual/app-any-namespace/
- Kubernetes ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The post described `annotation+label` as "Annotation + Label UID" and said it adds a unique identifier. Changed this to "Annotation + Label" because Argo CD uses the tracking annotation for ownership and adds the label only for compatibility.
- The `annotation+label` example used `argocd/myapp` in the tracking ID and claimed the annotation includes the Argo CD namespace. Changed the example to the documented tracking ID format and clarified that cluster information is not added to the tracking ID.
- The post recommended `annotation+label` for new installations. Updated the best-practice section to use `annotation`, which is the current default and avoids label conflicts, while keeping `annotation+label` as the compatibility option.
- The restart commands targeted `argocd-application-controller` as a Deployment. Updated those commands to restart the upstream StatefulSet form.
- The "Preserve Existing Labels" example used `RespectIgnoreDifferences=true` without an `ignoreDifferences` rule. Added an example `ignoreDifferences` entry and `project: default`.
- The shared-resource section said `CreateNamespace=false` excludes resources from tracking. Reworded it to explain namespace creation accurately and added a destination to make the Application example usable.
- The `resource.exclusions` example used a `names` field, which is not supported by Argo CD resource exclusions. Removed the unsupported field and clarified that exclusions apply to resource kinds.
- The CLI example used `argocd app get myapp --show-tree`, which is not a documented flag. Changed it to `argocd app get myapp --output tree`.
- Several Application and ApplicationSet examples omitted `project`. Added `project: default` where the snippets are presented as usable manifests.
- The monitoring section used `argocd_app_resource_count`, which is not a documented current Argo CD metric. Changed it to `argocd_app_orphaned_resources_count`.
- The orphan detection command relies on labels, so it does not apply to annotation-only tracking. Added a note that it applies to label and annotation+label tracking.

## Review Notes
The post remains a broad operational guide rather than a version-specific reference. Current Argo CD documentation lists `annotation` as the default tracking method; installations pinned to older Argo CD versions may still have different defaults or local configuration.
