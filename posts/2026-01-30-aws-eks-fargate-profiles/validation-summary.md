# Validation Summary: How to Create AWS EKS Fargate Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS Fargate for Amazon EKS
- EKS Fargate profiles and selectors
- eksctl
- Terraform AWS provider
- IAM roles for EKS Fargate and IRSA
- Kubernetes pods, deployments, service accounts, and ConfigMaps
- Amazon VPC networking and security groups for pods
- Amazon CloudWatch Logs and Container Insights
- Fluent Bit log routing on EKS Fargate

## Sources Consulted
- Amazon EKS Fargate overview and considerations: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- Amazon EKS Fargate profile selectors, wildcards, private subnet requirements, and eksctl example: https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- Amazon EKS Fargate getting started and CoreDNS guidance: https://docs.aws.amazon.com/eks/latest/userguide/fargate-getting-started.html
- eksctl Fargate support documentation: https://docs.aws.amazon.com/eks/latest/eksctl/fargate.html
- Amazon EKS pod execution IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/pod-execution-role.html
- AmazonEKSFargatePodExecutionRolePolicy managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEKSFargatePodExecutionRolePolicy.html
- Amazon EKS Fargate pod configuration and ephemeral storage documentation: https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- Terraform AWS provider `aws_eks_fargate_profile` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_fargate_profile
- Terraform type constraints and optional object attributes: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Amazon EKS security groups for pods documentation: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-for-pods.html
- Amazon EKS SecurityGroupPolicy example: https://docs.aws.amazon.com/eks/latest/userguide/sg-pods-example-deployment.html
- Amazon EKS Fargate logging documentation: https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html
- Amazon CloudWatch Container Insights setup for EKS and Kubernetes: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html
- Amazon CloudWatch Observability EKS add-on quick start: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-EKS-addon.html
- Amazon EKS control plane logging documentation: https://docs.aws.amazon.com/eks/latest/userguide/control-plane-logs.html

## Issues Found
- The scheduler description said unmatched pods run on managed or self-managed node groups. Updated it to clarify that the default scheduler attempts EC2 placement and pods remain Pending if no eligible nodes exist.
- The selector rules said multiple profiles are evaluated in order and the first match wins. Corrected this to EKS choosing the matching profile that sorts first alphanumerically by profile name, and noted the `eks.amazonaws.com/fargate-profile` pod label override.
- The selector rules said wildcards do not exist. Corrected this because EKS Fargate profile selectors support `*` and `?` in namespaces, label keys, and label values.
- The prerequisites listed Terraform 1.0+, but the module example uses optional object attributes with defaults. Updated the prerequisite to Terraform 1.3+.
- The pod execution role description implied the managed policy grants CloudWatch Logs permissions. Corrected it to state that the managed policy covers ECR pulls and log routing needs additional destination-specific permissions.
- The security group example used a pod annotation that is not the documented EKS security groups for pods mechanism. Replaced it with a `SecurityGroupPolicy` example.
- The Container Insights section used `aws eks update-cluster-config --logging` as if it enabled Container Insights metrics. Corrected it to identify the command as EKS control plane logging and noted that EKS Fargate Container Insights requires AWS Distro for OpenTelemetry.
- The Fluent Bit example described deploying Fluent Bit as a sidecar and used an invalid ConfigMap shape for EKS Fargate logging. Replaced it with the documented built-in Fargate log router ConfigMap in the `aws-observability` namespace.

## Review Notes
The post is technically relevant and valid after corrections. Some examples remain illustrative and use placeholder cluster names, subnet variables, image names, AWS account IDs, and security group IDs that readers must replace for their own environments.
