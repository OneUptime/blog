# Validation Summary: Flux CD vs Harness GitOps: Feature Comparison

## Status
validated

## Post Type
Reference / Feature comparison

## Technologies Covered
- Flux CD
- Harness GitOps
- Argo CD
- Kubernetes
- Kustomize
- Helm
- SOPS
- Flagger
- Open Policy Agent (OPA)

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux source-controller repository overview: https://github.com/fluxcd/source-controller
- CNCF Flux project page: https://www.cncf.io/projects/flux/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Harness GitOps basics: https://developer.harness.io/docs/continuous-delivery/gitops/get-started/harness-git-ops-basics/
- Harness GitOps Agent installation documentation: https://developer.harness.io/docs/continuous-delivery/gitops/gitops-entities/agents/install-a-harness-git-ops-agent/
- Harness GitOps repository documentation: https://developer.harness.io/docs/continuous-delivery/gitops/gitops-entities/repositories/add-a-harness-git-ops-repository
- Harness GitOps labels / FAQ documentation: https://developer.harness.io/docs/continuous-delivery/gitops/resources/gitops-faqs
- Harness Policy as Code overview: https://developer.harness.io/docs/platform/governance/policy-as-code/harness-governance-overview
- Harness secrets management overview: https://developer.harness.io/docs/platform/secrets/secrets-management/harness-secret-manager-overview
- Harness Cloud Cost Management documentation: https://developer.harness.io/docs/cloud-cost-management/
- Flagger canary documentation: https://docs.flagger.app/usage/how-it-works

## Issues Found
- The Flux Kustomization example set `wait: true` while also defining `healthChecks`. Flux documentation states that when `wait` is enabled, `healthChecks` are ignored. Removed `wait: true` so the explicit Deployment health check behaves as shown.
- The Harness Argo CD Application example used `harness.io/project` and `harness.io/environment` labels. Harness documentation uses `harness.io/serviceRef` and `harness.io/envRef` for service and environment mapping, so the labels and comment were updated.

## Review Notes
The post is technically relevant and the remaining claims align with current official documentation. Harness GitOps behavior can vary between creating applications through the Harness UI/API and importing or managing existing Argo CD resources, but the post's high-level description is accurate for a feature comparison.
