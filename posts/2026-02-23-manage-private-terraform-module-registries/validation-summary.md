# Validation Summary: How to Manage Private Terraform Module Registries

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform modules and module sources
- HCP Terraform private registry
- GitHub Actions
- GitLab Terraform Module Registry
- JFrog Artifactory Terraform repositories
- Terraform Module Registry Protocol

## Sources Consulted
- HashiCorp Developer: Publish private modules to the HCP Terraform private registry - https://developer.hashicorp.com/terraform/cloud-docs/registry/publish-modules
- HashiCorp Developer: Use artifacts from the HCP Terraform private registry - https://developer.hashicorp.com/terraform/cloud-docs/registry/using
- HashiCorp Developer: Find and use modules - https://developer.hashicorp.com/terraform/registry/modules/use
- HashiCorp Developer: Module Registry Protocol Reference - https://developer.hashicorp.com/terraform/internals/module-registry-protocol
- GitLab Docs: Terraform Module Registry - https://docs.gitlab.com/user/packages/terraform_module_registry/
- JFrog Docs: Terraform/OpenTofu and Terraform Backend Repositories - https://docs.jfrog.com/artifactory/docs/terraform-opentofu-and-terraform-backend-repositories
- JFrog Docs: Publish Terraform Modules with JFrog CLI - https://docs.jfrog.com/artifactory/docs/jf-terraform
- GitHub Docs: Workflow syntax for GitHub Actions permissions - https://docs.github.com/en/actions/reference/github_token-reference

## Issues Found
- The post stated that HCP Terraform private registry repositories must follow `terraform-<PROVIDER>-<NAME>`. Current HCP Terraform publishing docs let users specify the module name and provider during publishing, so I changed this to a recommended compatibility convention rather than a hard requirement.
- The GitHub Actions release workflow omitted `permissions: contents: write`, which is required when the workflow token creates a GitHub release in repositories using restricted token defaults. I added the permission to the release job.
- The GitLab section implied that pushing tags alone automatically makes modules available and said full registry features require Premium or Ultimate. GitLab's docs list the Terraform Module Registry as available on Free, Premium, and Ultimate tiers, and publishing is done through the package API or GitLab CI/CD template. I updated the setup and cons accordingly.
- The Artifactory section showed a `.terraformrc` provider installation snippet and manual tarball upload path that do not match JFrog's documented Terraform module publishing workflow. I replaced them with `jf config add`, `jf terraform-config`, and `jf tf p` examples.
- The self-hosted registry protocol endpoint placeholders used `{provider}`. The official module registry protocol uses `{system}` for this path segment, so I updated the endpoint examples.
- The naming convention section said `terraform-<PROVIDER>-<NAME>` is required for Terraform Cloud's private registry. I changed this to say it is required by the public Terraform Registry and is a widely followed private repository convention.

## Review Notes
The remaining examples are technically plausible. For future maintenance, consider pinning GitHub Actions to current major versions, because third-party action runtimes and recommended versions change over time.
