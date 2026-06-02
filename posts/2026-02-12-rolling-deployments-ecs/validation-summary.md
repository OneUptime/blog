# Validation Summary: How to Set Up Rolling Deployments in ECS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS rolling deployments
- AWS CLI for ECS
- Elastic Load Balancing target groups and health checks
- Amazon ECS container health checks
- Amazon EventBridge / CloudWatch Events
- Terraform AWS provider

## Sources Consulted
- Amazon ECS Developer Guide: Deploy Amazon ECS services by replacing tasks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html
- Amazon ECS Developer Guide: Deployment circuit breaker - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html
- Amazon ECS API Reference: UpdateService healthCheckGracePeriodSeconds - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_UpdateService.html
- Amazon ECS Developer Guide: Container health checks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- AWS CLI Command Reference: ecs update-service - https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- AWS CLI Command Reference: ecs register-task-definition - https://docs.aws.amazon.com/cli/latest/reference/ecs/register-task-definition.html
- Elastic Load Balancing User Guide: Health checks for Application Load Balancer target groups - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Elastic Load Balancing User Guide: Target groups for Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- Amazon ECS Developer Guide: Service deployment state change events - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_service_deployment_events.html
- Terraform Registry: aws_ecs_service - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform Registry: aws_lb_target_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- The single-task service recommendation listed `minimumHealthyPercent = 0`, `maximumPercent = 200` while saying the old task stops before the new one starts. With `maximumPercent = 200`, ECS may overlap two tasks. Changed the downtime case to `minimumHealthyPercent = 0`, `maximumPercent = 100`, and clarified the overlap option.
- The target group `deregistration_delay` comment said it controls when health checks start for new targets. It actually controls how long deregistering targets remain in draining state before becoming unused. Updated the comment.
- The load balancer health-check timing tip said a newly registered target must pass `healthy_threshold` checks before becoming healthy. ALB target groups require one initial health check for newly registered targets; `healthy_threshold` applies when an unhealthy target recovers. Updated the explanation.
- The deployment timeout section incorrectly stated that the default deployment timeout is controlled by the ECS health check grace period. ECS health check grace period only tells the scheduler how long to ignore unhealthy ELB, VPC Lattice, and container health checks after a task starts. Reworded the section to explain health check grace period and circuit-breaker failure detection correctly.

## Review Notes
The remaining AWS CLI commands, Terraform attribute names, ECS deployment configuration values, container health check fields, and EventBridge deployment event pattern were consistent with current official documentation. Some Terraform snippets remain illustrative and omit surrounding service configuration such as networking or load balancer blocks.
