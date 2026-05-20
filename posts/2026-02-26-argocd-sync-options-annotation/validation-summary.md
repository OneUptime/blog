# Validation Summary: How to Use the argocd.argoproj.io/sync-options Annotation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD sync options
- Kubernetes manifests
- kubectl apply, replace, create, and get behavior
- Kubernetes StatefulSet PVC retention
- GitOps deployment configuration

## Sources Consulted
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl replace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_replace/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The post implied all Application-level sync options can be overridden by resource-level annotations. Updated the wording to clarify that only sync options supported at both scopes can be overridden per resource.
- The `ApplyOutOfSyncOnly=true` example used a resource-level annotation, but the Argo CD documentation presents selective sync as an Application-level or CLI sync option. Replaced the resource annotation examples with Application-level `spec.syncPolicy.syncOptions` examples.
- The `Force=true` section described force apply and conflict override behavior. Argo CD documents `Force=true` as delete/create behavior, commonly paired with `Replace=true`; updated the explanation and example accordingly.
- The `Replace=true` section said Replace always deletes and recreates the resource. Argo CD uses `kubectl replace` or `kubectl create`; deletion/recreation is the destructive behavior associated with force replacement. Updated the note to be more precise.
- The `Validate=false` example used a ConfigMap whose embedded data would not require kubectl schema validation to be disabled. Replaced it with a custom resource-style example and clarified that the option disables kubectl schema validation.
- The `CreateNamespace=true` section implied it could be used as a resource-level annotation. Updated the wording to clarify it is set at the Application level or via CLI.
- The StatefulSet pattern placed Argo CD sync-option annotations inside `volumeClaimTemplates`, which does not make Argo CD directly protect those generated PVCs as independently synced resources. Updated the example to use Kubernetes `persistentVolumeClaimRetentionPolicy` for StatefulSet-created PVC retention.

## Review Notes
All YAML snippets were parsed successfully after the corrections. The post remains version-neutral; behavior was checked against the current stable Argo CD documentation and current Kubernetes documentation as of 2026-05-20.
