# Validation Summary: Flux CD vs Spacelift: GitOps Comparison

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Flux CD
- Spacelift
- GitOps
- Kubernetes
- Helm
- Kustomize
- Terraform/OpenTofu
- Pulumi
- CloudFormation
- Ansible
- OPA/Rego

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm chart source documentation: https://v2-0.docs.fluxcd.io/flux/components/source/helmcharts/
- Flux notification/alerting documentation: https://fluxcd.io/flux/monitoring/alerts/
- Spacelift stack creation documentation: https://docs.spacelift.io/concepts/stack/creating-a-stack
- Spacelift Terraform provider stack resource: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/stack
- Spacelift Kubernetes vendor documentation: https://docs.spacelift.io/vendors/kubernetes/kustomize
- Spacelift Kubernetes getting started documentation: https://docs.spacelift.io/vendors/kubernetes/getting-started
- Spacelift drift detection documentation: https://docs.spacelift.io/self-hosted/latest/concepts/stack/drift-detection
- Spacelift plan policy documentation: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
- Spacelift self-hosted documentation: https://docs.spacelift.io/self-hosted

## Issues Found
- The Spacelift stack example was YAML-shaped pseudo-configuration with fields that do not match the documented Spacelift Terraform provider stack resource. Replaced it with a valid `spacelift_stack` HCL example using documented fields such as `repository`, `branch`, `project_root`, `autodeploy`, and `terraform_version`.
- The Spacelift scope description used Terraform-style "plans and applies" language for CloudFormation and omitted Spacelift's current OpenTofu/Kubernetes workflow wording. Updated it to describe supported workflows more generally and to identify Kubernetes stacks as backed by kubectl/Kustomize.
- The Flux scope statement said Flux does not manage cloud infrastructure, which was too absolute because Flux can reconcile Kubernetes resources and custom resources, while it does not directly run Terraform/OpenTofu or provision cloud primitives by itself. Tightened the wording to say Flux does not directly run Terraform/OpenTofu or provision cloud primitives such as VPCs, databases, and IAM roles.
- The Flux `HelmRelease` example omitted required reconciliation intervals. Added `spec.interval` and `spec.chart.spec.interval` to align with current Flux HelmRelease examples and API expectations.
- The Spacelift OPA policy message said it blocked SSH from `0.0.0.0/0`, but the rule only checked port 22 and did not check the CIDR. Updated the policy to current Rego v1 style and added checks for SSH port coverage and `0.0.0.0/0` in `cidr_blocks`.

## Review Notes
The post is accurate after the fixes. The Spacelift Kubernetes comparison remains intentionally high-level; Spacelift Kubernetes support is driven by Kustomize and `kubectl` dry-run/apply behavior, while Flux continuously reconciles Kubernetes resources from inside the cluster.
