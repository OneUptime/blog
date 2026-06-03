# Validation Summary: How to Set Up ECS Blue/Green Deployments with CodeDeploy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon ECS
- AWS CodeDeploy
- Application Load Balancer
- CloudWatch alarms
- AWS CLI
- Terraform AWS Provider
- AppSpec YAML/JSON
- IAM

## Sources Consulted
- Amazon ECS Developer Guide: CodeDeploy blue/green deployments for Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html
- AWS CodeDeploy User Guide: Deployments on an Amazon ECS compute platform: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-steps-ecs.html
- AWS CodeDeploy User Guide: Set up a load balancer, target groups, and listeners for CodeDeploy Amazon ECS deployments: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-groups-create-load-balancer-for-ecs.html
- AWS CodeDeploy User Guide: AppSpec resources section for Amazon ECS deployments: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-resources.html
- AWS CodeDeploy User Guide: AppSpec hooks section for Amazon ECS deployments: https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
- AWS CLI Command Reference: aws deploy create-deployment: https://docs.aws.amazon.com/cli/latest/reference/deploy/create-deployment.html
- Terraform AWS Provider: aws_codedeploy_deployment_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_group
- Terraform AWS Provider: aws_codedeploy_deployment_config: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codedeploy_deployment_config
- Terraform AWS Provider: aws_ecs_service: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Elastic Load Balancing User Guide: CloudWatch metrics for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-cloudwatch-metrics.html

## Issues Found
- Changed "instant rollback" wording to "fast" or "quick" rollback. CodeDeploy can reroute traffic back to the original task set, but describing rollback as literally instant overstates the behavior.
- Corrected the ALB setup sentence to say that ECS blue/green deployments require two target groups, one production listener, and optionally one test listener. AWS documentation treats the test listener as optional.
- Removed the `TargetGroup = aws_lb_target_group.green.arn_suffix` dimension from the sample `HTTPCode_Target_5XX_Count` CloudWatch alarm. CodeDeploy alternates which target group is original and replacement across deployments, so an alarm tied only to the green target group can miss errors when the blue target group is the replacement. The load-balancer-level metric is a safer generic example for rollback monitoring.

## Review Notes
- The Terraform snippets are partial examples and assume surrounding resources such as VPC, subnets, security groups, ECS cluster, task definition, and certificate are defined elsewhere.
- The local environment did not have Terraform or AWS CLI installed, so command and provider validation was done against official documentation rather than local CLI help or `terraform validate`.
