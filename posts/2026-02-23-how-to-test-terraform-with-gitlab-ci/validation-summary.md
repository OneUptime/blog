# Validation Summary: How to Test Terraform with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform native tests
- GitLab CI/CD
- GitLab-managed Terraform/OpenTofu state backend
- TFLint
- Trivy
- Conftest / Open Policy Agent
- Go / Terratest

## Sources Consulted
- Terraform `test` command reference: https://developer.hashicorp.com/terraform/cli/commands/test
- Terraform test language documentation: https://developer.hashicorp.com/terraform/language/tests
- Terraform HTTP backend documentation: https://developer.hashicorp.com/terraform/language/backend/http
- Terraform CLI commands documentation: https://developer.hashicorp.com/terraform/cli/commands
- GitLab-managed Terraform/OpenTofu state documentation: https://docs.gitlab.com/user/infrastructure/iac/terraform_state/
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ee/ci/yaml/
- GitLab CI/CD artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab downstream pipelines documentation: https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Terraform template deprecation/removal notice: https://docs.gitlab.com/update/deprecations/
- TFLint official repository usage documentation: https://github.com/terraform-linters/tflint
- Trivy configuration documentation: https://trivy.dev/docs/latest/guide/references/configuration/config-file/
- Conftest options documentation: https://www.conftest.dev/options/

## Issues Found
- The post described GitLab CI as having official Terraform CI/CD templates. GitLab deprecated and removed the Terraform templates in GitLab 18.0, so the introduction now describes the currently supported GitLab infrastructure features and says the pipeline is built from scratch.
- The Terraform examples pinned Terraform 1.7.0, while the post relies on current `terraform test` JUnit support. Updated the examples to Terraform 1.14.6.
- The unit test job declared a JUnit artifact but did not generate the XML file. Updated the job to run `terraform test -verbose -junit-xml=test-results.xml`.
- The custom Bash JUnit conversion script parsed human-readable Terraform output with brittle `grep`/`awk` logic and did not match Terraform's current supported reporting path. Replaced it with the native `terraform test -junit-xml` command.
- The plan job attempted to set `AWS_ROLE_ARN: $AWS_${ENVIRONMENT}_ROLE_ARN`, which is not a reliable GitLab CI/CD variable expansion pattern for dynamic variable names. Replaced it with guidance to use GitLab environment-scoped CI/CD variables.
- The integration test job used `wget` without installing it in the Go image setup. Added `wget` to the package install command.
- The GitLab HTTP backend example used `TF_ADDRESS`, which is used by GitLab helper tooling but is not the environment variable Terraform's HTTP backend reads directly. Replaced it with `TF_HTTP_ADDRESS` and the matching lock/unlock variables and methods.

## Review Notes
- The plan artifacts include `tfplan`, `plan.txt`, and `plan.json`; Terraform plan files and JSON plan output can contain sensitive values, so projects should restrict artifact access and avoid public pipelines.
- The snippets assume module and environment directory names match the matrix values. Projects with different layouts must adjust those values.
