# Validation Summary: Understanding GitOps Principles and Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitOps
- Kubernetes
- Argo CD
- Kustomize
- Sealed Secrets
- SOPS
- OPA
- Kyverno
- Git
- OneUptime

## Sources Consulted
- OpenGitOps Principles v1.0.0: https://opengitops.dev/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes image digest guidance: https://docs.cloud.google.com/kubernetes-engine/docs/tutorials/using-container-image-digests-in-kubernetes-manifests
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/auto_sync/
- Sealed Secrets official documentation: https://github.com/bitnami-labs/sealed-secrets
- Git revert documentation: https://git-scm.com/docs/git-revert
- OneUptime website: https://oneuptime.com

## Issues Found
- The Deployment example said the image was pinned to a digest but used a tag-only image reference. Changed the image reference to the `name@sha256:digest` form so the example matches Kubernetes image digest guidance.
- The Kustomize example used the deprecated `patchesStrategicMerge` field. Updated it to the current `patches` field.
- The Kustomize example listed `hpa.yaml` as a patch even though the surrounding text describes adding an HPA resource. Moved `hpa.yaml` under `resources` and kept only `replicas-patch.yaml` under `patches`.

## Review Notes
- The Argo CD automated sync example is valid, but rollback behavior should be understood operationally: the Git revert workflow is correct for GitOps-managed desired state, while Argo CD's built-in rollback operation has restrictions when automated sync is enabled.
