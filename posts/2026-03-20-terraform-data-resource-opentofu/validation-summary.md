# Validation Summary: How to Use the terraform_data Resource in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- OpenTofu HCL configuration
- `terraform_data` managed resource
- `triggers_replace` and `replace_triggered_by`
- OpenTofu provisioners and `local-exec`
- AWS provider resources (`aws_instance`, `aws_db_instance`, `aws_ecs_task_definition`, `aws_ssm_parameter`)
- AWS CLI, kubectl, Helm, and PostgreSQL `psql`

## Sources Consulted
- OpenTofu documentation: The `terraform_data` Managed Resource Type - https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu documentation: Resource Behavior and `replace_triggered_by` - https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu documentation: Provisioners Without a Resource - https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu documentation: Provisioners - https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu documentation: `local-exec` Provisioner - https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu documentation: `timestamp` Function - https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu documentation: `sha256` Function - https://opentofu.org/docs/language/functions/sha256/
- OpenTofu documentation: `filesha256` Function - https://opentofu.org/docs/language/functions/filesha256/
- HashiCorp AWS Provider source documentation: `aws_instance` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS Provider source documentation: `aws_db_instance` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS Provider source documentation: `aws_ecs_task_definition` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- HashiCorp AWS Provider source documentation: `aws_ssm_parameter` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ssm_parameter.html.markdown
- AWS CLI Command Reference: `aws eks update-kubeconfig` - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Kubernetes kubectl Reference: `kubectl apply` - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#apply
- Helm documentation: `helm upgrade` - https://helm.sh/docs/helm/helm_upgrade/
- PostgreSQL documentation: `psql` - https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL documentation: libpq environment variables - https://www.postgresql.org/docs/current/libpq-envars.html

## Issues Found
- The basic `terraform_data` example used `timestamp()` in `input`. OpenTofu documents that `timestamp()` changes every run and causes diffs when used directly in resource attributes, so this would make a simple state-tracking example update on every apply. Changed it to store `environment = var.environment` instead.
- The deployment tracker used `deployed_at = timestamp()` while also using `replace_triggered_by = [terraform_data.deployment_tracker]`. That would cause the ECS task definition to be replaced on every run, not only when deployment inputs change. Changed it to `deployment_id = var.deployment_id`, so replacement is tied to an explicit deployment value.
- The metadata example used `created_at = timestamp()`, which would update the `terraform_data` resource on every run despite the section being about reading stored output values. Changed it to `environment = var.environment`.

## Review Notes
- The remaining `triggers_replace = timestamp()` example is intentional and labeled as "Always replace"; that use matches the documented behavior.
- Provisioner usage is technically valid, but OpenTofu recommends provisioners as a last resort.
- `PGPASSWORD` works as a libpq environment variable, but PostgreSQL documents security caveats because environment variables can be visible to other users on some systems.
- The snippets are partial examples and depend on surrounding provider configuration, variables, data sources, and resources. Local `tofu validate` could not be run because neither `tofu` nor `terraform` is installed in this environment.
