# Validation Summary: How to Deploy GitHub Actions Runners on Kubernetes with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-compatible HCL
- GitHub Actions Runner Controller (ARC)
- GitHub Actions runner scale sets
- Helm
- Kubernetes
- Amazon EKS managed node groups

## Sources Consulted
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller — https://docs.github.com/en/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Get started with Actions Runner Controller — https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/get-started
- GitHub Docs: About Actions Runner Controller — https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners-with-actions-runner-controller/about-actions-runner-controller
- GitHub Docs: Authenticating ARC to the GitHub API — https://docs.github.com/en/enterprise-cloud@latest/actions/how-tos/manage-runners/use-actions-runner-controller/authenticate-to-the-api
- GitHub Docs: Deciding when to build a GitHub App — https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app
- GitHub Docs: Rate limits for GitHub Apps — https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/rate-limits-for-github-apps
- GitHub Container Registry package pages for ARC Helm charts — https://github.com/actions/actions-runner-controller/pkgs/container/actions-runner-controller-charts%2Fgha-runner-scale-set and https://github.com/actions/actions-runner-controller/pkgs/container/actions-runner-controller-charts%2Fgha-runner-scale-set-controller
- ARC chart source: `gha-runner-scale-set` values and templates — https://github.com/actions/actions-runner-controller/tree/master/charts/gha-runner-scale-set
- ARC controller chart source: `gha-runner-scale-set-controller` values — https://github.com/actions/actions-runner-controller/tree/master/charts/gha-runner-scale-set-controller
- Terraform Registry: `kubernetes_secret` resource — https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform Registry: `aws_eks_node_group` resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- Amazon EKS: Simplify node lifecycle with managed node groups — https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Amazon EKS: Scale cluster compute with Karpenter and Cluster Autoscaler — https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html
- AWS CLI reference: `create-nodegroup` — https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html

## Issues Found
- The post created `githubConfigSecret` in `arc-systems`, but GitHub’s ARC docs require that secret to exist in the same namespace as the `gha-runner-scale-set` chart. I moved the secret to `arc-runners`.
- The secret example passed numeric GitHub App IDs directly. ARC examples and the chart documentation treat these values as strings. I wrapped `github_app_id` and `github_app_installation_id` with `tostring(...)`.
- Both Helm charts were pinned to `0.9.3`, which is no longer current as of April 30, 2026. I updated the examples to `0.14.1`, which is available in GitHub Container Registry.
- The runner template used a hand-written DinD setup with `DOCKER_HOST=tcp://localhost:2376` and a simplified sidecar that did not match GitHub’s supported ARC DinD configuration. I replaced that with `containerMode = { type = "dind" }`, which lets ARC inject the supported pod spec for the cluster’s Kubernetes version while still allowing runner-container overrides.
- The EKS node group example implied that a managed node group with `desired_size = 0` would automatically grow on demand by itself. In practice, that requires a node autoscaler; for the managed node group shown here, Cluster Autoscaler is the direct fit. I added that requirement and added `lifecycle.ignore_changes` for `desired_size` to avoid Terraform drift when an autoscaler adjusts the group.
- The RBAC section added a manual `cluster-admin` binding for a service account named `arc`. The ARC controller chart already creates the controller service account and required RBAC by default, and the example subject name did not match the chart’s generated default name. I replaced the example with the accurate default behavior.
- The best-practices section said ARC “scales up within seconds,” which is too specific and not guaranteed once node provisioning is involved. I changed that wording to “scales runners up on demand when jobs are queued.”
- The best-practices section recommended GitHub App auth as a blanket rule. GitHub’s docs note that enterprise-level runners cannot use GitHub App auth. I added that caveat and tightened the wording to repository- and organization-level runners.

## Review Notes
- The architecture description is directionally correct, but it is simplified relative to GitHub’s internal ARC component model.
- The runner example now relies on ARC’s supported DinD injection. If the post later needs custom limits or image overrides for the `dind` container itself, it should copy the full version-specific template from the ARC chart documentation rather than partially overriding it.
