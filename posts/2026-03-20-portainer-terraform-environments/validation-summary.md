# Validation Summary: How to Manage Portainer Environments with Terraform - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Terraform
- Docker
- Docker Swarm
- Kubernetes

## Sources Consulted
- Portainer Terraform provider README: https://github.com/portainer/terraform-provider-portainer/blob/main/README.md
- Portainer Terraform provider `portainer_environment` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/environment.md
- Portainer Terraform provider `portainer_endpoint_group` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/endpoint_group.md
- Portainer Terraform provider `portainer_tag` resource docs: https://github.com/portainer/terraform-provider-portainer/blob/main/docs/resources/tag.md
- Portainer Terraform provider source for environment schema and access policies: https://github.com/portainer/terraform-provider-portainer/blob/main/internal/resource_environment.go
- Portainer docs, add an environment via the API: https://docs.portainer.io/admin/environments/add/api
- Portainer docs, add a Kubernetes environment: https://docs.portainer.io/admin/environments/add
- Portainer docs, install Portainer Agent on Kubernetes: https://docs.portainer.io/admin/environments/add/kubernetes/agent
- Portainer docs, import an existing Kubernetes environment: https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer docs, roles: https://docs.portainer.io/sts/admin/user/roles
- Portainer source for built-in role IDs: https://github.com/portainer/portainer/blob/develop/api/datastore/migrator/migrate_dbversion20.go
- HashiCorp Terraform CLI docs for `plan`: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform CLI docs for `apply`: https://developer.hashicorp.com/terraform/cli/commands/apply

## Issues Found
- The post used unsupported `portainer_environment` arguments: `environment_url`, `environment_type`, and `tls`. I replaced them with the provider's current supported arguments: `environment_address`, `type`, and `tls_enabled`.
- The Kubernetes kubeconfig example used an unsupported `kubernetes_configuration` block and omitted the required environment address. I replaced it with Kubernetes-via-Agent examples that match the provider's supported schema.
- The staging Kubernetes agent example used `https://...:9001`. I changed it to a Terraform-provider-compatible `environment_address` example and aligned it with Portainer's documented Kubernetes agent ports.
- The post referenced a nonexistent `portainer_environment_team_access` resource. I replaced that section with the supported `team_access_policies` configuration on `portainer_environment`.
- The access-policy section used incorrect role assumptions. I updated the example to use Portainer's built-in role IDs for Environment administrator (`1`) and Standard User (`3`), based on Portainer source.
- The outputs referenced `portainer_environment.staging`, which was never defined. I corrected the output to `portainer_environment.k8s_staging.id`.
- The article claimed to cover Edge and "all types" of Portainer environments, but the actual content did not. I narrowed the description and introduction to Docker, Swarm, and Kubernetes, which matches the corrected content.
- Step 5 used `terraform.tfvars` while Step 8 used `prod.tfvars`. I aligned the commands with the shown `terraform.tfvars` workflow by using plain `terraform plan` and `terraform apply`.

## Review Notes
- Portainer's UI documentation says agent-based environment addresses are entered without a protocol, while the official Terraform provider documentation models agent addresses as `tcp://host:9001`. Because this post is specifically about Terraform provider usage, the examples were aligned to the provider documentation and source.
- Portainer's kubeconfig import flow is documented in the UI and is Business Edition only, but the Terraform provider documentation and resource schema do not expose kubeconfig upload fields for `portainer_environment`.
- Terraform was not installed in the local review environment, so CLI commands were verified against HashiCorp's official documentation rather than executed locally.
