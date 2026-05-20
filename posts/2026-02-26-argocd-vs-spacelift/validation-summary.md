# Validation Summary: ArgoCD vs Spacelift: Infrastructure Deployment Comparison

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Helm
- Kustomize
- Terraform
- OpenTofu
- Pulumi
- AWS CloudFormation
- Ansible
- Spacelift
- Open Policy Agent / Rego
- Amazon EKS

## Sources Consulted
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app logs` command reference: https://argo-cd.readthedocs.io/en/release-2.3/user-guide/commands/argocd_app_logs/
- Argo CD cluster management: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Spacelift stack creation and supported vendors: https://docs.spacelift.io/getting-started/create-stack
- Spacelift policy documentation: https://docs.spacelift.io/concepts/policy/
- Spacelift plan policy documentation: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
- Spacelift drift detection documentation: https://docs.spacelift.io/self-hosted/latest/concepts/stack/drift-detection
- Spacelift Terraform state management documentation: https://docs.spacelift.io/vendors/terraform/state-management
- Spacelift pricing page: https://spacelift.io/pricing
- Terraform Kubernetes provider `kubernetes_deployment` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Argo CD provider `argocd_cluster` resource documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs/resources/cluster
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Terraform AWS EKS module registry page: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/latest

## Issues Found
- Argo CD health coverage was overstated as health assessment for all resource types. Changed it to built-in health assessment for many standard resource types, with custom health checks for others, matching Argo CD's documented behavior.
- The Argo CD RBAC bullet described Projects as "Kubernetes-native RBAC." Changed it to Argo CD RBAC and project-level restrictions through AppProjects, which is more accurate.
- The `argocd app logs` example used a non-documented `--pod` flag. Replaced it with `--kind Pod --name my-app-abc123`, matching the documented CLI resource filters.
- The EKS example used Kubernetes `1.28`, which is no longer a current standard-support EKS version on May 20, 2026. Updated it to `1.35` and updated the EKS module constraint to `~> 21.0`.
- The statement that Argo CD cannot manage any non-Kubernetes infrastructure was too absolute because external infrastructure can be represented through Kubernetes CRDs and managed by controllers. Clarified that Argo CD operates through the Kubernetes API and does not directly provision those resources.
- The Spacelift Rego policy used Rego v0 syntax and referenced an unsupported-looking `input.spacelift.run.triggered_by == "approval"` field. Updated the example to Rego v1 syntax and changed the production rule to a documented-style warning for manual review.
- The mixed Terraform/YAML example was labeled as `yaml`. Changed the code fence to `text` because it intentionally contains both Terraform and Kubernetes YAML snippets.
- The `argocd_cluster` EKS registration example used a short-lived EKS bearer token. Updated it to use `aws_auth_config`, which is the documented Terraform Argo CD provider pattern for EKS clusters.
- The Spacelift cost table listed `$100-2,000+` and said there is no self-hosting. Updated it to reflect the current official pricing page: free tier, paid plans starting at $399/month, quote-based higher tiers, SaaS by default, and Enterprise self-hosting availability.

## Review Notes
- The post remains a high-level comparison rather than a runnable end-to-end tutorial. Some snippets omit provider blocks, authentication setup, namespaces, and surrounding manifests, which is acceptable for the comparison format but would need expansion in a hands-on tutorial.
