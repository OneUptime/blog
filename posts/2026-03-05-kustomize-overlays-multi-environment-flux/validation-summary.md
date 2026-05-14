# Validation Summary: How to Use Kustomize Overlays with Flux for Multi-Environment Deployments

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Kubernetes
- Kustomize
- Flux CD
- GitOps
- YAML configuration
- HorizontalPodAutoscaler
- PodDisruptionBudget

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize API types documentation, https://pkg.go.dev/sigs.k8s.io/kustomize/api/types
- Flux documentation: Kustomization resources, https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation: `flux reconcile kustomization`, https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The dev overlay defined `patches` twice. In YAML, duplicate mapping keys are unsafe and commonly result in one key overriding the other, which would drop either the ConfigMap patch or the HPA deletion patch. I combined both entries under a single `patches` list.
- The overlays used Kustomize `commonLabels`, which is deprecated in current Kustomize API types. I replaced it with `labels` and `includeSelectors: true` to preserve the original behavior of applying the environment label to selectors and pod templates.
- The production Flux Kustomization comment said `healthChecks` required manual approval. Flux `healthChecks` validate rollout health and affect the Kustomization readiness condition; they do not provide a manual approval gate. I changed the comment to describe health checking.

## Review Notes
The Kubernetes API versions used in the examples are current: `apps/v1` for Deployments, `autoscaling/v2` for HorizontalPodAutoscaler, and `policy/v1` for PodDisruptionBudget. The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and the documented `flux reconcile kustomization <name> --with-source` command. Local `kustomize`, `kubectl`, and `flux` binaries were not installed in the workspace, so CLI execution was not performed.
