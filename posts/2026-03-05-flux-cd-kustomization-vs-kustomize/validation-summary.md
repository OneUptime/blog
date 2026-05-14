# Validation Summary: How to Understand Flux CD Kustomization vs Kustomize Kustomization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization custom resource
- Kubernetes
- Kustomize
- kubectl
- YAML configuration

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux kustomize-controller documentation: https://fluxcd.io/flux/components/kustomize/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The Kustomize example used `commonLabels`. I changed it to the current `labels` form shown in the Kubernetes Kustomize documentation to avoid relying on older Kustomize syntax.
- The post said Kustomize has no concept of Git. Kustomize can reference remote bases from Git repositories, so I clarified that it does not manage Flux source objects, reconciliation intervals, pruning, or health checks.
- The Flux example set `wait: true` while also showing `healthChecks`. Flux ignores `spec.healthChecks` when `spec.wait` is `true`, so I changed the example to `wait: false` and clarified the comment.
- The `force: false` comment described avoiding conflicts. Flux `spec.force` controls resource recreation when patching immutable fields fails, so I corrected the comment.
- The plain YAML behavior was described as collecting YAML files in the directory. Flux documents this as generating a `kustomization.yaml` for the set of plain YAMLs under `spec.path`, so I corrected the prose and diagram text.
- The comparison table said Kustomize has no Git awareness and no variable substitution. I clarified the Git row and renamed the variable substitution row to specifically refer to Flux post-build variable substitution.
- The summary implied Flux only uses Kustomize when a checked-in `kustomization.yaml` exists. I corrected it to mention both checked-in and automatically generated kustomization files.

## Review Notes
The main concepts and examples were technically sound after these corrections. One practical caveat is that `spec.targetNamespace` does not create the namespace automatically; it must already exist or be included in the rendered manifests.
