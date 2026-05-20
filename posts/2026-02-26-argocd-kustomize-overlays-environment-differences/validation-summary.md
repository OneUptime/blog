# Validation Summary: How to Use Kustomize Overlays for Environment Differences in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet manifests
- Kubernetes
- Kustomize overlays and patches
- HorizontalPodAutoscaler autoscaling/v2
- kubectl dry-run validation
- JSON Patch / RFC 6902

## Sources Consulted
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kustomize upstream README: https://github.com/kubernetes-sigs/kustomize
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD ApplicationSet generator and template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- Replaced the base `commonLabels` example with the current Kustomize `labels` transformer using `includeSelectors: true`, matching upstream Kustomize examples while preserving the same selector-label behavior.
- Removed unused `autoSync` values from the ApplicationSet list generator. The values were not referenced by the template and therefore did not make production manual or dev/staging automated.
- Fixed the JSON Patch example that added to `/spec/template/spec/containers/0/env/-`. The base Deployment has no `env` array, so the parent array would not exist. The patch now adds the `env` array itself.
- Removed `behavior: merge` from the standalone overlay `configMapGenerator` example because the preceding base uses a plain `configmap.yaml`, not a matching base generator. The explanation now says to add `behavior: merge` only when a matching base generator exists.
- Updated the selector-label warning to refer to `labels` with `includeSelectors: true` instead of `commonLabels`.

## Review Notes
- The examples use valid current Kubernetes API versions for Deployment, Application, ApplicationSet, and autoscaling/v2 HPA.
- `kubectl apply --dry-run=client -f -` is still a valid validation command.
- Kustomize and kubectl were not installed in the local shell, so validation was performed against official documentation rather than local command execution.
