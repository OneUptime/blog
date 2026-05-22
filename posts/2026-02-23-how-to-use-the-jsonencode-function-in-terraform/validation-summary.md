# Validation Summary: How to Use the jsonencode Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform `jsonencode` and `jsondecode`
- AWS IAM policies
- Amazon API Gateway REST API integrations
- Kubernetes Service annotations
- AWS Lambda environment variables
- Amazon EventBridge / CloudWatch Events rules and targets
- AWS Step Functions state machines

## Sources Consulted
- Terraform `jsonencode` function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.6/guide/service/annotations/
- Amazon EventBridge input transformation documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html
- Amazon API Gateway Lambda proxy and non-proxy integration documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started-with-lambda-integration.html
- Amazon API Gateway Lambda proxy integration documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Terraform AWS provider `aws_api_gateway_integration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Terraform AWS provider `aws_cloudwatch_event_target` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform Kubernetes provider `kubernetes_service` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- Terraform AWS provider `aws_sfn_state_machine` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sfn_state_machine

## Issues Found
- The Terraform-to-JSON type mapping omitted `set(...)`, which `jsonencode` maps to a JSON array. Updated the table to include sets.
- The API Gateway request template example used `type = "AWS_PROXY"` with `request_templates`. Lambda proxy integrations pass the request through using proxy event semantics, while mapping templates are for non-proxy/custom or mock integrations. Updated the example to use a `MOCK` integration for the static request template shown.
- The Kubernetes annotation example encoded `service.beta.kubernetes.io/aws-load-balancer-attributes` as JSON, but AWS Load Balancer Controller documents that annotation as a `stringMap` such as `load_balancing.cross_zone.enabled=true`. Updated the example to use the documented string-map format and kept `jsonencode` only for a generic annotation whose consumer expects JSON.
- The EventBridge `input_template` example used `jsonencode` around `<instance>` placeholders. Terraform escapes `<` and `>` as Unicode sequences in JSON strings, but EventBridge input transformers require placeholders in `<variable-name>` form. Replaced that template with a heredoc so placeholders remain intact.

## Review Notes
Terraform was not installed in the local workspace, so I could not run `terraform fmt` or `terraform validate`. The review was completed through static inspection and official documentation cross-checks.
