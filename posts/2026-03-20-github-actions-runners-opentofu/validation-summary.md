# Validation Summary: How to Deploy GitHub Actions Self-Hosted Runners with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform configuration language
- GitHub Actions self-hosted runners
- Actions Runner Controller (ARC)
- Kubernetes
- Helm
- AWS EC2
- AWS Auto Scaling

## Sources Consulted
- GitHub Docs: Private networking with GitHub-hosted runners — https://docs.github.com/en/actions/concepts/runners/private-networking-with-github-hosted-runners
- GitHub Docs: Deploying runner scale sets with Actions Runner Controller — https://docs.github.com/en/enterprise-cloud@latest/actions/how-tos/manage-runners/use-actions-runner-controller/deploy-runner-scale-sets
- GitHub Docs: Authenticating ARC to the GitHub API — https://docs.github.com/en/enterprise-cloud%40latest/actions/tutorials/use-actions-runner-controller/authenticate-to-the-api
- GitHub Docs: Self-hosted runners reference — https://docs.github.com/en/actions/reference/runners/self-hosted-runners
- GitHub Docs: Configuring the self-hosted runner application as a service — https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application
- GitHub Docs: REST API endpoints for self-hosted runners — https://docs.github.com/en/rest/actions/self-hosted-runners
- HashiCorp Developer: Manage Kubernetes resources with Terraform — https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Terraform Registry: `helm_release` resource — https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Terraform Registry: `kubernetes_secret` resource — https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret.html
- GitHub Releases: `actions/actions-runner-controller` — https://github.com/actions/actions-runner-controller/releases

## Issues Found
- The introduction overstated GitHub-hosted runner limitations. GitHub-hosted runners can be connected to private networks with supported networking patterns, and GitHub also offers larger hosted runners. I corrected the wording so it frames self-hosted runners as a control and cost tradeoff instead of a hard capability gap.
- The ARC/OpenTofu example configured only the Helm provider, but the snippet also creates `kubernetes_namespace` and `kubernetes_secret` resources. I added a matching `provider "kubernetes"` block so the example is complete and consistent.
- The ARC chart versions were pinned to `0.9.3`, while the current `gha-runner-scale-set` and `gha-runner-scale-set-controller` release line is newer. I updated both chart versions to `0.14.1` to align the snippet with the current release as of 2026-04-30.
- The EC2 example used a static `runner_registration_token` variable. GitHub registration tokens expire after one hour, so that pattern breaks for instances launched later by the Auto Scaling Group. I changed the bootstrap script to request a fresh registration token at instance boot with the self-hosted runners REST API.
- The best-practices section said ARC makes "instances" scale to zero. ARC scales runner pods, not Kubernetes worker nodes by itself, so I corrected that wording.
- The EC2 section and best-practices wording could imply that an Auto Scaling Group alone tracks GitHub job demand. I clarified that queue-driven EC2 scaling still needs scaling policies or webhook-driven automation.
- The final best-practice bullet recommended rotating registration tokens in OpenTofu configuration. I replaced that guidance with the correct recommendation to generate registration tokens just in time during provisioning, because GitHub registration tokens are short-lived.

## Review Notes
- The EC2 example now uses a PAT-based bootstrap flow for brevity, but GitHub Apps remain the better production choice for authenticating the provisioning flow.
- The EC2 snippet is x64-specific. If the instance type is ARM-based, the runner download URL and labels must be updated to match the target architecture.
- The Terraform provider version constraints in the post are still valid, but they are pinned to older provider minors and may need refreshes over time.
