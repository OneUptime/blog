# Validation Summary: How to Use AWS Proton for Platform Engineering Templates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Proton
- AWS CloudFormation
- AWS CLI
- Amazon ECS on AWS Fargate
- Application Load Balancer
- Amazon VPC
- AWS IAM
- Amazon CloudWatch Logs

## Sources Consulted
- AWS Proton User Guide: Schema file - https://docs.aws.amazon.com/proton/latest/userguide/ag-schema.html
- AWS Proton User Guide: AWS Proton parameters - https://docs.aws.amazon.com/proton/latest/userguide/parameters.html
- AWS Proton User Guide: CloudFormation IaC files - https://docs.aws.amazon.com/proton/latest/userguide/ag-infrastructure-tmp-files-cloudformation.html
- AWS Proton User Guide: Wrap up template files for AWS Proton - https://docs.aws.amazon.com/proton/latest/userguide/ag-wrap-up.html
- AWS Proton User Guide: Register and publish templates - https://docs.aws.amazon.com/proton/latest/userguide/template-create.html
- AWS Proton User Guide: Create an environment - https://docs.aws.amazon.com/proton/latest/userguide/ag-create-env.html
- AWS Proton User Guide: Create a service - https://docs.aws.amazon.com/proton/latest/userguide/ag-create-svc.html
- AWS CLI Command Reference: create-environment-template-version - https://docs.aws.amazon.com/cli/latest/reference/proton/create-environment-template-version.html
- AWS CLI Command Reference: create-service-template-version - https://docs.aws.amazon.com/cli/latest/reference/proton/create-service-template-version.html
- AWS CLI Command Reference: create-environment - https://docs.aws.amazon.com/cli/latest/reference/proton/create-environment.html
- AWS CLI Command Reference: create-service - https://docs.aws.amazon.com/cli/latest/reference/proton/create-service.html
- AWS CLI Command Reference: update-environment - https://docs.aws.amazon.com/cli/latest/reference/proton/update-environment.html

## Issues Found
- The original post did not mention AWS Proton's announced end of support date. Added a short note that AWS Proton support ends on October 7, 2026 and that existing deployed infrastructure remains intact.
- The environment template used CloudFormation `Parameters` for values that should be supplied through Proton Jinja namespaces. Updated the environment CloudFormation example to use `{{ environment.inputs.vpc_cidr }}` and `{{ environment.name }}`.
- The environment bundle directory example omitted the required `schema` directory. Added `mkdir -p env-template/v1/schema`.
- The environment example described public shared infrastructure but omitted internet gateway, route table associations, ALB listener, and ALB security group resources. Added those resources and relevant outputs so the later service template can attach to the shared ALB.
- The template version registration commands tried to pass `--major-version "1"` for the first template versions. Removed that flag for initial version creation and added `update-environment-template-version` and `update-service-template-version` commands to publish minor version `1.0` before use.
- The service template bundle was incomplete because it omitted the required service schema and `instance_infrastructure/manifest.yaml`. Added both snippets and the service bundle directory creation commands.
- The service CloudFormation snippet used CloudFormation `Parameters` with names that did not match the Proton service spec. Replaced them with `{{ service_instance.inputs.* }}` and Proton resource parameters.
- The service claimed to deploy with a load balancer but did not define target group, listener rule, ECS service load balancer attachment, security group, task execution role, or log group. Added those resources to make the example consistent with the claim.
- The environment and service create commands used JSON strings for `--spec`. AWS documents Proton specs as YAML-formatted strings or files with `proton: EnvironmentSpec` and `proton: ServiceSpec`; changed the examples to create YAML spec files and pass them with `file://`.
- The final developer-facing explanation said developers only need image, port, and desired capacity. Updated it to include routing settings, because the corrected ALB listener rule requires a path pattern and listener priority.

## Review Notes
The examples are now aligned with AWS Proton's documented bundle structure and Jinja parameter model. In a production platform template, listener rule priority allocation, IAM scoping, health checks, HTTPS listeners, private subnet/NAT design, and service discovery should be handled more robustly than this compact tutorial example.
