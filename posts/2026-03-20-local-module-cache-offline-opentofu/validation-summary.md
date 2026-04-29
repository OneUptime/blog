# Validation Summary: How to Create a Local Module Cache for Offline OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu module sources and `tofu init`
- OpenTofu CLI configuration and provider cache
- Git
- GitLab Terraform Module Registry
- Gitea Git hosting
- HCL
- Bash

## Sources Consulted
- OpenTofu module sources documentation: https://opentofu.org/docs/v1.11/language/modules/sources/
- OpenTofu initialization documentation: https://opentofu.org/docs/cli/init/
- OpenTofu `tofu init` command documentation: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu CLI configuration file documentation: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu module registry protocol documentation: https://opentofu.org/docs/internals/module-registry-protocol/
- GitLab Terraform Module Registry documentation: https://docs.gitlab.com/user/packages/terraform_module_registry/
- Gitea Terraform State Registry documentation: https://docs.gitea.com/usage/packages/terraform
- Gitea packages overview: https://docs.gitea.com/usage/packages/overview
- Upstream module repository used in examples: https://github.com/terraform-aws-modules/terraform-aws-vpc

## Issues Found
- The download example wrote `/tmp/module-download/main.tf` without first creating `/tmp/module-download`. I added `mkdir -p /tmp/module-download` so the command sequence works as written.
- The first cache copy command copied `.terraform/modules` as a nested directory into `/tmp/module-cache/`, which did not match the later reuse pattern. I changed it to copy the directory contents instead.
- The post described an absolute module source path as a local path. OpenTofu documents that only `./` and `../` are local paths; absolute paths are treated more like packages and copied into `.terraform/modules/`. I updated the heading and inline note to match documented behavior.
- The Git mirror section created only a bare mirror at `/opt/git-mirror/terraform-aws-vpc.git` but then referenced `/opt/git-mirror/terraform-aws-vpc` as if a working tree existed. I added an explicit non-bare clone example and updated the path-based module source accordingly.
- The provider cache example set `TF_PLUGIN_CACHE_DIR` without creating the target directory. OpenTofu documents that the plugin cache directory must already exist, so I added `mkdir -p /opt/opentofu/provider-cache`.
- The `tofu init -get=false` explanation was too broad. OpenTofu documents this flag as appropriate only when child modules are already installed, so I clarified that the copied `.terraform/modules` tree must already match the working directory.
- The Gitea section called Gitea an internal module registry, but the example actually uses Gitea as Git hosting. Gitea documents Terraform state registry support, not a Terraform module registry in the form used here, so I renamed the section and comments accordingly.
- The Gitea push example used `git push internal main`, but the upstream example repository currently uses `master` as its default branch. I changed this to `git push internal HEAD` so the example is branch-agnostic.
- The introduction said these module sources require internet access. I narrowed that to network access to the source location, which is the accurate requirement.

## Review Notes
- `tofu` was not installed in the local workspace, so CLI behavior was validated against official OpenTofu documentation rather than direct command execution.
- OpenTofu has first-class documented support for provider caching, but shared module reuse is still centered on the working directory's `.terraform/modules` data rather than a separately documented global module cache feature.
