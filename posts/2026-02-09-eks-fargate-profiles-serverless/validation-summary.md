# Validation Summary: How to Configure EKS Fargate Profiles for Serverless Kubernetes Pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS Fargate
- Kubernetes Deployments, Services, Jobs, CronJobs, PersistentVolumes, and PersistentVolumeClaims
- AWS CLI
- Terraform AWS provider
- CoreDNS
- Fluent Bit / AWS Fargate log router
- Amazon EFS CSI
- Amazon CloudWatch Container Insights

## Sources Consulted
- Amazon EKS: Define which Pods use AWS Fargate when launched: https://docs.aws.amazon.com/eks/latest/userguide/fargate-profile.html
- AWS CLI Command Reference: `aws eks create-fargate-profile`: https://docs.aws.amazon.com/cli/latest/reference/eks/create-fargate-profile.html
- Amazon EKS: Understand Fargate Pod configuration details: https://docs.aws.amazon.com/eks/latest/userguide/fargate-pod-configuration.html
- Amazon EKS: Simplify compute management with AWS Fargate: https://docs.aws.amazon.com/eks/latest/userguide/fargate.html
- Amazon EKS: Get started with AWS Fargate for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/fargate-getting-started.html
- Amazon EKS: Start AWS Fargate logging for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/fargate-logging.html
- Amazon EKS: Use elastic file system storage with Amazon EFS: https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html
- Amazon EKS: Route TCP and UDP traffic with Network Load Balancers: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Amazon CloudWatch: Amazon EKS and Kubernetes Container Insights metrics: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-metrics-EKS.html
- Terraform Registry: `aws_eks_fargate_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_fargate_profile
- AWS Managed Policy Reference: `AmazonEKSFargatePodExecutionRolePolicy`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEKSFargatePodExecutionRolePolicy.html
- Kubernetes API Reference: Workload and storage API resources: https://kubernetes.io/docs/reference/kubernetes-api/

## Issues Found
- The post said Fargate does not support persistent volumes with `ReadWriteMany` access modes. This was incorrect because EKS Fargate supports statically provisioned Amazon EFS volumes, which commonly use `ReadWriteMany`. Changed the limitation to Amazon EBS volumes and dynamic persistent volume provisioning.
- Several pod examples used different CPU and memory requests and limits. EKS Fargate pods run with Guaranteed QoS, so requests and limits must be equal for all containers. Updated the Deployment, Pod, Job, CronJob, EFS, mixed deployment, and sizing examples.
- The supported Fargate size list was outdated and stopped at 4 vCPU / 30 GB. Updated it to include the current 16 vCPU / 120 GB maximum.
- The LoadBalancer Service example did not specify IP target mode. Fargate exposed services must use IP targets, so the Service now includes AWS Load Balancer Controller annotations for an external NLB with IP targets.
- The post described Fargate as provisioning the exact resources requested and charging for pod resource usage. AWS rounds requests up to supported configurations and bills based on provisioned CPU and memory, so the wording was corrected.
- The CoreDNS patch comment described the change as removing EC2 node affinity. The command removes the `eks.amazonaws.com/compute-type` annotation, so the comment was corrected.
- The CloudWatch example used the `AWS/EKS` namespace for `pod_cpu_utilization`. That metric is published by Container Insights, so the namespace was changed to `ContainerInsights`.
- The best-practices list referred generally to pod IAM roles. Changed it to recommend IAM roles for service accounts (IRSA) for application AWS API access.

## Review Notes
The snippets remain examples and assume supporting prerequisites such as an existing EKS cluster, private subnets with required egress, appropriate security groups, the AWS Load Balancer Controller for the annotated LoadBalancer Service, Container Insights for the CloudWatch metric, and EFS mount targets/security group rules for storage.
