# Validation Summary: How to Deploy Multiple Microservices with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD ApplicationSets
- Argo CD AppProjects
- GitOps
- Kubernetes
- Kustomize
- jq

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/sync-options/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD cluster bootstrapping / app-of-apps documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD AppProject declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/sync-waves/
- Argo CD CLI `argocd app list` documentation: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/commands/argocd_app_list/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Git generator example used the older default ApplicationSet templating syntax (`{{path}}` and `{{path[1]}}`). I updated the example to enable `goTemplate: true` with `goTemplateOptions: ["missingkey=error"]`, and changed the path variables to `{{.path.path}}` and `{{index .path.segments 1}}`, matching the current Argo CD Go Template guidance.
- The List generator example also used the older default ApplicationSet template variable syntax. I updated it to use Go Template syntax (`{{.service}}` and `{{.replicas}}`) and added the same recommended Go Template settings.
- The shared infrastructure section implied that sync-wave annotations in separate application payload manifests would order deployments across independent Argo CD Applications. Sync waves apply within a sync operation, so I changed the guidance to put sync-wave annotations on the child `Application` resources when they are managed by the same parent app, and added the annotation to the `shared-infrastructure` Application example.

## Review Notes
- The app-of-apps pattern is technically valid, but Argo CD documentation treats it as an admin-oriented bootstrapping pattern because a parent app that creates child Applications can grant broad deployment capability through the child `project` fields.
- The `kustomize edit set image` workflow is plausible, but the exact effect depends on the image names already declared in each overlay's `kustomization.yaml`.
