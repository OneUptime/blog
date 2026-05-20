# Validation Summary: Best Practice: One ArgoCD App per Service vs Umbrella Apps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD sync waves and selective sync
- Kubernetes manifests
- Kustomize
- Helm chart dependencies
- GitOps deployment patterns

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-Git/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD selective sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/selective_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/sync-options/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Helm dependency best practices: https://docs.helm.sh/docs/chart_best_practices/dependencies/

## Issues Found
- The post described umbrella Application deploys as atomic. Argo CD syncs resources in an operation, but it is not a transactional deployment with automatic rollback of all previously applied resources. I changed the wording to say services are synced as part of the same sync operation, not atomically.
- The post said an umbrella syncs everything even if only one service changed. Argo CD documentation notes that auto-sync applies every object by default, while selective sync options can change this behavior. I updated the sentence to specify the default behavior.
- The post said you cannot deploy just one service from an umbrella. Argo CD supports selective sync of individual resources, but selective sync does not run hooks and is not the same as an independent Application lifecycle. I updated the wording to reflect that distinction.
- The ApplicationSet example used `{{path[1]}}` and `{{path}}`, which do not match the current documented Go template parameters for the Git directory generator. I added `goTemplate: true`, `goTemplateOptions: ["missingkey=error"]`, and changed the template values to `{{index .path.segments 1}}` and `{{.path.path}}`.

## Review Notes
The overall guidance is technically sound as an architectural comparison. The post now uses current Argo CD ApplicationSet Git generator template syntax and avoids overstating umbrella Application behavior as atomic.
