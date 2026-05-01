# Validation Summary: How to Set Up ECS Service Connect with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS ECS
- ECS Service Connect
- AWS Cloud Map
- Terraform AWS provider
- HCL

## Sources Consulted
- Amazon ECS Service Connect overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html
- Amazon ECS Service Connect configuration overview: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts.html
- Amazon ECS Service Connect components: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts-deploy.html
- Amazon ECS `PortMapping` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html
- Terraform AWS provider `aws_ecs_service` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_service.html.markdown
- Terraform AWS provider `aws_ecs_cluster` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_cluster.html.markdown
- Terraform AWS provider `aws_service_discovery_http_namespace` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/service_discovery_http_namespace.html.markdown
- OpenTofu `init` command: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The "Client Service" example included a `service {}` block, which makes it a client-server Service Connect service and requires a matching named port mapping in the task definition. I removed that block so the example is a true client-only service, matching AWS's documented client-service configuration.
- The `payments` example said other services could call `http://payments` while its `client_alias.port` was `8080`. I corrected the comment to `http://payments:8080` so the documented endpoint matches the configured Service Connect alias port.

## Review Notes
- The post's use of an HTTP Cloud Map namespace ARN for `service_connect_defaults.namespace` matches the current Terraform AWS provider schema.
- The deployment commands `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` match current OpenTofu CLI usage.
- The `payments` task definition correctly names the port mapping for Service Connect. If protocol-specific HTTP telemetry is desired in CloudWatch and the ECS console, a future revision could add `appProtocol = "http"` to that port mapping.
