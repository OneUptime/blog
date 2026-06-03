# Validation Summary: How to Use AWS Proton for Platform Engineering with ECS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Proton
- Amazon ECS on AWS Fargate
- AWS CloudFormation
- Elastic Load Balancing Application Load Balancer
- AWS CLI
- IAM roles
- Amazon CloudWatch Logs

## Sources Consulted
- AWS Proton User Guide: Authoring templates and creating bundles for AWS Proton, https://docs.aws.amazon.com/proton/latest/userguide/ag-template-authoring.html
- AWS Proton User Guide: Schema file, https://docs.aws.amazon.com/proton/latest/userguide/ag-schema.html
- AWS Proton User Guide: AWS Proton parameters, https://docs.aws.amazon.com/proton/latest/userguide/parameters.html
- AWS Proton User Guide: Register and publish templates, https://docs.aws.amazon.com/proton/latest/userguide/template-create.html
- AWS Proton User Guide: Create an environment, https://docs.aws.amazon.com/proton/latest/userguide/ag-create-env.html
- AWS Proton User Guide: Create a service, https://docs.aws.amazon.com/proton/latest/userguide/ag-create-svc.html
- AWS CLI Command Reference: create-service, create-service-template-version, update-service-template-version, list-service-instances, and update-service-instance, https://docs.aws.amazon.com/cli/latest/reference/proton/
- AWS CloudFormation Template Reference: AWS::EC2::VPC, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html
- AWS CloudFormation Template Reference: AWS::ECS::Cluster ClusterSettings, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-ecs-cluster-clustersettings.html
- AWS CloudFormation Template Reference: AWS::ECS::Service AwsVpcConfiguration, https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ecs-service-awsvpcconfiguration.html

## Issues Found
- AWS Proton is now deprecated for new customers and has a published end-of-support date. Added a current caveat so readers know the tutorial applies mainly to existing Proton customers.
- The VPC template used `EnableDnsHosting`, which is not a valid `AWS::EC2::VPC` property. Changed it to `EnableDnsHostnames`.
- The ECS Container Insights setting used `"true"` and `"false"`, but ECS cluster settings support `enabled`, `disabled`, and `enhanced`. Updated the schema and template references.
- The environment created public subnets without an internet gateway, public route table, or route associations. Added the required public routing resources.
- The environment created an ALB but no listener. Added an HTTP listener and exposed its ARN as an environment output.
- The service template claimed load balancing but did not create a target group, listener rule, or ECS `LoadBalancers` mapping. Added those resources and the required listener rule priority input.
- The service template exposed `health_check_path` but did not use it. Wired it into the target group health check.
- Fargate tasks were placed in public subnets without `AssignPublicIp: ENABLED`. Added the setting so tasks can reach required external services in this simplified public-subnet example.
- The service template was described as including autoscaling, but no autoscaling resources existed. Reworded the post to describe a load-balanced service instead.
- The service template registration command omitted `--pipeline-provisioning "CUSTOMER_MANAGED"` while the create-service example omitted repository and branch parameters. Added the flag for a no-pipeline service template.
- The service template version was created but never published. Added the wait and publish commands.
- The environment template version was published immediately after registration. Added the documented waiter before publishing.
- The tutorial referenced `prod-environment` without showing how to create it. Added an environment spec, create command, and deploy waiter.
- The service creation example passed JSON and omitted the required Proton spec header. Replaced it with the documented YAML `ServiceSpec` file format.
- The service bundle did not show a service manifest. Added a matching `service-template/manifest.yaml` example.

## Review Notes
This remains a simplified public-subnet example. A production ECS Fargate environment would usually place tasks in private subnets with NAT or VPC endpoints, use HTTPS listeners and certificates, and define stronger IAM/task policies.
