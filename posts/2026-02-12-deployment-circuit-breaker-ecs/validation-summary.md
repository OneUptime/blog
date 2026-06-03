# Validation Summary: How to Configure Deployment Circuit Breaker in ECS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- ECS deployment circuit breaker
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider
- Amazon EventBridge
- Amazon SNS
- Elastic Load Balancing health checks
- Amazon ECS container health checks
- AWS Cloud Map health checks

## Sources Consulted
- Amazon ECS Developer Guide: How the Amazon ECS deployment circuit breaker detects failures - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Amazon ECS Developer Guide: Amazon ECS service deployment state change events - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_service_deployment_events.html
- Amazon ECS Developer Guide: Update Amazon ECS service parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-parameters.html
- Amazon ECS API Reference: UpdateService - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_UpdateService.html
- AWS CLI Command Reference: ecs update-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CloudFormation Template Reference: AWS::ECS::Service DeploymentCircuitBreaker - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-deploymentcircuitbreaker.html
- AWS CloudFormation Template Reference: AWS::ECS::Service DeploymentConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-deploymentconfiguration.html
- Terraform Registry: aws_ecs_service - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform Registry: aws_cloudwatch_event_target - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target

## Issues Found
- The failure threshold formula was incorrect. The post said ECS uses `min(10, 2 * desired_count)` for desired counts 1-9 and `min(200, desired_count)` for larger services. AWS documentation states the threshold is based on `ceil(0.5 * desired_count)`, with a minimum of 3 and a maximum of 200. I updated the formula and examples.
- The post described the circuit breaker as only tracking task launch attempts and tasks reaching `RUNNING`. AWS documentation describes two stages: tasks reaching `RUNNING`, then supported health checks after at least one task is running. I updated the explanation, diagram label, and trigger description.
- The limitations section said there are no health-based triggers and that the circuit breaker only tracks task launch failures. That was inaccurate because Elastic Load Balancing, AWS Cloud Map, and Amazon ECS container health check failures are counted. I revised the limitation to distinguish supported health checks from application-level metric alarms.
- The rollback description said ECS reverts to the previous task definition. AWS describes rollback to the most recent deployment in the `COMPLETED` state. I updated the wording to match the documented behavior.

## Review Notes
The Terraform, CloudFormation, EventBridge pattern, and AWS CLI configuration examples match the documented field names and structure. The EventBridge target example is structurally valid, but a real SNS target also needs an SNS topic policy that allows EventBridge to publish to the topic.
