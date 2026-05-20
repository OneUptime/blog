# Validation Summary: ArgoCD vs Harness: Feature and Cost Comparison

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Argo CD
- Harness Continuous Delivery & GitOps
- GitOps
- Kubernetes
- Helm
- Harness pipelines
- Open Policy Agent (OPA)
- Secret management integrations

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Harness GitOps basics: https://developer.harness.io/docs/continuous-delivery/gitops/get-started/harness-git-ops-basics/
- Harness GitOps vs Argo CD: https://developer.harness.io/docs/continuous-delivery/gitops/get-started/harness-gitops-vs-argocd/
- Harness GitOps sync applications: https://developer.harness.io/docs/continuous-delivery/gitops/application/sync-gitops-applications/
- Harness GitOps pipeline steps and GitOpsSync examples: https://developer.harness.io/docs/continuous-delivery/gitops/argo-rollouts/gitops-sync-with-multiple-rollouts-steps/
- Harness pricing page: https://www.harness.io/pricing
- Harness subscription overview: https://developer.harness.io/docs/platform/subscriptions-licenses/subscriptions/
- Harness deployment freeze documentation: https://developer.harness.io/docs/continuous-delivery/manage-deployments/deployment-freeze/
- Harness GitOps OPA policy support: https://developer.harness.io/docs/continuous-delivery/gitops/application/opa-policy-support
- Harness audit trail and audit streaming documentation: https://developer.harness.io/docs/platform/governance/audit-trail/ and https://developer.harness.io/docs/platform/governance/audit-trail/audit-streaming/
- Harness secrets management documentation: https://developer.harness.io/docs/category/secrets-management/
- Harness Drone acquisition documentation: https://developer.harness.io/docs/continuous-integration/use-ci/use-drone-plugins/run-a-drone-plugin-in-ci

## Issues Found
- The Harness GitOps pipeline YAML used a non-current stage shape (`type: GitOps`) and listed `applicationsList` as plain strings. Updated the examples to use a Deployment stage with `gitOpsEnabled: true` and `applicationsList` entries containing `applicationName` and `agentId`, matching Harness GitOpsSync examples.
- The Harness pricing section used outdated/specific pricing claims such as a 5-service free tier and approximately `$100/developer/month` Team tier. Replaced these with current public plan language: Free, Essentials, and Enterprise, with contact/contract pricing where Harness does not publish fixed prices.
- The TCO example included a fixed Harness monthly platform cost range. Replaced it with contract-pricing language so the example does not present unsupported current pricing.
- The post said Argo CD is deployment-only and requires external tools for all pre/post-deployment steps. Adjusted this to note Argo CD sync hooks while preserving the broader point that CI, approvals, and workflow orchestration generally require external tooling.

## Review Notes
- The Argo CD Application manifest is syntactically valid and uses documented fields including `apiVersion: argoproj.io/v1alpha1`, Helm `valueFiles`, automated sync, `prune`, `selfHeal`, and `CreateNamespace=true`.
- The `argocd cluster add` commands are valid as examples if `staging-cluster` and `production-cluster` are kubeconfig context names.
- Harness pricing and packaging changes over time; future reviews should re-check Harness pricing and subscription documentation before republishing.
