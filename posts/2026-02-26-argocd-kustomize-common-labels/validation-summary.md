# Validation Summary: How to Override Kustomize Common Labels in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet manifests
- Kubernetes
- Kustomize
- kubectl and argocd CLI usage

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kustomize upstream release notes and README references: https://github.com/kubernetes-sigs/kustomize

## Issues Found
- The post said `commonLabels` adds labels to three places on every resource and listed Jobs as a selector example. I changed this to say `commonLabels` always adds metadata labels and updates selectors/templates only for selector-aware built-in resources such as Deployments, StatefulSets, DaemonSets, and Services.
- The post said ArgoCD Application `kustomize.commonLabels` always behaves like legacy `commonLabels`. I updated this to explain the default behavior and the current `labelWithoutSelector` and `labelIncludeTemplates` controls.
- The ArgoCD Application example did not mention duplicate-label behavior. I added `forceCommonLabels: false` with a short comment because current Argo CD fails on duplicate common label keys unless forced.
- The post said ArgoCD always adds `app.kubernetes.io/instance` and uses it for tracking. I corrected this to describe current annotation-based default tracking, plus label and annotation+label modes.
- The precedence rules claimed Application spec labels override kustomization labels by default. I corrected this to say duplicate keys fail unless `forceCommonLabels: true` is set, and updated the example accordingly.
- The post tied the `labels` transformer example to Kustomize v4.1.0+, but the example uses `includeTemplates`, which is a current Kustomize option and is not accurate for all v4.1.x builds. I changed the wording to "Current Kustomize."

## Review Notes
The remaining examples are syntactically valid YAML for Argo CD/Kustomize usage. The `argocd app set --kustomize-common-label` flag matches the Argo CD command reference. `commonLabels` remains supported but current Kustomize examples generally prefer `labels` when selector behavior needs to be controlled.
