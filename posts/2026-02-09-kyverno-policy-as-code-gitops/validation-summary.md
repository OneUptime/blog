# Validation Summary: How to Implement Kyverno Policy as Code in GitOps Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kyverno ClusterPolicy and PolicyException resources
- Kyverno CLI
- Kustomize
- Argo CD Applications and ApplicationSets
- Argo CD Notifications
- Flux GitRepository and Kustomization resources
- GitHub Actions

## Sources Consulted
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno CLI documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno GitHub releases: https://github.com/kyverno/kyverno
- Kustomize patches documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet templatePatch documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- Kyverno examples used deprecated `spec.validationFailureAction`. Updated validation rules to use `spec.rules[*].validate.failureAction`, matching current Kyverno documentation.
- The production Kustomize overlay had two `resources` keys, which would cause one list to override the other in YAML parsers. Combined the resources into a single list.
- The production overlay used deprecated `patchesStrategicMerge` and strategic merge patching for Kyverno custom resources. Replaced it with the current `patches` field and JSON 6902 patch files targeted at the relevant `ClusterPolicy` resources.
- The base Kustomize example used deprecated `commonLabels`. Replaced it with the current `labels` transformer form using `pairs` and `includeSelectors`.
- The Argo CD production Application enabled automated sync while the comment said manual sync was required. Removed the `automated` block and kept sync options under `syncPolicy`.
- The ApplicationSet templated a boolean field as a string with `selfHeal: "{{autoSync}}"`, which Argo CD does not support. Updated the example to use Go templating plus `templatePatch` so automated sync settings render as real booleans, and switched cluster names to `destination.name`.
- The GitHub Actions workflow installed an outdated Kyverno CLI release and used older action major versions. Updated the Kyverno CLI download to `v1.18.1`, `actions/checkout` to `v4`, and `actions/github-script` to `v7`.
- The Kyverno CLI validation commands used `--cluster=false` without resources. Updated them to evaluate policies against test resources and added `tests/resources/pod.yaml` to the repository structure so the workflow path is represented.

## Review Notes
The corrected examples are still illustrative and assume supporting policy files, test resources, Argo CD projects, cluster secrets, and Kyverno CRDs already exist in the target environment.
