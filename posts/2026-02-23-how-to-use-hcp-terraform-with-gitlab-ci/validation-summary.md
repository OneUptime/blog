# Validation Summary: How to Use HCP Terraform with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- HCP Terraform / Terraform Cloud CLI-driven workflow
- GitLab CI/CD
- GitLab merge request notes API
- YAML CI configuration

## Sources Consulted
- Terraform CLI configuration file and credentials: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform `cloud` block and workspace selection: https://developer.hashicorp.com/terraform/language/terraform
- Terraform CLI commands (`init`, `fmt`, `validate`, `plan`, `apply`): https://developer.hashicorp.com/terraform/cli/commands
- HCP Terraform runs and remote operations: https://developer.hashicorp.com/terraform/cloud-docs/run
- GitLab CI/CD YAML syntax and `default`: https://docs.gitlab.com/ci/yaml/
- GitLab CI/CD variables, protected variables, and masked variables: https://docs.gitlab.com/ci/variables/
- GitLab `resource_group`: https://docs.gitlab.com/ci/resource_groups/
- GitLab merge request notes API: https://docs.gitlab.com/api/notes/
- GitLab Terraform template deprecation/removal guidance: https://docs.gitlab.com/user/infrastructure/iac/

## Issues Found
- The original token setup instructed readers to both mask and protect `TF_API_TOKEN`. Protected GitLab variables are only exposed to protected refs and protected merge request pipelines, so this would break ordinary merge request plan jobs from unprotected branches. Updated the instruction to protect the variable only when the jobs that need it run on protected branches, protected tags, or protected merge request pipelines.
- The basic and advanced `terraform plan | tee ...` examples could hide a failing Terraform exit code because a pipeline normally returns the exit status of the final command. Updated the examples to capture the Terraform exit code explicitly, print the saved plan output, and exit with the captured status.
- The advanced merge request comment job wrote the plan output to `/tmp/plan_output.txt` but declared `$TF_DIR/plan_output.txt` as the artifact path. Updated the job to write `plan_output.txt` inside `$TF_DIR`, matching the artifact path.
- The multi-environment example used `TF_WORKSPACE` while the earlier Terraform example hard-coded `workspaces.name`. In HCP Terraform, `TF_WORKSPACE` cannot override a fixed `cloud.workspaces.name`. Added the required caveat that the `cloud` block must omit a fixed workspace name or use workspace tags that match the selected workspaces.
- The GitLab Terraform template example referenced the older `Terraform.gitlab-ci.yml` template as a base for HCP Terraform. GitLab's Terraform templates were deprecated before GitLab 18.0 and are not the right current recommendation for HCP Terraform state. Replaced the snippet with a custom GitLab CI job using Terraform CLI credentials for HCP Terraform.
- The examples used deprecated top-level GitLab CI keywords such as `image`, `cache`, and `before_script`. Moved those settings under `default` to match current GitLab CI/CD YAML guidance.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was checked against official Terraform CLI documentation rather than local `terraform --help` output. The post still uses Terraform image version `1.7.0`; that version is valid for the shown syntax, but teams should pin to a currently supported Terraform release when adopting the pipeline.
