# Validation Summary: How to Configure ECS Services with Multiple Load Balancer Target Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate
- Elastic Load Balancing v2
- Application Load Balancers
- Target groups
- AWS CLI
- AWS CloudFormation
- AWS CDK
- CloudWatch metrics

## Sources Consulted
- Amazon ECS Developer Guide: Registering multiple target groups with an Amazon ECS service: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/register-multiple-targetgroups.html
- Amazon ECS Developer Guide: Update Amazon ECS service parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-parameters.html
- AWS CLI Command Reference: ecs create-service: https://docs.aws.amazon.com/cli/latest/reference/ecs/create-service.html
- AWS CLI Command Reference: elbv2 create-target-group: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- AWS CloudFormation Template Reference: AWS::ECS::Service LoadBalancer: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-service-loadbalancer.html
- AWS CDK API Reference: aws-cdk-lib.aws_ecs module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- AWS CDK API Reference: ApplicationLoadBalancer addListener: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_elasticloadbalancingv2/ApplicationLoadBalancer.html
- OneUptime linked guide: How to Set Up CloudWatch Container Insights for ECS: https://oneuptime.com/blog/post/2026-02-12-cloudwatch-container-insights-ecs/view

## Issues Found
- The post said different routing rules could provide independent scaling while still using one ECS service. I changed this to say listener or path rules can route to different target groups on the same service, because target groups attached to a single ECS service do not create independently scalable service backends.
- The example AWS account IDs in the load balancer target group ARNs and ECR image URI used a 9-digit placeholder. I changed them to 12-digit placeholders to match AWS account ID format.
- The CDK snippets created port 443 ALB listeners without specifying HTTPS protocol and a certificate. I added `protocol: elbv2.ApplicationProtocol.HTTPS` and `certificates: [certificate]`, because AWS CDK requires a certificate for HTTPS/TLS listeners.
- The post said ECS load balancer configuration could not be modified after service creation and required deleting and recreating the service. I changed this to explain that rolling-deployment services can update load balancer target groups with `UpdateService`, while CodeDeploy blue/green deployments should update target groups through CodeDeploy.

## Review Notes
The remaining examples are intentionally partial snippets and assume surrounding resources such as clusters, VPCs, ALBs, certificates, security groups, and task execution roles exist. The main ECS multiple-target-group constraints are now reflected: Application Load Balancer or Network Load Balancer, up to five target groups, `ip` target type for `awsvpc`/Fargate tasks, and the appropriate update path for deployment type.
