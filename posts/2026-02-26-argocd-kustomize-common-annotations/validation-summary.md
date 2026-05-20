# Validation Summary: How to Override Kustomize Common Annotations in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes annotations and labels
- Kubernetes manifests and patches
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD application specification example: https://raw.githubusercontent.com/argoproj/argo-cd/master/docs/operator-manual/application.yaml
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_tracking/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/sync-options/
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize built-in common annotation field specs: https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/internal/konfig/builtinpluginconsts/commonannotations.go

## Issues Found
- The post said that when the same `commonAnnotations` key appears in both `kustomization.yaml` and the Argo CD Application spec, the Argo CD value wins. Argo CD requires `forceCommonAnnotations: true` or `--kustomize-force-common-annotation` for duplicate keys; otherwise manifest generation fails. Updated the example and explanation to include `forceCommonAnnotations: true`.
- The post identified `kubectl.kubernetes.io/last-applied-configuration` as an Argo CD tracking annotation. That annotation is used by client-side apply, while Argo CD's annotation-based resource tracking uses `argocd.argoproj.io/tracking-id`. Updated the example and explanation.
- The selective annotation JSON patch added a nested annotation key under `/metadata/annotations/...`, which fails if `metadata.annotations` does not already exist. Replaced it with a strategic merge patch targeted at the `my-api` Deployment so the annotation map is created or merged safely.

## Review Notes
The remaining examples and claims align with the consulted documentation. Kustomize `commonAnnotations` is still supported, Argo CD exposes `commonAnnotations` and the matching CLI flag, and Kustomize applies common annotations to resource metadata and built-in pod template paths such as Deployments, StatefulSets, DaemonSets, Jobs, ReplicaSets, ReplicationControllers, and CronJobs.
