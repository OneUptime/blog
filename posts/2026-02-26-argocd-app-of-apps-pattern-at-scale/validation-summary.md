# Validation Summary: How to Implement the App-of-Apps Pattern at Scale

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Applications and App-of-Apps
- Argo CD ApplicationSets
- Kubernetes manifests
- GitOps
- Argo CD AppProjects and RBAC

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD ApplicationSet Git Generator: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD High Availability and scaling guidance: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/

## Issues Found
- The sync-wave explanation implied that wave ordering always waits on child application health. Updated it to clarify that, in App-of-Apps, sync waves order the child `Application` resources in the parent app, and waiting on child app health requires restoring the `argoproj.io/Application` health customization.
- The ApplicationSet examples used legacy template placeholders such as `{{path}}`, `{{path.basename}}`, `{{name}}`, and `{{server}}`. Updated the examples to use `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and current Go template parameters such as `{{.path.path}}`, `{{.path.basename}}`, `{{.nameNormalized}}`, and `{{.server}}`.
- The health-check section stated that the root app shows Healthy only when all child apps are Healthy. Updated it because Argo CD removed built-in health assessment for `argoproj.io/Application`; the behavior requires the custom health logic shown in the post.
- The performance tips overstated `ServerSideApply=true` as a diff speed optimization and `RespectIgnoreDifferences=true` as a way to avoid unnecessary syncs. Updated these to match Argo CD documentation: server-side apply changes apply behavior and field management, while `RespectIgnoreDifferences=true` makes ignored fields respected during sync.
- The resource tracking tip claimed annotation-based tracking is for faster reconciliation. Updated it to the documented reason: avoiding label length limits and ownership conflicts with other Kubernetes tools.
- Added `ApplyOutOfSyncOnly=true` to the root application sync options example to match the selective sync performance recommendation.

## Review Notes
The remaining examples use valid Argo CD `argoproj.io/v1alpha1` resources and documented fields. The OneUptime internal links are plausible blog URLs but were not treated as authoritative technical references for Argo CD behavior.
