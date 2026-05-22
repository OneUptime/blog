# Validation Summary: How to Optimize Terraform Module Downloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform modules
- Terraform CLI
- Terraform Registry and private registries
- Git module sources
- S3 and GCS module sources
- GitHub Actions caching
- GitLab CI caching

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform module source configuration: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform Registry API documentation: https://developer.hashicorp.com/terraform/registry/api-docs
- HCP Terraform private registry overview: https://docs.hashicorp.com/terraform/cloud-docs/registry
- GitHub Actions dependency caching documentation: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows
- GitLab CI/CD caching documentation: https://docs.gitlab.com/ci/caching/

## Issues Found
- The post claimed every `terraform init` downloads all referenced modules. Terraform only retrieves newly added modules when modules are already installed, unless `-upgrade` is used. Updated the introduction to distinguish fresh working directories from repeat init runs.
- The exact-version section claimed Terraform can skip version resolution and go straight to download or cache lookup. Official docs describe version constraints as selecting the newest installed or downloadable version that matches. Reworded this section to emphasize predictability and repeatable CI behavior rather than a guaranteed skipped resolution step.
- The private registry section implied private registries remove all external downloads and are always faster inside a cloud provider network. Reworded this to say they avoid public sources and can be faster when close to CI runners.
- The Git shallow clone section incorrectly stated Terraform does not natively support shallow clones. Current Terraform supports the `depth` query parameter for Git, GitHub, and Bitbucket module sources. Replaced the workaround-first guidance with a native `depth=1` example and noted the named branch or tag requirement when using `depth`.
- The vendoring examples assumed the `vendor` directory already existed. Added `mkdir -p vendor` before copying modules.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against the official Terraform command documentation rather than local `terraform --help` output.
