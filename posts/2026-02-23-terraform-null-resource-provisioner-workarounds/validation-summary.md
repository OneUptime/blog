# Validation Summary: How to Use the null_resource for Provisioner Workarounds in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp null provider
- Terraform provisioners
- terraform_data
- AWS CLI
- Kubernetes kubectl
- Docker CLI
- PostgreSQL psql
- Ansible

## Sources Consulted
- HashiCorp null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource.html
- HashiCorp null provider `terraform_data` migration guide: https://registry.terraform.io/providers/hashicorp/null/latest/docs/guides/terraform-migration
- Terraform `terraform_data` resource reference: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- Terraform `depends_on` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform `fileset` function reference: https://developer.hashicorp.com/terraform/language/functions/fileset
- Terraform `filemd5` function reference: https://developer.hashicorp.com/terraform/language/functions/filemd5
- AWS provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS CLI CloudFront `create-invalidation` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-invalidation.html
- Docker CLI `docker login` command reference: https://docs.docker.com/reference/cli/docker/login/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The `depends_on` section incorrectly implied that `null_resource` does not have natural dependencies and often needs `depends_on`. Terraform infers dependencies from references in `triggers` and provisioner configuration, so the section was updated to explain that `depends_on` is only needed for behavior or side effects Terraform cannot infer.
- The ECS smoke-test example said `depends_on` made sure the service was fully deployed before testing. The AWS provider requires `wait_for_steady_state = true` for Terraform to wait for ECS service steady state, so that argument was added and the comment was updated.
- The destroy-time provisioner note said `null_resource` destroy provisioners can only access `self.triggers`. Terraform allows references to attributes of the related resource via `self`, plus `count.index` or `each.key` where applicable, so the note was corrected while preserving the guidance to store destroy-time values in `triggers`.
- The limitations section described `null_resource` as deprecated. HashiCorp documentation recommends `terraform_data` on Terraform 1.4 and later but does not present the null provider resource as formally deprecated, so the wording was changed to "Prefer terraform_data for new configurations."

## Review Notes
Terraform was not installed in the local environment, so the HCL snippets were reviewed manually against official documentation rather than validated with `terraform validate`. The post remains accurate as a workaround guide, but future updates could mention that provisioners should be a last resort and that purpose-built providers are preferred where available.
