# Validation Summary: How to Use Terraform with Codefresh for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Codefresh CI/CD pipelines
- Codefresh approval steps
- Codefresh custom step types
- Codefresh pipeline variables and `cf_export`
- Argo CD CLI
- GitOps deployment workflows
- AWS credentials and Terraform remote backend configuration

## Sources Consulted
- Codefresh pipeline steps documentation: https://codefresh.io/docs/docs/pipelines/steps/
- Codefresh approval step documentation: https://codefresh.io/docs/docs/pipelines/steps/approval/
- Codefresh pipeline variables and `cf_export` documentation: https://codefresh.io/docs/docs/pipelines/variables/
- Codefresh conditional execution documentation: https://stg.codefresh.io/docs/docs/pipelines/conditional-execution-of-steps/
- Codefresh CLI pipeline spec examples: https://codefresh-io.github.io/cli/pipelines/spec/
- Codefresh shared volume documentation: https://codefresh.io/docs/docs/example-catalog/ci-examples/shared-volumes-between-builds/
- Codefresh pipeline settings documentation: https://codefresh.io/docs/docs/pipelines/configuration/pipeline-settings/
- Terraform `init` command documentation: https://developer.hashicorp.com/terraform/cli/init
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform `workspace select` command documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Argo CD `argocd app sync` command documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/

## Issues Found
- Codefresh approval steps discard the shared volume by default, which would make saved Terraform plan files unavailable after approval. Added notes in the basic and multi-environment sections, and updated best practices to require shared volume retention when applying a saved plan after an approval step.
- The multi-environment example reinitialized Terraform with different backend keys in the same working directory without explicitly accepting backend reconfiguration. Changed the staging and production `terraform init` commands to use `-reconfigure`.
- The GitOps example used an undocumented `gitops-sync` step type with arguments that could not be verified in the official Codefresh step documentation. Replaced it with documented Argo CD CLI commands: `argocd login`, `argocd app sync`, and `argocd app wait --sync --health --timeout`.
- The custom Codefresh step type was named `terraform` without an account namespace, while Codefresh custom step metadata examples use `<account_name>/<step_name>` and typed step usage should include the custom step name and version. Updated the example to `my-account/terraform` and used `my-account/terraform:1.0.0`.
- The file-change trigger example ran Git commands and Terraform commands without setting the working directory to the cloned repository and Terraform directory. Added `working_directory: '${{clone}}'` to the change check and `working_directory: '${{clone}}/terraform'` to the Terraform plan step.
- The conditional execution example compared the exported value as an unquoted boolean. Updated it to the documented expression style by comparing the exported string value to `'true'`.

## Review Notes
The Terraform CLI commands and flags used in the examples are current and valid. The examples assume the referenced Codefresh variables, AWS backend configuration, Argo CD credentials, and Terraform output names are defined by the reader's environment.
