# Validation Summary: How to Set Up ECS with CloudFormation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECS
- AWS Fargate and Fargate Spot
- AWS CloudFormation
- Application Load Balancer and target groups
- IAM roles and policies
- CloudWatch Logs
- Application Auto Scaling
- AWS CLI

## Sources Consulted
- AWS CloudFormation `AWS::ECS::Cluster` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ecs-cluster.html
- AWS CloudFormation `AWS::ECS::Service` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ecs-service.html
- AWS CloudFormation ECS capacity provider strategy reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-clustercapacityproviderassociations-capacityproviderstrategy.html
- Amazon ECS launch types and capacity providers: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/capacity-launch-type-comparison.html
- Amazon ECS Fargate task networking: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- AWS CloudFormation `AWS::ElasticLoadBalancingV2::LoadBalancer` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-loadbalancer.html
- AWS CloudFormation `AWS::ApplicationAutoScaling::ScalableTarget` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationautoscaling-scalabletarget.html
- Amazon ECS Secrets Manager environment variable reference: https://docs.aws.amazon.com/AmazonECS/latest/userguide/secrets-envvar-secrets-manager.html
- AWS CLI `cloudformation deploy` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html

## Issues Found
- The original template used one `SubnetIds` parameter for both the internet-facing Application Load Balancer and the Fargate service with `AssignPublicIp: DISABLED`. This could lead readers to deploy the ALB into private subnets or deploy private ECS tasks into public subnets without public IPs. I changed the template to use `PublicSubnetIds` for the ALB and `PrivateSubnetIds` for ECS tasks.
- The ECS service used `LaunchType: FARGATE`, so it would not use the Fargate/Fargate Spot capacity provider strategy described in the cluster section. AWS documentation states that a service must omit `LaunchType` when using `CapacityProviderStrategy`, and that the cluster default is used only when neither is specified. I replaced `LaunchType: FARGATE` with an explicit service-level `CapacityProviderStrategy` matching the article's Fargate/Fargate Spot explanation.

## Review Notes
- The AWS CLI examples use valid `aws cloudformation deploy` syntax. For stack updates, omitted parameters keep their previous stack values according to the AWS CLI documentation.
- The ALB security group opens port 443, but the example only creates an HTTP listener on port 80. This is not invalid, but a production template should add an HTTPS listener and certificate before relying on TLS traffic.
- Private Fargate tasks need a NAT gateway or the appropriate VPC endpoints to pull images, fetch secrets, and write logs. The template now models private task subnets, but the surrounding VPC prerequisites remain outside the scope of the post.
