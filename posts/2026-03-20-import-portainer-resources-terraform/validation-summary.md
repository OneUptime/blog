# Validation Summary: How to Import Existing Portainer Resources into Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer API
- Terraform
- Terraform CLI
- Bash
- `jq`

## Sources Consulted
- Portainer Terraform provider README: https://github.com/portainer/terraform-provider-portainer/blob/main/README.md
- Portainer Terraform provider `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Portainer Terraform provider `portainer_user` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/user.md
- Portainer Terraform provider `portainer_team` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/team.md
- Portainer Terraform provider `portainer_stack` implementation, including import ID parsing: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_stack.go
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer environment API documentation: https://docs.portainer.io/admin/environments/add/api
- Terraform `import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import workflow overview: https://developer.hashicorp.com/terraform/cli/import

## Issues Found
- The API examples authenticated with `Authorization: Bearer ${API_TOKEN}` even though Portainer's access-token documentation uses the `X-API-Key` header for API keys. I changed the examples to use `X-API-Key: ${PORTAINER_API_KEY}` so they match the documented access-token flow.
- The environment examples used an invalid Terraform argument, `url`, and omitted required `portainer_environment` arguments. I replaced `url` with `environment_address` and added the required `environment_address` and `type` fields in the import examples and the post-import sync example.
- The stack import example used the wrong import ID format and incomplete resource configuration. I updated the resource block to include the required `deployment_type` and `method` arguments and corrected the import command to the provider's current format: `endpointId-stackId-deploymentType-method`.
- The teams example was inside a `bash` code block but contained raw HCL without a shell wrapper, so it was not valid shell. I changed it to the same `cat << 'EOF'` pattern used elsewhere in the post.
- The bulk import script used the wrong auth header, generated incomplete `portainer_environment` resources, and handled shell values unsafely. I updated it to use `X-API-Key`, emit valid `environment_address` and `type` arguments, quote values correctly, and sanitize generated Terraform resource names.
- The post description and prerequisites understated what is needed for import. I corrected them to reflect that importing these resources requires both IDs and the current resource settings needed to build valid Terraform configuration.

## Review Notes
- Portainer supports JWT bearer authentication for some API workflows, but the post now uses API-key examples because that matches the current Portainer API access documentation and the Terraform provider's recommended authentication flow.
- The stack import ID format was verified from the provider's implementation because the current published resource docs do not spell out that composite ID format explicitly.
