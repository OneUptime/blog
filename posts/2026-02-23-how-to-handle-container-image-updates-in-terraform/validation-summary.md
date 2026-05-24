# Validation Summary: How to Handle Container Image Updates in Terraform

## Status
validated

## Post Type
Tutorial / Strategy guide — walks through six concrete strategies for managing container image updates in Terraform-managed infrastructure (mostly AWS ECS, with a Kubernetes example).

## Technologies Covered
- Terraform (HCL)
- AWS ECS (Fargate launch type, task definitions, services)
- AWS ECR (image registry, image data source)
- AWS SSM Parameter Store
- AWS CloudWatch Logs (awslogs log driver)
- Kubernetes (kubernetes_deployment resource via Terraform Kubernetes provider)
- Docker image reference formats (tag and digest)

## Sources Consulted
- Terraform AWS provider — `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider — `aws_ecs_service` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider — `aws_ecr_image` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ecr_image
- Terraform AWS provider — `aws_ssm_parameter` resource/data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Kubernetes provider — `kubernetes_deployment` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS `ContainerDefinition` API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html
- Terraform lifecycle `ignore_changes` for nested sub-blocks documentation

## Issues Found
No technical issues found.

Verified items:
- `aws_ecs_task_definition` arguments (`family`, `requires_compatibilities`, `network_mode`, `cpu`, `memory`, `execution_role_arn`, `container_definitions`) are all valid.
- Fargate CPU/memory combinations used (256/512, 1024/2048) are valid AWS Fargate sizes.
- Container definition JSON keys (`name`, `image`, `portMappings`, `logConfiguration`, `essential`) are correct per the ECS API reference.
- `awslogs` driver options (`awslogs-group`, `awslogs-region`, `awslogs-stream-prefix`) are correct.
- `aws_ecr_image` data source supports `most_recent = true` and exposes `image_digest`.
- Docker image reference formats (`registry/repo:tag` and `registry/repo@sha256:digest`) are valid.
- `lifecycle { ignore_changes = [task_definition] }` on `aws_ecs_service` is the standard pattern when CI/CD manages task-definition updates.
- Nested `ignore_changes` syntax for the Kubernetes provider (`spec[0].template[0].spec[0].container[0].image`) is correct.
- `terraform apply -var="key=value"` CLI syntax is correct.

## Review Notes
- Strategy 5's conditional `var.app_image_tag != "" ? ... : ...` implies `app_image_tag` has a default of `""`, which would conflict with the default `"v1.0.0"` declared in Strategy 1. Each strategy is presented as a standalone snippet, so readers are expected to adapt the variable definition. Not a technical error, just a thing to be aware of when combining strategies.
- In Strategy 5, the `aws_ssm_parameter` resource with `ignore_changes = [value]` is created with `var.app_image_tag` as the initial value, then read back via a data source. The pattern works (it lets external systems update the SSM value out-of-band), but it requires an initial non-empty value or the resource creation will fail validation in SSM.
- Strategy 3 uses `repository_name = "myapp"` (hardcoded) for the data source while referencing `aws_ecr_repository.app.repository_url` for the registry URL. Readers should ensure these refer to the same repository. Cosmetic, not a correctness issue.
- The post does not mention that `aws_ecr_image`'s `most_recent` argument requires a relatively recent AWS provider version (added in v5.46.0, April 2024). Most current users will already be on a compatible version, but worth noting for anyone pinned to older providers.
