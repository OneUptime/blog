# Validation Summary: How to Use Kustomize Generators with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- ConfigMaps
- Secrets

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo CD documentation: Kustomize user guide - https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD documentation: Compare Options / Ignore Extraneous - https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Kustomize API types documentation - https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Referenced OneUptime configMapGenerator guide, HTTP 200 verified - https://oneuptime.com/blog/post/2026-02-09-kustomize-configmapgenerator/view

## Issues Found
- The introduction said generators use environment variables during build time. Kustomize `configMapGenerator` and `secretGenerator` support env files via `envs`, so this was changed to "environment files."
- The introduction said a generated resource name change triggers a rolling update of any Pod that references it. This was too broad because the rollout happens when Kustomize rewrites references in a workload Pod template, such as a Deployment. The wording was narrowed accordingly.
- The SOPS note implied `secretGenerator` can directly use SOPS-encrypted files. Kustomize does not decrypt SOPS by default, so the note now refers to using SOPS through a supported integration such as KSOPS or a pre-render step.
- The hash-suffix section said Kustomize updates all references. Kustomize updates recognized name references, so the wording was corrected.
- The Argo CD sync section said Argo CD sees "two things" but listed three. This was corrected to "three things."

## Review Notes
- The Kustomize generator field names shown in the examples (`configMapGenerator`, `secretGenerator`, `literals`, `files`, `envs`, `options.disableNameSuffixHash`, `generatorOptions`, `behavior`) align with current Kustomize API documentation.
- Argo CD's Kustomize integration and prune behavior are described accurately for generated resources. For custom resources, Kustomize may require additional name reference configuration before it can rewrite generated ConfigMap or Secret references.
