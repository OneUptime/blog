# Validation Summary: How to Troubleshoot ECS Container Health Check Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon ECS
- Elastic Load Balancing target groups
- AWS CLI
- Docker container health checks
- Flask
- Security groups

## Sources Consulted
- Amazon ECS Developer Guide: Determine Amazon ECS task health using container health checks - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS Developer Guide: Amazon ECS service definition parameters - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Amazon ECS Developer Guide: Amazon ECS services - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html
- Amazon ECS API Reference: LoadBalancer - https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LoadBalancer.html
- Elastic Load Balancing User Guide: Health checks for Application Load Balancer target groups - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Elastic Load Balancing API Reference: TargetHealth - https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_TargetHealth.html
- AWS CLI Command Reference: elbv2 modify-target-group - https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group.html
- AWS CloudFormation Reference: ElasticLoadBalancingV2 TargetGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-targetgroup.html
- OneUptime linked post: How to Troubleshoot ECS Service Deployment Issues - https://oneuptime.com/blog/post/2026-02-12-troubleshoot-ecs-service-deployment-issues/view

## Issues Found
- The post said ECS container health checks can be defined in a Dockerfile and determine ECS task health. AWS documents that ECS monitors and reports only health checks specified in the task definition, and that task definition health check parameters override Docker image health checks. I changed the description and the health-check type explanation to refer to ECS container health checks and to clarify that Dockerfile `HEALTHCHECK` instructions are not monitored by ECS unless specified in the container definition.
- The security group guidance only covered task security groups and container ports. That is correct for `awsvpc` networking, including Fargate, but incomplete for EC2 tasks using bridge or host networking. I added the EC2 case, where inbound traffic must be allowed to the registered host port on the container instance security group.
- The port mismatch section compared the task definition's container port only with the target group's `Port` and said mismatches always fail. Elastic Load Balancing health checks often use `traffic-port`, and ECS services register the configured container or host port with the target group. I changed the commands to inspect the ECS service `loadBalancers` configuration and target group `HealthCheckPort`, and clarified how explicit ports versus `traffic-port` behave.

## Review Notes
The remaining AWS CLI commands and configuration snippets use current command names, flags, field names, and matcher syntax according to the AWS CLI and service documentation. The Flask example is a minimal route snippet and assumes it is placed in an existing Flask application with `app` already defined. The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
